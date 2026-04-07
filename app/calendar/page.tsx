'use client'

import { Calendar } from 'lucide-react'

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[16px] font-semibold text-white/85">Schedule</h1>
        <p className="text-[12px] text-white/30 mt-1">Pipeline automation schedule</p>
      </div>
      <div className="card rounded-xl p-12 text-center">
        <Calendar className="w-8 h-8 text-white/10 mx-auto mb-4" strokeWidth={1.2} />
        <p className="text-[13px] text-white/40">No scheduled runs yet</p>
        <p className="text-[11px] text-white/20 mt-2 max-w-md mx-auto">
          Once the pipeline is deployed to Claude Code cloud tasks, the daily run schedule will appear here.
        </p>
      </div>
    </div>
  )
}
