import { describe, it, expect } from "vitest";
import { WashTradingDetector } from "../../../src/watchdog/detectors/wash-trading.js";
import { defaultWatchdogConfig, emptyScanData, makeTrade } from "../fixtures.js";

describe("WashTradingDetector", () => {
  const detector = new WashTradingDetector();

  it("returns no matches on empty data", () => {
    const result = detector.detect(emptyScanData(), defaultWatchdogConfig());
    expect(result.matches).toHaveLength(0);
    expect(result.detector).toBe("WASH_TRADING");
  });

  it("skips detection when disabled", () => {
    const config = { ...defaultWatchdogConfig(), detectors: { ...defaultWatchdogConfig().detectors, washTrading: false } };
    const data = emptyScanData();
    data.trades = [makeTrade()];
    const result = detector.detect(data, config);
    expect(result.matches).toHaveLength(0);
  });

  describe("wash:net_position_zero", () => {
    it("flags account with equal buys and sells in same window", () => {
      const now = Date.now();
      const data = emptyScanData();
      for (let i = 0; i < 30; i++) {
        data.trades.push(makeTrade({ side: "BUY", size: 1.0, timestamp: now + i * 2000 }));
        data.trades.push(makeTrade({ side: "SELL", size: 1.0, timestamp: now + i * 2000 + 500 }));
      }
      const result = detector.detect(data, defaultWatchdogConfig());
      const netZeroMatches = result.matches.filter((m) => m.heuristicId === "wash:net_position_zero");
      expect(netZeroMatches.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("wash:concentrated_counterparty", () => {
    it("flags account trading mostly with one counterparty", () => {
      const data = emptyScanData();
      for (let i = 0; i < 20; i++) {
        data.trades.push(makeTrade({ counterpartyId: "cp1", timestamp: Date.now() + i * 1000 }));
      }
      const result = detector.detect(data, defaultWatchdogConfig());
      const cpMatches = result.matches.filter((m) => m.heuristicId === "wash:concentrated_counterparty");
      expect(cpMatches.length).toBeGreaterThanOrEqual(1);
      expect(cpMatches[0].evidence.counterpartyId).toBe("cp1");
    });

    it("does not flag diverse counterparty trading", () => {
      const data = emptyScanData();
      for (let i = 0; i < 20; i++) {
        data.trades.push(makeTrade({ counterpartyId: `cp${i}`, timestamp: Date.now() + i * 1000 }));
      }
      const result = detector.detect(data, defaultWatchdogConfig());
      const cpMatches = result.matches.filter((m) => m.heuristicId === "wash:concentrated_counterparty");
      expect(cpMatches).toHaveLength(0);
    });
  });

  describe("wash:reciprocal_trades", () => {
    it("flags reciprocal trading between two accounts", () => {
      const data = emptyScanData();
      for (let i = 0; i < 10; i++) {
        data.trades.push(makeTrade({ accountId: "accA", counterpartyId: "accB", size: 1.0, price: 3000, timestamp: Date.now() + i * 1000 }));
      }
      for (let i = 0; i < 10; i++) {
        data.trades.push(makeTrade({ accountId: "accB", counterpartyId: "accA", size: 1.0, price: 3000, timestamp: Date.now() + i * 1000 }));
      }
      const result = detector.detect(data, defaultWatchdogConfig());
      const recipMatches = result.matches.filter((m) => m.heuristicId === "wash:reciprocal_trades");
      expect(recipMatches.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("wash:low_pnl_high_volume", () => {
    it("flags high volume with near-zero PnL", () => {
      const data = emptyScanData();
      for (let i = 0; i < 100; i++) {
        data.trades.push(makeTrade({ size: 10, price: 3000, fee: 0.001, timestamp: Date.now() + i * 1000 }));
      }
      const result = detector.detect(data, defaultWatchdogConfig());
      const pnlMatches = result.matches.filter((m) => m.heuristicId === "wash:low_pnl_high_volume");
      expect(pnlMatches.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("wash:pattern_repetition", () => {
    it("flags repeated identical orders", () => {
      const data = emptyScanData();
      for (let i = 0; i < 25; i++) {
        data.trades.push(makeTrade({ size: 1.5, price: 3000.0, timestamp: Date.now() + i * 60_000 }));
      }
      const result = detector.detect(data, defaultWatchdogConfig());
      const patternMatches = result.matches.filter((m) => m.heuristicId === "wash:pattern_repetition");
      expect(patternMatches.length).toBeGreaterThanOrEqual(1);
    });
  });
});
