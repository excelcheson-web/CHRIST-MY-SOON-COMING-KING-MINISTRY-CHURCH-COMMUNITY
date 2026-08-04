import { CalendarDays } from 'lucide-react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import {
  CalendarManager,
  HiddenDates,
  type AdminCalendarEntry,
} from '@/components/admin/calendar-manager'
import { requireUser } from '@/lib/auth'
import { formatChurchDate } from '@/lib/church-year'
import { upcomingChurchDates } from '@/lib/home-content'
import { canManageContent } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Christian calendar',
  robots: { index: false, follow: false },
}

async function hiddenKeys() {
  if (!prisma) return []
  try {
    const rows = await prisma.calendarDate.findMany({
      where: { isActive: false },
      select: { key: true },
      orderBy: { key: 'asc' },
    })
    return rows.map((row) => row.key)
  } catch {
    return []
  }
}

export default async function AdminCalendarPage() {
  const user = await requireUser('/admin/calendar')
  if (!canManageContent(user.role)) redirect('/dashboard?denied=calendar')

  // A long window so a pastor can prepare artwork months ahead rather than
  // only seeing what the home page happens to be showing this week.
  const [dates, hidden] = await Promise.all([upcomingChurchDates(20), hiddenKeys()])

  const entries: AdminCalendarEntry[] = dates.map((entry) => ({
    key: entry.key,
    title: entry.title,
    description: entry.description,
    when: formatChurchDate(entry.date),
    inDays: entry.inDays,
    emoji: entry.emoji,
    image: entry.image,
    moveable: entry.moveable,
    customised: entry.customised,
  }))

  return (
    <div className="container py-14 sm:py-20">
      <div className="mb-10 flex items-center gap-4">
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-royal-gradient text-primary-foreground">
          <CalendarDays className="size-8" aria-hidden />
        </span>
        <div>
          <p className="font-display text-sm font-bold uppercase tracking-[0.16em] text-primary">
            Home page
          </p>
          <h1 className="mt-1 text-3xl sm:text-4xl">Christian calendar</h1>
        </div>
      </div>

      <div className="max-w-4xl">
        <p className="text-pretty text-muted-foreground">
          The home page counts down to what is coming. Every date here is worked out for you —
          including Easter and the eight observances that move with it — so the calendar is right
          in January and still right in November. What you can change is what each one is called,
          the line underneath, and the picture beside it.
        </p>

        <HiddenDates keys={hidden} />

        <div className="mt-10">
          <CalendarManager initial={entries} />
        </div>
      </div>
    </div>
  )
}
