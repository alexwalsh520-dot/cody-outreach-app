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
      'rounded-xl p-5 transition-all duration-300',
      isGold ? 'glass-gold' : 'glass',
      className
    )}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-semibold text-white/20 uppercase tracking-[0.12em]">{label}</p>
        {Icon && <Icon className={clsx('w-[14px] h-[14px]', isGold ? 'text-[#c9a96e]/30' : 'text-white/8')} strokeWidth={1.5} />}
      </div>
      <p className={clsx(
        'text-[26px] font-bold tracking-tight leading-none',
        accent === 'gold' && 'text-[#c9a96e]',
        accent === 'green' && 'text-emerald-400/90',
        accent === 'cyan' && 'text-cyan-400/80',
        accent === 'default' && 'text-white/85'
      )}>
        {value}
      </p>
      {(sub || (trend && trendValue)) && (
        <div className="flex items-center gap-2 mt-2">
          {sub && <p className="text-[10px] text-white/15">{sub}</p>}
          {trend && trendValue && (
            <span className={clsx(
              'text-[10px] font-medium font-mono',
              trend === 'up' && 'text-emerald-400/60',
              trend === 'down' && 'text-red-400/60',
              trend === 'neutral' && 'text-white/15'
            )}>
              {trend === 'up' ? '+' : trend === 'down' ? '-' : ''}{trendValue}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
