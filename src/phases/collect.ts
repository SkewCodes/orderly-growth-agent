import type { TradingClient } from "../api/trading-client.js";
import type { SocialClient } from "../api/social-client.js";
import type { CollectedMetrics, GrowthConfig, VolumeMetrics, RevenueMetrics, UserMetrics, ReferralMetrics, StakingMetrics, DistributorMetrics, CampaignMetrics, DailyVolume } from "../types.js";
import type { WatchdogState } from "../watchdog/types.js";
import { getCurrentTier } from "../economics/tiers.js";
import { calcTierProgression } from "../economics/tiers.js";
import { calcBuilderMargin } from "../economics/fees.js";
import { getCleanVolume } from "../watchdog/integration.js";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

export async function collect(
  trading: TradingClient,
  social: SocialClient | null,
  config: GrowthConfig,
  watchdogState?: WatchdogState,
): Promise<CollectedMetrics> {
  // Parallel API calls
  const [dailyVolumes, feeDefault, stakingRaw, valorRaw, referralSummary] = await Promise.all([
    trading.getBrokerDailyVolume(daysAgo(30), today()),
    trading.getDefaultFeeRate(),
    trading.getStakingInfo(),
    trading.getValorBalance(),
    trading.getReferralRebateSummary(daysAgo(7), today()),
  ]);

  // Social data (optional)
  let campaignData: CampaignMetrics = { activeCampaigns: 0, questCompletion: 0, activeCompetitions: [] };
  if (social) {
    try {
      const [campaigns, quests, competitions] = await Promise.all([
        social.listCampaigns(),
        social.listQuests(true),
        social.listCompetitions(),
      ]);

      const activeCampaigns = campaigns.filter((c) => c.status === "active");
      const activeQuests = quests.filter((q) => q.active);
      const avgCompletion = activeQuests.length > 0
        ? activeQuests.reduce((sum, q) => sum + q.completion_rate, 0) / activeQuests.length
        : 0;

      campaignData = {
        activeCampaigns: activeCampaigns.length,
        questCompletion: avgCompletion,
        activeCompetitions: competitions
          .filter((c) => c.status === "active")
          .map((c) => ({
            id: c.id,
            name: c.name,
            participants: c.participants,
            startDate: c.start_date,
            endDate: c.end_date,
          })),
      };
    } catch {
      // Social API failures are non-fatal
    }
  }

  // Compute volume metrics
  const volumes: DailyVolume[] = dailyVolumes.map((d) => ({
    date: d.date,
    volume: d.volume,
    makerVolume: d.maker_volume,
    takerVolume: d.taker_volume,
    fee: d.fee,
    brokerRebate: d.broker_rebate,
  }));

  const volume30dTotal = volumes.reduce((s, v) => s + v.volume, 0);
  const volume30dAvg = volumes.length > 0 ? volume30dTotal / volumes.length : 0;
  const last7 = volumes.slice(-7);
  const volume7dTotal = last7.reduce((s, v) => s + v.volume, 0);
  const volume7dAvg = last7.length > 0 ? volume7dTotal / last7.length : 0;
  const volume24h = volumes.length > 0 ? volumes[volumes.length - 1].volume : 0;
  const makerVolume7d = last7.reduce((s, v) => s + v.makerVolume, 0);
  const takerVolume7d = last7.reduce((s, v) => s + v.takerVolume, 0);
  const totalVolume7d = makerVolume7d + takerVolume7d;
  const makerRatio = totalVolume7d > 0 ? makerVolume7d / totalVolume7d : 0;
  const volumeTrend = volume30dAvg > 0 ? volume7dAvg / volume30dAvg : 1;

  let volumeMetrics: VolumeMetrics = {
    volume24h,
    volume7dAvg,
    volume30dAvg,
    volume30dTotal,
    volumeTrend,
    makerVolume7d,
    takerVolume7d,
    makerRatio,
    dailyVolumes: volumes,
  };

  // Apply watchdog volume adjustment (subtract flagged account volume)
  if (watchdogState && Object.keys(watchdogState.flaggedAccounts).length > 0) {
    const flaggedVolumes = new Map<string, number>();
    for (const [accountId, score] of Object.entries(watchdogState.flaggedAccounts)) {
      if (score.totalScore > 40) { // RESTRICT and above
        // Use evidence from wash trading or other detectors for volume estimate
        const evidence = Object.values(score.matchesByDetector).flat();
        let accountVolume = 0;
        for (const match of evidence) {
          const vol = (match.evidence?.volume as number) ?? (match.evidence?.totalVolume as number) ?? 0;
          accountVolume = Math.max(accountVolume, vol);
        }
        if (accountVolume > 0) {
          flaggedVolumes.set(accountId, accountVolume);
        }
      }
    }
    if (flaggedVolumes.size > 0) {
      volumeMetrics = getCleanVolume(volumeMetrics, flaggedVolumes);
    }
  }

  // Staking
  const staking: StakingMetrics = {
    orderStaked: stakingRaw.order_staked,
    esOrderBalance: stakingRaw.es_order_balance,
    valorEarned: stakingRaw.valor_earned,
    valorBalance: valorRaw.valor_balance,
    treasurySharePct: valorRaw.treasury_share_pct,
  };

  // Tier
  const currentTier = config.builderTier === "auto"
    ? getCurrentTier(volume30dTotal, staking.orderStaked)
    : { name: config.builderTier, cryptoBaseBps: getCurrentTier(0, 0).cryptoBaseBps }; // fallback

  const tierDef = getCurrentTier(volume30dTotal, staking.orderStaked);

  // Revenue
  const totalFees30d = volumes.reduce((s, v) => s + v.fee, 0);
  const totalRebates30d = volumes.reduce((s, v) => s + v.brokerRebate, 0);
  const dailyRevenue = volumes.length > 0 ? totalRebates30d / volumes.length : 0;
  const monthlyRevenue = totalRebates30d;
  const defaultTakerBps = feeDefault.futures_taker_fee_rate * 10000;
  const marginBps = calcBuilderMargin(defaultTakerBps, tierDef.name);

  // Rough user metrics (derived from available data)
  // In production these would come from per-user API calls
  const uniqueUsers30d = Math.max(1, Math.floor(volume30dTotal / (volume30dAvg * 0.5 || 1)));
  const uniqueUsers7d = Math.max(1, Math.floor(uniqueUsers30d * 0.7));
  const newUsers7d = Math.max(0, Math.floor(uniqueUsers7d * 0.15));
  const churnRate = uniqueUsers30d > 0 ? 1 - (uniqueUsers7d / uniqueUsers30d) : 0;
  const dormantUsers = Math.max(0, uniqueUsers30d - uniqueUsers7d);

  const users: UserMetrics = { uniqueUsers30d, uniqueUsers7d, newUsers7d, churnRate, dormantUsers };

  const revPerUser = uniqueUsers30d > 0 ? monthlyRevenue / uniqueUsers30d : 0;
  const revenue: RevenueMetrics = { dailyRevenue, monthlyRevenue, revPerUser, marginBps };

  // Referrals
  const totalReferees = referralSummary.reduce((s, r) => s + r.total_referees, 0);
  const tradedReferrals7d = referralSummary.reduce((s, r) => s + r.traded_referral, 0);
  const rebateAmount7d = referralSummary.reduce((s, r) => s + r.rebate_amount, 0);
  const referralConversion = totalReferees > 0 ? tradedReferrals7d / totalReferees : 0;

  const referrals: ReferralMetrics = {
    totalCodes: 0, // would need admin_info call
    totalReferees,
    tradedReferrals7d,
    referralConversion,
    rebateAmount7d,
  };

  // Distributor (placeholder — would need distributor-specific endpoints)
  const distributor: DistributorMetrics = {
    inviteeCount: 0,
    activeInvitees7d: 0,
    inviteeVolume30d: 0,
    distributorRevenue30d: 0,
    aggregateVolume: volume30dTotal,
    inviteeUtilization: 0,
  };

  // Tier progression
  const projectedAnnualVolume = volume30dAvg * 365;
  const tierProgression = calcTierProgression(
    volume30dTotal,
    distributor.aggregateVolume,
    staking,
    projectedAnnualVolume,
  );

  return {
    timestamp: new Date().toISOString(),
    volume: volumeMetrics,
    revenue,
    users,
    referrals,
    staking,
    distributor,
    campaigns: campaignData,
    tierProgression,
    feeRateDefault: {
      futuresMakerFee: feeDefault.futures_maker_fee_rate,
      futuresTakerFee: feeDefault.futures_taker_fee_rate,
    },
  };
}
