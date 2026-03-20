import type { CollectedMetrics, Diagnosis, GrowthConfig } from "../types.js";
import { ALL_RULES } from "./rules.js";
import { mergeThresholds } from "./thresholds.js";

/**
 * Run all diagnostic rules against collected metrics.
 * Returns array of diagnoses, or a single GREEN diagnosis if no issues found.
 */
export function runDiagnostics(
  metrics: CollectedMetrics,
  config: GrowthConfig,
): Diagnosis[] {
  const thresholds = mergeThresholds(config.thresholdOverrides);
  const diagnoses: Diagnosis[] = [];

  for (const rule of ALL_RULES) {
    const result = rule(metrics, thresholds, config);
    if (result) {
      diagnoses.push(result);
    }
  }

  if (diagnoses.length === 0) {
    diagnoses.push({
      code: "GREEN",
      severity: "info",
      evidence: {},
      message: "All metrics within healthy thresholds",
      suggestedPlaybooks: [],
    });
  }

  return diagnoses;
}
