---
name: orderly-growth-agent
description: Autonomous growth agent for Orderly Network DEXs — runs a daily loop that diagnoses problems, optimizes fees, deploys campaigns, manages referrals, and reports results. Understands the Builder Staking Programme economics and optimizes margin relative to your tier. One skill turns a launched DEX into a self-operating business.
version: 1.1.0
author: OtterClaw
tags:
  - growth
  - agent
  - fees
  - campaigns
  - quests
  - leaderboard
  - referral
  - staking
  - autopilot
  - orderly
requires:
  bins:
    - orderly
    - node
  install:
    - id: npm-cli
      kind: command
      command: npm install -g @orderly.network/cli
      bins:
        - orderly
      label: Install Orderly CLI
    - id: npm-social-core
      kind: command
      command: npm install @orderly-social/sdk-core
      bins: []
      label: Install Orderly Social SDK (core)
    - id: npm-social-react
      kind: command
      command: npm install @orderly-social/sdk-react @orderly-social/sdk-widgets
      bins: []
      label: Install Orderly Social SDK (React + Widgets — optional, for frontend integration)
---

# Orderly Growth Agent

One skill. Autonomous growth for any Orderly Network DEX.

This agent runs a daily loop: pull metrics, diagnose problems, execute playbooks, deploy campaigns, adjust fees, and report results. A builder launches a DEX via `orderly-dex-builder` in 10 minutes, installs this skill, and wakes up to a growth team that never sleeps.

**Required skills:** `orderly-onboarding`, `orderly-dex-builder`
**Optional skills:** `orderly-data`, `orderly-trader`, `orderly-vault`, `orderly-402`

**Why this exists:** Orderly builders keep 100% of fees above the base fee. That base fee drops from 3 bps to 1 bps as your volume and $ORDER staking increase through the Builder Staking Programme. At Diamond tier, a builder paying 1 bps base who charges users 5 bps keeps 4 bps per trade. On Hyperliquid, a HIP-3 deployer keeps ~50% of their fee scale — with less control, no campaign infrastructure, and no per-user fee management. This skill maximizes the Orderly advantage at every tier.

**This is the thing Hyperliquid builders cannot get.** No per-user fee control, no referral API, no campaign SDK, no staking-linked base fee reduction, no agent-compatible API surface. This skill is the competitive moat.

---

## The Economics: Builder Staking Programme

This is the foundation layer. Every fee decision, every margin calculation, every playbook in this skill is relative to **your builder tier**. The agent must know your current tier to make correct decisions.

### Builder Tier Table

```
ORDERLY BUILDER STAKING PROGRAMME
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tier        30d Volume*    OR  $ORDER Staked    Crypto Base    RWA Base    Maker Base    Distributor Privilege
─────────────────────────────────────────────────────────────────────────────────────────────────────────────
PUBLIC      No requirement     —                3.00 bps       5.00 bps    0.00 bps      —
SILVER      ≥ $30M             100K $ORDER      2.75 bps       4.75 bps    0.00 bps      —
GOLD        ≥ $90M             250K $ORDER      2.50 bps       4.50 bps    0.00 bps      Can assign Silver/Public
PLATINUM    ≥ $1B              2M $ORDER        2.00 bps       4.00 bps    0.00 bps      Can assign Gold & below
DIAMOND     ≥ $10B             7M $ORDER        1.00 bps       3.00 bps    0.00 bps      Can assign Platinum & below

* 30d aggregate volume = builder personal volume + ALL graduated invitee builder volume
  Daily snapshots determine tier eligibility.
  Volume OR staking — whichever qualifies first.
  Invitee volume is the key compounding mechanic (see Distributor Programme below).
```

### Marketing Benefits by Tier

```
PUBLIC:     None
SILVER:     Launch RT/QT from Orderly
GOLD:       All Silver + co-marketing, partnership tweets/blog, social support,
            growth calls, partner intros
PLATINUM:   All Gold + joint campaigns, "Platinum Builder" badge on website,
            paid user-acquisition support option, speaker invites to Orderly events
DIAMOND:    All Platinum + flagship partner program, homepage placement,
            PR & paid media, closed-door investor invites
```

### Product & Support by Tier

```
PUBLIC:     SDK access & docs
SILVER:     All Public + Telegram support group
GOLD:       All Silver + can sponsor referred builders to Silver pricing,
            24/7 tech support with SLAs
PLATINUM:   All Gold + can sponsor referred builders to Gold pricing,
            dedicated account manager, product beta access,
            listing recommendations, ecosystem intros
DIAMOND:    All Platinum + can sponsor referred builders to Platinum pricing,
            dedicated support team, product advisory board seat
```

### Why This Matters for Every Decision

