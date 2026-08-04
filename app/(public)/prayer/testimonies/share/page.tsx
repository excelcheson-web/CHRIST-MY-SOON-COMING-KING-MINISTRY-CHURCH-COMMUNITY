import type { Metadata } from 'next'

import { PageHero } from '@/components/page-hero'
import { TestimonyForm } from '@/components/prayer/testimony-form'
import { Alert } from '@/components/ui/alert'
import { isDatabaseConfigured } from '@/lib/prisma'
import { getSiteSettings } from '@/lib/site-settings'

/*
 * Static, but refreshed every five minutes.
 *
 * These pages read admin-editable content (ministry details, page copy, the
 * gospel wording) that falls back to a bundled file when the database is
 * unreachable. Prerendering them with no revalidation baked whichever answer
 * the build happened to get: a build that ran while Neon was asleep shipped the
 * placeholder copy permanently. Saving in /admin still revalidates instantly —
 * this is the safety net for the build itself.
 */
export const revalidate = 300


export const metadata: Metadata = {
  title: 'Share your story',
  description: 'Tell us what God has done. Your story could be the one someone needs today.',
  alternates: { canonical: '/prayer/testimonies/share' },
}

export default async function ShareTestimonyPage() {
  const settings = await getSiteSettings()

  return (
    <>
      <PageHero
        eyebrow="Prayer Portal"
        title="Share your story"
        subtitle="Somebody out there is about to give up on the very thing God already did for you. Tell them."
        photo="worship"
        crumbs={[
          { href: '/prayer', label: 'Prayer' },
          { href: '/prayer/testimonies', label: 'Testimonies' },
        ]}
      />

      <div className="container pb-20 pt-4">
        <div className="mx-auto max-w-2xl">
          {!isDatabaseConfigured && (
            <Alert variant="info" className="mb-8">
              We cannot take stories online just yet. Please email{' '}
              <a href={`mailto:${settings.contact.email}`} className="font-semibold underline">
                {settings.contact.email}
              </a>{' '}
              — we would genuinely love to hear it.
            </Alert>
          )}

          <div className="rounded-3xl border-2 border-border bg-card p-6 shadow-soft sm:p-9">
            <TestimonyForm />
          </div>
        </div>
      </div>
    </>
  )
}
