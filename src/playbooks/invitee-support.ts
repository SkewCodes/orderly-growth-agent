import { Playbook, type PlaybookDeps } from "./base.js";
import type { PlaybookContext, ActionResult, ActionEntry } from "../types.js";
import { canAssignTier } from "../economics/tiers.js";

export class InviteeSupportPlaybook extends Playbook {
  readonly name = "INVITEE_SUPPORT" as const;

  protected async plan(ctx: PlaybookContext, deps: PlaybookDeps, dryRun: boolean): Promise<ActionResult> {
    const actions: ActionEntry[] = [];
    const tier = ctx.metrics.tierProgression.currentTier;
    const prefix = dryRun ? "[DRY-RUN] " : "";

    const volumeTrend = ctx.metrics.volume.volumeTrend;
    if (volumeTrend < 0.8) {
      actions.push(this.action("advisory",
        `${prefix}Volume decline is market-wide (your own DEX also declining) — invitee decline may not be specific to them`,
        { ownVolumeTrend: volumeTrend },
      ));
    }

    if (canAssignTier(tier, "SILVER")) {
      actions.push(this.action("advisory",
        `${prefix}You can assign Silver pricing to struggling invitees — gives them more margin for their own campaigns`,
        { canAssign: true, assignableTier: "SILVER" },
      ));
    }

    actions.push(this.action("advisory",
      `${prefix}Recommend: share orderly-growth-agent skill with invitees — it will run their growth loop for them. If they succeed, you succeed.`,
    ));

    actions.push(this.action("advisory",
      `${prefix}Consider joint campaigns: your campaign infrastructure + their user base. Cost-share the prize pool, both benefit from volume.`,
    ));

    if (["GOLD", "PLATINUM", "DIAMOND"].includes(tier)) {
      actions.push(this.action("advisory",
        `${prefix}At your tier, you can leverage Orderly co-marketing benefits FOR the invitee — a rising tide lifts all boats (and all volume counts toward your aggregate).`,
        { tier, marketingAvailable: true },
      ));
    }

    await deps.logger.log("act", "invitee_support", {
      dryRun, tier,
      inviteeCount: ctx.metrics.distributor.inviteeCount,
      inviteeUtilization: ctx.metrics.distributor.inviteeUtilization,
    });

    return this.result(true, actions, dryRun);
  }
}
