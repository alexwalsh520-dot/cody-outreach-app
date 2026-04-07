'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import {
  Mail, Search, Crosshair, PenTool, TrendingUp, Brain,
  Globe, Link2, FileText, Tv2, Users,
} from 'lucide-react'
import { type LucideIcon } from 'lucide-react'

type Stats = {
  totalLeads: number
  mgmtEmails: number
  pendingScraper: number
  totalScraped: number
  emailRate: number
  emailSources: Record<string, number>
}

type ActivityEvent = {
  id: string
  agent: string
  event: string
  status: string
  created_at: string
}

type PipelineRun = {
  seed: string
  discovered: number
  in_range: number
  qualified: number
  emails_found: number
  youtube_channels: number
  created_at: string
}

type FunnelTotals = {
  discovered: number
  inRange: number
  qualified: number
  emailsFound: number
}

type AgentDef = { id: string; name: string; icon: LucideIcon; role: string; desc: string; active: boolean }

const agentDefs: AgentDef[] = [
  { id: 'scout', name: 'Scout', icon: Search, role: 'Discovery', desc: 'Finds similar Instagram accounts from seed profiles. Auto-seeds from the database.', active: true },
  { id: 'mason', name: 'Mason', icon: Crosshair, role: 'Qualification', desc: 'AI qualification (Haiku). Binary YES/NO. Validates emails, rejects brands and platforms.', active: true },
  { id: 'writer', name: 'Writer', icon: PenTool, role: 'Outreach', desc: 'Writes personalized cold email sequences. Pushes to Smartlead campaigns.', active: false },
  { id: 'tracker', name: 'Tracker', icon: TrendingUp, role: 'Replies', desc: 'Monitors Smartlead for replies. Updates lead status. Flags hot leads.', active: false },
  { id: 'cody', name: 'Cody', icon: Brain, role: 'Orchestrator', desc: 'Identifies the current constraint. Reassigns priorities. Weekly planning.', active: false },
]

const sourceColors: Record<string, string> = {
  ig_bio: '#c9a96e',
  linktree: '#34d399',
  landing_page: '#22d3ee',
  youtube_scraper: '#f472b6',
  other: '#6b7280',
}