```
YOUR MARGIN = fee_you_charge_user − orderly_base_fee_at_your_tier

Example at different tiers (user pays 5 bps taker):

  PUBLIC tier:    5.00 − 3.00 = 2.00 bps margin  (you keep 40%)
  SILVER tier:    5.00 − 2.75 = 2.25 bps margin  (you keep 45%)
  GOLD tier:      5.00 − 2.50 = 2.50 bps margin  (you keep 50%)
  PLATINUM tier:  5.00 − 2.00 = 3.00 bps margin  (you keep 60%)
  DIAMOND tier:   5.00 − 1.00 = 4.00 bps margin  (you keep 80%)

Same user fee. Wildly different economics. A Diamond builder earns
2x the margin per trade of a Public builder on identical volume.

IMPLICATION: Tier progression is not a vanity metric — it is the
single highest-leverage growth action for DEX profitability.
Every playbook should consider: "Does this action help us reach the next tier?"
```

### Tier Progression Strategy

The agent tracks and advises on tier progression as a strategic priority:

```
TIER PROGRESSION DECISION TREE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CURRENT TIER → NEXT TIER → WHAT'S NEEDED → AGENT RECOMMENDATION

PUBLIC → SILVER
  Volume path:  Need $30M 30d volume
  Staking path: Need 100K $ORDER
  If 30d volume > $20M: "You're at 67% — a 7-day volume blitz could push you over"
  If 30d volume < $10M: "Staking 100K $ORDER is faster — unlocks Silver immediately"
  UNLOCKS: 0.25 bps base fee reduction + Telegram support + Orderly social amplification

SILVER → GOLD
  Volume path:  Need $90M 30d volume (3x from Silver threshold)
  Staking path: Need 250K $ORDER (2.5x from Silver)
  If close on volume: "Referral builder volume counts — recruit 2-3 active builders"
  If staking cheaper: "150K more $ORDER gets Gold — also earning VALOR at 42%+ APR"
  UNLOCKS: 0.25 bps more margin + 24/7 SLAs + co-marketing + growth calls

GOLD → PLATINUM
  Volume path:  Need $1B 30d volume (11x from Gold threshold)
  Staking path: Need 2M $ORDER (8x from Gold)
  Major jump — likely requires both volume growth AND staking
  UNLOCKS: 0.50 bps margin jump + dedicated AM + joint campaigns + paid UA option

PLATINUM → DIAMOND
  Volume path:  Need $10B 30d volume
  Staking path: Need 7M $ORDER
  Institutional-scale — flagship territory
  UNLOCKS: 1.00 bps margin jump (biggest single jump) + advisory board seat

AGENT SHOULD:
  - Calculate: cost of staking to next tier vs revenue gain from lower base fee
  - If (annual_margin_gain > cost_of_staking * 2): recommend staking immediately
  - Track: daily volume run rate vs next tier threshold
  - Alert: "At current run rate you'll hit Gold tier in ~14 days"
  - Remember: builder referral volume contributes to aggregate — recruiting builders is a tier lever
  - Remember: at Gold+ you can ASSIGN favorable tiers to invitees — making your invites more valuable
```

### Distributor Programme: The Builder Recruitment Flywheel

The Distributor Programme is the second revenue stream and the fastest path to tier progression. Distributors onboard new builders into Orderly ONE and earn the fee spread between their tier and the invitee's tier — daily, automatically, permanently.

**Portal:** https://dex.orderly.network/distributor/

```
HOW IT WORKS
━━━━━━━━━━━━

1. SETUP (one-time):
   - Connect EOA wallet at dex.orderly.network/distributor/
     (Ethereum, Arbitrum One, or Base)
   - Complete key creation to activate Distributor profile
   - Get unique distributor code/URL for sharing

2. RECRUIT:
   - Share code with potential builders (humans or agents)
   - Invitee must bind BEFORE their DEX graduates
   - Binding is immutable — once set, never changes

3. EARN:
   - Distributor Margin = max(0.1 bps, Invitee Base Fee − Your Base Fee)
   - Settlement: daily at 00:00 UTC, automatic
   - Revenue credited to: Builder Admin account (if builder) or EOA (if general)

4. COMPOUND:
   - All graduated invitee volume counts toward YOUR 30d aggregate
   - More invitees = more aggregate volume = higher tier = lower base fee
   - Lower base fee = bigger spread on ALL invitee volume = more revenue
   - This is the flywheel.
```

```
DISTRIBUTOR MARGIN TABLE
━━━━━━━━━━━━━━━━━━━━━━━━

Your Tier    Invitee Tier    Spread per Taker Trade    Annual on $10M invitee volume
────────────────────────────────────────────────────────────────────────────────────
GOLD         PUBLIC          0.50 bps                  $5,000
GOLD         SILVER          0.25 bps                  $2,500
PLATINUM     PUBLIC          1.00 bps                  $10,000
PLATINUM     SILVER          0.75 bps                  $7,500
PLATINUM     GOLD            0.50 bps                  $5,000
DIAMOND      PUBLIC          2.00 bps                  $20,000
DIAMOND      SILVER          1.75 bps                  $17,500
DIAMOND      GOLD            1.50 bps                  $15,000
DIAMOND      PLATINUM        1.00 bps                  $10,000
Same tier    Same tier       0.10 bps (guaranteed min) $1,000

Note: Even at the same tier, you earn 0.1 bps guaranteed minimum on taker orders.
      The higher YOUR tier and the lower THEIR tier, the bigger your spread.
```

