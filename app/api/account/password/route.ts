import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'

import { databaseError, jsonError, jsonOk, readJson, requirePrisma } from '@/lib/api-guards'
import { getApiUser } from '@/lib/auth'
import { clientIp, rateLimit, sweepRateLimits } from '@/lib/rate-limit'
import { changePasswordSchema } from '@/lib/validations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * The same cost the seed script and registration use.
 *
 * It must match, or an account's security would quietly depend on which route
 * happened to write its password last.
 */
const BCRYPT_COST = 12

/**
 * POST /api/account/password — change your own password.
 *
 * ## Two cases, told apart by the database and not by the client
 *
 * Most accounts have a password, and changing it requires proving you know the
 * current one. An account created through Google sign-in has none, and for
 * those this endpoint *sets* a first password with no current one to give.
 *
 * Which case applies is read from the stored record, never from what the
 * request claims. If the client decided, anyone could send
 * `{ currentPassword: undefined }` and skip the check entirely — that is the
 * whole attack, and it is why `changePasswordSchema` leaves the field optional
 * and this route makes it mandatory the moment a password exists.
 *
 * ## Why it does not sign you out
 *
 * Sessions here are JWTs, so there is no server-side session table to sweep and
 * an existing token stays valid until it expires. That is a known trade-off of
 * the strategy this app already uses rather than something this route
 * introduces; changing it would mean moving the whole app to database sessions.
 * Worth revisiting if staff accounts ever get shared devices.
 */
export async function POST(request: Request) {
  sweepRateLimits()

  const user = await getApiUser()
  if (!user) return jsonError('Please sign in.', 401)

  /*
   * Five attempts per quarter of an hour, keyed to the account *and* the
   * address. This endpoint verifies a password, which makes it a password
   * oracle for anyone who gets hold of an unlocked, signed-in browser — the
   * limit is what stops that becoming an offline-speed guessing game.
   */
  const limit = rateLimit(`password:${user.id}:${clientIp(request.headers)}`, 5, 15 * 60 * 1000)
  if (!limit.ok) {
    return jsonError('Too many attempts. Please wait a few minutes and try again.', 429)
  }

  const { body, response } = await readJson(request)
  if (response) return response

  const parsed = changePasswordSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(
      'Please check the form.',
      422,
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    )
  }

  const { currentPassword, newPassword } = parsed.data

  try {
    const db = requirePrisma()

    const account = await db.user.findUnique({
      where: { id: user.id },
      select: { password: true },
    })
    if (!account) return jsonError('Account not found.', 404)

    if (account.password) {
      if (!currentPassword) {
        return jsonError('Please enter your current password.', 422, {
          currentPassword: ['Please enter your current password.'],
        })
      }
      if (!(await bcrypt.compare(currentPassword, account.password))) {
        return jsonError('That password is not right.', 422, {
          currentPassword: ['That password is not right.'],
        })
      }
    }

    await db.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(newPassword, BCRYPT_COST) },
    })

    revalidatePath('/account/security')
    // `hadPassword` lets the form say "changed" or "set" without guessing.
    return jsonOk({ changed: true, hadPassword: Boolean(account.password) })
  } catch (error) {
    return databaseError('account-password', error)
  }
}
