import 'server-only'

import { cache } from 'react'

import { staticCourses, staticCoursesBySlug } from '@/content/discipleship'
import { prisma } from '@/lib/prisma'

/**
 * Course content resolves database-first with a bundled fallback, exactly like
 * `lib/page-content.ts`. Anyone can read every lesson with no database at all —
 * only *progress* needs one, because progress needs somewhere to be remembered.
 *
 * Lessons are keyed by slug throughout (not id), so the same URLs and the same
 * progress records work whether the content came from Postgres or from
 * `content/discipleship.ts`.
 */

export type ResolvedLesson = {
  slug: string
  order: number
  title: string
  content: string
  bibleVerses: string[]
  reflectionQuestions: string[]
  videoUrl: string | null
  audioUrl: string | null
  weekNumber: number
  weekTitle: string
}

export type ResolvedWeek = {
  weekNumber: number
  title: string
  description: string
  lessons: ResolvedLesson[]
}

export type ResolvedCourse = {
  id: string | null
  slug: string
  title: string
  description: string
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  image: string | null
  weeks: ResolvedWeek[]
  lessonCount: number
  source: 'database' | 'bundled'
}

function fromStatic(slug: string): ResolvedCourse | null {
  const course = staticCoursesBySlug[slug]
  if (!course) return null

  const weeks: ResolvedWeek[] = course.weeks.map((week) => ({
    weekNumber: week.weekNumber,
    title: week.title,
    description: week.description,
    lessons: week.lessons.map((lesson) => ({
      slug: lesson.slug,
      order: lesson.order,
      title: lesson.title,
      content: lesson.content,
      bibleVerses: lesson.bibleVerses,
      reflectionQuestions: lesson.reflectionQuestions,
      videoUrl: null,
      audioUrl: null,
      weekNumber: week.weekNumber,
      weekTitle: week.title,
    })),
  }))

  return {
    id: null,
    slug: course.slug,
    title: course.title,
    description: course.description,
    difficulty: course.difficulty,
    image: null,
    weeks,
    lessonCount: weeks.reduce((total, week) => total + week.lessons.length, 0),
    source: 'bundled',
  }
}

function allFromStatic(): ResolvedCourse[] {
  return staticCourses
    .map((course) => fromStatic(course.slug))
    .filter((course): course is ResolvedCourse => course !== null)
}

export const getCourses = cache(async (): Promise<ResolvedCourse[]> => {
  if (!prisma) return allFromStatic()

  try {
    const records = await prisma.discipleshipCourse.findMany({
      where: { isActive: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: {
        weeks: {
          orderBy: { weekNumber: 'asc' },
          include: { lessons: { orderBy: { order: 'asc' } } },
        },
      },
    })

    if (records.length === 0) return allFromStatic()

    return records.map((record) => {
      const weeks: ResolvedWeek[] = record.weeks.map((week) => ({
        weekNumber: week.weekNumber,
        title: week.title,
        description: week.description ?? '',
        lessons: week.lessons.map((lesson) => ({
          slug: lesson.slug,
          order: lesson.order,
          title: lesson.title,
          content: lesson.content,
          bibleVerses: lesson.bibleVerses,
          reflectionQuestions: lesson.reflectionQuestions,
          videoUrl: lesson.videoUrl,
          audioUrl: lesson.audioUrl,
          weekNumber: week.weekNumber,
          weekTitle: week.title,
        })),
      }))

      return {
        id: record.id,
        slug: record.slug,
        title: record.title,
        description: record.description ?? '',
        difficulty: record.difficulty,
        image: record.image,
        weeks,
        lessonCount: weeks.reduce((total, week) => total + week.lessons.length, 0),
        source: 'database' as const,
      }
    })
  } catch (error) {
    console.error('[discipleship] falling back to bundled courses:', error)
    return allFromStatic()
  }
})

export const getCourse = cache(async (slug: string): Promise<ResolvedCourse | null> => {
  const courses = await getCourses()
  return courses.find((course) => course.slug === slug) ?? fromStatic(slug)
})

/** Flat, ordered lesson list — the reading order used for prev/next links. */
export function flattenLessons(course: ResolvedCourse): ResolvedLesson[] {
  return course.weeks.flatMap((week) => week.lessons)
}

export function findLesson(course: ResolvedCourse, lessonSlug: string) {
  const lessons = flattenLessons(course)
  const index = lessons.findIndex((lesson) => lesson.slug === lessonSlug)
  if (index === -1) return null

  return {
    lesson: lessons[index],
    previous: index > 0 ? lessons[index - 1] : null,
    next: index < lessons.length - 1 ? lessons[index + 1] : null,
    position: index + 1,
    total: lessons.length,
  }
}

export type CourseProgress = {
  completedLessons: string[]
  completedCount: number
  percent: number
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED'
  /** First unfinished lesson in reading order — the "continue" target. */
  nextLesson: ResolvedLesson | null
  startedAt: Date | null
  completedAt: Date | null
}

export function emptyProgress(course: ResolvedCourse): CourseProgress {
  return {
    completedLessons: [],
    completedCount: 0,
    percent: 0,
    status: 'NOT_STARTED',
    nextLesson: flattenLessons(course)[0] ?? null,
    startedAt: null,
    completedAt: null,
  }
}

/**
 * A signed-out visitor, or a database-less deployment, simply gets empty
 * progress — the lessons still read perfectly, nothing is tracked.
 */
export async function getProgress(
  userId: string | undefined,
  course: ResolvedCourse,
): Promise<CourseProgress> {
  if (!userId || !prisma || !course.id) return emptyProgress(course)

  try {
    const record = await prisma.discipleshipProgress.findUnique({
      where: { userId_courseId: { userId, courseId: course.id } },
    })
    if (!record) return emptyProgress(course)

    return summarise(course, record.completedLessons, record.status, record.startedAt, record.completedAt)
  } catch (error) {
    console.error('[discipleship] could not read progress:', error)
    return emptyProgress(course)
  }
}

export function summarise(
  course: ResolvedCourse,
  completedLessons: string[],
  status: CourseProgress['status'],
  startedAt: Date | null,
  completedAt: Date | null,
): CourseProgress {
  const lessons = flattenLessons(course)
  const done = new Set(completedLessons)
  // Count only slugs that still exist, so a removed lesson cannot push a
  // course past 100%.
  const completedCount = lessons.filter((lesson) => done.has(lesson.slug)).length

  return {
    completedLessons,
    completedCount,
    percent: lessons.length === 0 ? 0 : Math.round((completedCount / lessons.length) * 100),
    status,
    nextLesson: lessons.find((lesson) => !done.has(lesson.slug)) ?? null,
    startedAt,
    completedAt,
  }
}
