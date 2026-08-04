import 'server-only'

import { cookies } from 'next/headers'

/**
 * The journey is anonymous, so the decision id lives in an httpOnly cookie
 * rather than being passed around by the client.
 *
 * This matters: if the id travelled in the request body, anyone could POST an
 * arbitrary id and overwrite someone else's decision record. The cookie makes
 * the browser prove which record is its own.
 */
const COOKIE = 'cmsck_decision'
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60

export function readDecisionId() {
  return cookies().get(COOKIE)?.value
}

export function writeDecisionId(id: string) {
  cookies().set(COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  })
}

export function clearDecisionId() {
  cookies().delete(COOKIE)
}
