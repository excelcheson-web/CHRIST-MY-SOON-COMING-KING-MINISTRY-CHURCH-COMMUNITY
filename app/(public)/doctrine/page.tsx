import type { Metadata } from 'next'

import { ContentPage } from '@/components/content-page'
import { getPageContent } from '@/lib/page-content'

export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageContent('doctrine')
  return {
    title: page.title,
    description: page.subtitle,
    alternates: { canonical: '/doctrine' },
    openGraph: { title: page.title, description: page.subtitle, url: '/doctrine' },
  }
}

export default async function DoctrinePage() {
  const page = await getPageContent('doctrine')
  return <ContentPage page={page} eyebrow="Our faith" />
}
