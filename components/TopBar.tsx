'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Activity, Zap } from 'lucide-react'

export default function TopBar() {
  const [time, setTime] = useState('')
  const [leadCount, setLeadCount] = useState<number | null>(null)
  const [emailCount, setEmailCount] = useState<number | null>(null)

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }))
    }
    tick()
    const interval = setInterval(tick, 60000)

    // Quick stats
    const fetchStats = async () => {
      const { count: leads } = await supabase.from('leads').select('*', { count: 'exact', head: true })
      const { count: emails } = await supabase.from('leads').select('*', { count: 'exact', head: true }).not('email', 'is', null)
      setLeadCount(leads || 0)
      setEmailCount(emails || 0)
    }
    fetchStats()

    return () => clearInterval(interval)
  }, [])

  return (
    <header className="h-11 bg-[#08080e] border-b border-white/[0.04] px-5 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-gold" strokeWidth={2.5} />
          <span className="text-[13px] font-semibold tracking-wide text-white/90">Scout</span>
        </div>
        <span className="w-px h-3 bg-white/[0.06]" />
        <span className="text-[11px] text-white/30 font-medium tracking-wide">Lead Engine</span>
      </div>

      <div className="flex items-center gap-5">
        {leadCount !== null && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-white/25 font-medium">Leads</span>
              <span className="text-[11px] font-semibold text-white/70 tabular-nums">{leadCount}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-white/25 font-medium">Emails</span>
              <span className="text-[11px] font-semibold text-emerald-400/80 tabular-nums">{emailCount}</span>
            </div>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-emerald-500/60" />
          <span className="text-[11px] text-white/20 font-mono tabular-nums">{time}</span>
        </div>
      </div>
    </header>
  )
}
