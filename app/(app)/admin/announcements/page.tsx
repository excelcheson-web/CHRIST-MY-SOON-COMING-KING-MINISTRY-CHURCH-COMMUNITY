import { Megaphone } from 'lucide-react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { AnnouncementManager, type AdminAnnouncement } from '@/components/admin/announcement-manager'
import { Alert } from '@/components/ui/alert'
import { requireUser } from '@/lib/auth'
import { canManageEvents } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Announcements',
  robots: { index: false, follow: false },
}

export default async function AdminAnnouncementsPage() {
  const user = await requireUser('/admin/announcements')
  if (!canManageEvents(user.role)) redirect('/dashboard?denied=announcements')

  if (!prisma) {
    return (
      <div className="container py-14 sm:py-20">
        <h1 className="text-3xl sm:text-4xl">Announcements</h1>
        <Alert variant="info" className="mt-8">
          No database is connected yet.
        </Alert>
      </div>
    )
  }

  const [rows, ministries] = await Promise.all([
    prisma.announcement.findMany({
      orderBy: [{ pinned: 'desc' }, { startsAt: 'desc' }],
      take: 60,
      include: { ministry: { select: { name: true } } },
    }),
    prisma.ministry.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      select: { id: true, name: true },
    }),
  ])

  const announcements: AdminAnnouncement[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    image: row.imageKey ? `/api/announcements/${row.id}/image` : null,
    audience: row.audience,
    ministryName: row.ministry?.name ?? null,
    pinned: row.pinned,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt?.toISOString() ?? null,
  }))

  return (
    <div className="container py-14 sm:py-20">
      <div className="mb-10 flex items-center gap-4">
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-royal-gradient text-primary-foreground">
          <Megaphone className="size-8" aria-hidden />
        </span>
        <div>
          <p className="font-display text-sm font-bold uppercase tracking-[0.16em] text-primary">
            Notices
          </p>
          <h1 className="mt-1 text-3xl sm:text-4xl">Announcements</h1>
        </div>
      </div>

      <AnnouncementManager initial={announcements} ministries={ministries} />
    </div>
  )
}
