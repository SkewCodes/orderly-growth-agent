import { Playbook, type PlaybookDeps } from "./base.js";
import type { PlaybookContext, ActionResult, ActionEntry } from "../types.js";
import { recommendInviteeAssignment, estimateInviteeRevenue, inviteesNeededForTier } from "../economics/distributor.js";

export class DistributorGrowthPlaybook extends Playbook {
  readonly name = "DISTRIBUTOR_GROWTH" as const;

  protected async plan(ctx: PlaybookContext, deps: PlaybookDeps, dryRun: boolean): Promise<ActionResult> {
    const actions: ActionEntry[] = [];
    const tp = ctx.metrics.tierProgression;
    const tier = tp.currentTier;

    const assignment = recommendInviteeAssignment(tier);
    if (assignment) {
      actions.push(this.action("advisory",
        `Tier assignment available: offer ${assignment.assignTier} pricing to invitees (spread: ${assignment.spreadBps} bps). Pitch: "${assignment.pitch}"`,
        { assignTier: assignment.assignTier, spreadBps: assignment.spreadBps },
      ));
    }

    const revenuePerInvitee = estimateInviteeRevenue(tier, "PUBLIC", 10_000_000);
    actions.push(this.action("advisory",
      `Each PUBLIC invitee at $10M/mo = $${revenuePerInvitee.toFixed(0)}/yr in distributor revenue`,
      { revenuePerInvitee, assumedMonthlyVolume: 10_000_000 },
    ));

    if (tp.nextTier && tp.volumeToNext > 0) {
      const needed = inviteesNeededForTier(tp.volumeToNext, 10_000_000);
      actions.push(this.action("advisory",
        `${needed} invitees at $10M/mo would close the ${tp.volumeToNext.toLocaleString()} volume gap to ${tp.nextTier}`,
        { inviteesNeeded: needed, volumeGap: tp.volumeToNext },
      ));
    }

    actions.push(this.action("advisory",
      "Target segments: (1) Communities with trading audiences but no DEX, (2) Projects on other infra considering migration, (3) AI agent developers needing execution infra, (4) Existing Orderly builders who could refer others",
      { segments: ["community_dex", "migration", "ai_agents", "recursive_referral"] },
    ));

    await this.tryReferralCode(deps, actions, dryRun, "DIST", 0.20, 0.25, "distributor recruitment referral code");

    await deps.logger.log("act", "distributor_growth", { dryRun, tier, inviteeCount: ctx.metrics.distributor.inviteeCount });
    return this.result(true, actions, dryRun);
  }
}
