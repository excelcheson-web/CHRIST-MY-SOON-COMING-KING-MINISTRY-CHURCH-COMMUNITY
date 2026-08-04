import type { Metadata } from 'next'

import { CareForm } from '@/components/community/care-form'
import { PageHero } from '@/components/page-hero'
import { requireUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Ask an elder',
  robots: { index: false, follow: false },
}

export default async function CarePage({
  searchParams,
}: {
  searchParams: { about?: string }
}) {
  await requireUser('/community/care')

  const kind =
    searchParams.about === 'benevolence'
      ? 'BENEVOLENCE'
      : searchParams.about === 'visit'
        ? 'PASTORAL_VISIT'
        : 'QUESTION'

  return (
    <>
      <PageHero
        eyebrow="Pastoral care"
        title="Ask an elder"
        subtitle="A question you have never felt able to ask, a need you would rather nobody knew about, or just someone to talk to. This goes straight to the pastors."
        photo="prayer"
        crumbs={[
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/community', label: 'Community' },
        ]}
      />

      <div className="container pb-20 pt-4">
        <div className="mx-auto max-w-2xl">
          <CareForm defaultKind={kind} />
        </div>
      </div>
    </>
  )
}
