import { ArrowLeft, ArrowRight, List } from 'lucide-react'
import Link from 'next/link'

import { extractHeadings, Markdown } from '@/components/markdown'
import type { PhotoName } from '@/lib/photos'
import { PageHero } from '@/components/page-hero'
import type { ResolvedPage } from '@/lib/page-content'
import { formatDate } from '@/lib/utils'

/** Reading order across the three story pages, used for the prev/next footer. */
const readingOrder = [
  { slug: 'about', href: '/about', label: 'About Us' },
  { slug: 'founder', href: '/founder', label: 'Our Founders' },
  { slug: 'doctrine', href: '/doctrine', label: 'What We Believe' },
] as const

function neighbours(slug: ResolvedPage['slug']) {
  const index = readingOrder.findIndex((entry) => entry.slug === slug)
  return {
    previous: index > 0 ? readingOrder[index - 1] : null,
    next: index >= 0 && index < readingOrder.length - 1 ? readingOrder[index + 1] : null,
  }
}

/** One photograph per static page, since these three never change. */
const pagePhoto: Record<ResolvedPage['slug'], PhotoName> = {
  about: 'worship',
  founder: 'together',
  doctrine: 'scripture',
}

export function ContentPage({ page, eyebrow }: { page: ResolvedPage; eyebrow: string }) {
  const headings = extractHeadings(page.content)
  const { previous, next } = neighbours(page.slug)
  const emoji = typeof page.meta.heroEmoji === 'string' ? page.meta.heroEmoji : undefined

  // Meta is a Json column, so it is `unknown` to TypeScript — narrow rather
  // than cast, so a malformed row renders without the photo instead of
  // throwing on a page that has to stay up.
  const founderPhoto =
    typeof page.meta.founderPhoto === 'string' ? page.meta.founderPhoto : undefined
  const founderPhotoAlt =
    typeof page.meta.founderPhotoAlt === 'string' ? page.meta.founderPhotoAlt : ''
  const founderCaption =
    typeof page.meta.founderCaption === 'string' ? page.meta.founderCaption : ''

  return (
    <>
      <PageHero
        eyebrow={eyebrow}
        title={page.title}
        subtitle={page.subtitle}
        photo={pagePhoto[page.slug]}
        emoji={emoji}
        crumbs={[{ href: '/', label: 'Home' }]}
      />

      <div className="container pb-8 pt-4">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-16">
          <article className="min-w-0 max-w-3xl">
            {/*
              A real photograph of real people, supplied by the ministry. It
              leads the article rather than sitting in the sidebar — on the
              founders' page the picture is the point, not decoration, so it
              carries proper alt text rather than an empty one.
            */}
            {founderPhoto && (
              // Capped at 28rem. At full article width a 5:4 photograph is
              // ~600px tall and pushes every word below the fold.
              <figure className="mb-10 max-w-md">
                {/* eslint-disable-next-line @next/next/no-img-element -- ministry-supplied asset; next/image would need sharp on the host */}
                <img
                  src={founderPhoto}
                  alt={founderPhotoAlt}
                  width={1280}
                  height={1024}
                  loading="eager"
                  decoding="async"
                  className="w-full rounded-3xl border-2 border-border object-cover shadow-lifted"
                />
                {founderCaption && (
                  // The caption names them; the alt describes the picture. Two
                  // different jobs — identical text would make a screen reader
                  // announce the same sentence twice.
                  <figcaption className="mt-3 text-pretty text-sm text-muted-foreground">
                    {founderCaption}
                  </figcaption>
                )}
              </figure>
            )}

            <Markdown>{page.content}</Markdown>

            {page.updatedAt && (
              <p className="mt-14 border-t border-border pt-6 text-sm text-muted-foreground">
                Last updated {formatDate(page.updatedAt)}
              </p>
            )}
          </article>

          {headings.length > 1 && (
            <nav
              aria-labelledby={`toc-${page.slug}`}
              className="order-first lg:order-none lg:sticky lg:top-28 lg:self-start"
            >
              <div className="rounded-3xl border-2 border-border bg-card p-6 shadow-soft">
                <h2
                  id={`toc-${page.slug}`}
                  className="flex items-center gap-2 font-display text-base font-bold text-foreground"
                >
                  <List className="size-5 text-primary" aria-hidden />
                  On this page
                </h2>
                <ul className="mt-4 space-y-1">
                  {headings.map((heading) => (
                    <li key={heading.id}>
                      <a
                        href={`#${heading.id}`}
                        className="-mx-2 flex min-h-11 items-center rounded-lg px-2 py-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        {heading.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>
          )}
        </div>
      </div>

      <nav aria-label="More pages" className="container pb-20 pt-8">
        <div className="grid gap-4 border-t border-border pt-10 sm:grid-cols-2">
          {previous ? (
            <Link
              href={previous.href}
              className="group flex min-h-[5.5rem] items-center gap-4 rounded-2xl border-2 border-border bg-card p-5 transition-colors hover:border-primary/35 hover:bg-secondary"
            >
              <ArrowLeft
                className="size-6 shrink-0 text-primary transition-transform group-hover:-translate-x-1 motion-reduce:transform-none"
                aria-hidden
              />
              <span>
                <span className="block text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Previous
                </span>
                <span className="block font-display text-lg font-bold text-foreground">
                  {previous.label}
                </span>
              </span>
            </Link>
          ) : (
            <span aria-hidden />
          )}

          {next && (
            <Link
              href={next.href}
              className="group flex min-h-[5.5rem] items-center justify-end gap-4 rounded-2xl border-2 border-border bg-card p-5 text-right transition-colors hover:border-primary/35 hover:bg-secondary sm:col-start-2"
            >
              <span>
                <span className="block text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Next
                </span>
                <span className="block font-display text-lg font-bold text-foreground">
                  {next.label}
                </span>
              </span>
              <ArrowRight
                className="size-6 shrink-0 text-primary transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
                aria-hidden
              />
            </Link>
          )}
        </div>
      </nav>
    </>
  )
}
