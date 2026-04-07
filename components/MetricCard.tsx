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
  label, value, sub, trend, trendValue, icon: Icon, accent = 'default', className,
}: MetricCardProps) {
  const isGold = accent === 'gold'

  return (
    <div className={clsx(
      'rounded-xl p-5 transition-all duration-200',
      isGold ? 'card-gold' : 'card',
      className
    )}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-medium text-white/30 uppercase tracking-[0.08em]">{label}</p>
        {Icon && (
          <Icon className={clsx('w-4 h-4', isGold ? 'text-[#c9a96e]/25' : 'text-white/10')} strokeWidth={1.5} />
        )}
      </div>
      <p className={clsx(
        'text-[28px] font-bold tracking-tight leading-none',
        accent === 'gold' && 'text-[#c9a96e]',
        accent === 'green' && 'text-emerald-400',
        accent === 'cyan' && 'text-cyan-400/90',
        accent === 'default' && 'text-white/85'
      )}>
        {value}
      </p>
      {(sub || (trend && trendValue)) && (
        <div className="flex items-center gap-2 mt-2">
          {sub && <p className="text-[11px] text-white/25">{sub}</p>}
          {trend && trendValue && (
            <span className={clsx(
              'text-[11px] font-medium font-mono',
              trend === 'up' && 'text-emerald-400/70',
              trend === 'down' && 'text-red-400/70',
              trend === 'neutral' && 'text-white/20'
            )}>
              {trend === 'up' ? '+' : trend === 'down' ? '-' : ''}{trendValue}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
