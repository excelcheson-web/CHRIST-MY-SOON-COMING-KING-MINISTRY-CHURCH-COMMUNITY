import 'server-only'

import { NextResponse } from 'next/server'

import { getApiUser } from '@/lib/auth'
import { canManageContent } from '@/lib/permissions'
import { DatabaseNotConfiguredError, requirePrisma } from '@/lib/prisma'
import type { ApiResult } from '@/types'

/**
 * Small helpers so every admin route reads the same way and nobody has to
 * remember the order of the checks.
 */

export function jsonError(error: string, status: number, fieldErrors?: Record<string, string[]>) {
  return NextResponse.json<ApiResult>({ ok: false, error, ...(fieldErrors ? { fieldErrors } : {}) }, { status })
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json<ApiResult<T>>({ ok: true, data }, { status })
}

/** Resolves to the signed-in content manager, or the response to return instead. */
export async function requireContentApi() {
  const user = await getApiUser()
  if (!user) return { user: null, response: jsonError('Please sign in.', 401) } as const
  if (!canManageContent(user.role)) {
    return { user: null, response: jsonError('Only pastors and administrators can do that.', 403) } as const
  }
  return { user, response: null } as const
}

export async function readJson(request: Request) {
  try {
    return { body: await request.json(), response: null } as const
  } catch {
    return { body: null, response: jsonError('We could not read that request.', 400) } as const
  }
}

/** Turns the usual database failures into the right status code. */
export function databaseError(scope: string, error: unknown) {
  if (error instanceof DatabaseNotConfiguredError) {
    return jsonError('No database is connected yet.', 503)
  }
  console.error(`[${scope}]`, error)
  return jsonError('Something went wrong on our side. Please try again.', 500)
}

export { requirePrisma }
