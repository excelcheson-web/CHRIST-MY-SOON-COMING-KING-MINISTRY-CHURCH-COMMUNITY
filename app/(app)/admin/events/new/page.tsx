import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { EventForm } from '@/components/events/event-form'
import { requireUser } from '@/lib/auth'
import { canManageEvents } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'New event',
  robots: { index: false, follow: false },
}

export default async function NewEventPage() {
  const user = await requireUser('/admin/events/new')
  if (!canManageEvents(user.role)) redirect('/dashboard?denied=events')

  const ministries = prisma
    ? await prisma.ministry
        .findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } })
        .catch(() => [])
    : []

  return (
    <div className="container py-14 sm:py-20">
      <Link
        href="/admin/events"
        className="mb-6 inline-flex min-h-11 items-center gap-2 rounded-lg font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-5" aria-hidden />
        All events
      </Link>

      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl sm:text-4xl">New event</h1>
        <p className="mt-3 text-pretty text-muted-foreground">
          It starts as a draft, so nothing is public until you say so.
        </p>

        <div className="mt-10">
          <EventForm mode="create" initial={{}} ministries={ministries} />
        </div>
      </div>
    </div>
  )
}
