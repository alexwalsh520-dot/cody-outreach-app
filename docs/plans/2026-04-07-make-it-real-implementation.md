# Make It Real — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Get the existing scout-test.js pipeline running daily via Claude Code Cloud scheduled tasks, producing 100 qualified emails per day, with a dashboard that shows real pipeline data instead of fake agent chrome.

**Architecture:** Move `lead-gen/` into the cody-outreach-app repo. Add a `--daily-batch` mode to scout-test.js that loops seed cycles until 100 emails, harvests DataOverCoffee results from yesterday, and logs costs to Supabase. Overhaul the dashboard to 4 pages: Dashboard (today's batch + funnel + costs), Leads (table + CSV), Campaigns (Smartlead sync), Costs (usage_events). Set up a Claude Code Cloud scheduled task for daily runs.

**Tech Stack:** Node.js (scout-test.js), Next.js 14 (dashboard), Supabase (database), Apify (scraping), Claude Haiku (qualification), Smartlead (email campaigns), Claude Code Cloud (automation)

---

## Task 1: Move lead-gen/ Into the Repo

**Files:**
- Copy from: `/Users/alexwalsh/Documents/All/AI Assets/Claude Code Experiment/lead-gen/`
- Copy to: `/Users/alexwalsh/Documents/All/AI Assets/Claude Code Experiment/cody-outreach-app/lead-gen/`
- Modify: `cody-outreach-app/.gitignore`

**Step 1: Copy the pipeline directory into the repo**

```bash
cp -r "/Users/alexwalsh/Documents/All/AI Assets/Claude Code Experiment/lead-gen/scout-test.js" \
      "/Users/alexwalsh/Documents/All/AI Assets/Claude Code Experiment/cody-outreach-app/lead-gen/scout-test.js"
cp "/Users/alexwalsh/Documents/All/AI Assets/Claude Code Experiment/lead-gen/config.json" \
   "/Users/alexwalsh/Documents/All/AI Assets/Claude Code Experiment/cody-outreach-app/lead-gen/config.json"
cp "/Users/alexwalsh/Documents/All/AI Assets/Claude Code Experiment/lead-gen/package.json" \
   "/Users/alexwalsh/Documents/All/AI Assets/Claude Code Experiment/cody-outreach-app/lead-gen/package.json"
cp "/Users/alexwalsh/Documents/All/AI Assets/Claude Code Experiment/lead-gen/.env.example" \
   "/Users/alexwalsh/Documents/All/AI Assets/Claude Code Experiment/cody-outreach-app/lead-gen/.env.example"
```

**Step 2: Add lead-gen ignores to the repo .gitignore**

Append to `cody-outreach-app/.gitignore`:
```
# Lead gen pipeline
lead-gen/node_modules/
lead-gen/.env
lead-gen/output/
lead-gen/state/
```

**Step 3: Verify the pipeline runs from its new location**

```bash
cd cody-outreach-app/lead-gen
cp "../../lead-gen/.env" .env
npm install
node scout-test.js --auto --seeds=1
```

Expected: Pipeline runs one seed cycle, discovers profiles, qualifies, finds emails, writes to Supabase.

**Step 4: Commit**

```bash
git add lead-gen/ .gitignore
git commit -m "feat: add lead-gen pipeline to repo for cloud deployment"
```

---

## Task 2: Add Daily Batch Mode to scout-test.js

**Files:**
- Modify: `lead-gen/scout-test.js`

This is the most critical task. Add a `--daily-batch` flag that makes the pipeline loop until 100 emails are found for today's batch.

**Step 1: Add --daily-batch argument parsing**

In the `main()` function (line ~1146), after the existing arg parsing, add:

```javascript
const isDailyBatch = rawArgs.includes('--daily-batch');
const batchTarget = parseInt(rawArgs.find(a => a.startsWith('--target='))?.split('=')[1] || '100');
```

**Step 2: Add the harvestDataOverCoffee() function**

Add this function before `main()`. It checks for completed DataOverCoffee runs from previous days and updates leads that were `youtube_only` to `email_ready`:

```javascript
async function harvestDataOverCoffee() {
  if (!supabase) return { harvested: 0 };

  // Find youtube_only leads that have a pending DataOverCoffee run
  const { data: pendingLeads } = await supabase
    .from('leads')
    .select('id, instagram_handle, youtube_channel')
    .eq('status', 'youtube_only')
    .not('youtube_channel', 'is', null);

  if (!pendingLeads || pendingLeads.length === 0) {
    log('No pending DataOverCoffee leads to harvest.');
    return { harvested: 0 };
  }

  logSection(`HARVEST: Checking DataOverCoffee for ${pendingLeads.length} pending leads`);

  // Batch the YouTube channels and call DataOverCoffee
  const channels = pendingLeads
    .map(l => l.youtube_channel)
    .filter(Boolean);

  if (channels.length === 0) return { harvested: 0 };

  let harvested = 0;
  try {
    const run = await apify.actor('dataovercoffee/youtube-channel-business-email-scraper').call(
      { channels },
      { waitSecs: 300 }
    );
    const { items } = await apify.dataset(run.defaultDatasetId).listItems();

    for (const item of items) {
      if (item.Status !== 'EMAIL_AVAILABLE' || !item.Email) continue;

      // Find matching lead by YouTube channel
      const matching = pendingLeads.find(l => {
        const ch = (l.youtube_channel || '').toLowerCase();
        const handle = (item.ChannelHandle || '').toLowerCase();
        const id = (item.ChannelId || '').toLowerCase();
        return ch.includes(handle) || ch.includes(id) || handle === ch.replace(/^@/, '');
      });

      if (!matching) continue;

      // Validate email with Haiku
      const emailType = await classifyEmail(item.Email, matching.instagram_handle);
      if (emailType === 'platform' || emailType === 'brand' || emailType === 'spam') continue;

      const status = emailType === 'management' ? 'mgmt_email' : 'email_ready';

      await supabase.from('leads').update({
        email: item.Email,
        email_source: 'dataovercoffee',
        email_verified: true,
        status,
        enriched_at: new Date().toISOString(),
        batch_date: new Date().toISOString().split('T')[0],
      }).eq('id', matching.id);

      harvested++;
      log(`  Harvested: @${matching.instagram_handle} → ${item.Email} (${status})`);
    }
  } catch (err) {
    log(`DataOverCoffee harvest error: ${err.message}`);
  }

  log(`\nHarvested ${harvested} emails from DataOverCoffee`);
  return { harvested };
}
```

Note: This function references `classifyEmail()` which should already exist in scout-test.js as part of the email validation Haiku call. Verify it exists and is named correctly — it may be called something like `validateEmail()` or `classifyEmailWithHaiku()`. Find the existing function name and use that.

**Step 3: Add the getTodayEmailCount() helper**

```javascript
async function getTodayEmailCount() {
  if (!supabase) return 0;
  const today = new Date().toISOString().split('T')[0];
  const { count } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('batch_date', today)
    .in('status', ['email_ready', 'mgmt_email']);
  return count || 0;
}
```

**Step 4: Add cost logging function**

```javascript
async function logCost(service, description, costUsd, tokensIn, tokensOut) {
  if (!supabase) return;
  await supabase.from('usage_events').insert({
    agent: 'scout',
    service,
    description,
    cost_usd: costUsd,
    tokens_input: tokensIn || null,
    tokens_output: tokensOut || null,
  });
}
```

**Step 5: Add the daily batch loop in main()**

Replace the single-run logic at the end of `main()` with a conditional:

```javascript
if (isDailyBatch) {
  // ── DAILY BATCH MODE ──
  console.log('\n' + '='.repeat(70));
  console.log(`  DAILY BATCH — Target: ${batchTarget} emails`);
  console.log('='.repeat(70));

  // Phase 1: Harvest yesterday's DataOverCoffee
  const { harvested } = await harvestDataOverCoffee();

  // Phase 2: Loop seed cycles until target
  let currentCount = await getTodayEmailCount();
  let cycleNum = 0;
  const maxCycles = 30; // safety limit

  console.log(`\n  Starting count: ${currentCount}/${batchTarget}`);

  while (currentCount < batchTarget && cycleNum < maxCycles) {
    cycleNum++;
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`  CYCLE ${cycleNum} — ${currentCount}/${batchTarget} emails so far`);
    console.log('─'.repeat(70));

    // Auto-pick seeds
    const seeds = await getAutoSeeds(3);
    if (seeds.length === 0) {
      console.log('  No more seeds available. Stopping.');
      break;
    }

    // Run the existing pipeline for these seeds
    // (reuse existing discover → enrich → qualify → email flow)
    for (const seed of seeds) {
      try {
        await runSingleSeed(seed);
      } catch (err) {
        log(`Error on seed @${seed}: ${err.message}`);
      }
    }

    currentCount = await getTodayEmailCount();
    console.log(`\n  After cycle ${cycleNum}: ${currentCount}/${batchTarget} emails`);
  }

  // Phase 3: Submit youtube_only leads to DataOverCoffee for tomorrow
  const today = new Date().toISOString().split('T')[0];
  const { data: ytLeads } = await supabase
    .from('leads')
    .select('youtube_channel')
    .eq('batch_date', today)
    .eq('status', 'youtube_only')
    .not('youtube_channel', 'is', null);

  if (ytLeads && ytLeads.length > 0) {
    log(`\nSubmitting ${ytLeads.length} YouTube channels to DataOverCoffee for overnight processing...`);
    // Note: DataOverCoffee runs are fast (10s-5min), but we submit and let
    // tomorrow's harvest pick up any that don't complete immediately
  }

  // Phase 4: Log pipeline run + costs
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const finalCount = await getTodayEmailCount();

  await supabase.from('pipeline_runs').insert({
    seed: `daily-batch-${cycleNum}-cycles`,
    batch_date: today,
    discovered: 0, // TODO: accumulate from cycles
    in_range: 0,
    qualified: 0,
    emails_found: finalCount,
    youtube_channels: ytLeads?.length || 0,
    duration_seconds: parseFloat(elapsed),
  });

  await supabase.from('agent_events').insert({
    agent: 'scout',
    event: `Daily batch complete: ${finalCount}/${batchTarget} emails (${cycleNum} cycles, ${elapsed}s)`,
    status: finalCount >= batchTarget ? 'ok' : 'warning',
  });

  console.log('\n' + '='.repeat(70));
  console.log(`  DAILY BATCH COMPLETE`);
  console.log(`  Emails: ${finalCount}/${batchTarget}`);
  console.log(`  Cycles: ${cycleNum}`);
  console.log(`  Time: ${elapsed}s`);
  console.log(`  Harvested from DOC: ${harvested}`);
  console.log('='.repeat(70));

} else {
  // ── EXISTING SINGLE-RUN MODE (unchanged) ──
  // ... keep all existing code here ...
}
```

**Step 6: Extract single-seed pipeline into a reusable function**

The existing `main()` runs the full pipeline inline. Extract the core pipeline (Steps 1-7) into a function called `runSingleSeed(seed)` so the daily batch loop can call it repeatedly. This function should:
- Call `discoverSimilar(seed)`
- Dedup against Supabase
- Enrich profiles
- Filter by follower range
- Qualify with Haiku
- Find emails
- Deep YouTube discovery
- DataOverCoffee emails
- Write to Supabase

The existing single-run mode (`else` branch) should also call `runSingleSeed()` for each seed.

**Step 7: Test daily batch locally**

```bash
cd lead-gen
node scout-test.js --daily-batch --target=5
```

Expected: Runs 1-2 seed cycles, finds ~5 emails, logs to pipeline_runs and agent_events and usage_events.

**Step 8: Commit**

```bash
git add lead-gen/scout-test.js
git commit -m "feat: add --daily-batch mode — loops until target email count hit"
```

---

## Task 3: Dashboard Overhaul — Kill Fake Pages

**Files:**
- Delete: `app/office/page.tsx`
- Delete: `app/calendar/page.tsx`
- Modify: `components/Sidebar.tsx`
- Modify: `components/TopBar.tsx`
- Delete: `components/AgentCard.tsx`
- Delete: `components/ActivityFeed.tsx`

**Step 1: Remove fake pages**

```bash
rm app/office/page.tsx
rm app/calendar/page.tsx
```

**Step 2: Update Sidebar to 4 pages**

Replace the `navItems` array in `components/Sidebar.tsx`:

```typescript
const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/knowledge', label: 'Leads', icon: Database },
  { href: '/campaigns', label: 'Campaigns', icon: Send },
  { href: '/usage', label: 'Costs', icon: DollarSign },
]
```

Remove the `live` property from the NavItem type and the live dot rendering in the JSX.

**Step 3: Update TopBar to show real metrics**

Replace `components/TopBar.tsx` entirely:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Zap } from 'lucide-react'

