'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Mail, Tv2, Database, TrendingUp, Download } from 'lucide-react'

type DayStats = {
  emails: number
  pendingDoc: number
  mgmt: number
  needsNameCheck: number
}

type AllTimeStats = {
  totalLeads: number
  totalQualified: number
  emailRate: number
}

type PipelineRun = {
  id: string
  seed: string
  batch_date: string
  discovered: number
  in_range: number
  qualified: number
  emails_found: number
  youtube_channels: number
  duration_seconds: number
  cost_usd: number
  created_at: string
}

type CostBreakdown = {
  apify: number
  anthropic: number
  dataovercoffee: number
  total: number
}

export default function DashboardPage() {
  const [dayStats, setDayStats] = useState<DayStats | null>(null)
  const [allTime, setAllTime] = useState<AllTimeStats | null>(null)
  const [runs, setRuns] = useState<PipelineRun[]>([])
  const [todayRun, setTodayRun] = useState<PipelineRun | null>(null)
  const [costs, setCosts] = useState<CostBreakdown | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    Promise.all([
      supabase.from('leads').select('status').eq('batch_date', today),
      supabase.from('leads').select('status, email').in('status', ['email_ready', 'mgmt_email']),
      supabase.from('pipeline_runs').select('qualified, emails_found'),
      supabase.from('pipeline_runs').select('*').order('created_at', { ascending: false }).limit(10),
      supabase.from('usage_events').select('service, cost_usd').gte('created_at', monthStart.toISOString()),
    ]).then(([todayRes, allRes, funnelRes, runsRes, costsRes]) => {
      const todayLeads = todayRes.data || []
      setDayStats({
        emails: todayLeads.filter((l: any) => l.status === 'email_ready' || l.status === 'mgmt_email').length,
        pendingDoc: todayLeads.filter((l: any) => l.status === 'youtube_only').length,
        mgmt: todayLeads.filter((l: any) => l.status === 'mgmt_email').length,
        needsNameCheck: todayLeads.filter((l: any) => l.status === 'needs_name_check').length,
      })

      const allLeads = allRes.data || []
      const funnelData = funnelRes.data || []
      const totalQual = funnelData.reduce((s: number, r: any) => s + (r.qualified || 0), 0)
      const totalEmails = funnelData.reduce((s: number, r: any) => s + (r.emails_found || 0), 0)
      setAllTime({
        totalLeads: allLeads.length,
        totalQualified: totalQual,
        emailRate: totalQual > 0 ? Math.round((totalEmails / totalQual) * 100) : 0,
      })

      const runsList = (runsRes.data || []) as PipelineRun[]
      setRuns(runsList)
      setTodayRun(runsList.find((r: any) => r.batch_date === today) || null)

      const costEvents = costsRes.data || []
      const breakdown: CostBreakdown = { apify: 0, anthropic: 0, dataovercoffee: 0, total: 0 }
      costEvents.forEach((e: any) => {
        const cost = e.cost_usd || 0
        if (e.service === 'apify') breakdown.apify += cost
        else if (e.service === 'anthropic') breakdown.anthropic += cost
        else if (e.service === 'dataovercoffee') breakdown.dataovercoffee += cost
        breakdown.total += cost
      })
      setCosts(breakdown)
      setLoading(false)
    })
  }, [])

  const downloadTodayCSV = async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('leads')
      .select('first_name, email, instagram_handle, follower_count, email_source')
      .eq('batch_date', today)
      .in('status', ['email_ready', 'mgmt_email'])
      .eq('first_name_verified', true)
      .not('email', 'is', null)
    if (!data || data.length === 0) return
    const headers = ['first_name', 'email', 'instagram_handle', 'follower_count', 'email_source']
    const csv = [
      headers.join(','),
      ...data.map((row: any) => headers.map(h => `"${(row)[h] || ''}"`).join(','))
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads-${today}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="text-white/20 text-sm py-12 text-center">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[16px] font-semibold text-white/85">Dashboard</h1>
          <p className="text-[12px] text-white/30 mt-1">Daily lead generation pipeline</p>
        </div>
        <button
          onClick={downloadTodayCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#c9a96e]/10 border border-[#c9a96e]/20 text-[#c9a96e] text-[12px] font-medium hover:bg-[#c9a96e]/15 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Download Today ({dayStats?.emails || 0} emails)
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card-gold rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-medium text-[#c9a96e]/50 uppercase tracking-[0.08em]">Today</p>
            <Mail className="w-4 h-4 text-[#c9a96e]/25" strokeWidth={1.5} />
          </div>
          <p className={`text-[32px] font-bold tracking-tight leading-none ${(dayStats?.emails || 0) >= 100 ? 'text-[#c9a96e]' : 'text-white/70'}`}>
            {dayStats?.emails ?? '..'}<span className="text-[16px] text-white/20 font-normal">/100</span>
          </p>
          <p className="text-[11px] text-white/20 mt-2">emails ready</p>
        </div>
        <div className="card rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-medium text-white/30 uppercase tracking-[0.08em]">Pending DOC</p>
            <Tv2 className="w-4 h-4 text-white/10" strokeWidth={1.5} />
          </div>
          <p className="text-[28px] font-bold text-cyan-400/80 tracking-tight leading-none">{dayStats?.pendingDoc ?? '..'}</p>
          <p className="text-[11px] text-white/20 mt-2">awaiting DataOverCoffee</p>
        </div>
        <div className="card rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-medium text-white/30 uppercase tracking-[0.08em]">All Time</p>
            <Database className="w-4 h-4 text-white/10" strokeWidth={1.5} />
          </div>
          <p className="text-[28px] font-bold text-white/70 tracking-tight leading-none">{allTime?.totalLeads ?? '..'}</p>
          <p className="text-[11px] text-white/20 mt-2">emailable leads</p>
        </div>
        <div className="card rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-medium text-white/30 uppercase tracking-[0.08em]">Hit Rate</p>
            <TrendingUp className="w-4 h-4 text-white/10" strokeWidth={1.5} />
          </div>
          <p className="text-[28px] font-bold text-white/85 tracking-tight leading-none">{allTime ? `${allTime.emailRate}%` : '..'}</p>
          <p className="text-[11px] text-white/20 mt-2">qualified &rarr; email</p>
        </div>
      </div>

      {/* Pipeline Funnel */}
      {todayRun && todayRun.discovered > 0 && (
        <div className="card rounded-xl p-5">
          <p className="text-[11px] font-semibold text-white/35 uppercase tracking-[0.1em] mb-5">Today&apos;s Pipeline</p>
          <div className="space-y-3">
            {[
              { label: 'Discovered', value: todayRun.discovered, color: '#6366f1' },
              { label: 'In Range (100K-2M)', value: todayRun.in_range, color: '#8b5cf6' },
              { label: 'Qualified', value: todayRun.qualified, color: '#22d3ee' },
              { label: 'Emails Found', value: todayRun.emails_found, color: '#c9a96e' },
            ].map((step, i, arr) => {
              const widthPct = todayRun.discovered > 0 ? Math.max((step.value / todayRun.discovered) * 100, 8) : 100
              const convPct = i > 0 && arr[i-1].value > 0 ? Math.round((step.value / arr[i-1].value) * 100) : null
              return (
                <div key={step.label}>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-white/45">{step.label}</span>
                      {convPct !== null && <span className="text-[10px] text-white/20 font-mono">{convPct}%</span>}
                    </div>
                    <span className="text-[16px] font-bold text-white/75 tabular-nums font-mono">{step.value}</span>
                  </div>
                  <div className="h-[6px] bg-white/[0.04] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bar-animated" style={{ width: `${widthPct}%`, background: step.color, opacity: 0.5, animationDelay: `${i * 100}ms` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Costs */}
        <div className="card rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.05]">
            <p className="text-[11px] font-semibold text-white/35 uppercase tracking-[0.1em]">
              {new Date().toLocaleString('default', { month: 'long' })} Costs
            </p>
          </div>
          <div className="p-5">
            {costs && costs.total > 0 ? (
              <div className="space-y-4">
                {[
                  { label: 'Apify (scraping)', value: costs.apify, color: '#3b82f6' },
                  { label: 'Haiku (qualification)', value: costs.anthropic, color: '#c9a96e' },
                  { label: 'DataOverCoffee', value: costs.dataovercoffee, color: '#f472b6' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                      <span className="text-[12px] text-white/45">{item.label}</span>
                    </div>
                    <span className="text-[14px] font-semibold text-white/70 font-mono">${item.value.toFixed(2)}</span>
                  </div>
                ))}
                <div className="pt-3 border-t border-white/[0.05] flex items-center justify-between">
                  <span className="text-[12px] text-white/30">Total</span>
                  <span className="text-[18px] font-bold text-[#c9a96e] font-mono">${costs.total.toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <p className="text-[12px] text-white/20 text-center py-4">No cost data yet</p>
            )}
          </div>
        </div>

        {/* Recent Runs */}
        <div className="card rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.05]">
            <p className="text-[11px] font-semibold text-white/35 uppercase tracking-[0.1em]">Recent Runs</p>
          </div>
          {runs.length === 0 ? (
            <div className="px-5 py-8 text-center text-white/20 text-[12px]">No pipeline runs yet</div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {runs.slice(0, 7).map(run => (
                <div key={run.id} className="px-5 py-3 hover:bg-white/[0.015] transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] text-white/50">{run.batch_date}</span>
                    <span className="text-[14px] font-bold text-[#c9a96e] font-mono">{run.emails_found} emails</span>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] text-white/20">
                    <span>{run.discovered} discovered</span>
                    <span>{run.qualified} qualified</span>
                    <span>{run.youtube_channels || 0} YouTube</span>
                    {run.duration_seconds && <span>{Math.round(Number(run.duration_seconds))}s</span>}
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
