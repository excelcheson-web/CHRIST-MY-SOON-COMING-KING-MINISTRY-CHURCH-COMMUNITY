import { cn } from '@/lib/utils'

export function ProgressBar({
  percent,
  label,
  className,
  tone = 'primary',
}: {
  percent: number
  label: string
  className?: string
  tone?: 'primary' | 'light'
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)))

  return (
    <div className={cn('w-full', className)}>
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className={cn(
          'h-3 w-full overflow-hidden rounded-full',
          tone === 'light' ? 'bg-white/20' : 'bg-secondary',
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none',
            // On navy the wave teal only reached 2.2:1 against a translucent
            // white track — how full the bar is has to be obvious at a glance.
            tone === 'light' ? 'bg-accent-bright' : 'bg-accent-gradient',
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}
