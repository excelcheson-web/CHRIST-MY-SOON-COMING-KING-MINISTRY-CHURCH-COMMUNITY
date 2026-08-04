import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { SermonForm } from '@/components/sermons/sermon-form'
import { requireUser } from '@/lib/auth'
import { canManageContent } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Add a sermon',
  robots: { index: false, follow: false },
}

export default async function NewSermonPage() {
  const user = await requireUser('/admin/sermons/new')
  if (!canManageContent(user.role)) redirect('/dashboard?denied=sermons')

  const [series, ministries] = prisma
    ? await Promise.all([
        prisma.sermonSeries
          .findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            select: { id: true, title: true },
          })
          .catch(() => []),
        prisma.ministry
          .findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
            select: { id: true, name: true },
          })
          .catch(() => []),
      ])
    : [[], []]

  // Pre-fills last Sunday morning — far more often right than "now", and easy
  // to change if it is not.
  const lastSunday = new Date()
  lastSunday.setDate(lastSunday.getDate() - lastSunday.getDay())
  lastSunday.setHours(10, 0, 0, 0)
  const defaultDate = new Date(lastSunday.getTime() - lastSunday.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)

  return (
    <div className="container py-14 sm:py-20">
      <Link
        href="/admin/sermons"
        className="mb-6 inline-flex min-h-11 items-center gap-2 rounded-lg font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-5" aria-hidden />
        All sermons
      </Link>

      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl sm:text-4xl">Add a sermon</h1>
        <p className="mt-3 text-pretty text-muted-foreground">
          It starts as a draft, so nothing goes public until you choose
          &ldquo;Published&rdquo;. The only things you really need are a title, a speaker and a
          date.
        </p>

        <div className="mt-10">
          <SermonForm
            mode="create"
            initial={{ preachedAt: defaultDate }}
            series={series}
            ministries={ministries}
          />
        </div>
      </div>
    </div>
  )
}
