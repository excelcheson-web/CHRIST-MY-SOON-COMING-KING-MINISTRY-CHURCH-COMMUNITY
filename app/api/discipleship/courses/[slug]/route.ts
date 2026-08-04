import { NextResponse } from 'next/server'

import { getCourse } from '@/lib/discipleship'
import type { ApiResult } from '@/types'

export const revalidate = 300

/** GET /api/discipleship/courses/[slug] — full course with weeks and lessons. */
export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const course = await getCourse(params.slug)

  if (!course) {
    return NextResponse.json<ApiResult>({ ok: false, error: 'Course not found.' }, { status: 404 })
  }

  return NextResponse.json<ApiResult<typeof course>>({ ok: true, data: course })
}
