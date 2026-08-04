import type { Metadata } from 'next'

import { PageHero } from '@/components/page-hero'
import { RequestForm } from '@/components/prayer/request-form'
import { Alert } from '@/components/ui/alert'
import { auth } from '@/lib/auth'
import { isDatabaseConfigured, prisma } from '@/lib/prisma'
import { getSiteSettings } from '@/lib/site-settings'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Ask for Prayer',
  description: 'Send a prayer request. Our prayer team reads every single one.',
  alternates: { canonical: '/prayer/submit' },
}

export default async function SubmitPrayerPage() {
  const [session, settings] = await Promise.all([auth(), getSiteSettings()])

  // Only offer groups the person actually belongs to.
  const groups =
    session?.user && prisma
      ? await prisma.prayerGroupMember
          .findMany({
            where: { userId: session.user.id, group: { isActive: true } },
            select: { group: { select: { id: true, name: true } } },
            orderBy: { joinedAt: 'asc' },
          })
          .then((rows) => rows.map((row) => row.group))
          .catch(() => [])
      : []

  return (
    <>
      <PageHero
        eyebrow="Prayer Portal"
        title="Ask for prayer"
        subtitle="There is no request too small and none too big. Tell us what is going on, and we will pray."
        emoji="✍️"
        crumbs={[
          { href: '/', label: 'Home' },
          { href: '/prayer', label: 'Prayer' },
        ]}
      />

      <div className="container pb-20 pt-4">
        <div className="mx-auto max-w-2xl">
          {!isDatabaseConfigured && (
            <Alert variant="info" className="mb-8">
              Our online prayer wall is not switched on yet. Please email{' '}
              <a href={`mailto:${settings.contact.email}`} className="font-semibold underline">
                {settings.contact.email}
              </a>{' '}
              or call {settings.contact.phone} — we would still love to pray with you.
            </Alert>
          )}

          <div className="rounded-3xl border-2 border-border bg-card p-6 shadow-soft sm:p-9">
            <RequestForm groups={groups} />
          </div>
        </div>
      </div>
    </>
  )
}
