import { ApprovalStatus } from '@prisma/client'
import { ArrowRight, Quote } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { prisma } from '@/lib/prisma'

const EXCERPT_AT = 220

/**
 * Featured God stories on the homepage.
 *
 * Renders nothing at all when there are none — an empty "Testimonies" heading
 * with a blank space underneath reads as broken, not as new.
 */
export async function FeaturedTestimonies() {
  if (!prisma) return null

  const testimonies = await prisma.testimony
    .findMany({
      where: { status: ApprovalStatus.APPROVED, isFeatured: true },
      orderBy: { approvedAt: 'desc' },
      take: 3,
      select: {
        id: true,
        title: true,
        content: true,
        anonymous: true,
        guestName: true,
        author: { select: { name: true } },
      },
    })
    .catch(() => [])

  if (testimonies.length === 0) return null

  return (
    <section aria-labelledby="featured-testimonies" className="container py-20 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 id="featured-testimonies" className="text-3xl sm:text-4xl">
          God is still answering
        </h2>
        <p className="mt-4 text-pretty text-lg text-muted-foreground">
          Real stories from people in this family.
        </p>
      </div>

      <ul className="mt-12 grid gap-5 lg:grid-cols-3">
        {testimonies.map((testimony) => {
          const author = testimony.anonymous
            ? 'Anonymous'
            : (testimony.author?.name ?? testimony.guestName ?? 'A friend')
          const excerpt =
            testimony.content.length > EXCERPT_AT
              ? `${testimony.content.slice(0, EXCERPT_AT).trimEnd()}…`
              : testimony.content

          return (
            <li key={testimony.id}>
              <article className="flex h-full flex-col rounded-3xl border-2 border-border bg-card p-7 shadow-soft">
                <Quote className="size-8 text-accent-ink" aria-hidden />
                <h3 className="mt-5 font-display text-xl font-bold text-foreground">
                  {testimony.title}
                </h3>
                <p className="mt-3 flex-1 text-pretty text-muted-foreground">{excerpt}</p>
                <p className="mt-5 text-sm font-semibold text-primary">— {author}</p>
              </article>
            </li>
          )
        })}
      </ul>

      <div className="mt-10 text-center">
        <Button asChild size="lg" variant="outline">
          <Link href="/prayer/testimonies">
            Read more stories
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>
    </section>
  )
}
