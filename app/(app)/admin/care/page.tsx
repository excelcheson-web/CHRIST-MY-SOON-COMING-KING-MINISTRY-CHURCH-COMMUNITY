import { HeartHandshake } from 'lucide-react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { CareRow, type CareItem } from '@/components/admin/care-row'
import { Alert } from '@/components/ui/alert'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireUser } from '@/lib/auth'
import { canReadCare } from '@/lib/initiatives'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Pastoral care',
  robots: { index: false, follow: false },
}

export default async function AdminCarePage() {
  const user = await requireUser('/admin/care')
  // Narrower than community moderation on purpose — a small-group leader
  // moderates posts, but does not read who asked for help with rent.
  if (!canReadCare(user.role)) redirect('/dashboard?denied=care')

  if (!prisma) {
    return (
      <div className="container py-14 sm:py-20">
        <h1 className="text-3xl sm:text-4xl">Pastoral care</h1>
        <Alert variant="info" className="mt-8">
          No database is connected yet.
        </Alert>
      </div>
    )
  }

  const records = await prisma.careRequest.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 100,
    include: { author: { select: { name: true } } },
  })

  const items: CareItem[] = records.map((row) => ({
    id: row.id,
    kind: row.kind,
    subject: row.subject,
    body: row.body,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    response: row.response,
    replyToEmail: row.replyToEmail,
    authorName: row.author?.name ?? null,
  }))

  const waiting = items.filter((item) => item.status === 'OPEN').length
  const benevolence = items.filter(
    (item) => item.kind === 'BENEVOLENCE' && item.status !== 'CLOSED',
  ).length

  return (
    <div className="container py-14 sm:py-20">
      <div className="flex items-center gap-4">
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-royal-gradient text-primary-foreground">
          <HeartHandshake className="size-8" aria-hidden />
        </span>
        <div>
          <p className="font-display text-sm font-bold uppercase tracking-[0.16em] text-primary">
            Pastors only
          </p>
          <h1 className="mt-1 text-3xl sm:text-4xl">Pastoral care</h1>
        </div>
      </div>

      <Alert variant="info" className="mt-8">
        These are the most private messages on the platform. Nothing here appears anywhere else on
        the site, and small-group leaders and moderators cannot see this page.
      </Alert>

      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="font-semibold">Waiting</CardDescription>
            <CardTitle className="text-4xl">{waiting}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="font-semibold">Practical needs open</CardDescription>
            <CardTitle className="text-4xl">{benevolence}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="font-semibold">All time</CardDescription>
            <CardTitle className="text-4xl">{items.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {items.length === 0 ? (
        <div className="mt-12 rounded-3xl border-2 border-dashed border-border bg-secondary/40 p-12 text-center">
          <HeartHandshake className="mx-auto size-10 text-muted-foreground" aria-hidden />
          <p className="mt-4 font-display text-lg font-bold text-foreground">Nothing waiting</p>
          <p className="mx-auto mt-2 max-w-md text-pretty text-muted-foreground">
            When somebody asks a question or shares a need, it will appear here.
          </p>
        </div>
      ) : (
        <ul className="mt-12 space-y-5">
          {items.map((item) => (
            <li key={item.id}>
              <CareRow item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
