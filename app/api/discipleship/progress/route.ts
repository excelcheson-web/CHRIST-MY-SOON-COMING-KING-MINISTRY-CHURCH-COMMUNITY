import { CourseStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

import { getApiUser } from '@/lib/auth'
import {
  flattenLessons,
  getCourse,
  getProgress,
  summarise,
  type CourseProgress,
} from '@/lib/discipleship'
import { DatabaseNotConfiguredError, requirePrisma } from '@/lib/prisma'
import { progressSchema } from '@/lib/validations'
import type { ApiResult } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NEEDS_SEED =
  'The curriculum has not been loaded into the database yet. Run "npm run db:seed" to switch on progress tracking.'

/** GET /api/discipleship/progress?courseSlug=first-steps */
export async function GET(request: Request) {
  const user = await getApiUser()
  if (!user) return NextResponse.json<ApiResult>({ ok: false, error: 'Please sign in.' }, { status: 401 })

  const courseSlug = new URL(request.url).searchParams.get('courseSlug')
  if (!courseSlug) {
    return NextResponse.json<ApiResult>({ ok: false, error: 'courseSlug is required.' }, { status: 400 })
  }

  const course = await getCourse(courseSlug)
  if (!course) {
    return NextResponse.json<ApiResult>({ ok: false, error: 'Course not found.' }, { status: 404 })
  }

  const progress = await getProgress(user.id, course)

  return NextResponse.json<ApiResult<CourseProgress>>({ ok: true, data: progress })
}

/**
 * POST /api/discipleship/progress — mark a lesson complete or undo it.
 *
 * Progress is stored by lesson *slug*, so re-seeding the curriculum never
 * orphans somebody's six weeks of work.
 */
export async function POST(request: Request) {
  const user = await getApiUser()
  if (!user) return NextResponse.json<ApiResult>({ ok: false, error: 'Please sign in.' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json<ApiResult>({ ok: false, error: 'Invalid request.' }, { status: 400 })
  }

  const parsed = progressSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json<ApiResult>({ ok: false, error: 'Invalid request.' }, { status: 422 })
  }

  const { courseSlug, lessonSlug, completed } = parsed.data

  const course = await getCourse(courseSlug)
  if (!course) {
    return NextResponse.json<ApiResult>({ ok: false, error: 'Course not found.' }, { status: 404 })
  }

  const lessons = flattenLessons(course)
  if (!lessons.some((lesson) => lesson.slug === lessonSlug)) {
    return NextResponse.json<ApiResult>({ ok: false, error: 'Lesson not found.' }, { status: 404 })
  }

  // Bundled content has no database row to hang progress from.
  if (!course.id) {
    return NextResponse.json<ApiResult>({ ok: false, error: NEEDS_SEED }, { status: 503 })
  }

  try {
    const prisma = requirePrisma()
    const courseId = course.id

    const existing = await prisma.discipleshipProgress.findUnique({
      where: { userId_courseId: { userId: user.id, courseId } },
      select: { completedLessons: true },
    })

    const done = new Set(existing?.completedLessons ?? [])
    if (completed) done.add(lessonSlug)
    else done.delete(lessonSlug)

    // Keep only slugs that still exist, so a retired lesson cannot strand
    // someone at 96% forever.
    const validSlugs = new Set(lessons.map((lesson) => lesson.slug))
    const completedLessons = [...done].filter((slug) => validSlugs.has(slug))

    const nextLesson = lessons.find((lesson) => !completedLessons.includes(lesson.slug))
    const allDone = nextLesson === undefined

    const record = await prisma.discipleshipProgress.upsert({
      where: { userId_courseId: { userId: user.id, courseId } },
      update: {
        completedLessons,
        currentWeek: nextLesson?.weekNumber ?? course.weeks.at(-1)?.weekNumber ?? 1,
        currentLesson: nextLesson?.order ?? 0,
        status: allDone ? CourseStatus.COMPLETED : CourseStatus.IN_PROGRESS,
        completedAt: allDone ? new Date() : null,
      },
      create: {
        userId: user.id,
        courseId,
        completedLessons,
        currentWeek: nextLesson?.weekNumber ?? 1,
        currentLesson: nextLesson?.order ?? 0,
        status: allDone ? CourseStatus.COMPLETED : CourseStatus.IN_PROGRESS,
        completedAt: allDone ? new Date() : null,
      },
    })

    revalidatePath('/discipleship')
    revalidatePath(`/discipleship/${courseSlug}`)

    return NextResponse.json<ApiResult<CourseProgress>>({
      ok: true,
      data: summarise(course, record.completedLessons, record.status, record.startedAt, record.completedAt),
    })
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json<ApiResult>({ ok: false, error: NEEDS_SEED }, { status: 503 })
    }
    console.error('[discipleship/progress]', error)
    return NextResponse.json<ApiResult>(
      { ok: false, error: 'Could not save your progress. Please try again.' },
      { status: 500 },
    )
  }
}
