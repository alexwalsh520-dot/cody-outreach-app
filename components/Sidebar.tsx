'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import {
  BarChart3, Database, Send, DollarSign, Calendar, Radio,
  Search, Crosshair, PenTool, TrendingUp, Brain,
} from 'lucide-react'
import { type LucideIcon } from 'lucide-react'

type NavItem = { href: string; label: string; icon: LucideIcon; live?: boolean }
type Agent = { id: string; name: string; icon: LucideIcon; status: string }

const navItems: NavItem[] = [
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/knowledge', label: 'Lead Database', icon: Database },
  { href: '/campaigns', label: 'Campaigns', icon: Send },
  { href: '/usage', label: 'Usage', icon: DollarSign },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/office', label: 'Live Feed', icon: Radio, live: true },
]

const agents: Agent[] = [
  { id: 'scout', name: 'Scout', icon: Search, status: 'active' },
  { id: 'mason', name: 'Mason', icon: Crosshair, status: 'active' },
  { id: 'writer', name: 'Writer', icon: PenTool, status: 'idle' },
  { id: 'tracker', name: 'Tracker', icon: TrendingUp, status: 'idle' },
  { id: 'cody', name: 'Cody', icon: Brain, status: 'idle' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 bg-[#101014] border-r border-white/[0.06] flex flex-col h-full shrink-0">
      <nav className="flex-1 px-3 py-5">
        <p className="text-[10px] font-semibold text-white/25 uppercase tracking-[0.14em] px-3 mb-3">
          Dashboard
        </p>
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 group',
                  active
                    ? 'bg-[#c9a96e]/[0.08] text-[#d4b87d]'
                    : 'text-white/40 hover:text-white/65 hover:bg-white/[0.03]'
                )}
              >
                <Icon
                  className={clsx('w-[16px] h-[16px] shrink-0 transition-colors',
                    active ? 'text-[#c9a96e]' : 'text-white/20 group-hover:text-white/35'
                  )}
                  strokeWidth={1.7}
                />
                <span>{item.label}</span>
                {item.live && (
                  <span className="ml-auto flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/70 live-dot" />
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        <div className="mt-8">
          <p className="text-[10px] font-semibold text-white/25 uppercase tracking-[0.14em] px-3 mb-3">
            Agents
          </p>
          <div className="space-y-0.5">
            {agents.map((agent) => {
              const Icon = agent.icon
              return (
                <div key={agent.id} className="flex items-center gap-3 px-3 py-1.5 text-[12px]">
                  <Icon className="w-[14px] h-[14px] text-white/15" strokeWidth={1.6} />
                  <span className="flex-1 text-white/30">{agent.name}</span>
                  <span className={clsx(
                    'w-1.5 h-1.5 rounded-full',
                    agent.status === 'active' ? 'bg-[#c9a96e]/60 live-dot' : 'bg-white/[0.08]'
                  )} />
                </div>
              )
            })}
          </div>
        </div>
      </nav>

      <div className="px-4 py-3 border-t border-white/[0.05]">
        <p className="text-[10px] text-white/15 text-center font-mono">Scout v0.2</p>
      </div>
    </aside>
  )
}
