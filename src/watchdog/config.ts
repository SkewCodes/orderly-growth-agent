import { join } from "node:path";
import { getGrowthDir } from "../config.js";
import { WatchdogConfigSchema, type WatchdogConfig } from "./types.js";

export function getWatchdogStatePath(): string {
  return join(getGrowthDir(), "watchdog-state.json");
}

export function getWatchdogAuditLogPath(): string {
  return join(getGrowthDir(), "watchdog-audit.jsonl");
}

export function getWatchdogReportDir(): string {
  return join(getGrowthDir(), "reports");
}

export function parseWatchdogConfig(raw: unknown): WatchdogConfig {
  return WatchdogConfigSchema.parse(raw ?? {});
}
