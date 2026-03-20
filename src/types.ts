import { z } from "zod";
import { WatchdogConfigSchema } from "./watchdog/types.js";

// ── Builder Tiers ──

export const TierName = z.enum([
  "PUBLIC",
  "SILVER",
  "GOLD",
  "PLATINUM",
  "DIAMOND",
]);
export type TierName = z.infer<typeof TierName>;

export interface TierDefinition {
  name: TierName;
  volume30dThreshold: number; // USD
  orderStakedThreshold: number; // $ORDER tokens
  cryptoBaseBps: number;
  rwaBaseBps: number;
  makerBaseBps: number;
  canAssignTiers: TierName[]; // tiers this tier can assign to invitees
}

// ── Diagnostic Codes ──

export const DiagnosisCode = z.enum([
  "TIER_PUSH_OPPORTUNITY",
  "DISTRIBUTOR_OPPORTUNITY",
  "INVITEE_AT_RISK",
  "VOLUME_DECLINE",
  "LOW_LIQUIDITY",
  "HIGH_CHURN",
  "REVENUE_COMPRESSION",
  "REFERRAL_UNDERPERFORMANCE",
  "LOW_ACQUISITION",
  "CAMPAIGN_FATIGUE",
  "WATCHDOG_ABUSE_DETECTED",
  "GREEN",
]);
export type DiagnosisCode = z.infer<typeof DiagnosisCode>;

export type Severity = "info" | "warning" | "critical";

export interface Diagnosis {
  code: DiagnosisCode;
  severity: Severity;
  evidence: Record<string, unknown>;
  message: string;
  suggestedPlaybooks: PlaybookName[];
}

// ── Playbook Names ──

export const PlaybookName = z.enum([
  "TIER_PUSH",
  "DISTRIBUTOR_GROWTH",
  "INVITEE_SUPPORT",
  "VOLUME_RECOVERY",
  "FEE_OPTIMIZATION",
  "RETENTION_SIEGE",
  "LIQUIDITY_BOOST",
  "ACQUISITION_PUSH",
  "REFERRAL_OPTIMIZE",
]);
export type PlaybookName = z.infer<typeof PlaybookName>;

// ── Collected Metrics ──

export interface VolumeMetrics {
  volume24h: number;
  volume7dAvg: number;
  volume30dAvg: number;
  volume30dTotal: number;
  volumeTrend: number; // volume_7d_avg / volume_30d_avg
  makerVolume7d: number;
  takerVolume7d: number;
  makerRatio: number;
  dailyVolumes: DailyVolume[];
}

export interface DailyVolume {
  date: string;
  volume: number;
  makerVolume: number;
  takerVolume: number;
  fee: number;
  brokerRebate: number;
}

export interface RevenueMetrics {
  dailyRevenue: number;
  monthlyRevenue: number;
  revPerUser: number;
  marginBps: number; // effective margin above base fee
}

export interface UserMetrics {
  uniqueUsers30d: number;
  uniqueUsers7d: number;
  newUsers7d: number;
  churnRate: number; // 1 - (unique_7d / unique_30d)
  dormantUsers: number; // 0 volume for 14+ days
}

export interface ReferralMetrics {
  totalCodes: number;
  totalReferees: number;
  tradedReferrals7d: number;
  referralConversion: number;
  rebateAmount7d: number;
}

export interface StakingMetrics {
  orderStaked: number;
  esOrderBalance: number;
  valorEarned: number;
  valorBalance: number;
  treasurySharePct: number;
}

export interface DistributorMetrics {
  inviteeCount: number;
  activeInvitees7d: number;
  inviteeVolume30d: number;
  distributorRevenue30d: number;
  aggregateVolume: number; // personal + invitee
  inviteeUtilization: number;
}

export interface CampaignMetrics {
  activeCampaigns: number;
  questCompletion: number;
  activeCompetitions: CampaignSummary[];
}

export interface CampaignSummary {
  id: string;
  name: string;
  participants: number;
  startDate: string;
  endDate: string;
}

export interface TierProgressionMetrics {
  currentTier: TierName;
  nextTier: TierName | null;
  volumeToNext: number;
  stakingToNext: number;
  daysToNextTier: number | null;
  marginGainAtNext: number; // bps reduction
  annualMarginGain: number; // USD
  progressPct: number;
}

export interface CollectedMetrics {
  timestamp: string;
  volume: VolumeMetrics;
  revenue: RevenueMetrics;
  users: UserMetrics;
  referrals: ReferralMetrics;
  staking: StakingMetrics;
  distributor: DistributorMetrics;
  campaigns: CampaignMetrics;
  tierProgression: TierProgressionMetrics;
  feeRateDefault: { futuresMakerFee: number; futuresTakerFee: number };
}

// ── Decisions ──

export interface Decision {
  playbook: PlaybookName;
  trigger: Diagnosis;
  params: Record<string, unknown>;
  estimatedImpact: string;
}

// ── Action Results ──

