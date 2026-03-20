import type { Detector } from "./base.js";
import { WashTradingDetector } from "./wash-trading.js";
import { SybilAccountsDetector } from "./sybil-accounts.js";
import { DistributorGamingDetector } from "./distributor-gaming.js";
import { CampaignExploitDetector } from "./campaign-exploit.js";
import { MakerRebateDetector } from "./maker-rebate.js";
import { ReferralFraudDetector } from "./referral-fraud.js";
import { StakingTierDetector } from "./staking-tier.js";

export const ALL_DETECTORS: Detector[] = [
  new WashTradingDetector(),
  new SybilAccountsDetector(),
  new DistributorGamingDetector(),
  new CampaignExploitDetector(),
  new MakerRebateDetector(),
  new ReferralFraudDetector(),
  new StakingTierDetector(),
];

export { Detector, buildScanDataIndex, type ScanDataIndex } from "./base.js";
export { WashTradingDetector } from "./wash-trading.js";
export { SybilAccountsDetector } from "./sybil-accounts.js";
export { DistributorGamingDetector } from "./distributor-gaming.js";
export { CampaignExploitDetector } from "./campaign-exploit.js";
export { MakerRebateDetector } from "./maker-rebate.js";
export { ReferralFraudDetector } from "./referral-fraud.js";
export { StakingTierDetector } from "./staking-tier.js";
