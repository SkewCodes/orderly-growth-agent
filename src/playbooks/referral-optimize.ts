import { Playbook, type PlaybookDeps } from "./base.js";
import type { PlaybookContext, ActionResult, ActionEntry } from "../types.js";

export class ReferralOptimizePlaybook extends Playbook {
  readonly name = "REFERRAL_OPTIMIZE" as const;

  protected async plan(ctx: PlaybookContext, deps: PlaybookDeps, dryRun: boolean): Promise<ActionResult> {
    const actions: ActionEntry[] = [];

    if (dryRun) {
      return this.result(true, [
        this.action("advisory", `[DRY-RUN] Would audit ${ctx.metrics.referrals.totalCodes} referral codes`),
        this.action("advisory", "[DRY-RUN] Would optimize: deactivate <5% conversion, upgrade >15% to KOL tier"),
        this.action("advisory", "Referral tiers: Standard (20/10), KOL (30/20), Whale (40/15), Promo (25/30 14d max)"),
      ], true);
    }

    let adminInfo;
    try {
      adminInfo = await deps.trading.getReferralAdminInfo(ctx.config.brokerId);
    } catch (err) {
      return this.result(false, [this.action("advisory", "Failed to fetch referral admin info", {}, { error: String(err) })], false, String(err));
    }

    const codes = adminInfo.codes;
    let deactivated = 0;
    let upgraded = 0;

    for (const code of codes) {
      const conversion = code.total_referees > 0 ? code.total_referees : 0;
      if (conversion < 5) {
        actions.push(this.action("advisory", `Code "${code.referral_code}": low conversion — consider deactivating`, {
          code: code.referral_code, referees: code.total_referees,
        }));
        deactivated++;
      } else if (conversion >= 15) {
        actions.push(this.action("advisory", `Code "${code.referral_code}": high performer — upgrade to KOL tier (30/20)`, {
          code: code.referral_code, referees: code.total_referees,
        }));
        upgraded++;
      }
    }

    actions.push(this.action("advisory",
      `Referral audit: ${codes.length} codes. ${deactivated} low-performing, ${upgraded} high-performing. Tiers: Standard (20/10), KOL (30/20), Whale (40/15), Promo (25/30 14d max)`,
      { totalCodes: codes.length, deactivated, upgraded },
    ));

    actions.push(this.action("advisory",
      "Referred BUILDER volume counts toward aggregate tier volume. Builder recruitment via distributor programme is the highest-leverage referral action.",
    ));

    await deps.logger.log("act", "referral_optimize", { codesAudited: codes.length, deactivated, upgraded });
    return this.result(true, actions, false);
  }
}
