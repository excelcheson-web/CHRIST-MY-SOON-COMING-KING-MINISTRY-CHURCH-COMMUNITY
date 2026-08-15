import { Role } from '@prisma/client'
import bcrypt from 'bcryptjs'
import type { NextAuthOptions } from 'next-auth'
import { getServerSession } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { redirect } from 'next/navigation'

import { canAccessAdminArea, canManageContent, canManageFollowUp } from '@/lib/permissions'
import { prisma, requirePrisma } from '@/lib/prisma'
import {
  decryptSecret,
  looksLikeRecoveryCode,
  matchRecoveryCode,
  verifyCode,
} from '@/lib/two-factor'
import { verifyTurnstile } from '@/lib/turnstile'
import { loginSchema } from '@/lib/validations'

const googleEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim(),
)

/**
 * Signals the sign-in form reads back from `signIn()`.
 *
 * The password was already correct by the time either is thrown, so neither
 * leaks anything about accounts that do not exist.
 */
export const TWO_FACTOR_REQUIRED = 'TWO_FACTOR_REQUIRED'
export const TWO_FACTOR_INVALID = 'TWO_FACTOR_INVALID'

/**
 * The anti-bot check did not pass.
 *
 * Thrown *before* any password is compared, so unlike the two above it says
 * nothing whatsoever about whether the account exists.
 */
export const HUMAN_CHECK_FAILED = 'HUMAN_CHECK_FAILED'

/**
 * JWT sessions (no database adapter) so the site keeps working on a cold
 * database and so middleware can authorise on the edge without a query.
 * Google sign-ins are mirrored into the `users` table by the `signIn` callback,
 * which keeps roles in exactly one place.
 */
export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: '/login', error: '/login' },

  providers: [
    CredentialsProvider({
      name: 'Email and password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        code: { label: 'Authentication code', type: 'text' },
        turnstileToken: { label: 'Human check', type: 'text' },
      },
      async authorize(credentials, request) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        /*
         * The human check, before the password is compared.
         *
         * Unlike the public forms — where the check runs after validation so a
         * typo cannot waste a single-use token — sign-in verifies *first*.
         * There is nothing to lose by doing so (a wrong password costs the
         * visitor a fresh token, which the form requests automatically), and
         * everything to gain: this is the endpoint credential-stuffing aims at,
         * and a check that runs after `bcrypt.compare` would let an attacker
         * use the response timing to test passwords for free.
         *
         * `request.headers` here is a plain object, not a `Headers` — NextAuth
         * hands over its own internal request shape rather than a fetch one.
         */
        const human = await verifyTurnstile(
          (credentials as { turnstileToken?: unknown } | undefined)?.turnstileToken,
          new Headers((request?.headers ?? {}) as Record<string, string>),
        )
        if (!human.ok) throw new Error(HUMAN_CHECK_FAILED)

        const db = requirePrisma()
        const user = await db.user.findUnique({ where: { email: parsed.data.email } })

        // No account, or an OAuth-only account with no password set.
        if (!user?.password) return null

        const valid = await bcrypt.compare(parsed.data.password, user.password)
        if (!valid) return null

        // A banned member cannot sign in. Checked after the password so the
        // form cannot be used to discover which accounts are banned.
        if (user.bannedAt) return null

        // --- Second factor ---------------------------------------------------
        // Only reached once the password is already correct, so asking for a
        // code never reveals whether an account exists.
        if (user.twoFactorEnabledAt && user.twoFactorSecret) {
          const code = typeof credentials?.code === 'string' ? credentials.code.trim() : ''

          if (!code) throw new Error(TWO_FACTOR_REQUIRED)

          if (looksLikeRecoveryCode(code)) {
            const result = await matchRecoveryCode(code, user.twoFactorRecovery)
            if (!result.matched) throw new Error(TWO_FACTOR_INVALID)
            // Burn it — a recovery code that worked twice would just be a
            // second password.
            await db.user.update({
              where: { id: user.id },
              data: { twoFactorRecovery: result.remaining },
            })
          } else {
            const secret = decryptSecret(user.twoFactorSecret)
            if (!secret || !verifyCode(secret, code, user.email)) {
              throw new Error(TWO_FACTOR_INVALID)
            }
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        }
      },
    }),

    ...(googleEnabled
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== 'google') return true
      if (!user.email) return false

      const db = requirePrisma()

      const existing = await db.user.findUnique({
        where: { email: user.email.toLowerCase() },
        select: { bannedAt: true },
      })
      if (existing?.bannedAt) return false

      const record = await db.user.upsert({
        where: { email: user.email.toLowerCase() },
        update: {
          name: user.name ?? undefined,
          image: user.image ?? undefined,
          emailVerified: new Date(),
        },
        create: {
          email: user.email.toLowerCase(),
          name: user.name ?? 'Friend',
          image: user.image,
          role: Role.MEMBER,
          emailVerified: new Date(),
        },
      })

      user.id = record.id
      user.role = record.role
      return true
    },

    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }

      // Lets a role change take effect without forcing a sign-out.
      if (trigger === 'update' && token.email && prisma) {
        const fresh = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true, role: true, name: true },
        })
        if (fresh) {
          token.id = fresh.id
          token.role = fresh.role
          token.name = fresh.name
        }
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id
        session.user.role = token.role
      }
      return session
    },
  },
}

