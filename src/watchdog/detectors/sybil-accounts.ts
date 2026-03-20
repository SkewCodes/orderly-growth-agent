import { Detector, type ScanDataIndex } from "./base.js";
import type { ScanData, WatchdogConfig, HeuristicMatch } from "../types.js";

/**
 * Detector 2: Sybil Accounts
 * 5 heuristics: common funding, registration burst, behavioral clone,
 * common destination, discount recycling
 */
export class SybilAccountsDetector extends Detector {
  readonly name = "SYBIL_ACCOUNTS" as const;
  readonly heuristics = [
    "sybil:common_funding",
    "sybil:registration_burst",
    "sybil:behavioral_clone",
    "sybil:common_destination",
    "sybil:discount_recycling",
  ];

  protected runChecks(data: ScanData, config: WatchdogConfig, idx: ScanDataIndex): HeuristicMatch[] {
    return [
      ...this.checkCommonFunding(config, idx),
      ...this.checkRegistrationBurst(data, config),
      ...this.checkBehavioralClone(data, config),
      ...this.checkCommonDestination(config, idx),
      ...this.checkDiscountRecycling(data, config, idx),
    ];
  }

  private checkCommonFunding(config: WatchdogConfig, idx: ScanDataIndex): HeuristicMatch[] {
    const minAccounts = this.getThreshold("sybil_common_funding_min", 3, config);
    const matches: HeuristicMatch[] = [];

    for (const [source, accountIds] of idx.accountsByFunding) {
      if (accountIds.length < minAccounts) continue;
      const confidence = Math.min(1, accountIds.length / (minAccounts * 3));
      for (const accountId of accountIds) {
        matches.push(this.match(
          "sybil:common_funding", accountId, confidence,
          { fundingSource: source, clusterSize: accountIds.length, clusterAccounts: accountIds },
          `Account ${accountId} shares funding source ${source.slice(0, 10)}... with ${accountIds.length - 1} other accounts`,
        ));
      }
    }

    return matches;
  }

  private checkRegistrationBurst(data: ScanData, config: WatchdogConfig): HeuristicMatch[] {
    const minBurstSize = this.getThreshold("sybil_burst_min", 5, config);
    const burstWindowMs = this.getThreshold("sybil_burst_window_ms", 60 * 60 * 1000, config);
    const matches: HeuristicMatch[] = [];

    const withCreation = data.accountProfiles
      .filter((p) => p.createdAt)
      .map((p) => ({ accountId: p.accountId, createdAt: new Date(p.createdAt!).getTime() }))
      .sort((a, b) => a.createdAt - b.createdAt);

    if (withCreation.length < minBurstSize) return matches;

    const flaggedAccounts = new Set<string>();
    let windowStart = 0;

    for (let windowEnd = 0; windowEnd < withCreation.length; windowEnd++) {
      while (withCreation[windowEnd].createdAt - withCreation[windowStart].createdAt > burstWindowMs) {
        windowStart++;
      }

      const windowSize = windowEnd - windowStart + 1;
      if (windowSize >= minBurstSize) {
        for (let i = windowStart; i <= windowEnd; i++) {
          const accountId = withCreation[i].accountId;
          if (flaggedAccounts.has(accountId)) continue;
          flaggedAccounts.add(accountId);
          matches.push(this.match(
            "sybil:registration_burst", accountId,
            Math.min(1, windowSize / (minBurstSize * 2)),
            { burstSize: windowSize, windowMs: burstWindowMs },
            `Account ${accountId} part of registration burst (${windowSize} accounts in ${burstWindowMs / 60000}min)`,
          ));
        }
      }
    }

    return matches;
  }

