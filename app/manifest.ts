import type { MetadataRoute } from 'next'

import { getSiteSettings } from '@/lib/site-settings'

/**
 * The web app manifest — what makes this installable rather than a bookmark.
 *
 * Served from a route rather than a static file so the ministry's name follows
 * the admin settings. A church that renames itself should not have to find a
 * JSON file to stop the phone icon saying the old name.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSiteSettings()

  return {
    name: settings.name,
    // Under about 12 characters or Android truncates it under the icon.
    short_name: settings.shortName,
    description: settings.description,
    start_url: '/',
    /*
     * `standalone` is the point of the exercise: opened from the home screen
     * this runs without the browser's address bar and back button, which is
     * the difference between "a website I saved" and "an app".
     */
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f8fafc',
    theme_color: '#f8fafc',
    categories: ['lifestyle', 'social'],
    lang: 'en',
    dir: 'ltr',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      /*
       * Maskable icons are not optional on Android. The launcher crops every
       * icon to its own shape — circle, squircle, teardrop — and an icon
       * without a maskable variant gets shrunk into a white circle with a
       * border instead. These have the logo inset into the middle 80%, which
       * is the safe zone every launcher shape stays inside.
       */
      {
        src: '/icons/icon-maskable-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      { name: 'Ask for prayer', url: '/prayer/submit' },
      { name: 'Sermons', url: '/sermons' },
      { name: 'Events', url: '/events' },
    ],
  }
}
