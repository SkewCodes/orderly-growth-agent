import type { TradingClient } from "../api/trading-client.js";
import type { SocialClient } from "../api/social-client.js";
import type { PlaybookContext, ActionResult, ActionEntry, PlaybookName } from "../types.js";
import type { AuditLogger } from "../logger.js";
import type { QuestCreateParams, CompetitionCreateParams, CampaignCreateParams } from "../api/types.js";

export interface PlaybookDeps {
  trading: TradingClient;
  social: SocialClient | null;
  logger: AuditLogger;
}

export abstract class Playbook {
  abstract readonly name: PlaybookName;

  async run(ctx: PlaybookContext, deps: PlaybookDeps): Promise<ActionResult> {
    return this.plan(ctx, deps, ctx.dryRun);
  }

  protected abstract plan(ctx: PlaybookContext, deps: PlaybookDeps, dryRun: boolean): Promise<ActionResult>;

  protected result(success: boolean, actions: ActionEntry[], dryRun: boolean, error?: string): ActionResult {
    return { playbook: this.name, success, dryRun, actions, error };
  }

  protected action(
    type: ActionEntry["type"],
    description: string,
    params: Record<string, unknown> = {},
    result?: Record<string, unknown>,
  ): ActionEntry {
    return { type, description, params, result };
  }

  protected dateStr(): string {
    return new Date().toISOString().split("T")[0].replace(/-/g, "");
  }

  protected async tryReferralCode(
    deps: PlaybookDeps, actions: ActionEntry[], dryRun: boolean,
    prefix: string, referrerRebate: number, refereeDiscount: number, desc: string,
  ): Promise<void> {
    const code = `${prefix}_${this.dateStr()}`;
    if (dryRun) {
      actions.push(this.action("referral_create", `[DRY-RUN] Would create ${desc}`, { referrerRebate, refereeDiscount }));
      return;
    }
    try {
      await deps.trading.createReferralCode(code, referrerRebate, refereeDiscount);
      actions.push(this.action("referral_create", `Created ${desc}`, { code, referrerRebate, refereeDiscount }));
    } catch (err) {
      actions.push(this.action("referral_create", "Failed to create referral code", {}, { error: String(err) }));
    }
  }

  protected async tryFeeChange(
    deps: PlaybookDeps, actions: ActionEntry[], dryRun: boolean,
    makerRate: number, takerRate: number, desc: string, extra: Record<string, unknown> = {},
  ): Promise<void> {
    if (dryRun) {
      actions.push(this.action("fee_change", `[DRY-RUN] ${desc}`, extra));
      return;
    }
    try {
      await deps.trading.setDefaultFeeRate(makerRate, takerRate);
      actions.push(this.action("fee_change", desc, extra));
    } catch (err) {
      actions.push(this.action("fee_change", "Failed to change fees", {}, { error: String(err) }));
    }
  }

  protected async tryCampaign(
    deps: PlaybookDeps, actions: ActionEntry[], dryRun: boolean,
    params: CampaignCreateParams, desc: string,
  ): Promise<void> {
    if (!deps.social) return;
    if (dryRun) {
      actions.push(this.action("campaign_create", `[DRY-RUN] Would create ${desc}`));
      return;
    }
    try {
      const campaign = await deps.social.createCampaign(params);
      actions.push(this.action("campaign_create", `Created ${desc}`, { campaignId: campaign.id }));
    } catch (err) {
      actions.push(this.action("campaign_create", "Failed to create campaign", {}, { error: String(err) }));
    }
  }

  protected async tryQuests(
    deps: PlaybookDeps, actions: ActionEntry[], dryRun: boolean,
    quests: QuestCreateParams[], desc: string,
  ): Promise<void> {
    if (!deps.social) return;
    if (dryRun) {
      actions.push(this.action("quest_create", `[DRY-RUN] Would create ${desc}`));
      return;
    }
    try {
      for (const q of quests) await deps.social.createQuest(q);
      actions.push(this.action("quest_create", `Created ${desc}`, { quests: quests.length }));
    } catch (err) {
      actions.push(this.action("quest_create", "Failed to create quests", {}, { error: String(err) }));
    }
  }

  protected async tryCompetition(
    deps: PlaybookDeps, actions: ActionEntry[], dryRun: boolean,
    params: CompetitionCreateParams, desc: string,
  ): Promise<void> {
    if (!deps.social) return;
    if (dryRun) {
      actions.push(this.action("competition_create", `[DRY-RUN] Would create ${desc}`));
      return;
    }
    try {
      await deps.social.createCompetition(params);
      actions.push(this.action("competition_create", `Created ${desc}`, {}));
    } catch (err) {
      actions.push(this.action("competition_create", "Failed to create competition", {}, { error: String(err) }));
    }
  }
}
