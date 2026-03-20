# Orderly Growth Agent

Autonomous growth agent for [Orderly Network](https://orderly.network) DEXs. Runs a daily loop that collects metrics, diagnoses problems, executes playbooks, deploys campaigns, adjusts fees, and reports results.

A builder launches a DEX, installs this agent, and wakes up to a growth team that never sleeps.

## Why This Exists

Orderly builders keep **100% of fees above the base fee**. That base fee drops from 3 bps to 1 bps as volume and `$ORDER` staking increase through the Builder Staking Programme. At Diamond tier, a builder charging users 5 bps on a 1 bps base keeps 4 bps per trade.

This agent maximizes that margin at every tier — automatically.

## Architecture

```
MEASURE → WATCHDOG → COLLECT → DIAGNOSE → DECIDE → ACT → REPORT → SAVE
```

| Phase | What it does |
|-------|-------------|
| **Measure** | ROI of previous playbook runs |
| **Watchdog** | Abuse detection (wash trading, sybil, referral fraud, etc.) |
| **Collect** | Volume, revenue, users, referrals, staking, campaigns |
| **Diagnose** | Map metrics to diagnostic codes (volume decline, churn, etc.) |
| **Decide** | Select up to N playbooks ranked by estimated impact |
| **Act** | Execute playbooks: fee changes, referral codes, campaigns, quests |
| **Report** | Generate markdown scorecard with actions taken |

### Playbooks

| Playbook | Trigger | Actions |
|----------|---------|---------|
| `TIER_PUSH` | Near next tier threshold | Aggressive fee reduction + referral code + volume race campaign |
| `DISTRIBUTOR_GROWTH` | Low invitee count | Distributor recruitment referral + tier assignment advisory |
| `INVITEE_SUPPORT` | Invitee volume declining | Tier assignment + joint campaign advisory |
| `VOLUME_RECOVERY` | 7d volume < 70% of 30d avg | Fee reduction + comeback code + volume blitz + quests |
| `FEE_OPTIMIZATION` | Revenue compression | Re-tier all users based on volume/staking profiles |
| `RETENTION_SIEGE` | Churn rate > 30% | Comeback quests + streak competition + dormant user segmentation |
| `LIQUIDITY_BOOST` | Maker ratio < 20% | Maker rebate + maker volume quest + MM recruitment |
| `ACQUISITION_PUSH` | New users below target | Onboarding quest sprint + new trader leaderboard |
| `REFERRAL_OPTIMIZE` | Low referral conversion | Audit codes, deactivate underperformers, upgrade KOLs |

### Watchdog Detectors

7 detectors with 29 heuristics for abuse detection:

- **Wash Trading** — net position zero, concentrated counterparty, reciprocal trades, rapid roundtrip, low PnL/high volume, temporal clustering, pattern repetition
- **Sybil Accounts** — common funding, registration burst, behavioral clone, common destination, discount recycling
- **Distributor Gaming** — self-referral, shell invitee, volume cycling, tier assignment abuse
- **Campaign Exploit** — dust streaks, speed-running, PnL manipulation, referral quest sybil, social bot farming
- **Maker Rebate Farming** — spoof-and-cancel, maker-taker collusion, layering
- **Referral Fraud** — circular referrals, inactive referees, self-referral drain
- **Staking Tier Gaming** — stake-unstake cycling, flash staking

## Quick Start

### Prerequisites

- Node.js >= 20
- [Orderly CLI](https://www.npmjs.com/package/@orderly.network/cli) (`npm install -g @orderly.network/cli`)

### Install

```bash
git clone https://github.com/SkewCodes/orderly-growth-agent.git
cd orderly-growth-agent
npm install
npm run build
```

### Configure

Create `~/.orderly/growth-agent/config.json`:

```json
{
  "brokerId": "<your-broker-id>",
  "brokerName": "My DEX",
  "network": "mainnet",
  "dryRun": true
}
```

### Run

```bash
# Dry run (default) — full loop, no API writes
npx orderly-growth

# Single phase
npx orderly-growth --phase collect
npx orderly-growth --phase diagnose
npx orderly-growth --phase watchdog

# Live execution
npx orderly-growth --live
```

### Cron (recommended)

```bash
# Daily at 06:00 UTC
0 6 * * * cd /path/to/orderly-growth-agent && npx orderly-growth --live
```

## Configuration

All fields except `brokerId` have defaults:

| Field | Default | Description |
|-------|---------|-------------|
| `brokerId` | *required* | Your Orderly broker ID |
| `brokerName` | `"My DEX"` | Display name in reports |
| `network` | `"mainnet"` | `"mainnet"` or `"testnet"` |
| `dryRun` | `true` | Dry-run mode — no API writes |
| `builderTier` | `"auto"` | Override auto-detected tier |
| `maxPlaybooksPerCycle` | `2` | Max playbooks per daily run (1-5) |
| `enabledPlaybooks` | all 9 | Array of playbook names to enable |
| `socialApiKeyRef` | — | Social SDK API key for campaigns/quests |
| `watchdog.enabled` | `false` | Enable abuse detection |
| `watchdog.dryRun` | `true` | Watchdog dry-run mode |
| `watchdog.enforcementEnabled` | `false` | Enable automated enforcement |

## File Locations

| File | Path |
|------|------|
| Config | `~/.orderly/growth-agent/config.json` |
| State | `~/.orderly/growth-agent/state.json` |
| Audit log | `~/.orderly/growth-agent/audit.jsonl` |
| Reports | `~/.orderly/growth-agent/reports/` |

## Development

```bash
npm run dev          # Watch mode
npm test             # Run tests
npm run test:watch   # Watch tests
npm run build        # Production build
npm run lint         # Lint
```

## Tech Stack

- **TypeScript 5.5** with ESM modules
- **Zod** for runtime config/state validation
- **Vitest** for testing (101 tests)
- Zero runtime dependencies beyond Zod

## License

MIT
