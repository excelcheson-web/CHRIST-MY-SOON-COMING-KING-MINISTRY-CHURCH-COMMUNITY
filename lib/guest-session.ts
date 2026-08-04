import 'server-only'

import { randomUUID } from 'node:crypto'
import { cookies } from 'next/headers'

/**
 * A stable, anonymous id for signed-out visitors.
 *
 * Used to stop the "I prayed for this" counter being inflated by refreshing,
 * and to rate-limit guest prayer requests to one a day. It identifies a
 * *browser*, never a person — no name, no email, nothing derived from them.
 */
const COOKIE = 'cmsck_guest'
const MAX_AGE_SECONDS = 180 * 24 * 60 * 60

export function readGuestId() {
  return cookies().get(COOKIE)?.value
}

/**
 * Read-only actor key, safe to call while rendering a page.
 *
 * Next.js forbids `cookies().set()` during a Server Component render, so pages
 * must never call `ensureGuestId`. Returning null for a brand-new guest is
 * correct rather than merely convenient: they cannot have prayed for anything
 * yet, and the cookie gets minted the first time they actually press the button
 * (a route handler, where writing is allowed).
 */
export function readActorKey(userId: string | undefined): string | null {
  if (userId) return `user:${userId}`
  const guestId = readGuestId()
  return guestId ? `guest:${guestId}` : null
}

/**
 * Reads the guest id, creating one if this browser has not been seen before.
 *
 * Route handlers and Server Actions only — see `readActorKey` for pages.
 */
export function ensureGuestId() {
  const existing = readGuestId()
  if (existing) return existing

  const id = randomUUID()
  cookies().set(COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  })
  return id
}

/**
 * The key stored on PrayerLog.actorKey.
 *
 * One non-null column rather than a nullable userId + nullable sessionId,
 * because Postgres allows duplicate NULLs through a composite unique index —
 * which would have let guests pray for the same request repeatedly.
 */
export function actorKeyFor(userId: string | undefined, guestId: string) {
  return userId ? `user:${userId}` : `guest:${guestId}`
}