```
TIER ASSIGNMENT PRIVILEGE
━━━━━━━━━━━━━━━━━━━━━━━━

At Gold and above, you can ASSIGN favorable tier pricing to your invitees.
This makes your distributor offer more competitive — you can say:
"Launch on Orderly through my link and I'll give you Silver-tier pricing from day one."

  GOLD:     Can assign invitees to Silver or Public pricing
  PLATINUM: Can assign invitees to Gold or below
  DIAMOND:  Can assign invitees to Platinum or below

This is a recruitment superpower:
  - A Platinum distributor can offer Gold pricing to a new builder
  - That builder gets 2.50 bps base instead of 3.00 bps from day one
  - They save 0.50 bps per taker trade vs. going solo
  - You still earn the spread between YOUR base (2.00 bps) and THEIR assigned base (2.50 bps)
  - Both sides win. The invitee gets better rates, you get revenue + their volume for tier progression.

AGENT/HUMAN DISTINCTION:
  Distributors can be humans (community members, affiliates, KOLs) or
  AI agents (trading bots, aggregators, strategy vaults). The mechanics
  are identical — any EOA can be a distributor.

  Agent distributors are particularly powerful:
  - They can programmatically share codes across platforms
  - They can monitor invitee performance and optimize outreach
  - They can be deployed as "builder recruitment agents" that qualify
    prospects and guide them through DEX launch
```

```
BINDING RULES (critical — agent must enforce)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Unidirectional: an invitee binds to exactly ONE distributor
- Non-reciprocal: A invites B, B cannot invite A
- Timing: binding must happen AT or BEFORE the invitee's DEX graduation
- Immutable: once bound, the relationship cannot be changed
- Account type lock: an EOA registered as Distributor cannot become a Builder Admin later

IMPLICATION FOR AGENTS:
  - Distribute codes EARLY — before the builder graduates
  - Track binding status of prospects
  - Never promise code changes after binding (it's permanent)
  - An agent acting as distributor should use a dedicated EOA, not the builder admin wallet
```

```
THE DISTRIBUTOR FLYWHEEL (why this is the highest-leverage growth action)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

                    ┌─────────────────────┐
                    │  Recruit builders   │
                    └────────┬────────────┘
                             │
                             ▼
                    ┌─────────────────────┐
                    │ Invitee volume adds │
                    │ to YOUR aggregate   │
                    └────────┬────────────┘
                             │
                             ▼
                    ┌─────────────────────┐
                    │ Higher tier = lower │
                    │ base fee for YOU    │
                    └────────┬────────────┘
                             │
                             ▼
                    ┌─────────────────────┐
                    │ Bigger spread on    │
                    │ ALL invitee volume  │
                    └────────┬────────────┘
                             │
                             ▼
                    ┌─────────────────────┐
                    │ More revenue +      │
                    │ better offers to    │◀──┐
                    │ attract MORE        │   │
                    │ builders            │───┘
                    └─────────────────────┘

Revenue stream 1: Your DEX user fees (margin above base)
Revenue stream 2: Distributor spread on invitee volume
Tier boost:       Invitee volume counts toward YOUR aggregate

These three compound. A Gold distributor who recruits 5 builders doing
$20M/mo each adds $100M to their aggregate — that alone pushes to Platinum.
At Platinum, the spread on all those invitees widens AND the base fee on
your own DEX drops. Double benefit from the same action.
```

---

## The Growth Loop

Everything in this skill feeds one cycle. The agent runs it daily (recommended 06:00 UTC). All sections below are organized by loop phase.

```
┌─────────────────────────────────────────────────────────┐
│                  DAILY GROWTH LOOP                      │
│                                                         │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐         │
│   │ COLLECT  │───▶│ DIAGNOSE │───▶│  DECIDE  │         │
│   │ metrics  │    │ problems │    │ playbook │         │
│   └──────────┘    └──────────┘    └────┬─────┘         │
│                                        │                │
│                                        ▼                │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐         │
│   │ MEASURE  │◀───│  REPORT  │◀───│   ACT    │         │
│   │ outcomes │    │ scorecard│    │ execute  │         │
│   └──────────┘    └──────────┘    └──────────┘         │
│        │                                                │
│        └──── feeds back into next day's COLLECT ────────│
└─────────────────────────────────────────────────────────┘
```

---

## Prerequisites

- Active Orderly account with activated broker code (`orderly auth-list`)
- Orderly CLI installed (`orderly --version`)
- DEX launched via `orderly-dex-builder`
- Venue registered with Orderly Social API (venue ID + API key)
- **Know your current builder tier** — agent asks on first run if unknown

## Two API Surfaces

| Layer | Base URL | Controls |
|---|---|---|
| **Orderly Trading API** | `https://api.orderly.org` | Fees, revenue, volume, staking, referrals, user data |
| **Orderly Social API** | `https://api.orderly.social` | Campaigns, quests, competitions, teams, leaderboards, share cards |

**Trading API auth** — Ed25519 signature per request:
```
Headers: orderly-account-id, orderly-key, orderly-timestamp, orderly-signature
```

