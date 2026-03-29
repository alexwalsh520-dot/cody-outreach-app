# TOOLS.md — Cody's Tool Notes

## Credentials
All stored at: /Users/alex/.openclaw/.secrets/cody-keys.json

Expected keys:
- `smartlead_api_key` — Smartlead campaign API
- `supabase_url` — Supabase project URL
- `supabase_anon_key` — Supabase anon/public key

## Supabase Logger
Path: /Users/alex/.openclaw/workspace-cody/tools/supabase-logger.mjs
Usage:
```bash
node tools/supabase-logger.mjs --agent cody --event "event_name" --data '{"key": "value"}'
```
Cost: $0 (pure HTTP call, no AI credits)
Table: agent_events

## Smartlead
API docs: https://api.smartlead.ai/
Used for: Email campaign management, sequence automation, reply tracking
Auth: Bearer token via smartlead_api_key

## Supabase
Dashboard: https://esrztergmwrfyppaoagh.supabase.co
Used for: Real-time pipeline data, CC OS Outreach dashboard source

## Web Search
Use web_search tool for lead research, competitor intel, influencer discovery.

## Browser
Use browser tool to scrape Instagram profiles, verify follower counts, check engagement.

## Shell / exec
Use exec tool to run Node scripts, call APIs directly, process CSV lead lists.
