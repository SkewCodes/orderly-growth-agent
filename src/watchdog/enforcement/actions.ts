import type { TradingClient } from "../../api/trading-client.js";
import type { AuditLogger } from "../../logger.js";
import type { EnforcementAction, EnforcementActionType, AccountRiskScore } from "../types.js";

export interface ActionContext {
  trading: TradingClient;
  logger: AuditLogger;
  dryRun: boolean;
}

/**
 * Execute a single enforcement action.
 * Returns the action with executed=true if successful.
 */
export async function executeAction(
  actionType: EnforcementActionType,
  score: AccountRiskScore,
  ctx: ActionContext,
): Promise<EnforcementAction> {
  const action: EnforcementAction = {
    type: actionType,
    accountId: score.accountId,
    description: "",
    params: {},
    executed: false,
    dryRun: ctx.dryRun,
  };

  switch (actionType) {
    case "monitor_flag":
      action.description = `Flagged account ${score.accountId} for monitoring (score: ${score.totalScore})`;
      action.executed = true; // monitoring is just a state flag, always succeeds
      break;

    case "campaign_exclude":
      action.description = `Excluded account ${score.accountId} from campaign eligibility`;
      action.params = { accountId: score.accountId, reason: "watchdog_risk_score", score: score.totalScore };
      action.executed = true; // campaign exclusion is enforced via state, not API
      break;

    case "tier_block":
      action.description = `Blocked tier promotions for account ${score.accountId}`;
      action.params = { accountId: score.accountId, reason: "watchdog_risk_score", score: score.totalScore };
      action.executed = true; // tier block is enforced via state
      break;

    case "fee_reset":
      action.description = `Reset fee tier to default for account ${score.accountId}`;
      action.params = { accountId: score.accountId };
      if (!ctx.dryRun) {
        try {
          // Reset to null rates (revert to broker default)
          await ctx.trading.setUserFeeRate([score.accountId], 0, 0);
          action.executed = true;
        } catch (err) {
          action.description += ` — FAILED: ${err instanceof Error ? err.message : String(err)}`;
        }
      } else {
        action.executed = true;
      }
      break;

    case "code_deactivate":
      action.description = `Flagged referral codes for deactivation on account ${score.accountId}`;
      action.params = { accountId: score.accountId, reason: "watchdog_risk_score" };
      // Referral code deactivation may not have a direct API; flag in state for operator
      action.executed = true;
      break;

    case "escalate_alert":
      action.description = `ESCALATION: Account ${score.accountId} flagged for Orderly review (score: ${score.totalScore})`;
      action.params = {
        accountId: score.accountId,
        score: score.totalScore,
        detectors: Object.keys(score.matchesByDetector),
        requiresOperatorApproval: true,
      };
      action.executed = true; // escalation is a report flag, not an API call
      break;
  }

  await ctx.logger.log("watchdog/enforce", action.type, {
    accountId: score.accountId,
    score: score.totalScore,
    tier: score.tier,
    dryRun: ctx.dryRun,
    executed: action.executed,
  });

  return action;
}
