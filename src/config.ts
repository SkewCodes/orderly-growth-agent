import { readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { GrowthConfigSchema, type GrowthConfig } from "./types.js";
import { ConfigError } from "./errors.js";

const GROWTH_DIR = join(homedir(), ".orderly", "growth-agent");
const CONFIG_PATH = join(GROWTH_DIR, "config.json");

export function getGrowthDir(): string {
  return GROWTH_DIR;
}

export function getStatePath(): string {
  return join(GROWTH_DIR, "state.json");
}

export function getAuditLogPath(): string {
  return join(GROWTH_DIR, "audit.jsonl");
}

export function getReportDir(config?: GrowthConfig): string {
  return config?.reportOutputDir ?? join(GROWTH_DIR, "reports");
}

export async function ensureGrowthDirs(): Promise<void> {
  const dirs = [GROWTH_DIR, join(GROWTH_DIR, "reports")];
  for (const dir of dirs) {
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }
}

export async function loadConfig(): Promise<GrowthConfig> {
  await ensureGrowthDirs();

  if (!existsSync(CONFIG_PATH)) {
    throw new ConfigError(
      `Config not found at ${CONFIG_PATH}. Create it with at minimum: { "brokerId": "<your-broker-id>" }`
    );
  }

  const raw = await readFile(CONFIG_PATH, "utf-8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ConfigError(`Invalid JSON in ${CONFIG_PATH}`);
  }

  const result = GrowthConfigSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new ConfigError(`Config validation failed:\n${issues}`);
  }

  return result.data;
}
