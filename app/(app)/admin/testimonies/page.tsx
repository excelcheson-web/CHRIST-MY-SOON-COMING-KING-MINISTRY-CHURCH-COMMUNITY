import { ApprovalStatus } from '@prisma/client'
import { Inbox, Sparkles } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { TestimonyRow, type AdminTestimonyRow } from '@/components/admin/testimony-row'
import { Alert } from '@/components/ui/alert'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireUser } from '@/lib/auth'
import { canApproveTestimony } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Testimonies',
  robots: { index: false, follow: false },
}

const filters = [
  { key: 'PENDING', label: 'Waiting for you' },
  { key: 'APPROVED', label: 'Published' },
  { key: 'REJECTED', label: 'Not published' },
] as const

export default async function AdminTestimoniesPage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  const user = await requireUser('/admin/testimonies')
  if (!canApproveTestimony(user.role)) redirect('/dashboard?denied=testimonies')

  if (!prisma) {
    return (
      <div className="container py-14 sm:py-20">
        <h1 className="text-3xl sm:text-4xl">Testimonies</h1>
        <Alert variant="info" className="mt-8">
          No database is connected yet. Add a <code>DATABASE_URL</code> and run{' '}
          <code>npm run db:migrate</code> to switch this on.
        </Alert>
      </div>
    )
  }

  const active = (filters.find((f) => f.key === searchParams.status)?.key ??
    'PENDING') as ApprovalStatus

  const [records, pending, published, featured] = await Promise.all([
    prisma.testimony.findMany({
      where: { status: active },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        title: true,
        content: true,
        category: true,
        status: true,
        isFeatured: true,
        anonymous: true,
        createdAt: true,
        guestName: true,
        guestEmail: true,
        author: { select: { name: true, email: true } },
      },
    }),
    prisma.testimony.count({ where: { status: ApprovalStatus.PENDING } }),
    prisma.testimony.count({ where: { status: ApprovalStatus.APPROVED } }),
    prisma.testimony.count({ where: { isFeatured: true, status: ApprovalStatus.APPROVED } }),
  ])

  const rows: AdminTestimonyRow[] = records.map((record) => ({
    id: record.id,
    title: record.title,
    content: record.content,
    category: record.category,
    status: record.status,
    isFeatured: record.isFeatured,
    anonymous: record.anonymous,
    authorName: record.author?.name ?? record.guestName ?? 'A visitor',
    contactEmail: record.author?.email ?? record.guestEmail,
    createdAt: record.createdAt.toISOString(),
  }))

  return (
    <div className="container py-14 sm:py-20">
      <div className="flex items-center gap-4">
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-royal-gradient text-primary-foreground">
          <Sparkles className="size-8" aria-hidden />
        </span>
        <div>
          <p className="font-display text-sm font-bold uppercase tracking-[0.16em] text-primary">
            Moderation
          </p>
          <h1 className="mt-1 text-3xl sm:text-4xl">Testimonies</h1>
        </div>
      </div>

      <p className="mt-6 max-w-2xl text-pretty text-muted-foreground">
        Nothing appears on{' '}
        <Link href="/prayer/testimonies" className="font-semibold text-primary hover:underline">
          the testimonies page
        </Link>{' '}
        until someone here approves it. Check that a story is safe and encouraging — you are not
        expected to edit anyone&apos;s words.
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        <Card className={pending > 0 ? 'border-accent/40 bg-accent-soft/40' : undefined}>
          <CardHeader className="pb-3">
            <CardDescription className="font-semibold">Waiting for you</CardDescription>
            <CardTitle className="text-4xl">{pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="font-semibold">Published</CardDescription>
            <CardTitle className="text-4xl">{published}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="font-semibold">Featured</CardDescription>
            <CardTitle className="text-4xl">{featured}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <nav aria-label="Filter testimonies" className="mt-10">
        <ul className="flex flex-wrap gap-2">
          {filters.map((filter) => {
            const isActive = active === filter.key
            return (
              <li key={filter.key}>
                <Link
                  href={`/admin/testimonies?status=${filter.key}`}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex min-h-11 items-center rounded-xl border-2 px-4 font-semibold transition-colors',
                    isActive
                      ? 'border-primary/35 bg-primary-soft text-primary'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/25 hover:text-foreground',
                  )}
                >
                  {filter.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {rows.length === 0 ? (
        <div className="mt-10 rounded-3xl border-2 border-dashed border-border bg-secondary/40 p-12 text-center">
          <Inbox className="mx-auto size-10 text-muted-foreground" aria-hidden />
          <p className="mt-4 font-display text-lg font-bold text-foreground">Nothing here</p>
          <p className="mt-2 text-muted-foreground">
            Stories appear as people share them at{' '}
            <Link
              href="/prayer/testimonies/share"
              className="font-semibold text-primary hover:underline"
            >
              /prayer/testimonies/share
            </Link>
            .
          </p>
        </div>
      ) : (
        <ul className="mt-10 space-y-5">
          {rows.map((testimony) => (
            <li key={testimony.id}>
              <TestimonyRow testimony={testimony} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
