-- CC OS Outreach - Initial Schema
-- Run this in Supabase SQL editor: https://app.supabase.com/project/esrztergmwrfyppaoagh/editor

-- ─────────────────────────────────────────────
-- Agent Events (powers the live Office tab)
-- ─────────────────────────────────────────────
create table if not exists agent_events (
  id uuid default gen_random_uuid() primary key,
  agent text not null,
  event text not null,
  data jsonb,
  status text default 'ok',
  created_at timestamptz default now()
);

alter table agent_events enable row level security;
create policy "Public read" on agent_events for select using (true);
create policy "Public insert" on agent_events for insert with check (true);

-- ─────────────────────────────────────────────
-- Leads Database
-- ─────────────────────────────────────────────
create table if not exists leads (
  id uuid default gen_random_uuid() primary key,
  first_name text,
  email text unique,
  instagram_username text,
  instagram_url text,
  followers integer,
  engagement_rate float,
  status text default 'new',
  campaign_id uuid,
  notes text,
  created_at timestamptz default now(),
  last_contacted_at timestamptz
);

alter table leads enable row level security;
create policy "Public read" on leads for select using (true);
create policy "Public insert" on leads for insert with check (true);
create policy "Public update" on leads for update using (true);

-- ─────────────────────────────────────────────
-- Campaigns
-- ─────────────────────────────────────────────
create table if not exists campaigns (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  status text default 'active',
  subject_line text,
  email_sequence jsonb,
  emails_sent integer default 0,
  opens integer default 0,
  replies integer default 0,
  positive_replies integer default 0,
  booked_calls integer default 0,
  signed_clients integer default 0,
  notes text,
  created_at timestamptz default now()
);

alter table campaigns enable row level security;
create policy "Public read" on campaigns for select using (true);
create policy "Public insert" on campaigns for insert with check (true);
create policy "Public update" on campaigns for update using (true);

-- ─────────────────────────────────────────────
-- Usage / Cost Tracking
-- ─────────────────────────────────────────────
create table if not exists usage_events (
  id uuid default gen_random_uuid() primary key,
  agent text not null,
  service text not null,
  description text,
  cost_usd float default 0,
  tokens_input integer,
  tokens_output integer,
  created_at timestamptz default now()
);

alter table usage_events enable row level security;
create policy "Public read" on usage_events for select using (true);
create policy "Public insert" on usage_events for insert with check (true);

-- ─────────────────────────────────────────────
-- Cron Jobs Registry
-- ─────────────────────────────────────────────
create table if not exists cron_jobs (
  id text primary key,
  agent text not null,
  name text not null,
  schedule text not null,
  enabled boolean default true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  last_status text,
  last_duration_ms integer,
  run_count integer default 0,
  created_at timestamptz default now()
);

alter table cron_jobs enable row level security;
create policy "Public read" on cron_jobs for select using (true);
create policy "Public insert" on cron_jobs for insert with check (true);
create policy "Public update" on cron_jobs for update using (true);

-- ─────────────────────────────────────────────
-- Enable Realtime for agent_events
-- ─────────────────────────────────────────────
alter publication supabase_realtime add table agent_events;

-- ─────────────────────────────────────────────
-- Seed Data (remove in production)
-- ─────────────────────────────────────────────
insert into campaigns (name, status, subject_line, emails_sent, opens, replies, positive_replies, booked_calls, signed_clients, notes) values
  ('Fitness Influencer Cold Outreach v1', 'active', 'Quick question about your coaching business', 847, 312, 43, 18, 6, 1, 'Testing curiosity-based subject lines vs direct offer. Curiosity winning by 22% open rate.'),
  ('Fitness Influencer Cold Outreach v2', 'active', 'I built something for creators like you', 423, 187, 29, 14, 5, 1, 'A/B vs v1 — shorter email, more direct CTA. Reply rate higher but positive reply rate lower.'),
  ('Re-engagement - No Reply 14d', 'active', 'Still thinking about it?', 156, 89, 12, 7, 3, 0, 'Targeting leads who opened but never replied. 7.7% reply rate is solid for a re-engage.')
on conflict do nothing;

insert into cron_jobs (id, agent, name, schedule, enabled, last_status, run_count) values
  ('scout-daily-scrape', 'scout', 'Daily Instagram Scrape', '0 6 * * *', true, 'success', 14),
  ('scout-verify-emails', 'scout', 'Email Verification Batch', '0 8 * * *', true, 'success', 14),
  ('writer-send-sequences', 'writer', 'Send Email Sequences', '0 9 * * 1-5', true, 'success', 10),
  ('tracker-check-replies', 'tracker', 'Check Smartlead Replies', '*/30 * * * *', true, 'success', 672),
  ('tracker-update-lead-status', 'tracker', 'Update Lead Statuses', '0 */2 * * *', true, 'success', 168),
  ('analyst-daily-report', 'analyst', 'Generate Daily Report', '0 20 * * *', true, 'success', 14),
  ('cody-constraint-review', 'cody', 'Constraint Review & Replan', '0 7 * * 1', true, 'success', 2)
on conflict do nothing;

insert into agent_events (agent, event, status) values
  ('scout', 'Scraped 47 new fitness influencer profiles from Instagram', 'ok'),
  ('scout', 'Verified 38 emails via MillionVerifier — 81% deliverable', 'ok'),
  ('writer', 'Queued 38 cold emails across 2 active campaigns', 'ok'),
  ('tracker', 'Detected 3 new replies — 2 positive, 1 unsubscribe', 'ok'),
  ('tracker', 'Updated 3 lead statuses: contacted → replied', 'ok'),
  ('cody', 'Constraint identified: email deliverability (open rate dropped 8%)', 'warning'),
  ('analyst', 'Daily report generated: $2.14 spend, 47 new leads, 3 replies', 'ok')
on conflict do nothing;
