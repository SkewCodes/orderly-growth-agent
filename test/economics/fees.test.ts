import { describe, it, expect } from "vitest";
import { calcBuilderMargin, bpsToRate, rateToBps, enforceMinFee, calcUserFeeTier, applyStakingBonus, calcRevenueFromVolume } from "../../src/economics/fees.js";

describe("fees", () => {
  describe("calcBuilderMargin", () => {
    it("returns correct margin for PUBLIC tier", () => {
      // 5 bps user fee - 3 bps base = 2 bps margin
      expect(calcBuilderMargin(5, "PUBLIC")).toBe(2);
    });

    it("returns correct margin for DIAMOND tier", () => {
      // 5 bps user fee - 1 bps base = 4 bps margin
      expect(calcBuilderMargin(5, "DIAMOND")).toBe(4);
    });

    it("returns zero when user fee equals base fee", () => {
      expect(calcBuilderMargin(3, "PUBLIC")).toBe(0);
    });

    it("returns negative when fee below base (should be avoided)", () => {
      expect(calcBuilderMargin(2, "PUBLIC")).toBe(-1);
    });
  });

  describe("bpsToRate / rateToBps", () => {
    it("converts 3 bps to 0.0003", () => {
      expect(bpsToRate(3)).toBeCloseTo(0.0003);
    });

    it("converts 0.0003 to 3 bps", () => {
      expect(rateToBps(0.0003)).toBeCloseTo(3);
    });

    it("roundtrips correctly", () => {
      expect(rateToBps(bpsToRate(5.5))).toBeCloseTo(5.5);
    });
  });

  describe("enforceMinFee", () => {
    it("returns proposed fee when above base", () => {
      expect(enforceMinFee(5, "PUBLIC")).toBe(5);
    });

    it("clamps to base when proposed fee is below", () => {
      expect(enforceMinFee(2, "PUBLIC")).toBe(3);
    });

    it("uses correct base for each tier", () => {
      expect(enforceMinFee(0.5, "DIAMOND")).toBe(1);
    });
  });

  describe("calcUserFeeTier", () => {
    it("returns MM_TIER for 80%+ maker ratio", () => {
      const result = calcUserFeeTier("PUBLIC", { makerRatio: 0.85 });
      expect(result.tierLabel).toBe("MM_TIER");
      expect(result.makerBps).toBe(-0.01);
    });

    it("returns VIP_PLATINUM for 100K+ staked", () => {
      const result = calcUserFeeTier("PUBLIC", { orderStaked: 150_000 });
      expect(result.tierLabel).toBe("VIP_PLATINUM");
    });

    it("returns STANDARD for new user with no activity", () => {
      const result = calcUserFeeTier("PUBLIC", {});
      expect(result.tierLabel).toBe("STANDARD");
    });

    it("taker fee is always relative to builder tier base", () => {
      const publicResult = calcUserFeeTier("PUBLIC", {});
      const diamondResult = calcUserFeeTier("DIAMOND", {});
      // STANDARD: base + 3.0 bps
      expect(publicResult.takerBps).toBe(3 + 3);
      expect(diamondResult.takerBps).toBe(1 + 3);
    });
  });

  describe("applyStakingBonus", () => {
    it("returns full margin for no staking", () => {
      expect(applyStakingBonus(2, 0)).toBe(2);
    });

    it("applies 10% discount for 1K+ staked", () => {
      expect(applyStakingBonus(2, 1_000)).toBeCloseTo(1.8);
    });

    it("applies 50% discount for 500K+ staked", () => {
      expect(applyStakingBonus(2, 500_000)).toBeCloseTo(1.0);
    });
  });

  describe("calcRevenueFromVolume", () => {
    it("calculates revenue correctly", () => {
      // $100M volume * 2 bps margin = $20K
      expect(calcRevenueFromVolume(100_000_000, 2)).toBeCloseTo(20_000);
    });
  });
});
