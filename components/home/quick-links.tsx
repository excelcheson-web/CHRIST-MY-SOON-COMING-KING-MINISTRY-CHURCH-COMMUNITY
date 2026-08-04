import { ArrowRight, Lock } from 'lucide-react'
import Link from 'next/link'

import { navIcons } from '@/components/icons'
import { photoProps } from '@/lib/photos'
import { futureLinks, quickLinks, type QuickLink } from '@/lib/site'

function ActiveTile({ item }: { item: QuickLink }) {
  const Icon = navIcons[item.icon]

  return (
    <Link
      href={item.href}
      className="group flex h-full flex-col overflow-hidden rounded-3xl border-2 border-border bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-lifted motion-reduce:hover:translate-y-0"
    >
      {/*
        A restrained banner rather than a big picture. The photograph sets the
        mood; the words underneath do the work. It is decorative — the label
        below already names the destination — so it carries an empty alt.
      */}
      <span className="relative block h-28 overflow-hidden bg-secondary sm:h-32">
        {/* eslint-disable-next-line @next/next/no-img-element -- fixed, pre-sized asset */}
        <img
          {...photoProps(item.photo, 'sm')}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transform-none"
        />
        {/* A gradient, not a flat wash. The old `bg-primary/25` covered every
            banner in the same lavender, so twelve different photographs came
            out as twelve identical tiles. This keeps the white icon legible at
            the bottom and leaves the picture visible at the top. */}
        <span
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-primary/45 via-primary/15 to-transparent"
        />
        <span
          aria-hidden
          className="absolute bottom-3 left-4 grid size-10 place-items-center rounded-xl bg-white/95 text-primary shadow-soft"
        >
          <Icon className="size-5" strokeWidth={2.25} />
        </span>
      </span>

      <span className="flex flex-1 flex-col p-5 sm:p-6">
        <span className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
          {item.label}
          <ArrowRight
            aria-hidden
            className="size-4 shrink-0 text-primary transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transform-none"
          />
        </span>
        <span className="mt-1 block text-pretty text-sm text-muted-foreground">{item.hint}</span>
        {/* Told before the click, not after the bounce. */}
        {item.membersOnly && (
          <span className="mt-3 flex w-fit items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Lock className="size-3" aria-hidden />
            Members
          </span>
        )}
      </span>
    </Link>
  )
}

function ComingSoonTile({ item }: { item: QuickLink }) {
  // Still the flat icon here: a full illustration would make an unavailable
  // tile compete with the ones that actually go somewhere.
  const Icon = navIcons[item.icon]

  return (
    // Not a link on purpose: a button that goes nowhere is worse than an
    // honest label. Announced as disabled so screen readers agree with the eye.
    <div
      aria-disabled="true"
      className="flex min-h-[8.5rem] flex-col justify-between rounded-3xl border-2 border-dashed border-border bg-secondary/40 p-5 sm:p-6"
    >
      <span className="grid size-12 place-items-center rounded-xl bg-card text-muted-foreground">
        <Icon className="size-6" aria-hidden strokeWidth={2.25} />
      </span>
      <span className="mt-4">
        <span className="block font-display text-lg font-bold text-foreground/70">{item.label}</span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{item.hint}</span>
        <span className="mt-3 inline-block rounded-full bg-accent-soft px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent-ink">
          Coming soon
        </span>
      </span>
    </div>
  )
}

export function QuickLinks() {
  return (
    <section aria-labelledby="quick-links-heading" className="container py-20 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 id="quick-links-heading" className="text-3xl sm:text-4xl">
          Where would you like to go?
        </h2>
        <p className="mt-4 text-pretty text-lg text-muted-foreground">
          Tap any big button below. Nothing here is hidden behind a menu.
        </p>
      </div>

      <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map((item: QuickLink) => (
          <li key={item.label}>
            <ActiveTile item={item} />
          </li>
        ))}
      </ul>

      {/* Hidden entirely once nothing is left to announce, rather than leaving
          a "Being built next" heading over an empty row. */}
      {futureLinks.length > 0 && (
        <div className="mt-16">
          <h3 className="text-center font-display text-xl font-bold text-foreground sm:text-2xl">
            Being built next
          </h3>
          <p className="mx-auto mt-3 max-w-xl text-center text-pretty text-muted-foreground">
            These are on the way in the next phases. We are showing them now so you know what is
            coming.
          </p>

          <ul
            className={
              futureLinks.length === 1
                ? 'mx-auto mt-8 grid max-w-sm gap-4'
                : 'mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-2 lg:grid-cols-3'
            }
          >
            {futureLinks.map((item) => (
              <li key={item.label}>
                <ComingSoonTile item={item} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
