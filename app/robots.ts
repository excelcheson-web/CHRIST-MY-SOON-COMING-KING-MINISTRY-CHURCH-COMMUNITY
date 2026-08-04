import type { MetadataRoute } from 'next'

import { getSiteSettings } from '@/lib/site-settings'

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSiteSettings()
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/admin',
        '/dashboard',
        '/salvation/contact',
        '/salvation/complete',
        '/prayer/submitted',
        // Group boards are for members; keep them out of search results.
        '/prayer/groups/',
        '/prayer/testimonies/thank-you',
        // Booking passes carry a token in the URL. Never index them.
        '/events/*/booked/',
        '/check-in/',
      ],
    },
    sitemap: `${settings.url}/sitemap.xml`,
  }
}
