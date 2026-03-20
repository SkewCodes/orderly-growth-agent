export interface HeuristicWeight {
  heuristicId: string;
  baseWeight: number;
  maxContribution: number;
}

/**
 * Default weight table for all 29 heuristics across 7 detectors.
 * Weights calibrated so that 3+ indicators from a single detector
 * push into RESTRICT (41+), and cross-detector signals compound.
 * maxContribution defaults to baseWeight when not explicitly different.
 */
const DEFAULT_WEIGHT_VALUES: Record<string, number> = {
  // Wash Trading (7)
  "wash:net_position_zero": 30,
  "wash:concentrated_counterparty": 25,
  "wash:reciprocal_trades": 35,
  "wash:rapid_roundtrip": 20,
  "wash:low_pnl_high_volume": 20,
  "wash:temporal_clustering": 10,
  "wash:pattern_repetition": 15,
  // Sybil Accounts (5)
  "sybil:common_funding": 30,
  "sybil:registration_burst": 15,
  "sybil:behavioral_clone": 35,
  "sybil:common_destination": 30,
  "sybil:discount_recycling": 40,
  // Distributor Gaming (4)
  "distgaming:self_referral": 40,
  "distgaming:shell_invitee": 30,
  "distgaming:volume_cycling": 35,
  "distgaming:tier_assignment_abuse": 45,
  // Campaign Exploit (5)
  "campaign:dust_streaks": 20,
  "campaign:speed_running": 25,
  "campaign:pnl_manipulation": 40,
  "campaign:referral_quest_sybil": 35,
  "campaign:social_bot_farm": 15,
  // Maker Rebate (3)
  "maker:spoof_and_cancel": 20,
  "maker:maker_taker_collusion": 40,
  "maker:layering": 30,
  // Referral Fraud (3)
  "referral:circular": 40,
  "referral:inactive_referees": 15,
  "referral:self_referral_drain": 45,
  // Staking Tier (2)
  "staking:stake_cycling": 25,
  "staking:flash_stake": 35,
};

export function getWeight(heuristicId: string, overrides: Record<string, number>): HeuristicWeight {
  const base = DEFAULT_WEIGHT_VALUES[heuristicId] ?? 0;
  const overrideWeight = overrides[heuristicId];
  const weight = overrideWeight ?? base;
  return {
    heuristicId,
    baseWeight: weight,
    maxContribution: overrideWeight !== undefined ? Math.max(weight, base) : weight,
  };
}
