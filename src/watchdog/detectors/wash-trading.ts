import { Detector, type ScanDataIndex } from "./base.js";
import type { ScanData, WatchdogConfig, HeuristicMatch, TradeRecord } from "../types.js";

/**
 * Detector 1: Wash Trading
 * 7 heuristics — the most damaging abuse vector.
 * Inflates volume metrics that drive fee tiers, builder tiers, campaign rankings.
 */
export class WashTradingDetector extends Detector {
  readonly name = "WASH_TRADING" as const;
  readonly heuristics = [
    "wash:net_position_zero",
    "wash:concentrated_counterparty",
    "wash:reciprocal_trades",
    "wash:rapid_roundtrip",
    "wash:low_pnl_high_volume",
    "wash:temporal_clustering",
    "wash:pattern_repetition",
  ];

  protected runChecks(data: ScanData, config: WatchdogConfig, idx: ScanDataIndex): HeuristicMatch[] {
    return [
      ...this.checkNetPositionZero(config, idx),
      ...this.checkConcentratedCounterparty(config, idx),
      ...this.checkReciprocalTrades(config, idx),
      ...this.checkRapidRoundtrip(config, idx),
      ...this.checkLowPnlHighVolume(data, config),
      ...this.checkTemporalClustering(data, config),
      ...this.checkPatternRepetition(data, config),
    ];
  }

  private checkNetPositionZero(config: WatchdogConfig, idx: ScanDataIndex): HeuristicMatch[] {
    const windowMs = this.getThreshold("wash_net_window_ms", 60 * 60 * 1000, config);
    const netThreshold = this.getThreshold("wash_net_threshold", 0.01, config);
    const matches: HeuristicMatch[] = [];

    for (const [key, trades] of idx.tradesByAccountSymbol) {
      const [accountId, symbol] = key.split("|");
      const sorted = trades.sort((a, b) => a.timestamp - b.timestamp);

      let windowStart = 0;
      for (let windowEnd = 0; windowEnd < sorted.length; windowEnd++) {
        while (sorted[windowEnd].timestamp - sorted[windowStart].timestamp > windowMs) {
          windowStart++;
        }

        if ((windowEnd - windowStart) < 2 || windowEnd % 5 !== 0) continue;

        const windowTrades = sorted.slice(windowStart, windowEnd + 1);
        let buys = 0;
        let sells = 0;
        for (const t of windowTrades) {
          if (t.side === "BUY") buys += t.size;
          else sells += t.size;
        }

        const maxSide = Math.max(buys, sells);
        if (maxSide === 0) continue;
        const netRatio = Math.abs(buys - sells) / maxSide;

        if (netRatio < netThreshold && maxSide > 0) {
          const volume = windowTrades.reduce((s, t) => s + t.size * t.price, 0);
          matches.push(this.match(
            "wash:net_position_zero", accountId,
            Math.min(1, (1 - netRatio / netThreshold) * 0.8 + 0.2),
            { symbol, buys, sells, netRatio: netRatio.toFixed(4), windowTrades: windowTrades.length, volume },
            `Account ${accountId} net position zero on ${symbol}: buys=${buys.toFixed(2)}, sells=${sells.toFixed(2)}`,
          ));
          break;
        }
      }
    }

    return matches;
  }

  private checkConcentratedCounterparty(config: WatchdogConfig, idx: ScanDataIndex): HeuristicMatch[] {
    const threshold = this.getThreshold("wash_counterparty_concentration", 0.5, config);
    const matches: HeuristicMatch[] = [];

    for (const [accountId, cpMap] of idx.counterpartyVolume) {
      const totalVol = idx.accountVolume.get(accountId) ?? 0;
      if (totalVol === 0) continue;

      for (const [cpId, cpVol] of cpMap) {
        const concentration = cpVol / totalVol;
        if (concentration > threshold) {
          matches.push(this.match(
            "wash:concentrated_counterparty", accountId,
            Math.min(1, concentration),
            { counterpartyId: cpId, concentration: concentration.toFixed(3), volume: cpVol, totalVolume: totalVol },
            `Account ${accountId} has ${(concentration * 100).toFixed(0)}% volume concentration with ${cpId}`,
          ));
          break;
        }
      }
    }

    return matches;
  }

