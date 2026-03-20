import { Playbook, type PlaybookDeps } from "./base.js";
import type { PlaybookContext, ActionResult, ActionEntry } from "../types.js";
import { getTierDefinition } from "../economics/tiers.js";

export class AcquisitionPushPlaybook extends Playbook {
  readonly name = "ACQUISITION_PUSH" as const;

  protected async plan(ctx: PlaybookContext, deps: PlaybookDeps, dryRun: boolean): Promise<ActionResult> {
    const actions: ActionEntry[] = [];
    const tier = ctx.metrics.tierProgression.currentTier;
    const baseBps = getTierDefinition(tier).cryptoBaseBps;
    const defaultMargin = ctx.metrics.revenue.marginBps;

    const newUserTakerBps = baseBps + (defaultMargin * 0.5);
    actions.push(this.action("advisory",
      `New user promo fee: ${newUserTakerBps.toFixed(2)} bps taker for first 7 days`,
      { newUserTakerBps, durationDays: 7 },
    ));

    await this.tryReferralCode(deps, actions, dryRun, "NEWUSER", 0.25, 0.30, "aggressive new user referral code (30% referee / 25% referrer)");

    await this.tryQuests(deps, actions, dryRun, [
      { name: "First Trade", type: "first_trade", xpReward: 100, target: 1, durationDays: 7 },
      { name: "Deposit $100", type: "deposit", xpReward: 100, target: 100, durationDays: 7 },
      { name: "Trade 3 Markets", type: "volume_target", xpReward: 150, target: 3, durationDays: 14 },
      { name: "Share PnL", type: "share_pnl", xpReward: 50, target: 1, durationDays: 30 },
    ], "onboarding sprint: First Trade (100 XP), Deposit $100 (100 XP), Trade 3 Markets (150 XP), Share PnL (50 XP)");

    await this.tryCompetition(deps, actions, dryRun,
      { name: "New Trader Leaderboard", type: "volume", durationDays: 7, prizePool: { xp: 3000 } },
      "weekly new trader volume leaderboard");

    actions.push(this.action("advisory",
      `Target: first_trade_latency <24h, 7d_activation >40%. Current new users 7d: ${ctx.metrics.users.newUsers7d}`,
      { newUsers7d: ctx.metrics.users.newUsers7d, weeklyTarget: ctx.config.operatorTargets.monthlyNewUsers / 4 },
    ));

    await deps.logger.log("act", "acquisition_push", { dryRun, tier, newUsers7d: ctx.metrics.users.newUsers7d });
    return this.result(true, actions, dryRun);
  }
}
