import type { Diagnosis, Decision, GrowthConfig, GrowthState, PlaybookName, DiagnosisCode } from "../types.js";

/**
 * Priority ordering per SKILL.md spec.
 * Lower number = higher priority.
 */
const PRIORITY: Record<DiagnosisCode, number> = {
  TIER_PUSH_OPPORTUNITY: 1,
  DISTRIBUTOR_OPPORTUNITY: 2,
  VOLUME_DECLINE: 3,
  HIGH_CHURN: 3,
  INVITEE_AT_RISK: 3,
  LOW_LIQUIDITY: 4,
  REVENUE_COMPRESSION: 5,
  LOW_ACQUISITION: 6,
  REFERRAL_UNDERPERFORMANCE: 6,
  CAMPAIGN_FATIGUE: 7,
  WATCHDOG_ABUSE_DETECTED: 2, // high priority — abuse blocks growth
  GREEN: 99,
};

/**
 * DECIDE phase: rank diagnoses by priority, select top N playbooks.
 * Max 2 playbooks per cycle (configurable).
 * Skips playbooks that are disabled or ran in the last cycle without measurement.
 */
export function decide(
  diagnoses: Diagnosis[],
  state: GrowthState,
  config: GrowthConfig,
): Decision[] {
  // Filter out GREEN
  const actionable = diagnoses.filter((d) => d.code !== "GREEN");
  if (actionable.length === 0) return [];

  // Sort by priority (lower = higher priority), then by severity
  const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  actionable.sort((a, b) => {
    const pA = PRIORITY[a.code] ?? 99;
    const pB = PRIORITY[b.code] ?? 99;
    if (pA !== pB) return pA - pB;
    return (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2);
  });

  // Recently run playbooks (last cycle) that haven't been measured yet
  const recentPlaybooks = new Set<string>();
  if (state.playbookHistory.length > 0) {
    const lastRun = state.playbookHistory[state.playbookHistory.length - 1];
    if (!state.verdicts[lastRun.playbook]) {
      recentPlaybooks.add(lastRun.playbook);
    }
  }

  const decisions: Decision[] = [];
  const selectedPlaybooks = new Set<PlaybookName>();
  const max = config.maxPlaybooksPerCycle;

  for (const diagnosis of actionable) {
    if (decisions.length >= max) break;

    for (const playbook of diagnosis.suggestedPlaybooks) {
      if (decisions.length >= max) break;
      if (selectedPlaybooks.has(playbook)) continue;
      if (!config.enabledPlaybooks.includes(playbook)) continue;
      if (recentPlaybooks.has(playbook)) continue;

      selectedPlaybooks.add(playbook);
      decisions.push({
        playbook,
        trigger: diagnosis,
        params: buildParams(playbook, diagnosis),
        estimatedImpact: estimateImpact(playbook, diagnosis),
      });
    }
  }

  return decisions;
}

function buildParams(playbook: PlaybookName, diagnosis: Diagnosis): Record<string, unknown> {
  return {
    triggeredBy: diagnosis.code,
    evidence: diagnosis.evidence,
  };
}

function estimateImpact(playbook: PlaybookName, diagnosis: Diagnosis): string {
  switch (playbook) {
    case "TIER_PUSH":
      return `Permanent base fee reduction — annual gain: $${diagnosis.evidence.annualMarginGain ?? "unknown"}`;
    case "DISTRIBUTOR_GROWTH":
      return "Permanent revenue stream + tier progression from invitee volume";
    case "VOLUME_RECOVERY":
      return `Reverse ${((1 - (diagnosis.evidence.volumeTrend as number ?? 0.8)) * 100).toFixed(0)}% volume decline`;
    case "FEE_OPTIMIZATION":
      return "Optimize margin across user tiers";
    case "RETENTION_SIEGE":
      return `Reduce churn from ${((diagnosis.evidence.churnRate as number ?? 0.3) * 100).toFixed(0)}% to <25%`;
    case "LIQUIDITY_BOOST":
      return `Improve maker ratio from ${((diagnosis.evidence.makerRatio as number ?? 0.2) * 100).toFixed(0)}% to >30%`;
    case "ACQUISITION_PUSH":
      return `Boost new users to weekly target of ${diagnosis.evidence.weeklyTarget ?? "unknown"}`;
    case "REFERRAL_OPTIMIZE":
      return "Improve referral conversion and code performance";
    case "INVITEE_SUPPORT":
      return "Stabilize declining invitee volume — protect distributor revenue + tier progression";
    default:
      return "Execute playbook";
  }
}
