import type { Metadata } from 'next'

import { ContentPage } from '@/components/content-page'
import { getPageContent } from '@/lib/page-content'

// Rebuilt at most once an hour, so admin edits appear without a deploy while
// visitors still get a cached, instant page.
export const revalidate = 3600

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageContent('about')
  return {
    title: page.title,
    description: page.subtitle,
    alternates: { canonical: '/about' },
    openGraph: { title: page.title, description: page.subtitle, url: '/about' },
  }
}

export default async function AboutPage() {
  const page = await getPageContent('about')
  return <ContentPage page={page} eyebrow="Our ministry" />
}
