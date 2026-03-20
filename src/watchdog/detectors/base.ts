import type { DetectorName, DetectorResult, HeuristicMatch, ScanData, WatchdogConfig } from "../types.js";

export abstract class Detector {
  abstract readonly name: DetectorName;
  abstract readonly heuristics: string[];

  /** Override to implement detection logic. Return all matches. */
  protected abstract runChecks(data: ScanData, config: WatchdogConfig, idx: ScanDataIndex): HeuristicMatch[];

  detect(data: ScanData, config: WatchdogConfig, idx?: ScanDataIndex): DetectorResult {
    const start = Date.now();
    if (!this.isEnabled(config)) return this.result([], start);
    const index = idx ?? buildScanDataIndex(data);
    return this.result(this.runChecks(data, config, index), start);
  }

  protected match(
    heuristicId: string,
    accountId: string,
    confidence: number,
    evidence: Record<string, unknown>,
    description: string,
  ): HeuristicMatch {
    return {
      heuristicId,
      detector: this.name,
      accountId,
      confidence: Math.max(0, Math.min(1, confidence)),
      evidence,
      description,
    };
  }

  protected result(matches: HeuristicMatch[], startTime: number): DetectorResult {
    return {
      detector: this.name,
      matches,
      scanDurationMs: Date.now() - startTime,
    };
  }

  protected isEnabled(config: WatchdogConfig): boolean {
    const detectorMap: Record<DetectorName, keyof typeof config.detectors> = {
      WASH_TRADING: "washTrading",
      SYBIL_ACCOUNTS: "sybilAccounts",
      DISTRIBUTOR_GAMING: "distributorGaming",
      CAMPAIGN_EXPLOIT: "campaignExploit",
      MAKER_REBATE: "makerRebate",
      REFERRAL_FRAUD: "referralFraud",
      STAKING_TIER: "stakingTier",
    };
    return config.detectors[detectorMap[this.name]] ?? true;
  }

  protected getThreshold(key: string, defaultVal: number, config: WatchdogConfig): number {
    return config.thresholdOverrides[key] ?? defaultVal;
  }
}

/**
 * Pre-computed indexes over ScanData used by multiple detectors.
 * Built once per scan cycle to avoid redundant O(n) passes.
 */
export interface ScanDataIndex {
  /** trades grouped by `accountId|symbol` */
  tradesByAccountSymbol: Map<string, import("../types.js").TradeRecord[]>;
  /** accountId → Map<counterpartyId, notional volume> */
  counterpartyVolume: Map<string, Map<string, number>>;
  /** accountId → total notional volume */
  accountVolume: Map<string, number>;
  /** accountId → AccountProfile */
  profileByAccount: Map<string, import("../types.js").AccountProfile>;
  /** fundingSource → accountId[] */
  accountsByFunding: Map<string, string[]>;
  /** withdrawalDest → accountId[] */
  accountsByDest: Map<string, string[]>;
  /** referrerAccountId → refereeAccountId[] */
  referrerToInvitees: Map<string, string[]>;
  /** accountId → staking events (sorted by timestamp) */
  stakingByAccount: Map<string, import("../types.js").StakingEvent[]>;
}

export function buildScanDataIndex(data: ScanData): ScanDataIndex {
  const tradesByAccountSymbol = new Map<string, import("../types.js").TradeRecord[]>();
  const counterpartyVolume = new Map<string, Map<string, number>>();
  const accountVolume = new Map<string, number>();

  for (const trade of data.trades) {
    const asKey = `${trade.accountId}|${trade.symbol}`;
    const list = tradesByAccountSymbol.get(asKey) ?? [];
    list.push(trade);
    tradesByAccountSymbol.set(asKey, list);

    const notional = trade.size * trade.price;
    accountVolume.set(trade.accountId, (accountVolume.get(trade.accountId) ?? 0) + notional);

    if (trade.counterpartyId) {
      const cpMap = counterpartyVolume.get(trade.accountId) ?? new Map<string, number>();
      cpMap.set(trade.counterpartyId, (cpMap.get(trade.counterpartyId) ?? 0) + notional);
      counterpartyVolume.set(trade.accountId, cpMap);
    }
  }

  const profileByAccount = new Map(data.accountProfiles.map((p) => [p.accountId, p]));

  const accountsByFunding = new Map<string, string[]>();
  const accountsByDest = new Map<string, string[]>();
  for (const profile of data.accountProfiles) {
    if (profile.fundingSource) {
      const list = accountsByFunding.get(profile.fundingSource) ?? [];
      list.push(profile.accountId);
      accountsByFunding.set(profile.fundingSource, list);
    }
    if (profile.withdrawalDest) {
      const list = accountsByDest.get(profile.withdrawalDest) ?? [];
      list.push(profile.accountId);
      accountsByDest.set(profile.withdrawalDest, list);
    }
  }

  const referrerToInvitees = new Map<string, string[]>();
  for (const edge of data.referralGraph) {
    if (!edge.referrerAccountId || !edge.refereeAccountId) continue;
    const list = referrerToInvitees.get(edge.referrerAccountId) ?? [];
    list.push(edge.refereeAccountId);
    referrerToInvitees.set(edge.referrerAccountId, list);
  }

  const stakingByAccount = new Map<string, import("../types.js").StakingEvent[]>();
  for (const event of data.stakingEvents) {
    const list = stakingByAccount.get(event.accountId) ?? [];
    list.push(event);
    stakingByAccount.set(event.accountId, list);
  }
  for (const events of stakingByAccount.values()) {
    events.sort((a, b) => a.timestamp - b.timestamp);
  }

  return {
    tradesByAccountSymbol,
    counterpartyVolume,
    accountVolume,
    profileByAccount,
    accountsByFunding,
    accountsByDest,
    referrerToInvitees,
    stakingByAccount,
  };
}
