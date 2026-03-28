'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

const navItems = [
  { href: '/analytics', label: 'Analytics', emoji: '📊' },
  { href: '/knowledge', label: 'Knowledge Base', emoji: '📚' },
  { href: '/calendar', label: 'Calendar', emoji: '🗓️' },
  { href: '/usage', label: 'Usage', emoji: '💸' },
  { href: '/campaigns', label: 'Campaigns', emoji: '📧' },
  { href: '/office', label: 'Office', emoji: '🏢', live: true },
]

const agents = [
  { id: 'cody', name: 'Cody', emoji: '🧠', status: 'active' },
  { id: 'scout', name: 'Scout', emoji: '🔍', status: 'idle' },
  { id: 'writer', name: 'Writer', emoji: '✍️', status: 'idle' },
  { id: 'tracker', name: 'Tracker', emoji: '📊', status: 'active' },
  { id: 'analyst', name: 'Analyst', emoji: '📈', status: 'idle' },
]

function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={clsx(
        'inline-block w-2 h-2 rounded-full',
        status === 'active' && 'bg-emerald-500 animate-pulse',
        status === 'idle' && 'bg-gray-600',
        status === 'error' && 'bg-red-500 animate-pulse'
      )}
    />
  )
}

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col h-full shrink-0">
      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mb-3">
          Dashboard
        </p>
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              )}
            >
              <span className="text-base">{item.emoji}</span>
              <span>{item.label}</span>
              {item.live && (
                <span className="ml-auto text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-semibold">
                  LIVE
                </span>
              )}
            </Link>
          )
        })}

        {/* Agents */}
        <div className="pt-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mb-3">
            Agents
          </p>
          <div className="space-y-1">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm text-gray-400"
              >
                <span className="text-base">{agent.emoji}</span>
                <span className="flex-1">{agent.name}</span>
                <StatusDot status={agent.status} />
              </div>
            ))}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-gray-800">
        <p className="text-xs text-gray-600 text-center">CC OS Outreach v0.1</p>
      </div>
    </aside>
  )
}