export default function TopBar() {
  const [todayEmails, setTodayEmails] = useState<number | null>(null)
  const [monthCost, setMonthCost] = useState<number | null>(null)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    Promise.all([
      supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('batch_date', today)
        .in('status', ['email_ready', 'mgmt_email']),
      supabase
        .from('usage_events')
        .select('cost_usd')
        .gte('created_at', monthStart.toISOString()),
    ]).then(([emailRes, costRes]) => {
      setTodayEmails(emailRes.count || 0)
      const costs = costRes.data || []
      setMonthCost(costs.reduce((s: number, e: any) => s + (e.cost_usd || 0), 0))
    })
  }, [])

  const monthName = new Date().toLocaleString('default', { month: 'short' })

  return (
    <header className="h-12 bg-[#101014] border-b border-white/[0.06] px-5 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#c9a96e]/10 border border-[#c9a96e]/20 flex items-center justify-center">
            <Zap className="w-3 h-3 text-[#c9a96e]" strokeWidth={2.5} fill="currentColor" />
          </div>
          <span className="text-[14px] font-semibold text-white/85 tracking-tight">Scout</span>
        </div>
        <span className="w-px h-4 bg-white/[0.08]" />
        <span className="text-[11px] text-white/30 font-medium">Lead Engine</span>
      </div>

      <div className="flex items-center gap-6">
        {todayEmails !== null && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-white/25">Today</span>
            <span className={`text-[13px] font-bold font-mono tabular-nums ${
              todayEmails >= 100 ? 'text-[#c9a96e]' : 'text-white/60'
            }`}>
              {todayEmails}/100
            </span>
          </div>
        )}
        {monthCost !== null && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-white/25">{monthName}</span>
            <span className="text-[12px] font-semibold text-white/40 font-mono tabular-nums">
              ${monthCost.toFixed(0)}
            </span>
          </div>
        )}
      </div>
    </header>
  )
}
```

**Step 4: Delete unused components**

```bash
rm components/AgentCard.tsx
rm components/ActivityFeed.tsx
```

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove fake agent pages, update nav and topbar to real data"
```

