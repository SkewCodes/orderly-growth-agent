import { z } from "zod";

// ── Enums ──

export const EnforcementTier = z.enum([
  "CLEAN",
  "MONITOR",
  "RESTRICT",
  "PENALIZE",
  "ESCALATE",
]);
export type EnforcementTier = z.infer<typeof EnforcementTier>;

export const DetectorName = z.enum([
  "WASH_TRADING",
  "SYBIL_ACCOUNTS",
  "DISTRIBUTOR_GAMING",
  "CAMPAIGN_EXPLOIT",
  "MAKER_REBATE",
  "REFERRAL_FRAUD",
  "STAKING_TIER",
]);
export type DetectorName = z.infer<typeof DetectorName>;

// ── Scan Data (output of SCAN phase) ──

export interface TradeRecord {
  tradeId: string;
  accountId: string;
  symbol: string;
  side: "BUY" | "SELL";
  size: number;
  price: number;
  fee: number;
  timestamp: number; // epoch ms
  isMaker: boolean;
  counterpartyId?: string;
}

export interface OrderRecord {
  orderId: string;
  accountId: string;
  symbol: string;
  side: "BUY" | "SELL";
  size: number;
  price: number;
  createdAt: number;
  cancelledAt: number;
  isMaker: boolean;
  filledSize: number;
}

export interface ReferralEdge {
  referrerAccountId: string;
  refereeAccountId: string;
  referralCode: string;
  createdAt: string;
}

export interface AccountProfile {
  accountId: string;
  fundingSource?: string;    // deposit source address if available
  withdrawalDest?: string;   // withdrawal destination if available
  createdAt?: string;
  volume30d: number;
  lastTradeTime: number;
}

export interface CampaignParticipant {
  campaignId: string;
  accountId: string;
  rank: number;
  value: number; // volume or PnL depending on campaign type
  questsCompleted?: number;
  firstCompletionAt?: number;
}

export interface StakingEvent {
  accountId: string;
  action: "stake" | "unstake";
  amount: number;
  timestamp: number;
}

export interface ScanData {
  timestamp: string;
  scanWindowMs: number;
  trades: TradeRecord[];
  cancelledOrders: OrderRecord[];
  referralGraph: ReferralEdge[];
  accountProfiles: AccountProfile[];
  campaignParticipants: CampaignParticipant[];
  stakingEvents: StakingEvent[];
  userFeeRates: { accountId: string; makerRate: number; takerRate: number }[];
}

// ── Detector Output ──

export interface HeuristicMatch {
  heuristicId: string;            // e.g. "wash:net_position_zero"
  detector: DetectorName;
  accountId: string;
  confidence: number;             // 0.0 to 1.0
  evidence: Record<string, unknown>;
  description: string;
}

export interface DetectorResult {
  detector: DetectorName;
  matches: HeuristicMatch[];
  scanDurationMs: number;
}

// ── Scoring Output ──

export interface AccountRiskScore {
  accountId: string;
  totalScore: number;             // 0-100
  tier: EnforcementTier;
  matchesByDetector: Partial<Record<DetectorName, HeuristicMatch[]>>;
  previousScore: number | null;
  scoreDelta: number;
  timestamp: string;
}

// ── Enforcement ──

export type EnforcementActionType =
  | "monitor_flag"
  | "campaign_exclude"
  | "tier_block"
  | "fee_reset"
  | "code_deactivate"
  | "escalate_alert";

export interface EnforcementAction {
  type: EnforcementActionType;
  accountId: string;
  description: string;
  params: Record<string, unknown>;
  executed: boolean;
  dryRun: boolean;
}

export interface EnforcementResult {
  accountId: string;
  tier: EnforcementTier;
  previousTier: EnforcementTier | null;
  actions: EnforcementAction[];
}

// ── Watchdog Loop Result ──

export interface WatchdogLoopResult {
  scanData: ScanData;
  detectorResults: DetectorResult[];
  scores: AccountRiskScore[];
  enforcementResults: EnforcementResult[];
  riskReportMarkdown: string;
  state: WatchdogState;
}

// ── State (persisted between runs) ──

export interface ScoreSnapshot {
  timestamp: string;
  totalScanned: number;
  totalFlagged: number;
  byTier: Record<EnforcementTier, number>;
  totalVolumeExcluded: number;
}

export interface EnforcementHistoryEntry {
  timestamp: string;
  accountId: string;
  tier: EnforcementTier;
  actions: EnforcementAction[];
  riskScore: number;
}

export const WatchdogStateSchema = z.object({
  version: z.literal(1),
  lastScanAt: z.string(),
  flaggedAccounts: z.record(z.any()),           // accountId → AccountRiskScore
  enforcementHistory: z.array(z.any()).max(200),
  allowlist: z.array(z.string()),
  scoreHistory: z.array(z.any()).max(30),
});

export interface WatchdogState {
  version: 1;
  lastScanAt: string;
  flaggedAccounts: Record<string, AccountRiskScore>;
  enforcementHistory: EnforcementHistoryEntry[];
  allowlist: string[];
  scoreHistory: ScoreSnapshot[];
}

// ── Config ──

export const WatchdogConfigSchema = z.object({
  enabled: z.boolean().default(false),
  dryRun: z.boolean().default(true),
  scanWindowDays: z.number().int().min(1).max(30).default(7),
  detectors: z.object({
    washTrading: z.boolean().default(true),
    sybilAccounts: z.boolean().default(true),
    distributorGaming: z.boolean().default(true),
    campaignExploit: z.boolean().default(true),
    makerRebate: z.boolean().default(true),
    referralFraud: z.boolean().default(true),
    stakingTier: z.boolean().default(true),
  }).default({}),
  thresholdOverrides: z.record(z.number()).default({}),
  weightOverrides: z.record(z.number()).default({}),
  allowlist: z.array(z.string()).default([]),
  enforcementEnabled: z.boolean().default(false),
  maxEscalationsPerCycle: z.number().int().min(0).default(5),
}).default({});

export type WatchdogConfig = z.infer<typeof WatchdogConfigSchema>;
