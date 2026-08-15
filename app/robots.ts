import type { MetadataRoute } from 'next'

import { getSiteSettings } from '@/lib/site-settings'

/**
 * robots.txt.
 *
 * ## What a Disallow does and does not do
 *
 * It stops a well-behaved crawler *fetching* a URL. It does **not** stop the
 * URL being indexed — a page linked from elsewhere can still appear in results
 * as a bare link, and because the crawler was forbidden from reading it, it
 * shows up with no description, which looks worse than not appearing at all.
 *
 * The only reliable instruction is `noindex` in the page's own metadata, and
 * every private route in this app carries one: see the `robots: { index:
 * false }` blocks on everything under `app/(app)/`, the auth pages and the
 * token-bearing pass and check-in pages. This file is the second layer, and
 * its real job is **crawl budget** — keeping a crawler's limited attention on
 * the ~40 public pages that should rank instead of spending it on redirects to
 * the login screen.
 *
 * The two layers must agree. A route that is `noindex` should generally be
 * listed here too, and nothing listed here should be in `sitemap.ts`.
 */

/**
 * Everything no crawler should spend a request on.
 *
 * Shared across every group below, and that sharing is not a tidiness
 * preference — it is the whole correctness of this file. **A crawler that
 * matches a named group ignores the `*` group completely.** Writing
 * `{ userAgent: 'GPTBot', allow: '/' }` on its own would therefore not
 * "additionally allow GPTBot"; it would hand it an empty rule set and invite
 * it into /admin and the private community pages. Any group added here must
 * repeat this list.
 */
const PRIVATE_PATHS = [
  '/api/',
  '/admin',
  '/dashboard',
  '/account',
  '/chat',
  /*
   * The entire community section, not just the group boards. `middleware.ts`
   * gates `/community/:path*`, so every one of these answers a signed-out
   * crawler with a redirect to /login — eleven pages' worth of crawl budget
   * spent learning nothing.
   */
  '/community',
  '/salvation/contact',
  '/salvation/complete',
  '/prayer/submitted',
  '/prayer/groups/',
  '/prayer/testimonies/thank-you',
  // Both of these carry a token in the URL that admits the bearer to an event.
  // Never index them, never fetch them.
  '/events/*/booked/',
  '/check-in/',
  /*
   * A reset link carries a live, single-use password token. Keeping crawlers
   * off it is not only about indexing: a bot that fetched the URL would burn
   * the token, and the person whose password it was would find their own link
   * already spent by the time they clicked it.
   */
  '/reset-password',
  '/forgot-password',
  // Nothing is gained by indexing a search results page, and search engines
  // actively dislike them.
  '/search',
  '/offline',
]

/*
 * The AI crawlers are named deliberately, and allowed.
 *
 * A church wants to be the answer when somebody asks an assistant "is there a
 * deliverance church in Ogba" — that is the same intent as the search that
 * brings them to the door, and increasingly the way it gets asked. They are
 * listed explicitly rather than left to the `*` group so that the decision is
 * visible and easy to reverse: delete a line here to withdraw one of them.
 */
const AI_CRAWLERS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'PerplexityBot', 'Google-Extended']

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSiteSettings()
  const base = settings.url.replace(/\/$/, '')

  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVATE_PATHS },
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: '/',
        disallow: PRIVATE_PATHS,
      })),
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
