'use client'

import { useEffect, useState } from 'react'
import { supabase, CronJob } from '@/lib/supabase'

const agentColors: Record<string, string> = {
  cody: 'bg-purple-500/20 border-purple-500/40 text-purple-300',
  scout: 'bg-blue-500/20 border-blue-500/40 text-blue-300',
  writer: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
  tracker: 'bg-orange-500/20 border-orange-500/40 text-orange-300',
  analyst: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300',
}

const agentDotColors: Record<string, string> = {
  cody: 'bg-purple-500',
  scout: 'bg-blue-500',
  writer: 'bg-emerald-500',
  tracker: 'bg-orange-500',
  analyst: 'bg-yellow-500',
}

function parseCron(schedule: string): string {
  const map: Record<string, string> = {
    '*/30 * * * *': 'Every 30 minutes',
    '0 6 * * *': 'Daily at 6:00 AM',
    '0 7 * * 1': 'Mondays at 7:00 AM',
    '0 8 * * *': 'Daily at 8:00 AM',
    '0 9 * * 1-5': 'Weekdays at 9:00 AM',
    '0 */2 * * *': 'Every 2 hours',
    '0 20 * * *': 'Daily at 8:00 PM',
  }
  return map[schedule] || schedule
}

const timeSlots = [
  '12am', '2am', '4am', '6am', '8am', '10am',
  '12pm', '2pm', '4pm', '6pm', '8pm', '10pm',
]

export default function CalendarPage() {
  const [jobs, setJobs] = useState<CronJob[]>([])
  const [selected, setSelected] = useState<CronJob | null>(null)
  const [loading, setLoading] = useState(true)

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

  const agents = Array.from(new Set(jobs.map((j) => j.agent)))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Calendar</h1>
        <p className="text-sm text-gray-500 mt-0.5">All scheduled agent jobs — color coded by agent</p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(agentDotColors).map(([agent, color]) => (
          <div key={agent} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
            <span className="text-xs text-gray-400 capitalize">{agent}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Job list */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="text-sm text-gray-500 py-8 text-center">Loading jobs...</div>
          ) : jobs.length === 0 ? (
            <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 text-center">
              <p className="text-gray-500 text-sm">No cron jobs registered yet.</p>
              <p className="text-gray-600 text-xs mt-1">Cody logs jobs to the cron_jobs table at startup.</p>
            </div>
          ) : (
            agents.map((agent) => (
              <div key={agent}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 capitalize">
                  {agent}
                </p>
                <div className="space-y-2">
                  {jobs.filter((j) => j.agent === agent).map((job) => (
                    <button
                      key={job.id}
                      onClick={() => setSelected(selected?.id === job.id ? null : job)}
                      className={`w-full text-left rounded-xl p-3 border transition-all ${
                        agentColors[agent] || 'bg-gray-800 border-gray-700 text-gray-300'
                      } ${selected?.id === job.id ? 'ring-1 ring-white/20' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{job.name}</p>
                          <p className="text-xs opacity-70 mt-0.5">{parseCron(job.schedule)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs opacity-60">{job.run_count} runs</p>
                          {job.last_status && (
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                              job.last_status === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {job.last_status}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {selected?.id === job.id && (
                        <div className="mt-3 pt-3 border-t border-white/10 space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="opacity-60">Schedule</span>
                            <span className="font-mono">{job.schedule}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="opacity-60">Enabled</span>
                            <span>{job.enabled ? '✅ Yes' : '⏸ No'}</span>
                          </div>
                          {job.last_run_at && (
                            <div className="flex justify-between text-xs">
                              <span className="opacity-60">Last run</span>
                              <span>{new Date(job.last_run_at).toLocaleString()}</span>
                            </div>
                          )}
                          {job.next_run_at && (
                            <div className="flex justify-between text-xs">
                              <span className="opacity-60">Next run</span>
                              <span>{new Date(job.next_run_at).toLocaleString()}</span>
                            </div>
                          )}
                          {job.last_duration_ms && (
                            <div className="flex justify-between text-xs">
                              <span className="opacity-60">Last duration</span>
                              <span>{job.last_duration_ms}ms</span>
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Daily timeline */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
          <p className="text-sm font-semibold text-white mb-4">Today's Schedule</p>
          <div className="space-y-2">
            {timeSlots.map((slot) => {
              const hour = slot.includes('am')
                ? slot === '12am' ? 0 : parseInt(slot)
                : slot === '12pm' ? 12 : parseInt(slot) + 12

              const activeJobs = jobs.filter((j) => {
                const parts = j.schedule.split(' ')
                const jobHour = parseInt(parts[1])
                return !isNaN(jobHour) && jobHour === hour
              })

              return (
                <div key={slot} className="flex items-start gap-2">
                  <span className="text-xs text-gray-600 w-10 shrink-0 mt-0.5">{slot}</span>
                  <div className="flex-1 min-h-[20px]">
                    {activeJobs.map((job) => (
                      <div
                        key={job.id}
                        className={`text-xs px-2 py-0.5 rounded mb-0.5 border ${agentColors[job.agent] || 'bg-gray-700 border-gray-600 text-gray-300'}`}
                      >
                        {job.name}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
