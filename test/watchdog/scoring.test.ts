import { describe, it, expect } from "vitest";
import { scoreAccounts } from "../../src/watchdog/scoring/index.js";
import type { DetectorResult } from "../../src/watchdog/types.js";
import { emptyWatchdogState, defaultWatchdogConfig } from "./fixtures.js";

describe("scoreAccounts", () => {
  it("returns empty array when no matches", () => {
    const results: DetectorResult[] = [
      { detector: "WASH_TRADING", matches: [], scanDurationMs: 10 },
    ];
    const scores = scoreAccounts(results, emptyWatchdogState(), defaultWatchdogConfig());
    expect(scores).toHaveLength(0);
  });

  it("scores a single match correctly", () => {
    const results: DetectorResult[] = [
      {
        detector: "WASH_TRADING",
        matches: [
          { heuristicId: "wash:net_position_zero", detector: "WASH_TRADING", accountId: "acc1", confidence: 1.0, evidence: {}, description: "test" },
        ],
        scanDurationMs: 10,
      },
    ];
    const scores = scoreAccounts(results, emptyWatchdogState(), defaultWatchdogConfig());
    expect(scores).toHaveLength(1);
    expect(scores[0].accountId).toBe("acc1");
    expect(scores[0].totalScore).toBe(30);
    expect(scores[0].tier).toBe("MONITOR");
  });

  it("caps score at 100", () => {
    const results: DetectorResult[] = [
      {
        detector: "WASH_TRADING",
        matches: [
          { heuristicId: "wash:net_position_zero", detector: "WASH_TRADING", accountId: "acc1", confidence: 1.0, evidence: {}, description: "" },
          { heuristicId: "wash:reciprocal_trades", detector: "WASH_TRADING", accountId: "acc1", confidence: 1.0, evidence: {}, description: "" },
          { heuristicId: "wash:low_pnl_high_volume", detector: "WASH_TRADING", accountId: "acc1", confidence: 1.0, evidence: {}, description: "" },
          { heuristicId: "wash:rapid_roundtrip", detector: "WASH_TRADING", accountId: "acc1", confidence: 1.0, evidence: {}, description: "" },
        ],
        scanDurationMs: 10,
      },
    ];
    const scores = scoreAccounts(results, emptyWatchdogState(), defaultWatchdogConfig());
    expect(scores[0].totalScore).toBeLessThanOrEqual(100);
  });

  it("assigns ESCALATE tier for score > 80", () => {
    const results: DetectorResult[] = [
      {
        detector: "WASH_TRADING",
        matches: [
          { heuristicId: "wash:net_position_zero", detector: "WASH_TRADING", accountId: "acc1", confidence: 1.0, evidence: {}, description: "" },
          { heuristicId: "wash:reciprocal_trades", detector: "WASH_TRADING", accountId: "acc1", confidence: 1.0, evidence: {}, description: "" },
          { heuristicId: "wash:low_pnl_high_volume", detector: "WASH_TRADING", accountId: "acc1", confidence: 1.0, evidence: {}, description: "" },
        ],
        scanDurationMs: 10,
      },
    ];
    const scores = scoreAccounts(results, emptyWatchdogState(), defaultWatchdogConfig());
    expect(scores[0].totalScore).toBe(85);
    expect(scores[0].tier).toBe("ESCALATE");
  });

  it("skips allowlisted accounts", () => {
    const results: DetectorResult[] = [
      {
        detector: "WASH_TRADING",
        matches: [
          { heuristicId: "wash:net_position_zero", detector: "WASH_TRADING", accountId: "mm_account", confidence: 1.0, evidence: {}, description: "" },
        ],
        scanDurationMs: 10,
      },
    ];
    const config = { ...defaultWatchdogConfig(), allowlist: ["mm_account"] };
    const scores = scoreAccounts(results, emptyWatchdogState(), config);
    expect(scores).toHaveLength(0);
  });

  it("deduplicates matches by heuristic, keeping highest confidence", () => {
    const results: DetectorResult[] = [
      {
        detector: "WASH_TRADING",
        matches: [
          { heuristicId: "wash:net_position_zero", detector: "WASH_TRADING", accountId: "acc1", confidence: 0.5, evidence: {}, description: "low" },
          { heuristicId: "wash:net_position_zero", detector: "WASH_TRADING", accountId: "acc1", confidence: 0.9, evidence: {}, description: "high" },
        ],
        scanDurationMs: 10,
      },
    ];
    const scores = scoreAccounts(results, emptyWatchdogState(), defaultWatchdogConfig());
    expect(scores).toHaveLength(1);
    expect(scores[0].totalScore).toBe(27);
  });

  it("computes score delta from previous state", () => {
    const state = emptyWatchdogState();
    state.flaggedAccounts["acc1"] = {
      accountId: "acc1", totalScore: 20, tier: "CLEAN",
      matchesByDetector: {}, previousScore: null, scoreDelta: 20,
      timestamp: new Date().toISOString(),
    };

    const results: DetectorResult[] = [
      {
        detector: "WASH_TRADING",
        matches: [
          { heuristicId: "wash:net_position_zero", detector: "WASH_TRADING", accountId: "acc1", confidence: 1.0, evidence: {}, description: "" },
        ],
        scanDurationMs: 10,
      },
    ];
    const scores = scoreAccounts(results, state, defaultWatchdogConfig());
    expect(scores[0].previousScore).toBe(20);
    expect(scores[0].scoreDelta).toBe(10);
  });

  it("sorts scores descending", () => {
    const results: DetectorResult[] = [
      {
        detector: "WASH_TRADING",
        matches: [
          { heuristicId: "wash:net_position_zero", detector: "WASH_TRADING", accountId: "low_risk", confidence: 0.3, evidence: {}, description: "" },
          { heuristicId: "wash:reciprocal_trades", detector: "WASH_TRADING", accountId: "high_risk", confidence: 1.0, evidence: {}, description: "" },
        ],
        scanDurationMs: 10,
      },
    ];
    const scores = scoreAccounts(results, emptyWatchdogState(), defaultWatchdogConfig());
    expect(scores[0].accountId).toBe("high_risk");
    expect(scores[1].accountId).toBe("low_risk");
  });
});
