import type { AccountRiskScore, EnforcementResult, WatchdogConfig, WatchdogState } from "../types.js";
import type { TradingClient } from "../../api/trading-client.js";
import type { AuditLogger } from "../../logger.js";
import { getTierForScore } from "./tiers.js";
import { executeAction, type ActionContext } from "./actions.js";
import { appendEnforcementEntry } from "../state.js";

/**
 * ENFORCE phase: apply graduated enforcement actions based on risk scores.
 */
export async function enforce(
  scores: AccountRiskScore[],
  state: WatchdogState,
  config: WatchdogConfig,
  trading: TradingClient,
  logger: AuditLogger,
): Promise<EnforcementResult[]> {
  const results: EnforcementResult[] = [];
  const ctx: ActionContext = {
    trading,
    logger,
    dryRun: config.dryRun || !config.enforcementEnabled,
  };

  let escalationCount = 0;

  for (const score of scores) {
    const tierDef = getTierForScore(score.totalScore);

    // Skip CLEAN accounts
    if (tierDef.tier === "CLEAN") continue;

    // Cap escalations per cycle
    if (tierDef.tier === "ESCALATE") {
      if (escalationCount >= config.maxEscalationsPerCycle) {
        await logger.log("watchdog/enforce", "escalation_capped", {
          accountId: score.accountId,
          score: score.totalScore,
          maxEscalations: config.maxEscalationsPerCycle,
        });
        continue;
      }
      escalationCount++;
    }

    // Get previous enforcement tier for this account
    const previousRisk = state.flaggedAccounts[score.accountId];
    const previousTier = previousRisk?.tier ?? null;

    // Execute all actions for this enforcement tier
    const actions = [];
    for (const actionType of tierDef.actions) {
      const action = await executeAction(actionType, score, ctx);
      actions.push(action);
    }

    const result: EnforcementResult = {
      accountId: score.accountId,
      tier: tierDef.tier,
      previousTier,
      actions,
    };
    results.push(result);

    // Record in enforcement history
    appendEnforcementEntry(state, {
      timestamp: new Date().toISOString(),
      accountId: score.accountId,
      tier: tierDef.tier,
      actions,
      riskScore: score.totalScore,
    });

    // Update flagged accounts in state
    state.flaggedAccounts[score.accountId] = score;
  }

  // Clean up accounts that dropped to CLEAN
  for (const accountId of Object.keys(state.flaggedAccounts)) {
    const currentScore = scores.find((s) => s.accountId === accountId);
    if (!currentScore || currentScore.totalScore <= 20) {
      delete state.flaggedAccounts[accountId];
    }
  }

  return results;
}
