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
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

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

export function auth() {
  return getServerSession(authOptions)
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
