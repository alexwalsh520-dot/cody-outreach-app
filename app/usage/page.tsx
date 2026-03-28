'use client'

import { useEffect, useState } from 'react'
import { supabase, UsageEvent } from '@/lib/supabase'
import MetricCard from '@/components/MetricCard'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const serviceColors: Record<string, string> = {
  openrouter: '#10b981',
  apify: '#3b82f6',
  millionverifier: '#8b5cf6',
  smartlead: '#f59e0b',
}

// Mock daily spend for chart
const mockDailySpend = [
  { date: 'Mar 22', openrouter: 1.82, apify: 0.45, millionverifier: 0.12, smartlead: 0.00 },
  { date: 'Mar 23', openrouter: 2.14, apify: 0.50, millionverifier: 0.18, smartlead: 0.05 },
  { date: 'Mar 24', openrouter: 1.95, apify: 0.42, millionverifier: 0.09, smartlead: 0.05 },
  { date: 'Mar 25', openrouter: 2.41, apify: 0.61, millionverifier: 0.21, smartlead: 0.05 },
  { date: 'Mar 26', openrouter: 2.73, apify: 0.55, millionverifier: 0.19, smartlead: 0.10 },
  { date: 'Mar 27', openrouter: 2.28, apify: 0.48, millionverifier: 0.15, smartlead: 0.05 },
  { date: 'Mar 28', openrouter: 2.14, apify: 0.50, millionverifier: 0.18, smartlead: 0.05 },
]

export default function UsagePage() {
  const [events, setEvents] = useState<UsageEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('usage_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)
      .then(({ data }) => {
        if (data) setEvents(data as UsageEvent[])
        setLoading(false)
      })
  }, [])

  // Totals
  const totalSpend = events.reduce((s, e) => s + (e.cost_usd || 0), 0)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todaySpend = events.filter(e => new Date(e.created_at) >= today).reduce((s, e) => s + (e.cost_usd || 0), 0)

  // By service
  const byService: Record<string, number> = {}
  events.forEach((e) => {
    byService[e.service] = (byService[e.service] || 0) + (e.cost_usd || 0)
  })

  // By agent
  const byAgent: Record<string, number> = {}
  events.forEach((e) => {
    byAgent[e.agent] = (byAgent[e.agent] || 0) + (e.cost_usd || 0)
  })

  const hasRealData = events.length > 0

  const displayByService = hasRealData ? byService : {
    openrouter: 14.47,
    apify: 3.51,
    millionverifier: 1.12,
    smartlead: 0.35,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Usage</h1>
        <p className="text-sm text-gray-500 mt-0.5">API spend by agent and service</p>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Today's Spend"
          value={`$${hasRealData ? todaySpend.toFixed(2) : '2.87'}`}
          sub="all agents"
          accent
        />
        <MetricCard
          label="Monthly Total"
          value={`$${hasRealData ? totalSpend.toFixed(2) : '19.45'}`}
          sub="Mar 2026"
        />
        <MetricCard
          label="OpenRouter"
          value={`$${(displayByService.openrouter || 0).toFixed(2)}`}
          sub="LLM tokens"
        />
        <MetricCard
          label="Apify"
          value={`$${(displayByService.apify || 0).toFixed(2)}`}
          sub="scraping credits"
        />
      </div>

      {/* Service breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar chart */}
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <p className="text-sm font-semibold text-white mb-4">Daily Spend by Service (Last 7 Days)</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={mockDailySpend} barSize={8}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#9ca3af' }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              {Object.entries(serviceColors).map(([service, color]) => (
                <Bar key={service} dataKey={service} stackId="a" fill={color} radius={[0, 0, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Service breakdown cards */}
        <div className="space-y-3">
          {Object.entries(displayByService).map(([service, cost]) => {
            const total = Object.values(displayByService).reduce((s, v) => s + v, 0)
            const pct = total > 0 ? Math.round((cost / total) * 100) : 0
            return (
              <div key={service} className="bg-gray-800 rounded-xl p-3 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: serviceColors[service] || '#6b7280' }}
                    />
                    <span className="text-sm font-medium text-white capitalize">{service}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-white">${cost.toFixed(2)}</span>
                    <span className="text-xs text-gray-500 ml-2">{pct}%</span>
                  </div>
                </div>
                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: serviceColors[service] || '#6b7280' }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent events */}
      <div className="bg-gray-800 rounded-xl border border-gray-700">
        <div className="px-4 py-3 border-b border-gray-700">
          <p className="text-sm font-semibold text-white">Recent Usage Events</p>
        </div>
        {events.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-sm">
            No usage events yet. Cody's agents will log costs here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody>
                {events.slice(0, 50).map((e) => (
                  <tr key={e.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="px-4 py-2 text-gray-300 capitalize">{e.agent}</td>
                    <td className="px-4 py-2">
                      <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: `${serviceColors[e.service]}20`, color: serviceColors[e.service] || '#9ca3af' }}>
                        {e.service}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-400 text-xs max-w-xs truncate">{e.description || '—'}</td>
                    <td className="px-4 py-2 text-emerald-400 font-mono text-xs">${e.cost_usd.toFixed(4)}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{new Date(e.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
