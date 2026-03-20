import { Detector, type ScanDataIndex } from "./base.js";
import type { ScanData, WatchdogConfig, HeuristicMatch } from "../types.js";

/**
 * Detector 7: Staking Tier Gaming
 * 2 heuristics: stake-unstake cycling, flash staking
 */
export class StakingTierDetector extends Detector {
  readonly name = "STAKING_TIER" as const;
  readonly heuristics = ["staking:stake_cycling", "staking:flash_stake"];

  protected runChecks(_data: ScanData, config: WatchdogConfig, idx: ScanDataIndex): HeuristicMatch[] {
    return [
      ...this.checkStakeCycling(config, idx),
      ...this.checkFlashStake(config, idx),
    ];
  }

  private checkStakeCycling(config: WatchdogConfig, idx: ScanDataIndex): HeuristicMatch[] {
    const minCycles = this.getThreshold("staking_min_cycles", 2, config);
    const matches: HeuristicMatch[] = [];

    for (const [accountId, events] of idx.stakingByAccount) {
      let cycles = 0;
      for (let i = 0; i < events.length - 1; i++) {
        if (events[i].action === "stake" && events[i + 1].action === "unstake") {
          cycles++;
        }
      }

      if (cycles >= minCycles) {
        matches.push(this.match(
          "staking:stake_cycling", accountId,
          Math.min(1, cycles / (minCycles * 2)),
          { cycles, events: events.length, minCycles },
          `Account ${accountId} completed ${cycles} stake-unstake cycles`,
        ));
      }
    }

    return matches;
  }

  private checkFlashStake(config: WatchdogConfig, idx: ScanDataIndex): HeuristicMatch[] {
    const maxDurationDays = this.getThreshold("staking_flash_max_days", 7, config);
    const maxDurationMs = maxDurationDays * 24 * 60 * 60 * 1000;
    const matches: HeuristicMatch[] = [];

    for (const [accountId, events] of idx.stakingByAccount) {
      for (let i = 0; i < events.length - 1; i++) {
        if (events[i].action === "stake" && events[i + 1].action === "unstake") {
          const duration = events[i + 1].timestamp - events[i].timestamp;
          if (duration < maxDurationMs && duration > 0) {
            const durationDays = duration / (24 * 60 * 60 * 1000);
            matches.push(this.match(
              "staking:flash_stake", accountId,
              Math.min(1, (maxDurationDays - durationDays) / maxDurationDays),
              { stakeDurationMs: duration, stakeDurationDays: durationDays.toFixed(1), stakeAmount: events[i].amount, maxDurationDays },
              `Account ${accountId} staked for only ${durationDays.toFixed(1)} days (threshold: ${maxDurationDays}d)`,
            ));
          }
        }
      }
    }

    return matches;
  }
}