const sourceNames: Record<string, string> = {
  ig_bio: 'Instagram Bio',
  linktree: 'Linktree',
  landing_page: 'Landing / Contact Page',
  youtube_scraper: 'YouTube (DataOverCoffee)',
  other: 'Other',
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [funnel, setFunnel] = useState<FunnelTotals | null>(null)
  const [activity, setActivity] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: leads } = await supabase
        .from('leads')
        .select('status, email, email_source, youtube_channel')

      if (leads) {
        const withEmail = leads.filter(l => l.email)
        const directEmails = withEmail.filter(l => l.status !== 'mgmt_email')
        const sources: Record<string, number> = {}
        withEmail.forEach(l => {
          const src = l.email_source || 'unknown'
          const key = src.startsWith('linktree') ? 'linktree' :
                      src.startsWith('landing') ? 'landing_page' :
                      src === 'dataovercoffee' ? 'youtube_scraper' :
                      src === 'ig_bio' ? 'ig_bio' : 'other'
          sources[key] = (sources[key] || 0) + 1
        })

        setStats({
          totalLeads: directEmails.length,
          mgmtEmails: leads.filter(l => l.status === 'mgmt_email').length,
          pendingScraper: leads.filter(l => l.status === 'youtube_only').length,
          totalScraped: leads.length,
          emailRate: leads.length > 0 ? Math.round((withEmail.length / leads.length) * 100) : 0,
          emailSources: sources,
        })
      }

      const { data: events } = await supabase
        .from('agent_events')
        .select('id, agent, event, status, created_at')
        .order('created_at', { ascending: false })
        .limit(8)
      if (events) setActivity(events as ActivityEvent[])

      // Pipeline funnel totals
      const { data: runs } = await supabase
        .from('pipeline_runs')
        .select('discovered, in_range, qualified, emails_found')
      if (runs && runs.length > 0) {
        setFunnel({
          discovered: runs.reduce((s, r) => s + (r.discovered || 0), 0),
          inRange: runs.reduce((s, r) => s + (r.in_range || 0), 0),
          qualified: runs.reduce((s, r) => s + (r.qualified || 0), 0),
          emailsFound: runs.reduce((s, r) => s + (r.emails_found || 0), 0),
        })
      }

      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[16px] font-semibold text-white/85">Dashboard</h1>
        <p className="text-[12px] text-white/30 mt-1">Lead generation overview</p>
      </div>

      {/* ─── Top Metrics ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
        <div className="card-gold rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-medium text-[#c9a96e]/50 uppercase tracking-[0.08em]">Total Leads</p>
            <Mail className="w-4 h-4 text-[#c9a96e]/25" strokeWidth={1.5} />
          </div>
          <p className="text-[32px] font-bold text-[#c9a96e] tracking-tight leading-none">{stats?.totalLeads ?? '..'}</p>
          <p className="text-[11px] text-white/20 mt-2">emailable contacts</p>
        </div>

        <div className="card rounded-xl p-5">
          <p className="text-[11px] font-medium text-white/30 uppercase tracking-[0.08em] mb-3">Management</p>
          <p className="text-[28px] font-bold text-white/70 tracking-tight leading-none">{stats?.mgmtEmails ?? '..'}</p>
          <p className="text-[11px] text-white/20 mt-2">agency / talent rep</p>
        </div>

        <div className="card rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-medium text-white/30 uppercase tracking-[0.08em]">Pending Scraper</p>
            <Tv2 className="w-4 h-4 text-white/10" strokeWidth={1.5} />
          </div>
          <p className="text-[28px] font-bold text-cyan-400/80 tracking-tight leading-none">{stats?.pendingScraper ?? '..'}</p>
          <p className="text-[11px] text-white/20 mt-2">YouTube channel → email</p>
        </div>

        <div className="card rounded-xl p-5">
          <p className="text-[11px] font-medium text-white/30 uppercase tracking-[0.08em] mb-3">Email Rate</p>
          <p className="text-[28px] font-bold text-white/85 tracking-tight leading-none">{stats ? `${stats.emailRate}%` : '..'}</p>
          <p className="text-[11px] text-white/20 mt-2">{stats ? `${stats.totalLeads + stats.mgmtEmails} of ${stats.totalScraped} profiles` : ''}</p>
        </div>
      </div>

      {/* ─── Pipeline Funnel ─── */}
      {funnel && funnel.discovered > 0 && (
        <div className="card rounded-xl p-5">
          <p className="text-[11px] font-semibold text-white/35 uppercase tracking-[0.1em] mb-5">Pipeline Funnel</p>
          <div className="space-y-3">
            {[
              { label: 'Discovered', value: funnel.discovered, color: '#6366f1' },
              { label: 'In Range (100K-2M)', value: funnel.inRange, color: '#8b5cf6' },
              { label: 'Qualified (Haiku)', value: funnel.qualified, color: '#22d3ee' },
              { label: 'Emails Found', value: funnel.emailsFound, color: '#c9a96e' },
            ].map((step, i, arr) => {
              const widthPct = funnel.discovered > 0 ? Math.max((step.value / funnel.discovered) * 100, 8) : 100
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* ─── Email Sources ─── */}
        <div className="card rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.05]">
            <p className="text-[11px] font-semibold text-white/35 uppercase tracking-[0.1em]">Where Emails Come From</p>
          </div>
          <div className="p-5 space-y-4">
            {stats && Object.entries(stats.emailSources)
              .sort(([, a], [, b]) => b - a)
              .map(([src, count], i) => {
                const total = stats.totalLeads + stats.mgmtEmails
                const pct = total > 0 ? Math.round((count / total) * 100) : 0
                return (
                  <div key={src}>
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-[12px] text-white/45">{sourceNames[src] || src}</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-[18px] font-bold text-white/70 tabular-nums font-mono">{count}</span>
                        <span className="text-[10px] text-white/20 font-mono">{pct}%</span>
                      </div>
                    </div>
                    <div className="h-[3px] bg-white/[0.04] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bar-animated"
                        style={{ width: `${pct}%`, background: sourceColors[src] || '#6b7280', opacity: 0.65, animationDelay: `${i * 100}ms` }}
                      />
                    </div>
                  </div>
                )
              })}
            {stats && Object.keys(stats.emailSources).length === 0 && (
              <p className="text-[12px] text-white/20 text-center py-4">No email data yet</p>
            )}
          </div>
        </div>

        {/* ─── Agents ─── */}
        <div className="card rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.05]">
            <p className="text-[11px] font-semibold text-white/35 uppercase tracking-[0.1em]">Agents</p>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {agentDefs.map((agent) => {
              const Icon = agent.icon
              return (
                <div key={agent.id} className="px-5 py-3.5 hover:bg-white/[0.015] transition-colors">
                  <div className="flex items-center gap-3 mb-1">
                    <Icon className={`w-4 h-4 ${agent.active ? 'text-[#c9a96e]/50' : 'text-white/15'}`} strokeWidth={1.6} />
                    <span className="text-[13px] font-semibold text-white/70">{agent.name}</span>
                    <span className="text-[10px] text-white/20">{agent.role}</span>
                    <span className={`ml-auto w-1.5 h-1.5 rounded-full ${agent.active ? 'bg-[#c9a96e]/50 live-dot' : 'bg-white/[0.08]'}`} />
                  </div>
                  <p className="text-[11px] text-white/25 leading-relaxed pl-7">{agent.desc}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* ─── Activity ─── */}
        <div className="card rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.05]">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-white/35 uppercase tracking-[0.1em]">Activity</p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/50 live-dot" />
                <span className="text-[10px] text-white/20">Live</span>
              </div>
            </div>
          </div>
          {loading ? (
            <div className="px-5 py-8 text-center text-white/20 text-[12px]">Loading...</div>
          ) : activity.length === 0 ? (
            <div className="px-5 py-8 text-center text-white/20 text-[12px]">No events yet</div>
          ) : (
            <div className="divide-y divide-white/[0.04] max-h-[400px] overflow-y-auto">
              {activity.map((e) => (
                <div key={e.id} className="px-5 py-3 hover:bg-white/[0.015] transition-colors">
                  <p className="text-[11px] text-white/45 leading-relaxed">{e.event}</p>
                  <p className="text-[10px] text-white/15 mt-1">
                    {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
