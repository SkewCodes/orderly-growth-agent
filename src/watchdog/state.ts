import { readFile, writeFile, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import { WatchdogStateSchema, type WatchdogState, type ScoreSnapshot, type EnforcementHistoryEntry } from "./types.js";
import { StateCorruptionError } from "../errors.js";
import { getWatchdogStatePath } from "./config.js";
import { ensureGrowthDirs } from "../config.js";

const MAX_SCORE_HISTORY = 30;
const MAX_ENFORCEMENT_HISTORY = 200;

function emptyWatchdogState(): WatchdogState {
  return {
    version: 1,
    lastScanAt: new Date().toISOString(),
    flaggedAccounts: {},
    enforcementHistory: [],
    allowlist: [],
    scoreHistory: [],
  };
}

export async function loadWatchdogState(): Promise<WatchdogState> {
  await ensureGrowthDirs();
  const path = getWatchdogStatePath();

  if (!existsSync(path)) {
    return emptyWatchdogState();
  }

  const raw = await readFile(path, "utf-8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new StateCorruptionError(`Invalid JSON in ${path}`);
  }

  const result = WatchdogStateSchema.safeParse(parsed);
  if (!result.success) {
    throw new StateCorruptionError(`Watchdog state schema mismatch in ${path}`);
  }

  return parsed as WatchdogState;
}

export async function saveWatchdogState(state: WatchdogState): Promise<void> {
  await ensureGrowthDirs();
  const path = getWatchdogStatePath();
  const tmpPath = path + ".tmp";

  state.lastScanAt = new Date().toISOString();

  // Cap histories
  if (state.scoreHistory.length > MAX_SCORE_HISTORY) {
    state.scoreHistory = state.scoreHistory.slice(-MAX_SCORE_HISTORY);
  }
  if (state.enforcementHistory.length > MAX_ENFORCEMENT_HISTORY) {
    state.enforcementHistory = state.enforcementHistory.slice(-MAX_ENFORCEMENT_HISTORY);
  }

  await writeFile(tmpPath, JSON.stringify(state, null, 2), "utf-8");
  await rename(tmpPath, path);
}

export function appendScoreSnapshot(state: WatchdogState, snapshot: ScoreSnapshot): void {
  state.scoreHistory.push(snapshot);
  if (state.scoreHistory.length > MAX_SCORE_HISTORY) {
    state.scoreHistory = state.scoreHistory.slice(-MAX_SCORE_HISTORY);
  }
}

export function appendEnforcementEntry(state: WatchdogState, entry: EnforcementHistoryEntry): void {
  state.enforcementHistory.push(entry);
  if (state.enforcementHistory.length > MAX_ENFORCEMENT_HISTORY) {
    state.enforcementHistory = state.enforcementHistory.slice(-MAX_ENFORCEMENT_HISTORY);
  }
}
