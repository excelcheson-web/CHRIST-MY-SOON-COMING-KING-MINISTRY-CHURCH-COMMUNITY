'use client'

import Link from 'next/link'
import { useState } from 'react'

import { useBrand } from '@/components/site-settings-provider'
import { LOGO_SRC } from '@/lib/brand-assets'
import { cn } from '@/lib/utils'

/**
 * The ministry emblem.
 *
 * Renders the real artwork from `public/images/logo.png`. If that file is not
 * there yet, it silently falls back to the drawn mark below rather than showing
 * a broken image — so the site is never visibly wrong, and it upgrades itself
 * the moment the PNG is dropped in.
 *
 * The printed logo is a square with a **white background**, which is fine on
 * pale surfaces and wrong on the navy hero. `onDark` gives it a white rounded
 * card to sit on, which reads as deliberate rather than as a mistake.
 */
export function BrandMark({
  className,
  onDark = false,
  priority = false,
}: {
  className?: string
  onDark?: boolean
  /** Set on the hero mark — it is the largest element above the fold. */
  priority?: boolean
}) {
  const [failed, setFailed] = useState(false)

  if (failed) return <DrawnMark className={className} onDark={onDark} />

  return (
    <span
      className={cn(
        'inline-flex shrink-0 overflow-hidden',
        onDark ? 'rounded-2xl bg-white p-1.5 shadow-soft' : 'rounded-xl',
        'size-11',
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- needs onError to fall back; a fixed 44px logo gains nothing from the image optimiser */}
      <img
        src={LOGO_SRC}
        alt=""
        width={512}
        height={512}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        onError={() => setFailed(true)}
        className="size-full object-contain"
      />
    </span>
  )
}

/**
 * Fallback only — a simplified navy roundel with dove, Bible and teal wave.
 *
 * Kept so the header is never empty before the real file is added. Delete it
 * once `public/images/logo.png` is committed, if you like.
 */
function DrawnMark({ className, onDark }: { className?: string; onDark?: boolean }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={cn('size-11 shrink-0', onDark && 'rounded-2xl bg-white p-1', className)}
      role="presentation"
    >
      <defs>
        <linearGradient id="cmsck-navy" x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="hsl(238 46% 36%)" />
          <stop offset="1" stopColor="hsl(243 60% 20%)" />
        </linearGradient>
        <linearGradient id="cmsck-teal" x1="4" y1="46" x2="60" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="hsl(186 72% 52%)" />
          <stop offset="1" stopColor="hsl(191 78% 40%)" />
        </linearGradient>
        <clipPath id="cmsck-roundel">
          <circle cx="32" cy="32" r="31" />
        </clipPath>
      </defs>

      <circle cx="32" cy="32" r="31" fill="url(#cmsck-navy)" />

      <g fill="#ffffff">
        <path d="M17.6 33.9 26 30.4l1.9 4.7-9.2 1.4z" opacity=".92" />
        <path d="M28.6 30.2c-3.5-3.7-5.6-8.4-6.2-14 3.9 3.5 6.8 7.8 8.4 12.7-.8.3-1.6.8-2.2 1.3z" opacity=".82" />
        <path d="M30.7 29.7c-1.5-6.1.3-12.6 5-17.9 1.2 6.3.4 12.3-2.5 17.6-.9 0-1.7.1-2.5.3z" />
        <ellipse cx="32" cy="32.6" rx="8.1" ry="5.2" transform="rotate(-12 32 32.6)" />
        <circle cx="40.3" cy="29.5" r="3.5" />
        <path d="m43.6 29.1 4.4 1.1-4.4 1.4z" />
      </g>
      <circle cx="41.1" cy="28.9" r=".85" fill="hsl(243 60% 20%)" />

      <path
        d="M17 38.4c5-2.6 10.5-2.6 15 0 4.5-2.6 10-2.6 15 0v5.9c-5-2.6-10.5-2.6-15 0-4.5-2.6-10-2.6-15 0z"
        fill="#ffffff"
      />
      <path
        d="M17 44.3c5-2.6 10.5-2.6 15 0 4.5-2.6 10-2.6 15 0v1.8c-5-2.6-10.5-2.6-15 0-4.5-2.6-10-2.6-15 0z"
        fill="hsl(43 74% 52%)"
      />
      <path d="M32 38.4v5.9" stroke="hsl(232 24% 82%)" strokeWidth=".7" />

      <g clipPath="url(#cmsck-roundel)">
        <path d="M-2 50c8-4 14 3 22 1s12-7 20-5 12 6 24 2v18H-2z" fill="url(#cmsck-teal)" />
        <path d="M-2 55c8-4 14 3 22 1s12-6 20-4 12 5 24 1v14H-2z" fill="hsl(243 60% 20%)" />
      </g>
    </svg>
  )
}

export function BrandLink({
  className,
  onNavigate,
}: {
  className?: string
  onNavigate?: () => void
}) {
  const brand = useBrand()

  return (
    <Link
      href="/"
      onClick={onNavigate}
      className={cn('group flex items-center gap-3 rounded-2xl px-1 py-1', className)}
    >
      <BrandMark className="size-11 transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105 motion-reduce:transform-none" />
      {/*
        The abbreviation leads in the lockup because the full name is four words
        and would wrap the header at every breakpoint. The name itself is on the
        second line, and the accessible name below reads it in full — so the
        ministry is never announced as "CMSCK" or as its slogan alone.
      */}
      {/*
        Abbreviation and slogan only.

        The full ministry name is four words. Rendering it here made the lockup
        364px wide, which pushed the eight-item nav past its container and gave
        every desktop page a horizontal scrollbar — measured at 1280, 1366, 1440
        and 1600. It does not fit beside this many nav items at any width, so it
        is not shown here at all.

        Nothing is lost: the accessible name below reads it out in full, the
        hero prints it in the largest type on the site, and it is in the footer,
        the page title and the schema.org data.
      */}
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="font-display text-lg font-extrabold tracking-tight text-foreground">
          {brand.shortName}
        </span>
        {brand.aka && (
          <span className="truncate text-[0.72rem] font-bold uppercase tracking-[0.14em] text-accent-ink">
            {brand.aka}
          </span>
        )}
      </span>
      <span className="sr-only">
        {brand.legalName}
        {brand.aka ? `, also known as ${brand.aka}` : ''} — home page
      </span>
    </Link>
  )
}
