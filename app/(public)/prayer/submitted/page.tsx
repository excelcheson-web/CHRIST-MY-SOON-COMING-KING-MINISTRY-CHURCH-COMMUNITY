import { ArrowRight, HandHeart, Users } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { PageHero } from '@/components/page-hero'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Thank you',
  description: 'Your prayer request has been received.',
  robots: { index: false, follow: true },
}

export default function PrayerSubmittedPage() {
  return (
    <>
      <PageHero
        eyebrow="Prayer Portal"
        title="We have it — and we are praying"
        subtitle="Your request is with our prayer team now."
        emoji="🙏"
        crumbs={[
          { href: '/', label: 'Home' },
          { href: '/prayer', label: 'Prayer' },
        ]}
      />

      <div className="container pb-20 pt-4">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-3xl border-2 border-accent/30 bg-accent-soft/60 p-7 text-center sm:p-10">
            <HandHeart className="mx-auto size-10 text-accent-foreground" aria-hidden />
            <blockquote className="mt-5">
              <p className="text-balance font-display text-xl font-bold leading-snug text-foreground sm:text-2xl">
                “Cast all your anxieties on him, because he cares for you.”
              </p>
              <footer className="mt-4 text-sm font-bold uppercase tracking-[0.16em] text-muted-foreground">
                1 Peter 5:7
              </footer>
            </blockquote>
          </div>

          <div className="mt-10 rounded-3xl border-2 border-border bg-card p-7 shadow-soft sm:p-9">
            <h2 className="flex items-center gap-3 text-2xl">
              <Users className="size-7 text-primary" aria-hidden />
              Now pray for someone else
            </h2>
            <p className="mt-4 text-pretty text-muted-foreground">
              One of the kindest things you can do while waiting on God for your own situation is to
              stand with somebody else in theirs. The wall is full of people who would be glad to
              know you prayed.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/prayer">
                  Pray for others
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/prayer/groups">Join a prayer group</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
