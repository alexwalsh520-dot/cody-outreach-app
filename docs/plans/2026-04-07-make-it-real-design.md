# Make It Real — Design Doc

**Date:** 2026-04-07
**Goal:** 100 qualified fitness influencer emails per day, fully automated, no laptop required.

## What Exists Today

- `lead-gen/scout-test.js` (1,279 lines) — working pipeline: Apify discovery → profile enrichment → Haiku qualification → email waterfall → Supabase insert
- Auto-seeding from existing qualified leads (flywheel — never runs out)
- Supabase with 54 leads (23 email_ready, 28 youtube_only, 3 mgmt)
- Dashboard at cody-dashboard-gray.vercel.app (beautiful UI, mostly showing empty/fake data)
- Smartlead sync API route (working)

## What's Missing (4 things)

### 1. Move pipeline into the repo

`lead-gen/` currently lives as a sibling directory, not in the GitHub repo. Claude Code Cloud scheduled tasks clone a repo to run. Solution: move `lead-gen/` into the cody-outreach-app repo.

Files to move:
- `scout-test.js` → `lead-gen/scout-test.js`
- `config.json` → `lead-gen/config.json`
- `package.json` → `lead-gen/package.json`
- `.env.example` → `lead-gen/.env.example`
- `state/` → `lead-gen/state/`

DO NOT commit `.env` or `node_modules/`. Add to `.gitignore`.

### 2. Daily batch mode in scout-test.js

Add a `--daily-batch` flag that changes behavior to:

```
Phase 1: HARVEST
  - Query DataOverCoffee for any pending runs from yesterday
  - For each returned email, update the lead in Supabase (youtube_only → email_ready)
  - Count: harvested_emails

Phase 2: ACCUMULATE
  - Count today's email_ready leads (batch_date = today)
  - While count < 100:
    - Auto-pick a seed from qualified leads (not already used as seed today)
    - Run full pipeline: discover → enrich → qualify → email waterfall
    - Insert results to Supabase with batch_date = today
    - Update count
  - Each loop is one "seed cycle" (~50 discovered, ~6-10 emails)
  - Expect 15-20 cycles to hit 100

Phase 3: SUBMIT OVERNIGHT
  - Query all youtube_only leads from today (have YouTube channel, no email yet)
  - Submit their YouTube channels to DataOverCoffee actor
  - Store the Apify run ID so tomorrow's harvest can check it

Phase 4: LOG
  - Insert pipeline_run row with today's funnel totals
  - Insert usage_events rows:
    - apify: total CU/credits consumed (from Apify API usage endpoint)
    - haiku: total tokens * price (count during qualification calls)
    - dataovercoffee: channels_submitted * $0.12
  - Insert agent_event: "Daily batch complete: 100 emails, 34 youtube_only submitted to DOC"
```

### 3. Claude Code Cloud scheduled task

Create at claude.ai/code/scheduled:
- **Name:** Daily Lead Batch
- **Repo:** alexwalsh520-dot/cody-outreach-app
- **Schedule:** Daily at 6:00 AM PT
- **Environment:** Custom, with env vars:
  - APIFY_API_TOKEN
  - ANTHROPIC_API_KEY
  - YOUTUBE_API_KEY
  - SUPABASE_URL
  - SUPABASE_ANON_KEY
- **Prompt:** `cd lead-gen && npm install && node scout-test.js --daily-batch --target=100`
- **Network:** Full (needs Apify, YouTube, Anthropic, Supabase, Instagram profile URLs)

### 4. Dashboard overhaul

**Delete these pages:**
- `/office` — fake agent status cards, fake live feed
- `/calendar` — empty, shows nothing real

**Gut these pages:**
- `/usage` — rewire to read from real `usage_events` table (which the pipeline now populates)
- `/knowledge` — strip to just: lead table + CSV download (kill the agent docs/memories tabs)

**Redesign `/dashboard` to show only what matters:**

```
TOP BAR
  Left:  "Scout Lead Engine"
  Right: "Today: 87/100    April: $142"

METRICS ROW (4 cards)
  Today's Emails: 87        (email_ready where batch_date = today)
  Pending DOC: 22           (youtube_only submitted to DataOverCoffee)
  All-Time Leads: 847       (total email_ready + mgmt_email)
  Email Hit Rate: 43%       (emails / qualified across all runs)

PIPELINE FUNNEL (today's run)
  Discovered → In Range → Qualified → Emails Found
  (real numbers from today's pipeline_runs)

COST BREAKDOWN (this month)
  Apify: $XX | Haiku: $XX | DataOverCoffee: $XX | Total: $XX
  (summed from usage_events where created_at >= first of month)

RECENT RUNS (last 7 days)
  Table: date, seeds_used, discovered, qualified, emails, cost
  (from pipeline_runs table)

CSV DOWNLOAD
  Button: "Download Today's Batch (87 emails)"
  → exports email_ready leads where batch_date = today
  → columns: first_name, email, instagram_handle, follower_count, email_source
```

**TopBar changes:**
- Kill "Leads 54" / "Emails 26" / green "Online" dot
- Replace with: `Today: XX/100` (gold if >=100, white if in progress, red if run failed)
- Add: `April: $XXX` (month-to-date cost)

**Sidebar:**
- Dashboard (main screen)
- Leads (table + CSV download)
- Campaigns (keep as-is, real Smartlead data)
- Costs (renamed from Usage, shows real data)

4 pages total. That's it.

## What This Does NOT Include

- Smartlead push (auto-uploading leads to campaigns) — do this manually for now via CSV upload
- Reply tracking — Smartlead handles this, dashboard just syncs stats
- Email sequence writing — one sequence already exists, reuse it
- Discord notifications — nice-to-have, not blocking 100 emails/day

## Cost Estimate

Per day at 100 emails:
- Related profiles discovery: ~20 seeds * $0 (free credits) = ~$0
- Profile enrichment: ~500 profiles * $0.0023 = ~$1.15
- Haiku qualification: ~500 calls * ~$0.003 = ~$1.50
- Email waterfall (HTTP fetches): $0
- DataOverCoffee: ~30 channels * $0.12 = ~$3.60
- **Daily total: ~$6-7/day = ~$180-210/month**

Within the $150-300/month budget.
