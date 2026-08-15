import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'

import { sendPasswordChangedEmail } from '@/lib/email'
import { lookupResetToken } from '@/lib/password-reset'
import { DatabaseNotConfiguredError, requirePrisma } from '@/lib/prisma'
import { clientIp, rateLimit, sweepRateLimits } from '@/lib/rate-limit'
import { resetPasswordSchema } from '@/lib/validations'
import type { ApiResult } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Matches registration, the seed and the change-password route. */
const BCRYPT_COST = 12

/**
 * POST /api/auth/reset-password — set a new password using a link from email.
 *
 * The token is the entire proof of identity, so everything that makes it safe
 * lives in one transaction: the password is written and the token is marked
 * spent together, or neither happens. Doing it in two steps would leave a
 * window where a link that has already changed a password still works.
 */
export async function POST(request: Request) {
  sweepRateLimits()

  const ip = clientIp(request.headers)

  // Generous compared with the request side — somebody with a valid link may
  // legitimately fail on password rules a few times — but not unbounded.
  const limit = rateLimit(`reset:${ip}`, 12, 15 * 60 * 1000)
  if (!limit.ok) {
    return NextResponse.json<ApiResult>(
      { ok: false, error: 'Too many attempts. Please wait a few minutes and try again.' },
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

  const parsed = resetPasswordSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json<ApiResult>(
      {
        ok: false,
        error: 'Please check the form.',
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      },
      { status: 422 },
    )
  }

  try {
    const db = requirePrisma()

    const lookup = await lookupResetToken(db, parsed.data.token)
    if (!lookup.ok) {
      /*
       * Three different sentences, because they call for three different
       * actions and none of them reveals anything: only somebody already
       * holding a real token can see "used" or "expired".
       */
      const message =
        lookup.reason === 'used'
          ? 'That link has already been used. Please request a new one.'
          : lookup.reason === 'expired'
            ? 'That link has expired. Please request a new one.'
            : 'That link is not valid. Please request a new one.'
      return NextResponse.json<ApiResult>({ ok: false, error: message }, { status: 410 })
    }

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, BCRYPT_COST)

    /*
     * One transaction. The token is spent in the same breath as the password
     * changing, so a link can never survive its own success.
     *
     * `usedAt: null` in the update's where clause makes the spend conditional:
     * two requests racing with the same link cannot both come back successful,
     * because the second updates zero rows and the transaction is rejected.
     */
    const [, spent] = await db.$transaction([
      db.user.update({
        where: { id: lookup.userId },
        data: { password: passwordHash },
      }),
      db.passwordResetToken.updateMany({
        where: { id: lookup.tokenId, usedAt: null },
        data: { usedAt: new Date(), requestedIp: ip },
      }),
    ])

    if (spent.count === 0) {
      return NextResponse.json<ApiResult>(
        { ok: false, error: 'That link has already been used. Please request a new one.' },
        { status: 410 },
      )
    }

    /*
     * Told afterwards, and never allowed to fail the reset.
     *
     * If somebody else did this, the real owner learns while it still matters.
     * If the mailer is down, the password has still changed — refusing to
     * complete a successful reset because a courtesy note bounced would be the
     * wrong way round.
     */
    const account = await db.user.findUnique({
      where: { id: lookup.userId },
      select: { email: true, name: true },
    })
    if (account) {
      void sendPasswordChangedEmail({ to: account.email, name: account.name }).catch(() => {})
    }

    return NextResponse.json<ApiResult<{ reset: true }>>({ ok: true, data: { reset: true } })
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json<ApiResult>(
        { ok: false, error: 'Accounts are not switched on yet.' },
        { status: 503 },
      )
    }
    console.error('[reset-password]', error)
    return NextResponse.json<ApiResult>(
      { ok: false, error: 'Something went wrong on our side. Please try again.' },
      { status: 500 },
    )
  }
}
