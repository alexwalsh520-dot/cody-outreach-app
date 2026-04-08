import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Types
export type AgentEvent = {
  id: string
  agent: string
  event: string
  data: Record<string, unknown> | null
  status: 'ok' | 'error' | 'warning'
  created_at: string
}

export type Lead = {
  id: string
  first_name: string | null
  first_name_verified: boolean | null
  first_name_sources: string | null
  full_name: string | null
  email: string | null
  email_source: string | null
  instagram_handle: string | null
  instagram_url: string | null
  follower_count: number | null
  engagement_rate: number | null
  status: string
  campaign_id: string | null
  notes: string | null
  bio: string | null
  business_category: string | null
  youtube_channel: string | null
  external_url: string | null
  source: string | null
  source_detail: string | null
  batch_date: string | null
  qualification_reasoning: string | null
  created_at: string
  last_contacted_at: string | null
}

export type Campaign = {
  id: string
  name: string
  status: 'active' | 'paused' | 'completed'
  subject_line: string | null
  email_sequence: unknown
  emails_sent: number
  opens: number
  replies: number
  positive_replies: number
  booked_calls: number
  signed_clients: number
  notes: string | null
  created_at: string
}

export type UsageEvent = {
  id: string
  agent: string
  service: string
  description: string | null
  cost_usd: number
  tokens_input: number | null
  tokens_output: number | null
  created_at: string
}

export type CronJob = {
  id: string
  agent: string
  name: string
  schedule: string
  enabled: boolean
  last_run_at: string | null
  next_run_at: string | null
  last_status: string | null
  last_duration_ms: number | null
  run_count: number
  created_at: string
}

export type Memory = {
  id: string
  agent: string
  file_path: string
  title: string
  content: string
  category: string
  updated_at: string
  created_at: string
}

// Agent definitions
export const AGENTS = [
  { id: 'cody', name: 'Cody', emoji: '🧠', role: 'Orchestrator' },
  { id: 'scout', name: 'Scout', emoji: '🔍', role: 'Lead Finder' },
  { id: 'writer', name: 'Writer', emoji: '✍️', role: 'Email Copywriter' },
  { id: 'tracker', name: 'Tracker', emoji: '📊', role: 'Reply Monitor' },
  { id: 'analyst', name: 'Analyst', emoji: '📈', role: 'Performance Analyst' },
]
