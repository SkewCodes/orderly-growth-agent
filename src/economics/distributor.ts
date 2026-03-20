import type { TierName } from "../types.js";
import { getTierDefinition, getTierIndex } from "./tiers.js";

const GUARANTEED_MIN_SPREAD_BPS = 0.1;

/**
 * Calculate the distributor spread per taker trade.
 * Spread = max(0.1 bps, invitee_base_fee - your_base_fee)
 */
export function calcDistributorSpread(
  distributorTier: TierName,
  inviteeTier: TierName,
): number {
  const distributorBase = getTierDefinition(distributorTier).cryptoBaseBps;
  const inviteeBase = getTierDefinition(inviteeTier).cryptoBaseBps;
  const spread = inviteeBase - distributorBase;
  return Math.max(GUARANTEED_MIN_SPREAD_BPS, spread);
}

/**
 * Estimate annual distributor revenue from an invitee.
 */
export function estimateInviteeRevenue(
  distributorTier: TierName,
  inviteeTier: TierName,
  inviteeMonthlyVolume: number,
): number {
  const spreadBps = calcDistributorSpread(distributorTier, inviteeTier);
  const spreadRate = spreadBps / 10000;
  return inviteeMonthlyVolume * 12 * spreadRate;
}

/**
 * Calculate total distributor revenue from all invitees.
 */
export function calcTotalDistributorRevenue(
  distributorTier: TierName,
  invitees: Array<{ tier: TierName; volume30d: number }>,
): number {
  return invitees.reduce((total, inv) => {
    const spread = calcDistributorSpread(distributorTier, inv.tier);
    return total + (inv.volume30d * (spread / 10000));
  }, 0);
}

/**
 * Calculate how many invitees at a given volume would close a tier volume gap.
 */
export function inviteesNeededForTier(
  volumeGap: number,
  avgInviteeMonthlyVolume: number,
): number {
  if (avgInviteeMonthlyVolume <= 0) return Infinity;
  return Math.ceil(volumeGap / avgInviteeMonthlyVolume);
}

/**
 * Best tier to assign to an invitee to maximize your revenue while
 * remaining competitive.
 * Strategy: assign the lowest tier you can (highest base → biggest spread),
 * BUT at least one tier better than PUBLIC to be attractive.
 */
export function recommendInviteeAssignment(
  distributorTier: TierName,
): { assignTier: TierName; spreadBps: number; pitch: string } | null {
  const def = getTierDefinition(distributorTier);
  if (def.canAssignTiers.length === 0) {
    return null; // PUBLIC/SILVER can't assign
  }

  // Offer the best tier we can to be competitive (one below ours)
  const myIdx = getTierIndex(distributorTier);
  const offerTier = def.canAssignTiers[0]; // highest tier we can assign (first in list)
  const spread = calcDistributorSpread(distributorTier, offerTier);
  const offerDef = getTierDefinition(offerTier);

  const pitches: Record<TierName, string> = {
    PUBLIC: "",
    SILVER: `Launch through me and get Silver pricing from day one (${offerDef.cryptoBaseBps} bps vs 3.00 bps)`,
    GOLD: `Get Gold pricing immediately (${offerDef.cryptoBaseBps} bps) — no volume requirement`,
    PLATINUM: `Get Platinum pricing (${offerDef.cryptoBaseBps} bps) — equivalent to $1B volume tier`,
    DIAMOND: "",
  };

  return {
    assignTier: offerTier,
    spreadBps: spread,
    pitch: pitches[offerTier] || `Get ${offerTier} pricing from day one`,
  };
}
