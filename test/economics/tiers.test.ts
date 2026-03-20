import { describe, it, expect } from "vitest";
import { getCurrentTier, getNextTier, getTierDefinition, canAssignTier, calcTierProgression } from "../../src/economics/tiers.js";

describe("tiers", () => {
  describe("getCurrentTier", () => {
    it("returns PUBLIC for zero volume and staking", () => {
      expect(getCurrentTier(0, 0).name).toBe("PUBLIC");
    });

    it("returns SILVER for 30M+ volume", () => {
      expect(getCurrentTier(30_000_000, 0).name).toBe("SILVER");
    });

    it("returns SILVER for 100K+ ORDER staked", () => {
      expect(getCurrentTier(0, 100_000).name).toBe("SILVER");
    });

    it("returns GOLD for 90M+ volume", () => {
      expect(getCurrentTier(90_000_000, 0).name).toBe("GOLD");
    });

    it("returns GOLD for 250K+ ORDER staked", () => {
      expect(getCurrentTier(0, 250_000).name).toBe("GOLD");
    });

    it("returns PLATINUM for 1B+ volume", () => {
      expect(getCurrentTier(1_000_000_000, 0).name).toBe("PLATINUM");
    });

    it("returns DIAMOND for 10B+ volume", () => {
      expect(getCurrentTier(10_000_000_000, 0).name).toBe("DIAMOND");
    });

    it("returns DIAMOND for 7M+ ORDER staked", () => {
      expect(getCurrentTier(0, 7_000_000).name).toBe("DIAMOND");
    });

    it("picks higher tier when volume qualifies for one and staking for another", () => {
      // Volume qualifies for SILVER (30M), staking qualifies for GOLD (250K)
      expect(getCurrentTier(30_000_000, 250_000).name).toBe("GOLD");
    });
  });

  describe("getNextTier", () => {
    it("returns SILVER for PUBLIC", () => {
      expect(getNextTier("PUBLIC")?.name).toBe("SILVER");
    });

    it("returns null for DIAMOND", () => {
      expect(getNextTier("DIAMOND")).toBeNull();
    });

    it("returns PLATINUM for GOLD", () => {
      expect(getNextTier("GOLD")?.name).toBe("PLATINUM");
    });
  });

  describe("getTierDefinition", () => {
    it("returns correct base fee for PUBLIC", () => {
      expect(getTierDefinition("PUBLIC").cryptoBaseBps).toBe(3.0);
    });

    it("returns correct base fee for DIAMOND", () => {
      expect(getTierDefinition("DIAMOND").cryptoBaseBps).toBe(1.0);
    });
  });

  describe("canAssignTier", () => {
    it("PUBLIC cannot assign any tier", () => {
      expect(canAssignTier("PUBLIC", "PUBLIC")).toBe(false);
    });

    it("GOLD can assign SILVER", () => {
      expect(canAssignTier("GOLD", "SILVER")).toBe(true);
    });

    it("GOLD cannot assign GOLD", () => {
      expect(canAssignTier("GOLD", "GOLD")).toBe(false);
    });

    it("DIAMOND can assign PLATINUM", () => {
      expect(canAssignTier("DIAMOND", "PLATINUM")).toBe(true);
    });
  });

  describe("calcTierProgression", () => {
    it("returns 100% progress for DIAMOND tier", () => {
      const result = calcTierProgression(
        10_000_000_000, 10_000_000_000,
        { orderStaked: 7_000_000, esOrderBalance: 0, valorEarned: 0, valorBalance: 0, treasurySharePct: 0 },
        10_000_000_000 * 12,
      );
      expect(result.currentTier).toBe("DIAMOND");
      expect(result.nextTier).toBeNull();
      expect(result.progressPct).toBe(100);
    });

    it("calculates progress toward SILVER correctly", () => {
      const result = calcTierProgression(
        24_000_000, 24_000_000,
        { orderStaked: 0, esOrderBalance: 0, valorEarned: 0, valorBalance: 0, treasurySharePct: 0 },
        24_000_000 * 12,
      );
      expect(result.currentTier).toBe("PUBLIC");
      expect(result.nextTier).toBe("SILVER");
      expect(result.progressPct).toBe(80);
      expect(result.volumeToNext).toBe(6_000_000);
      expect(result.marginGainAtNext).toBe(0.25);
    });
  });
});
