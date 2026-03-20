import { Playbook, type PlaybookDeps } from "./base.js";
import type { PlaybookContext, ActionResult, ActionEntry } from "../types.js";
import { bpsToRate } from "../economics/fees.js";

export class LiquidityBoostPlaybook extends Playbook {
  readonly name = "LIQUIDITY_BOOST" as const;

  protected async plan(ctx: PlaybookContext, deps: PlaybookDeps, dryRun: boolean): Promise<ActionResult> {
    const actions: ActionEntry[] = [];

    const makerRebateRate = -0.0001 / 100;
    const avgTakerMargin = ctx.metrics.revenue.marginBps / 10000;
    const takerVol = ctx.metrics.volume.takerVolume7d;
    const makerVol = ctx.metrics.volume.makerVolume7d;
    const takerRevenue = avgTakerMargin * takerVol;
    const rebateCost = Math.abs(makerRebateRate) * makerVol;
    const safe = takerRevenue > rebateCost;

    if (safe) {
      await this.tryFeeChange(deps, actions, dryRun,
        bpsToRate(-0.01), ctx.metrics.feeRateDefault.futuresTakerFee,
        "Set maker rebate to -0.01 bps (paid from builder margin)", {
          makerRebateBps: -0.01, estimatedWeeklyCost: rebateCost, takerRevenueCoverage: takerRevenue,
        });
    } else {
      actions.push(this.action("advisory", "Maker rebate unsafe — taker revenue insufficient to cover rebate cost", {
        takerRevenue, rebateCost,
      }));
    }

    await this.tryQuests(deps, actions, dryRun, [
      { name: "Maker Volume Challenge", type: "maker_volume", xpReward: 500, target: 500000, durationDays: 7 },
    ], "Maker Volume Challenge quest ($500K / 7d / 500 XP)");

    await this.tryCompetition(deps, actions, dryRun,
      { name: "Maker Leaderboard", type: "maker", durationDays: 7, prizePool: { permanentMmTier: true } },
      "Maker Leaderboard competition (7d)");

    actions.push(this.action("advisory",
      `Current maker ratio: ${(ctx.metrics.volume.makerRatio * 100).toFixed(1)}%. Target: >30%. Consider direct MM recruitment with enhanced rebate (-0.015 bps) for users with >70% maker ratio.`,
      { currentMakerRatio: ctx.metrics.volume.makerRatio },
    ));

    await deps.logger.log("act", "liquidity_boost", { dryRun, makerRatio: ctx.metrics.volume.makerRatio, rebateSet: safe });
    return this.result(true, actions, dryRun);
  }
}
