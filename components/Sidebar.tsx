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
    <aside className="w-48 bg-[#050507] border-r border-white/[0.03] flex flex-col h-full shrink-0">
      <nav className="flex-1 px-2 py-6 space-y-0.5">
        <p className="text-[9px] font-semibold text-white/15 uppercase tracking-[0.16em] px-3 mb-4">
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
                'flex items-center gap-2.5 px-3 py-[7px] rounded-md text-[12px] font-medium transition-all duration-200 group',
                active
                  ? 'bg-white/[0.04] text-white/80'
                  : 'text-white/25 hover:text-white/45 hover:bg-white/[0.02]'
              )}
            >
              <Icon
                className={clsx('w-[14px] h-[14px] shrink-0 transition-colors duration-200',
                  active ? 'text-[#c9a96e]' : 'text-white/15 group-hover:text-white/25'
                )}
                strokeWidth={1.6}
              />
              <span className="tracking-[0.01em]">{item.label}</span>
              {item.live && active && (
                <span className="ml-auto w-1 h-1 rounded-full bg-emerald-400/60 live-dot" />
              )}
            </Link>
          )
        })}

        <div className="pt-8">
          <p className="text-[9px] font-semibold text-white/15 uppercase tracking-[0.16em] px-3 mb-4">
            Agents
          </p>
          <div className="space-y-0.5">
            {agents.map((agent) => {
              const Icon = agent.icon
              return (
                <div key={agent.id} className="flex items-center gap-2.5 px-3 py-[5px] text-[11px]">
                  <Icon className="w-3 h-3 text-white/10" strokeWidth={1.6} />
                  <span className="flex-1 text-white/20">{agent.name}</span>
                  <span className={clsx(
                    'w-1 h-1 rounded-full',
                    agent.status === 'active' ? 'bg-[#c9a96e]/50 live-dot' : 'bg-white/8'
                  )} />
                </div>
              )
            })}
          </div>
        </div>
      </nav>
    </aside>
  )
}
