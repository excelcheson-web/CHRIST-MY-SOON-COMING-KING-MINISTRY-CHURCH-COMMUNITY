import { Prisma, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'

import { DatabaseNotConfiguredError, requirePrisma } from '@/lib/prisma'
import { clientIp, rateLimit, sweepRateLimits } from '@/lib/rate-limit'
import { verifyTurnstile } from '@/lib/turnstile'
import { acceptImage } from '@/lib/uploads'
import { registerSchema } from '@/lib/validations'
import type { ApiResult } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 8

export async function POST(request: Request) {
  sweepRateLimits()

  const limit = rateLimit(`register:${clientIp(request.headers)}`, MAX_ATTEMPTS, WINDOW_MS)
  if (!limit.ok) {
    return NextResponse.json<ApiResult>(
      { ok: false, error: 'Too many attempts. Please wait a few minutes and try again.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    )
  }

  /*
   * Multipart when a photo came with the form, JSON otherwise. Most people sign
   * up without a picture, and JSON keeps that path simple on both ends.
   */
  let body: unknown
  let photo: unknown = null

  const contentType = request.headers.get('content-type') ?? ''
  try {
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      photo = form.get('photo')
      const text = (key: string) => {
        const value = form.get(key)
        return typeof value === 'string' && value ? value : undefined
      }
      body = {
        name: text('name'),
        email: text('email'),
        password: text('password'),
        confirmPassword: text('confirmPassword'),
        birthDate: text('birthDate'),
        parentalConsent: form.get('parentalConsent') === 'true',
        terms: form.get('terms') === 'true',
        phone: text('phone'),
        address: text('address'),
        profession: text('profession'),
        ministryId: text('ministryId'),
        neighbourhood: text('neighbourhood'),
        /*
         * Carried on the multipart branch too, or signing up *with a photo*
         * would arrive with no token and fail the human check every time,
         * while signing up without one worked — the kind of bug that gets
         * reported as "the site rejects my picture".
         */
        turnstileToken: text('turnstileToken'),
      }
    } else {
      body = await request.json()
    }
  } catch {
    return NextResponse.json<ApiResult>(
      { ok: false, error: 'We could not read that request. Please try again.' },
      { status: 400 },
    )
  }

  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json<ApiResult>(
      {
        ok: false,
        error: 'Please check the highlighted fields and try again.',
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      },
      { status: 422 },
    )
  }

  /*
   * The human check, deliberately *after* validation.
   *
   * A Turnstile token is single-use. Checking it before the schema would spend
   * it on a submission that failed on a mistyped date of birth, and the
   * corrected resubmission would then be rejected as a duplicate — the visitor
   * would be locked out by their own typo. Nothing here has touched the
   * database yet, so there is no cost to validating first.
   */
  const human = await verifyTurnstile(
    (body as { turnstileToken?: unknown }).turnstileToken,
    request.headers,
  )
  if (!human.ok) {
    return NextResponse.json<ApiResult>({ ok: false, error: human.reason }, { status: 403 })
  }

  const {
    name,
    email,
    password,
    birthDate,
    parentalConsent,
    phone,
    address,
    profession,
    ministryId,
    neighbourhood,
  } = parsed.data

  // Sniffed and stored before the transaction, so a bad file fails the request
  // rather than leaving a half-made account behind.
  const upload = await acceptImage(photo, 'photo')
  if (!upload.ok) return upload.response

  try {
    const prisma = requirePrisma()

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
    if (existing) {
      return NextResponse.json<ApiResult>(
        {
          ok: false,
          error: 'An account with that email already exists. Try signing in instead.',
          fieldErrors: { email: ['This email is already registered.'] },
        },
        { status: 409 },
      )
    }

    /*
     * The department is verified rather than trusted. A crafted request could
     * otherwise attach a brand-new account to any ministry by id, and an
     * unrecognised value would fail on a foreign key with a 500 instead of a
     * polite message.
     */
    let department: string | null = null
    if (ministryId) {
      const ministry = await prisma.ministry.findUnique({
        where: { id: ministryId },
        select: { id: true, isActive: true },
      })
      department = ministry?.isActive ? ministry.id : null
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: await bcrypt.hash(password, 12),
        role: Role.MEMBER, // Phase One: everyone joins as a member.
        // The age gate itself lives in registerSchema — by this point the
        // person is 13+, and 13–17s have a guardian's consent recorded.
        birthDate: new Date(birthDate),
        parentalConsent,

        // Created alongside the account so a new member is in the directory
        // from their first minute rather than after a second, hidden step.
        profile: {
          create: {
            phone: phone ?? null,
            address: address ?? null,
            profession: profession ?? null,
            neighbourhood: neighbourhood ?? null,
            avatarKey: upload.image?.key ?? null,
          },
        },

        ...(department ? { ministries: { create: { ministryId: department } } } : {}),
      },
      select: { id: true, name: true, email: true, role: true },
    })

    return NextResponse.json<ApiResult<typeof user>>({ ok: true, data: user }, { status: 201 })
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      console.error('[register]', error.message)
      return NextResponse.json<ApiResult>(
        {
          ok: false,
          error: 'Accounts are not switched on yet. Please try again shortly.',
        },
        { status: 503 },
      )
    }

    // Unique-constraint race between the check above and the insert.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json<ApiResult>(
        {
          ok: false,
          error: 'An account with that email already exists. Try signing in instead.',
          fieldErrors: { email: ['This email is already registered.'] },
        },
        { status: 409 },
      )
    }

    console.error('[register] unexpected error:', error)
    return NextResponse.json<ApiResult>(
      { ok: false, error: 'Something went wrong on our side. Please try again.' },
      { status: 500 },
    )
  }
}
