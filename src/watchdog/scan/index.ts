import type { TradingClient } from "../../api/trading-client.js";
import type { GrowthConfig } from "../../types.js";
import type { WatchdogConfig, ScanData, ReferralEdge, AccountProfile } from "../types.js";
import { fetchTrades, fetchCancelledOrders } from "./trade-scanner.js";

/**
 * SCAN phase: pull trade history, cancelled orders, referral chains,
 * account profiles, and campaign data in parallel.
 */
export async function scan(
  trading: TradingClient,
  growthConfig: GrowthConfig,
  watchdogConfig: WatchdogConfig,
): Promise<ScanData> {
  const now = Date.now();
  const windowMs = watchdogConfig.scanWindowDays * 24 * 60 * 60 * 1000;
  const startT = now - windowMs;

  const brokerId = growthConfig.brokerId;

  // Parallel fetch: trades, cancelled orders, referral info, user fee rates
  const [trades, cancelledOrders, referralAdmin, userFeeRates] = await Promise.all([
    fetchTrades(trading, brokerId, startT, now),
    fetchCancelledOrders(trading, brokerId, startT, now),
    trading.getReferralAdminInfo(brokerId).catch(() => ({ codes: [] })),
    trading.getUserFeeRates().catch(() => []),
  ]);

  // Build referral graph from admin info
  const referralGraph: ReferralEdge[] = [];
  for (const code of referralAdmin.codes) {
    // The admin info gives us codes; the edges come from rebate summaries
    // For now, store the code metadata — full graph needs additional data
    referralGraph.push({
      referrerAccountId: "", // populated when account mapping is available
      refereeAccountId: "",
      referralCode: code.referral_code,
      createdAt: new Date().toISOString(),
    });
  }

  // Build account profiles from trade data
  const accountMap = new Map<string, AccountProfile>();
  for (const trade of trades) {
    const existing = accountMap.get(trade.accountId);
    if (existing) {
      existing.volume30d += trade.size * trade.price;
      existing.lastTradeTime = Math.max(existing.lastTradeTime, trade.timestamp);
    } else {
      accountMap.set(trade.accountId, {
        accountId: trade.accountId,
        volume30d: trade.size * trade.price,
        lastTradeTime: trade.timestamp,
      });
    }
  }

  return {
    timestamp: new Date().toISOString(),
    scanWindowMs: windowMs,
    trades,
    cancelledOrders,
    referralGraph,
    accountProfiles: Array.from(accountMap.values()),
    campaignParticipants: [], // populated when campaign data is available
    stakingEvents: [],        // populated when staking event data is available
    userFeeRates: userFeeRates.map((u) => ({
      accountId: u.account_id,
      makerRate: u.futures_maker_fee_rate,
      takerRate: u.futures_taker_fee_rate,
    })),
  };
}
