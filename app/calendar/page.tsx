'use client'

import { useEffect, useState } from 'react'
import { supabase, CronJob } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'

// Agent color configs
const agentConfig: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  cody:    { bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-300', dot: 'bg-emerald-500' },
  scout:   { bg: 'bg-blue-500/15',    border: 'border-blue-500/30',    text: 'text-blue-300',    dot: 'bg-blue-500' },
  writer:  { bg: 'bg-purple-500/15',  border: 'border-purple-500/30',  text: 'text-purple-300',  dot: 'bg-purple-500' },
  tracker: { bg: 'bg-orange-500/15',  border: 'border-orange-500/30',  text: 'text-orange-300',  dot: 'bg-orange-500' },
  analyst: { bg: 'bg-yellow-500/15',  border: 'border-yellow-500/30',  text: 'text-yellow-300',  dot: 'bg-yellow-500' },
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
// cron day-of-week: 0=Sun,1=Mon...6=Sat
const CRON_DOW_TO_IDX: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 }

type RunResult = {
  id: string
  status: string
  duration_ms: number | null
  created_at: string
}

/** Parse a cron expression and return which day indices (Mon=0..Sun=6) this job runs */
function getJobDays(schedule: string): number[] {
  const parts = schedule.trim().split(/\s+/)
  if (parts.length !== 5) return [0, 1, 2, 3, 4, 5, 6] // every day fallback
  const dowField = parts[4]

  if (dowField === '*') return [0, 1, 2, 3, 4, 5, 6]

  // Handle ranges like 1-5
  if (dowField.includes('-')) {
    const [start, end] = dowField.split('-').map(Number)
    const result: number[] = []
    for (let d = start; d <= end; d++) {
      const idx = CRON_DOW_TO_IDX[d]
      if (idx !== undefined) result.push(idx)
    }
    return result
  }

  // Handle comma-separated
  return dowField.split(',').map(Number).map((d) => CRON_DOW_TO_IDX[d]).filter((d) => d !== undefined)
}

function humanSchedule(schedule: string): string {
  const map: Record<string, string> = {
    '*/30 * * * *': 'Every 30 min',
    '0 6 * * *': 'Daily 6:00 AM',
    '0 7 * * 1': 'Mon 7:00 AM',
    '0 8 * * *': 'Daily 8:00 AM',
    '0 9 * * 1-5': 'Weekdays 9:00 AM',
    '0 */2 * * *': 'Every 2 hours',
    '0 20 * * *': 'Daily 8:00 PM',
  }
  return map[schedule] || schedule
}

