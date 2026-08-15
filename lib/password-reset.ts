import 'server-only'

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

import type { PrismaClient } from '@prisma/client'

/**
 * Forgot-password tokens.
 *
 * ## What is stored, and what is not
 *
 * The token goes in the email. Only its SHA-256 hash goes in the database, so
 * a leaked backup cannot be used to walk into anybody's account — the same
 * reasoning that makes passwords bcrypt hashes rather than text.
 *
 * SHA-256 rather than bcrypt here, deliberately. Bcrypt's slowness exists to
 * frustrate guessing at low-entropy secrets that people choose. These are 32
 * random bytes from the system CSPRNG; there is nothing to guess, and a slow
 * hash would only mean a slow lookup on a route that must stay quick under a
 * flood of forgot-password requests.
 *
 * ## One hour, one use
 *
 * Long enough to find the email on a phone and finish on a laptop, short
 * enough that a message left in an unattended inbox stops being a key. Spent
 * the instant it works.
 */

/** How long a link stays valid. */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000

/** 32 bytes, url-safe. Long enough that guessing is not a threat model. */
export function newResetToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Compares two hashes without leaking where they first differ.
 *
 * The lookup below is by unique index, so this is belt and braces rather than
 * the only defence — but a comparison on a security token should not be the
 * one place in the file that invites a timing question.
 */
export function tokensMatch(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

/**
 * Issues a token for a user, invalidating any still outstanding.
 *
 * Asking twice must not leave two working links: somebody who requests a reset,
 * gets distracted, and requests another should end up with exactly one key —
 * and the older email, which may have gone to a compromised mailbox, should
 * stop working the moment the newer one is made.
 */
export async function issueResetToken(
  db: PrismaClient,
  userId: string,
  requestedIp: string | null,
): Promise<string> {
  const token = newResetToken()

  await db.$transaction([
    db.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
    db.passwordResetToken.create({
      data: {
        userId,
        tokenHash: hashResetToken(token),
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        requestedIp,
      },
    }),
  ])

  return token
}

export type ResetLookup =
  | { ok: true; userId: string; tokenId: string }
  | { ok: false; reason: 'unknown' | 'used' | 'expired' }

/**
 * Resolves a token from a link to the account it belongs to.
 *
 * Distinguishes "already used" and "expired" from "never existed" because the
 * first two are worth telling the person — they explain a link that looks
 * right but does not work, and neither reveals whether an account exists,
 * since only somebody holding a real token can reach those branches at all.
 */
export async function lookupResetToken(db: PrismaClient, token: string): Promise<ResetLookup> {
  const trimmed = token.trim()
  if (!trimmed) return { ok: false, reason: 'unknown' }

  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(trimmed) },
    select: { id: true, userId: true, expiresAt: true, usedAt: true, tokenHash: true },
  })

  if (!record) return { ok: false, reason: 'unknown' }
  if (!tokensMatch(record.tokenHash, hashResetToken(trimmed))) return { ok: false, reason: 'unknown' }
  if (record.usedAt) return { ok: false, reason: 'used' }
  if (record.expiresAt.getTime() <= Date.now()) return { ok: false, reason: 'expired' }

  return { ok: true, userId: record.userId, tokenId: record.id }
}

/**
 * Deletes tokens that are spent or long expired.
 *
 * Called from the cron route. A day's grace after expiry so that "this link has
 * expired" can still be shown rather than degrading to "this link is not
 * recognised", which reads like something sinister has happened.
 */
export async function sweepResetTokens(db: PrismaClient): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const { count } = await db.passwordResetToken.deleteMany({
    where: { OR: [{ expiresAt: { lt: cutoff } }, { usedAt: { lt: cutoff } }] },
  })
  return count
}
