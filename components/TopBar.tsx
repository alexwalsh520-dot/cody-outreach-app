'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TopBar() {
  const [time, setTime] = useState('')
  const [todaySpend, setTodaySpend] = useState<number | null>(null)

  useEffect(() => {
    // Clock
    const tick = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    tick()
    const interval = setInterval(tick, 1000)

    // Today's spend
    const fetchSpend = async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const { data } = await supabase
        .from('usage_events')
        .select('cost_usd')
        .gte('created_at', today.toISOString())
      if (data) {
        const total = data.reduce((sum, row) => sum + (row.cost_usd || 0), 0)
        setTodaySpend(total)
      }
    }
    fetchSpend()

    return () => clearInterval(interval)
  }, [])

  return (
    <header className="h-12 bg-gray-900 border-b border-gray-800 px-4 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <span className="text-emerald-400 font-bold text-sm tracking-wide">CC OS</span>
        <span className="text-gray-600 text-xs">Outreach</span>
        <span className="w-1 h-1 rounded-full bg-gray-700" />
        <span className="text-xs text-gray-500">Autonomous Influencer Outreach</span>
      </div>

      <div className="flex items-center gap-4">
        {todaySpend !== null && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">Today's spend:</span>
            <span className="text-xs font-semibold text-emerald-400">
              ${todaySpend.toFixed(2)}
            </span>
          </div>
        )}
        <span className="text-xs text-gray-500 font-mono">{time}</span>
      </div>
    </header>
  )
}
