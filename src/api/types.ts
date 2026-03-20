// ── Trading API Response Types (api.orderly.org) ──

export interface APIResponse<T> {
  success: boolean;
  data: T;
  timestamp?: number;
}

export interface BrokerDailyVolume {
  date: string;
  volume: number;
  maker_volume: number;
  taker_volume: number;
  fee: number;
  broker_rebate: number;
}

export interface BrokerFeeRateDefault {
  futures_maker_fee_rate: number;
  futures_taker_fee_rate: number;
}

export interface BrokerFeeRateUser {
  account_id: string;
  futures_maker_fee_rate: number;
  futures_taker_fee_rate: number;
}

export interface BrokerUserInfo {
  account_id: string;
  account_mode: string;
  volume_30d: number;
  last_trade_time: number;
}

export interface StakingInfo {
  order_staked: number;
  es_order_balance: number;
  valor_earned: number;
}

export interface ValorBalance {
  valor_balance: number;
  treasury_share_pct: number;
}

export interface ReferralInfo {
  referral_code: string;
  referrer_rebate_rate: number;
  referee_discount_rate: number;
  total_referees: number;
  active: boolean;
}

export interface ReferralRebateSummary {
  date: string;
  total_referees: number;
  traded_referral: number;
  rebate_amount: number;
}

export interface ReferralAdminInfo {
  codes: ReferralInfo[];
}

// ── Social API Types (api.orderly.social) ──

export interface SocialCampaign {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: "active" | "completed" | "upcoming";
  participants: number;
}

export interface SocialQuest {
  id: string;
  name: string;
  type: string;
  xp_reward: number;
  completion_rate: number;
  active: boolean;
}

export interface SocialCompetition {
  id: string;
  name: string;
  type: string;
  start_date: string;
  end_date: string;
  participants: number;
  status: "active" | "completed" | "upcoming";
}

export interface LeaderboardEntry {
  rank: number;
  account_id: string;
  display_name: string;
  value: number;
}

export interface ShareCard {
  id: string;
  url: string;
  type: string;
}

// ── Watchdog API Types ──

export interface BrokerTradeRecord {
  trade_id: string;
  account_id: string;
  symbol: string;
  side: "BUY" | "SELL";
  executed_quantity: number;
  executed_price: number;
  fee: number;
  executed_timestamp: number;
  is_maker: boolean;
  counterparty_account_id?: string;
}

export interface BrokerOrderRecord {
  order_id: string;
  account_id: string;
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  price: number;
  created_time: number;
  updated_time: number;
  type: string;
  status: string;
  executed: number;
}

// ── Campaign Builder API Request Types ──

export interface CampaignCreateParams {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  type: "volume_race" | "pnl_competition" | "trading_quest" | "referral_sprint";
  config: Record<string, unknown>;
}

export interface QuestCreateParams {
  name: string;
  type: "volume_target" | "streak" | "first_trade" | "deposit" | "share_pnl" | "refer_friend" | "maker_volume";
  xpReward: number;
  target: number;
  durationDays: number;
}

export interface CompetitionCreateParams {
  name: string;
  type: "volume" | "pnl" | "maker" | "streak";
  durationDays: number;
  prizePool: Record<string, unknown>;
}