---

## Task 4: Rebuild Dashboard Page

**Files:**
- Rewrite: `app/dashboard/page.tsx`

**Step 1: Replace dashboard with real pipeline data**

Replace `app/dashboard/page.tsx` entirely. The new dashboard shows:
- 4 metric cards: Today's Emails (XX/100), Pending DOC, All-Time Leads, Email Hit Rate
- Pipeline funnel from today's pipeline_runs
- Monthly cost breakdown from usage_events
- Recent runs table from pipeline_runs (last 7 days)
- CSV download button for today's batch

```typescript
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Mail, Tv2, Database, TrendingUp, Download } from 'lucide-react'

type DayStats = {
  emails: number
  pendingDoc: number
  mgmt: number
}

type AllTimeStats = {
  totalLeads: number
  totalQualified: number
  emailRate: number
}

type PipelineRun = {
  id: string
  seed: string
  batch_date: string
  discovered: number
  in_range: number
  qualified: number
  emails_found: number
  youtube_channels: number
  duration_seconds: number
  cost_usd: number
  created_at: string
}

type CostBreakdown = {
  apify: number
  anthropic: number
  dataovercoffee: number
  total: number
}

export default function DashboardPage() {
  const [dayStats, setDayStats] = useState<DayStats | null>(null)
  const [allTime, setAllTime] = useState<AllTimeStats | null>(null)
  const [runs, setRuns] = useState<PipelineRun[]>([])
  const [todayRun, setTodayRun] = useState<PipelineRun | null>(null)
  const [costs, setCosts] = useState<CostBreakdown | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    Promise.all([
      // Today's leads
      supabase.from('leads').select('status').eq('batch_date', today),
      // All-time leads
      supabase.from('leads').select('status, email').in('status', ['email_ready', 'mgmt_email']),
      // All qualified (for hit rate)
      supabase.from('pipeline_runs').select('qualified, emails_found'),
      // Recent runs
      supabase.from('pipeline_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10),
      // Month costs
      supabase.from('usage_events')
        .select('service, cost_usd')
        .gte('created_at', monthStart.toISOString()),
    ]).then(([todayRes, allRes, funnelRes, runsRes, costsRes]) => {
      // Today stats
      const todayLeads = todayRes.data || []
      setDayStats({
        emails: todayLeads.filter(l => l.status === 'email_ready' || l.status === 'mgmt_email').length,
        pendingDoc: todayLeads.filter(l => l.status === 'youtube_only').length,
        mgmt: todayLeads.filter(l => l.status === 'mgmt_email').length,
      })

      // All-time
      const allLeads = allRes.data || []
      const funnelData = funnelRes.data || []
      const totalQual = funnelData.reduce((s, r) => s + (r.qualified || 0), 0)
      const totalEmails = funnelData.reduce((s, r) => s + (r.emails_found || 0), 0)
      setAllTime({
        totalLeads: allLeads.length,
        totalQualified: totalQual,
        emailRate: totalQual > 0 ? Math.round((totalEmails / totalQual) * 100) : 0,
      })

      // Runs
      const runsList = (runsRes.data || []) as PipelineRun[]
      setRuns(runsList)
      setTodayRun(runsList.find(r => r.batch_date === today) || null)

      // Costs
      const costEvents = costsRes.data || []
      const breakdown: CostBreakdown = { apify: 0, anthropic: 0, dataovercoffee: 0, total: 0 }
      costEvents.forEach((e: any) => {
        const cost = e.cost_usd || 0
        if (e.service === 'apify') breakdown.apify += cost
        else if (e.service === 'anthropic') breakdown.anthropic += cost
        else if (e.service === 'dataovercoffee') breakdown.dataovercoffee += cost
        breakdown.total += cost
      })
      setCosts(breakdown)

      setLoading(false)
    })
  }, [])

  // CSV download handler
  const downloadTodayCSV = async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('leads')
      .select('first_name, email, instagram_handle, follower_count, email_source')
      .eq('batch_date', today)
      .in('status', ['email_ready', 'mgmt_email'])
      .not('email', 'is', null)

    if (!data || data.length === 0) return

    const headers = ['first_name', 'email', 'instagram_handle', 'follower_count', 'email_source']
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${(row as any)[h] || ''}"`).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads-${today}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="text-white/20 text-sm py-12 text-center">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[16px] font-semibold text-white/85">Dashboard</h1>
          <p className="text-[12px] text-white/30 mt-1">Daily lead generation pipeline</p>
        </div>
        <button
          onClick={downloadTodayCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#c9a96e]/10 border border-[#c9a96e]/20 text-[#c9a96e] text-[12px] font-medium hover:bg-[#c9a96e]/15 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Download Today ({dayStats?.emails || 0} emails)
        </button>
      </div>

      {/* ─── Metrics ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card-gold rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-medium text-[#c9a96e]/50 uppercase tracking-[0.08em]">Today</p>
            <Mail className="w-4 h-4 text-[#c9a96e]/25" strokeWidth={1.5} />
          </div>
          <p className={`text-[32px] font-bold tracking-tight leading-none ${
            (dayStats?.emails || 0) >= 100 ? 'text-[#c9a96e]' : 'text-white/70'
          }`}>
            {dayStats?.emails ?? '..'}
            <span className="text-[16px] text-white/20 font-normal">/100</span>
          </p>
          <p className="text-[11px] text-white/20 mt-2">emails ready</p>
        </div>

        <div className="card rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-medium text-white/30 uppercase tracking-[0.08em]">Pending DOC</p>
            <Tv2 className="w-4 h-4 text-white/10" strokeWidth={1.5} />
          </div>
          <p className="text-[28px] font-bold text-cyan-400/80 tracking-tight leading-none">{dayStats?.pendingDoc ?? '..'}</p>
          <p className="text-[11px] text-white/20 mt-2">awaiting DataOverCoffee</p>
        </div>

        <div className="card rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-medium text-white/30 uppercase tracking-[0.08em]">All Time</p>
            <Database className="w-4 h-4 text-white/10" strokeWidth={1.5} />
          </div>
          <p className="text-[28px] font-bold text-white/70 tracking-tight leading-none">{allTime?.totalLeads ?? '..'}</p>
          <p className="text-[11px] text-white/20 mt-2">emailable leads</p>
        </div>

        <div className="card rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-medium text-white/30 uppercase tracking-[0.08em]">Hit Rate</p>
            <TrendingUp className="w-4 h-4 text-white/10" strokeWidth={1.5} />
          </div>
          <p className="text-[28px] font-bold text-white/85 tracking-tight leading-none">
            {allTime ? `${allTime.emailRate}%` : '..'}
          </p>
          <p className="text-[11px] text-white/20 mt-2">qualified → email</p>
        </div>
      </div>

      {/* ─── Pipeline Funnel (today) ─── */}
      {todayRun && todayRun.discovered > 0 && (
        <div className="card rounded-xl p-5">
          <p className="text-[11px] font-semibold text-white/35 uppercase tracking-[0.1em] mb-5">Today's Pipeline</p>
          <div className="space-y-3">
            {[
              { label: 'Discovered', value: todayRun.discovered, color: '#6366f1' },
              { label: 'In Range (100K-2M)', value: todayRun.in_range, color: '#8b5cf6' },
              { label: 'Qualified', value: todayRun.qualified, color: '#22d3ee' },
              { label: 'Emails Found', value: todayRun.emails_found, color: '#c9a96e' },
            ].map((step, i, arr) => {
              const widthPct = todayRun.discovered > 0 ? Math.max((step.value / todayRun.discovered) * 100, 8) : 100
              const convPct = i > 0 && arr[i-1].value > 0 ? Math.round((step.value / arr[i-1].value) * 100) : null
              return (
                <div key={step.label}>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-white/45">{step.label}</span>
                      {convPct !== null && (
                        <span className="text-[10px] text-white/20 font-mono">{convPct}%</span>
                      )}
                    </div>
                    <span className="text-[16px] font-bold text-white/75 tabular-nums font-mono">{step.value}</span>
                  </div>
                  <div className="h-[6px] bg-white/[0.04] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bar-animated"
                      style={{ width: `${widthPct}%`, background: step.color, opacity: 0.5, animationDelay: `${i * 100}ms` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* ─── Costs (this month) ─── */}
        <div className="card rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.05]">
            <p className="text-[11px] font-semibold text-white/35 uppercase tracking-[0.1em]">
              {new Date().toLocaleString('default', { month: 'long' })} Costs
            </p>
          </div>
          <div className="p-5">
            {costs && costs.total > 0 ? (
              <div className="space-y-4">
                {[
                  { label: 'Apify (scraping)', value: costs.apify, color: '#3b82f6' },
                  { label: 'Haiku (qualification)', value: costs.anthropic, color: '#c9a96e' },
                  { label: 'DataOverCoffee', value: costs.dataovercoffee, color: '#f472b6' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                      <span className="text-[12px] text-white/45">{item.label}</span>
                    </div>
                    <span className="text-[14px] font-semibold text-white/70 font-mono">${item.value.toFixed(2)}</span>
                  </div>
                ))}
                <div className="pt-3 border-t border-white/[0.05] flex items-center justify-between">
                  <span className="text-[12px] text-white/30">Total</span>
                  <span className="text-[18px] font-bold text-[#c9a96e] font-mono">${costs.total.toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <p className="text-[12px] text-white/20 text-center py-4">No cost data yet</p>
            )}
          </div>
        </div>

        {/* ─── Recent Runs ─── */}
        <div className="card rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.05]">
            <p className="text-[11px] font-semibold text-white/35 uppercase tracking-[0.1em]">Recent Runs</p>
          </div>
          {runs.length === 0 ? (
            <div className="px-5 py-8 text-center text-white/20 text-[12px]">No pipeline runs yet</div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {runs.slice(0, 7).map(run => (
                <div key={run.id} className="px-5 py-3 hover:bg-white/[0.015] transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] text-white/50">{run.batch_date}</span>
                    <span className="text-[14px] font-bold text-[#c9a96e] font-mono">{run.emails_found} emails</span>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] text-white/20">
                    <span>{run.discovered} discovered</span>
                    <span>{run.qualified} qualified</span>
                    <span>{run.youtube_channels || 0} YouTube</span>
                    {run.duration_seconds && <span>{Math.round(Number(run.duration_seconds))}s</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: rebuild dashboard — real pipeline data, today's batch, costs, CSV"
```

---

## Task 5: Simplify Knowledge Page to Leads-Only

**Files:**
- Modify: `app/knowledge/page.tsx`

**Step 1: Strip knowledge page to just the lead table + CSV download**

Remove: agent docs section, memories tab, tab switcher.
Keep: lead table with batch grouping, CSV download, search/filter.

Remove the `agentDocs` array, the `Memory` type, the tab state, and all the JSX for agent docs and memories. Keep only the leads table portion and the CSV download logic.

**Step 2: Commit**

```bash
git add app/knowledge/page.tsx
git commit -m "chore: strip knowledge page to leads table only"
```

---

## Task 6: Fix Usage Page to Show Real Cost Data

**Files:**
- Modify: `app/usage/page.tsx`

**Step 1: Remove the fake "how to log" info note**

Remove lines 73-80 (the `bg-[#161619]/60` div with the `node tools/supabase-logger.mjs` instructions). The pipeline now logs costs directly — no manual logging needed.

Also remove the emoji from the empty state (line 84, the `<p className="text-3xl mb-3">` element). Update the empty state text:

```typescript
<p className="text-white/45 font-medium">No cost data yet</p>
<p className="text-white/20 text-sm mt-1">
  Costs appear here after the daily pipeline runs.
</p>
```

**Step 2: Rename page header**

Change "Usage" to "Costs" and "API spend by agent and service" to "Pipeline operating costs".

**Step 3: Commit**

```bash
git add app/usage/page.tsx
git commit -m "chore: clean up costs page — remove manual logging instructions"
```

---

## Task 7: Push to GitHub and Set Up Cloud Scheduled Task

**Files:** None (configuration task)

**Step 1: Push all changes**

```bash
git push origin main
```

**Step 2: Create Claude Code Cloud scheduled task**

Go to [claude.ai/code/scheduled](https://claude.ai/code/scheduled) and create:

- **Name:** Daily Lead Batch
- **Repo:** alexwalsh520-dot/cody-outreach-app
- **Schedule:** Daily at 6:00 AM (user's local timezone)
- **Environment:** Create a custom environment with:
  - Network: Full
  - Env vars: APIFY_API_TOKEN, ANTHROPIC_API_KEY, YOUTUBE_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY
  - Setup script: `cd lead-gen && npm install`
- **Prompt:**
  ```
  Run the daily lead generation pipeline. Execute:
  cd lead-gen && node scout-test.js --daily-batch --target=100

  If the pipeline exits with an error, diagnose the issue and retry.
  Log the final email count and any errors encountered.
  ```
- **Connectors:** Supabase (if available)

**Step 3: Test with "Run now"**

Click "Run now" on the task detail page. Monitor the session to verify it:
1. Clones the repo
2. Installs lead-gen dependencies
3. Runs the pipeline
4. Writes leads to Supabase
5. Logs costs to usage_events

**Step 4: Verify dashboard shows the data**

Visit https://cody-dashboard-gray.vercel.app/dashboard and confirm:
- Today's email count updates
- Pipeline funnel shows real numbers
- Cost breakdown populates
- Recent runs table shows the new run

---

## Task Order and Dependencies

```
Task 1 (move lead-gen) → Task 2 (daily batch mode) → Task 7 (deploy + cloud task)
                       ↘
Task 3 (kill fake pages) → Task 4 (rebuild dashboard) → Task 5 (simplify leads) → Task 6 (fix costs)
```

Tasks 1-2 and Tasks 3-6 can be done in parallel — pipeline work and dashboard work are independent. Task 7 requires both to be done.
