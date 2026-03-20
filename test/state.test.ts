import { describe, it, expect } from "vitest";
import { appendMetricsSnapshot } from "../src/state.js";
import type { GrowthState, MetricsSnapshot } from "../src/types.js";

function makeState(): GrowthState {
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

function makeSnapshot(overrides: Partial<MetricsSnapshot> = {}): MetricsSnapshot {
  return {
    timestamp: new Date().toISOString(),
    volume30dTotal: 10_000_000,
    volume7dAvg: 500_000,
    dailyRevenue: 200,
    uniqueUsers7d: 100,
    newUsers7d: 10,
    churnRate: 0.2,
    makerRatio: 0.3,
    referralConversion: 0.15,
    questCompletion: 0.4,
    aggregateVolume: 12_000_000,
    inviteeCount: 3,
    ...overrides,
  };
}

describe("state", () => {
  describe("appendMetricsSnapshot", () => {
    it("adds snapshot to history", () => {
      const state = makeState();
      appendMetricsSnapshot(state, makeSnapshot());
      expect(state.metricsHistory).toHaveLength(1);
    });

    it("caps history at 30 entries", () => {
      const state = makeState();
      for (let i = 0; i < 35; i++) {
        appendMetricsSnapshot(state, makeSnapshot({ volume30dTotal: i }));
      }
      expect(state.metricsHistory).toHaveLength(30);
      // Oldest should be trimmed — first remaining should have volume30dTotal = 5
      expect(state.metricsHistory[0].volume30dTotal).toBe(5);
    });
  });
});