export const isGoogleEnabled = googleEnabled

/** True once we have complained about a missing secret, so we do it once. */
let warnedAboutSecret = false

/**
 * Is this one of Next's control-flow throws rather than a real failure?
 *
 * Next marks them with a well-known `digest` string. Anything holding one of
 * these is the framework talking to itself — a bailout from static rendering,
 * a `redirect()`, a `notFound()` — and catching it changes how the page is
 * rendered rather than handling an error.
 */
function isNextControlFlow(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest
  if (typeof digest !== 'string') return false
  return (
    digest === 'DYNAMIC_SERVER_USAGE' ||
    digest === 'BAILOUT_TO_CLIENT_SIDE_RENDERING' ||
    digest === 'NEXT_NOT_FOUND' ||
    digest.startsWith('NEXT_REDIRECT')
  )
}

/**
 * The current session, or `null` when nobody is signed in.
 *
 * ## Why this catches
 *
 * `getServerSession` throws rather than returns null when NextAuth is
 * misconfigured — most commonly when `NEXTAUTH_SECRET` is unset in
 * production, which it refuses to run without. Unwrapped, that exception
 * propagates out of every server component that asks who is signed in,
 * including the public home page, and the whole site renders "Something went
 * wrong". A church loses its website because a deployment variable is
 * missing.
 *
 * The rest of this codebase already refuses to let one broken dependency take
 * the public site down — see `lib/page-content.ts` and the loaders in
 * `lib/home-content.ts`, which all fall back rather than throw. Sessions get
 * the same treatment: a visitor who was never signed in anyway can still read
 * about the church.
 *
 * ## What it deliberately does not hide
 *
 * Returning null means "signed out", so nothing private is exposed — every
 * guard treats it as a stranger. Signing *in* still fails loudly, because
 * NextAuth's own route has its own error handling and no secret means no
 * session can be issued. And the misconfiguration is logged on every boot it
 * affects, so it shows up in the platform logs rather than being swallowed.
 */
export async function auth() {
  try {
    return await getServerSession(authOptions)
  } catch (error) {
    // Next signals control flow by throwing. `headers()` inside
    // getServerSession throws DYNAMIC_SERVER_USAGE during prerender to say
    // "this route cannot be static", and redirect()/notFound() throw their
    // own. Swallowing those would leave Next believing a per-viewer page is
    // safe to cache — so one member could be served another member's page.
    // They must pass straight through.
    if (isNextControlFlow(error)) throw error

    const missingSecret =
      !process.env.NEXTAUTH_SECRET && process.env.NODE_ENV === 'production'

    if (missingSecret && !warnedAboutSecret) {
      warnedAboutSecret = true
      console.error(
        '[auth] NEXTAUTH_SECRET is not set. Nobody can sign in until it is. ' +
          'Set it in your host\'s environment variables — 32 random bytes, e.g. ' +
          'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))". ' +
          'The public site will keep working; the signed-in area will not.',
      )
    } else {
      console.error('[auth] could not read the session', error)
    }

    return null
  }
}

/** Server-component guard: returns the session user or sends them to /login. */
export async function requireUser(callbackUrl = '/dashboard') {
  const session = await auth()
  if (!session?.user) redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`)
  return session.user
}

/** Server-component guard for admin-only pages. */
export async function requireAdmin() {
  const user = await requireUser('/admin')
  if (user.role !== Role.ADMIN) redirect('/dashboard?denied=admin')
  return user
}

/**
 * Coarse gate for anything under /admin — mirrors `middleware.ts`. Individual
 * pages narrow further, so a follow-up volunteer can reach the decisions board
 * without also reaching the curriculum editor.
 */
export async function requireAdminArea(callbackUrl = '/admin') {
  const user = await requireUser(callbackUrl)
  if (!canAccessAdminArea(user.role)) redirect('/dashboard?denied=admin')
  return user
}

/** Courses, weeks, lessons and page content — ADMIN or PASTOR. */
export async function requireContentManager(callbackUrl = '/admin') {
  const user = await requireUser(callbackUrl)
  if (!canManageContent(user.role)) redirect('/dashboard?denied=content')
  return user
}

/** Salvation decisions and follow-up — ADMIN, PASTOR or FOLLOW_UP_TEAM. */
export async function requireFollowUpAccess(callbackUrl = '/admin/salvation') {
  const user = await requireUser(callbackUrl)
  if (!canManageFollowUp(user.role)) redirect('/dashboard?denied=follow-up')
  return user
}

/** API-route equivalent of the guards above: returns the user or null. */
export async function getApiUser() {
  const session = await auth()
  return session?.user ?? null
}
