import type { Decision, ActionResult, CollectedMetrics, GrowthState, GrowthConfig, PlaybookContext } from "../types.js";
import type { TradingClient } from "../api/trading-client.js";
import type { SocialClient } from "../api/social-client.js";
import type { AuditLogger } from "../logger.js";
import { getPlaybook } from "../playbooks/index.js";

/**
 * ACT phase: execute selected playbooks.
 * Runs each decision's playbook in sequence (not parallel) to avoid conflicting actions.
 */
export async function act(
  decisions: Decision[],
  metrics: CollectedMetrics,
  state: GrowthState,
  config: GrowthConfig,
  trading: TradingClient,
  social: SocialClient | null,
  logger: AuditLogger,
): Promise<ActionResult[]> {
  const results: ActionResult[] = [];

  for (const decision of decisions) {
    await logger.log("act", `executing_playbook`, {
      playbook: decision.playbook,
      trigger: decision.trigger.code,
      dryRun: config.dryRun,
    });

    const playbook = getPlaybook(decision.playbook);
    const context: PlaybookContext = {
      metrics,
      state,
      config,
      diagnosis: decision.trigger,
      dryRun: config.dryRun,
    };

    try {
      const result = await playbook.run(context, { trading, social, logger });
      results.push(result);

      await logger.log("act", `playbook_complete`, {
        playbook: decision.playbook,
        success: result.success,
        actionsCount: result.actions.length,
        dryRun: result.dryRun,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      results.push({
        playbook: decision.playbook,
        success: false,
        dryRun: config.dryRun,
        actions: [],
        error: errorMsg,
      });

      await logger.error("act", `Playbook ${decision.playbook} failed: ${errorMsg}`);
    }
  }

  return results;
}
