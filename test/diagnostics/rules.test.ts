import { describe, it, expect } from "vitest";
import { checkVolumeDecline, checkHighChurn, checkTierPushOpportunity, checkDistributorOpportunity, checkLowLiquidity, checkReferralUnderperformance } from "../../src/diagnostics/rules.js";
import { DEFAULT_THRESHOLDS } from "../../src/diagnostics/thresholds.js";
import type { CollectedMetrics, GrowthConfig } from "../../src/types.js";

function makeMetrics(overrides: Partial<CollectedMetrics> = {}): CollectedMetrics {
  return {
    timestamp: new Date().toISOString(),
    volume: {
      volume24h: 1_000_000,
      volume7dAvg: 1_000_000,
      volume30dAvg: 1_200_000,
      volume30dTotal: 36_000_000,
      volumeTrend: 0.83,
      makerVolume7d: 2_000_000,
      takerVolume7d: 5_000_000,
      makerRatio: 0.29,
      dailyVolumes: [],
    },
    revenue: { dailyRevenue: 500, monthlyRevenue: 15000, revPerUser: 75, marginBps: 2.0 },
    users: { uniqueUsers30d: 200, uniqueUsers7d: 150, newUsers7d: 15, churnRate: 0.25, dormantUsers: 50 },
    referrals: { totalCodes: 5, totalReferees: 100, tradedReferrals7d: 12, referralConversion: 0.12, rebateAmount7d: 200 },
    staking: { orderStaked: 50_000, esOrderBalance: 0, valorEarned: 0, valorBalance: 0, treasurySharePct: 0 },
    distributor: { inviteeCount: 2, activeInvitees7d: 1, inviteeVolume30d: 5_000_000, distributorRevenue30d: 100, aggregateVolume: 41_000_000, inviteeUtilization: 0.5 },
    campaigns: { activeCampaigns: 1, questCompletion: 0.35, activeCompetitions: [] },
    tierProgression: {
      currentTier: "SILVER",
      nextTier: "GOLD",
      volumeToNext: 49_000_000,
      stakingToNext: 200_000,
      daysToNextTier: 49,
      marginGainAtNext: 0.25,
      annualMarginGain: 30_000,
      progressPct: 45.6,
    },
    feeRateDefault: { futuresMakerFee: 0.0001, futuresTakerFee: 0.0005 },
    ...overrides,
  } as CollectedMetrics;
}

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

describe("diagnostic rules", () => {
  describe("checkVolumeDecline", () => {
    it("flags when volume trend < 0.80", () => {
      const metrics = makeMetrics();
      metrics.volume.volumeTrend = 0.75;
      const result = checkVolumeDecline(metrics, DEFAULT_THRESHOLDS, defaultConfig);
      expect(result).not.toBeNull();
      expect(result!.code).toBe("VOLUME_DECLINE");
      expect(result!.severity).toBe("critical");
    });

    it("does not flag when volume trend is healthy", () => {
      const metrics = makeMetrics();
      metrics.volume.volumeTrend = 0.95;
      const result = checkVolumeDecline(metrics, DEFAULT_THRESHOLDS, defaultConfig);
      expect(result).toBeNull();
    });
  });

  describe("checkHighChurn", () => {
    it("flags when churn > 30%", () => {
      const metrics = makeMetrics();
      metrics.users.churnRate = 0.35;
      const result = checkHighChurn(metrics, DEFAULT_THRESHOLDS, defaultConfig);
      expect(result).not.toBeNull();
      expect(result!.code).toBe("HIGH_CHURN");
    });

    it("does not flag when churn is healthy", () => {
      const metrics = makeMetrics();
      metrics.users.churnRate = 0.20;
      const result = checkHighChurn(metrics, DEFAULT_THRESHOLDS, defaultConfig);
      expect(result).toBeNull();
    });
  });

  describe("checkTierPushOpportunity", () => {
    it("flags when progress > 80% of next tier", () => {
      const metrics = makeMetrics();
      metrics.tierProgression.progressPct = 85;
      const result = checkTierPushOpportunity(metrics, DEFAULT_THRESHOLDS, defaultConfig);
      expect(result).not.toBeNull();
      expect(result!.code).toBe("TIER_PUSH_OPPORTUNITY");
      expect(result!.severity).toBe("critical");
    });

    it("does not flag when far from next tier", () => {
      const metrics = makeMetrics();
      metrics.tierProgression.progressPct = 40;
      const result = checkTierPushOpportunity(metrics, DEFAULT_THRESHOLDS, defaultConfig);
      expect(result).toBeNull();
    });

    it("does not flag at DIAMOND tier (no next)", () => {
      const metrics = makeMetrics();
      metrics.tierProgression.nextTier = null;
      metrics.tierProgression.progressPct = 100;
      const result = checkTierPushOpportunity(metrics, DEFAULT_THRESHOLDS, defaultConfig);
      expect(result).toBeNull();
    });
  });

  describe("checkDistributorOpportunity", () => {
    it("flags when invitee count < 3", () => {
      const metrics = makeMetrics();
      metrics.distributor.inviteeCount = 1;
      const result = checkDistributorOpportunity(metrics, DEFAULT_THRESHOLDS, defaultConfig);
      expect(result).not.toBeNull();
      expect(result!.code).toBe("DISTRIBUTOR_OPPORTUNITY");
    });

    it("does not flag when invitees >= 3", () => {
      const metrics = makeMetrics();
      metrics.distributor.inviteeCount = 5;
      const result = checkDistributorOpportunity(metrics, DEFAULT_THRESHOLDS, defaultConfig);
      expect(result).toBeNull();
    });
  });

  describe("checkLowLiquidity", () => {
    it("flags when maker ratio < 25%", () => {
      const metrics = makeMetrics();
      metrics.volume.makerRatio = 0.18;
      const result = checkLowLiquidity(metrics, DEFAULT_THRESHOLDS, defaultConfig);
      expect(result).not.toBeNull();
      expect(result!.code).toBe("LOW_LIQUIDITY");
    });
  });

  describe("checkReferralUnderperformance", () => {
    it("flags when conversion < 10%", () => {
      const metrics = makeMetrics();
      metrics.referrals.referralConversion = 0.05;
      const result = checkReferralUnderperformance(metrics, DEFAULT_THRESHOLDS, defaultConfig);
      expect(result).not.toBeNull();
      expect(result!.code).toBe("REFERRAL_UNDERPERFORMANCE");
    });
  });
});
