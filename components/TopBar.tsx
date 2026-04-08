'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Zap } from 'lucide-react'

export default function TopBar() {
  const [todayEmails, setTodayEmails] = useState<number | null>(null)
  const [monthCost, setMonthCost] = useState<number | null>(null)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    Promise.all([
      supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('batch_date', today)
        .in('status', ['email_ready', 'mgmt_email']),
      supabase
        .from('usage_events')
        .select('cost_usd')
        .gte('created_at', monthStart.toISOString()),
    ]).then(([emailRes, costRes]) => {
      setTodayEmails(emailRes.count || 0)
      const costs = costRes.data || []
      setMonthCost(costs.reduce((s: number, e: any) => s + (e.cost_usd || 0), 0))
    })
  }, [])

  const monthName = new Date().toLocaleString('default', { month: 'short' })

  return (
    <header className="h-12 bg-[#101014] border-b border-white/[0.06] px-5 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#c9a96e]/10 border border-[#c9a96e]/20 flex items-center justify-center">
            <Zap className="w-3 h-3 text-[#c9a96e]" strokeWidth={2.5} fill="currentColor" />
          </div>
          <span className="text-[14px] font-semibold text-white/85 tracking-tight">Scout</span>
        </div>
        <span className="w-px h-4 bg-white/[0.08]" />
        <span className="text-[11px] text-white/30 font-medium">Lead Engine</span>
      </div>

      <div className="flex items-center gap-6">
        {todayEmails !== null && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-white/25">Today</span>
            <span className={`text-[13px] font-bold font-mono tabular-nums ${
              todayEmails >= 100 ? 'text-[#c9a96e]' : 'text-white/60'
            }`}>
              {todayEmails}/100
            </span>
          </div>
        )}
        {monthCost !== null && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-white/25">{monthName}</span>
            <span className="text-[12px] font-semibold text-white/40 font-mono tabular-nums">
              ${monthCost.toFixed(0)}
            </span>
          </div>
        )}
      </div>
    </header>
  )
}
