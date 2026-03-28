'use client'

import { useEffect, useState } from 'react'
import { supabase, AgentEvent, AGENTS } from '@/lib/supabase'
import AgentCard from '@/components/AgentCard'
import ActivityFeed from '@/components/ActivityFeed'
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

function buildAgentStates(events: AgentEvent[]): AgentState[] {
  const latestByAgent: Record<string, AgentEvent> = {}
  events.forEach((e) => {
    if (!latestByAgent[e.agent] || new Date(e.created_at) > new Date(latestByAgent[e.agent].created_at)) {
      latestByAgent[e.agent] = e
    }
  })

  return AGENTS.map((agent) => {
    const latest = latestByAgent[agent.id]
    const isRecent = latest && (Date.now() - new Date(latest.created_at).getTime()) < 5 * 60 * 1000 // 5 min

    let status: AgentStatus = 'idle'
    if (latest?.status === 'error') status = 'error'
    else if (isRecent) status = 'active'

    return {
      ...agent,
      status,
      lastAction: latest?.event || 'No recent activity',
      lastActionTime: latest ? formatDistanceToNow(new Date(latest.created_at), { addSuffix: true }) : '',
      nextTask: defaultNextTasks[agent.id] || 'Unscheduled',
    }
  })
}

export default function OfficePage() {
  const [agentStates, setAgentStates] = useState<AgentState[]>(
    AGENTS.map((a) => ({ ...a, status: 'idle' as AgentStatus, lastAction: 'No recent activity', lastActionTime: '', nextTask: defaultNextTasks[a.id] || '' }))
  )
  const [totalEvents, setTotalEvents] = useState(0)

  useEffect(() => {
    // Initial load
    const loadEvents = async () => {
      const { data, count } = await supabase
        .from('agent_events')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(100)

      if (data) {
        setAgentStates(buildAgentStates(data as AgentEvent[]))
        setTotalEvents(count || 0)
      }
    }
    loadEvents()

    // Real-time subscription
    const channel = supabase
      .channel('office_agent_events')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'agent_events' },
        async () => {
          // Re-fetch latest events to rebuild agent states
          const { data, count } = await supabase
            .from('agent_events')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .limit(100)
          if (data) {
            setAgentStates(buildAgentStates(data as AgentEvent[]))
            setTotalEvents(count || 0)
          }
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
          <p className="text-sm text-gray-500 mt-0.5">Live agent status and activity feed</p>
        </div>
        <div className="flex items-center gap-3">
          {activeCount > 0 && (
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-emerald-400">{activeCount} active</span>
            </div>
          )}
          {errorCount > 0 && (
            <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-medium text-red-400">{errorCount} error</span>
            </div>
          )}
          <span className="text-xs text-gray-600">{totalEvents.toLocaleString()} total events</span>
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
      <ActivityFeed maxItems={100} />
    </div>
  )
}