  private checkBehavioralClone(data: ScanData, config: WatchdogConfig): HeuristicMatch[] {
    const symbolOverlapThreshold = this.getThreshold("sybil_symbol_overlap", 0.8, config);
    const matches: HeuristicMatch[] = [];

    const accountFeatures = new Map<string, {
      symbols: Set<string>; avgSize: number; tradeCount: number; hourDistribution: number[];
    }>();

    const hourMs = 60 * 60 * 1000;
    for (const trade of data.trades) {
      const features = accountFeatures.get(trade.accountId) ?? {
        symbols: new Set<string>(), avgSize: 0, tradeCount: 0, hourDistribution: new Array(24).fill(0),
      };
      features.symbols.add(trade.symbol);
      features.avgSize = (features.avgSize * features.tradeCount + trade.size) / (features.tradeCount + 1);
      features.tradeCount++;
      const hourOfDay = Math.floor((trade.timestamp % (24 * hourMs)) / hourMs);
      features.hourDistribution[hourOfDay]++;
      accountFeatures.set(trade.accountId, features);
    }

    const accounts = Array.from(accountFeatures.entries())
      .filter(([, f]) => f.tradeCount >= 10)
      .slice(0, 200);

    const flaggedPairs = new Set<string>();

    for (let i = 0; i < accounts.length; i++) {
      for (let j = i + 1; j < accounts.length; j++) {
        const [idA, featA] = accounts[i];
        const [idB, featB] = accounts[j];
        const pairKey = [idA, idB].sort().join("|");
        if (flaggedPairs.has(pairKey)) continue;

        const intersection = new Set([...featA.symbols].filter((s) => featB.symbols.has(s)));
        const union = new Set([...featA.symbols, ...featB.symbols]);
        const symbolOverlap = union.size > 0 ? intersection.size / union.size : 0;
        if (symbolOverlap < symbolOverlapThreshold) continue;

        const maxAvg = Math.max(featA.avgSize, featB.avgSize);
        const sizeSimilarity = maxAvg > 0 ? 1 - Math.abs(featA.avgSize - featB.avgSize) / maxAvg : 0;
        const timingCorr = cosineSimilarity(featA.hourDistribution, featB.hourDistribution);

        if (sizeSimilarity > 0.7 && timingCorr > 0.7) {
          flaggedPairs.add(pairKey);
          const avgConfidence = (symbolOverlap + sizeSimilarity + timingCorr) / 3;
          for (const id of [idA, idB]) {
            matches.push(this.match(
              "sybil:behavioral_clone", id, avgConfidence,
              {
                pairedWith: id === idA ? idB : idA,
                symbolOverlap: symbolOverlap.toFixed(3),
                sizeSimilarity: sizeSimilarity.toFixed(3),
                timingCorrelation: timingCorr.toFixed(3),
              },
              `Account ${id} behavioral clone of ${id === idA ? idB : idA} (symbols=${(symbolOverlap * 100).toFixed(0)}%, timing=${(timingCorr * 100).toFixed(0)}%)`,
            ));
          }
        }
      }
    }

    return matches;
  }

  private checkCommonDestination(config: WatchdogConfig, idx: ScanDataIndex): HeuristicMatch[] {
    const minAccounts = this.getThreshold("sybil_common_dest_min", 2, config);
    const matches: HeuristicMatch[] = [];

    for (const [dest, accountIds] of idx.accountsByDest) {
      if (accountIds.length <= minAccounts) continue;
      const confidence = Math.min(1, accountIds.length / (minAccounts * 3));
      for (const accountId of accountIds) {
        matches.push(this.match(
          "sybil:common_destination", accountId, confidence,
          { withdrawalDest: dest, clusterSize: accountIds.length },
          `Account ${accountId} shares withdrawal destination with ${accountIds.length - 1} other accounts`,
        ));
      }
    }

    return matches;
  }

  private checkDiscountRecycling(data: ScanData, config: WatchdogConfig, idx: ScanDataIndex): HeuristicMatch[] {
    const discountWindowDays = this.getThreshold("sybil_discount_window_days", 7, config);
    const matches: HeuristicMatch[] = [];

    const dormantNewAccounts: string[] = [];
    const now = Date.now();
    const discountWindowMs = discountWindowDays * 24 * 60 * 60 * 1000;

    for (const profile of data.accountProfiles) {
      if (!profile.createdAt) continue;
      const createdAt = new Date(profile.createdAt).getTime();
      if (now - createdAt < discountWindowMs * 2) continue;
      const daysSinceLastTrade = (now - profile.lastTradeTime) / (24 * 60 * 60 * 1000);
      if (daysSinceLastTrade > discountWindowDays && profile.volume30d > 0) {
        dormantNewAccounts.push(profile.accountId);
      }
    }

    const byFunding = new Map<string, string[]>();
    for (const accountId of dormantNewAccounts) {
      const profile = idx.profileByAccount.get(accountId);
      if (!profile?.fundingSource) continue;
      const list = byFunding.get(profile.fundingSource) ?? [];
      list.push(accountId);
      byFunding.set(profile.fundingSource, list);
    }

    for (const [source, accountIds] of byFunding) {
      if (accountIds.length < 2) continue;
      for (const accountId of accountIds) {
        matches.push(this.match(
          "sybil:discount_recycling", accountId,
          Math.min(1, accountIds.length * 0.25),
          { fundingSource: source, recycledAccounts: accountIds.length, dormantNewAccounts: dormantNewAccounts.length },
          `Account ${accountId} likely discount recycling — dormant after discount, shared funding with ${accountIds.length - 1} similar accounts`,
        ));
      }
    }

    return matches;
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom > 0 ? dot / denom : 0;
}