**Social API auth** — two-step JWT via SDK:
```typescript
import { OrderlySocialClient } from '@orderly-social/sdk-core';
const social = new OrderlySocialClient({
  venueId: '<broker-id>', venueApiKey: '<social-api-key>',
  environment: 'production',
  features: { leaderboards: true, quests: true, campaigns: true,
              teams: true, competitions: true, sharing: true },
});
await social.initializeVenue();
```

---

## Phase 1: COLLECT

Three core API calls every run, plus builder tier context.

### Core Data

```bash
# 1. Volume + Revenue — last 30 days
GET /v1/volume/broker/daily?start_date=<30d-ago>&end_date=<today>
# Per-day: volume, maker_volume, taker_volume, fee, broker_rebate
# Supports: aggregate_by (day|week|month), order_tag (campaign attribution)

# 2. Fee Tier Distribution
GET /v1/broker/fee_rate/users
# All users with non-default fee rates

# 3. Referral Health — last 7 days
GET /v1/referral/rebate_summary?start_date=<7d-ago>&end_date=<today>
# Per-day: total_referees, traded_referral, rebate_amount
```

### Builder Tier Context (weekly or first run)

```bash
GET /v1/broker/fee_rate/default    # reveals current base fee floor
GET /v1/staking/info               # ORDER staked, esORDER, VALOR earned
GET /v1/valor/balance              # VALOR balance, treasury share %
```

Agent derives tier from whichever qualifies higher: 30d aggregate volume or $ORDER staked.

### Enrichment (weekly or on-demand)

```bash
GET /v1/client/statistics/daily?account_id=<id>   # per-user stats
GET /v1/public/account?account_id=<id>             # account details
GET /v1/referral/admin_info?broker_id=<id>         # all referral codes
```

### Social Data (if campaigns active)

```typescript
const quests = await social.quest.list({ activeOnly: true });
const leaderboard = await social.competition.getLeaderboard(competitionId);
const progress = await social.campaign.progress(campaignId);
```

### Computed Metrics

```
CORE:
  builder_tier         = derived from volume_30d and order_staked
  base_fee             = crypto taker base for current tier
  volume_24h / 7d_avg / 30d_avg / 30d_total
  volume_trend         = volume_7d_avg / volume_30d_avg
  daily_revenue / monthly_revenue
  rev_per_user         = monthly_revenue / unique_users_30d
  maker_ratio          = maker_volume_7d / total_volume_7d
  churn_rate           = 1 - (unique_users_7d / unique_users_30d)
  new_users_7d / referral_conversion / quest_completion

TIER PROGRESSION:
  next_tier / volume_to_next / staking_to_next
  days_to_next_tier    = volume_gap / volume_7d_avg
  margin_gain_at_next  = base_fee_current - base_fee_next (bps)
  annual_margin_gain   = margin_gain * projected_annual_volume

DISTRIBUTOR:
  invitee_count        = total graduated invitees
  invitee_volume_30d   = sum of all invitee 30d volumes
  distributor_revenue  = sum(daily spread earnings)
  aggregate_volume     = personal_volume_30d + invitee_volume_30d
  invitee_utilization  = invitee_volume / invitee_capacity (are they active?)
  recruitment_pipeline = prospects identified but not yet bound
```

---

## Phase 2: DIAGNOSE

```
DIAGNOSTIC ENGINE
━━━━━━━━━━━━━━━━

CHECK                         THRESHOLD                  FLAG
─────────────────────────────────────────────────────────────────
volume_30d > 80% next tier    close to upgrade           TIER_PUSH_OPPORTUNITY
invitee_count < 3             under-distributed          DISTRIBUTOR_OPPORTUNITY
invitee volume declining      any invitee -30% WoW       INVITEE_AT_RISK
volume_trend                  < 0.80 (3+ days)           VOLUME_DECLINE
maker_ratio                   < 0.25 (5+ days)           LOW_LIQUIDITY
churn_rate                    > 0.30                     HIGH_CHURN
rev_per_user MoM              declining > 15%            REVENUE_COMPRESSION
referral_conversion           < 0.10                     REFERRAL_UNDERPERFORMANCE
new_users_7d                  < operator target          LOW_ACQUISITION
quest_completion              < 0.20                     CAMPAIGN_FATIGUE
No flags                      —                          GREEN

PRIORITY (if multiple):
  1. TIER_PUSH_OPPORTUNITY  (permanent ROI — always highest)
  2. DISTRIBUTOR_OPPORTUNITY (permanent revenue stream + tier progression)
  3. VOLUME_DECLINE         (revenue + tier impact)
  3. HIGH_CHURN             (leading indicator)
  4. LOW_LIQUIDITY          (market quality)
  5. REVENUE_COMPRESSION    (margin problem)
  6. LOW_ACQUISITION / REFERRAL_UNDERPERFORMANCE
  7. CAMPAIGN_FATIGUE

Max 2 playbooks per cycle. Queue the rest.
```

---

## Phase 3: DECIDE → ACT

Every playbook fires fee operations (Trading API) and campaign actions (Social SDK) as a unified response. **All fee math is relative to your builder tier base fee.**

### Playbook: TIER_PUSH

