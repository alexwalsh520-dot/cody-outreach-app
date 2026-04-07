'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import {
  LayoutDashboard, Database, Send, DollarSign, Radio,
} from 'lucide-react'
import { type LucideIcon } from 'lucide-react'

type NavItem = { href: string; label: string; icon: LucideIcon; live?: boolean }

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/knowledge', label: 'Lead Database', icon: Database },
  { href: '/campaigns', label: 'Campaigns', icon: Send },
  { href: '/usage', label: 'Usage', icon: DollarSign },
  { href: '/office', label: 'Live Feed', icon: Radio, live: true },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 bg-[#101014] border-r border-white/[0.06] flex flex-col h-full shrink-0">
      <nav className="flex-1 px-3 py-6">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 group',
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
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400/70 live-dot" />
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      <div className="px-4 py-3 border-t border-white/[0.05]">
        <p className="text-[10px] text-white/15 text-center font-mono">Scout v0.2</p>
      </div>
    </aside>
  )
}
