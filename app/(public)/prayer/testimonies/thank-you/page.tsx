import { ArrowRight, CheckCircle2 } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { PageHero } from '@/components/page-hero'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Thank you for sharing',
  robots: { index: false, follow: true },
}

export default function TestimonyThankYouPage() {
  return (
    <>
      <PageHero
        eyebrow="Prayer Portal"
        title="Thank you for sharing 🎉"
        subtitle="Your story is with our team now."
        emoji="✨"
        crumbs={[
          { href: '/prayer', label: 'Prayer' },
          { href: '/prayer/testimonies', label: 'Testimonies' },
        ]}
      />

      <div className="container pb-20 pt-4">
        <div className="mx-auto max-w-2xl rounded-3xl border-2 border-border bg-card p-7 shadow-soft sm:p-10">
          <CheckCircle2 className="size-10 text-success" aria-hidden />
          <h2 className="mt-5 text-2xl">What happens next</h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            One of our team will read it — usually within a day or two — and then it will appear on
            the testimonies page. We only ever check that it is safe and encouraging; we will not
            rewrite your words.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/prayer/testimonies">
                Read other stories
                <ArrowRight aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/prayer">Go to the prayer wall</Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
