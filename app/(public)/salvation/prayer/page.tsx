import { ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { JourneyButton } from '@/components/salvation/journey-button'
import { JourneyShell } from '@/components/salvation/journey-shell'
import { Button } from '@/components/ui/button'
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
  title: 'A prayer you can pray',
  description: 'A simple prayer of commitment — say it out loud, in your own words if you prefer.',
  alternates: { canonical: '/salvation/prayer' },
}

export default async function PrayerPage() {
  const { prayer: commitmentPrayer } = await getGospelContent()

  return (
    <JourneyShell
      step="prayer"
      title={commitmentPrayer.title}
      subtitle={commitmentPrayer.intro}
    >
      <div className="rounded-3xl border-2 border-accent/30 bg-accent-soft/50 p-7 sm:p-12">
        <p className="text-center text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Pray this
        </p>

        {/* Rendered as lines of a prayer rather than a paragraph, so it is easy
            to read aloud without losing your place. */}
        <div className="mt-7 space-y-4 text-center">
          {commitmentPrayer.lines.map((line) => (
            <p
              key={line}
              className="text-balance font-display text-xl font-bold leading-relaxed text-foreground sm:text-2xl"
            >
              {line}
            </p>
          ))}
        </div>
      </div>

      <div className="mt-10 rounded-3xl border-2 border-border bg-card p-7 shadow-soft sm:p-9">
        <h2 className="text-2xl">Did you pray that?</h2>
        <p className="mt-4 text-pretty text-lg leading-relaxed text-foreground/90">
          {commitmentPrayer.after}
        </p>

        <blockquote className="mt-6 rounded-r-2xl border-l-4 border-primary bg-primary-soft py-5 pl-6 pr-5">
          <p className="font-display text-lg italic text-foreground sm:text-xl">
            “{commitmentPrayer.afterVerse.text}”
          </p>
          <footer className="mt-3 text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {commitmentPrayer.afterVerse.reference}
          </footer>
        </blockquote>
      </div>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <JourneyButton href="/salvation/contact" step="prayer" size="xl" variant="default" block>
          I prayed this — what now?
          <ArrowRight aria-hidden />
        </JourneyButton>

        <Button asChild size="xl" variant="outline" block>
          <Link href="/salvation/gospel">Let me read again</Link>
        </Button>
      </div>

      <p className="mt-8 text-center text-pretty text-muted-foreground">
        Not ready yet? That is completely fine. Nothing here expires — come back whenever you want.
      </p>
    </JourneyShell>
  )
}
