import type { CollectedMetrics, Diagnosis, GrowthConfig } from "../types.js";
import type { DiagnosticThresholds } from "./thresholds.js";

type Rule = (
  metrics: CollectedMetrics,
  thresholds: DiagnosticThresholds,
  config: GrowthConfig,
) => Diagnosis | null;

export const checkTierPushOpportunity: Rule = (metrics, thresholds) => {
  const tp = metrics.tierProgression;
  if (!tp.nextTier) return null;
  if (tp.progressPct >= thresholds.tierPushVolumePct * 100) {
    return {
      code: "TIER_PUSH_OPPORTUNITY",
      severity: "critical",
      evidence: {
        currentTier: tp.currentTier,
        nextTier: tp.nextTier,
        progressPct: tp.progressPct,
        volumeToNext: tp.volumeToNext,
        stakingToNext: tp.stakingToNext,
        annualMarginGain: tp.annualMarginGain,
      },
      message: `${tp.progressPct.toFixed(1)}% to ${tp.nextTier} — annual margin gain: $${tp.annualMarginGain.toFixed(0)}`,
      suggestedPlaybooks: ["TIER_PUSH"],
    };
  }
  return null;
};

export const checkDistributorOpportunity: Rule = (metrics, thresholds) => {
  if (metrics.distributor.inviteeCount < thresholds.minInviteeCount) {
    return {
      code: "DISTRIBUTOR_OPPORTUNITY",
      severity: "warning",
      evidence: {
        inviteeCount: metrics.distributor.inviteeCount,
        minRequired: thresholds.minInviteeCount,
      },
      message: `Only ${metrics.distributor.inviteeCount} invitees — distributor programme under-utilized`,
      suggestedPlaybooks: ["DISTRIBUTOR_GROWTH"],
    };
  }
  return null;
};

export const checkInviteeAtRisk: Rule = (metrics, thresholds) => {
  // Simplified: if invitee utilization is very low and we have invitees
  if (metrics.distributor.inviteeCount > 0 && metrics.distributor.inviteeUtilization < (1 - thresholds.inviteeDeclineWoWPct)) {
    return {
      code: "INVITEE_AT_RISK",
      severity: "warning",
      evidence: {
        inviteeUtilization: metrics.distributor.inviteeUtilization,
        inviteeCount: metrics.distributor.inviteeCount,
        activeInvitees: metrics.distributor.activeInvitees7d,
      },
      message: `Invitee utilization at ${(metrics.distributor.inviteeUtilization * 100).toFixed(0)}% — some invitees declining`,
      suggestedPlaybooks: ["INVITEE_SUPPORT"],
    };
  }
  return null;
};

export const checkVolumeDecline: Rule = (metrics, thresholds) => {
  if (metrics.volume.volumeTrend < thresholds.volumeDeclinePct) {
    return {
      code: "VOLUME_DECLINE",
      severity: "critical",
      evidence: {
        volumeTrend: metrics.volume.volumeTrend,
        volume7dAvg: metrics.volume.volume7dAvg,
        volume30dAvg: metrics.volume.volume30dAvg,
        threshold: thresholds.volumeDeclinePct,
      },
      message: `Volume trend ${(metrics.volume.volumeTrend * 100).toFixed(0)}% (7d/30d) — below ${(thresholds.volumeDeclinePct * 100).toFixed(0)}% threshold`,
      suggestedPlaybooks: ["VOLUME_RECOVERY"],
    };
  }
  return null;
};

export const checkLowLiquidity: Rule = (metrics, thresholds) => {
  if (metrics.volume.makerRatio < thresholds.lowMakerRatio) {
    return {
      code: "LOW_LIQUIDITY",
      severity: "warning",
      evidence: {
        makerRatio: metrics.volume.makerRatio,
        threshold: thresholds.lowMakerRatio,
        makerVolume7d: metrics.volume.makerVolume7d,
      },
      message: `Maker ratio ${(metrics.volume.makerRatio * 100).toFixed(1)}% — below ${(thresholds.lowMakerRatio * 100).toFixed(0)}% threshold`,
      suggestedPlaybooks: ["LIQUIDITY_BOOST"],
    };
  }
  return null;
};

