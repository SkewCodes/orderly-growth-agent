import { Playbook, type PlaybookDeps } from "./base.js";
import type { PlaybookContext, ActionResult, ActionEntry } from "../types.js";
import { getTierDefinition } from "../economics/tiers.js";
import { enforceMinFee, bpsToRate } from "../economics/fees.js";

export class VolumeRecoveryPlaybook extends Playbook {
  readonly name = "VOLUME_RECOVERY" as const;

  protected async plan(ctx: PlaybookContext, deps: PlaybookDeps, dryRun: boolean): Promise<ActionResult> {
    const actions: ActionEntry[] = [];
    const tier = ctx.metrics.tierProgression.currentTier;
    const baseBps = getTierDefinition(tier).cryptoBaseBps;
    const currentTaker = ctx.metrics.feeRateDefault.futuresTakerFee * 10000;

    const newTakerBps = enforceMinFee(Math.max(currentTaker * 0.8, baseBps + 0.5), tier);
    await this.tryFeeChange(deps, actions, dryRun,
      ctx.metrics.feeRateDefault.futuresMakerFee, bpsToRate(newTakerBps),
      `Reduced taker fee from ${currentTaker.toFixed(2)} to ${newTakerBps.toFixed(2)} bps`, {
        previousBps: currentTaker, newTakerBps,
        costEstimate: (currentTaker - newTakerBps) / 10000 * ctx.metrics.volume.volume7dAvg * 7,
      });

    await this.tryReferralCode(deps, actions, dryRun, "COMEBACK", 0.25, 0.30, "comeback referral code");

    await this.tryCampaign(deps, actions, dryRun, {
      name: "Volume Blitz — 7-Day Recovery",
      description: "Trade to win! Top volume traders share the prize pool.",
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      type: "volume_race",
      config: { targetVolume: ctx.metrics.volume.volume30dAvg * 7 },
    }, "7-day volume blitz competition");

    await this.tryQuests(deps, actions, dryRun, [
      { name: "Volume Target", type: "volume_target", xpReward: 200, target: 10000, durationDays: 7 },
      { name: "5-Day Streak", type: "streak", xpReward: 300, target: 5, durationDays: 7 },
    ], "volume target + streak quests");

    await deps.logger.log("act", "volume_recovery", { tier, newTakerBps });
    return this.result(true, actions, dryRun);
  }
}