  private checkReciprocalTrades(config: WatchdogConfig, idx: ScanDataIndex): HeuristicMatch[] {
    const sizeThreshold = this.getThreshold("wash_reciprocal_size_diff", 0.1, config);
    const matches: HeuristicMatch[] = [];
    const flaggedPairs = new Set<string>();

    for (const [accountA, cpMapA] of idx.counterpartyVolume) {
      for (const [accountB, volAtoB] of cpMapA) {
        const pairKey = [accountA, accountB].sort().join("|");
        if (flaggedPairs.has(pairKey)) continue;

        const cpMapB = idx.counterpartyVolume.get(accountB);
        if (!cpMapB) continue;
        const volBtoA = cpMapB.get(accountA);
        if (!volBtoA) continue;

        const maxVol = Math.max(volAtoB, volBtoA);
        const sizeDiff = Math.abs(volAtoB - volBtoA) / maxVol;

        if (sizeDiff < sizeThreshold) {
          flaggedPairs.add(pairKey);
          const confidence = Math.min(1, (1 - sizeDiff / sizeThreshold) * 0.7 + 0.3);

          matches.push(this.match(
            "wash:reciprocal_trades", accountA, confidence,
            { counterparty: accountB, volAtoB, volBtoA, sizeDiff: sizeDiff.toFixed(3) },
            `Reciprocal trading between ${accountA} and ${accountB}: $${volAtoB.toFixed(0)} ↔ $${volBtoA.toFixed(0)}`,
          ));
          matches.push(this.match(
            "wash:reciprocal_trades", accountB, confidence,
            { counterparty: accountA, volBtoA, volAtoB, sizeDiff: sizeDiff.toFixed(3) },
            `Reciprocal trading between ${accountB} and ${accountA}: $${volBtoA.toFixed(0)} ↔ $${volAtoB.toFixed(0)}`,
          ));
        }
      }
    }

    return matches;
  }

  private checkRapidRoundtrip(config: WatchdogConfig, idx: ScanDataIndex): HeuristicMatch[] {
    const maxTimeBetween = this.getThreshold("wash_roundtrip_time_ms", 30_000, config);
    const maxSizeDiff = this.getThreshold("wash_roundtrip_size_diff", 0.05, config);
    const minPairsPerHour = this.getThreshold("wash_roundtrip_min_pairs", 5, config);
    const matches: HeuristicMatch[] = [];

    for (const [key, trades] of idx.tradesByAccountSymbol) {
      const [accountId, symbol] = key.split("|");
      const sorted = trades.sort((a, b) => a.timestamp - b.timestamp);

      const hourlyPairs = new Map<number, number>();
      const hourMs = 60 * 60 * 1000;

      for (let i = 0; i < sorted.length - 1; i++) {
        const t1 = sorted[i];
        const t2 = sorted[i + 1];
        if (t1.side === t2.side) continue;
        if (t2.timestamp - t1.timestamp > maxTimeBetween) continue;
        const maxSize = Math.max(t1.size, t2.size);
        if (maxSize === 0) continue;
        const sizeDiff = Math.abs(t1.size - t2.size) / maxSize;
        if (sizeDiff > maxSizeDiff) continue;
        const hour = Math.floor(t1.timestamp / hourMs);
        hourlyPairs.set(hour, (hourlyPairs.get(hour) ?? 0) + 1);
      }

      let maxPairs = 0;
      let totalPairs = 0;
      for (const count of hourlyPairs.values()) {
        maxPairs = Math.max(maxPairs, count);
        totalPairs += count;
      }

      if (maxPairs >= minPairsPerHour) {
        matches.push(this.match(
          "wash:rapid_roundtrip", accountId,
          Math.min(1, maxPairs / (minPairsPerHour * 3)),
          { symbol, maxPairsInHour: maxPairs, totalPairs, hoursWithPairs: hourlyPairs.size },
          `Account ${accountId} has ${maxPairs} rapid roundtrips/hr on ${symbol}`,
        ));
      }
    }

    return matches;
  }

