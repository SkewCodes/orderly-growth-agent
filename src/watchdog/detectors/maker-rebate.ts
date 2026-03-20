import { Detector, type ScanDataIndex } from "./base.js";
import type { ScanData, WatchdogConfig, HeuristicMatch } from "../types.js";

/**
 * Detector 5: Maker Rebate Farming
 * 3 heuristics: spoof-and-cancel, maker-taker collusion, layering
 */
export class MakerRebateDetector extends Detector {
  readonly name = "MAKER_REBATE" as const;
  readonly heuristics = ["maker:spoof_and_cancel", "maker:maker_taker_collusion", "maker:layering"];

  protected runChecks(data: ScanData, config: WatchdogConfig, idx: ScanDataIndex): HeuristicMatch[] {
    return [
      ...this.checkSpoofAndCancel(data, config),
      ...this.checkMakerTakerCollusion(data, config),
      ...this.checkLayering(data, config),
    ];
  }

  private checkSpoofAndCancel(data: ScanData, config: WatchdogConfig): HeuristicMatch[] {
    const cancelRatioThreshold = this.getThreshold("maker_cancel_ratio", 0.95, config);
    const minDailyOrders = this.getThreshold("maker_min_daily_orders", 100, config);
    const matches: HeuristicMatch[] = [];

    const cancelledByAccount = new Map<string, number>();
    for (const order of data.cancelledOrders) {
      cancelledByAccount.set(order.accountId, (cancelledByAccount.get(order.accountId) ?? 0) + 1);
    }

    const tradesByAccount = new Map<string, number>();
    for (const trade of data.trades) {
      tradesByAccount.set(trade.accountId, (tradesByAccount.get(trade.accountId) ?? 0) + 1);
    }

    const scanDays = data.scanWindowMs / (24 * 60 * 60 * 1000);

    for (const [accountId, cancelCount] of cancelledByAccount) {
      const tradeCount = tradesByAccount.get(accountId) ?? 0;
      const totalOrders = cancelCount + tradeCount;
      const dailyOrders = totalOrders / scanDays;
      const cancelRatio = cancelCount / totalOrders;

      if (cancelRatio > cancelRatioThreshold && dailyOrders > minDailyOrders) {
        const confidence = Math.min(1, (cancelRatio - cancelRatioThreshold) / (1 - cancelRatioThreshold) * 0.5 + 0.5);
        matches.push(this.match(
          "maker:spoof_and_cancel", accountId, confidence,
          { cancelRatio: cancelRatio.toFixed(3), dailyOrders: dailyOrders.toFixed(0), cancelCount, tradeCount },
          `Account ${accountId} has ${(cancelRatio * 100).toFixed(1)}% cancel ratio with ${dailyOrders.toFixed(0)} daily orders`,
        ));
      }
    }

    return matches;
  }

