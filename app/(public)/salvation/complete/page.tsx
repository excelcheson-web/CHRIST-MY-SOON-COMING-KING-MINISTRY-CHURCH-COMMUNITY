import { ArrowRight, PartyPopper, UserPlus } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { JourneyShell } from '@/components/salvation/journey-shell'
import { Button } from '@/components/ui/button'
import { getGospelContent } from '@/lib/gospel-content'
import { getSiteSettings } from '@/lib/site-settings'

/*
 * Static, but refreshed every five minutes.
 *
 * These pages read admin-editable content (ministry details, page copy, the
 * gospel wording) that falls back to a bundled file when the database is
 * unreachable. Prerendering them with no revalidation baked whichever answer
 * the build happened to get: a build that ran while Neon was asleep shipped the
 * placeholder copy permanently. Saving in /admin still revalidates instantly —
 * this is the safety net for the build itself.
 */
export const revalidate = 300


export const metadata: Metadata = {
  title: 'Welcome to the family',
  description: 'What happens next after deciding to follow Jesus.',
  alternates: { canonical: '/salvation/complete' },
  robots: { index: false, follow: true },
}

export default async function SalvationCompletePage() {
  const [settings, gospel] = await Promise.all([getSiteSettings(), getGospelContent()])
  const nextSteps = gospel.nextSteps

  return (
    <JourneyShell
      step="complete"
      title="Welcome to the family 🎉"
      subtitle="Today is worth remembering. Heaven noticed, and so did we."
    >
      <div className="rounded-3xl border-2 border-accent/30 bg-accent-soft/60 p-7 text-center sm:p-10">
        <PartyPopper className="mx-auto size-10 text-accent-foreground" aria-hidden />
        <p className="mt-5 text-balance font-display text-xl font-bold leading-snug text-foreground sm:text-2xl">
          “There is joy before the angels of God over one sinner who repents.”
        </p>
        <p className="mt-4 text-sm font-bold uppercase tracking-[0.16em] text-muted-foreground">
          Luke 15:10
        </p>
      </div>

      <section aria-labelledby="what-next" className="mt-14">
        <h2 id="what-next" className="text-2xl sm:text-3xl">
          What happens now
        </h2>

        <ol className="mt-6 space-y-4">
          {nextSteps.map((step, index) => (
            <li
              key={step.title}
              className="flex items-start gap-4 rounded-2xl border-2 border-border bg-card p-5 shadow-soft sm:p-6"
            >
              <span
                aria-hidden
                className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-xl"
              >
                {step.emoji}
              </span>
              <span className="min-w-0">
                <span className="block font-display text-lg font-bold text-foreground">
                  <span className="text-primary">{index + 1}.</span> {step.title}
                </span>
                <span className="mt-1 block text-pretty text-muted-foreground">{step.body}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-12 rounded-3xl bg-royal-gradient p-7 text-center text-white sm:p-10">
        <h2 className="text-2xl sm:text-3xl">Start growing today</h2>
        <p className="mx-auto mt-4 max-w-lg text-pretty text-white/85">
          Our six-week course, First Steps, begins exactly where you are. Create a free account and
          your progress is saved as you go.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="xl" variant="accent">
            <Link href="/discipleship/first-steps">
              Start First Steps
              <ArrowRight aria-hidden />
            </Link>
          </Button>
          <Button
            asChild
            size="xl"
            variant="outline"
            className="border-white/35 bg-white/10 text-white hover:border-white/60 hover:bg-white/20"
          >
            <Link href="/register">
              <UserPlus aria-hidden />
              Create an account
            </Link>
          </Button>
        </div>
      </div>

      <p className="mt-10 text-center text-pretty text-muted-foreground">
        Want to talk to someone right now? Email{' '}
        <a
          href={`mailto:${settings.contact.email}`}
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          {settings.contact.email}
        </a>{' '}
        or call {settings.contact.phone}.
      </p>
    </JourneyShell>
  )
}