**Trigger:** `volume_30d > 80% of next tier threshold` OR `days_to_next_tier < 30`

Highest-priority playbook. Permanent margin improvement outweighs any campaign ROI.

```
EVALUATE:
  volume_gap = next_tier_threshold - volume_30d
  staking_gap = next_tier_staking - current_order_staked
  cost_to_stake = staking_gap * ORDER_price
  annual_margin_gain = base_fee_reduction * projected_annual_volume

  IF annual_margin_gain > cost_to_stake * 1.5:
    → "Stake {gap} $ORDER now. Pays for itself in {n} months."
  IF volume path faster:
    → Run aggressive volume campaign (ROI = permanent margin gain)

FEE SIDE:
  - Temporarily reduce taker fees to base + 0.5 bps (sacrifice short-term margin)
  - Aggressive referral codes (referred builder volume counts toward aggregate!)
  - If Gold+: activate marketing benefits (growth calls, co-marketing)

DISTRIBUTOR SIDE:
  - Recruit builders aggressively — their volume counts toward YOUR aggregate
  - If Gold+: offer tier assignment to sweeten the deal
  - Calculate: how many invitees at $X/mo volume would close the gap?
  - Deploy builder recruitment agent or manual outreach

CAMPAIGN SIDE:
  - Highest-intensity volume race with large prize pool
  - Frame as community milestone: "Help us unlock better rates for everyone"
  - All quest types active simultaneously

MARKETING (activate based on current tier):
  GOLD:     Request growth call + co-marketing tweet from Orderly
  PLATINUM: Request joint campaign + paid UA support
  DIAMOND:  Leverage PR/media + homepage placement

EXIT: Next tier reached
REPORT: "Tier upgraded {old} → {new}. Base fee: {old_bps} → {new_bps}.
         Annual margin improvement: ${gain}. This is permanent."
```

### Playbook: DISTRIBUTOR_GROWTH

**Trigger:** `invitee_count < 3` OR operator requests builder recruitment OR TIER_PUSH needs volume

This is the second-highest leverage action after tier push — and often the best WAY to achieve a tier push. Every invitee builder adds a permanent revenue stream AND volume toward your tier.

```
EVALUATE:
  current_tier / next_tier / volume_gap
  Can you assign favorable pricing? (Gold+ required)
  What's the spread at your tier vs Public? (your recruitment offer)

STRATEGY BY TIER:

  PUBLIC/SILVER (limited distributor leverage):
    - You can't assign tier privileges yet
    - Offer: "Launch on Orderly through my link — I'll help you set up"
    - Focus on community value: shared campaigns, growth support, experience
    - Target: small builders, community DAOs, trading groups wanting a DEX
    - Volume from invitees still counts toward YOUR tier → path to Gold

  GOLD (can assign Silver/Public):
    - Offer: "Launch through me and get Silver pricing from day one (2.75 bps vs 3.00 bps)"
    - Your spread: 0.25 bps on their volume (if assigning Silver)
    - Target: serious builders who would otherwise launch at Public tier
    - Pitch: "You save 0.25 bps per trade, I help you grow — both sides win"

  PLATINUM (can assign Gold & below):
    - Offer: "Get Gold pricing immediately (2.50 bps) — no volume requirement"
    - Your spread: 0.50 bps on their volume
    - Target: established projects migrating from other infra, large communities
    - Pitch: "Gold tier pricing + joint campaigns + 24/7 support from day one"

  DIAMOND (can assign Platinum & below):
    - Offer: "Get Platinum pricing (2.00 bps) — equivalent to $1B volume tier"
    - Your spread: 1.00 bps on their volume
    - Target: institutional builders, VC-backed protocols, cross-chain platforms
    - Pitch: "Platinum pricing + dedicated AM + product advisory input"

ACTIONS:
  1. Register as distributor at dex.orderly.network/distributor/ (if not already)
  2. Generate unique distributor code/URL
  3. Identify recruitment targets:
     - Communities with trading audiences but no DEX
     - Projects on other infra (Hyperliquid, dYdX) considering migration
     - AI agent developers who need execution infrastructure
     - Existing Orderly builders who could refer others (recursive)
  4. For each prospect:
     - Calculate their estimated 30d volume
     - Calculate your spread revenue: prospect_volume * tier_spread
     - Calculate tier impact: does their volume push you to next tier?
     - Prepare pitch with concrete numbers
  5. Share code BEFORE prospect's DEX graduates (binding window)
  6. Track: binding confirmation, graduation status, volume ramp

AGENT-AS-DISTRIBUTOR:
  An AI agent can act as a distributor itself:
  - Deploy a "builder recruitment agent" that qualifies prospects
  - Programmatically share distributor codes across channels
  - Monitor invitee performance and provide growth support
  - Use orderly-growth-agent skill ON BEHALF of invitees (nested growth loops)
  - This creates an agent network effect: your agent helps their DEX grow,
    their volume grows, your tier improves, your agent's recommendations improve

MEASURE:
  - invitees_recruited / month
  - invitee_volume_contribution to aggregate
  - distributor_revenue / month
  - tier_progression_from_invitees (volume contributed vs gap)
  - invitee_retention (are they still active after 30/60/90 days?)
```

