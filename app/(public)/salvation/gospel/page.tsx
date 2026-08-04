import { ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'

import { JourneyButton } from '@/components/salvation/journey-button'
import { JourneyShell } from '@/components/salvation/journey-shell'
import { getGospelContent } from '@/lib/gospel-content'

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
  title: 'The good news',
  description: 'The gospel in four short steps: God loves you, sin got in the way, Jesus made a way, and now it is your turn.',
  alternates: { canonical: '/salvation/gospel' },
}

export default async function GospelPage() {
  const { steps: gospelSteps } = await getGospelContent()

  return (
    <JourneyShell
      step="gospel"
      title="The good news, in four steps"
      subtitle="Read it slowly. There is no rush, and nothing here is a trick."
    >
      <ol className="space-y-6">
        {gospelSteps.map((step) => (
          <li key={step.id}>
            <article className="rounded-3xl border-2 border-border bg-card p-6 shadow-soft sm:p-9">
              <div className="flex items-start gap-4">
                <span
                  aria-hidden
                  className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary-soft text-2xl"
                >
                  {step.emoji}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">
                    {step.eyebrow}
                  </p>
                  <h2 className="mt-1 text-2xl sm:text-3xl">{step.title}</h2>
                </div>
              </div>

              <div className="mt-6 space-y-4 text-pretty text-lg leading-relaxed text-foreground/90">
                {step.body.map((paragraph) => (
                  <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                ))}
              </div>

              <blockquote className="mt-7 rounded-r-2xl border-l-4 border-accent bg-accent-soft/70 py-5 pl-6 pr-5">
                <p className="font-display text-lg italic text-foreground sm:text-xl">
                  “{step.verse.text}”
                </p>
                <footer className="mt-3 text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  {step.verse.reference}
                </footer>
              </blockquote>
            </article>
          </li>
        ))}
      </ol>

      <div className="mt-12 rounded-3xl bg-royal-gradient p-7 text-center text-white sm:p-10">
        <h2 className="text-2xl sm:text-3xl">Ready to say yes?</h2>
        <p className="mx-auto mt-4 max-w-lg text-pretty text-white/85">
          The next page has a prayer you can pray. You do not have to feel anything special — you
          just have to mean it.
        </p>
        <JourneyButton
          href="/salvation/prayer"
          step="gospel"
          size="xl"
          variant="accent"
          className="mt-8"
        >
          Yes — take me to the prayer
          <ArrowRight aria-hidden />
        </JourneyButton>
      </div>
    </JourneyShell>
  )
}
