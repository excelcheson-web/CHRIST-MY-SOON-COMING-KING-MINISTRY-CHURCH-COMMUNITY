import { ArrowRight, Clock, Heart, Lock, MessageCircleQuestion } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { JourneyButton } from '@/components/salvation/journey-button'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Follow Jesus — How to Be Saved',
  description:
    'Give your life to Jesus Christ today. A short, simple walk through the gospel and a prayer of salvation — no pressure, no jargon, and no cost.',
  alternates: { canonical: '/salvation' },
}

const reassurances = [
  { Icon: Clock, title: 'About five minutes', body: 'Four short pages. You can stop any time.' },
  { Icon: Lock, title: 'Nothing is required', body: 'You only share your details if you want to.' },
  {
    Icon: MessageCircleQuestion,
    title: 'Questions are welcome',
    body: 'You do not need to have it all worked out first.',
  },
]

export default function SalvationPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-royal-gradient text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-dot-grid opacity-[0.18]" />
          <div className="absolute -left-32 -top-40 size-[32rem] rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-48 right-[-10%] size-[36rem] rounded-full bg-accent/20 blur-3xl" />
        </div>

        <div className="container relative py-20 text-center sm:py-28">
          <div className="mx-auto max-w-3xl">
            <span
              aria-hidden
              className="mx-auto grid size-20 place-items-center rounded-3xl bg-white/12 text-4xl backdrop-blur"
            >
              ❤️
            </span>

            <h1 className="mt-8 font-display text-4xl font-extrabold leading-[1.08] sm:text-5xl lg:text-6xl">
              Would you like to{' '}
              <span className="bg-accent-gradient bg-clip-text text-transparent">follow Jesus?</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-white/85 sm:text-xl">
              You do not have to understand everything. You do not have to fix yourself first. If
              something in you is saying yes, that is enough to begin.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <JourneyButton href="/salvation/gospel" start size="xl" variant="accent">
                I want to follow Jesus
                <ArrowRight aria-hidden />
              </JourneyButton>

              <Button
                asChild
                size="xl"
                variant="outline"
                className="border-white/35 bg-white/10 text-white hover:border-white/60 hover:bg-white/20"
              >
                <Link href="/doctrine">First, what do you believe?</Link>
              </Button>
            </div>
          </div>
        </div>

        <div aria-hidden className="h-14 bg-gradient-to-b from-transparent to-background sm:h-20" />
      </section>

      <section aria-labelledby="reassurance" className="container py-16 sm:py-20">
        <h2 id="reassurance" className="sr-only">
          What to expect
        </h2>

        <ul className="grid gap-5 sm:grid-cols-3">
          {reassurances.map(({ Icon, title, body }) => (
            <li
              key={title}
              className="rounded-3xl border-2 border-border bg-card p-6 text-center shadow-soft"
            >
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
                <Icon className="size-7" aria-hidden />
              </span>
              <h3 className="mt-5 font-display text-lg font-bold text-foreground">{title}</h3>
              <p className="mt-2 text-pretty text-muted-foreground">{body}</p>
            </li>
          ))}
        </ul>

        <div className="mx-auto mt-16 max-w-2xl rounded-3xl border-2 border-accent/30 bg-accent-soft/60 p-7 text-center sm:p-10">
          <Heart className="mx-auto size-8 text-accent-foreground" aria-hidden />
          <blockquote className="mt-5">
            <p className="text-balance font-display text-xl font-bold leading-snug text-foreground sm:text-2xl">
              “Come to me, all who labour and are heavy laden, and I will give you rest.”
            </p>
            <footer className="mt-4 text-sm font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Matthew 11:28
            </footer>
          </blockquote>
        </div>
      </section>
    </>
  )
}