export interface ActionResult {
  playbook: PlaybookName;
  success: boolean;
  dryRun: boolean;
  actions: ActionEntry[];
  error?: string;
}

export interface ActionEntry {
  type: "fee_change" | "referral_create" | "campaign_create" | "campaign_update" | "quest_create" | "competition_create" | "share_card" | "advisory" | "other";
  description: string;
  params: Record<string, unknown>;
  result?: Record<string, unknown>;
}

// ── ROI Measurement ──

export const Verdict = z.enum(["REPEAT", "MODIFY", "RETIRE"]);
export type Verdict = z.infer<typeof Verdict>;

export interface ROIResult {
  playbook: PlaybookName;
  durationDays: number;
  tier: TierName;
  baseBps: number;
  volumeLiftPct: number;
  revenueDelta: number;
  costTotal: number;
  costBreakdown: { feeDiscounts: number; prizes: number; rebates: number };
  roi: number;
  tierImpact: { volumeContributed: number; progressBefore: number; progressAfter: number; tierUpgraded: boolean };
  verdict: Verdict;
}

// ── Scorecard ──

export interface Scorecard {
  date: string;
  brokerName: string;
  tier: TierName;
  baseFee: number;
  tierProgress: TierProgressionMetrics;
  volume: VolumeMetrics;
  revenue: RevenueMetrics;
  users: UserMetrics;
  referrals: ReferralMetrics;
  distributor: DistributorMetrics;
  campaigns: CampaignMetrics;
  actions: ActionResult[];
  diagnoses: Diagnosis[];
  roiResults: ROIResult[];
  markdown: string;
}

// ── State (persisted between runs) ──

export interface MetricsSnapshot {
  timestamp: string;
  volume30dTotal: number;
  volume7dAvg: number;
  dailyRevenue: number;
  uniqueUsers7d: number;
  newUsers7d: number;
  churnRate: number;
  makerRatio: number;
  referralConversion: number;
  questCompletion: number;
  aggregateVolume: number;
  inviteeCount: number;
}

export interface PlaybookRun {
  playbook: PlaybookName;
  startedAt: string;
  completedAt: string;
  params: Record<string, unknown>;
  actions: ActionEntry[];
  dryRun: boolean;
}

export interface CampaignRecord {
  id: string;
  name: string;
  playbook: PlaybookName;
  createdAt: string;
  endedAt?: string;
  spend: number;
  volumeLift?: number;
  revenueDelta?: number;
  roi?: number;
  verdict?: Verdict;
}

export interface TierChange {
  date: string;
  from: TierName;
  to: TierName;
  trigger: "volume" | "staking" | "both";
}

export const GrowthStateSchema = z.object({
  version: z.literal(1),
  lastRunAt: z.string(),
  metricsHistory: z.array(z.any()).max(30),
  playbookHistory: z.array(z.any()),
  campaignHistory: z.array(z.any()),
  verdicts: z.record(z.string()),
  tierHistory: z.array(z.any()),
});

export interface GrowthState {
  version: 1;
  lastRunAt: string;
  metricsHistory: MetricsSnapshot[];
  playbookHistory: PlaybookRun[];
  campaignHistory: CampaignRecord[];
  verdicts: Record<string, Verdict>;
  tierHistory: TierChange[];
}

// ── Config ──

export const GrowthConfigSchema = z.object({
  brokerId: z.string().min(1),
  brokerName: z.string().default("My DEX"),
  network: z.enum(["testnet", "mainnet"]).default("mainnet"),
  socialApiKeyRef: z.string().optional(),
  builderTier: z.union([z.literal("auto"), TierName]).default("auto"),
  operatorTargets: z.object({
    dailyVolumeUsd: z.number().default(1_000_000),
    dailyRevenueUsd: z.number().default(500),
    activeUsersWeekly: z.number().default(200),
    monthlyNewUsers: z.number().default(50),
  }).default({}),
  maxPlaybooksPerCycle: z.number().int().min(1).max(5).default(2),
  dryRun: z.boolean().default(true),
  thresholdOverrides: z.record(z.number()).default({}),
  enabledPlaybooks: z.array(PlaybookName).default([
    "TIER_PUSH",
    "DISTRIBUTOR_GROWTH",
    "INVITEE_SUPPORT",
    "VOLUME_RECOVERY",
    "FEE_OPTIMIZATION",
    "RETENTION_SIEGE",
    "LIQUIDITY_BOOST",
    "ACQUISITION_PUSH",
    "REFERRAL_OPTIMIZE",
  ]),
  reportOutputDir: z.string().optional(),
  watchdog: WatchdogConfigSchema,
});

export type GrowthConfig = z.infer<typeof GrowthConfigSchema>;

// ── Playbook Context ──

export interface PlaybookContext {
  metrics: CollectedMetrics;
  state: GrowthState;
  config: GrowthConfig;
  diagnosis: Diagnosis;
  dryRun: boolean;
}
