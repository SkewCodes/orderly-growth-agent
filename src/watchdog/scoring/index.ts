import type { DetectorResult, HeuristicMatch, AccountRiskScore, WatchdogConfig, WatchdogState, EnforcementTier } from "../types.js";
import { getWeight } from "./weights.js";
import { getTierForScore } from "../enforcement/tiers.js";

/**
 * SCORE phase: aggregate heuristic matches into per-account risk scores (0-100).
 */
export function scoreAccounts(
  detectorResults: DetectorResult[],
  previousState: WatchdogState,
  config: WatchdogConfig,
): AccountRiskScore[] {
  // Collect all matches, grouping by account
  const accountMatches = new Map<string, HeuristicMatch[]>();

  for (const result of detectorResults) {
    for (const match of result.matches) {
      // Skip allowlisted accounts
      if (config.allowlist.includes(match.accountId)) continue;
      if (previousState.allowlist.includes(match.accountId)) continue;

      const list = accountMatches.get(match.accountId) ?? [];
      list.push(match);
      accountMatches.set(match.accountId, list);
    }
  }

  const scores: AccountRiskScore[] = [];
  const now = new Date().toISOString();

  for (const [accountId, matches] of accountMatches) {
    // Deduplicate by heuristicId — keep highest confidence per heuristic
    const bestByHeuristic = new Map<string, HeuristicMatch>();
    for (const m of matches) {
      const existing = bestByHeuristic.get(m.heuristicId);
      if (!existing || m.confidence > existing.confidence) {
        bestByHeuristic.set(m.heuristicId, m);
      }
    }

    // Compute weighted score
    let totalScore = 0;
    for (const m of bestByHeuristic.values()) {
      const weight = getWeight(m.heuristicId, config.weightOverrides);
      const contribution = Math.min(weight.baseWeight * m.confidence, weight.maxContribution);
      totalScore += contribution;
    }

    totalScore = Math.max(0, Math.min(100, totalScore));

    // Determine enforcement tier
    const tierDef = getTierForScore(totalScore);

    // Get previous score for delta calculation
    const previousRisk = previousState.flaggedAccounts[accountId];
    const previousScore = previousRisk?.totalScore ?? null;
    const scoreDelta = previousScore !== null ? totalScore - previousScore : totalScore;

    // Group matches by detector
    const matchesByDetector: AccountRiskScore["matchesByDetector"] = {};
    for (const m of bestByHeuristic.values()) {
      const list = matchesByDetector[m.detector] ?? [];
      list.push(m);
      matchesByDetector[m.detector] = list;
    }

    scores.push({
      accountId,
      totalScore,
      tier: tierDef.tier as EnforcementTier,
      matchesByDetector,
      previousScore,
      scoreDelta,
      timestamp: now,
    });
  }

  // Sort by score descending
  scores.sort((a, b) => b.totalScore - a.totalScore);

  return scores;
}
