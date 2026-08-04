import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { databaseError, jsonError, jsonOk, readJson, requirePrisma } from '@/lib/api-guards'
import { getApiUser } from '@/lib/auth'
import { clientIp, rateLimit, sweepRateLimits } from '@/lib/rate-limit'
import {
  encryptSecret,
  decryptSecret,
  hashRecoveryCodes,
  newEnrolment,
  newRecoveryCodes,
  verifyCode,
} from '@/lib/two-factor'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('begin') }),
  z.object({ action: z.literal('confirm'), code: z.string().trim().min(6).max(10) }),
  z.object({ action: z.literal('disable'), password: z.string().min(1) }),
  z.object({ action: z.literal('regenerate'), password: z.string().min(1) }),
])

/**
 * POST /api/account/two-factor
 *
 * Enrolment is two steps on purpose. `begin` stores a secret but leaves 2FA
 * off; `confirm` only switches it on once a real code from the authenticator
 * proves it works. Skipping that is how people lock themselves out of their own
 * site with a mis-scanned QR.
 */
export async function POST(request: Request) {
  sweepRateLimits()

  const user = await getApiUser()
  if (!user) return jsonError('Please sign in.', 401)

  // Guessing a six-digit code is only hard if guesses are limited.
  const limit = rateLimit(`2fa:${user.id}:${clientIp(request.headers)}`, 12, 15 * 60 * 1000)
  if (!limit.ok) {
    return jsonError('Too many attempts. Please wait a few minutes and try again.', 429)
  }

  const { body, response } = await readJson(request)
  if (response) return response

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return jsonError('Invalid request.', 422)

  try {
    const db = requirePrisma()

    const account = await db.user.findUnique({
      where: { id: user.id },
      select: {
        email: true,
        password: true,
        twoFactorSecret: true,
        twoFactorEnabledAt: true,
      },
    })
    if (!account) return jsonError('Account not found.', 404)

    // --- Start enrolment ---------------------------------------------------
    if (parsed.data.action === 'begin') {
      if (account.twoFactorEnabledAt) {
        return jsonError('Two-factor authentication is already switched on.', 409)
      }

      const enrolment = newEnrolment(account.email)
      await db.user.update({
        where: { id: user.id },
        // Stored but not enabled — useless until `confirm` succeeds.
        data: { twoFactorSecret: encryptSecret(enrolment.secret), twoFactorEnabledAt: null },
      })

      return jsonOk({ uri: enrolment.uri, secret: enrolment.secret })
    }

    // --- Finish enrolment --------------------------------------------------
    if (parsed.data.action === 'confirm') {
      if (account.twoFactorEnabledAt) {
        return jsonError('Two-factor authentication is already switched on.', 409)
      }
      if (!account.twoFactorSecret) {
        return jsonError('Start again — there is nothing to confirm yet.', 409)
      }

      const secret = decryptSecret(account.twoFactorSecret)
      if (!secret) return jsonError('That setup is no longer valid. Please start again.', 409)

      if (!verifyCode(secret, parsed.data.code, account.email)) {
        return jsonError('That code is not right. Check your app and try the next one.', 422)
      }

      // Only now is it real — and only now do recovery codes exist.
      const codes = newRecoveryCodes()
      await db.user.update({
        where: { id: user.id },
        data: {
          twoFactorEnabledAt: new Date(),
          twoFactorRecovery: await hashRecoveryCodes(codes),
        },
      })

      revalidatePath('/account/security')
      // The only time these are ever readable. They are hashed from here on.
      return jsonOk({ enabled: true, recoveryCodes: codes })
    }

    // --- Turn it off, or issue fresh recovery codes -------------------------
    // Both need the password: an unattended logged-in laptop must not be enough
    // to strip the second factor off an account.
    if (!account.password) return jsonError('This account has no password set.', 409)
    if (!(await bcrypt.compare(parsed.data.password, account.password))) {
      return jsonError('That password is not right.', 422)
    }
    if (!account.twoFactorEnabledAt) {
      return jsonError('Two-factor authentication is not switched on.', 409)
    }

    if (parsed.data.action === 'disable') {
      await db.user.update({
        where: { id: user.id },
        data: { twoFactorSecret: null, twoFactorEnabledAt: null, twoFactorRecovery: [] },
      })
      revalidatePath('/account/security')
      return jsonOk({ enabled: false })
    }

    const codes = newRecoveryCodes()
    await db.user.update({
      where: { id: user.id },
      data: { twoFactorRecovery: await hashRecoveryCodes(codes) },
    })
    revalidatePath('/account/security')
    return jsonOk({ recoveryCodes: codes })
  } catch (error) {
    return databaseError('two-factor', error)
  }
}
