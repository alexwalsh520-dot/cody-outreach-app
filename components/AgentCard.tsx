import clsx from 'clsx'

interface AgentCardProps {
  name: string
  emoji: string
  role: string
  status: 'active' | 'idle' | 'error'
  lastAction?: string
  lastActionTime?: string
  nextTask?: string
}

export default function AgentCard({
  name,
  emoji,
  role,
  status,
  lastAction,
  lastActionTime,
  nextTask,
}: AgentCardProps) {
  const statusConfig = {
    active: { label: 'Active', dot: 'bg-emerald-500 animate-pulse', text: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    idle: { label: 'Idle', dot: 'bg-gray-600', text: 'text-gray-500', bg: 'bg-gray-800 border-gray-700' },
    error: { label: 'Error', dot: 'bg-red-500 animate-pulse', text: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  }

  const cfg = statusConfig[status]

  return (
    <div className={clsx('rounded-xl p-4 border', cfg.bg)}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{emoji}</span>
          <div>
            <p className="font-semibold text-white text-sm">{name}</p>
            <p className="text-xs text-gray-500">{role}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={clsx('w-2 h-2 rounded-full', cfg.dot)} />
          <span className={clsx('text-xs font-medium', cfg.text)}>{cfg.label}</span>
        </div>
      </div>

      {lastAction && (
        <div className="mb-2">
          <p className="text-xs text-gray-500 mb-0.5">Last action</p>
          <p className="text-xs text-gray-300 leading-snug">{lastAction}</p>
          {lastActionTime && (
            <p className="text-xs text-gray-600 mt-0.5">{lastActionTime}</p>
          )}
        </div>
      )}

      {nextTask && (
        <div className="mt-2 pt-2 border-t border-gray-700/50">
          <p className="text-xs text-gray-500 mb-0.5">Next task</p>
          <p className="text-xs text-gray-400">{nextTask}</p>
        </div>
      )}
    </div>
  )
}
