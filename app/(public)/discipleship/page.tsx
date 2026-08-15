import { ArrowRight, BookOpen, CalendarDays, GraduationCap } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { PageHero } from '@/components/page-hero'
import { Button } from '@/components/ui/button'
import { getCourses } from '@/lib/discipleship'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Discipleship — Grow in Your Faith',
  description:
    'A free six-week course for new and growing Christians. Short, plain lessons on salvation, prayer, the Bible, faith, the Holy Spirit and sharing your story.',
  alternates: { canonical: '/discipleship' },
}

const difficultyLabels = {
  BEGINNER: 'Brand new to faith',
  INTERMEDIATE: 'Growing',
  ADVANCED: 'Going deeper',
} as const

export default async function DiscipleshipPage() {
  const courses = await getCourses()

  return (
    <>
      <PageHero
        eyebrow="Grow with us"
        title="Digital Discipleship"
        subtitle="Following Jesus is a walk, not a leap. These short lessons take you one honest step at a time — no Bible knowledge assumed, and no question too basic."
        photo="learning"
        crumbs={[{ href: '/', label: 'Home' }]}
      />

      <div className="container pb-20 pt-4">
        {courses.length === 0 ? (
          <p className="text-lg text-muted-foreground">
            No courses are published yet. Please check back soon.
          </p>
        ) : (
          <ul className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
            {courses.map((course) => {
              const firstLesson = course.weeks[0]?.lessons[0]

              return (
                <li key={course.slug}>
                  <article className="flex h-full flex-col rounded-3xl border-2 border-border bg-card p-7 shadow-soft transition-all hover:border-primary/30 hover:shadow-lifted sm:p-9">
                    <div className="flex items-start justify-between gap-4">
                      <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
                        <GraduationCap className="size-7" aria-hidden />
                      </span>
                      <span className="rounded-full bg-accent-soft px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-accent-ink">
                        {difficultyLabels[course.difficulty]}
                      </span>
                    </div>

                    <h2 className="mt-6 text-2xl sm:text-3xl">
                      <Link
                        href={`/discipleship/${course.slug}`}
                        className="rounded transition-colors hover:text-primary"
                      >
                        {course.title}
                      </Link>
                    </h2>

                    <p className="mt-3 flex-1 text-pretty text-muted-foreground">
                      {course.description}
                    </p>

                    <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 border-t border-border pt-6">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="size-5 text-accent-ink" aria-hidden />
                        <dt className="sr-only">Length</dt>
                        <dd className="font-semibold text-foreground">
                          {course.weeks.length} weeks
                        </dd>
                      </div>
                      <div className="flex items-center gap-2">
                        <BookOpen className="size-5 text-accent-ink" aria-hidden />
                        <dt className="sr-only">Lessons</dt>
                        <dd className="font-semibold text-foreground">
                          {course.lessonCount} lessons
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                      <Button asChild size="lg">
                        <Link href={`/discipleship/${course.slug}`}>
                          See the course
                          <ArrowRight aria-hidden />
                        </Link>
                      </Button>
                      {firstLesson && (
                        <Button asChild size="lg" variant="outline">
                          <Link href={`/discipleship/${course.slug}/lesson/${firstLesson.slug}`}>
                            Start lesson 1
                          </Link>
                        </Button>
                      )}
                    </div>
                  </article>
                </li>
              )
            })}
          </ul>
        )}

        <div className="mt-16 rounded-3xl border-2 border-border bg-secondary/40 p-7 sm:p-10">
          <h2 className="text-2xl sm:text-3xl">Just starting out?</h2>
          <p className="mt-4 max-w-2xl text-pretty text-muted-foreground">
            If you have not yet decided to follow Jesus — or you are not sure — that is a good place
            to begin. It takes about five minutes and costs nothing.
          </p>
          <Button asChild size="lg" className="mt-7">
            <Link href="/salvation">
              Start here instead
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </>
  )
}
