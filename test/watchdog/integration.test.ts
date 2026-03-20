import { describe, it, expect } from "vitest";
import { getCleanVolume, shouldBlockPromotion, getFlaggedAccountIds, getWatchdogDiagnoses } from "../../src/watchdog/integration.js";
import type { VolumeMetrics } from "../../src/types.js";
import { emptyWatchdogState, makeScore } from "./fixtures.js";

function mockVolume(): VolumeMetrics {
  return {
    volume24h: 100_000,
    volume7dAvg: 100_000,
    volume30dAvg: 100_000,
    volume30dTotal: 3_000_000,
    volumeTrend: 1.0,
    makerVolume7d: 350_000,
    takerVolume7d: 350_000,
    makerRatio: 0.5,
    dailyVolumes: [],
  };
}

describe("getCleanVolume", () => {
  it("returns unchanged volume when no flagged accounts", () => {
    const vol = mockVolume();
    const clean = getCleanVolume(vol, new Map());
    expect(clean.volume30dTotal).toBe(vol.volume30dTotal);
  });

  it("subtracts flagged account volume", () => {
    const vol = mockVolume();
    const flagged = new Map([["acc1", 500_000]]);
    const clean = getCleanVolume(vol, flagged);
    expect(clean.volume30dTotal).toBe(2_500_000);
  });

  it("proportionally reduces other metrics", () => {
    const vol = mockVolume();
    const flagged = new Map([["acc1", 1_500_000]]);
    const clean = getCleanVolume(vol, flagged);
    expect(clean.volume24h).toBe(50_000);
    expect(clean.volume7dAvg).toBe(50_000);
  });

  it("does not go below zero", () => {
    const vol = mockVolume();
    const flagged = new Map([["acc1", 10_000_000]]);
    const clean = getCleanVolume(vol, flagged);
    expect(clean.volume30dTotal).toBe(-7_000_000);
    expect(clean.volume24h).toBe(0);
  });
});

describe("shouldBlockPromotion", () => {
  it("returns false for unknown accounts", () => {
    expect(shouldBlockPromotion("unknown", emptyWatchdogState())).toBe(false);
  });

  it("returns false for MONITOR tier (score 30)", () => {
    const state = emptyWatchdogState();
    state.flaggedAccounts["acc1"] = makeScore("acc1", 30, "MONITOR");
    expect(shouldBlockPromotion("acc1", state)).toBe(false);
  });

  it("returns true for RESTRICT tier (score 50)", () => {
    const state = emptyWatchdogState();
    state.flaggedAccounts["acc1"] = makeScore("acc1", 50, "RESTRICT");
    expect(shouldBlockPromotion("acc1", state)).toBe(true);
  });

  it("returns true for ESCALATE tier", () => {
    const state = emptyWatchdogState();
    state.flaggedAccounts["acc1"] = makeScore("acc1", 90, "ESCALATE");
    expect(shouldBlockPromotion("acc1", state)).toBe(true);
  });
});

describe("getFlaggedAccountIds", () => {
  it("returns empty for clean state", () => {
    expect(getFlaggedAccountIds(emptyWatchdogState())).toHaveLength(0);
  });

  it("returns all flagged accounts at MONITOR and above", () => {
    const state = emptyWatchdogState();
    state.flaggedAccounts["a"] = makeScore("a", 25, "MONITOR");
    state.flaggedAccounts["b"] = makeScore("b", 50, "RESTRICT");
    state.flaggedAccounts["c"] = makeScore("c", 90, "ESCALATE");
    const ids = getFlaggedAccountIds(state, "MONITOR");
    expect(ids).toHaveLength(3);
  });

  it("filters by minimum tier", () => {
    const state = emptyWatchdogState();
    state.flaggedAccounts["a"] = makeScore("a", 25, "MONITOR");
    state.flaggedAccounts["b"] = makeScore("b", 50, "RESTRICT");
    const ids = getFlaggedAccountIds(state, "RESTRICT");
    expect(ids).toEqual(["b"]);
  });
});

describe("getWatchdogDiagnoses", () => {
  it("returns empty for clean state", () => {
    expect(getWatchdogDiagnoses(emptyWatchdogState())).toHaveLength(0);
  });

  it("returns critical diagnosis when escalations exist", () => {
    const state = emptyWatchdogState();
    state.flaggedAccounts["a"] = makeScore("a", 90, "ESCALATE");
    const diagnoses = getWatchdogDiagnoses(state);
    expect(diagnoses).toHaveLength(1);
    expect(diagnoses[0].severity).toBe("critical");
  });

  it("returns warning diagnosis for restrictions only", () => {
    const state = emptyWatchdogState();
    state.flaggedAccounts["a"] = makeScore("a", 50, "RESTRICT");
    const diagnoses = getWatchdogDiagnoses(state);
    expect(diagnoses).toHaveLength(1);
    expect(diagnoses[0].severity).toBe("warning");
  });
});
