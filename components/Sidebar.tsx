'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import {
  BarChart3,
  Database,
  Calendar,
  DollarSign,
  Send,
  Radio,
  Settings,
  Crosshair,
  PenTool,
  TrendingUp,
  Brain,
  Search,
} from 'lucide-react'
import { type LucideIcon } from 'lucide-react'

const navItems: { href: string; label: string; icon: LucideIcon; live?: boolean }[] = [
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/knowledge', label: 'Lead Database', icon: Database },
  { href: '/campaigns', label: 'Campaigns', icon: Send },
  { href: '/usage', label: 'Usage', icon: DollarSign },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/office', label: 'Live Feed', icon: Radio, live: true },
]

const agents: { id: string; name: string; icon: LucideIcon; role: string; status: string }[] = [
  { id: 'scout', name: 'Scout', icon: Search, role: 'Discovery', status: 'active' },
  { id: 'mason', name: 'Mason', icon: Crosshair, role: 'Qualification', status: 'active' },
  { id: 'writer', name: 'Writer', icon: PenTool, role: 'Outreach', status: 'idle' },
  { id: 'tracker', name: 'Tracker', icon: TrendingUp, role: 'Replies', status: 'idle' },
  { id: 'cody', name: 'Cody', icon: Brain, role: 'Orchestrator', status: 'idle' },
]

function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={clsx(
        'inline-block w-1.5 h-1.5 rounded-full',
        status === 'active' && 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.4)]',
        status === 'idle' && 'bg-white/10',
        status === 'error' && 'bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.4)]'
      )}
    />
  )
}

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-52 bg-[#08080e] border-r border-white/[0.04] flex flex-col h-full shrink-0">
      <nav className="flex-1 px-3 py-5 space-y-0.5">
        <p className="text-[10px] font-semibold text-white/20 uppercase tracking-[0.12em] px-2.5 mb-3">
          Dashboard
        </p>
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150',
                active
                  ? 'bg-white/[0.05] text-white'
                  : 'text-white/35 hover:text-white/60 hover:bg-white/[0.02]'
              )}
            >
              <Icon className={clsx('w-4 h-4 shrink-0', active ? 'text-gold' : 'text-white/20')} strokeWidth={1.8} />
              <span>{item.label}</span>
              {item.live && (
                <span className="ml-auto flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                </span>
              )}
            </Link>
          )
        })}

        <div className="pt-6">
          <p className="text-[10px] font-semibold text-white/20 uppercase tracking-[0.12em] px-2.5 mb-3">
            Agents
          </p>
          <div className="space-y-0.5">
            {agents.map((agent) => {
              const Icon = agent.icon
              return (
                <div
                  key={agent.id}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[12px]"
                >
                  <Icon className="w-3.5 h-3.5 text-white/15" strokeWidth={1.8} />
                  <span className="flex-1 text-white/30">{agent.name}</span>
                  <StatusDot status={agent.status} />
                </div>
              )
            })}
          </div>
        </div>
      </nav>

      <div className="px-3 py-3 border-t border-white/[0.04]">
        <button className="flex items-center gap-2 px-2.5 py-1.5 w-full rounded-lg text-[11px] text-white/20 hover:text-white/40 hover:bg-white/[0.02] transition-colors">
          <Settings className="w-3.5 h-3.5" strokeWidth={1.8} />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  )
}
