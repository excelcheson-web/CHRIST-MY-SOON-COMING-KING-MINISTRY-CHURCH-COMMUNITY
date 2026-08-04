import { NextResponse } from 'next/server'

import { getCourses } from '@/lib/discipleship'
import type { ApiResult } from '@/types'

export const revalidate = 300

/** GET /api/discipleship/courses — public course index (no lesson bodies). */
export async function GET() {
  const courses = await getCourses()

  const summaries = courses.map((course) => ({
    slug: course.slug,
    title: course.title,
    description: course.description,
    difficulty: course.difficulty,
    image: course.image,
    weekCount: course.weeks.length,
    lessonCount: course.lessonCount,
  }))

  return NextResponse.json<ApiResult<typeof summaries>>({ ok: true, data: summaries })
}
