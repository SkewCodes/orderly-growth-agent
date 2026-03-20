import type { PlaybookName } from "../types.js";
import type { Playbook } from "./base.js";
import { TierPushPlaybook } from "./tier-push.js";
import { DistributorGrowthPlaybook } from "./distributor-growth.js";
import { InviteeSupportPlaybook } from "./invitee-support.js";
import { VolumeRecoveryPlaybook } from "./volume-recovery.js";
import { FeeOptimizationPlaybook } from "./fee-optimization.js";
import { RetentionSiegePlaybook } from "./retention-siege.js";
import { LiquidityBoostPlaybook } from "./liquidity-boost.js";
import { AcquisitionPushPlaybook } from "./acquisition-push.js";
import { ReferralOptimizePlaybook } from "./referral-optimize.js";

const REGISTRY: Record<PlaybookName, () => Playbook> = {
  TIER_PUSH: () => new TierPushPlaybook(),
  DISTRIBUTOR_GROWTH: () => new DistributorGrowthPlaybook(),
  INVITEE_SUPPORT: () => new InviteeSupportPlaybook(),
  VOLUME_RECOVERY: () => new VolumeRecoveryPlaybook(),
  FEE_OPTIMIZATION: () => new FeeOptimizationPlaybook(),
  RETENTION_SIEGE: () => new RetentionSiegePlaybook(),
  LIQUIDITY_BOOST: () => new LiquidityBoostPlaybook(),
  ACQUISITION_PUSH: () => new AcquisitionPushPlaybook(),
  REFERRAL_OPTIMIZE: () => new ReferralOptimizePlaybook(),
};

export function getPlaybook(name: PlaybookName): Playbook {
  const factory = REGISTRY[name];
  if (!factory) throw new Error(`Unknown playbook: ${name}`);
  return factory();
}

export function listPlaybooks(): PlaybookName[] {
  return Object.keys(REGISTRY) as PlaybookName[];
}
