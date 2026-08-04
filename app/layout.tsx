import type { Metadata, Viewport } from 'next'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import type { ReactNode } from 'react'

import { Providers } from '@/components/providers'
import { SiteSettingsProvider } from '@/components/site-settings-provider'
import { LOGO_SIZE, LOGO_SRC, OG_IMAGE } from '@/lib/brand-assets'
import { getSiteSettings } from '@/lib/site-settings'
import '@/styles/globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
})

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  weight: ['600', '700', '800'],
  variable: '--font-display',
})

/**
 * Metadata is generated rather than static so the ministry name and description
 * come from the admin settings — renaming the church should change the browser
 * tab and every link preview, not just the header.
 */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()

  return {
  metadataBase: new URL(settings.url),
  title: {
    // The ministry name leads; the slogan follows it. A tab reading only
    // "Praise Arena" would not tell anyone whose church this is.
    default: settings.aka ? `${settings.name} — ${settings.aka}` : settings.name,
    template: `%s · ${settings.shortName}`,
  },
  description: settings.description,
  applicationName: settings.name,
  keywords: [
    'church',
    'ministry',
    'deliverance',
    'Holy Ghost',
    settings.shortName,
    settings.name,
    ...(settings.aka ? [settings.aka] : []),
    'Christian',
    'community',
    'worship',
  ],
  openGraph: {
    type: 'website',
    siteName: settings.name,
    title: settings.aka ? `${settings.name} — ${settings.aka}` : settings.name,
    description: settings.description,
    url: settings.url,
    images: [OG_IMAGE],
  },
  twitter: {
    // The logo is square, so a summary card frames it properly; a large card
    // would crop the roundel.
    card: 'summary',
    title: settings.name,
    description: settings.description,
    images: [OG_IMAGE.url],
  },
  // Browser tab, bookmarks and "add to home screen" all use the same artwork.
  icons: {
    icon: [{ url: LOGO_SRC, type: 'image/jpeg' }],
    shortcut: [LOGO_SRC],
    apple: [{ url: LOGO_SRC, sizes: `${LOGO_SIZE}x${LOGO_SIZE}` }],
  },
  robots: { index: true, follow: true },
  }
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#0d0f21' },
  ],
  width: 'device-width',
  initialScale: 1,
  // Never block pinch-zoom — some members will need it.
  maximumScale: 5,
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const settings = await getSiteSettings()

  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh bg-background">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Providers>
          {/* Resolved once here so client components never fetch it themselves. */}
          <SiteSettingsProvider
            value={{
              name: settings.name,
              legalName: settings.legalName,
              shortName: settings.shortName,
              aka: settings.aka,
              tagline: settings.tagline,
            }}
          >
            {children}
          </SiteSettingsProvider>
        </Providers>
      </body>
    </html>
  )
}
