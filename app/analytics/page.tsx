'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import MetricCard from '@/components/MetricCard'
import { formatDistanceToNow } from 'date-fns'
import { Users, Mail, Tv2, Clock, AlertTriangle, CheckCircle2, Send, UserCheck } from 'lucide-react'

type LeadStats = {
  total: number
  emailReady: number
  mgmtEmail: number
  youtubeOnly: number
  withTv2: number
}

type ActivityEvent = {
  id: string
  agent: string
  event: string
  status: string
  data: Record<string, unknown> | null
  created_at: string
}

type BatchStat = {
  date: string
  seed: string
  count: number
  emails: number
}

const agentIcons: Record<string, string> = {
  scout: 'text-cyan-400',
  cody: 'text-gold',
  writer: 'text-purple-400',
  tracker: 'text-orange-400',
  analyst: 'text-yellow-400',
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<LeadStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<ActivityEvent[]>([])
  const [batches, setBatches] = useState<BatchStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      // Lead stats — count by status
      const { data: leads } = await supabase
        .from('leads')
        .select('status, email, youtube_channel, batch_date, source_detail')

      if (leads) {
        setStats({
          total: leads.length,
          emailReady: leads.filter(l => l.status === 'email_ready').length,
          mgmtEmail: leads.filter(l => l.status === 'mgmt_email').length,
          youtubeOnly: leads.filter(l => l.status === 'youtube_only').length,
          withTv2: leads.filter(l => l.youtube_channel).length,
        })

        // Batch stats
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

      // Recent activity
      const { data: events } = await supabase
        .from('agent_events')
        .select('id, agent, event, status, data, created_at')
        .order('created_at', { ascending: false })
        .limit(15)

      if (events) setRecentActivity(events as ActivityEvent[])
      setLoading(false)
    }
    load()
  }, [])

  const emailRate = stats && stats.total > 0
    ? Math.round(((stats.emailReady + stats.mgmtEmail) / stats.total) * 100)
    : 0

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-lg font-bold text-white/90">Analytics</h1>
        <p className="text-[12px] text-white/25 mt-0.5">Pipeline performance and lead flow</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <MetricCard
          label="Total Leads"
          value={stats?.total ?? '..'}
          sub="all batches"
          icon={Users}
          accent="default"
        />
        <MetricCard
          label="Email Ready"
          value={stats?.emailReady ?? '..'}
          sub="direct contact"
          icon={Mail}
          accent="green"
        />
        <MetricCard
          label="Mgmt Email"
          value={stats?.mgmtEmail ?? '..'}
          sub="agency/talent"
          icon={UserCheck}
          accent="gold"
        />
        <MetricCard
          label="YouTube Only"
          value={stats?.youtubeOnly ?? '..'}
          sub="DataOverCoffee pending"
          icon={Tv2}
          accent="cyan"
        />
        <MetricCard
          label="Email Rate"
          value={stats ? `${emailRate}%` : '..'}
          sub={`${(stats?.emailReady ?? 0) + (stats?.mgmtEmail ?? 0)} / ${stats?.total ?? 0}`}
          icon={CheckCircle2}
          accent={emailRate > 40 ? 'green' : 'default'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Pipeline breakdown */}
        <div className="glass rounded-xl p-5">
          <p className="text-[12px] font-semibold text-white/40 uppercase tracking-wider mb-4">Pipeline Status</p>
          {!stats ? (
            <div className="py-6 text-center text-white/20 text-[12px]">Loading...</div>
          ) : (
            <div className="space-y-3">
              {[
                { label: 'Email Ready', value: stats.emailReady, color: 'bg-emerald-500', total: stats.total },
                { label: 'Management', value: stats.mgmtEmail, color: 'bg-amber-500', total: stats.total },
                { label: 'YouTube Only', value: stats.youtubeOnly, color: 'bg-cyan-500', total: stats.total },
              ].map((bar) => {
                const pct = bar.total > 0 ? Math.round((bar.value / bar.total) * 100) : 0
                return (
                  <div key={bar.label}>
                    <div className="flex justify-between text-[11px] mb-1.5">
                      <span className="text-white/40">{bar.label}</span>
                      <span className="text-white/70 font-medium tabular-nums">{bar.value} <span className="text-white/20">({pct}%)</span></span>
                    </div>
                    <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${bar.color} transition-all duration-500`} style={{ width: `${pct}%`, opacity: 0.7 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent batches */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/[0.04]">
            <p className="text-[12px] font-semibold text-white/40 uppercase tracking-wider">Recent Batches</p>
          </div>
          <div className="divide-y divide-white/[0.03]">
            {batches.length === 0 ? (
              <div className="px-5 py-6 text-center text-white/20 text-[12px]">No batches yet</div>
            ) : (
              batches.slice(0, 8).map((b, i) => (
                <div key={i} className="px-5 py-2.5 flex items-center gap-3 hover:bg-white/[0.02] transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-white/60 font-medium truncate">@{b.seed}</p>
                    <p className="text-[10px] text-white/20">{b.date}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-white/30 tabular-nums">{b.count} leads</span>
                    {b.emails > 0 && (
                      <span className="text-[10px] font-medium text-emerald-400/70 bg-emerald-400/[0.08] px-1.5 py-0.5 rounded">
                        {b.emails} emails
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Activity feed */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/[0.04]">
            <p className="text-[12px] font-semibold text-white/40 uppercase tracking-wider">Activity</p>
          </div>
          {loading ? (
            <div className="px-5 py-6 text-center text-white/20 text-[12px]">Loading...</div>
          ) : recentActivity.length === 0 ? (
            <div className="px-5 py-6 text-center text-white/20 text-[12px]">No activity yet</div>
          ) : (
            <div className="divide-y divide-white/[0.03] max-h-[320px] overflow-y-auto">
              {recentActivity.map((event) => (
                <div key={event.id} className="px-5 py-2.5 flex items-start gap-2.5 hover:bg-white/[0.02] transition-colors">
                  <span className={`text-[10px] font-semibold mt-0.5 uppercase tracking-wider ${agentIcons[event.agent] || 'text-white/30'}`}>
                    {event.agent}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-white/50 leading-relaxed">{event.event}</p>
                    <p className="text-[10px] text-white/15 mt-0.5">
                      {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                    event.status === 'error' ? 'bg-red-400' : event.status === 'warning' ? 'bg-amber-400' : 'bg-emerald-400/50'
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
