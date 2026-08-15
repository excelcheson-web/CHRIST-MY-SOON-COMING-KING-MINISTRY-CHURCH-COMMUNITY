import { TwoFactorMethod } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { databaseError, jsonError, jsonOk, readJson, requirePrisma } from '@/lib/api-guards'
import { getApiUser } from '@/lib/auth'
import { isEmailConfigured, sendSignInCodeEmail } from '@/lib/email'
import { clientIp, rateLimit, sweepRateLimits } from '@/lib/rate-limit'
import {
  emailCodeMatches,
  EMAIL_OTP_MAX_ATTEMPTS,
  EMAIL_OTP_TTL_MINUTES,
  encryptSecret,
  hashEmailCode,
  newEmailCode,
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
  // Email as the second factor: send a code, then confirm it. Enrolment is two
  // steps for the same reason TOTP's is — nothing is switched on until a code
  // that actually arrived has been typed back in.
  z.object({ action: z.literal('email-begin') }),
  z.object({ action: z.literal('email-confirm'), code: z.string().trim().min(4).max(10) }),
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
        name: true,
        twoFactorMethod: true,
        emailOtpHash: true,
        emailOtpExpiresAt: true,
        emailOtpAttempts: true,
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

    // --- Enrol using emailed codes -----------------------------------------
    if (parsed.data.action === 'email-begin') {
      if (account.twoFactorEnabledAt) {
        return jsonError('Two-factor authentication is already switched on.', 409)
      }
      if (!isEmailConfigured) {
        return jsonError(
          'Emailed codes are not available yet — email sending is not configured. Use an authenticator app instead.',
          503,
        )
      }

      const code = newEmailCode()
      await db.user.update({
        where: { id: user.id },
        data: {
          emailOtpHash: await hashEmailCode(code),
          emailOtpExpiresAt: new Date(Date.now() + EMAIL_OTP_TTL_MINUTES * 60 * 1000),
          emailOtpAttempts: 0,
        },
      })

      const sent = await sendSignInCodeEmail({
        to: account.email,
        name: account.name,
        code,
        minutes: EMAIL_OTP_TTL_MINUTES,
      })
      /*
       * Unlike at sign-in — where a send failure is swallowed so the response
       * gives nothing away — this one is reported. The person is signed in and
       * setting up their own account, so there is nothing to conceal, and
       * telling them beats a code that never arrives.
       */
      if (!sent.ok) {
        return jsonError('We could not send that code. Please try again in a moment.', 502)
      }

      return jsonOk({ sent: true, email: account.email, minutes: EMAIL_OTP_TTL_MINUTES })
    }

    if (parsed.data.action === 'email-confirm') {
      if (account.twoFactorEnabledAt) {
        return jsonError('Two-factor authentication is already switched on.', 409)
      }
      if (!account.emailOtpHash || !account.emailOtpExpiresAt) {
        return jsonError('Start again — there is no code to confirm yet.', 409)
      }
      if (account.emailOtpExpiresAt.getTime() <= Date.now()) {
        return jsonError('That code has expired. Please send yourself a new one.', 422)
      }
      if (account.emailOtpAttempts >= EMAIL_OTP_MAX_ATTEMPTS) {
        return jsonError('Too many wrong codes. Please send yourself a new one.', 429)
      }
      if (!(await emailCodeMatches(parsed.data.code, account.emailOtpHash))) {
        await db.user.update({
          where: { id: user.id },
          data: { emailOtpAttempts: { increment: 1 } },
        })
        return jsonError('That code is not right. Check the email and try again.', 422)
      }

      // Real from here. Recovery codes matter more with this method, not less:
      // they are the way back in when the mailbox itself is unreachable.
      const codes = newRecoveryCodes()
      await db.user.update({
        where: { id: user.id },
        data: {
          twoFactorMethod: TwoFactorMethod.EMAIL,
          twoFactorEnabledAt: new Date(),
          twoFactorRecovery: await hashRecoveryCodes(codes),
          emailOtpHash: null,
          emailOtpExpiresAt: null,
          emailOtpAttempts: 0,
        },
      })

      revalidatePath('/account/security')
      return jsonOk({ enabled: true, method: 'EMAIL', recoveryCodes: codes })
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
        data: {
          twoFactorSecret: null,
          twoFactorEnabledAt: null,
          twoFactorRecovery: [],
          /*
           * Back to the default, and any half-issued code destroyed.
           *
           * Leaving `twoFactorMethod` on EMAIL would mean somebody who turned
           * 2FA off and later enrolled with an authenticator app still had an
           * account flagged as email-based — and `authorize` would then ask
           * for an emailed code that no app could ever produce.
           */
          twoFactorMethod: TwoFactorMethod.TOTP,
          emailOtpHash: null,
          emailOtpExpiresAt: null,
          emailOtpAttempts: 0,
        },
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