### Playbook: INVITEE_SUPPORT

**Trigger:** `invitee volume declining > 30% WoW` (INVITEE_AT_RISK flag)

Your invitees' success is your success — their volume is your tier progression AND your distributor revenue.

```
IDENTIFY:
  Which invitees are declining? Pull volume data per invitee.

ACTIONS:
  1. Diagnose: is it market-wide or invitee-specific?
     If market-wide: nothing to do, ride it out
     If invitee-specific: they need growth support

  2. If you have tier assignment privilege:
     Consider temporarily assigning a better tier (lower base fee)
     This gives them more margin to run their own campaigns

  3. Share this growth agent skill with the invitee:
     "Install orderly-growth-agent — it will run your growth loop for you"
     If they succeed, you succeed.

  4. Offer to run joint campaigns:
     Your campaign infrastructure + their user base
     Cost-share the prize pool, both benefit from volume

  5. If Gold+: leverage Orderly co-marketing benefits FOR the invitee
     A rising tide lifts all boats (and all volume counts toward your aggregate)

EXIT: invitee volume stabilizes or you've provided support playbook
```

### Playbook: VOLUME_RECOVERY

**Trigger:** `volume_trend < 0.80` for 3+ days

```
CRITICAL: All fee cuts relative to YOUR tier base fee.
          Never set user fees below base — you'd pay Orderly to trade.
          minimum_user_fee = base_fee_at_your_tier

DAY 0:
  Fee Side:
    new_taker = max(current_taker * 0.8, base_fee + 0.0005)
    POST /v1/broker/fee_rate/default { futures_taker_fee_rate: new_taker }
    POST /v1/referral/create { code: "COMEBACK_<date>",
      referrer_rebate_rate: 0.25, referee_discount_rate: 0.30 }

  Campaign Side:
    Deploy volume blitz competition (7d)
    Activate quests: volume_target ($10K) + streak (5d)
    Generate share cards at milestones

  CHECK: does volume push push us closer to next tier?
    If yes → extend, ROI is even higher than immediate revenue

MONITOR: daily volume vs baseline. Recover >90% → EXIT.
ON EXIT: restore fees, expire promos, settle prizes, log
```

### Playbook: FEE_OPTIMIZATION

**Trigger:** 1st of month OR `rev_per_user declining > 15% MoM`

```
base = base_fee_at_your_tier  (variable — recalculate after any tier change)

PER USER DECISION TREE:

  maker_ratio > 80%:
    Maker: -0.0001 (rebate) / Taker: base + 1.5 bps          [MM_TIER]

  order_staked > 100K:
    Maker: 0 / Taker: base + 1.0 bps                          [VIP_PLATINUM]

  order_staked > 10K OR volume_30d > $10M:
    Maker: 0.5 bps / Taker: base + 1.5 bps                    [VIP_GOLD]

  volume_30d > $1M:
    Maker: 1.0 bps / Taker: base + 2.0 bps                    [TIER_3]

  volume_30d > $100K:
    Maker: 1.5 bps / Taker: base + 2.5 bps                    [TIER_2]

  else:
    Maker: 2.0 bps / Taker: base + 3.0 bps                    [STANDARD]

USER STAKING BONUS (layered discount on YOUR margin portion):
  1K+ ORDER: 10% off margin  │  5K+: 20%  │  25K+: 30%
  100K+: 40%  │  500K+: 50% + custom negotiation flag

RULES:
  - Promotions immediate, demotions 14-day grace
  - VIP: never auto-demote
  - No fee below base (you lose money)
  - Re-run after every builder tier change

EXECUTE: POST /v1/broker/fee_rate/set (batch)
```

### Playbook: RETENTION_SIEGE

**Trigger:** `churn_rate > 0.30`

```
IDENTIFY: 90-day volume → segment dormant (0 vol 14+ days)
  High-value (was >$1M) → personal outreach
  Mid ($100K-$1M) → campaign target
  Low (<$100K) → promo code only

FEE SIDE:
  Comeback discount: base_fee + (default_margin * 0.5) for 7 days
  Auto-assign when dormant user returns via POST /v1/broker/fee_rate/set

CAMPAIGN SIDE:
  Comeback Trade quest → 150 XP + 7d VIP fees
  7-Day Streak quest → 500 XP + permanent tier upgrade
  Refer a Friend quest → 200 XP per referral
  Streak leaderboard competition
  Share cards at day 3, 7, 14

EXIT: churn_rate < 0.25 for 2 weeks
```

### Playbook: LIQUIDITY_BOOST

**Trigger:** `maker_ratio < 0.25` for 5+ days

```
FEE SIDE:
  Maker rebate: -0.0001 (paid from YOUR margin)
  Safety: avg_taker_margin * taker_vol > rebate * maker_vol
  MM-like users (>70% maker ratio) → enhanced rebate: -0.00015
  Output: MM recruitment brief for operator

CAMPAIGN SIDE:
  Maker volume quest ($500K in 7d → 500 XP + permanent MM tier)
  Maker leaderboard

EXIT: maker_ratio > 0.30 for 7 days → reduce to maintenance rebate
```

