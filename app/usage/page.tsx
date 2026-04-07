'use client'

import { useEffect, useState } from 'react'
import { supabase, UsageEvent } from '@/lib/supabase'
import MetricCard from '@/components/MetricCard'

const serviceColors: Record<string, string> = {
  openrouter: '#10b981',
  apify: '#3b82f6',
  millionverifier: '#8b5cf6',
  smartlead: '#f59e0b',
}

const agentColors: Record<string, string> = {
  cody:    '#10b981',
  scout:   '#3b82f6',
  writer:  '#8b5cf6',
  tracker: '#f97316',
  analyst: '#eab308',
}

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

  const totalSpend = events.reduce((s, e) => s + (e.cost_usd || 0), 0)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todaySpend = events
    .filter((e) => new Date(e.created_at) >= today)
    .reduce((s, e) => s + (e.cost_usd || 0), 0)

  // Group by agent
  const byAgent: Record<string, number> = {}
  events.forEach((e) => {
    byAgent[e.agent] = (byAgent[e.agent] || 0) + (e.cost_usd || 0)
  })

  // Group by service
  const byService: Record<string, number> = {}
  events.forEach((e) => {
    byService[e.service] = (byService[e.service] || 0) + (e.cost_usd || 0)
  })

  // Group by agent+service for detailed breakdown
  const byAgentService: Record<string, Record<string, number>> = {}
  events.forEach((e) => {
    if (!byAgentService[e.agent]) byAgentService[e.agent] = {}
    byAgentService[e.agent][e.service] = (byAgentService[e.agent][e.service] || 0) + (e.cost_usd || 0)
  })

  const hasData = events.length > 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Usage</h1>
        <p className="text-sm text-gray-500 mt-0.5">API spend by agent and service</p>
      </div>

      {/* Info note */}
      <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-3 flex items-start gap-2">
        <span className="text-base">📝</span>
        <p className="text-xs text-gray-400 leading-relaxed">
          Usage data is logged by Cody and sub-agents via the Supabase logger. Run{' '}
          <code className="bg-gray-700 px-1 py-0.5 rounded text-gray-300 text-[11px]">node tools/supabase-logger.mjs --table usage_events --agent cody --service openrouter --cost 0.05 --description "..."</code>
        </p>
      </div>

      {!hasData ? (
        <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
          <p className="text-3xl mb-3">📊</p>
          <p className="text-gray-400 font-medium">No usage data yet.</p>
          <p className="text-gray-600 text-sm mt-1">
            Usage events will appear here once Cody and sub-agents start logging API costs.
          </p>
        </div>
      ) : (
        <>
          {/* Top metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Today's Spend" value={`$${todaySpend.toFixed(2)}`} sub="all agents" accent="gold" />
            <MetricCard label="Running Total" value={`$${totalSpend.toFixed(2)}`} sub="all time" />
            <MetricCard
              label="OpenRouter"
              value={`$${(byService['openrouter'] || 0).toFixed(2)}`}
              sub="LLM tokens"
            />
            <MetricCard
              label="Apify"
              value={`$${(byService['apify'] || 0).toFixed(2)}`}
              sub="scraping credits"
            />
          </div>

          {/* By agent + by service */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* By agent */}
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <p className="text-sm font-semibold text-white mb-4">Spend by Agent</p>
              <div className="space-y-3">
                {Object.entries(byAgent).sort((a, b) => b[1] - a[1]).map(([agent, cost]) => {
                  const pct = totalSpend > 0 ? Math.round((cost / totalSpend) * 100) : 0
                  return (
                    <div key={agent}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-white capitalize">{agent}</span>
                        <div>
                          <span className="text-sm font-semibold text-white">${cost.toFixed(2)}</span>
                          <span className="text-xs text-gray-500 ml-2">{pct}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: agentColors[agent] || '#6b7280',
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* By service */}
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <p className="text-sm font-semibold text-white mb-4">Spend by Service</p>
              <div className="space-y-3">
                {Object.entries(byService).sort((a, b) => b[1] - a[1]).map(([service, cost]) => {
                  const pct = totalSpend > 0 ? Math.round((cost / totalSpend) * 100) : 0
                  return (
                    <div key={service}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: serviceColors[service] || '#6b7280' }}
                          />
                          <span className="text-sm text-white capitalize">{service}</span>
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-white">${cost.toFixed(2)}</span>
                          <span className="text-xs text-gray-500 ml-2">{pct}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: serviceColors[service] || '#6b7280',
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Agent x Service breakdown */}
          {Object.keys(byAgentService).length > 0 && (
            <div className="bg-gray-800 rounded-xl border border-gray-700">
              <div className="px-4 py-3 border-b border-gray-700">
                <p className="text-sm font-semibold text-white">Agent × Service Breakdown</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                      {Object.keys(byService).map((s) => (
                        <th key={s} className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider capitalize">{s}</th>
                      ))}
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(byAgentService).map(([agent, services]) => (
                      <tr key={agent} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                        <td className="px-4 py-2.5 text-gray-300 capitalize font-medium">{agent}</td>
                        {Object.keys(byService).map((s) => (
                          <td key={s} className="px-4 py-2.5 text-right text-gray-400 font-mono text-xs">
                            {services[s] ? `$${services[s].toFixed(4)}` : '—'}
                          </td>
                        ))}
                        <td className="px-4 py-2.5 text-right text-emerald-400 font-mono text-xs font-semibold">
                          ${(byAgent[agent] || 0).toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent events */}
          <div className="bg-gray-800 rounded-xl border border-gray-700">
            <div className="px-4 py-3 border-b border-gray-700">
              <p className="text-sm font-semibold text-white">Recent Events</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {events.slice(0, 50).map((e) => (
                    <tr key={e.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                      <td className="px-4 py-2 text-gray-300 capitalize">{e.agent}</td>
                      <td className="px-4 py-2">
                        <span
                          className="text-xs px-2 py-0.5 rounded"
                          style={{
                            backgroundColor: `${serviceColors[e.service] || '#6b7280'}20`,
                            color: serviceColors[e.service] || '#9ca3af',
                          }}
                        >
                          {e.service}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-400 text-xs max-w-xs truncate">{e.description || '—'}</td>
                      <td className="px-4 py-2 text-right text-emerald-400 font-mono text-xs">${e.cost_usd.toFixed(4)}</td>
                      <td className="px-4 py-2 text-gray-500 text-xs">{new Date(e.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