export const checkHighChurn: Rule = (metrics, thresholds) => {
  if (metrics.users.churnRate > thresholds.highChurnRate) {
    return {
      code: "HIGH_CHURN",
      severity: "critical",
      evidence: {
        churnRate: metrics.users.churnRate,
        threshold: thresholds.highChurnRate,
        uniqueUsers7d: metrics.users.uniqueUsers7d,
        uniqueUsers30d: metrics.users.uniqueUsers30d,
      },
      message: `Churn rate ${(metrics.users.churnRate * 100).toFixed(0)}% — above ${(thresholds.highChurnRate * 100).toFixed(0)}% threshold`,
      suggestedPlaybooks: ["RETENTION_SIEGE"],
    };
  }
  return null;
};

export const checkRevenueCompression: Rule = (metrics, thresholds) => {
  // Revenue per user declining — simplified check against a minimum threshold
  if (metrics.revenue.revPerUser > 0 && metrics.revenue.marginBps < 1.0) {
    return {
      code: "REVENUE_COMPRESSION",
      severity: "warning",
      evidence: {
        revPerUser: metrics.revenue.revPerUser,
        marginBps: metrics.revenue.marginBps,
      },
      message: `Effective margin only ${metrics.revenue.marginBps.toFixed(2)} bps — revenue per user compressed`,
      suggestedPlaybooks: ["FEE_OPTIMIZATION"],
    };
  }
  return null;
};

export const checkReferralUnderperformance: Rule = (metrics, thresholds) => {
  if (metrics.referrals.referralConversion < thresholds.lowReferralConversion) {
    return {
      code: "REFERRAL_UNDERPERFORMANCE",
      severity: "info",
      evidence: {
        referralConversion: metrics.referrals.referralConversion,
        threshold: thresholds.lowReferralConversion,
        totalCodes: metrics.referrals.totalCodes,
      },
      message: `Referral conversion ${(metrics.referrals.referralConversion * 100).toFixed(1)}% — below ${(thresholds.lowReferralConversion * 100).toFixed(0)}% target`,
      suggestedPlaybooks: ["REFERRAL_OPTIMIZE"],
    };
  }
  return null;
};

export const checkLowAcquisition: Rule = (metrics, thresholds, config) => {
  const weeklyTarget = config.operatorTargets.monthlyNewUsers / 4;
  if (metrics.users.newUsers7d < weeklyTarget) {
    return {
      code: "LOW_ACQUISITION",
      severity: "warning",
      evidence: {
        newUsers7d: metrics.users.newUsers7d,
        weeklyTarget,
        monthlyTarget: config.operatorTargets.monthlyNewUsers,
      },
      message: `${metrics.users.newUsers7d} new users this week — target is ${Math.ceil(weeklyTarget)}`,
      suggestedPlaybooks: ["ACQUISITION_PUSH"],
    };
  }
  return null;
};

export const checkCampaignFatigue: Rule = (metrics, thresholds) => {
  if (metrics.campaigns.activeCampaigns > 0 && metrics.campaigns.questCompletion < thresholds.lowQuestCompletion) {
    return {
      code: "CAMPAIGN_FATIGUE",
      severity: "info",
      evidence: {
        questCompletion: metrics.campaigns.questCompletion,
        threshold: thresholds.lowQuestCompletion,
        activeCampaigns: metrics.campaigns.activeCampaigns,
      },
      message: `Quest completion ${(metrics.campaigns.questCompletion * 100).toFixed(0)}% — campaigns may be fatiguing users`,
      suggestedPlaybooks: ["REFERRAL_OPTIMIZE"],
    };
  }
  return null;
};

export const ALL_RULES: Rule[] = [
  checkTierPushOpportunity,
  checkDistributorOpportunity,
  checkInviteeAtRisk,
  checkVolumeDecline,
  checkLowLiquidity,
  checkHighChurn,
  checkRevenueCompression,
  checkReferralUnderperformance,
  checkLowAcquisition,
  checkCampaignFatigue,
];
