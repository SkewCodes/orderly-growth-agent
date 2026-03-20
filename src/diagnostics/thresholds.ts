export interface DiagnosticThresholds {
  // Volume
  volumeDeclinePct: number;       // 7d avg / 30d avg ratio below this = decline
  volumeDeclineMinDays: number;   // consecutive days before flagging

  // Liquidity
  lowMakerRatio: number;          // maker_ratio below this
  lowMakerRatioMinDays: number;

  // Churn
  highChurnRate: number;

  // Revenue
  revenueCompressionPct: number;  // rev_per_user MoM decline

  // Referrals
  lowReferralConversion: number;

  // Acquisition
  // (compared against operator targets, not a fixed threshold)

  // Campaign fatigue
  lowQuestCompletion: number;

  // Tier push
  tierPushVolumePct: number;      // % of next tier threshold to trigger

  // Distributor
  minInviteeCount: number;        // below this = DISTRIBUTOR_OPPORTUNITY
  inviteeDeclineWoWPct: number;   // invitee volume decline WoW
}

export const DEFAULT_THRESHOLDS: DiagnosticThresholds = {
  volumeDeclinePct: 0.80,
  volumeDeclineMinDays: 3,
  lowMakerRatio: 0.25,
  lowMakerRatioMinDays: 5,
  highChurnRate: 0.30,
  revenueCompressionPct: 0.15,
  lowReferralConversion: 0.10,
  lowQuestCompletion: 0.20,
  tierPushVolumePct: 0.80,
  minInviteeCount: 3,
  inviteeDeclineWoWPct: 0.30,
};

export function mergeThresholds(
  overrides: Record<string, number>,
): DiagnosticThresholds {
  return { ...DEFAULT_THRESHOLDS, ...overrides } as DiagnosticThresholds;
}
