import type { ReactNode } from 'react'

import { JourneySteps, type JourneyStep } from '@/components/salvation/journey-steps'

/** Shared header for every stage of the journey: progress, title, subtitle. */
export function JourneyShell({
  step,
  title,
  subtitle,
  children,
}: {
  step: JourneyStep
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <>
      <section className="relative overflow-hidden bg-royal-gradient text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-dot-grid opacity-[0.16]" />
          <div className="absolute -right-24 -top-32 size-96 rounded-full bg-accent/20 blur-3xl" />
        </div>

        <div className="container relative py-12 sm:py-16">
          <div className="mx-auto max-w-3xl">
            <JourneySteps current={step} />

            <h1 className="mt-9 font-display text-3xl font-extrabold leading-[1.1] sm:text-4xl lg:text-5xl">
              {title}
            </h1>

            {subtitle && (
              <p className="mt-4 text-pretty text-lg leading-relaxed text-white/85">{subtitle}</p>
            )}
          </div>
        </div>

        <div aria-hidden className="h-10 bg-gradient-to-b from-transparent to-background sm:h-14" />
      </section>

      <div className="container pb-20 pt-4">
        <div className="mx-auto max-w-3xl">{children}</div>
      </div>
    </>
  )
}
