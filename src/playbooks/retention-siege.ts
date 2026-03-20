import { Playbook, type PlaybookDeps } from "./base.js";
import type { PlaybookContext, ActionResult, ActionEntry } from "../types.js";
import { getTierDefinition } from "../economics/tiers.js";

export class RetentionSiegePlaybook extends Playbook {
  readonly name = "RETENTION_SIEGE" as const;

  protected async plan(ctx: PlaybookContext, deps: PlaybookDeps, dryRun: boolean): Promise<ActionResult> {
    const actions: ActionEntry[] = [];
    const tier = ctx.metrics.tierProgression.currentTier;
    const baseBps = getTierDefinition(tier).cryptoBaseBps;
    const defaultMargin = ctx.metrics.revenue.marginBps;

    const comebackTakerBps = baseBps + (defaultMargin * 0.5);
    actions.push(this.action("advisory",
      `Comeback fee: ${comebackTakerBps.toFixed(2)} bps taker (base + 50% margin) for returning users`,
      { comebackTakerBps, durationDays: 7 },
    ));

    await this.tryQuests(deps, actions, dryRun, [
      { name: "Comeback Trade", type: "first_trade", xpReward: 150, target: 1, durationDays: 7 },
      { name: "7-Day Streak", type: "streak", xpReward: 500, target: 7, durationDays: 14 },
      { name: "Refer a Friend", type: "refer_friend", xpReward: 200, target: 1, durationDays: 30 },
    ], "retention quests: Comeback Trade (150 XP), 7-Day Streak (500 XP), Refer a Friend (200 XP)");

    await this.tryCompetition(deps, actions, dryRun,
      { name: "Consistency Challenge", type: "streak", durationDays: 14, prizePool: { xp: 5000 } },
      "streak leaderboard competition (14d)");

    actions.push(this.action("advisory",
      `Dormant users: ${ctx.metrics.users.dormantUsers}. Segment: High-value (>$1M) → personal outreach, Mid ($100K-$1M) → campaign target, Low (<$100K) → promo code`,
      { dormantUsers: ctx.metrics.users.dormantUsers, churnRate: ctx.metrics.users.churnRate },
    ));

    await deps.logger.log("act", "retention_siege", { dryRun, tier, churnRate: ctx.metrics.users.churnRate });
    return this.result(true, actions, dryRun);
  }
}
