import clsx from 'clsx'
import { type LucideIcon, Search, Crosshair, PenTool, TrendingUp, Brain } from 'lucide-react'

const agentIcons: Record<string, LucideIcon> = {
  scout: Search, mason: Crosshair, writer: PenTool, tracker: TrendingUp, cody: Brain,
}

interface AgentCardProps {
  name: string
  emoji: string
  role: string
  status: 'active' | 'idle' | 'error'
  lastAction?: string
  lastActionTime?: string
  nextTask?: string
}

export default function AgentCard({ name, emoji, role, status, lastAction, lastActionTime, nextTask }: AgentCardProps) {
  const Icon = agentIcons[name.toLowerCase()] || Brain

  return (
    <div className={clsx(
      'rounded-xl p-4 transition-all duration-300',
      status === 'active' ? 'glass-gold' : 'glass',
      status === 'error' && 'border-red-500/20'
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <Icon className={clsx(
            'w-4 h-4',
            status === 'active' ? 'text-[#c9a96e]/50' : 'text-white/15'
          )} strokeWidth={1.5} />
          <div>
            <p className="text-[12px] font-semibold text-white/70">{name}</p>
            <p className="text-[10px] text-white/20">{role}</p>
          </div>
        </div>
        <span className={clsx(
          'w-1.5 h-1.5 rounded-full mt-1',
          status === 'active' && 'bg-[#c9a96e]/60 live-dot',
          status === 'idle' && 'bg-white/8',
          status === 'error' && 'bg-red-400/60 live-dot'
        )} />
      </div>

      {lastAction && (
        <div className="mb-2">
          <p className="text-[10px] text-white/30 leading-relaxed line-clamp-2">{lastAction}</p>
          {lastActionTime && <p className="text-[9px] text-white/10 mt-0.5">{lastActionTime}</p>}
        </div>
      )}

      {nextTask && (
        <div className="mt-2 pt-2 border-t border-white/[0.03]">
          <p className="text-[9px] text-white/10 uppercase tracking-wider mb-0.5">Next</p>
          <p className="text-[10px] text-white/20">{nextTask}</p>
        </div>
      )}
    </div>
  )
}
