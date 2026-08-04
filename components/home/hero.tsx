import { ArrowRight, Clock, Sparkles, UserPlus } from 'lucide-react'
import Link from 'next/link'

import { BrandMark } from '@/components/layout/brand'
import { photoProps } from '@/lib/photos'
import { Button } from '@/components/ui/button'
import { getSiteSettings } from '@/lib/site-settings'

export async function Hero() {
  const settings = await getSiteSettings()

  return (
    <section className="relative overflow-hidden bg-royal-gradient text-white">
      {/* Decoration only — never announced, never interactive. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {/*
          A real congregation behind the whole banner, masked out towards the
          left so the heading always sits on flat navy and stays readable. Kept
          at 25% — this is atmosphere, not a picture to look at.
        */}
        {/* eslint-disable-next-line @next/next/no-img-element -- fixed, pre-sized asset */}
        <img
          {...photoProps('worship', 'lg')}
          alt=""
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="size-full object-cover opacity-25"
          style={{
            maskImage: 'linear-gradient(to right, transparent 8%, black 70%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 8%, black 70%)',
          }}
        />
        <div className="absolute inset-0 bg-dot-grid opacity-[0.18]" />
        <div className="absolute -left-32 -top-40 size-[34rem] rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-48 right-[-10%] size-[38rem] rounded-full bg-accent/20 blur-3xl" />
      </div>

      <div className="container relative grid items-center gap-14 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-20 2xl:gap-20">
        <div className="animate-fade-up">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.16em] text-white/90 backdrop-blur">
            <Sparkles className="size-4 text-accent" aria-hidden />
            A deliverance &amp; Holy Ghost ministry
          </p>

          {/*
            The ministry's own name is the headline; the slogan sits under it in
            teal. Both come from settings rather than being written in here, so
            renaming the ministry in /admin/settings actually renames it — the
            previous version had "Praise Arena" hard-coded as the heading, which
            is how the slogan came to outrank the name in the first place.
          */}
          <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            {settings.name}
          </h1>

          {settings.aka && (
            <p className="mt-4 font-display text-2xl font-extrabold uppercase tracking-[0.2em] sm:text-3xl">
              <span className="bg-accent-gradient bg-clip-text text-transparent">
                {settings.aka}
              </span>
            </p>
          )}

          <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-white/85 sm:text-xl">
            {settings.tagline} Come as you are, bring what you are carrying, and let the Holy Ghost
            do what only he can do.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button asChild size="xl" variant="accent">
              <Link href="/about">
                Learn more about us
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
                Create your account
              </Link>
            </Button>
          </div>

          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3">
            {settings.serviceTimes.map((service) => (
              <li key={service.day} className="flex items-center gap-2 text-sm text-white/80">
                <Clock className="size-4 text-accent" aria-hidden />
                <span className="font-semibold text-white">{service.day}</span>
                <span aria-hidden>·</span>
                <span>{service.time}</span>
              </li>
            ))}
          </ul>
        </div>

        {/*
          Designed panel rather than a stock photo placeholder. Swap the whole
          block for a <Image> of the congregation when a real photo exists —
          see README, "Adding your own photos".
        */}
        <div className="relative animate-fade-up [animation-delay:120ms]">
          <div className="relative mx-auto max-w-md rounded-[2.5rem] border border-white/20 bg-white/10 p-8 backdrop-blur-xl sm:p-10">
            <div className="flex justify-center">
              {/* onDark: the artwork has a white background, so it needs a card
                  of its own against the navy rather than a white square. */}
              {/* priority: this is the largest element in the first viewport,
                  so it should not wait behind lazy-loaded images. */}
              <BrandMark onDark priority className="size-28 p-2 drop-shadow-2xl sm:size-32" />
            </div>

            <blockquote className="mt-8 text-center">
              <p className="text-balance font-display text-2xl font-bold leading-snug sm:text-3xl">
                “Surely I am coming soon.”
              </p>
              <footer className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-accent">
                Revelation 22:20
              </footer>
            </blockquote>

            <p className="mt-8 text-center text-pretty text-white/80">
              That promise is our name, our hope, and the reason we gather.
            </p>
          </div>

          {/*
            Both badges sit clear of the panel's own text. The lower one used to
            be pinned inside the card and landed straight on top of the closing
            sentence — it is now below the card entirely.
          */}
          <span
            aria-hidden
            className="absolute -left-3 top-4 hidden rounded-2xl bg-white px-4 py-3 font-display text-sm font-bold text-primary shadow-lifted lg:block"
          >
            🎉 All ages welcome
          </span>
          <span
            aria-hidden
            className="absolute -bottom-5 -right-3 hidden rounded-2xl bg-accent px-4 py-3 font-display text-sm font-bold text-accent-foreground shadow-lifted lg:block"
          >
            ❤️ You belong here
          </span>
        </div>
      </div>

      {/* Soft transition into the page background. */}
      <div
        aria-hidden
        className="h-16 bg-gradient-to-b from-transparent to-background sm:h-20"
      />
    </section>
  )
}
