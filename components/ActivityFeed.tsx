'use client'

import { useEffect, useState } from 'react'
import { supabase, AgentEvent } from '@/lib/supabase'
import clsx from 'clsx'
import { formatDistanceToNow } from 'date-fns'

const agentEmojis: Record<string, string> = {
  cody: '🧠',
  scout: '🔍',
  writer: '✍️',
  tracker: '📊',
  analyst: '📈',
}

function EventRow({ event }: { event: AgentEvent }) {
  const emoji = agentEmojis[event.agent.toLowerCase()] ?? '🤖'
  const timeAgo = formatDistanceToNow(new Date(event.created_at), { addSuffix: true })

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-white/[0.04] animate-fade-in">
      <span className="text-base mt-0.5 shrink-0">{emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-semibold text-white/60 capitalize">{event.agent}</span>
          <span
            className={clsx(
              'text-xs px-1.5 py-0.5 rounded font-medium',
              event.status === 'ok' && 'bg-emerald-500/10 text-[#c9a96e]',
              event.status === 'error' && 'bg-red-500/10 text-red-400',
              event.status === 'warning' && 'bg-yellow-500/10 text-yellow-400'
            )}
          >
            {event.status}
          </span>
          <span className="text-xs text-white/20 ml-auto shrink-0">{timeAgo}</span>
        </div>
        <p className="text-xs text-white/45 leading-snug">{event.event}</p>
      </div>
    </div>
  )
}

interface ActivityFeedProps {
  initialEvents?: AgentEvent[]
  maxItems?: number
  className?: string
}

export default function ActivityFeed({ initialEvents = [], maxItems = 50, className }: ActivityFeedProps) {
  const [events, setEvents] = useState<AgentEvent[]>(initialEvents)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    // Fetch recent events on mount
    supabase
      .from('agent_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(maxItems)
      .then(({ data }) => {
        if (data) setEvents(data as AgentEvent[])
      })

    // Subscribe to real-time inserts
    const channel = supabase
      .channel('agent_events_feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'agent_events' },
        (payload) => {
          setEvents((prev) => [payload.new as AgentEvent, ...prev].slice(0, maxItems))
        }
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [maxItems])

  return (
    <div className={clsx('bg-[#161619] rounded-xl border border-white/[0.06]', className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <h3 className="text-sm font-semibold text-white">Live Activity Feed</h3>
        <div className="flex items-center gap-1.5">
          <span
            className={clsx(
              'w-2 h-2 rounded-full',
              connected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-600'
            )}
          />
          <span className="text-xs text-white/30">
            {connected ? 'Live' : 'Connecting...'}
          </span>
        </div>
      </div>
      <div className="px-4 overflow-y-auto max-h-96">
        {events.length === 0 ? (
          <p className="text-sm text-white/30 py-8 text-center">No activity yet. Agents will log here.</p>
        ) : (
          events.map((event) => <EventRow key={event.id} event={event} />)
        )}
      </div>
    </div>
  )
}
