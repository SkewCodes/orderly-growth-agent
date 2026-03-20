import type { GrowthConfig, GrowthState, Scorecard, MetricsSnapshot } from "./types.js";
import type { TradingClient } from "./api/trading-client.js";
import type { SocialClient } from "./api/social-client.js";
import type { WatchdogState } from "./watchdog/types.js";
import { AuditLogger } from "./logger.js";
import { getAuditLogPath, getReportDir } from "./config.js";
import { parseWatchdogConfig } from "./watchdog/config.js";
import { loadState, saveState, appendMetricsSnapshot, appendPlaybookRun } from "./state.js";
import { measure } from "./phases/measure.js";
import { collect } from "./phases/collect.js";
import { diagnose } from "./phases/diagnose.js";
import { decide } from "./phases/decide.js";
import { act } from "./phases/act.js";
import { report } from "./phases/report.js";
import { runWatchdogLoop } from "./watchdog/loop.js";
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

export interface LoopResult {
  scorecard: Scorecard;
  state: GrowthState;
}

/**
 * Execute the full daily growth loop:
 * MEASURE (prev cycle) → COLLECT → DIAGNOSE → DECIDE → ACT → REPORT → SAVE
 */
export async function runLoop(
  config: GrowthConfig,
  trading: TradingClient,
  social: SocialClient | null,
): Promise<LoopResult> {
  const logger = new AuditLogger(getAuditLogPath());

  await logger.info(`Growth loop started — dryRun: ${config.dryRun}`);

  // Load state
  const state = await loadState();
  await logger.log("loop", "state_loaded", { lastRunAt: state.lastRunAt, historyLength: state.metricsHistory.length });

  // Phase 1: MEASURE (evaluate previous cycle)
  const roiResults = measure(state);
  if (roiResults.length > 0) {
    await logger.log("measure", "roi_calculated", { results: roiResults.length });
    for (const roi of roiResults) {
      await logger.log("measure", `verdict_${roi.playbook}`, {
        roi: roi.roi,
        verdict: roi.verdict,
        revenueDelta: roi.revenueDelta,
      });
    }
  }

  // Phase 1.5: WATCHDOG (runs before COLLECT to produce clean data)
  let watchdogState: WatchdogState | undefined;
  const watchdogConfig = parseWatchdogConfig(config.watchdog);
  if (watchdogConfig.enabled) {
    await logger.log("loop", "watchdog_start");
    try {
      const watchdogResult = await runWatchdogLoop(config, watchdogConfig, trading, logger);
      watchdogState = watchdogResult.state;

      // Write watchdog risk report alongside the scorecard
      const reportDir = getReportDir(config);
      if (!existsSync(reportDir)) {
        await mkdir(reportDir, { recursive: true });
      }
      const riskReportFile = join(reportDir, `risk-report-${new Date().toISOString().split("T")[0]}.md`);
      await writeFile(riskReportFile, watchdogResult.riskReportMarkdown, "utf-8");

      await logger.log("loop", "watchdog_complete", {
        flaggedAccounts: Object.keys(watchdogResult.state.flaggedAccounts).length,
        totalMatches: watchdogResult.detectorResults.reduce((s, r) => s + r.matches.length, 0),
      });

      // Print risk report
      console.log("\n" + watchdogResult.riskReportMarkdown + "\n");
    } catch (err) {
      await logger.error("watchdog", "Watchdog loop failed", err instanceof Error ? err : undefined);
      // Watchdog failures are non-fatal — continue with growth loop
    }
  }

  // Phase 2: COLLECT
  await logger.log("loop", "collect_start");
  const metrics = await collect(trading, social, config, watchdogState);
  await logger.log("loop", "collect_complete", {
    volume30d: metrics.volume.volume30dTotal,
    tier: metrics.tierProgression.currentTier,
  });

  // Phase 3: DIAGNOSE
  const diagnoses = diagnose(metrics, state, config, watchdogState);
  await logger.log("loop", "diagnose_complete", {
    flags: diagnoses.map((d) => d.code),
    count: diagnoses.length,
  });

  // Phase 4: DECIDE
  const decisions = decide(diagnoses, state, config);
  await logger.log("loop", "decide_complete", {
    playbooks: decisions.map((d) => d.playbook),
    count: decisions.length,
  });

  // Phase 5: ACT
  const results = await act(decisions, metrics, state, config, trading, social, logger);

  // Record playbook runs in state
  for (const result of results) {
    appendPlaybookRun(state, {
      playbook: result.playbook,
      startedAt: metrics.timestamp,
      completedAt: new Date().toISOString(),
      params: decisions.find((d) => d.playbook === result.playbook)?.params ?? {},
      actions: result.actions,
      dryRun: result.dryRun,
    });
  }

  // Phase 6: REPORT
  const scorecard = report(metrics, diagnoses, decisions, results, roiResults, config);
  await logger.log("loop", "report_complete");

  // Save metrics snapshot
  const snapshot: MetricsSnapshot = {
    timestamp: metrics.timestamp,
    volume30dTotal: metrics.volume.volume30dTotal,
    volume7dAvg: metrics.volume.volume7dAvg,
    dailyRevenue: metrics.revenue.dailyRevenue,
    uniqueUsers7d: metrics.users.uniqueUsers7d,
    newUsers7d: metrics.users.newUsers7d,
    churnRate: metrics.users.churnRate,
    makerRatio: metrics.volume.makerRatio,
    referralConversion: metrics.referrals.referralConversion,
    questCompletion: metrics.campaigns.questCompletion,
    aggregateVolume: metrics.distributor.aggregateVolume,
    inviteeCount: metrics.distributor.inviteeCount,
  };
  appendMetricsSnapshot(state, snapshot);

  // Save state
  await saveState(state);

  // Write scorecard to file
  const reportDir = getReportDir(config);
  if (!existsSync(reportDir)) {
    await mkdir(reportDir, { recursive: true });
  }
  const reportFile = join(reportDir, `scorecard-${scorecard.date}.md`);
  await writeFile(reportFile, scorecard.markdown, "utf-8");

  await logger.info(`Growth loop completed — scorecard: ${reportFile}`);

  // Print scorecard
  console.log("\n" + scorecard.markdown + "\n");

  return { scorecard, state };
}

/**
 * Run a single phase for debugging/testing.
 */
export async function runPhase(
  phase: string,
  config: GrowthConfig,
  trading: TradingClient,
  social: SocialClient | null,
): Promise<void> {
  const logger = new AuditLogger(getAuditLogPath());

  switch (phase) {
    case "collect": {
      const metrics = await collect(trading, social, config);
      console.log(JSON.stringify(metrics, null, 2));
      break;
    }
    case "diagnose": {
      const metrics = await collect(trading, social, config);
      const state = await loadState();
      const diagnoses = diagnose(metrics, state, config);
      console.log(JSON.stringify(diagnoses, null, 2));
      break;
    }
    case "decide": {
      const metrics = await collect(trading, social, config);
      const state = await loadState();
      const diagnoses = diagnose(metrics, state, config);
      const decisions = decide(diagnoses, state, config);
      console.log(JSON.stringify(decisions, null, 2));
      break;
    }
    case "measure": {
      const state = await loadState();
      const results = measure(state);
      console.log(JSON.stringify(results, null, 2));
      break;
    }
    default:
      throw new Error(`Unknown phase: ${phase}. Valid: collect, diagnose, decide, measure`);
  }
}
