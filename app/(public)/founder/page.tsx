import type { Metadata } from 'next'

import { ContentPage } from '@/components/content-page'
import { getPageContent } from '@/lib/page-content'

export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageContent('founder')
  return {
    title: page.title,
    description: page.subtitle,
    alternates: { canonical: '/founder' },
    openGraph: { title: page.title, description: page.subtitle, url: '/founder' },
  }
}

export default async function FounderPage() {
  const page = await getPageContent('founder')
  return <ContentPage page={page} eyebrow="Our leaders" />
}
