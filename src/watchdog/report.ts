import type { AccountRiskScore, DetectorResult, EnforcementResult, EnforcementTier, ScoreSnapshot, WatchdogState } from "./types.js";

export interface RiskReportData {
  brokerName: string;
  date: string;
  totalScanned: number;
  scores: AccountRiskScore[];
  detectorResults: DetectorResult[];
  enforcementResults: EnforcementResult[];
  state: WatchdogState;
  totalVolumeExcluded: number;
  totalVolume: number;
}

export function renderRiskReport(data: RiskReportData): string {
  const {
    brokerName, date, totalScanned, scores, detectorResults,
    enforcementResults, state, totalVolumeExcluded, totalVolume,
  } = data;

  const flagged = scores.filter((s) => s.totalScore > 20);
  const cleanPct = totalScanned > 0 ? ((totalScanned - flagged.length) / totalScanned * 100).toFixed(1) : "100.0";

  // Count by tier
  const byTier: Record<EnforcementTier, number> = { CLEAN: 0, MONITOR: 0, RESTRICT: 0, PENALIZE: 0, ESCALATE: 0 };
  for (const score of scores) {
    byTier[score.tier]++;
  }

  // Detector breakdown
  const detectorMatchCounts = new Map<string, { matches: number; accounts: Set<string> }>();
  for (const result of detectorResults) {
    const accountSet = new Set(result.matches.map((m) => m.accountId));
    detectorMatchCounts.set(result.detector, { matches: result.matches.length, accounts: accountSet });
  }

  // Overall health
  const health = byTier.ESCALATE > 0
    ? "RED"
    : byTier.PENALIZE > 0 || byTier.RESTRICT > 3
      ? "YELLOW"
      : "GREEN";

  // Top threats
  const topThreats = scores.slice(0, 5).filter((s) => s.totalScore > 20);

  // Enforcement summary
  const monitorCount = enforcementResults.filter((r) => r.tier === "MONITOR").length;
  const restrictCount = enforcementResults.filter((r) => r.tier === "RESTRICT").length;
  const penalizeCount = enforcementResults.filter((r) => r.tier === "PENALIZE").length;
  const escalateCount = enforcementResults.filter((r) => r.tier === "ESCALATE").length;

  // Volume impact
  const volumePct = totalVolume > 0 ? (totalVolumeExcluded / totalVolume * 100).toFixed(1) : "0.0";
  const cleanVolume = totalVolume - totalVolumeExcluded;

  // Trend (from score history)
  const prevSnapshot = state.scoreHistory.length > 0 ? state.scoreHistory[state.scoreHistory.length - 1] : null;
  const flaggedDelta = prevSnapshot ? flagged.length - prevSnapshot.totalFlagged : 0;
  const volDelta = prevSnapshot ? totalVolumeExcluded - prevSnapshot.totalVolumeExcluded : 0;

  const lines: string[] = [];
  const w = 67;
  const hr = "═".repeat(w);

  lines.push(`╔${hr}╗`);
  lines.push(`║  WATCHDOG RISK REPORT — ${brokerName} — ${date}`.padEnd(w + 1) + "║");
  lines.push(`╠${hr}╣`);
  lines.push(`║`.padEnd(w + 1) + "║");
  lines.push(`║  OVERALL HEALTH: ${health}`.padEnd(w + 1) + "║");
  lines.push(`║  Accounts scanned: ${totalScanned} │ Flagged: ${flagged.length} │ Clean: ${cleanPct}%`.padEnd(w + 1) + "║");
  lines.push(`║`.padEnd(w + 1) + "║");

  // Detector breakdown
  lines.push(`║  DETECTOR BREAKDOWN`.padEnd(w + 1) + "║");
  for (const [detector, stats] of detectorMatchCounts) {
    if (stats.matches === 0) continue;
    lines.push(`║    ${detector}: ${stats.matches} matches across ${stats.accounts.size} accounts`.padEnd(w + 1) + "║");
  }
  lines.push(`║`.padEnd(w + 1) + "║");

  // Top threats
  if (topThreats.length > 0) {
    lines.push(`║  TOP THREATS`.padEnd(w + 1) + "║");
    for (let i = 0; i < topThreats.length; i++) {
      const t = topThreats[i];
      const detectors = Object.keys(t.matchesByDetector).join(", ");
      lines.push(`║    ${i + 1}. ${t.accountId.slice(0, 16)}... — score ${t.totalScore} (${t.tier}) — ${detectors}`.padEnd(w + 1) + "║");
    }
    lines.push(`║`.padEnd(w + 1) + "║");
  }

  // Enforcement summary
  lines.push(`║  ENFORCEMENT SUMMARY`.padEnd(w + 1) + "║");
  lines.push(`║    MONITOR:   ${monitorCount} accounts`.padEnd(w + 1) + "║");
  lines.push(`║    RESTRICT:  ${restrictCount} accounts`.padEnd(w + 1) + "║");
  lines.push(`║    PENALIZE:  ${penalizeCount} accounts`.padEnd(w + 1) + "║");
  lines.push(`║    ESCALATE:  ${escalateCount} accounts${escalateCount > 0 ? " (operator review required)" : ""}`.padEnd(w + 1) + "║");
  lines.push(`║`.padEnd(w + 1) + "║");

  // Volume integrity
  lines.push(`║  VOLUME INTEGRITY`.padEnd(w + 1) + "║");
  lines.push(`║    Total reported volume:   $${fmt(totalVolume)}`.padEnd(w + 1) + "║");
  lines.push(`║    Suspect volume excluded: $${fmt(totalVolumeExcluded)} (${volumePct}%)`.padEnd(w + 1) + "║");
  lines.push(`║    Clean volume for tier:   $${fmt(cleanVolume)}`.padEnd(w + 1) + "║");
  lines.push(`║`.padEnd(w + 1) + "║");

  // Trend
  if (prevSnapshot) {
    const flaggedArrow = flaggedDelta > 0 ? "↑" : flaggedDelta < 0 ? "↓" : "→";
    const volArrow = volDelta > 0 ? "↑" : volDelta < 0 ? "↓" : "→";
    lines.push(`║  TREND (vs previous scan)`.padEnd(w + 1) + "║");
    lines.push(`║    Flagged accounts: ${prevSnapshot.totalFlagged} → ${flagged.length} (${flaggedArrow}${Math.abs(flaggedDelta)})`.padEnd(w + 1) + "║");
    lines.push(`║    Volume excluded:  $${fmt(prevSnapshot.totalVolumeExcluded)} → $${fmt(totalVolumeExcluded)} (${volArrow}$${fmt(Math.abs(volDelta))})`.padEnd(w + 1) + "║");
    lines.push(`║`.padEnd(w + 1) + "║");
  }

  lines.push(`╚${hr}╝`);

  return lines.join("\n");
}

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}
