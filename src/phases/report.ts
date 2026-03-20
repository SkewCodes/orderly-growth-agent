import type { CollectedMetrics, Diagnosis, Decision, ActionResult, GrowthState, Scorecard, ROIResult, GrowthConfig } from "../types.js";

/**
 * REPORT phase: assemble a growth scorecard from all phase outputs.
 */
export function report(
  metrics: CollectedMetrics,
  diagnoses: Diagnosis[],
  decisions: Decision[],
  results: ActionResult[],
  roiResults: ROIResult[],
  config: GrowthConfig,
): Scorecard {
  const markdown = renderScorecard(metrics, diagnoses, decisions, results, roiResults, config);

  return {
    date: metrics.timestamp.split("T")[0],
    brokerName: config.brokerName,
    tier: metrics.tierProgression.currentTier,
    baseFee: metrics.feeRateDefault.futuresTakerFee,
    tierProgress: metrics.tierProgression,
    volume: metrics.volume,
    revenue: metrics.revenue,
    users: metrics.users,
    referrals: metrics.referrals,
    distributor: metrics.distributor,
    campaigns: metrics.campaigns,
    actions: results,
    diagnoses,
    roiResults,
    markdown,
  };
}

function fmt(n: number, decimals = 0): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(decimals)}`;
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function arrow(trend: number): string {
  if (trend > 1.05) return "↑";
  if (trend < 0.95) return "↓";
  return "→";
}

function renderScorecard(
  m: CollectedMetrics,
  diagnoses: Diagnosis[],
  decisions: Decision[],
  results: ActionResult[],
  roiResults: ROIResult[],
  config: GrowthConfig,
): string {
  const tp = m.tierProgression;
  const actionsSummary = results.length > 0
    ? results.map((r) => `${r.playbook}${r.dryRun ? " [DRY-RUN]" : ""}: ${r.success ? "OK" : "FAILED"}`).join(", ")
    : "None — all green";

  const alerts = diagnoses
    .filter((d) => d.code !== "GREEN")
    .map((d) => `${d.code} (${d.severity}): ${d.message}`)
    .join("\n║  ");

  const tierAdvisory = tp.nextTier
    ? `${tp.progressPct.toFixed(1)}% to ${tp.nextTier} — ETA: ~${tp.daysToNextTier ?? "?"} days. Need: ${fmt(tp.volumeToNext)} vol OR ${tp.stakingToNext.toLocaleString()} $ORDER`
    : "Diamond tier — maximum level reached";

  const roiSummary = roiResults.length > 0
    ? roiResults.map((r) => `${r.playbook}: ROI ${r.roi.toFixed(0)}% → ${r.verdict}`).join("\n║    ")
    : "No previous campaigns to measure";

  return `╔═══════════════════════════════════════════════════════════════════╗
║  GROWTH SCORECARD — ${config.brokerName} — ${m.timestamp.split("T")[0]}
╠═══════════════════════════════════════════════════════════════════╣
║
║  BUILDER TIER: ${tp.currentTier}  base fee: ${m.feeRateDefault.futuresTakerFee * 10000} bps
║  Next tier:    ${tp.nextTier ?? "—"}  need: ${fmt(tp.volumeToNext)} vol OR ${tp.stakingToNext.toLocaleString()} $ORDER
║  Progress:     ${tp.progressPct.toFixed(1)}% │ ETA: ~${tp.daysToNextTier ?? "—"} days
║
║  VOLUME
║    24h: ${fmt(m.volume.volume24h)}  7d avg: ${fmt(m.volume.volume7dAvg)}  30d: ${fmt(m.volume.volume30dTotal)}  trend: ${arrow(m.volume.volumeTrend)}${pct(Math.abs(1 - m.volume.volumeTrend))}
║
║  REVENUE
║    24h: ${fmt(m.revenue.dailyRevenue, 2)}  30d: ${fmt(m.revenue.monthlyRevenue, 2)}  per user: ${fmt(m.revenue.revPerUser, 2)}  margin: ${m.revenue.marginBps.toFixed(2)} bps
║    Maker ratio: ${pct(m.volume.makerRatio)}
║
║  USERS
║    Active 7d: ${m.users.uniqueUsers7d} │ New 7d: ${m.users.newUsers7d} │ Dormant: ${m.users.dormantUsers} │ Retention: ${pct(1 - m.users.churnRate)}
║
║  REFERRALS: ${m.referrals.totalCodes} codes │ ${pct(m.referrals.referralConversion)} conversion │ ${fmt(m.referrals.rebateAmount7d, 2)} 7d rebate
║
║  DISTRIBUTOR
║    Invitees: ${m.distributor.inviteeCount} total │ ${m.distributor.activeInvitees7d} active (7d)
║    Invitee volume 30d: ${fmt(m.distributor.inviteeVolume30d)}  (${m.distributor.aggregateVolume > 0 ? pct(m.distributor.inviteeVolume30d / m.distributor.aggregateVolume) : "0%"} of aggregate)
║    Distributor revenue 30d: ${fmt(m.distributor.distributorRevenue30d, 2)}
║    Aggregate volume: ${fmt(m.distributor.aggregateVolume)} (${tp.progressPct.toFixed(1)}% of next tier)
║
║  CAMPAIGNS: ${m.campaigns.activeCampaigns} active │ ${pct(m.campaigns.questCompletion)} quest completion
║    ${m.campaigns.activeCompetitions.map((c) => `${c.name} — ${c.participants} participants`).join("\n║    ") || "No active competitions"}
║
║  PREVIOUS CYCLE ROI:
║    ${roiSummary}
║
║  ACTIONS: ${actionsSummary}
║  TIER ADVISORY: ${tierAdvisory}
║  ALERTS: ${alerts || "All clear"}
╚═══════════════════════════════════════════════════════════════════╝`;
}