  private checkLowPnlHighVolume(data: ScanData, config: WatchdogConfig): HeuristicMatch[] {
    const pnlRatioThreshold = this.getThreshold("wash_pnl_ratio", 0.0001, config);
    const minVolume = this.getThreshold("wash_pnl_min_volume", 100_000, config);
    const matches: HeuristicMatch[] = [];

    const accountStats = new Map<string, { volume: number; pnl: number }>();
    for (const trade of data.trades) {
      const notional = trade.size * trade.price;
      const stats = accountStats.get(trade.accountId) ?? { volume: 0, pnl: 0 };
      stats.volume += notional;
      stats.pnl += trade.fee;
      accountStats.set(trade.accountId, stats);
    }

    for (const [accountId, stats] of accountStats) {
      if (stats.volume < minVolume) continue;
      const absPnl = Math.abs(stats.pnl);
      const ratio = absPnl / stats.volume;
      if (ratio < pnlRatioThreshold) {
        matches.push(this.match(
          "wash:low_pnl_high_volume", accountId,
          Math.min(1, (1 - ratio / pnlRatioThreshold) * 0.6 + 0.4),
          { volume: stats.volume, absPnl, ratio: ratio.toFixed(6), threshold: pnlRatioThreshold },
          `Account ${accountId} PnL/volume ratio ${ratio.toFixed(6)} on $${stats.volume.toFixed(0)} volume`,
        ));
      }
    }

    return matches;
  }

  private checkTemporalClustering(data: ScanData, config: WatchdogConfig): HeuristicMatch[] {
    const concentrationThreshold = this.getThreshold("wash_temporal_concentration", 0.8, config);
    const windowHours = this.getThreshold("wash_temporal_window_hours", 4, config);
    const matches: HeuristicMatch[] = [];

    const hourMs = 60 * 60 * 1000;
    const accountHourlyVolume = new Map<string, Map<number, number>>();
    const accountTotalVolume = new Map<string, number>();

    for (const trade of data.trades) {
      const notional = trade.size * trade.price;
      const hourOfDay = Math.floor((trade.timestamp % (24 * hourMs)) / hourMs);
      const hourMap = accountHourlyVolume.get(trade.accountId) ?? new Map<number, number>();
      hourMap.set(hourOfDay, (hourMap.get(hourOfDay) ?? 0) + notional);
      accountHourlyVolume.set(trade.accountId, hourMap);
      accountTotalVolume.set(trade.accountId, (accountTotalVolume.get(trade.accountId) ?? 0) + notional);
    }

    for (const [accountId, hourMap] of accountHourlyVolume) {
      const totalVol = accountTotalVolume.get(accountId) ?? 0;
      if (totalVol === 0) continue;

      let maxWindowVol = 0;
      let maxWindowStart = 0;
      for (let start = 0; start < 24; start++) {
        let windowVol = 0;
        for (let h = 0; h < windowHours; h++) {
          windowVol += hourMap.get((start + h) % 24) ?? 0;
        }
        if (windowVol > maxWindowVol) {
          maxWindowVol = windowVol;
          maxWindowStart = start;
        }
      }

      const concentration = maxWindowVol / totalVol;
      if (concentration > concentrationThreshold) {
        matches.push(this.match(
          "wash:temporal_clustering", accountId,
          Math.min(1, (concentration - concentrationThreshold) / (1 - concentrationThreshold) * 0.5 + 0.5),
          { concentration: concentration.toFixed(3), peakWindowStart: maxWindowStart, windowHours, totalVolume: totalVol },
          `Account ${accountId} has ${(concentration * 100).toFixed(0)}% volume in ${windowHours}h window (${maxWindowStart}:00-${(maxWindowStart + windowHours) % 24}:00 UTC)`,
        ));
      }
    }

    return matches;
  }

  private checkPatternRepetition(data: ScanData, config: WatchdogConfig): HeuristicMatch[] {
    const minRepetitions = this.getThreshold("wash_pattern_min_reps", 20, config);
    const matches: HeuristicMatch[] = [];

    const accountGroups = new Map<string, Map<string, number>>();
    for (const trade of data.trades) {
      const roundedSize = Math.round(trade.size * 100) / 100;
      const roundedPrice = Math.round(trade.price * 10) / 10;
      const patternKey = `${trade.symbol}|${roundedSize}|${roundedPrice}`;
      const groups = accountGroups.get(trade.accountId) ?? new Map<string, number>();
      groups.set(patternKey, (groups.get(patternKey) ?? 0) + 1);
      accountGroups.set(trade.accountId, groups);
    }

    for (const [accountId, groups] of accountGroups) {
      for (const [patternKey, count] of groups) {
        if (count >= minRepetitions) {
          const [symbol, size, price] = patternKey.split("|");
          matches.push(this.match(
            "wash:pattern_repetition", accountId,
            Math.min(1, count / (minRepetitions * 3)),
            { symbol, size, price, repetitions: count },
            `Account ${accountId} has ${count} identical orders on ${symbol} (size=${size}, price=${price})`,
          ));
          break;
        }
      }
    }

    return matches;
  }
}
