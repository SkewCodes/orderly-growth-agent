import { Detector, type ScanDataIndex } from "./base.js";
import type { ScanData, WatchdogConfig, HeuristicMatch } from "../types.js";

/**
 * Detector 3: Distributor Programme Gaming
 * 4 heuristics: self-referral, shell invitee, volume cycling, tier assignment abuse
 */
export class DistributorGamingDetector extends Detector {
  readonly name = "DISTRIBUTOR_GAMING" as const;
  readonly heuristics = [
    "distgaming:self_referral",
    "distgaming:shell_invitee",
    "distgaming:volume_cycling",
    "distgaming:tier_assignment_abuse",
  ];

  protected runChecks(data: ScanData, config: WatchdogConfig, idx: ScanDataIndex): HeuristicMatch[] {
    return [
      ...this.checkSelfReferral(data, idx),
      ...this.checkShellInvitee(data, config, idx),
      ...this.checkVolumeCycling(data, config, idx),
      ...this.checkTierAssignmentAbuse(data, config, idx),
    ];
  }

  private checkSelfReferral(data: ScanData, idx: ScanDataIndex): HeuristicMatch[] {
    const matches: HeuristicMatch[] = [];

    for (const edge of data.referralGraph) {
      if (!edge.referrerAccountId || !edge.refereeAccountId) continue;
      const referrer = idx.profileByAccount.get(edge.referrerAccountId);
      const referee = idx.profileByAccount.get(edge.refereeAccountId);
      if (!referrer || !referee) continue;

      const indicators: string[] = [];
      if (referrer.fundingSource && referee.fundingSource && referrer.fundingSource === referee.fundingSource) {
        indicators.push("common_funding");
      }
      if (referrer.withdrawalDest && referee.withdrawalDest && referrer.withdrawalDest === referee.withdrawalDest) {
        indicators.push("common_destination");
      }

      if (indicators.length > 0) {
        matches.push(this.match(
          "distgaming:self_referral", edge.referrerAccountId,
          Math.min(1, indicators.length * 0.5),
          { inviteeId: edge.refereeAccountId, referralCode: edge.referralCode, indicators },
          `Distributor ${edge.referrerAccountId} likely controls invitee ${edge.refereeAccountId} (${indicators.join(", ")})`,
        ));
      }
    }

    return matches;
  }

  private checkShellInvitee(data: ScanData, config: WatchdogConfig, idx: ScanDataIndex): HeuristicMatch[] {
    const minUniqueTraders = this.getThreshold("distgaming_min_unique_traders", 5, config);
    const matches: HeuristicMatch[] = [];

    const inviteeIds = new Set(
      data.referralGraph.filter((e) => e.refereeAccountId).map((e) => e.refereeAccountId)
    );

    const inviteeCounterparties = new Map<string, Set<string>>();
    for (const trade of data.trades) {
      if (!inviteeIds.has(trade.accountId) || !trade.counterpartyId) continue;
      const set = inviteeCounterparties.get(trade.accountId) ?? new Set<string>();
      set.add(trade.counterpartyId);
      inviteeCounterparties.set(trade.accountId, set);
    }

    for (const [inviteeId, counterparties] of inviteeCounterparties) {
      if (counterparties.size < minUniqueTraders) {
        const profile = idx.profileByAccount.get(inviteeId);
        if (!profile || profile.volume30d < 10_000) continue;
        matches.push(this.match(
          "distgaming:shell_invitee", inviteeId,
          Math.min(1, 1 - counterparties.size / minUniqueTraders),
          { uniqueCounterparties: counterparties.size, minRequired: minUniqueTraders, volume30d: profile.volume30d },
          `Invitee ${inviteeId} has only ${counterparties.size} unique counterparties (low diversity)`,
        ));
      }
    }

    return matches;
  }

  private checkVolumeCycling(data: ScanData, config: WatchdogConfig, idx: ScanDataIndex): HeuristicMatch[] {
    const concentrationThreshold = this.getThreshold("distgaming_cycling_concentration", 0.5, config);
    const matches: HeuristicMatch[] = [];

    for (const [distributorId, inviteeList] of idx.referrerToInvitees) {
      const inviteeSet = new Set(inviteeList);
      let volumeWithInvitees = 0;
      let totalVolume = 0;

      for (const trade of data.trades) {
        if (trade.accountId !== distributorId) continue;
        const notional = trade.size * trade.price;
        totalVolume += notional;
        if (trade.counterpartyId && inviteeSet.has(trade.counterpartyId)) {
          volumeWithInvitees += notional;
        }
      }

      if (totalVolume === 0) continue;
      const concentration = volumeWithInvitees / totalVolume;

      if (concentration > concentrationThreshold) {
        matches.push(this.match(
          "distgaming:volume_cycling", distributorId,
          Math.min(1, concentration),
          { volumeWithInvitees, totalVolume, concentration: concentration.toFixed(3), inviteeCount: inviteeSet.size },
          `Distributor ${distributorId} has ${(concentration * 100).toFixed(0)}% volume with own invitees`,
        ));
      }
    }

    return matches;
  }

  private checkTierAssignmentAbuse(data: ScanData, config: WatchdogConfig, idx: ScanDataIndex): HeuristicMatch[] {
    const matches: HeuristicMatch[] = [];
    const feeRateByAccount = new Map(data.userFeeRates.map((r) => [r.accountId, r]));

    for (const [distributorId, inviteeIds] of idx.referrerToInvitees) {
      const distributorProfile = idx.profileByAccount.get(distributorId);
      if (!distributorProfile) continue;

      for (const inviteeId of inviteeIds) {
        const inviteeProfile = idx.profileByAccount.get(inviteeId);
        const inviteeFee = feeRateByAccount.get(inviteeId);
        if (!inviteeProfile || !inviteeFee) continue;

        const fundingMatch = distributorProfile.fundingSource && inviteeProfile.fundingSource &&
          distributorProfile.fundingSource === inviteeProfile.fundingSource;
        const destMatch = distributorProfile.withdrawalDest && inviteeProfile.withdrawalDest &&
          distributorProfile.withdrawalDest === inviteeProfile.withdrawalDest;

        if ((fundingMatch || destMatch) && inviteeFee.makerRate < 0.0003) {
          matches.push(this.match(
            "distgaming:tier_assignment_abuse", distributorId,
            fundingMatch && destMatch ? 0.9 : 0.7,
            { inviteeId, inviteeMakerRate: inviteeFee.makerRate, fundingMatch, destMatch },
            `Distributor ${distributorId} assigned preferential tier to linked account ${inviteeId}`,
          ));
        }
      }
    }

    return matches;
  }
}
