import { describe, it, expect } from "vitest";
import { getTierForScore } from "../../src/watchdog/enforcement/tiers.js";

describe("getTierForScore", () => {
  it("returns CLEAN for score 0", () => {
    expect(getTierForScore(0).tier).toBe("CLEAN");
  });

  it("returns CLEAN for score 20", () => {
    expect(getTierForScore(20).tier).toBe("CLEAN");
  });

  it("returns MONITOR for score 21", () => {
    expect(getTierForScore(21).tier).toBe("MONITOR");
  });

  it("returns MONITOR for score 40", () => {
    expect(getTierForScore(40).tier).toBe("MONITOR");
  });

  it("returns RESTRICT for score 41", () => {
    expect(getTierForScore(41).tier).toBe("RESTRICT");
  });

  it("returns RESTRICT for score 60", () => {
    expect(getTierForScore(60).tier).toBe("RESTRICT");
  });

  it("returns PENALIZE for score 61", () => {
    expect(getTierForScore(61).tier).toBe("PENALIZE");
  });

  it("returns PENALIZE for score 80", () => {
    expect(getTierForScore(80).tier).toBe("PENALIZE");
  });

  it("returns ESCALATE for score 81", () => {
    expect(getTierForScore(81).tier).toBe("ESCALATE");
  });

  it("returns ESCALATE for score 100", () => {
    expect(getTierForScore(100).tier).toBe("ESCALATE");
  });

  it("clamps negative score to CLEAN", () => {
    expect(getTierForScore(-5).tier).toBe("CLEAN");
  });

  it("clamps score above 100 to ESCALATE", () => {
    expect(getTierForScore(150).tier).toBe("ESCALATE");
  });

  it("RESTRICT tier includes campaign_exclude and tier_block actions", () => {
    const tier = getTierForScore(50);
    expect(tier.actions).toContain("campaign_exclude");
    expect(tier.actions).toContain("tier_block");
  });

  it("PENALIZE tier includes fee_reset and code_deactivate", () => {
    const tier = getTierForScore(70);
    expect(tier.actions).toContain("fee_reset");
    expect(tier.actions).toContain("code_deactivate");
  });

  it("ESCALATE tier includes escalate_alert", () => {
    const tier = getTierForScore(90);
    expect(tier.actions).toContain("escalate_alert");
  });
});
