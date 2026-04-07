'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import MetricCard from '@/components/MetricCard'
import { formatDistanceToNow } from 'date-fns'
import { Users, Mail, Tv2, CheckCircle2, UserCheck, ArrowRight } from 'lucide-react'

type LeadStats = {
  total: number
  emailReady: number
  mgmtEmail: number
  youtubeOnly: number
}

type ActivityEvent = {
  id: string
  agent: string
  event: string
  status: string
  created_at: string
}

type BatchStat = {
  date: string
  seed: string
  count: number
  emails: number
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<LeadStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<ActivityEvent[]>([])
  const [batches, setBatches] = useState<BatchStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: leads } = await supabase
        .from('leads')
        .select('status, email, youtube_channel, batch_date, source_detail')

      if (leads) {
        setStats({
          total: leads.length,
          emailReady: leads.filter(l => l.status === 'email_ready').length,
          mgmtEmail: leads.filter(l => l.status === 'mgmt_email').length,
          youtubeOnly: leads.filter(l => l.status === 'youtube_only').length,
        })

        const batchMap: Record<string, { count: number; emails: number; seed: string }> = {}
        leads.forEach(l => {
          const seed = (l.source_detail || '').replace('similar:', '') || 'unknown'
          const date = l.batch_date || 'unknown'
          const key = `${date}|${seed}`
          if (!batchMap[key]) batchMap[key] = { count: 0, emails: 0, seed }
          batchMap[key].count++
          if (l.email) batchMap[key].emails++
        })
        setBatches(
          Object.entries(batchMap)
            .map(([key, val]) => ({ date: key.split('|')[0], ...val }))
            .sort((a, b) => b.date.localeCompare(a.date))
        )
      }

      const { data: events } = await supabase
        .from('agent_events')
        .select('id, agent, event, status, created_at')
        .order('created_at', { ascending: false })
        .limit(12)

      if (events) setRecentActivity(events as ActivityEvent[])
      setLoading(false)
    }
    load()
  }, [])

  const emailRate = stats && stats.total > 0
    ? Math.round(((stats.emailReady + stats.mgmtEmail) / stats.total) * 100)
    : 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-[15px] font-semibold text-white/80 tracking-[0.01em]">Analytics</h1>
        <p className="text-[11px] text-white/15 mt-1">Pipeline performance across all batches</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 stagger">
        <MetricCard label="Total Leads" value={stats?.total ?? '..'} sub="all batches" icon={Users} />
        <MetricCard label="Email Ready" value={stats?.emailReady ?? '..'} sub="direct outreach" icon={Mail} accent="green" />
        <MetricCard label="Management" value={stats?.mgmtEmail ?? '..'} sub="agency route" icon={UserCheck} accent="gold" />
        <MetricCard label="YouTube Only" value={stats?.youtubeOnly ?? '..'} sub="pending DOC" icon={Tv2} accent="cyan" />
        <MetricCard label="Email Rate" value={stats ? `${emailRate}%` : '..'} sub={`${(stats?.emailReady ?? 0) + (stats?.mgmtEmail ?? 0)} of ${stats?.total ?? 0}`} icon={CheckCircle2} accent={emailRate >= 50 ? 'gold' : 'default'} />
      </div>

      {/* Two-column: Pipeline + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">

        {/* Pipeline breakdown — 2 cols */}
        <div className="lg:col-span-2 glass rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.03]">
            <p className="text-[10px] font-semibold text-white/20 uppercase tracking-[0.12em]">Pipeline Breakdown</p>
          </div>
          <div className="p-5 space-y-4">
            {stats && [
              { label: 'Email Ready', value: stats.emailReady, pct: Math.round((stats.emailReady / Math.max(stats.total, 1)) * 100), color: '#22c55e' },
              { label: 'Management', value: stats.mgmtEmail, pct: Math.round((stats.mgmtEmail / Math.max(stats.total, 1)) * 100), color: '#c9a96e' },
              { label: 'YouTube Only', value: stats.youtubeOnly, pct: Math.round((stats.youtubeOnly / Math.max(stats.total, 1)) * 100), color: '#06b6d4' },
            ].map((bar, i) => (
              <div key={bar.label}>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-[11px] text-white/30">{bar.label}</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[18px] font-bold text-white/70 tabular-nums font-mono">{bar.value}</span>
                    <span className="text-[10px] text-white/15 tabular-nums">{bar.pct}%</span>
                  </div>
                </div>
                <div className="h-[3px] bg-white/[0.03] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bar-animated"
                    style={{ width: `${bar.pct}%`, background: bar.color, opacity: 0.6, animationDelay: `${i * 150}ms` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Batches — 1 col */}
        <div className="lg:col-span-1 glass rounded-xl overflow-hidden">
          <div className="px-4 py-4 border-b border-white/[0.03]">
            <p className="text-[10px] font-semibold text-white/20 uppercase tracking-[0.12em]">Batches</p>
          </div>
          <div className="divide-y divide-white/[0.02]">
            {batches.length === 0 ? (
              <div className="px-4 py-8 text-center text-white/15 text-[11px]">No data</div>
            ) : (
              batches.slice(0, 7).map((b, i) => (
                <div key={i} className="px-4 py-2.5 hover:bg-white/[0.015] transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-white/40 font-medium truncate">@{b.seed}</span>
                    <div className="flex items-center gap-1.5">
                      {b.emails > 0 && (
                        <span className="text-[9px] font-mono text-[#c9a96e]/50 tabular-nums">{b.emails}</span>
                      )}
                      <span className="text-[9px] font-mono text-white/15 tabular-nums">/{b.count}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Activity Feed — 2 cols */}
        <div className="lg:col-span-2 glass rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.03]">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-white/20 uppercase tracking-[0.12em]">Activity</p>
              <div className="flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-emerald-500/40 live-dot" />
                <span className="text-[9px] text-white/10 uppercase tracking-wider">Live</span>
              </div>
            </div>
          </div>
          {loading ? (
            <div className="px-5 py-8 text-center text-white/15 text-[11px]">Loading...</div>
          ) : recentActivity.length === 0 ? (
            <div className="px-5 py-8 text-center text-white/15 text-[11px]">No events yet</div>
          ) : (
            <div className="divide-y divide-white/[0.02] max-h-[300px] overflow-y-auto">
              {recentActivity.map((event) => (
                <div key={event.id} className="px-5 py-3 flex items-start gap-3 hover:bg-white/[0.01] transition-colors">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#c9a96e]/40 mt-0.5 w-12 shrink-0">
                    {event.agent}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-white/35 leading-relaxed">{event.event}</p>
                    <p className="text-[10px] text-white/10 mt-0.5">
                      {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <span className={`w-1 h-1 rounded-full mt-2 shrink-0 ${
                    event.status === 'error' ? 'bg-red-400/60' : event.status === 'warning' ? 'bg-amber-400/40' : 'bg-white/10'
                  }`} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
