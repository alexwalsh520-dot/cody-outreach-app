'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import MetricCard from '@/components/MetricCard'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatDistanceToNow } from 'date-fns'

type FunnelStage = {
  name: string
  value: number
  fill: string
}

type CampaignSummary = {
  totalSent: number
  totalOpens: number
  totalReplies: number
}

type ActivityEvent = {
  id: string
  agent: string
  event: string
  status: string
  created_at: string
}

const agentColors: Record<string, string> = {
  cody: 'text-emerald-400',
  scout: 'text-blue-400',
  writer: 'text-purple-400',
  tracker: 'text-orange-400',
  analyst: 'text-yellow-400',
}

export default function AnalyticsPage() {
  const [funnelData, setFunnelData] = useState<FunnelStage[]>([])
  const [campaignSummary, setCampaignSummary] = useState<CampaignSummary | null>(null)
  const [recentActivity, setRecentActivity] = useState<ActivityEvent[]>([])
  const [constraint, setConstraint] = useState<string | null>(null)
  const [totalSpend, setTotalSpend] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      // Pipeline funnel — count leads by status
      const { data: leads } = await supabase
        .from('leads')
        .select('status')

      if (leads && leads.length > 0) {
        const counts: Record<string, number> = {}
        leads.forEach((l) => {
          counts[l.status] = (counts[l.status] || 0) + 1
        })
        const stageOrder = ['discovered', 'qualified', 'contacted', 'replied', 'booked', 'signed']
        const stageFills = ['#6366f1', '#10b981', '#059669', '#047857', '#065f46', '#064e3b']
        setFunnelData(
          stageOrder.map((s, i) => ({
            name: s.charAt(0).toUpperCase() + s.slice(1),
            value: counts[s] || 0,
            fill: stageFills[i],
          }))
        )
      }

      // Campaign summary
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('emails_sent, opens, replies')

      if (campaigns && campaigns.length > 0) {
        setCampaignSummary({
          totalSent: campaigns.reduce((s, c) => s + (c.emails_sent || 0), 0),
          totalOpens: campaigns.reduce((s, c) => s + (c.opens || 0), 0),
          totalReplies: campaigns.reduce((s, c) => s + (c.replies || 0), 0),
        })
      }

      // Recent activity (last 10 events)
      const { data: events } = await supabase
        .from('agent_events')
        .select('id, agent, event, status, created_at')
        .order('created_at', { ascending: false })
        .limit(10)

      if (events) setRecentActivity(events as ActivityEvent[])

      // Constraint callout — latest event with 'constraint' in event name
      const { data: constraintEvents } = await supabase
        .from('agent_events')
        .select('event, data, created_at')
        .eq('agent', 'cody')
        .ilike('event', '%constraint%')
        .order('created_at', { ascending: false })
        .limit(1)

      if (constraintEvents && constraintEvents.length > 0) {
        const e = constraintEvents[0]
        const detail = e.data?.summary || e.data?.constraint || e.event
        setConstraint(String(detail))
      }

      // Total spend
      const { data: usage } = await supabase
        .from('usage_events')
        .select('cost_usd')

      if (usage && usage.length > 0) {
        setTotalSpend(usage.reduce((s, e) => s + (e.cost_usd || 0), 0))
      }

      setLoading(false)
    }
    load()
  }, [])

  const hasLeads = funnelData.length > 0 && funnelData.some((s) => s.value > 0)
  const totalLeads = funnelData.reduce((s, f) => s + f.value, 0)
  const topStage = funnelData[0]?.value || 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">Cody's outreach performance at a glance</p>
      </div>

      {/* Constraint callout */}
      {constraint ? (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-lg">🎯</span>
            <div>
              <p className="text-xs font-semibold text-yellow-400 uppercase tracking-wider mb-1">
                Current Constraint
              </p>
              <p className="text-sm text-gray-300">{constraint}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-lg">🎯</span>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Current Constraint
              </p>
              <p className="text-sm text-gray-600">No constraint identified yet. Analyst will log here.</p>
            </div>
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Leads"
          value={hasLeads ? totalLeads.toLocaleString() : '—'}
          sub="all time"
          accent={hasLeads}
        />
        <MetricCard
          label="Emails Sent"
          value={campaignSummary ? campaignSummary.totalSent.toLocaleString() : '—'}
          sub="all campaigns"
        />
        <MetricCard
          label="Total Replies"
          value={campaignSummary ? campaignSummary.totalReplies.toLocaleString() : '—'}
          sub="all campaigns"
        />
        <MetricCard
          label="Total Spend"
          value={totalSpend > 0 ? `$${totalSpend.toFixed(2)}` : '—'}
          sub="all time"
        />
      </div>

      {/* Pipeline + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pipeline funnel */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-sm font-semibold text-white mb-4">Pipeline Funnel</p>
          {!hasLeads ? (
            <div className="py-8 text-center">
              <p className="text-gray-500 text-sm">No lead data yet.</p>
              <p className="text-gray-600 text-xs mt-1">Scout will populate this as leads come in.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {funnelData.map((stage, i) => {
                const pct = topStage > 0 ? Math.round((stage.value / topStage) * 100) : 0
                return (
                  <div key={stage.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">{stage.name}</span>
                      <span className="text-white font-medium">{stage.value.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${pct}%`, opacity: 1 - i * 0.15 }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Campaign summary */}
          {campaignSummary && (
            <div className="mt-4 pt-3 border-t border-gray-700 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Open rate</span>
                <span className="text-white">
                  {campaignSummary.totalSent > 0
                    ? `${((campaignSummary.totalOpens / campaignSummary.totalSent) * 100).toFixed(1)}%`
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Reply rate</span>
                <span className="text-white">
                  {campaignSummary.totalSent > 0
                    ? `${((campaignSummary.totalReplies / campaignSummary.totalSent) * 100).toFixed(1)}%`
                    : '—'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Recent activity feed */}
        <div className="lg:col-span-2 bg-gray-800 rounded-xl border border-gray-700">
          <div className="px-4 py-3 border-b border-gray-700">
            <p className="text-sm font-semibold text-white">Recent Activity</p>
          </div>
          {loading ? (
            <div className="py-8 text-center text-gray-500 text-sm">Loading...</div>
          ) : recentActivity.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-gray-500 text-sm">No activity yet.</p>
              <p className="text-gray-600 text-xs mt-1">Agent events will appear here as they run.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700/50">
              {recentActivity.map((event) => (
                <div key={event.id} className="px-4 py-3 flex items-start gap-3">
                  <span className={`text-xs font-medium mt-0.5 capitalize ${agentColors[event.agent] || 'text-gray-400'}`}>
                    {event.agent}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300 truncate">{event.event}</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${
                    event.status === 'error' ? 'bg-red-500/20 text-red-400'
                    : event.status === 'warning' ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {event.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
