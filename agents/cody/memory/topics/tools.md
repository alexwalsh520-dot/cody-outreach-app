# Tools & Access

## Credentials
All stored at: /Users/alex/.openclaw/.secrets/cody-keys.json
- Smartlead API key
- Supabase URL + anon key
- GitHub username
- Vercel email

## Supabase Logger
Path: /Users/alex/.openclaw/workspace-cody/tools/supabase-logger.mjs
Usage: node tools/supabase-logger.mjs --agent cody --event "event_name" --data '{"key": "value"}'
Cost: $0 (pure HTTP call, no AI credits)

## Smartlead
API docs: https://api.smartlead.ai/
Used for: Email campaign management, sequence automation, reply tracking

## Supabase Dashboard
URL: https://esrztergmwrfyppaoagh.supabase.co
Used for: Real-time data, CC OS Outreach dashboard data source

## CC OS Outreach Dashboard
URL: https://cody-dashboard-31hwfm6xp-alexwalsh520-dots-projects.vercel.app
Tabs: Analytics, Knowledge Base, Calendar, Usage, Campaigns, Office (live)
Every significant action you take MUST be logged to Supabase so this stays live.