  private checkMakerTakerCollusion(data: ScanData, config: WatchdogConfig): HeuristicMatch[] {
    const concentrationThreshold = this.getThreshold("maker_concentration", 0.5, config);
    const matches: HeuristicMatch[] = [];

    const feeRates = new Map<string, { makerRate: number; takerRate: number }>();
    for (const rate of data.userFeeRates) {
      feeRates.set(rate.accountId, { makerRate: rate.makerRate, takerRate: rate.takerRate });
    }

    const makerCpVol = new Map<string, Map<string, number>>();
    const makerTotalVol = new Map<string, number>();

    for (const trade of data.trades) {
      if (!trade.isMaker || !trade.counterpartyId) continue;
      const notional = trade.size * trade.price;
      const cpMap = makerCpVol.get(trade.accountId) ?? new Map<string, number>();
      cpMap.set(trade.counterpartyId, (cpMap.get(trade.counterpartyId) ?? 0) + notional);
      makerCpVol.set(trade.accountId, cpMap);
      makerTotalVol.set(trade.accountId, (makerTotalVol.get(trade.accountId) ?? 0) + notional);
    }

    for (const [makerId, cpMap] of makerCpVol) {
      const totalVol = makerTotalVol.get(makerId) ?? 0;
      if (totalVol === 0) continue;
      const makerFee = feeRates.get(makerId);
      if (!makerFee || makerFee.makerRate >= 0) continue;

      for (const [takerId, cpVol] of cpMap) {
        const concentration = cpVol / totalVol;
        if (concentration < concentrationThreshold) continue;
        const takerFee = feeRates.get(takerId);
        if (!takerFee) continue;

        const makerRebate = Math.abs(makerFee.makerRate);
        if (makerRebate > takerFee.takerRate) {
          matches.push(this.match(
            "maker:maker_taker_collusion", makerId,
            Math.min(1, concentration),
            {
              takerId, concentration: concentration.toFixed(3),
              makerRebateBps: (makerRebate * 10000).toFixed(2),
              takerFeeBps: (takerFee.takerRate * 10000).toFixed(2),
              volumeBetween: cpVol,
            },
            `Maker ${makerId} earns rebate ${(makerRebate * 10000).toFixed(2)}bps > taker ${takerId} fee — ${(concentration * 100).toFixed(0)}% concentration`,
          ));
        }
      }
    }

    return matches;
  }

  private checkLayering(data: ScanData, config: WatchdogConfig): HeuristicMatch[] {
    const fillRateThreshold = this.getThreshold("maker_layering_fill_rate", 0.05, config);
    const minOrdersPerHour = this.getThreshold("maker_layering_min_orders", 50, config);
    const matches: HeuristicMatch[] = [];

    const buckets = new Map<string, { cancelled: number; filled: number }>();
    const hourMs = 60 * 60 * 1000;

    for (const order of data.cancelledOrders) {
      const hour = Math.floor(order.createdAt / hourMs);
      const key = `${order.accountId}|${order.symbol}|${hour}`;
      const bucket = buckets.get(key) ?? { cancelled: 0, filled: 0 };
      bucket.cancelled++;
      if (order.filledSize > 0) bucket.filled++;
      buckets.set(key, bucket);
    }

    for (const trade of data.trades) {
      if (!trade.isMaker) continue;
      const hour = Math.floor(trade.timestamp / hourMs);
      const key = `${trade.accountId}|${trade.symbol}|${hour}`;
      const bucket = buckets.get(key) ?? { cancelled: 0, filled: 0 };
      bucket.filled++;
      buckets.set(key, bucket);
    }

    const accountFlags = new Map<string, { totalOrders: number; totalFilled: number; hoursFlagged: number }>();
    for (const [key, bucket] of buckets) {
      const [accountId] = key.split("|");
      const totalOrders = bucket.cancelled + bucket.filled;
      const fillRate = totalOrders > 0 ? bucket.filled / totalOrders : 1;
      if (fillRate < fillRateThreshold && totalOrders >= minOrdersPerHour) {
        const agg = accountFlags.get(accountId) ?? { totalOrders: 0, totalFilled: 0, hoursFlagged: 0 };
        agg.totalOrders += totalOrders;
        agg.totalFilled += bucket.filled;
        agg.hoursFlagged++;
        accountFlags.set(accountId, agg);
      }
    }

    for (const [accountId, agg] of accountFlags) {
      const overallFillRate = agg.totalOrders > 0 ? agg.totalFilled / agg.totalOrders : 1;
      const confidence = Math.min(1, agg.hoursFlagged / 5);
      matches.push(this.match(
        "maker:layering", accountId, confidence,
        { hoursFlagged: agg.hoursFlagged, totalOrders: agg.totalOrders, fillRate: overallFillRate.toFixed(4) },
        `Account ${accountId} layering: ${(overallFillRate * 100).toFixed(1)}% fill rate across ${agg.hoursFlagged} hours`,
      ));
    }

    return matches;
  }
}
