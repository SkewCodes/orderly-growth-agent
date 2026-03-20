import type { GrowthState, ROIResult, Verdict, PlaybookRun, MetricsSnapshot } from "../types.js";
import { getTierDefinition } from "../economics/tiers.js";

/**
 * MEASURE phase: evaluate ROI of previous cycle's playbook actions.
 * Runs FIRST in the loop (before collect) to evaluate the previous cycle
 * before starting a new one.
 */
export function measure(state: GrowthState): ROIResult[] {
  const results: ROIResult[] = [];

  // Find playbook runs that haven't been measured yet
  const unmeasured = state.playbookHistory.filter(
    (run) => !state.verdicts[run.playbook] && !run.dryRun
  );

  if (unmeasured.length === 0 || state.metricsHistory.length < 2) {
    return results;
  }

  for (const run of unmeasured) {
    const result = measurePlaybookRun(run, state);
    if (result) {
      results.push(result);
      state.verdicts[run.playbook] = result.verdict;
    }
  }

  return results;
}

function measurePlaybookRun(
  run: PlaybookRun,
  state: GrowthState,
): ROIResult | null {
  const history = state.metricsHistory;
  if (history.length < 2) return null;

  // Find the metrics snapshot closest to when the playbook started
  const startIdx = findClosestSnapshot(history, run.startedAt);
  if (startIdx < 0 || startIdx >= history.length - 1) return null;

  const before = history[startIdx];
  const after = history[history.length - 1];

  const startDate = new Date(run.startedAt);
  const endDate = new Date(run.completedAt);
  const durationDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

  // Volume lift
  const volumeLiftPct = before.volume7dAvg > 0
    ? ((after.volume7dAvg - before.volume7dAvg) / before.volume7dAvg)
    : 0;

  // Revenue delta (daily)
  const revenueDelta = (after.dailyRevenue - before.dailyRevenue) * durationDays;

  // Cost estimation from actions (simplified)
  const costTotal = estimateCost(run);
  const roi = costTotal > 0 ? (revenueDelta - costTotal) / costTotal : revenueDelta > 0 ? Infinity : 0;

  // Tier impact
  const tierProgressBefore = before.aggregateVolume;
  const tierProgressAfter = after.aggregateVolume;

  // Determine tier at time of run
  const tierName = (run.params.tier as string) || "PUBLIC";
  const tierDef = getTierDefinition(tierName as "PUBLIC");
  const baseBps = tierDef.cryptoBaseBps;

  const verdict: Verdict = roi > 1.0 ? "REPEAT" : roi > 0 ? "MODIFY" : "RETIRE";

  return {
    playbook: run.playbook,
    durationDays,
    tier: tierDef.name,
    baseBps,
    volumeLiftPct: Math.round(volumeLiftPct * 10000) / 100,
    revenueDelta: Math.round(revenueDelta * 100) / 100,
    costTotal: Math.round(costTotal * 100) / 100,
    costBreakdown: { feeDiscounts: costTotal * 0.5, prizes: costTotal * 0.3, rebates: costTotal * 0.2 },
    roi: Math.round(roi * 10000) / 100,
    tierImpact: {
      volumeContributed: tierProgressAfter - tierProgressBefore,
      progressBefore: tierProgressBefore,
      progressAfter: tierProgressAfter,
      tierUpgraded: false, // would check tier history
    },
    verdict,
  };
}

function findClosestSnapshot(history: MetricsSnapshot[], targetDate: string): number {
  const target = new Date(targetDate).getTime();
  let closest = 0;
  let minDiff = Infinity;
  for (let i = 0; i < history.length; i++) {
    const diff = Math.abs(new Date(history[i].timestamp).getTime() - target);
    if (diff < minDiff) {
      minDiff = diff;
      closest = i;
    }
  }
  return closest;
}

function estimateCost(run: PlaybookRun): number {
  // Sum up costs from actions that involved fee discounts, prizes, or rebates
  let cost = 0;
  for (const action of run.actions) {
    if (action.type === "fee_change" && action.params.costEstimate) {
      cost += action.params.costEstimate as number;
    }
    if (action.type === "campaign_create" && action.params.prizePool) {
      cost += action.params.prizePool as number;
    }
    if (action.type === "referral_create" && action.params.rebateCost) {
      cost += action.params.rebateCost as number;
    }
  }
  return cost;
}
