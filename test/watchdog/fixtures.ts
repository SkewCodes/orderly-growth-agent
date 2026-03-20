import type { WatchdogState, WatchdogConfig, ScanData, TradeRecord, AccountRiskScore } from "../../src/watchdog/types.js";

export function emptyWatchdogState(): WatchdogState {
  return {
    version: 1,
    lastScanAt: new Date().toISOString(),
    flaggedAccounts: {},
    enforcementHistory: [],
    allowlist: [],
    scoreHistory: [],
  };
}

export function defaultWatchdogConfig(): WatchdogConfig {
  return {
    enabled: true,
    dryRun: true,
    scanWindowDays: 7,
    detectors: {
      washTrading: true,
      sybilAccounts: true,
      distributorGaming: true,
      campaignExploit: true,
      makerRebate: true,
      referralFraud: true,
      stakingTier: true,
    },
    thresholdOverrides: {},
    weightOverrides: {},
    allowlist: [],
    enforcementEnabled: false,
    maxEscalationsPerCycle: 5,
  };
}

export function emptyScanData(): ScanData {
  return {
    timestamp: new Date().toISOString(),
    scanWindowMs: 7 * 24 * 60 * 60 * 1000,
    trades: [],
    cancelledOrders: [],
    referralGraph: [],
    accountProfiles: [],
    campaignParticipants: [],
    stakingEvents: [],
    userFeeRates: [],
  };
}

export function makeTrade(overrides: Partial<TradeRecord> = {}): TradeRecord {
  return {
    tradeId: `t-${Math.random().toString(36).slice(2, 8)}`,
    accountId: "acc1",
    symbol: "PERP_ETH_USDC",
    side: "BUY",
    size: 1.0,
    price: 3000,
    fee: 0.5,
    timestamp: Date.now(),
    isMaker: false,
    ...overrides,
  };
}

export function makeScore(accountId: string, totalScore: number, tier: AccountRiskScore["tier"]): AccountRiskScore {
  return {
    accountId,
    totalScore,
    tier,
    matchesByDetector: {},
    previousScore: null,
    scoreDelta: totalScore,
    timestamp: new Date().toISOString(),
  };
}
