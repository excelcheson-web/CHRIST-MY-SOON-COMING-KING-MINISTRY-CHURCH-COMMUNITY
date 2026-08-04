import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

import { photoProps } from '@/lib/photos'

/**
 * The two things this house is actually for.
 *
 * It sits directly under the hero because it is the first question a visitor
 * has — "what kind of church is this?" — and the answer is not decoration on
 * the About page. The photographs carry it: hands held in prayer, and hands
 * raised into the light.
 */
export function Mandate() {
  return (
    <section aria-labelledby="mandate-heading" className="container py-20 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-accent-ink">
          Our mandate
        </p>
        <h2 id="mandate-heading" className="mt-3 text-3xl sm:text-4xl">
          Deliverance and the Holy Ghost
        </h2>
        <p className="mt-4 text-pretty text-lg text-muted-foreground">
          This is not a slogan we picked. It is what God gave this house to do — and it is what you
          will find happening here on an ordinary Sunday.
        </p>
      </div>

      <div className="mx-auto mt-14 grid max-w-5xl gap-8 lg:grid-cols-2 lg:gap-10">
        <article className="flex flex-col overflow-hidden rounded-3xl border-2 border-border bg-card shadow-soft">
          {/* eslint-disable-next-line @next/next/no-img-element -- fixed, pre-sized asset */}
          <img
            {...photoProps('prayer', 'lg')}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-44 w-full object-cover sm:h-52"
          />

          <div className="flex flex-1 flex-col p-7 sm:p-9">
          <h3 className="text-2xl">Chains do break</h3>
          <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
            Some burdens do not lift by advice or willpower — addiction, torment, fear, patterns
            handed down a family line. We pray, we fast, and we stand with people until something
            gives.
          </p>
          <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
            It is pastoral, never theatrical. Nobody is put on display, nobody is shamed, and it
            never costs a penny.
          </p>


          <div className="pt-7" />


          <Link
            href="/prayer/submit"
            className="mt-auto inline-flex min-h-12 w-fit items-center gap-2 rounded-xl bg-primary px-6 font-display font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Ask for prayer
            <ArrowRight className="size-5" aria-hidden />
          </Link>
          </div>
        </article>

        <article className="flex flex-col overflow-hidden rounded-3xl border-2 border-border bg-card shadow-soft">
          {/* eslint-disable-next-line @next/next/no-img-element -- fixed, pre-sized asset */}
          <img
            {...photoProps('spirit', 'lg')}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-44 w-full object-cover sm:h-52"
          />

          <div className="flex flex-1 flex-col p-7 sm:p-9">
          <h3 className="text-2xl">Room for the Spirit</h3>
          <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
            We make room for the Holy Ghost to move — not noise for its own sake, but real presence.
            Conviction, comfort, gifts, and power to live differently on Monday.
          </p>
          <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
            We would rather wait on him than run a tidy service he was never invited to.
          </p>

          <div className="pt-7" />

          <Link
            href="/doctrine"
            className="mt-auto inline-flex min-h-12 w-fit items-center gap-2 rounded-xl border-2 border-primary/25 px-6 font-display font-semibold text-primary transition-colors hover:bg-primary-soft"
          >
            What we believe
            <ArrowRight className="size-5" aria-hidden />
          </Link>
          </div>
        </article>
      </div>
    </section>
  )
}
