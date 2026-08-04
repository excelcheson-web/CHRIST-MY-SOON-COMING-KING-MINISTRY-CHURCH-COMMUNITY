import Link from 'next/link'

import { photoProps, type PhotoName } from '@/lib/photos'
import { cn } from '@/lib/utils'

export type Crumb = { href: string; label: string }

export function PageHero({
  eyebrow,
  title,
  subtitle,
  emoji,
  photo,
  crumbs = [],
  className,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  /** Small badge for pages with no photograph of their own. */
  emoji?: string
  /** The photograph for this topic. Takes precedence over `emoji`. */
  photo?: PhotoName
  crumbs?: Crumb[]
  className?: string
}) {
  return (
    <section className={cn('relative overflow-hidden bg-royal-gradient text-white', className)}>
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-dot-grid opacity-[0.16]" />
        <div className="absolute -right-24 -top-32 size-96 rounded-full bg-accent/20 blur-3xl" />
      </div>

      {/*
        The photograph bleeds off the right-hand edge and fades into the navy
        rather than sitting in a box — it reads as part of the banner instead of
        a picture stuck on top of one. Hidden below lg, where it would crowd the
        heading off the screen.
      */}
      {photo && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-3/5 lg:block xl:w-1/2"
        >
          {/*
            The photo is faded out with a mask rather than covered by a coloured
            overlay. An overlay has to guess the banner's colour at that exact
            point — and the banner is a diagonal gradient, so the guess is wrong
            and leaves a visible vertical seam. Masking the image itself lets the
            real background show through, so there is nothing to mismatch.
          */}
          {/* eslint-disable-next-line @next/next/no-img-element -- fixed, pre-sized asset; next/image would need sharp on the host */}
          <img
            {...photoProps(photo, 'lg')}
            alt=""
            loading="eager"
            decoding="async"
            className="size-full object-cover opacity-30"
            style={{
              maskImage:
                'linear-gradient(to right, transparent 0%, black 55%), linear-gradient(to bottom, black 60%, transparent 96%)',
              maskComposite: 'intersect',
              WebkitMaskImage:
                'linear-gradient(to right, transparent 0%, black 55%), linear-gradient(to bottom, black 60%, transparent 96%)',
              WebkitMaskComposite: 'source-in',
            }}
          />
        </div>
      )}

      <div className="container relative py-16 sm:py-20">
        {crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex flex-wrap items-center gap-2 text-sm text-white/70">
              {crumbs.map((crumb) => (
                <li key={crumb.href} className="flex items-center gap-2">
                  <Link
                    href={crumb.href}
                    className="rounded font-semibold underline-offset-4 transition-colors hover:text-white hover:underline"
                  >
                    {crumb.label}
                  </Link>
                  <span aria-hidden>/</span>
                </li>
              ))}
              <li aria-current="page" className="font-semibold text-white">
                {title}
              </li>
            </ol>
          </nav>
        )}

        {/* Narrower when there is a photograph beside it, so the two never collide. */}
        <div className={photo ? 'max-w-3xl lg:max-w-[32rem] xl:max-w-xl' : 'max-w-3xl'}>
          {/* The photograph replaces this badge wherever a page has one. */}
          {emoji && !photo && (
            <span
              aria-hidden
              className="mb-5 grid size-16 place-items-center rounded-2xl bg-white/12 text-3xl backdrop-blur"
            >
              {emoji}
            </span>
          )}

          {eyebrow && (
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-accent">{eyebrow}</p>
          )}

          <h1 className="mt-3 font-display text-4xl font-extrabold leading-[1.1] sm:text-5xl lg:text-6xl">
            {title}
          </h1>

          {subtitle && (
            <p className="mt-5 text-pretty text-lg leading-relaxed text-white/85 sm:text-xl">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div aria-hidden className="h-12 bg-gradient-to-b from-transparent to-background sm:h-16" />
    </section>
  )
}
