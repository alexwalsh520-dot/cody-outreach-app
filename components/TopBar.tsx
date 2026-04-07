'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Zap } from 'lucide-react'

export default function TopBar() {
  const [leadCount, setLeadCount] = useState<number | null>(null)
  const [emailCount, setEmailCount] = useState<number | null>(null)

  useEffect(() => {
    const fetch = async () => {
      const { count: leads } = await supabase.from('leads').select('*', { count: 'exact', head: true })
      const { count: emails } = await supabase.from('leads').select('*', { count: 'exact', head: true }).not('email', 'is', null)
      setLeadCount(leads || 0)
      setEmailCount(emails || 0)
    }
    fetch()
  }, [])

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
        {leadCount !== null && (
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-white/25">Leads</span>
              <span className="text-[12px] font-semibold text-white/60 font-mono tabular-nums">{leadCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-white/25">Emails</span>
              <span className="text-[12px] font-semibold text-[#c9a96e]/80 font-mono tabular-nums">{emailCount}</span>
            </div>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 live-dot" />
          <span className="text-[11px] text-white/25">Online</span>
        </div>
      </div>
    </header>
  )
}
