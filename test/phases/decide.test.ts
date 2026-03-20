import { describe, it, expect } from "vitest";
import { decide } from "../../src/phases/decide.js";
import type { Diagnosis, GrowthConfig, GrowthState } from "../../src/types.js";

const defaultConfig: GrowthConfig = {
  brokerId: "test",
  brokerName: "Test DEX",
  network: "testnet",
  builderTier: "auto",
  operatorTargets: { dailyVolumeUsd: 1_000_000, dailyRevenueUsd: 500, activeUsersWeekly: 200, monthlyNewUsers: 50 },
  maxPlaybooksPerCycle: 2,
  dryRun: true,
  thresholdOverrides: {},
  enabledPlaybooks: ["TIER_PUSH", "DISTRIBUTOR_GROWTH", "INVITEE_SUPPORT", "VOLUME_RECOVERY", "FEE_OPTIMIZATION", "RETENTION_SIEGE", "LIQUIDITY_BOOST", "ACQUISITION_PUSH", "REFERRAL_OPTIMIZE"],
};

const emptyState: GrowthState = {
  version: 1,
  lastRunAt: new Date().toISOString(),
  metricsHistory: [],
  playbookHistory: [],
  campaignHistory: [],
  verdicts: {},
  tierHistory: [],
};

describe("decide", () => {
  it("returns empty for GREEN diagnosis", () => {
    const diagnoses: Diagnosis[] = [{
      code: "GREEN",
      severity: "info",
      evidence: {},
      message: "All clear",
      suggestedPlaybooks: [],
    }];
    const decisions = decide(diagnoses, emptyState, defaultConfig);
    expect(decisions).toHaveLength(0);
  });

  it("selects max 2 playbooks per cycle", () => {
    const diagnoses: Diagnosis[] = [
      { code: "VOLUME_DECLINE", severity: "critical", evidence: {}, message: "", suggestedPlaybooks: ["VOLUME_RECOVERY"] },
      { code: "HIGH_CHURN", severity: "critical", evidence: {}, message: "", suggestedPlaybooks: ["RETENTION_SIEGE"] },
      { code: "LOW_LIQUIDITY", severity: "warning", evidence: {}, message: "", suggestedPlaybooks: ["LIQUIDITY_BOOST"] },
    ];
    const decisions = decide(diagnoses, emptyState, defaultConfig);
    expect(decisions).toHaveLength(2);
  });

  it("prioritizes TIER_PUSH over VOLUME_DECLINE", () => {
    const diagnoses: Diagnosis[] = [
      { code: "VOLUME_DECLINE", severity: "critical", evidence: {}, message: "", suggestedPlaybooks: ["VOLUME_RECOVERY"] },
      { code: "TIER_PUSH_OPPORTUNITY", severity: "critical", evidence: { annualMarginGain: 50000 }, message: "", suggestedPlaybooks: ["TIER_PUSH"] },
    ];
    const decisions = decide(diagnoses, emptyState, defaultConfig);
    expect(decisions[0].playbook).toBe("TIER_PUSH");
  });

  it("respects enabled playbooks filter", () => {
    const config = { ...defaultConfig, enabledPlaybooks: ["TIER_PUSH"] as any };
    const diagnoses: Diagnosis[] = [
      { code: "VOLUME_DECLINE", severity: "critical", evidence: {}, message: "", suggestedPlaybooks: ["VOLUME_RECOVERY"] },
      { code: "TIER_PUSH_OPPORTUNITY", severity: "critical", evidence: {}, message: "", suggestedPlaybooks: ["TIER_PUSH"] },
    ];
    const decisions = decide(diagnoses, emptyState, config);
    expect(decisions).toHaveLength(1);
    expect(decisions[0].playbook).toBe("TIER_PUSH");
  });

  it("does not select same playbook twice", () => {
    const diagnoses: Diagnosis[] = [
      { code: "VOLUME_DECLINE", severity: "critical", evidence: {}, message: "", suggestedPlaybooks: ["VOLUME_RECOVERY"] },
      { code: "HIGH_CHURN", severity: "critical", evidence: {}, message: "", suggestedPlaybooks: ["VOLUME_RECOVERY"] },
    ];
    const decisions = decide(diagnoses, emptyState, defaultConfig);
    expect(decisions).toHaveLength(1);
  });
});
