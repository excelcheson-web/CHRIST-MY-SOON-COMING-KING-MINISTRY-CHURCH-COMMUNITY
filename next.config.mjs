/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

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