### Playbook: ACQUISITION_PUSH

**Trigger:** `new_users_7d < target`

```
FEE SIDE:
  New users: base_fee + (default_margin * 0.5) for 7 days
  Detect daily → batch assign
  Aggressive promo referral (30% referee / 25% referrer)

CAMPAIGN SIDE:
  Onboarding Sprint (always-on):
    First Trade → 100 XP + 7d VIP / Deposit $100 → 100 XP + $5 credit
    Trade 3 Markets → 150 XP + badge / Share PnL → 50 XP + raffle
  New user volume leaderboard (weekly)
  Auto share cards on first profit

MEASURE: first_trade_latency <24h, 7d_activation >40%
```

### Playbook: REFERRAL_OPTIMIZE

**Trigger:** `referral_conversion < 0.10` OR weekly

```
AUDIT: GET /v1/referral/admin_info + rebate_summary

PER CODE:
  <5% conversion → deactivate
  5-15% → increase referee discount
  >15% → maintain or upgrade referrer to KOL tier
  >$500/mo referrer earnings → high-value, maintain

TIERS: Standard (20/10) / KOL (30/20) / Whale (40/15) / Promo (25/30, 14d max)

NOTE: referred BUILDER volume counts toward your aggregate tier volume.
Recruiting builders via distributor programme is a tier progression lever.
```

---

## Phase 4: REPORT

```
╔═══════════════════════════════════════════════════════════════════╗
║  GROWTH SCORECARD — {broker_name} — {date}                        ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  BUILDER TIER: {TIER}  base fee: {X} bps                         ║
║  Next tier:    {NEXT}  need: ${vol_gap} vol OR {n} $ORDER         ║
║  Progress:     {pct}% │ ETA: ~{n} days                           ║
║                                                                   ║
║  VOLUME                                                           ║
║    24h: ${v24}  7d avg: ${v7}  30d: ${v30}  trend: {↑↓}{pct}%    ║
║                                                                   ║
║  REVENUE                                                          ║
║    24h: ${r24}  30d: ${r30}  per user: ${rpu}  margin: {X} bps   ║
║    Maker ratio: {pct}%                                            ║
║                                                                   ║
║  USERS                                                            ║
║    Active 7d: {n} │ New 7d: {n} │ Dormant: {n} │ Retention: {p}% ║
║                                                                   ║
║  TIERS: Std {n} │ T2 {n} │ T3 {n} │ Gold {n} │ Plat {n} │ MM {n}║
║                                                                   ║
║  REFERRALS: {n} codes │ {pct}% conversion │ ${amt} 7d rebate     ║
║                                                                   ║
║  DISTRIBUTOR                                                      ║
║    Invitees: {n} total │ {n} active (7d)                          ║
║    Invitee volume 30d: ${vol}  ({pct}% of aggregate)              ║
║    Distributor revenue 30d: ${rev}                                ║
║    Aggregate volume: ${agg} ({pct}% of next tier)                 ║
║                                                                   ║
║  CAMPAIGNS: {n} active │ {pct}% quest completion                  ║
║    Competition: {name} — {n} participants                         ║
║                                                                   ║
║  ACTIONS: {playbook actions taken, or "None — all green"}         ║
║  TIER ADVISORY: {recommendation or "On track"}                    ║
║  ALERTS: {flags, or "All clear"}                                  ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

## Phase 5: MEASURE

```
CAMPAIGN ROI — all margin math uses builder tier base fee
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Playbook: {name} │ Duration: {n} days │ Tier: {tier} ({X} bps base)

Volume lift: {pct}%
Revenue delta: ${delta}
Cost: fee discounts ${d} + prizes ${p} + rebates ${r} = ${total}
ROI = (delta - total) / total = {pct}%

Tier Impact:
  Volume toward next tier: ${contributed}
  Tier progress: {before}% → {after}%
  If tier upgraded: "PERMANENT base fee reduction. Annual value: ${gain}"

