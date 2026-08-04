import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { LegalPage } from '@/components/legal-page'
import { findLegalDoc } from '@/content/legal'
import { getSiteSettings } from '@/lib/site-settings'

// Rebuilt hourly so a change to the ministry's contact details in the admin
// reaches these documents without a deploy.
export const revalidate = 3600

const SLUG = 'terms'

export async function generateMetadata(): Promise<Metadata> {
  const doc = findLegalDoc(SLUG)
  if (!doc) return {}
  return {
    title: doc.title,
    description: doc.summary,
    alternates: { canonical: '/terms' },
    openGraph: { title: doc.title, description: doc.summary, url: '/terms' },
  }
}

export default async function Page() {
  const doc = findLegalDoc(SLUG)
  if (!doc) notFound()

  const settings = await getSiteSettings()
  return <LegalPage doc={doc} settings={settings} />
}
