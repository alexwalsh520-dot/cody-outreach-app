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
  FunnelChart,
  Funnel,
  LabelList,
} from 'recharts'

// Mock daily lead data — replace with real Supabase query once leads accumulate
const mockDailyLeads = [
  { date: 'Mar 22', leads: 34 },
  { date: 'Mar 23', leads: 47 },
  { date: 'Mar 24', leads: 41 },
  { date: 'Mar 25', leads: 55 },
  { date: 'Mar 26', leads: 62 },
  { date: 'Mar 27', leads: 58 },
  { date: 'Mar 28', leads: 47 },
]

const funnelData = [
  { name: 'Leads', value: 1426, fill: '#10b981' },
  { name: 'Contacted', value: 1270, fill: '#059669' },
  { name: 'Replied', value: 84, fill: '#047857' },
  { name: 'Booked', value: 14, fill: '#065f46' },
  { name: 'Signed', value: 2, fill: '#064e3b' },
]

export default function AnalyticsPage() {
  const [totalLeads, setTotalLeads] = useState<number>(1426)
  const [totalSpend, setTotalSpend] = useState<number>(0)
  const [constraint, setConstraint] = useState<string>(
    'Email deliverability — open rate dropped from 38% → 30% this week. Scout is testing new sending domains.'
  )

  useEffect(() => {
    // Total leads
    supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .then(({ count }) => {
        if (count && count > 0) setTotalLeads(count)
      })

    // Total spend
    supabase
      .from('usage_events')
      .select('cost_usd')
      .then(({ data }) => {
        if (data && data.length > 0) {
          const total = data.reduce((sum, r) => sum + (r.cost_usd || 0), 0)
          setTotalSpend(total)
        }
      })
  }, [])

  const costPerLead = totalLeads > 0 ? (totalSpend / totalLeads).toFixed(2) : '—'
  const costPerReply = totalSpend > 0 ? (totalSpend / 84).toFixed(2) : '—'
  const costPerSigned = totalSpend > 0 ? (totalSpend / 2).toFixed(2) : '—'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">Cody's outreach performance at a glance</p>
      </div>

      {/* Constraint callout */}
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

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Leads" value={totalLeads.toLocaleString()} sub="all time" accent />
        <MetricCard label="Total Spend" value={`$${totalSpend.toFixed(2)}`} sub="all time" />
        <MetricCard label="Cost / Lead" value={`$${costPerLead}`} sub="avg" />
        <MetricCard label="Cost / Signed" value={`$${costPerSigned}`} sub="avg" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Lead volume chart */}
        <div className="lg:col-span-2 bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-sm font-semibold text-white mb-4">Leads Generated (Last 7 Days)</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={mockDailyLeads}>
              <defs>
                <linearGradient id="leadGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#9ca3af' }}
                itemStyle={{ color: '#10b981' }}
              />
              <Area type="monotone" dataKey="leads" stroke="#10b981" fill="url(#leadGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Funnel */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-sm font-semibold text-white mb-4">Pipeline Funnel</p>
          <div className="space-y-2">
            {funnelData.map((stage, i) => {
              const pct = Math.round((stage.value / funnelData[0].value) * 100)
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

          {/* Conversion rates */}
          <div className="mt-4 pt-3 border-t border-gray-700 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Open rate</span>
              <span className="text-white">30%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Reply rate</span>
              <span className="text-white">6.6%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Positive reply rate</span>
              <span className="text-emerald-400 font-medium">3.1%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Show rate</span>
              <span className="text-white">71%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Close rate</span>
              <span className="text-emerald-400 font-medium">14%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
