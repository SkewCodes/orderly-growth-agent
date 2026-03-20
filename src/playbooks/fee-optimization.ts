import { Playbook, type PlaybookDeps } from "./base.js";
import type { PlaybookContext, ActionResult, ActionEntry } from "../types.js";
import { calcUserFeeTier, bpsToRate } from "../economics/fees.js";

export class FeeOptimizationPlaybook extends Playbook {
  readonly name = "FEE_OPTIMIZATION" as const;

  protected async plan(ctx: PlaybookContext, deps: PlaybookDeps, dryRun: boolean): Promise<ActionResult> {
    const actions: ActionEntry[] = [];
    const tier = ctx.metrics.tierProgression.currentTier;

    if (dryRun) {
      return this.result(true, [
        this.action("fee_change", `[DRY-RUN] Would re-tier all users based on ${tier} base fee`),
        this.action("advisory", "Fee tiers: MM_TIER / VIP_PLATINUM / VIP_GOLD / TIER_3 / TIER_2 / STANDARD + staking bonuses"),
      ], true);
    }

    let users;
    try {
      users = await deps.trading.getUserFeeRates();
    } catch (err) {
      return this.result(false, [this.action("fee_change", "Failed to fetch user fee rates", {}, { error: String(err) })], false, String(err));
    }

    let updated = 0;
    const batches: Map<string, string[]> = new Map();

    for (const user of users) {
      const recommended = calcUserFeeTier(tier, { volume30d: 0 });
      const makerRate = bpsToRate(recommended.makerBps);
      const takerRate = bpsToRate(recommended.takerBps);
      const key = `${makerRate}|${takerRate}`;
      if (!batches.has(key)) batches.set(key, []);
      batches.get(key)!.push(user.account_id);
      updated++;
    }

    for (const [key, accountIds] of batches) {
      const [maker, taker] = key.split("|").map(Number);
      try {
        await deps.trading.setUserFeeRate(accountIds, maker, taker);
        actions.push(this.action("fee_change",
          `Updated ${accountIds.length} users to maker=${(maker * 10000).toFixed(2)}bps / taker=${(taker * 10000).toFixed(2)}bps`,
          { count: accountIds.length, makerRate: maker, takerRate: taker },
        ));
      } catch (err) {
        actions.push(this.action("fee_change", `Failed to update batch of ${accountIds.length} users`, {}, { error: String(err) }));
      }
    }

    actions.push(this.action("advisory", `Fee optimization complete: ${updated} users evaluated across ${batches.size} tiers`, {
      totalUsers: updated, tierCount: batches.size,
    }));

    await deps.logger.log("act", "fee_optimization", { tier, usersEvaluated: updated });
    return this.result(true, actions, false);
  }
}
