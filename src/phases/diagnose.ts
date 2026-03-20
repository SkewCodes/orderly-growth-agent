import type { CollectedMetrics, Diagnosis, GrowthConfig, GrowthState } from "../types.js";
import type { WatchdogState } from "../watchdog/types.js";
import { runDiagnostics } from "../diagnostics/index.js";
import { getWatchdogDiagnoses } from "../watchdog/integration.js";

/**
 * DIAGNOSE phase: run diagnostic engine against collected metrics.
 * Also checks state for trend-based signals (e.g., consecutive declining days).
 * Merges watchdog abuse diagnoses when available.
 */
export function diagnose(
  metrics: CollectedMetrics,
  state: GrowthState,
  config: GrowthConfig,
  watchdogState?: WatchdogState,
): Diagnosis[] {
  const diagnoses = runDiagnostics(metrics, config);

  // Merge watchdog diagnoses
  if (watchdogState) {
    const watchdogDiagnoses = getWatchdogDiagnoses(watchdogState);
    diagnoses.push(...watchdogDiagnoses);
  }

  // Enhance with historical context from state
  if (state.metricsHistory.length >= 2) {
    const prev = state.metricsHistory[state.metricsHistory.length - 1];

    // Check for revenue compression MoM (if we have 30+ days of history)
    if (state.metricsHistory.length >= 4) {
      const fourCyclesAgo = state.metricsHistory[state.metricsHistory.length - 4];
      if (fourCyclesAgo.dailyRevenue > 0) {
        const revDecline = 1 - (metrics.revenue.dailyRevenue / fourCyclesAgo.dailyRevenue);
        if (revDecline > 0.15 && !diagnoses.some((d) => d.code === "REVENUE_COMPRESSION")) {
          diagnoses.push({
            code: "REVENUE_COMPRESSION",
            severity: "warning",
            evidence: {
              currentDailyRevenue: metrics.revenue.dailyRevenue,
              previousDailyRevenue: fourCyclesAgo.dailyRevenue,
              declinePct: revDecline,
            },
            message: `Daily revenue declined ${(revDecline * 100).toFixed(0)}% over last 4 cycles`,
            suggestedPlaybooks: ["FEE_OPTIMIZATION"],
          });
        }
      }
    }
  }

  return diagnoses;
}
