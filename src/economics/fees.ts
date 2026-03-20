import type { TierName } from "../types.js";
import { getTierDefinition } from "./tiers.js";

/**
 * Calculate builder margin in bps.
 * margin = user_fee_bps - base_fee_bps(tier)
 */
export function calcBuilderMargin(userFeeBps: number, tier: TierName): number {
  const base = getTierDefinition(tier).cryptoBaseBps;
  return userFeeBps - base;
}

/**
 * Convert bps to a rate (e.g., 3.0 bps → 0.0003).
 */
export function bpsToRate(bps: number): number {
  return bps / 10000;
}

/**
 * Convert rate to bps (e.g., 0.0003 → 3.0).
 */
export function rateToBps(rate: number): number {
  return rate * 10000;
}

/**
 * Revenue from volume given margin in bps.
 */
export function calcRevenueFromVolume(volumeUsd: number, marginBps: number): number {
  return volumeUsd * bpsToRate(marginBps);
}

/**
 * Project annual revenue at a given tier.
 */
export function projectRevenueAtTier(
  monthlyVolume: number,
  userFeeBps: number,
  tier: TierName,
): number {
  const margin = calcBuilderMargin(userFeeBps, tier);
  return calcRevenueFromVolume(monthlyVolume * 12, margin);
}

/**
 * Ensure a fee rate never goes below base fee for the tier.
 * Returns the safe fee rate.
 */
export function enforceMinFee(proposedFeeBps: number, tier: TierName): number {
  const base = getTierDefinition(tier).cryptoBaseBps;
  return Math.max(proposedFeeBps, base);
}

/**
 * Calculate the user fee tier based on their activity.
 * Returns recommended taker fee in bps relative to base.
 */
export function calcUserFeeTier(
  tier: TierName,
  opts: {
    makerRatio?: number;
    orderStaked?: number;
    volume30d?: number;
  },
): { makerBps: number; takerBps: number; tierLabel: string } {
  const base = getTierDefinition(tier).cryptoBaseBps;

  // Market maker tier
  if (opts.makerRatio && opts.makerRatio > 0.8) {
    return { makerBps: -0.01, takerBps: base + 1.5, tierLabel: "MM_TIER" };
  }

  // VIP Platinum (100K+ ORDER staked)
  if (opts.orderStaked && opts.orderStaked > 100_000) {
    return { makerBps: 0, takerBps: base + 1.0, tierLabel: "VIP_PLATINUM" };
  }

  // VIP Gold (10K+ staked OR $10M+ volume)
  if ((opts.orderStaked && opts.orderStaked > 10_000) || (opts.volume30d && opts.volume30d > 10_000_000)) {
    return { makerBps: 0.5, takerBps: base + 1.5, tierLabel: "VIP_GOLD" };
  }

  // Tier 3 ($1M+ volume)
  if (opts.volume30d && opts.volume30d > 1_000_000) {
    return { makerBps: 1.0, takerBps: base + 2.0, tierLabel: "TIER_3" };
  }

  // Tier 2 ($100K+ volume)
  if (opts.volume30d && opts.volume30d > 100_000) {
    return { makerBps: 1.5, takerBps: base + 2.5, tierLabel: "TIER_2" };
  }

  // Standard
  return { makerBps: 2.0, takerBps: base + 3.0, tierLabel: "STANDARD" };
}

/**
 * Apply staking bonus discount to the builder's margin portion of the fee.
 */
export function applyStakingBonus(marginBps: number, userOrderStaked: number): number {
  let discountPct = 0;
  if (userOrderStaked >= 500_000) discountPct = 0.50;
  else if (userOrderStaked >= 100_000) discountPct = 0.40;
  else if (userOrderStaked >= 25_000) discountPct = 0.30;
  else if (userOrderStaked >= 5_000) discountPct = 0.20;
  else if (userOrderStaked >= 1_000) discountPct = 0.10;

  return marginBps * (1 - discountPct);
}
