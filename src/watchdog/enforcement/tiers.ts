import type { EnforcementTier, EnforcementActionType } from "../types.js";

export interface TierDefinition {
  tier: EnforcementTier;
  minScore: number;
  maxScore: number;
  actions: EnforcementActionType[];
  description: string;
}

export const ENFORCEMENT_TIERS: TierDefinition[] = [
  {
    tier: "CLEAN",
    minScore: 0,
    maxScore: 20,
    actions: [],
    description: "No action — account listed as clean",
  },
  {
    tier: "MONITOR",
    minScore: 21,
    maxScore: 40,
    actions: ["monitor_flag"],
    description: "Flagged in report, increased monitoring frequency",
  },
  {
    tier: "RESTRICT",
    minScore: 41,
    maxScore: 60,
    actions: ["monitor_flag", "campaign_exclude", "tier_block"],
    description: "Excluded from campaigns, tier promotions blocked, volume excluded from tier calc",
  },
  {
    tier: "PENALIZE",
    minScore: 61,
    maxScore: 80,
    actions: ["monitor_flag", "campaign_exclude", "tier_block", "fee_reset", "code_deactivate"],
    description: "Fee tier reverted to default, referral code deactivated",
  },
  {
    tier: "ESCALATE",
    minScore: 81,
    maxScore: 100,
    actions: ["monitor_flag", "campaign_exclude", "tier_block", "fee_reset", "code_deactivate", "escalate_alert"],
    description: "Flagged for Orderly review, operator manual review required",
  },
];

export function getTierForScore(score: number): TierDefinition {
  const clamped = Math.max(0, Math.min(100, score));
  for (const tier of ENFORCEMENT_TIERS) {
    if (clamped >= tier.minScore && clamped <= tier.maxScore) {
      return tier;
    }
  }
  return ENFORCEMENT_TIERS[0]; // CLEAN fallback
}
