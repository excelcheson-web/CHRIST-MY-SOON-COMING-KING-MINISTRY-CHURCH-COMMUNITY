import { ArrowRight, Heart, UserPlus } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'

export function Invitation() {
  return (
    <section aria-labelledby="invitation-heading" className="container py-20 sm:py-24">
      <div className="relative overflow-hidden rounded-[2rem] bg-royal-gradient px-6 py-16 text-center text-white sm:rounded-[2.5rem] sm:px-12 sm:py-20">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-dot-grid opacity-[0.16]" />
          <div className="absolute -right-24 -top-24 size-80 rounded-full bg-accent/25 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-2xl">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-white/15 backdrop-blur">
            <Heart className="size-8 text-accent" aria-hidden />
          </span>

          <h2 id="invitation-heading" className="mt-7 text-3xl sm:text-4xl lg:text-5xl">
            There is a seat here with your name on it
          </h2>

          <p className="mt-5 text-pretty text-lg text-white/85 sm:text-xl">
            Creating an account takes less than a minute. It is free, and it is how we stay in touch
            with you as more of the platform opens up.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="xl" variant="accent">
              <Link href="/register">
                <UserPlus aria-hidden />
                Join the family
              </Link>
            </Button>
            <Button
              asChild
              size="xl"
              variant="outline"
              className="border-white/35 bg-white/10 text-white hover:border-white/60 hover:bg-white/20"
            >
              <Link href="/about">
                Read our story
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
