import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'

const steps = [
  { key: 'gospel', label: 'The good news' },
  { key: 'prayer', label: 'Pray' },
  { key: 'contact', label: 'Say hello' },
  { key: 'complete', label: 'What next' },
] as const

export type JourneyStep = (typeof steps)[number]['key']

/**
 * Four dots along the top of the journey. Purely orientation — it tells someone
 * how much is left so the page never feels like an endless form.
 */
export function JourneySteps({ current }: { current: JourneyStep }) {
  const currentIndex = steps.findIndex((step) => step.key === current)

  return (
    <nav aria-label="Your progress" className="w-full">
      <ol className="flex items-center gap-2 sm:gap-3">
        {steps.map((step, index) => {
          const done = index < currentIndex
          const active = index === currentIndex

          return (
            <li key={step.key} className="flex min-w-0 flex-1 flex-col gap-2">
              <span
                aria-hidden
                className={cn(
                  'h-1.5 w-full rounded-full transition-colors',
                  done || active ? 'bg-accent' : 'bg-white/25',
                )}
              />
              <span
                className={cn(
                  'flex items-center gap-1.5 truncate text-xs font-semibold sm:text-sm',
                  active ? 'text-white' : 'text-white/60',
                )}
              >
                {done && <Check className="size-4 shrink-0 text-accent" aria-hidden />}
                <span className="truncate">{step.label}</span>
              </span>
              {active && <span className="sr-only">(current step)</span>}
            </li>
          )
        })}
      </ol>
      <p className="sr-only">
        Step {currentIndex + 1} of {steps.length}
      </p>
    </nav>
  )
}
