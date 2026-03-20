import type { VolumeMetrics, Diagnosis } from "../types.js";
import type { WatchdogState, EnforcementTier } from "./types.js";

/**
 * Get clean volume by subtracting flagged account volume.
 * Called in the growth agent's COLLECT phase.
 */
export function getCleanVolume(
  grossVolume: VolumeMetrics,
  flaggedAccountVolumes: Map<string, number>,
): VolumeMetrics {
  let suspectVolume = 0;
  for (const vol of flaggedAccountVolumes.values()) {
    suspectVolume += vol;
  }

  if (suspectVolume <= 0) return grossVolume;

  // Proportionally reduce all volume metrics
  const factor = grossVolume.volume30dTotal > 0
    ? Math.max(0, 1 - suspectVolume / grossVolume.volume30dTotal)
    : 1;

  return {
    ...grossVolume,
    volume24h: grossVolume.volume24h * factor,
    volume7dAvg: grossVolume.volume7dAvg * factor,
    volume30dAvg: grossVolume.volume30dAvg * factor,
    volume30dTotal: grossVolume.volume30dTotal - suspectVolume,
    // Keep trend and ratios unchanged — they're relative metrics
    volumeTrend: grossVolume.volumeTrend,
    makerVolume7d: grossVolume.makerVolume7d * factor,
    takerVolume7d: grossVolume.takerVolume7d * factor,
    makerRatio: grossVolume.makerRatio,
    dailyVolumes: grossVolume.dailyVolumes, // keep raw daily data
  };
}

/**
 * Convert watchdog state into growth agent Diagnosis objects.
 * Called in the growth agent's DIAGNOSE phase.
 */
export function getWatchdogDiagnoses(state: WatchdogState): Diagnosis[] {
  const diagnoses: Diagnosis[] = [];
  const flaggedCount = Object.keys(state.flaggedAccounts).length;

  if (flaggedCount === 0) return diagnoses;

  // Count by enforcement tier
  const tierCounts: Record<string, number> = {};
  let maxScore = 0;
  for (const score of Object.values(state.flaggedAccounts)) {
    tierCounts[score.tier] = (tierCounts[score.tier] ?? 0) + 1;
    maxScore = Math.max(maxScore, score.totalScore);
  }

  const escalateCount = tierCounts["ESCALATE"] ?? 0;
  const penalizeCount = tierCounts["PENALIZE"] ?? 0;
  const restrictCount = tierCounts["RESTRICT"] ?? 0;

  if (escalateCount > 0 || penalizeCount > 0) {
    diagnoses.push({
      code: "WATCHDOG_ABUSE_DETECTED" as Diagnosis["code"],
      severity: "critical",
      evidence: {
        flaggedAccounts: flaggedCount,
        escalations: escalateCount,
        penalties: penalizeCount,
        restrictions: restrictCount,
        maxRiskScore: maxScore,
      },
      message: `Watchdog: ${flaggedCount} flagged accounts (${escalateCount} escalations, ${penalizeCount} penalties)`,
      suggestedPlaybooks: [],
    });
  } else if (restrictCount > 0) {
    diagnoses.push({
      code: "WATCHDOG_ABUSE_DETECTED" as Diagnosis["code"],
      severity: "warning",
      evidence: {
        flaggedAccounts: flaggedCount,
        restrictions: restrictCount,
        maxRiskScore: maxScore,
      },
      message: `Watchdog: ${flaggedCount} flagged accounts (${restrictCount} restricted)`,
      suggestedPlaybooks: [],
    });
  }

  return diagnoses;
}

/**
 * Check if a specific account should be blocked from tier promotions.
 */
export function shouldBlockPromotion(accountId: string, state: WatchdogState): boolean {
  const score = state.flaggedAccounts[accountId];
  if (!score) return false;
  return score.totalScore > 40; // RESTRICT and above
}

/**
 * Get all flagged account IDs at or above a given enforcement tier.
 */
export function getFlaggedAccountIds(
  state: WatchdogState,
  minTier: EnforcementTier = "MONITOR",
): string[] {
  const tierOrder: EnforcementTier[] = ["CLEAN", "MONITOR", "RESTRICT", "PENALIZE", "ESCALATE"];
  const minIndex = tierOrder.indexOf(minTier);

  return Object.entries(state.flaggedAccounts)
    .filter(([, score]) => tierOrder.indexOf(score.tier) >= minIndex)
    .map(([accountId]) => accountId);
}

/**
 * Compute the total suspect volume from flagged accounts.
 * Used for volume integrity reporting.
 */
export function computeSuspectVolume(
  state: WatchdogState,
  accountVolumes: Map<string, number>,
): number {
  let total = 0;
  for (const accountId of Object.keys(state.flaggedAccounts)) {
    const score = state.flaggedAccounts[accountId];
    if (score.totalScore > 40) { // only exclude RESTRICT and above
      total += accountVolumes.get(accountId) ?? 0;
    }
  }
  return total;
}
