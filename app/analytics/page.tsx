'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import MetricCard from '@/components/MetricCard'
import { formatDistanceToNow } from 'date-fns'
import { Users, Mail, Tv2, CheckCircle2, UserCheck } from 'lucide-react'

type LeadStats = { total: number; emailReady: number; mgmtEmail: number; youtubeOnly: number }
type ActivityEvent = { id: string; agent: string; event: string; status: string; created_at: string }
type BatchStat = { date: string; seed: string; count: number; emails: number }

const agentColors: Record<string, string> = {
  scout: 'text-cyan-400/70',
  cody: 'text-[#c9a96e]',
  writer: 'text-purple-400/70',
  tracker: 'text-orange-400/70',
  analyst: 'text-amber-400/70',
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<LeadStats | null>(null)
  const [activity, setActivity] = useState<ActivityEvent[]>([])
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

        const bm: Record<string, { count: number; emails: number; seed: string }> = {}
        leads.forEach(l => {
          const seed = (l.source_detail || '').replace('similar:', '') || '?'
          const date = l.batch_date || '?'
          const k = `${date}|${seed}`
          if (!bm[k]) bm[k] = { count: 0, emails: 0, seed }
          bm[k].count++
          if (l.email) bm[k].emails++
        })
        setBatches(Object.entries(bm).map(([k, v]) => ({ date: k.split('|')[0], ...v })).sort((a, b) => b.date.localeCompare(a.date)))
      }

      const { data: events } = await supabase
        .from('agent_events')
        .select('id, agent, event, status, created_at')
        .order('created_at', { ascending: false })
        .limit(10)
      if (events) setActivity(events as ActivityEvent[])
      setLoading(false)
    }
    load()
  }, [])

  const emailRate = stats && stats.total > 0
    ? Math.round(((stats.emailReady + stats.mgmtEmail) / stats.total) * 100)
    : 0

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-[16px] font-semibold text-white/85">Analytics</h1>
        <p className="text-[12px] text-white/30 mt-1">Pipeline performance across all batches</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 stagger">
        <MetricCard label="Total Leads" value={stats?.total ?? '..'} sub="all batches" icon={Users} />
        <MetricCard label="Email Ready" value={stats?.emailReady ?? '..'} sub="direct outreach" icon={Mail} accent="green" />
        <MetricCard label="Management" value={stats?.mgmtEmail ?? '..'} sub="agency route" icon={UserCheck} accent="gold" />
        <MetricCard label="YouTube Only" value={stats?.youtubeOnly ?? '..'} sub="pending DOC" icon={Tv2} accent="cyan" />
        <MetricCard label="Email Rate" value={stats ? `${emailRate}%` : '..'} sub={`${(stats?.emailReady ?? 0) + (stats?.mgmtEmail ?? 0)} of ${stats?.total ?? 0}`} icon={CheckCircle2} accent={emailRate >= 50 ? 'gold' : 'default'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {/* Pipeline breakdown */}
        <div className="lg:col-span-2 card rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.05]">
            <p className="text-[11px] font-semibold text-white/35 uppercase tracking-[0.1em]">Pipeline Breakdown</p>
          </div>
          <div className="p-5 space-y-5">
            {stats && [
              { label: 'Email Ready', value: stats.emailReady, pct: Math.round((stats.emailReady / Math.max(stats.total, 1)) * 100), color: '#34d399' },
              { label: 'Management', value: stats.mgmtEmail, pct: Math.round((stats.mgmtEmail / Math.max(stats.total, 1)) * 100), color: '#c9a96e' },
              { label: 'YouTube Only', value: stats.youtubeOnly, pct: Math.round((stats.youtubeOnly / Math.max(stats.total, 1)) * 100), color: '#22d3ee' },
            ].map((bar, i) => (
              <div key={bar.label}>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-[12px] text-white/40">{bar.label}</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[20px] font-bold text-white/75 tabular-nums font-mono">{bar.value}</span>
                    <span className="text-[11px] text-white/20 font-mono">{bar.pct}%</span>
                  </div>
                </div>
                <div className="h-[4px] bg-white/[0.04] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bar-animated"
                    style={{ width: `${bar.pct}%`, background: bar.color, opacity: 0.65, animationDelay: `${i * 120}ms` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent batches */}
        <div className="lg:col-span-1 card rounded-xl overflow-hidden">
          <div className="px-4 py-4 border-b border-white/[0.05]">
            <p className="text-[11px] font-semibold text-white/35 uppercase tracking-[0.1em]">Batches</p>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {batches.length === 0 ? (
              <div className="px-4 py-8 text-center text-white/20 text-[12px]">No batches</div>
            ) : (
              batches.slice(0, 8).map((b, i) => (
                <div key={i} className="px-4 py-3 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[12px] text-white/55 font-medium">@{b.seed}</span>
                      <p className="text-[10px] text-white/20 mt-0.5">{b.date}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-right">
                      {b.emails > 0 && (
                        <span className="text-[10px] font-mono font-medium text-[#c9a96e]/70">{b.emails}e</span>
                      )}
                      <span className="text-[10px] font-mono text-white/20">{b.count}t</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Activity */}
        <div className="lg:col-span-2 card rounded-xl overflow-hidden">
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
            <div className="divide-y divide-white/[0.04] max-h-[320px] overflow-y-auto">
              {activity.map((e) => (
                <div key={e.id} className="px-5 py-3 flex items-start gap-3 hover:bg-white/[0.015] transition-colors">
                  <span className={`text-[10px] font-semibold uppercase tracking-wider mt-0.5 w-14 shrink-0 ${agentColors[e.agent] || 'text-white/30'}`}>
                    {e.agent}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-white/45 leading-relaxed">{e.event}</p>
                    <p className="text-[10px] text-white/15 mt-0.5">
                      {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                    </p>
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
