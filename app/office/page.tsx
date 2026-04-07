'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase, AgentEvent, AGENTS } from '@/lib/supabase'
import AgentCard from '@/components/AgentCard'
import { formatDistanceToNow } from 'date-fns'

type AgentStatus = 'active' | 'idle' | 'error'

interface AgentState {
  id: string
  name: string
  emoji: string
  role: string
  status: AgentStatus
  lastAction: string
  lastActionTime: string
  nextTask: string
}

const defaultNextTasks: Record<string, string> = {
  cody: 'Weekly constraint review — Mon 7:00 AM',
  scout: 'Daily Instagram scrape — 6:00 AM',
  writer: 'Send email sequences — 9:00 AM weekdays',
  tracker: 'Check Smartlead replies — every 30 min',
  analyst: 'Daily performance report — 8:00 PM',
}

function getStatus(event: AgentEvent | undefined): AgentStatus {
  if (!event) return 'idle'
  if (event.status === 'error') return 'error'
  const age = Date.now() - new Date(event.created_at).getTime()
  if (age < 5 * 60 * 1000) return 'active'   // < 5 min
  if (age < 60 * 60 * 1000) return 'idle'    // < 1 hour
  return 'idle'
}

function buildAgentStates(events: AgentEvent[]): AgentState[] {
  const latestByAgent: Record<string, AgentEvent> = {}
  events.forEach((e) => {
    const existing = latestByAgent[e.agent]
    if (!existing || new Date(e.created_at) > new Date(existing.created_at)) {
      latestByAgent[e.agent] = e
    }
  })

  return AGENTS.map((agent) => {
    const latest = latestByAgent[agent.id]
    return {
      ...agent,
      status: getStatus(latest),
      lastAction: latest?.event || 'No recent activity',
      lastActionTime: latest
        ? formatDistanceToNow(new Date(latest.created_at), { addSuffix: true })
        : '',
      nextTask: defaultNextTasks[agent.id] || 'Unscheduled',
    }
  })
}

const agentColors: Record<string, string> = {
  cody: 'text-[#c9a96e]',
  scout: 'text-blue-400',
  writer: 'text-purple-400',
  tracker: 'text-orange-400',
  analyst: 'text-yellow-400',
}

export default function OfficePage() {
  const [agentStates, setAgentStates] = useState<AgentState[]>(
    AGENTS.map((a) => ({
      ...a,
      status: 'idle' as AgentStatus,
      lastAction: 'No recent activity',
      lastActionTime: '',
      nextTask: defaultNextTasks[a.id] || '',
    }))
  )
  const [feedEvents, setFeedEvents] = useState<AgentEvent[]>([])
  const [totalEvents, setTotalEvents] = useState(0)
  const allEventsRef = useRef<AgentEvent[]>([])

  useEffect(() => {
    // Initial load
    const loadEvents = async () => {
      const { data, count } = await supabase
        .from('agent_events')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(100)

      if (data) {
        const events = data as AgentEvent[]
        allEventsRef.current = events
        setAgentStates(buildAgentStates(events))
        setFeedEvents(events.slice(0, 20))
        setTotalEvents(count || 0)
      }
    }
    loadEvents()

    // Real-time subscription
    const channel = supabase
      .channel('office_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'agent_events' },
        (payload) => {
          const newEvent = payload.new as AgentEvent
          // Prepend to our local state
          allEventsRef.current = [newEvent, ...allEventsRef.current].slice(0, 100)
          setAgentStates(buildAgentStates(allEventsRef.current))
          setFeedEvents((prev) => [newEvent, ...prev].slice(0, 20))
          setTotalEvents((prev) => prev + 1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const activeCount = agentStates.filter((a) => a.status === 'active').length
  const errorCount = agentStates.filter((a) => a.status === 'error').length

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Office</h1>
          <p className="text-sm text-white/30 mt-0.5">Live agent status and activity feed</p>
        </div>
        <div className="flex items-center gap-3">
          {activeCount > 0 && (
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-[#c9a96e]">{activeCount} active</span>
            </div>
          )}
          {errorCount > 0 && (
            <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-medium text-red-400">{errorCount} error</span>
            </div>
          )}
          <span className="text-xs text-white/20">{totalEvents.toLocaleString()} total events</span>
        </div>
      </div>

      {/* Agent cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {agentStates.map((agent) => (
          <AgentCard
            key={agent.id}
            name={agent.name}
            emoji={agent.emoji}
            role={agent.role}
            status={agent.status}
            lastAction={agent.lastAction}
            lastActionTime={agent.lastActionTime}
            nextTask={agent.nextTask}
          />
        ))}
      </div>

      {/* Live feed */}
      <div className="bg-[#161619] rounded-xl border border-white/[0.06]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <p className="text-sm font-semibold text-white">Live Activity Feed</p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-white/30">Real-time</span>
          </div>
        </div>
        {feedEvents.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-white/30 text-sm">No activity yet.</p>
            <p className="text-white/20 text-xs mt-1">Agent events will appear here in real-time as they run.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700/50">
            {feedEvents.map((event) => (
              <div key={event.id} className="px-4 py-3 flex items-start gap-3">
                <span className={`text-xs font-medium mt-0.5 capitalize shrink-0 w-16 ${agentColors[event.agent] || 'text-white/45'}`}>
                  {event.agent}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/60">{event.event}</p>
                  <p className="text-xs text-white/20 mt-0.5">
                    {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                  </p>
                </div>
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${
                  event.status === 'error' ? 'bg-red-500/10 text-red-400/70'
                  : event.status === 'warning' ? 'bg-amber-500/10 text-amber-400/70'
                  : 'bg-emerald-500/20 text-[#c9a96e]'
                }`}>
                  {event.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
