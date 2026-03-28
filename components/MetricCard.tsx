import clsx from 'clsx'

interface MetricCardProps {
  label: string
  value: string | number
  sub?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  accent?: boolean
  className?: string
}

export default function MetricCard({
  label,
  value,
  sub,
  trend,
  trendValue,
  accent = false,
  className,
}: MetricCardProps) {
  return (
    <div
      className={clsx(
        'bg-gray-800 rounded-xl p-4 border',
        accent ? 'border-emerald-500/30' : 'border-gray-700',
        className
      )}
    >
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p
        className={clsx(
          'text-2xl font-bold',
          accent ? 'text-emerald-400' : 'text-white'
        )}
      >
        {value}
      </p>
      <div className="flex items-center gap-2 mt-1">
        {sub && <p className="text-xs text-gray-500">{sub}</p>}
        {trend && trendValue && (
          <span
            className={clsx(
              'text-xs font-medium',
              trend === 'up' && 'text-emerald-400',
              trend === 'down' && 'text-red-400',
              trend === 'neutral' && 'text-gray-500'
            )}
          >
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '–'} {trendValue}
          </span>
        )}
      </div>
    </div>
  )
}