export default function CalendarPage() {
  const [jobs, setJobs] = useState<CronJob[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedJob, setExpandedJob] = useState<string | null>(null)
  const [runResults, setRunResults] = useState<Record<string, RunResult[]>>({})

  useEffect(() => {
    supabase
      .from('cron_jobs')
      .select('*')
      .order('agent')
      .then(({ data }) => {
        if (data) setJobs(data as CronJob[])
        setLoading(false)
      })
  }, [])

  const handleJobClick = async (jobId: string) => {
    if (expandedJob === jobId) {
      setExpandedJob(null)
      return
    }
    setExpandedJob(jobId)

    // Fetch last 5 run results
    if (!runResults[jobId]) {
      const { data } = await supabase
        .from('agent_events')
        .select('id, status, data, created_at')
        .eq('agent', jobs.find((j) => j.id === jobId)?.agent || '')
        .ilike('event', `%${jobs.find((j) => j.id === jobId)?.name || ''}%`)
        .order('created_at', { ascending: false })
        .limit(5)

      if (data) {
        setRunResults((prev) => ({
          ...prev,
          [jobId]: data.map((e: any) => ({
            id: e.id,
            status: e.status,
            duration_ms: e.data?.duration_ms || null,
            created_at: e.created_at,
          })),
        }))
      }
    }
  }

  // Build grid: day -> jobs[]
  const grid: Record<number, CronJob[]> = {}
  for (let i = 0; i < 7; i++) grid[i] = []
  jobs.forEach((job) => {
    const days = getJobDays(job.schedule)
    days.forEach((d) => {
      if (!grid[d]) grid[d] = []
      grid[d].push(job)
    })
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Calendar</h1>
        <p className="text-sm text-white/30 mt-0.5">7-day schedule — click a job to see recent runs</p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(agentConfig).map(([agent, cfg]) => (
          <div key={agent} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
            <span className="text-xs text-white/45 capitalize">{agent}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-white/30 py-8 text-center">Loading schedule...</div>
      ) : jobs.length === 0 ? (
        <div className="bg-[#161619] rounded-xl p-8 border border-white/[0.06] text-center">
          <p className="text-white/30 text-sm">No cron jobs registered yet.</p>
          <p className="text-white/20 text-xs mt-1">Agents log their jobs to the cron_jobs table at startup.</p>
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {DAYS.map((day, dayIdx) => (
            <div key={day} className="min-w-0">
              {/* Day header */}
              <div className="text-center mb-2">
                <span className="text-xs font-semibold text-white/45 uppercase tracking-wider">{day}</span>
              </div>

              {/* Jobs for this day */}
              <div className="space-y-1.5">
                {grid[dayIdx].length === 0 ? (
                  <div className="h-8 rounded-lg bg-[#161619]/40 border border-white/[0.06]/30" />
                ) : (
                  grid[dayIdx].map((job) => {
                    const cfg = agentConfig[job.agent] || agentConfig.cody
                    const isExpanded = expandedJob === job.id
                    return (
                      <div key={`${day}-${job.id}`}>
                        <button
                          onClick={() => handleJobClick(job.id)}
                          className={`w-full text-left rounded-lg px-2 py-1.5 border transition-all text-xs ${cfg.bg} ${cfg.border} ${cfg.text} ${
                            isExpanded ? 'ring-1 ring-white/20' : 'hover:brightness-125'
                          }`}
                        >
                          <p className="font-medium truncate">{job.name}</p>
                          <p className="opacity-60 text-[10px] truncate">{humanSchedule(job.schedule)}</p>
                          {job.last_status && (
                            <span className={`text-[10px] font-medium ${
                              job.last_status === 'success' ? 'text-[#c9a96e]' : 'text-red-400'
                            }`}>
                              {job.last_status === 'success' ? '✓' : '✗'}
                            </span>
                          )}
                        </button>

                        {/* Expanded: last 5 runs */}
                        {isExpanded && (
                          <div className={`mt-1 rounded-lg border p-2 text-xs ${cfg.bg} ${cfg.border}`}>
                            <p className={`font-semibold mb-2 ${cfg.text}`}>Last runs</p>
                            {!runResults[job.id] ? (
                              <p className="text-white/30">Loading...</p>
                            ) : runResults[job.id].length === 0 ? (
                              <p className="text-white/30">No runs logged yet.</p>
                            ) : (
                              <div className="space-y-1">
                                {runResults[job.id].map((run) => (
                                  <div key={run.id} className="flex items-center gap-1">
                                    <span className={run.status === 'error' ? 'text-red-400' : 'text-[#c9a96e]'}>
                                      {run.status === 'error' ? '✗' : '✓'}
                                    </span>
                                    <span className="text-white/45 text-[10px]">
                                      {formatDistanceToNow(new Date(run.created_at), { addSuffix: true })}
                                    </span>
                                    {run.duration_ms && (
                                      <span className="text-white/20 text-[10px]">{run.duration_ms}ms</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Job list below grid for detail */}
      {jobs.length > 0 && (
        <div className="bg-[#161619] rounded-xl border border-white/[0.06]">
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <p className="text-sm font-semibold text-white">All Jobs ({jobs.length})</p>
          </div>
          <div className="divide-y divide-gray-700/50">
            {jobs.map((job) => {
              const cfg = agentConfig[job.agent] || agentConfig.cody
              return (
                <div key={job.id} className="px-4 py-3 flex items-center gap-4">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium">{job.name}</p>
                    <p className="text-xs text-white/30 mt-0.5 font-mono">{job.schedule} — {humanSchedule(job.schedule)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-white/30">{job.run_count} runs</p>
                    {job.last_status && (
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        job.last_status === 'success' ? 'bg-emerald-500/20 text-[#c9a96e]' : 'bg-red-500/10 text-red-400/70'
                      }`}>
                        {job.last_status}
                      </span>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.text} capitalize`}>
                    {job.agent}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
