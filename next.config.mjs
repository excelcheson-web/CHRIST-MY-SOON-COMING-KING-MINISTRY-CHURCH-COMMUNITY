/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  /*
   * Pins the Turnstile site key to the build, so the server and the browser can
   * never disagree about whether the human check is switched on.
   *
   * ## The outage this exists to prevent
   *
   * The two Turnstile keys travel by different routes. `TURNSTILE_SECRET_KEY`
   * is an ordinary server variable, read fresh on every request.
   * `NEXT_PUBLIC_TURNSTILE_SITE_KEY` reaches the browser only by being compiled
   * into the JavaScript bundle. Add both in the hosting dashboard without
   * rebuilding and they arrive at different times: the server starts demanding
   * a token that same second, while the browser is still running an older
   * bundle with no widget in it and no way to produce one.
   *
   * That happened on this site. Sign-in, registration, guest prayer requests,
   * testimonies and the salvation contact form all rejected real people, and
   * nothing in the code noticed, because both keys were genuinely present —
   * just not in the same place at the same time.
   *
   * Everything under `env` is inlined at build time, into the server bundle as
   * well as the client one. So `TURNSTILE_SITE_KEY_AT_BUILD` is empty in any
   * build that ran before the key was added, whatever the dashboard says now,
   * and `lib/turnstile.ts` uses it rather than the live variable to decide
   * whether to enforce. Keys added without a rebuild therefore leave the check
   * **off** — the safe direction — until a build carries them across together.
   */
  env: {
    TURNSTILE_SITE_KEY_AT_BUILD: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '',
  },

  // Keep the client bundle small: only the icons actually imported get shipped.
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },

  images: {
    formats: ['image/avif', 'image/webp'],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      /*
       * The URLs that carry an event token, kept out of search at the HTTP
       * level.
       *
       * A `<meta name="robots">` tag can only travel in an HTML body, and
       * these routes frequently have none: `/check-in/[token]` answers every
       * request with a bare 307 to the pass or the check-in desk, so its page
       * metadata is never rendered and never seen. A header applies to the
       * redirect itself, which is the only thing a crawler actually receives.
       *
       * `noarchive` matters as much as `noindex` here — it is what stops a
       * cached copy of somebody's event pass being served from a search engine
       * after the page itself is gone.
       */
      {
        source: '/check-in/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }],
      },
      {
        source: '/events/:slug/booked/:token*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }],
      },
    ]
  },
}

export default nextConfig
