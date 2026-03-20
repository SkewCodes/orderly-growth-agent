import { Detector, type ScanDataIndex } from "./base.js";
import type { ScanData, WatchdogConfig, HeuristicMatch } from "../types.js";

/**
 * Detector 6: Referral Fraud
 * 3 heuristics: circular referrals, inactive referees, self-referral drain
 */
export class ReferralFraudDetector extends Detector {
  readonly name = "REFERRAL_FRAUD" as const;
  readonly heuristics = ["referral:circular", "referral:inactive_referees", "referral:self_referral_drain"];

  protected runChecks(data: ScanData, config: WatchdogConfig, idx: ScanDataIndex): HeuristicMatch[] {
    return [
      ...this.checkCircularReferrals(config, idx),
      ...this.checkInactiveReferees(data, config, idx),
      ...this.checkSelfReferralDrain(data, config, idx),
    ];
  }

  private checkCircularReferrals(config: WatchdogConfig, idx: ScanDataIndex): HeuristicMatch[] {
    const maxCycleLength = this.getThreshold("referral_max_cycle_length", 5, config);
    const matches: HeuristicMatch[] = [];
    const flagged = new Set<string>();

    for (const startNode of idx.referrerToInvitees.keys()) {
      if (flagged.has(startNode)) continue;

      const visited = new Set<string>();
      const stack: { node: string; depth: number; path: string[] }[] = [
        { node: startNode, depth: 0, path: [startNode] },
      ];

      while (stack.length > 0) {
        const { node, depth, path } = stack.pop()!;
        if (depth > maxCycleLength) continue;

        const neighbors = idx.referrerToInvitees.get(node) ?? [];
        for (const neighbor of neighbors) {
          if (neighbor === startNode && depth >= 1) {
            for (const nodeInCycle of path) {
              if (!flagged.has(nodeInCycle)) {
                flagged.add(nodeInCycle);
                matches.push(this.match(
                  "referral:circular", nodeInCycle,
                  Math.min(1, 0.7 + 0.1 * (maxCycleLength - path.length)),
                  { cycleLength: path.length, cyclePath: path },
                  `Account ${nodeInCycle} in referral cycle of length ${path.length}`,
                ));
              }
            }
          } else if (!visited.has(neighbor) && depth < maxCycleLength) {
            visited.add(neighbor);
            stack.push({ node: neighbor, depth: depth + 1, path: [...path, neighbor] });
          }
        }
      }
    }

    return matches;
  }

  private checkInactiveReferees(data: ScanData, config: WatchdogConfig, idx: ScanDataIndex): HeuristicMatch[] {
    const minConversion = this.getThreshold("referral_min_conversion", 0.05, config);
    const minReferees = this.getThreshold("referral_min_referees", 20, config);
    const minTradeVolume = this.getThreshold("referral_min_trade_volume", 100, config);
    const matches: HeuristicMatch[] = [];

    const codeStats = new Map<string, { referrerId: string; total: number; traded: number }>();
    for (const edge of data.referralGraph) {
      if (!edge.referrerAccountId || !edge.refereeAccountId) continue;
      const key = `${edge.referralCode}|${edge.referrerAccountId}`;
      const stats = codeStats.get(key) ?? { referrerId: edge.referrerAccountId, total: 0, traded: 0 };
      stats.total++;
      const profile = idx.profileByAccount.get(edge.refereeAccountId);
      if (profile && profile.volume30d > minTradeVolume) stats.traded++;
      codeStats.set(key, stats);
    }

    for (const [key, stats] of codeStats) {
      if (stats.total < minReferees) continue;
      const conversion = stats.traded / stats.total;
      if (conversion < minConversion) {
        matches.push(this.match(
          "referral:inactive_referees", stats.referrerId,
          Math.min(1, (minConversion - conversion) / minConversion * 0.5 + 0.5),
          { referralCode: key.split("|")[0], totalReferees: stats.total, tradedReferees: stats.traded, conversion: conversion.toFixed(3) },
          `Referral code has ${(conversion * 100).toFixed(1)}% conversion (${stats.traded}/${stats.total} referees traded)`,
        ));
      }
    }

    return matches;
  }

  private checkSelfReferralDrain(data: ScanData, config: WatchdogConfig, idx: ScanDataIndex): HeuristicMatch[] {
    const matches: HeuristicMatch[] = [];

    const referrerFlags = new Map<string, { linkedReferees: string[]; referralCode: string }>();
    for (const edge of data.referralGraph) {
      if (!edge.referrerAccountId || !edge.refereeAccountId) continue;

      const referrer = idx.profileByAccount.get(edge.referrerAccountId);
      const referee = idx.profileByAccount.get(edge.refereeAccountId);
      if (!referrer || !referee) continue;

      const fundingMatch = referrer.fundingSource && referee.fundingSource && referrer.fundingSource === referee.fundingSource;
      const destMatch = referrer.withdrawalDest && referee.withdrawalDest && referrer.withdrawalDest === referee.withdrawalDest;

      if (fundingMatch || destMatch) {
        const flags = referrerFlags.get(edge.referrerAccountId) ?? { linkedReferees: [], referralCode: edge.referralCode };
        flags.linkedReferees.push(edge.refereeAccountId);
        referrerFlags.set(edge.referrerAccountId, flags);
      }
    }

    for (const [referrerId, flags] of referrerFlags) {
      if (flags.linkedReferees.length === 0) continue;
      matches.push(this.match(
        "referral:self_referral_drain", referrerId,
        Math.min(1, flags.linkedReferees.length * 0.3),
        { linkedReferees: flags.linkedReferees, referralCode: flags.referralCode, linkedCount: flags.linkedReferees.length },
        `Referrer ${referrerId} has ${flags.linkedReferees.length} referees sharing funding/withdrawal addresses`,
      ));
    }

    return matches;
  }
}
