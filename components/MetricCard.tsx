import clsx from 'clsx'
import { type LucideIcon } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: string | number
  sub?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  icon?: LucideIcon
  accent?: 'gold' | 'green' | 'cyan' | 'default'
  className?: string
}

export default function MetricCard({
  label,
  value,
  sub,
  trend,
  trendValue,
  icon: Icon,
  accent = 'default',
  className,
}: MetricCardProps) {
  return (
    <div
      className={clsx(
        'glass rounded-xl p-4 transition-all duration-200 hover:border-white/[0.08]',
        className
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <p className="text-[10px] font-semibold text-white/25 uppercase tracking-[0.1em]">{label}</p>
        {Icon && <Icon className="w-4 h-4 text-white/10" strokeWidth={1.5} />}
      </div>
      <p
        className={clsx(
          'text-2xl font-bold tracking-tight',
          accent === 'gold' && 'text-gold',
          accent === 'green' && 'text-emerald-400',
          accent === 'cyan' && 'text-cyan-400',
          accent === 'default' && 'text-white/90'
        )}
      >
        {value}
      </p>
      <div className="flex items-center gap-2 mt-1.5">
        {sub && <p className="text-[11px] text-white/20">{sub}</p>}
        {trend && trendValue && (
          <span
            className={clsx(
              'text-[11px] font-medium',
              trend === 'up' && 'text-emerald-400/70',
              trend === 'down' && 'text-red-400/70',
              trend === 'neutral' && 'text-white/20'
            )}
          >
            {trend === 'up' ? '+' : trend === 'down' ? '-' : ''}{trendValue}
          </span>
        )}
      </div>
    </div>
  )
}
