import { APIError } from "../errors.js";
import type {
  APIResponse,
  BrokerDailyVolume,
  BrokerFeeRateDefault,
  BrokerFeeRateUser,
  BrokerUserInfo,
  StakingInfo,
  ValorBalance,
  ReferralRebateSummary,
  ReferralAdminInfo,
  BrokerTradeRecord,
  BrokerOrderRecord,
} from "./types.js";

const BASE_URLS: Record<string, string> = {
  testnet: "https://testnet-api-evm.orderly.org",
  mainnet: "https://api-evm.orderly.org",
};

export interface TradingClientConfig {
  network: "testnet" | "mainnet";
  accountId: string;
  signRequest: (method: string, path: string, body?: Record<string, unknown>) => Promise<{
    "orderly-timestamp": string;
    "orderly-account-id": string;
    "orderly-key": string;
    "orderly-signature": string;
  }>;
}

export class TradingClient {
  private baseUrl: string;
  private config: TradingClientConfig;

  constructor(config: TradingClientConfig) {
    this.baseUrl = BASE_URLS[config.network] ?? BASE_URLS.testnet;
    this.config = config;
  }

  // ── Private Helpers ──

  private async handleResponse<T>(res: Response, method: string, path: string, phase: string): Promise<T> {
    if (!res.ok) {
      throw new APIError(`${method} ${path} failed`, res.status, phase);
    }
    const json = (await res.json()) as APIResponse<T>;
    if (!json.success) {
      throw new APIError(`${method} ${path}: API returned failure`, 400, phase);
    }
    return json.data;
  }

  private async privateGet<T>(path: string, phase = "collect"): Promise<T> {
    const headers = await this.config.signRequest("GET", path);
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { ...headers, "Content-Type": "application/json" },
    });
    return this.handleResponse<T>(res, "GET", path, phase);
  }

  private async privatePost<T>(path: string, body: Record<string, unknown>, phase = "act"): Promise<T> {
    const headers = await this.config.signRequest("POST", path, body);
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return this.handleResponse<T>(res, "POST", path, phase);
  }

  private async paginateAll<T>(fetcher: (page: number, size: number) => Promise<T[]>, size = 500): Promise<T[]> {
    const all: T[] = [];
    let page = 1;
    while (true) {
      const batch = await fetcher(page, size);
      all.push(...batch);
      if (batch.length < size) break;
      page++;
    }
    return all;
  }

  // ── Volume & Revenue ──

  async getBrokerDailyVolume(startDate: string, endDate: string, opts?: {
    aggregateBy?: "day" | "week" | "month";
    orderTag?: string;
  }): Promise<BrokerDailyVolume[]> {
    const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
    if (opts?.aggregateBy) params.set("aggregate_by", opts.aggregateBy);
    if (opts?.orderTag) params.set("order_tag", opts.orderTag);
    return this.privateGet<BrokerDailyVolume[]>(`/v1/volume/broker/daily?${params}`);
  }

  // ── Fee Management ──

  async getDefaultFeeRate(): Promise<BrokerFeeRateDefault> {
    return this.privateGet<BrokerFeeRateDefault>("/v1/broker/fee_rate/default");
  }

  async setDefaultFeeRate(makerRate: number, takerRate: number): Promise<void> {
    await this.privatePost("/v1/broker/fee_rate/default", {
      futures_maker_fee_rate: makerRate,
      futures_taker_fee_rate: takerRate,
    });
  }

  async getUserFeeRates(): Promise<BrokerFeeRateUser[]> {
    return this.privateGet<BrokerFeeRateUser[]>("/v1/broker/fee_rate/users");
  }

  async setUserFeeRate(accountIds: string[], makerRate: number, takerRate: number): Promise<void> {
    await this.privatePost("/v1/broker/fee_rate/set", {
      account_ids: accountIds,
      futures_maker_fee_rate: makerRate,
      futures_taker_fee_rate: takerRate,
    });
  }

  async getUserInfo(accountId: string): Promise<BrokerUserInfo> {
    return this.privateGet<BrokerUserInfo>(`/v1/broker/user_info?account_id=${accountId}`);
  }

  // ── Staking & VALOR ──

  async getStakingInfo(): Promise<StakingInfo> {
    return this.privateGet<StakingInfo>("/v1/staking/info");
  }

  async getValorBalance(): Promise<ValorBalance> {
    return this.privateGet<ValorBalance>("/v1/valor/balance");
  }

  // ── Referrals ──

  async createReferralCode(code: string, referrerRebate: number, refereeDiscount: number): Promise<void> {
    await this.privatePost("/v1/referral/create", {
      referral_code: code,
      referrer_rebate_rate: referrerRebate,
      referee_discount_rate: refereeDiscount,
    });
  }

  async getReferralRebateSummary(startDate: string, endDate: string): Promise<ReferralRebateSummary[]> {
    return this.privateGet<ReferralRebateSummary[]>(
      `/v1/referral/rebate_summary?start_date=${startDate}&end_date=${endDate}`
    );
  }

  async getReferralAdminInfo(brokerId: string): Promise<ReferralAdminInfo> {
    return this.privateGet<ReferralAdminInfo>(`/v1/referral/admin_info?broker_id=${brokerId}`);
  }

  // ── Watchdog Endpoints ──

  async getTrades(brokerId: string, startT: number, endT: number, page = 1, size = 500): Promise<BrokerTradeRecord[]> {
    const params = new URLSearchParams({
      broker_id: brokerId,
      start_t: String(startT),
      end_t: String(endT),
      page: String(page),
      size: String(size),
    });
    return this.privateGet<BrokerTradeRecord[]>(`/v1/trades?${params}`);
  }

  async getAllTrades(brokerId: string, startT: number, endT: number): Promise<BrokerTradeRecord[]> {
    return this.paginateAll((page, size) => this.getTrades(brokerId, startT, endT, page, size));
  }

  async getCancelledOrders(brokerId: string, startT: number, endT: number, page = 1, size = 500): Promise<BrokerOrderRecord[]> {
    const params = new URLSearchParams({
      broker_id: brokerId,
      start_t: String(startT),
      end_t: String(endT),
      status: "CANCELLED",
      page: String(page),
      size: String(size),
    });
    return this.privateGet<BrokerOrderRecord[]>(`/v1/orders?${params}`);
  }

  async getAllCancelledOrders(brokerId: string, startT: number, endT: number): Promise<BrokerOrderRecord[]> {
    return this.paginateAll((page, size) => this.getCancelledOrders(brokerId, startT, endT, page, size));
  }

}
