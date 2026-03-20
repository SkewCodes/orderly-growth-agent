import type { TradingClient } from "../../api/trading-client.js";
import type { BrokerTradeRecord, BrokerOrderRecord } from "../../api/types.js";
import type { TradeRecord, OrderRecord } from "../types.js";

export function normalizeTradeRecord(raw: BrokerTradeRecord): TradeRecord {
  return {
    tradeId: raw.trade_id,
    accountId: raw.account_id,
    symbol: raw.symbol,
    side: raw.side,
    size: raw.executed_quantity,
    price: raw.executed_price,
    fee: raw.fee,
    timestamp: raw.executed_timestamp,
    isMaker: raw.is_maker,
    counterpartyId: raw.counterparty_account_id,
  };
}

export function normalizeOrderRecord(raw: BrokerOrderRecord): OrderRecord {
  return {
    orderId: raw.order_id,
    accountId: raw.account_id,
    symbol: raw.symbol,
    side: raw.side,
    size: raw.quantity,
    price: raw.price,
    createdAt: raw.created_time,
    cancelledAt: raw.updated_time,
    isMaker: true, // cancelled orders were resting (maker)
    filledSize: raw.executed,
  };
}

export async function fetchTrades(
  trading: TradingClient,
  brokerId: string,
  startT: number,
  endT: number,
): Promise<TradeRecord[]> {
  const raw = await trading.getAllTrades(brokerId, startT, endT);
  return raw.map(normalizeTradeRecord);
}

export async function fetchCancelledOrders(
  trading: TradingClient,
  brokerId: string,
  startT: number,
  endT: number,
): Promise<OrderRecord[]> {
  const raw = await trading.getAllCancelledOrders(brokerId, startT, endT);
  return raw.map(normalizeOrderRecord);
}
