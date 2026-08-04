import { jsonOk } from '@/lib/api-guards'
import { checkLive } from '@/lib/live'

export const runtime = 'nodejs'
// Cached for a minute at the edge as well as inside `checkLive`, so a full
// congregation opening the page at 9am does not become a full congregation's
// worth of requests to YouTube.
export const revalidate = 60

/**
 * GET /api/live — is a service streaming right now? Public.
 *
 * Public on purpose: a visitor who has never signed in is exactly the person
 * most likely to want to watch a service before setting foot in the building.
 * It exposes nothing but whether a public YouTube stream is running.
 */
export async function GET() {
  return jsonOk(await checkLive())
}
