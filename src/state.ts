import { readFile, writeFile, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import { GrowthStateSchema, type GrowthState, type MetricsSnapshot, type PlaybookRun } from "./types.js";
import { StateCorruptionError } from "./errors.js";
import { getStatePath, ensureGrowthDirs } from "./config.js";

const MAX_HISTORY = 30;

function emptyState(): GrowthState {
  return {
    version: 1,
    lastRunAt: new Date().toISOString(),
    metricsHistory: [],
    playbookHistory: [],
    campaignHistory: [],
    verdicts: {},
    tierHistory: [],
  };
}

export async function loadState(): Promise<GrowthState> {
  await ensureGrowthDirs();
  const path = getStatePath();

  if (!existsSync(path)) {
    return emptyState();
  }

  const raw = await readFile(path, "utf-8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new StateCorruptionError(`Invalid JSON in ${path}`);
  }

  const result = GrowthStateSchema.safeParse(parsed);
  if (!result.success) {
    throw new StateCorruptionError(`State schema mismatch in ${path}`);
  }

  return parsed as GrowthState;
}

export async function saveState(state: GrowthState): Promise<void> {
  await ensureGrowthDirs();
  const path = getStatePath();
  const tmpPath = path + ".tmp";

  state.lastRunAt = new Date().toISOString();

  // Cap history
  if (state.metricsHistory.length > MAX_HISTORY) {
    state.metricsHistory = state.metricsHistory.slice(-MAX_HISTORY);
  }

  await writeFile(tmpPath, JSON.stringify(state, null, 2), "utf-8");
  await rename(tmpPath, path);
}

export function appendMetricsSnapshot(state: GrowthState, snapshot: MetricsSnapshot): void {
  state.metricsHistory.push(snapshot);
  if (state.metricsHistory.length > MAX_HISTORY) {
    state.metricsHistory = state.metricsHistory.slice(-MAX_HISTORY);
  }
}

export function appendPlaybookRun(state: GrowthState, run: PlaybookRun): void {
  state.playbookHistory.push(run);
}
