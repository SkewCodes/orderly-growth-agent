import type { GrowthConfig } from "../types.js";
import type { TradingClient } from "../api/trading-client.js";
import type { AuditLogger } from "../logger.js";
import type { WatchdogConfig, WatchdogLoopResult } from "./types.js";
import { scan } from "./scan/index.js";
import { ALL_DETECTORS } from "./detectors/index.js";
import { buildScanDataIndex } from "./detectors/base.js";
import { scoreAccounts } from "./scoring/index.js";
import { enforce } from "./enforcement/index.js";
import { renderRiskReport } from "./report.js";
import { loadWatchdogState, saveWatchdogState, appendScoreSnapshot } from "./state.js";

/**
 * Execute the full watchdog loop: SCAN → DETECT → SCORE → ENFORCE → REPORT
 */
export async function runWatchdogLoop(
  growthConfig: GrowthConfig,
  watchdogConfig: WatchdogConfig,
  trading: TradingClient,
  logger: AuditLogger,
): Promise<WatchdogLoopResult> {
  await logger.log("watchdog", "loop_start", { dryRun: watchdogConfig.dryRun });

  // Load watchdog state
  const state = await loadWatchdogState();
  await logger.log("watchdog", "state_loaded", {
    lastScanAt: state.lastScanAt,
    flaggedAccounts: Object.keys(state.flaggedAccounts).length,
  });

  // Phase 1: SCAN
  await logger.log("watchdog", "scan_start");
  const scanData = await scan(trading, growthConfig, watchdogConfig);
  await logger.log("watchdog", "scan_complete", {
    trades: scanData.trades.length,
    cancelledOrders: scanData.cancelledOrders.length,
    accounts: scanData.accountProfiles.length,
  });

  // Phase 2: DETECT
  await logger.log("watchdog", "detect_start");
  const scanIndex = buildScanDataIndex(scanData);
  const detectorResults = [];
  for (const detector of ALL_DETECTORS) {
    const result = detector.detect(scanData, watchdogConfig, scanIndex);
    detectorResults.push(result);
    if (result.matches.length > 0) {
      await logger.log("watchdog/detect", detector.name, {
        matches: result.matches.length,
        durationMs: result.scanDurationMs,
      });
    }
  }
  const totalMatches = detectorResults.reduce((s, r) => s + r.matches.length, 0);
  await logger.log("watchdog", "detect_complete", { totalMatches });

  // Phase 3: SCORE
  await logger.log("watchdog", "score_start");
  const scores = scoreAccounts(detectorResults, state, watchdogConfig);
  const flagged = scores.filter((s) => s.totalScore > 20);
  await logger.log("watchdog", "score_complete", {
    totalScored: scores.length,
    flagged: flagged.length,
    maxScore: scores.length > 0 ? scores[0].totalScore : 0,
  });

  // Phase 4: ENFORCE
  await logger.log("watchdog", "enforce_start");
  const enforcementResults = await enforce(scores, state, watchdogConfig, trading, logger);
  await logger.log("watchdog", "enforce_complete", {
    actionsCount: enforcementResults.length,
    dryRun: watchdogConfig.dryRun || !watchdogConfig.enforcementEnabled,
  });

  // Compute volume metrics for report
  const totalVolume = scanData.accountProfiles.reduce((s, p) => s + p.volume30d, 0);
  const accountVolumes = new Map(scanData.accountProfiles.map((p) => [p.accountId, p.volume30d]));
  let suspectVolume = 0;
  for (const score of scores) {
    if (score.totalScore > 40) {
      suspectVolume += accountVolumes.get(score.accountId) ?? 0;
    }
  }

  // Phase 5: REPORT
  const riskReportMarkdown = renderRiskReport({
    brokerName: growthConfig.brokerName,
    date: new Date().toISOString().split("T")[0],
    totalScanned: scanData.accountProfiles.length,
    scores,
    detectorResults,
    enforcementResults,
    state,
    totalVolumeExcluded: suspectVolume,
    totalVolume,
  });

  // Save score snapshot
  const tierCounts = { CLEAN: 0, MONITOR: 0, RESTRICT: 0, PENALIZE: 0, ESCALATE: 0 } as Record<string, number>;
  for (const score of scores) {
    tierCounts[score.tier] = (tierCounts[score.tier] ?? 0) + 1;
  }
  appendScoreSnapshot(state, {
    timestamp: new Date().toISOString(),
    totalScanned: scanData.accountProfiles.length,
    totalFlagged: flagged.length,
    byTier: tierCounts as WatchdogLoopResult["state"]["scoreHistory"][0]["byTier"],
    totalVolumeExcluded: suspectVolume,
  });

  // Save state
  await saveWatchdogState(state);
  await logger.log("watchdog", "loop_complete");

  return {
    scanData,
    detectorResults,
    scores,
    enforcementResults,
    riskReportMarkdown,
    state,
  };
}
