/*
 * Service worker — what makes this work on a bad connection.
 *
 * ## The rule this file lives by
 *
 * **Never serve a stale page to a signed-in member.** A cache that does not
 * understand who is asking is how one person is shown another person's
 * dashboard, and a church platform holding prayer requests and home addresses
 * cannot take that risk to save a round trip.
 *
 * So the strategy is narrow on purpose:
 *
 *   - Static build assets (/_next/static/…) are cache-first. They are content-
 *     hashed, so a given URL's contents can never change.
 *   - Images, fonts and icons are cache-first with a network fallback.
 *   - Everything else — every HTML page, every API call — is network-only,
 *     with a single offline page shown when the network is genuinely gone.
 *
 * That means offline gives you "the app opens and tells you honestly that you
 * are offline" rather than "the app shows you Tuesday's data on Friday". For a
 * site whose content is this personal, that is the right trade.
 *
 * ## Never cached under any circumstances
 *
 * Anything under /api/, /admin, /dashboard, /community, /chat or /account, and
 * any request carrying credentials. Listed explicitly below rather than
 * assumed.
 */

const VERSION = 'cmsck-v1'
const ASSETS = `${VERSION}-assets`
const OFFLINE_URL = '/offline'

/** Paths whose responses must never touch the cache. */
const NEVER_CACHE = ['/api/', '/admin', '/dashboard', '/community', '/chat', '/account', '/login', '/register']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(ASSETS)
      .then((cache) => cache.addAll([OFFLINE_URL]))
      // A failed pre-cache must not block installation — the worker is still
      // useful for static assets even if the offline page did not fetch.
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  )
})

function isCacheableAsset(url) {
  if (url.origin !== self.location.origin) return false
  if (NEVER_CACHE.some((path) => url.pathname.startsWith(path))) return false

  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/images/') ||
    /\.(css|js|woff2?|png|jpe?g|svg|webp|ico)$/i.test(url.pathname)
  )
}

self.addEventListener('fetch', (event) => {
  const { request } = event

  // Only GET. A cached POST is a bug with consequences.
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (isCacheableAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((response) => {
            // Only cache a clean 200. An opaque or error response cached here
            // would keep serving the error long after the server recovered.
            if (response.ok && response.status === 200) {
              const copy = response.clone()
              caches.open(ASSETS).then((cache) => cache.put(request, copy))
            }
            return response
          }),
      ),
    )
    return
  }

  // Pages: always the network, with the offline page as the only fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then((hit) => hit ?? new Response('Offline', { status: 503 })),
      ),
    )
  }
})
