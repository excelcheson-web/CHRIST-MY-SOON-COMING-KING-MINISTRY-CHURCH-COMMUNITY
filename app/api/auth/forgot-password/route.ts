import { NextResponse } from 'next/server'

import { getSiteSettings } from '@/lib/site-settings'
import { isEmailConfigured, sendPasswordResetEmail } from '@/lib/email'
import { issueResetToken } from '@/lib/password-reset'
import { DatabaseNotConfiguredError, requirePrisma } from '@/lib/prisma'
import { clientIp, rateLimit, sweepRateLimits } from '@/lib/rate-limit'
import { verifyTurnstile } from '@/lib/turnstile'
import { forgotPasswordSchema } from '@/lib/validations'
import type { ApiResult } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/forgot-password — send a reset link.
 *
 * ## The same answer every time
 *
 * This returns the identical success response whether or not an account
 * exists. That is not politeness, it is the only thing standing between this
 * endpoint and a membership list: a form that says "no such account" lets
 * anyone test addresses one at a time and learn who attends this church.
 *
 * For a congregation that includes people whose attendance is genuinely
 * sensitive, that list is worth protecting. So: same words, same status, and
 * — because a reply that comes back faster for unknown addresses would leak
 * the same fact — no early return before the work is done.
 */
export async function POST(request: Request) {
  sweepRateLimits()

  const ip = clientIp(request.headers)

  /*
   * Deliberately tight. Every request here sends an email on somebody else's
   * behalf, so a loose limit turns this route into a way to flood a person's
   * inbox using our domain's reputation.
   */
  const limit = rateLimit(`forgot:${ip}`, 5, 15 * 60 * 1000)
  if (!limit.ok) {
    return NextResponse.json<ApiResult>(
      { ok: false, error: 'Too many requests. Please wait a few minutes and try again.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json<ApiResult>(
      { ok: false, error: 'We could not read that request.' },
      { status: 400 },
    )
  }

  const parsed = forgotPasswordSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json<ApiResult>(
      {
        ok: false,
        error: 'Please check the email address and try again.',
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      },
      { status: 422 },
    )
  }

  // After validation, as everywhere else — a single-use token must not be spent
  // on a submission that failed on a malformed address.
  const human = await verifyTurnstile(parsed.data.turnstileToken, request.headers)
  if (!human.ok) {
    return NextResponse.json<ApiResult>({ ok: false, error: human.reason }, { status: 403 })
  }

  /*
   * No mailer, no pretending. Everything below would appear to work and send
   * nothing, leaving somebody refreshing an inbox that will never receive
   * anything — the one failure this flow must never have.
   */
  if (!isEmailConfigured) {
    const settings = await getSiteSettings()
    return NextResponse.json<ApiResult>(
      {
        ok: false,
        error: `Password reset by email is not switched on yet. Please contact us at ${settings.contact.email} and we will help you back in.`,
      },
      { status: 503 },
    )
  }

  try {
    const db = requirePrisma()

    const user = await db.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true, name: true, email: true, password: true, bannedAt: true },
    })

    /*
     * Three reasons to send nothing, none of them visible in the response:
     * no such account; a banned account; or an account with no password at all,
     * which means Google sign-in — and "reset your password" would be a
     * confusing instruction for somebody who has never had one.
     */
    if (user && !user.bannedAt && user.password) {
      const settings = await getSiteSettings()
      const token = await issueResetToken(db, user.id, ip)
      const resetUrl = `${settings.url.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`

      const sent = await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl })
      // Logged, never surfaced: the caller must not learn the difference
      // between "we did not send" and "there was nobody to send to".
      if (!sent.ok) console.error('[forgot-password] send failed:', sent.reason)
    }

    return NextResponse.json<ApiResult<{ sent: true }>>({ ok: true, data: { sent: true } })
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json<ApiResult>(
        { ok: false, error: 'Accounts are not switched on yet.' },
        { status: 503 },
      )
    }
    console.error('[forgot-password]', error)
    return NextResponse.json<ApiResult>(
      { ok: false, error: 'Something went wrong on our side. Please try again.' },
      { status: 500 },
    )
  }
}
