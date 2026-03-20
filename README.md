# Orderly Growth Agent

**An [OtterClaw](https://github.com/SkewCodes/OtterClaw) skill** — Orderly Network skills for AI agents.

Autonomous growth engine for [Orderly Network](https://orderly.network) DEXs. One agent turns a launched DEX into a self-operating business — collecting metrics, diagnosing problems, executing playbooks, deploying campaigns, adjusting fees, detecting abuse, and reporting results on a daily loop.

Launch a DEX with `orderly-dex-builder` in 10 minutes. Install this skill. Wake up to a growth team that never sleeps.

---

## OtterClaw Skill Install

Paste the SKILL.md link to your agent — it reads the file, installs dependencies, and gains the ability:

```
"Install this skill: https://github.com/SkewCodes/orderly-growth-agent/blob/master/SKILL.md"
```

That's it. Your agent can now run autonomous growth loops on any Orderly DEX.

**Compatible agents:** OpenClaw · SeekerClaw · Starchild · Any agent that reads SKILL.md files

### How It Fits in the OtterClaw Ecosystem

```
┌─────────────────────────────────────────────────────────────────┐
│                         OTTERCLAW                               │
│              One link. Paste it. Trade Orderly.                 │
│                                                                 │
│  ┌───────────────────┐  ┌──────────────────┐  ┌─────────────┐  │
│  │ orderly-onboarding│  │ orderly-trader   │  │ orderly-data│  │
│  │ Account setup     │  │ Perps trading    │  │ Market data │  │
│  └───────────────────┘  └──────────────────┘  └─────────────┘  │
│  ┌───────────────────┐  ┌──────────────────┐  ┌─────────────┐  │
│  │ orderly-dex-builder│ │ orderly-vault    │  │ orderly-swap│  │
│  │ Launch a DEX      │  │ OmniVault yield  │  │ Token swaps │  │
│  └────────┬──────────┘  └──────────────────┘  └─────────────┘  │
│           │                                                     │
│           ▼                                                     │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  orderly-growth-agent  ◄── YOU ARE HERE               │     │
│  │  Autonomous growth: 9 playbooks, 7 watchdog detectors,│     │
│  │  fee optimization, campaigns, abuse detection          │     │
│  └────────────────────────────────────────────────────────┘     │
│  ┌───────────────────┐                                          │
│  │ orderly-402       │                                          │
│  │ 402 payments      │                                          │
│  └───────────────────┘                                          │
└─────────────────────────────────────────────────────────────────┘
```

**Depends on:** `orderly-onboarding` + `orderly-dex-builder` (prerequisites)
**Optional:** `orderly-data` · `orderly-trader` · `orderly-vault` · `orderly-402`

---

## Why This Exists

Orderly builders keep **100% of fees above the base fee**. That base fee drops from 3 bps to 1 bps as your volume and `$ORDER` staking increase through the Builder Staking Programme:

```
YOUR MARGIN = fee_you_charge_user − orderly_base_fee_at_your_tier

Example at 5 bps taker fee:

  PUBLIC tier:    5.00 − 3.00 = 2.00 bps margin  (you keep 40%)
  SILVER tier:    5.00 − 2.75 = 2.25 bps margin  (you keep 45%)
  GOLD tier:      5.00 − 2.50 = 2.50 bps margin  (you keep 50%)
  PLATINUM tier:  5.00 − 2.00 = 3.00 bps margin  (you keep 60%)
  DIAMOND tier:   5.00 − 1.00 = 4.00 bps margin  (you keep 80%)
```

Same user fee. Wildly different economics. A Diamond builder earns **2x the margin** of a Public builder on identical volume. This agent maximizes that margin at every tier — automatically.

### The Competitive Moat

This is the thing **Hyperliquid builders cannot get:**

| Capability | Orderly | Hyperliquid |
|---|---|---|
| Base fee reduction | 3.0 → 1.0 bps via staking | Fixed per-asset |
| Builder fee share | 100% above base | ~50% (HIP-3) |
| Per-user fee control | Full API | None |
| Tier progression | 5 tiers + staking | None |
| Distributor programme | Recruit builders, earn spread | None |
| Tier assignment privilege | Gold+ can gift tiers | None |
| Referral API | Native | Not available |
| Campaign SDK | Orderly Social SDK | Not available |

---

## Features

### Daily Growth Loop

```
┌─────────────────────────────────────────────────────────┐
│                  DAILY GROWTH LOOP                       │
│                                                          │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐          │
│   │ COLLECT  │───▶│ DIAGNOSE │───▶│  DECIDE  │          │
│   │ metrics  │    │ problems │    │ playbook │          │
│   └──────────┘    └──────────┘    └────┬─────┘          │
│                                        │                 │
│                                        ▼                 │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐          │
│   │ MEASURE  │◀───│  REPORT  │◀───│   ACT    │          │
│   │ outcomes │    │ scorecard│    │ execute  │          │
│   └──────────┘    └──────────┘    └──────────┘          │
│        │                                                 │
│        └──── feeds back into next day's COLLECT ─────────│
└─────────────────────────────────────────────────────────┘
```

| Phase | What it does |
|-------|-------------|
| **Measure** | ROI of previous playbook runs — verdict: REPEAT / MODIFY / RETIRE |
| **Watchdog** | 7 abuse detectors with 29 heuristics, risk scoring, enforcement |
| **Collect** | Volume, revenue, users, referrals, staking, campaigns, tier progression |
| **Diagnose** | 10 diagnostic codes with severity and priority ranking |
| **Decide** | Select up to N playbooks ranked by estimated impact |
| **Act** | Execute playbooks: fee changes, referral codes, campaigns, quests, competitions |
| **Report** | Markdown scorecard with actions taken, tier advisory, alerts |

### 9 Growth Playbooks

Every playbook handles fee operations (Trading API) and campaign actions (Social SDK) as a unified response. All fee math is relative to your builder tier base fee.

| Playbook | Trigger | What It Does |
|----------|---------|-------------|
| **TIER_PUSH** | Near next tier threshold | Highest priority. Temporary fee reduction + aggressive referral codes + volume race campaign + staking advisory. Permanent margin improvement outweighs any campaign ROI. |
| **DISTRIBUTOR_GROWTH** | Low invitee count | Distributor recruitment referral + tier assignment advisory + revenue projections per invitee + target segment identification. Second-highest leverage action. |
| **INVITEE_SUPPORT** | Invitee volume declining | Diagnose market-wide vs invitee-specific decline + tier assignment + joint campaign advisory + growth agent sharing. Your invitees' success is your tier progression. |
| **VOLUME_RECOVERY** | 7d vol < 70% of 30d avg | Fee reduction to base + 0.5 bps + comeback referral code + 7-day volume blitz competition + volume target & streak quests. |
| **FEE_OPTIMIZATION** | Revenue compression | Re-tier all users across 6 fee tiers (MM / VIP_PLATINUM / VIP_GOLD / TIER_3 / TIER_2 / STANDARD) with staking bonuses. Batch API execution. |
| **RETENTION_SIEGE** | Churn rate > 30% | Comeback Trade + 7-Day Streak + Refer a Friend quests + streak leaderboard + dormant user segmentation (high/mid/low value). |
| **LIQUIDITY_BOOST** | Maker ratio < 20% | Maker rebate from builder margin (with safety check) + Maker Volume Challenge quest + Maker Leaderboard competition + MM recruitment brief. |
| **ACQUISITION_PUSH** | New users below target | Aggressive referral code (30/25 split) + 4-quest onboarding sprint + New Trader Leaderboard + activation tracking. |
| **REFERRAL_OPTIMIZE** | Low conversion | Audit all codes: deactivate <5% conversion, upgrade >15% to KOL tier. Tiers: Standard (20/10), KOL (30/20), Whale (40/15), Promo (25/30 14d max). |

### Watchdog: Abuse Detection System

7 detectors running 29 heuristics with per-account risk scoring (0-100) and tiered enforcement:

| Detector | Heuristics | What It Catches |
|----------|-----------|-----------------|
| **Wash Trading** | 7 | Net position zero, concentrated counterparty, reciprocal trades, rapid roundtrip, low PnL/high volume, temporal clustering, pattern repetition |
| **Sybil Accounts** | 5 | Common funding source, registration burst, behavioral clone, common withdrawal destination, discount recycling |
| **Distributor Gaming** | 4 | Self-referral (shared funding/dest), shell invitees, volume cycling between distributor and invitees, tier assignment abuse |
| **Campaign Exploit** | 5 | Dust streak trading, quest speed-running, PnL manipulation, referral quest sybil, social bot farming |
| **Maker Rebate Farming** | 3 | Spoof-and-cancel (>95% cancel ratio), maker-taker collusion, layering |
| **Referral Fraud** | 3 | Circular referral chains (DFS cycle detection), inactive referee farming, self-referral drain |
| **Staking Tier Gaming** | 2 | Stake-unstake cycling, flash staking (<7 days) |

**Enforcement tiers:** CLEAN → MONITOR → RESTRICT → PENALIZE → ESCALATE

The watchdog builds a shared `ScanDataIndex` once per cycle — pre-computing counterparty volume maps, funding clusters, referral graphs, and trade groupings — so all 7 detectors run against indexed data without redundant passes.

### Builder Staking Programme Economics

The agent understands and optimizes around the full tier table:

```
Tier        30d Volume    OR  $ORDER Staked    Crypto Base    Distributor Privilege
─────────────────────────────────────────────────────────────────────────────────
PUBLIC      No requirement    —                3.00 bps       —
SILVER      ≥ $30M           100K $ORDER       2.75 bps       —
GOLD        ≥ $90M           250K $ORDER       2.50 bps       Can assign Silver/Public
PLATINUM    ≥ $1B            2M $ORDER         2.00 bps       Can assign Gold & below
DIAMOND     ≥ $10B           7M $ORDER         1.00 bps       Can assign Platinum & below
```

**Tier progression is tracked as a strategic priority** — the agent calculates volume gaps, staking costs vs. margin gains, days to next tier at current run rate, and annual margin improvement from tier upgrades.

### Distributor Programme Integration

The second revenue stream and fastest path to tier progression. Distributors onboard new builders and earn the fee spread daily, automatically, permanently.

```
THE DISTRIBUTOR FLYWHEEL

  Recruit builders → Invitee volume adds to YOUR aggregate
  → Higher tier = lower base fee → Bigger spread on ALL invitee volume
  → More revenue + better offers to attract MORE builders → repeat

Revenue stream 1: Your DEX user fees (margin above base)
Revenue stream 2: Distributor spread on invitee volume
Tier boost:       Invitee volume counts toward YOUR aggregate
```

At Gold+, you can assign favorable tier pricing to invitees — making your distributor offer more competitive than going solo.

### Two API Surfaces

| Layer | Controls |
|---|---|
| **Orderly Trading API** | Fees, revenue, volume, staking, referrals, user data, trade history |
| **Orderly Social SDK** | Campaigns, quests, competitions, leaderboards, share cards |

### Diagnostic Engine

10 diagnostic codes with severity levels and priority ranking:

| Check | Threshold | Flag | Priority |
|-------|-----------|------|----------|
| Volume near next tier | > 80% of threshold | `TIER_PUSH_OPPORTUNITY` | 1 (highest) |
| Low invitee count | < 3 invitees | `DISTRIBUTOR_OPPORTUNITY` | 2 |
| Volume trend | < 0.80 for 3+ days | `VOLUME_DECLINE` | 3 |
| Churn rate | > 0.30 | `HIGH_CHURN` | 3 |
| Maker ratio | < 0.25 for 5+ days | `LOW_LIQUIDITY` | 4 |
| Revenue per user MoM | declining > 15% | `REVENUE_COMPRESSION` | 5 |
| Referral conversion | < 0.10 | `REFERRAL_UNDERPERFORMANCE` | 6 |
| New users 7d | below operator target | `LOW_ACQUISITION` | 6 |
| Quest completion | < 0.20 | `CAMPAIGN_FATIGUE` | 7 |
| All clear | no flags | `GREEN` | — |

### ROI Measurement

Every playbook run is measured:

```
Volume lift → Revenue delta → Cost (fee discounts + prizes + rebates)
→ ROI = (delta - cost) / cost
→ Tier impact: volume contributed toward next tier, progress change
→ Verdict: REPEAT (>100%) / MODIFY (0-100%) / RETIRE (<0%)
```

### Scorecard Reports

Daily markdown reports with volume, revenue, users, fee tiers, referrals, distributor metrics, campaign performance, actions taken, tier advisory, and alerts.

---

## Quick Start

### Option A: OtterClaw Skill Install (agents)

Send the SKILL.md link to any OtterClaw-compatible agent:

```
"Install this skill: https://github.com/SkewCodes/orderly-growth-agent/blob/master/SKILL.md"
```

The agent reads the skill, installs prerequisites, and starts running growth loops.

### Option B: Manual Install (developers)

**Prerequisites:**

- Node.js >= 20
- [Orderly CLI](https://www.npmjs.com/package/@orderly.network/cli) (`npm install -g @orderly.network/cli`)

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

# Single phase for debugging
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

---

## Configuration

All fields except `brokerId` have defaults:

| Field | Default | Description |
|-------|---------|-------------|
| `brokerId` | *required* | Your Orderly broker ID |
| `brokerName` | `"My DEX"` | Display name in reports |
| `network` | `"mainnet"` | `"mainnet"` or `"testnet"` |
| `dryRun` | `true` | Dry-run mode — no API writes |
| `builderTier` | `"auto"` | Override auto-detected tier (`PUBLIC` / `SILVER` / `GOLD` / `PLATINUM` / `DIAMOND`) |
| `maxPlaybooksPerCycle` | `2` | Max playbooks per daily run (1-5) |
| `enabledPlaybooks` | all 9 | Array of playbook names to enable |
| `socialApiKeyRef` | — | Social SDK API key for campaigns/quests |
| `reportOutputDir` | `~/.orderly/growth-agent/reports/` | Custom report output directory |
| `operatorTargets.dailyVolumeUsd` | `1,000,000` | Target daily volume |
| `operatorTargets.dailyRevenueUsd` | `500` | Target daily revenue |
| `operatorTargets.activeUsersWeekly` | `200` | Target weekly active users |
| `operatorTargets.monthlyNewUsers` | `50` | Target monthly new users |

### Watchdog Configuration

| Field | Default | Description |
|-------|---------|-------------|
| `watchdog.enabled` | `false` | Enable abuse detection |
| `watchdog.dryRun` | `true` | Watchdog dry-run mode |
| `watchdog.scanWindowDays` | `7` | Lookback window for trade scanning |
| `watchdog.enforcementEnabled` | `false` | Enable automated enforcement actions |
| `watchdog.maxEscalationsPerCycle` | `5` | Cap on escalation actions per run |
| `watchdog.detectors.*` | all `true` | Toggle individual detectors on/off |
| `watchdog.thresholdOverrides` | `{}` | Override detection thresholds by key |
| `watchdog.weightOverrides` | `{}` | Override scoring weights by heuristic ID |
| `watchdog.allowlist` | `[]` | Account IDs to exclude from detection |

---

## File Locations

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
├── index.ts                 # CLI entry point
├── loop.ts                  # Daily loop orchestration
├── types.ts                 # Zod schemas and shared types
├── config.ts                # Config loading
├── state.ts                 # State persistence
├── logger.ts                # JSONL audit logger
├── errors.ts                # Structured error hierarchy
│
├── api/
│   ├── trading-client.ts    # Orderly Trading API client
│   ├── social-client.ts     # Orderly Social SDK wrapper
│   └── types.ts             # API response types
│
├── phases/
│   ├── collect.ts           # Metrics collection
│   ├── diagnose.ts          # Diagnostic engine
│   ├── decide.ts            # Playbook selection
│   ├── act.ts               # Playbook execution
│   ├── report.ts            # Scorecard generation
│   └── measure.ts           # ROI calculation
│
├── playbooks/
│   ├── base.ts              # Abstract base with shared action helpers
│   ├── index.ts             # Playbook registry
│   └── [9 playbook files]   # One per playbook
│
├── diagnostics/
│   ├── rules.ts             # 10 diagnostic rule functions
│   └── thresholds.ts        # Configurable threshold values
│
├── economics/
│   ├── tiers.ts             # Builder tier definitions and progression
│   ├── fees.ts              # Fee math, user tiers, staking bonuses
│   └── distributor.ts       # Distributor spread calculations
│
└── watchdog/
    ├── loop.ts              # SCAN → DETECT → SCORE → ENFORCE → REPORT
    ├── detectors/
    │   ├── base.ts          # Abstract detector + ScanDataIndex
    │   └── [7 detector files]
    ├── scoring/             # Weighted risk scoring (0-100)
    ├── enforcement/         # Tiered enforcement actions
    ├── scan/                # Trade data fetching and normalization
    └── report.ts            # Risk report renderer
```

---

## Development

```bash
npm run dev          # Watch mode (tsc --watch)
npm test             # Run all 101 tests
npm run test:watch   # Watch tests
npm run build        # Production build
npm run lint         # Lint
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Language | TypeScript 5.5, ESM modules |
| Runtime | Node.js >= 20 |
| Validation | Zod 3.23 |
| Testing | Vitest 2.0 (101 tests across 9 suites) |
| Dependencies | 1 runtime (zod), 4 dev |

---

## OtterClaw Companion Skills

All skills live in the [OtterClaw](https://github.com/SkewCodes/OtterClaw) repository. Install any of them by pasting the SKILL.md link to your agent.

| Skill | Role | Install |
|---|---|---|
| [`orderly-onboarding`](https://github.com/SkewCodes/OtterClaw/blob/main/skills/orderly-onboarding/SKILL.md) | Account setup (prerequisite) | `"Install this skill: .../orderly-onboarding/SKILL.md"` |
| [`orderly-dex-builder`](https://github.com/SkewCodes/OtterClaw/blob/main/skills/orderly-dex-builder/SKILL.md) | Launch a DEX (prerequisite) | `"Install this skill: .../orderly-dex-builder/SKILL.md"` |
| [`orderly-trader`](https://github.com/SkewCodes/OtterClaw/blob/main/skills/orderly-trader/SKILL.md) | Perps trading | `"Install this skill: .../orderly-trader/SKILL.md"` |
| [`orderly-data`](https://github.com/SkewCodes/OtterClaw/blob/main/skills/orderly-data/SKILL.md) | Market data & intelligence | `"Install this skill: .../orderly-data/SKILL.md"` |
| [`orderly-vault`](https://github.com/SkewCodes/OtterClaw/blob/main/skills/orderly-vault/SKILL.md) | OmniVault yield | `"Install this skill: .../orderly-vault/SKILL.md"` |
| [`orderly-swap`](https://github.com/SkewCodes/OtterClaw/blob/main/skills/orderly-swap/SKILL.md) | On-chain token swaps | `"Install this skill: .../orderly-swap/SKILL.md"` |
| [`orderly-402`](https://github.com/SkewCodes/OtterClaw/blob/main/skills/orderly-402/SKILL.md) | 402 micropayments | `"Install this skill: .../orderly-402/SKILL.md"` |

### Agent Distribution

This skill and all OtterClaw skills are compatible with:

- **OpenClaw** — 247K+ GitHub stars ecosystem
- **SeekerClaw** — Solana mobile agent
- **Starchild** — WOO Network agent platform
- **ClawHub** — OpenClaw's official skill registry (5,400+ skills)

---

## License

MIT — Part of [OtterClaw](https://github.com/SkewCodes/OtterClaw) by [SkewCodes](https://github.com/SkewCodes)
