import type { Metadata, Viewport } from 'next'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import type { ReactNode } from 'react'

import { InstallPrompt } from '@/components/layout/install-prompt'
import { Providers } from '@/components/providers'
import { SiteSettingsProvider } from '@/components/site-settings-provider'
import { LOGO_SRC, OG_IMAGE } from '@/lib/brand-assets'
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
  /*
   * iOS reads this link tag for the home-screen icon and ignores the manifest,
   * so the touch icon is named here explicitly. Android takes its icons from
   * app/manifest.ts, including the maskable variants it needs.
   */
  icons: {
    icon: [
      { url: LOGO_SRC, type: 'image/jpeg' },
      { url: '/icons/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icons/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    shortcut: [LOGO_SRC],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
  appleWebApp: {
    capable: true,
    title: settings.shortName,
    statusBarStyle: 'default',
  },
  robots: { index: true, follow: true },
  }
}

export const viewport: Viewport = {
  /*
   * One colour, not a media-query pair.
   *
   * The pair followed the *device* preference, which was right until the theme
   * became a choice: somebody running a dark page on a light phone would get
   * a white address bar above it. A single tag lets the boot script in the
   * body below set it from the actual theme, whichever way it was decided.
   *
   * These two hex values are `--background` from styles/globals.css converted
   * out of HSL — light `210 33% 98%`, dark `238 40% 8%`. If either token
   * moves, move these with it.
   */
  themeColor: '#f8fafc',
  width: 'device-width',
  initialScale: 1,
  // Never block pinch-zoom — some members will need it.
  maximumScale: 5,
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const settings = await getSiteSettings()

  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable}`} suppressHydrationWarning>
      <head>
        {/*
          Sets the theme before the first paint.

          This has to be a blocking inline script in <head>. Anything that runs
          after React hydrates is too late: the browser has already painted a
          white page, and somebody who chose dark sees a flash of white on
          every single navigation. That flash is the reason most sites' dark
          mode feels cheap.

          Kept in step with `applyTheme` in components/layout/theme-toggle.tsx.
          It is wrapped in try/catch because localStorage throws outright in a
          locked-down browser, and a theme preference is not worth a blank page.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('cmsck-theme')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',d?'#0c0d1d':'#f8fafc')}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-dvh bg-background">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        {/* Registers the service worker and, from the second visit, offers to
            install. Rendered here so it is present on every page. */}
        <InstallPrompt />
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
