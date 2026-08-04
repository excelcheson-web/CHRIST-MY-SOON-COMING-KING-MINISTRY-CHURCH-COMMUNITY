import { BookOpen, ChevronRight } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { ProgressPanel, ProgressPanelSkeleton } from '@/components/discipleship/progress-panel'
import { getCourse, getCourses } from '@/lib/discipleship'

export const revalidate = 3600

export async function generateStaticParams() {
  const courses = await getCourses()
  return courses.map((course) => ({ slug: course.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const course = await getCourse(params.slug)
  if (!course) return { title: 'Course not found' }

  return {
    title: course.title,
    description: course.description,
    alternates: { canonical: `/discipleship/${course.slug}` },
    openGraph: { title: course.title, description: course.description },
  }
}

export default async function CoursePage({ params }: { params: { slug: string } }) {
  const course = await getCourse(params.slug)
  if (!course) notFound()

  const firstLesson = course.weeks[0]?.lessons[0] ?? null

  return (
    <>
      <section className="relative overflow-hidden bg-royal-gradient text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-dot-grid opacity-[0.16]" />
          <div className="absolute -right-24 -top-32 size-96 rounded-full bg-accent/20 blur-3xl" />
        </div>

        <div className="container relative py-16 sm:py-20">
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex flex-wrap items-center gap-2 text-sm text-white/70">
              <li className="flex items-center gap-2">
                <Link href="/" className="rounded font-semibold hover:text-white hover:underline">
                  Home
                </Link>
                <span aria-hidden>/</span>
              </li>
              <li className="flex items-center gap-2">
                <Link
                  href="/discipleship"
                  className="rounded font-semibold hover:text-white hover:underline"
                >
                  Discipleship
                </Link>
                <span aria-hidden>/</span>
              </li>
              <li aria-current="page" className="font-semibold text-white">
                {course.title}
              </li>
            </ol>
          </nav>

          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-accent">
                {course.weeks.length}-week course · {course.lessonCount} lessons
              </p>
              <h1 className="mt-3 font-display text-4xl font-extrabold leading-[1.1] sm:text-5xl">
                {course.title}
              </h1>
              <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-white/85">
                {course.description}
              </p>
            </div>

            <Suspense fallback={<ProgressPanelSkeleton />}>
              <ProgressPanel
                courseSlug={course.slug}
                lessonCount={course.lessonCount}
                firstLessonSlug={firstLesson?.slug ?? null}
              />
            </Suspense>
          </div>
        </div>

        <div aria-hidden className="h-12 bg-gradient-to-b from-transparent to-background sm:h-16" />
      </section>

      <div className="container pb-20 pt-4">
        <h2 className="text-2xl sm:text-3xl">What you will cover</h2>

        <ol className="mt-8 space-y-5">
          {course.weeks.map((week) => (
            <li key={week.weekNumber}>
              <article className="rounded-3xl border-2 border-border bg-card p-6 shadow-soft sm:p-8">
                <div className="flex flex-wrap items-start gap-4">
                  <span
                    aria-hidden
                    className="grid size-14 shrink-0 place-items-center rounded-2xl bg-royal-gradient font-display text-xl font-extrabold text-primary-foreground"
                  >
                    {week.weekNumber}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xl sm:text-2xl">
                      <Link
                        href={`/discipleship/${course.slug}/week/${week.weekNumber}`}
                        className="rounded transition-colors hover:text-primary"
                      >
                        <span className="sr-only">Week {week.weekNumber}: </span>
                        {week.title}
                      </Link>
                    </h3>
                    <p className="mt-2 text-pretty text-muted-foreground">{week.description}</p>
                  </div>
                </div>

                <ul className="mt-6 divide-y divide-border border-t border-border">
                  {week.lessons.map((lesson) => (
                    <li key={lesson.slug}>
                      <Link
                        href={`/discipleship/${course.slug}/lesson/${lesson.slug}`}
                        className="group flex min-h-14 items-center gap-3 py-3 transition-colors hover:text-primary"
                      >
                        <BookOpen className="size-5 shrink-0 text-accent-ink" aria-hidden />
                        <span className="min-w-0 flex-1 font-semibold text-foreground group-hover:text-primary">
                          {lesson.title}
                        </span>
                        <ChevronRight
                          className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </article>
            </li>
          ))}
        </ol>
      </div>
    </>
  )
}
