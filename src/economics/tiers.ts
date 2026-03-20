import type { TierName, TierDefinition, TierProgressionMetrics, StakingMetrics } from "../types.js";

export const TIER_TABLE: TierDefinition[] = [
  {
    name: "PUBLIC",
    volume30dThreshold: 0,
    orderStakedThreshold: 0,
    cryptoBaseBps: 3.0,
    rwaBaseBps: 5.0,
    makerBaseBps: 0,
    canAssignTiers: [],
  },
  {
    name: "SILVER",
    volume30dThreshold: 30_000_000,
    orderStakedThreshold: 100_000,
    cryptoBaseBps: 2.75,
    rwaBaseBps: 4.75,
    makerBaseBps: 0,
    canAssignTiers: [],
  },
  {
    name: "GOLD",
    volume30dThreshold: 90_000_000,
    orderStakedThreshold: 250_000,
    cryptoBaseBps: 2.5,
    rwaBaseBps: 4.5,
    makerBaseBps: 0,
    canAssignTiers: ["SILVER", "PUBLIC"],
  },
  {
    name: "PLATINUM",
    volume30dThreshold: 1_000_000_000,
    orderStakedThreshold: 2_000_000,
    cryptoBaseBps: 2.0,
    rwaBaseBps: 4.0,
    makerBaseBps: 0,
    canAssignTiers: ["GOLD", "SILVER", "PUBLIC"],
  },
  {
    name: "DIAMOND",
    volume30dThreshold: 10_000_000_000,
    orderStakedThreshold: 7_000_000,
    cryptoBaseBps: 1.0,
    rwaBaseBps: 3.0,
    makerBaseBps: 0,
    canAssignTiers: ["PLATINUM", "GOLD", "SILVER", "PUBLIC"],
  },
];

const TIER_ORDER: TierName[] = ["PUBLIC", "SILVER", "GOLD", "PLATINUM", "DIAMOND"];

export function getTierDefinition(name: TierName): TierDefinition {
  return TIER_TABLE.find((t) => t.name === name)!;
}

export function getTierIndex(name: TierName): number {
  return TIER_ORDER.indexOf(name);
}

export function getCurrentTier(volume30d: number, orderStaked: number): TierDefinition {
  let best = TIER_TABLE[0];
  for (const tier of TIER_TABLE) {
    if (volume30d >= tier.volume30dThreshold || orderStaked >= tier.orderStakedThreshold) {
      best = tier;
    }
  }
  return best;
}

export function getNextTier(current: TierName): TierDefinition | null {
  const idx = getTierIndex(current);
  if (idx >= TIER_ORDER.length - 1) return null;
  return getTierDefinition(TIER_ORDER[idx + 1]);
}

export function calcTierProgression(
  volume30d: number,
  aggregateVolume: number,
  staking: StakingMetrics,
  projectedAnnualVolume: number,
): TierProgressionMetrics {
  const current = getCurrentTier(aggregateVolume, staking.orderStaked);
  const next = getNextTier(current.name);

  if (!next) {
    return {
      currentTier: current.name,
      nextTier: null,
      volumeToNext: 0,
      stakingToNext: 0,
      daysToNextTier: null,
      marginGainAtNext: 0,
      annualMarginGain: 0,
      progressPct: 100,
    };
  }

  const volumeGap = Math.max(0, next.volume30dThreshold - aggregateVolume);
  const stakingGap = Math.max(0, next.orderStakedThreshold - staking.orderStaked);
  const volume7dAvg = volume30d / 30 * 7; // rough estimate
  const dailyVolume = volume30d / 30;
  const daysToNext = volumeGap > 0 && dailyVolume > 0 ? Math.ceil(volumeGap / dailyVolume) : null;
  const marginGain = current.cryptoBaseBps - next.cryptoBaseBps;
  const annualGain = (marginGain / 10000) * projectedAnnualVolume;

  // Progress is whichever path is closer (volume or staking)
  const volumeProgress = next.volume30dThreshold > 0
    ? Math.min(100, (aggregateVolume / next.volume30dThreshold) * 100)
    : 100;
  const stakingProgress = next.orderStakedThreshold > 0
    ? Math.min(100, (staking.orderStaked / next.orderStakedThreshold) * 100)
    : 100;
  const progressPct = Math.max(volumeProgress, stakingProgress);

  return {
    currentTier: current.name,
    nextTier: next.name,
    volumeToNext: volumeGap,
    stakingToNext: stakingGap,
    daysToNextTier: daysToNext,
    marginGainAtNext: marginGain,
    annualMarginGain: annualGain,
    progressPct: Math.round(progressPct * 100) / 100,
  };
}

export function canAssignTier(builderTier: TierName, targetTier: TierName): boolean {
  const def = getTierDefinition(builderTier);
  return def.canAssignTiers.includes(targetTier);
}
