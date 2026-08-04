import { GraduationCap } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { CourseManager, type AdminCourse } from '@/components/admin/course-manager'
import { Alert } from '@/components/ui/alert'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireContentManager } from '@/lib/auth'
import { getCourses } from '@/lib/discipleship'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Manage discipleship',
  robots: { index: false, follow: false },
}

export default async function AdminDiscipleshipPage() {
  await requireContentManager('/admin/discipleship')

  const bundled = await getCourses()

  if (!prisma) {
    return (
      <div className="container py-14 sm:py-20">
        <h1 className="text-3xl sm:text-4xl">Manage discipleship</h1>
        <Alert variant="info" className="mt-8">
          No database is connected. Visitors are reading the {bundled.length} bundled course
          {bundled.length === 1 ? '' : 's'} from <code>content/discipleship.ts</code>, which cannot be
          edited here. Add a <code>DATABASE_URL</code>, then run <code>npm run db:migrate</code> and{' '}
          <code>npm run db:seed</code> to switch on editing.
        </Alert>
      </div>
    )
  }

  const [records, enrolments, learners] = await Promise.all([
    prisma.discipleshipCourse.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: {
        weeks: {
          orderBy: { weekNumber: 'asc' },
          include: { lessons: { orderBy: { order: 'asc' } } },
        },
      },
    }),
    prisma.discipleshipProgress.groupBy({ by: ['courseId'], _count: { _all: true } }),
    prisma.discipleshipProgress.count(),
  ])

  const enrolledByCourse = new Map(enrolments.map((row) => [row.courseId, row._count._all]))

  const courses: AdminCourse[] = records.map((record) => ({
    id: record.id,
    slug: record.slug,
    title: record.title,
    description: record.description,
    difficulty: record.difficulty,
    order: record.order,
    isActive: record.isActive,
    enrolled: enrolledByCourse.get(record.id) ?? 0,
    weeks: record.weeks.map((week) => ({
      id: week.id,
      weekNumber: week.weekNumber,
      title: week.title,
      description: week.description,
      lessons: week.lessons.map((lesson) => ({
        id: lesson.id,
        slug: lesson.slug,
        order: lesson.order,
        title: lesson.title,
        content: lesson.content,
        bibleVerses: lesson.bibleVerses,
        reflectionQuestions: lesson.reflectionQuestions,
        videoUrl: lesson.videoUrl,
        audioUrl: lesson.audioUrl,
      })),
    })),
  }))

  const totalLessons = courses.reduce(
    (sum, course) => sum + course.weeks.reduce((weekSum, week) => weekSum + week.lessons.length, 0),
    0,
  )

  return (
    <div className="container py-14 sm:py-20">
      <div className="flex items-center gap-4">
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-royal-gradient text-primary-foreground">
          <GraduationCap className="size-8" aria-hidden />
        </span>
        <div>
          <p className="font-display text-sm font-bold uppercase tracking-[0.16em] text-primary">
            Curriculum
          </p>
          <h1 className="mt-1 text-3xl sm:text-4xl">Manage discipleship</h1>
        </div>
      </div>

      {courses.length === 0 && (
        <Alert variant="info" className="mt-8">
          The database has no courses yet, so visitors are seeing the bundled curriculum. Run{' '}
          <code>npm run db:seed</code> to import it, or create a course below.
        </Alert>
      )}

      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="font-semibold">Courses</CardDescription>
            <CardTitle className="text-4xl">{courses.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="font-semibold">Lessons</CardDescription>
            <CardTitle className="text-4xl">{totalLessons}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="font-semibold">People learning</CardDescription>
            <CardTitle className="text-4xl">{learners}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <p className="mt-8 max-w-2xl text-pretty text-muted-foreground">
        Changes here appear on{' '}
        <Link href="/discipleship" className="font-semibold text-primary hover:underline">
          /discipleship
        </Link>{' '}
        straight away. Lesson URLs are fixed when a lesson is created and do not change when you edit
        the title, so links people have saved keep working.
      </p>

      <div className="mt-10">
        <CourseManager courses={courses} />
      </div>
    </div>
  )
}
