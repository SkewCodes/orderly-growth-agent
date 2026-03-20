# Orderly Growth Agent

**An [OtterClaw](https://github.com/SkewCodes/OtterClaw)-compatible skill** by [OtterClaw](https://github.com/SkewCodes)

Autonomous growth engine for [Orderly Network](https://orderly.network) DEXs. Runs a daily loop that collects metrics, diagnoses problems, executes playbooks, deploys campaigns, adjusts fees, detects abuse, and reports results.

Launch a DEX. Install this skill. Wake up to a growth team that never sleeps.

---

## Install

### For Agents (OtterClaw)

Paste the SKILL.md link to any OtterClaw-compatible agent:

```
"Install this skill: https://github.com/SkewCodes/orderly-growth-agent/blob/master/SKILL.md"
```

The SKILL.md frontmatter conforms to the [OtterClaw schema](https://github.com/SkewCodes/OtterClaw/blob/main/schema/skill.schema.json). Compatible with OpenClaw, SeekerClaw, Starchild, and any agent that reads SKILL.md files.

**Requires:** [`orderly-onboarding`](https://github.com/SkewCodes/OtterClaw/blob/main/skills/orderly-onboarding/SKILL.md) + [`orderly-dex-builder`](https://github.com/SkewCodes/OtterClaw/blob/main/skills/orderly-dex-builder/SKILL.md)

### For Developers

```bash
git clone https://github.com/SkewCodes/orderly-growth-agent.git
cd orderly-growth-agent
npm install
npm run build
```

Requires Node.js >= 20 and [Orderly CLI](https://www.npmjs.com/package/@orderly.network/cli).

---

## How It Works

```
MEASURE → WATCHDOG → COLLECT → DIAGNOSE → DECIDE → ACT → REPORT → SAVE
```

| Phase | What It Does |
|-------|-------------|
| **Measure** | ROI of previous playbook runs — verdict: REPEAT / MODIFY / RETIRE |
| **Watchdog** | 7 abuse detectors, 29 heuristics, risk scoring, tiered enforcement |
| **Collect** | Volume, revenue, users, referrals, staking, campaigns, tier progression |
| **Diagnose** | 10 diagnostic codes with severity and priority ranking |
| **Decide** | Select up to N playbooks ranked by estimated impact |
| **Act** | Execute playbooks: fee changes, referral codes, campaigns, quests |
| **Report** | Markdown scorecard with actions taken, tier advisory, alerts |

---

## Why This Exists

Orderly builders keep **100% of fees above the base fee**. That base fee drops from 3 bps to 1 bps as volume and `$ORDER` staking increase:

| Tier | Crypto Base | Margin at 5 bps | You Keep |
|------|------------|-----------------|----------|
| PUBLIC | 3.00 bps | 2.00 bps | 40% |
| SILVER | 2.75 bps | 2.25 bps | 45% |
| GOLD | 2.50 bps | 2.50 bps | 50% |
| PLATINUM | 2.00 bps | 3.00 bps | 60% |
| DIAMOND | 1.00 bps | 4.00 bps | 80% |

A Diamond builder earns **2x the margin** of a Public builder on identical volume. This agent maximizes that margin at every tier.

**What Hyperliquid builders cannot get:** per-user fee control, referral API, campaign SDK, staking-linked base fee reduction, distributor programme, tier progression. This skill is the competitive moat.

---

## Playbooks

9 playbooks covering fee operations (Trading API) and campaign actions (Social SDK). All fee math is relative to your builder tier base fee.

| Playbook | Trigger | Actions |
|----------|---------|---------|
| **TIER_PUSH** | Near next tier threshold | Fee reduction + referral codes + volume race + staking advisory |
| **DISTRIBUTOR_GROWTH** | Low invitee count | Recruitment referral + tier assignment advisory + revenue projections |
| **INVITEE_SUPPORT** | Invitee volume declining | Tier assignment + joint campaign advisory + growth agent sharing |
| **VOLUME_RECOVERY** | 7d vol < 70% of 30d avg | Comeback code + volume blitz + streak quests |
| **FEE_OPTIMIZATION** | Revenue compression | Re-tier all users across 6 tiers with staking bonuses |
| **RETENTION_SIEGE** | Churn > 30% | Comeback + streak + referral quests + dormant segmentation |
| **LIQUIDITY_BOOST** | Maker ratio < 20% | Maker rebate + maker quest + MM recruitment brief |
| **ACQUISITION_PUSH** | New users below target | Onboarding sprint + new trader leaderboard |
| **REFERRAL_OPTIMIZE** | Low conversion | Audit codes, deactivate underperformers, upgrade KOLs |

---

## Watchdog

7 detectors running 29 heuristics with per-account risk scoring (0-100) and tiered enforcement (CLEAN → MONITOR → RESTRICT → PENALIZE → ESCALATE).

| Detector | Heuristics | What It Catches |
|----------|-----------|-----------------|
| **Wash Trading** | 7 | Net position zero, concentrated counterparty, reciprocal trades, rapid roundtrip, low PnL/high volume, temporal clustering, pattern repetition |
| **Sybil Accounts** | 5 | Common funding, registration burst, behavioral clone, common destination, discount recycling |
| **Distributor Gaming** | 4 | Self-referral, shell invitees, volume cycling, tier assignment abuse |
| **Campaign Exploit** | 5 | Dust streaks, speed-running, PnL manipulation, referral sybil, social bot farming |
| **Maker Rebate Farming** | 3 | Spoof-and-cancel, maker-taker collusion, layering |
| **Referral Fraud** | 3 | Circular referrals, inactive referees, self-referral drain |
| **Staking Tier Gaming** | 2 | Stake-unstake cycling, flash staking |

All detectors share a pre-computed `ScanDataIndex` — counterparty volume maps, funding clusters, referral graphs, and trade groupings built once per cycle.

---

## Diagnostics

| Check | Threshold | Flag | Priority |
|-------|-----------|------|----------|
| Volume near next tier | > 80% of threshold | `TIER_PUSH_OPPORTUNITY` | 1 |
| Low invitee count | < 3 | `DISTRIBUTOR_OPPORTUNITY` | 2 |
| Volume trend | < 0.80 for 3+ days | `VOLUME_DECLINE` | 3 |
| Churn rate | > 0.30 | `HIGH_CHURN` | 3 |
| Maker ratio | < 0.25 for 5+ days | `LOW_LIQUIDITY` | 4 |
| Revenue per user MoM | declining > 15% | `REVENUE_COMPRESSION` | 5 |
| Referral conversion | < 0.10 | `REFERRAL_UNDERPERFORMANCE` | 6 |
| New users 7d | below target | `LOW_ACQUISITION` | 6 |
| Quest completion | < 0.20 | `CAMPAIGN_FATIGUE` | 7 |

Max 2 playbooks per cycle. Higher priority runs first.

---

## Economics

### Builder Tier Table

```
Tier        30d Volume    OR  $ORDER Staked    Crypto Base    Distributor Privilege
─────────────────────────────────────────────────────────────────────────────────
PUBLIC      No requirement    —                3.00 bps       —
SILVER      ≥ $30M           100K $ORDER       2.75 bps       —
GOLD        ≥ $90M           250K $ORDER       2.50 bps       Can assign Silver/Public
PLATINUM    ≥ $1B            2M $ORDER         2.00 bps       Can assign Gold & below
DIAMOND     ≥ $10B           7M $ORDER         1.00 bps       Can assign Platinum & below
```

The agent tracks tier progression as the highest-priority strategic action — calculating volume gaps, staking costs vs. margin gains, days to next tier, and annual margin improvement.

### Distributor Flywheel

Recruit builders → their volume adds to YOUR aggregate → higher tier → lower base fee → bigger spread on ALL invitee volume → more revenue → attract MORE builders → repeat.

Two revenue streams compound: DEX user fees (margin above base) + distributor spread on invitee volume. At Gold+, assign favorable tier pricing to make your offer more competitive.

---

## Configuration

Create `~/.orderly/growth-agent/config.json`:

```json
{
  "brokerId": "<your-broker-id>",
  "brokerName": "My DEX",
  "network": "mainnet",
  "dryRun": true
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `brokerId` | *required* | Your Orderly broker ID |
| `brokerName` | `"My DEX"` | Display name in reports |
| `network` | `"mainnet"` | `"mainnet"` or `"testnet"` |
| `dryRun` | `true` | No API writes when true |
| `builderTier` | `"auto"` | Override auto-detected tier |
| `maxPlaybooksPerCycle` | `2` | Max playbooks per run (1-5) |
| `enabledPlaybooks` | all 9 | Array of playbook names to enable |
| `socialApiKeyRef` | — | Social SDK API key |
| `watchdog.enabled` | `false` | Enable abuse detection |
| `watchdog.dryRun` | `true` | Watchdog dry-run mode |
| `watchdog.enforcementEnabled` | `false` | Enable automated enforcement |

### Run

```bash
npx orderly-growth              # Dry run — full loop, no API writes
npx orderly-growth --phase collect   # Single phase
npx orderly-growth --live       # Live execution
```

```bash
# Daily at 06:00 UTC (recommended)
0 6 * * * cd /path/to/orderly-growth-agent && npx orderly-growth --live
```

### File Locations

| File | Path |
|------|------|
| Config | `~/.orderly/growth-agent/config.json` |
| State | `~/.orderly/growth-agent/state.json` |
| Audit log | `~/.orderly/growth-agent/audit.jsonl` |
| Reports | `~/.orderly/growth-agent/reports/` |

---

## Project Structure

```
src/
├── index.ts              CLI entry point
├── loop.ts               Daily loop orchestration
├── types.ts              Zod schemas and shared types
├── config.ts             Config loading and validation
├── state.ts              State persistence
├── logger.ts             JSONL audit logger
├── errors.ts             Structured error hierarchy
├── api/
│   ├── trading-client.ts Orderly Trading API client
│   ├── social-client.ts  Orderly Social SDK wrapper
│   └── types.ts          API response types
├── phases/               COLLECT → DIAGNOSE → DECIDE → ACT → REPORT → MEASURE
├── playbooks/            9 playbooks + abstract base with shared helpers
├── diagnostics/          10 diagnostic rules + configurable thresholds
├── economics/            Tier definitions, fee math, distributor spread
└── watchdog/
    ├── loop.ts           SCAN → DETECT → SCORE → ENFORCE → REPORT
    ├── detectors/        7 detectors + abstract base + ScanDataIndex
    ├── scoring/          Weighted risk scoring (0-100)
    ├── enforcement/      Tiered enforcement actions
    ├── scan/             Trade data fetching and normalization
    └── report.ts         Risk report renderer
```

---

## Development

```bash
npm run dev          # Watch mode (tsc --watch)
npm test             # 101 tests across 9 suites
npm run test:watch   # Watch tests
npm run build        # Production build
npm run lint         # Lint
```

**Stack:** TypeScript 5.5 (ESM) · Node.js >= 20 · Zod 3.23 · Vitest 2.0 · 1 runtime dependency

---

## OtterClaw Ecosystem

This skill follows the [OtterClaw SKILL.md format](https://github.com/SkewCodes/OtterClaw/blob/main/CONTRIBUTING.md) and can be submitted to the OtterClaw [partner-skills](https://github.com/SkewCodes/OtterClaw/tree/main/partner-skills) directory.

| OtterClaw Skill | Role | Required |
|---|---|---|
| [`orderly-onboarding`](https://github.com/SkewCodes/OtterClaw/blob/main/skills/orderly-onboarding/SKILL.md) | Account setup | Yes |
| [`orderly-dex-builder`](https://github.com/SkewCodes/OtterClaw/blob/main/skills/orderly-dex-builder/SKILL.md) | Launch a DEX | Yes |
| [`orderly-data`](https://github.com/SkewCodes/OtterClaw/blob/main/skills/orderly-data/SKILL.md) | Market intelligence | Optional |
| [`orderly-trader`](https://github.com/SkewCodes/OtterClaw/blob/main/skills/orderly-trader/SKILL.md) | Trade execution | Optional |
| [`orderly-vault`](https://github.com/SkewCodes/OtterClaw/blob/main/skills/orderly-vault/SKILL.md) | OmniVault yield | Optional |
| [`orderly-swap`](https://github.com/SkewCodes/OtterClaw/blob/main/skills/orderly-swap/SKILL.md) | Token swaps | Optional |
| [`orderly-402`](https://github.com/SkewCodes/OtterClaw/blob/main/skills/orderly-402/SKILL.md) | 402 micropayments | Optional |

**Distribution:** OpenClaw · SeekerClaw · Starchild · ClawHub · Any agent that reads SKILL.md files

---

## License

MIT
