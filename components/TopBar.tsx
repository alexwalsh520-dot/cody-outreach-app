'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Zap } from 'lucide-react'

export default function TopBar() {
  const [leadCount, setLeadCount] = useState<number | null>(null)
  const [emailCount, setEmailCount] = useState<number | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      const { count: leads } = await supabase.from('leads').select('*', { count: 'exact', head: true })
      const { count: emails } = await supabase.from('leads').select('*', { count: 'exact', head: true }).not('email', 'is', null)
      setLeadCount(leads || 0)
      setEmailCount(emails || 0)
    }
    fetchStats()
  }, [])

  return (
    <header className="h-10 bg-[#050507] border-b border-white/[0.03] px-5 flex items-center justify-between shrink-0 relative z-10">
      <div className="flex items-center gap-2.5">
        <Zap className="w-3 h-3 text-[#c9a96e]" strokeWidth={2.5} fill="currentColor" />
        <span className="text-[12px] font-semibold tracking-[0.04em] text-white/80">Scout</span>
        <span className="w-px h-2.5 bg-white/[0.06]" />
        <span className="text-[10px] text-white/20 font-medium tracking-[0.06em] uppercase">Lead Engine</span>
      </div>

      <div className="flex items-center gap-6">
        {leadCount !== null && (
          <>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-white/15 uppercase tracking-wider font-medium">Leads</span>
              <span className="text-[11px] font-semibold text-white/50 font-mono tabular-nums">{leadCount}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-white/15 uppercase tracking-wider font-medium">Emails</span>
              <span className="text-[11px] font-semibold text-[#c9a96e]/70 font-mono tabular-nums">{emailCount}</span>
            </div>
          </>
        )}
        <div className="flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-emerald-500/50 live-dot" />
          <span className="text-[10px] text-white/15 font-medium">Online</span>
        </div>
      </div>
    </header>
  )
}
