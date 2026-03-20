import { Playbook, type PlaybookDeps } from "./base.js";
import type { PlaybookContext, ActionResult, ActionEntry } from "../types.js";
import { getTierDefinition } from "../economics/tiers.js";
import { enforceMinFee, bpsToRate } from "../economics/fees.js";
import { inviteesNeededForTier } from "../economics/distributor.js";

export class TierPushPlaybook extends Playbook {
  readonly name = "TIER_PUSH" as const;

  protected async plan(ctx: PlaybookContext, deps: PlaybookDeps, dryRun: boolean): Promise<ActionResult> {
    const actions: ActionEntry[] = [];
    const tp = ctx.metrics.tierProgression;
    const next = tp.nextTier ? getTierDefinition(tp.nextTier) : null;

    if (!next) {
      return this.result(true, [this.action("advisory", `${dryRun ? "[DRY-RUN] " : ""}Already at Diamond tier — no push needed`)], dryRun);
    }

    const aggressiveTaker = getTierDefinition(tp.currentTier).cryptoBaseBps + 0.5;
    const safeRate = enforceMinFee(aggressiveTaker, tp.currentTier);
    await this.tryFeeChange(deps, actions, dryRun, 0, bpsToRate(safeRate),
      `Reduced taker fee to ${safeRate} bps for tier push`, {
        newTakerBps: safeRate,
        costEstimate: (ctx.metrics.revenue.marginBps - (safeRate - getTierDefinition(tp.currentTier).cryptoBaseBps)) * ctx.metrics.volume.volume7dAvg * 7 / 10000,
      });
    if (!dryRun) await deps.logger.log("act", "tier_push_fee_reduction", { newTakerBps: safeRate });

    await this.tryReferralCode(deps, actions, dryRun, "TIERPUSH", 0.25, 0.30, "aggressive referral code for tier push");

    await this.tryCampaign(deps, actions, dryRun, {
      name: `Tier Push — ${tp.currentTier} → ${tp.nextTier}`,
      description: `Help us unlock better rates for everyone! Volume race to reach ${tp.nextTier} tier.`,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      type: "volume_race",
      config: { targetVolume: tp.volumeToNext },
    }, "tier push volume race campaign");

    const inviteesNeeded = inviteesNeededForTier(tp.volumeToNext, 20_000_000);
    actions.push(this.action("advisory", `Distributor recruitment: ~${inviteesNeeded} new builders at $20M/mo would close the volume gap`, {
      inviteesNeeded, volumeGap: tp.volumeToNext,
    }));

    if (tp.stakingToNext > 0) {
      actions.push(this.action("advisory", `Staking path: stake ${tp.stakingToNext.toLocaleString()} more $ORDER for immediate tier upgrade`, {
        stakingGap: tp.stakingToNext, annualMarginGain: tp.annualMarginGain,
      }));
    }

    return this.result(true, actions, dryRun);
  }
}
