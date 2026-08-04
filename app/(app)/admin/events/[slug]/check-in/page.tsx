import { RegistrationStatus } from '@prisma/client'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { CheckInScanner } from '@/components/events/check-in-scanner'
import { requireUser } from '@/lib/auth'
import { formatEventDate } from '@/lib/events'
import { canManageEvents } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Check in',
  robots: { index: false, follow: false },
}

export default async function CheckInPage({ params }: { params: { slug: string } }) {
  const user = await requireUser(`/admin/events/${params.slug}/check-in`)
  if (!canManageEvents(user.role)) redirect('/dashboard?denied=events')
  if (!prisma) notFound()

  const event = await prisma.event
    .findUnique({
      where: { slug: params.slug },
      select: {
        title: true,
        slug: true,
        startsAt: true,
        endsAt: true,
        locationName: true,
        registrations: { select: { guests: true, status: true, checkedInAt: true } },
      },
    })
    .catch(() => null)

  if (!event) notFound()

  const confirmed = event.registrations.filter((r) => r.status === RegistrationStatus.CONFIRMED)
  const expected = confirmed.reduce((n, r) => n + r.guests + 1, 0)
  const arrived = event.registrations
    .filter((r) => r.checkedInAt)
    .reduce((n, r) => n + r.guests + 1, 0)

  return (
    <div className="container py-10 sm:py-14">
      <Link
        href="/admin/events"
        className="mb-6 inline-flex min-h-11 items-center gap-2 rounded-lg font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-5" aria-hidden />
        All events
      </Link>

      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl sm:text-4xl">{event.title}</h1>
        <p className="mt-2 text-muted-foreground">
          {formatEventDate(event.startsAt, event.endsAt)}
          {event.locationName && ` · ${event.locationName}`}
        </p>

        <div className="mt-6 flex flex-wrap gap-4 rounded-2xl border-2 border-border bg-secondary/40 p-5">
          <p className="font-display font-bold text-foreground">
            Arrived <span className="text-2xl text-success">{arrived}</span>
          </p>
          <p className="font-display font-bold text-foreground">
            Expected <span className="text-2xl text-primary">{expected}</span>
          </p>
        </div>

        <div className="mt-8">
          <CheckInScanner slug={event.slug} />
        </div>
      </div>
    </div>
  )
}
