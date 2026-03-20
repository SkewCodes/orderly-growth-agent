#!/usr/bin/env node

import { loadConfig, getAuditLogPath } from "./config.js";
import { runLoop, runPhase } from "./loop.js";
import { TradingClient } from "./api/trading-client.js";
import { SocialClient } from "./api/social-client.js";
import { GrowthAgentError } from "./errors.js";
import { AuditLogger } from "./logger.js";
import { parseWatchdogConfig } from "./watchdog/config.js";
import { runWatchdogLoop } from "./watchdog/loop.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const flags = parseFlags(args);

  if (flags.help) {
    printUsage();
    return;
  }

  // Load config
  const config = await loadConfig();

  // Override dry-run from CLI flag
  if (flags.dryRun !== undefined) {
    (config as { dryRun: boolean }).dryRun = flags.dryRun;
  }

  // Initialize trading client
  // In production, signing is loaded from OS keychain via orderly CLI infra
  const trading = new TradingClient({
    network: config.network,
    accountId: config.brokerId,
    signRequest: async (method, path, body) => {
      // Delegate to orderly CLI's key management
      // This will be wired up when the orderly CLI is available
      throw new GrowthAgentError(
        "Trading key signing not configured. Ensure orderly CLI is initialized (`orderly init`).",
        "auth",
        "AUTH_NOT_CONFIGURED",
        "Run `orderly init` to set up authentication keys",
      );
    },
  });

  // Initialize social client (optional)
  let social: SocialClient | null = null;
  if (config.socialApiKeyRef) {
    social = new SocialClient({
      venueId: config.brokerId,
      venueApiKey: config.socialApiKeyRef,
      environment: config.network === "mainnet" ? "production" : "staging",
    });
    try {
      await social.initialize();
    } catch {
      console.warn("Social SDK initialization failed — continuing without social features");
      social = null;
    }
  }

  // Run
  if (flags.phase === "watchdog") {
    const logger = new AuditLogger(getAuditLogPath());
    const watchdogConfig = parseWatchdogConfig({ ...config.watchdog, enabled: true });
    const result = await runWatchdogLoop(config, watchdogConfig, trading, logger);
    console.log("\n" + result.riskReportMarkdown + "\n");
  } else if (flags.phase) {
    await runPhase(flags.phase, config, trading, social);
  } else {
    const { scorecard } = await runLoop(config, trading, social);
    process.exit(scorecard.actions.some((a) => !a.success) ? 1 : 0);
  }
}

interface Flags {
  help: boolean;
  dryRun?: boolean;
  phase?: string;
}

function parseFlags(args: string[]): Flags {
  const flags: Flags = { help: false };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--help":
      case "-h":
        flags.help = true;
        break;
      case "--dry-run":
        flags.dryRun = true;
        break;
      case "--live":
        flags.dryRun = false;
        break;
      case "--phase":
        flags.phase = args[++i];
        break;
    }
  }

  return flags;
}

function printUsage(): void {
  console.log(`
orderly-growth-agent v1.1.0

Usage:
  orderly-growth [options]

Options:
  --dry-run       Run full loop without executing API writes (default on first run)
  --live          Run full loop with live API execution
  --phase <name>  Run a single phase: collect, diagnose, decide, measure, watchdog
  --help, -h      Show this help

Config: ~/.orderly/growth-agent/config.json
State:  ~/.orderly/growth-agent/state.json
Logs:   ~/.orderly/growth-agent/audit.jsonl

Required config:
  { "brokerId": "<your-broker-id>" }

Daily cron (recommended 06:00 UTC):
  0 6 * * * orderly-growth --live
`);
}

main().catch((err) => {
  if (err instanceof GrowthAgentError) {
    console.error(`\n[${err.code}] ${err.message}`);
    if (err.suggestion) console.error(`  → ${err.suggestion}`);
  } else {
    console.error("\nUnexpected error:", err);
  }
  process.exit(1);
});