VERDICT: REPEAT (>100%) / MODIFY (0-100%) / RETIRE (<0%)
```

---

## Social SDK Reference

### Packages

```
@orderly-social/sdk-core      ~8 KB   Framework-agnostic. Agents use this.
@orderly-social/sdk-react     ~5 KB   React hooks. DEX frontends.
@orderly-social/sdk-widgets   ~15 KB  Drop-in components. DEX frontends.
```

### Core Client Modules

| Module | Methods |
|---|---|
| `social.leaderboard` | `get`, `getMultiVenue`, `getUserRank`, `getUserHistory` |
| `social.quest` | `list`, `get`, `start`, `reportProgress`, `claim` |
| `social.campaign` | `list`, `get`, `create`, `update`, `join`, `progress`, `claim` |
| `social.team` | `list`, `get`, `create`, `update`, `delete`, `join`, `leave`, `invite`, `members` |
| `social.competition` | `list`, `get`, `getLeaderboard`, `enter`, `claim` |
| `social.share` | `createCard`, `getCard` |
| `social.user` | `getProfile`, `updateProfile`, `getStats`, `getAchievements`, `getBadges` |

Error types: `ApiError`, `AuthError`, `RateLimitError` (.retryAfter), `NetworkError`, `ValidationError`, `NotFoundError`. Token refresh automatic.

### React Hooks

`useOrderlySocial()` · `useLeaderboard(opts)` · `useQuests(opts)` · `useCampaigns()` · `useCompetition(id)` · `useTeams()` / `useMyTeam()` · `usePnLShareCard()` · `useAchievementShareCard()` · `useCompetitionShareCard()`

### Widgets

```tsx
<LeaderboardWidget type="TRADING" period="WEEKLY" showPodium maxEntries={10} />
<QuestPanel maxItems={5} showProgress />
<CompetitionWidget competitionId="weekly-pnl" showCountdown showTopTraders={5} />
<ShareButton type="pnl" data={{ pair: 'ETH-PERP', pnl: '+$1,234', side: 'LONG' }} />
<TeamLeaderboard competitionId="weekly-pnl" maxTeams={10} />
```

Styles: `import '@orderly-social/sdk-widgets/styles.css'`. Theme via `--os-color-*` CSS vars or `createTheme()`. All classes `os-` prefixed.

---

## Trading API Reference

```bash
# Fee Management
GET  /v1/broker/fee_rate/default
POST /v1/broker/fee_rate/default
POST /v1/broker/fee_rate/set  { account_ids, futures_maker_fee_rate, futures_taker_fee_rate }
GET  /v1/broker/fee_rate/users
GET  /v1/broker/user_info?account_id=

# Revenue & Volume
GET /v1/volume/broker/daily?start_date=&end_date=&aggregate_by=&order_tag=

# Referral
POST /v1/referral/create  { referral_code, referrer_rebate_rate, referee_discount_rate }
GET  /v1/referral/info
GET  /v1/referral/rebate_summary?start_date=&end_date=
GET  /v1/referral/admin_info?broker_id=

# Staking & VALOR
GET /v1/staking/info
GET /v1/valor/balance

# Campaigns (native)
GET /v1/public/campaign/check?address=&campaign_id=
GET /v1/public/campaign/ranking?campaign_id=&page=&size=
GET /v1/public/campaign/user?campaign_id=&address=
GET /v1/public/trading_rewards/epoch?epoch_id=
GET /v1/public/market_making_rewards/leaderboard?symbol=all
```

---

## Competitive Context

```
ORDERLY vs HYPERLIQUID — Builder Economics
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

                            Orderly (by tier)        Hyperliquid
Base fee (builder pays):    3.0 → 1.0 bps (staking) Fixed per-asset
Builder fee share:          100% above base          ~50% (HIP-3 deployer)
Per-user fee control:       Full API                 None
Builder tier progression:   5 tiers + staking        None
Distributor programme:      Recruit builders, earn   None
                            spread + volume credit
Tier assignment privilege:  Gold+ can gift tiers     None
Referral API:               Native                   Not available
Campaign SDK:               Orderly Social SDK       Not available
Dedicated AM:               Platinum+                None

$100M monthly volume, 5 bps user taker fee:
  PUBLIC:   2.00 bps margin × $100M = $20K/mo = $240K/yr
  GOLD:     2.50 bps margin × $100M = $25K/mo = $300K/yr
  DIAMOND:  4.00 bps margin × $100M = $40K/mo = $480K/yr
  HL HIP-3: ~50% of fees, less control, no progression

PLUS distributor revenue (not possible on Hyperliquid):
  Gold distributor with 5 Public invitees @ $10M each:
    5 × $10M × 0.50 bps = $2,500/mo extra revenue
    + 50M volume toward tier aggregate (free tier progression)
```

---

## Important Notes

- **All fee math is relative to your builder tier base fee.** Never hardcode — always derive from tier.
- Tier progression is the highest-ROI action. TIER_PUSH always takes priority.
- **Distributor Programme is the second-highest ROI action.** Every invitee adds permanent revenue + tier volume.
- Distributor binding is IMMUTABLE — share codes early, before invitee DEX graduation.
- An EOA registered as Distributor cannot later become a Builder Admin (and vice versa). Use dedicated wallets.
- At Gold+, you can assign favorable tier pricing to invitees — this is your competitive recruitment offer.
- Builder referral volume counts toward 30d aggregate — recruiting builders is a tier lever.
- Fee rates are TOTAL charged to users. Orderly takes base, you keep the spread.
- Broker rebates deposited daily to fee wallet (EOA, multisig planned).
- Campaign `order_tag` essential for attribution.
- Auto-pilot: max 2 playbooks/cycle, prefer no action over wrong action.
- VIP tiers sticky upward. Staking tier has 30-day grace on unstake.
- All keys in OS keychain — never in files, never exposed to AI.
- Log every action for operator audit trail.

## Companion Skills

| Skill | Role |
|---|---|
| `orderly-dex-builder` | Launch the DEX (prerequisite) |
| `orderly-data` | Market intelligence for fee/campaign timing |
| `orderly-trader` | Trade execution context |
| `orderly-vault` | OmniVault yield — campaign mechanic |
| `orderly-402` | Micropayments for premium features |
