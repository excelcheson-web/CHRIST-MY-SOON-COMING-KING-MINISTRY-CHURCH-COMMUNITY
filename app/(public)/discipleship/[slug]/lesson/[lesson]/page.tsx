import { ArrowLeft, BookMarked, HelpCircle } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { LessonComplete } from '@/components/discipleship/lesson-complete'
import { ProgressBar } from '@/components/discipleship/progress-bar'
import { Markdown } from '@/components/markdown'
import { findLesson, getCourse, getCourses } from '@/lib/discipleship'

export const revalidate = 3600

export async function generateStaticParams() {
  const courses = await getCourses()
  return courses.flatMap((course) =>
    course.weeks.flatMap((week) =>
      week.lessons.map((lesson) => ({ slug: course.slug, lesson: lesson.slug })),
    ),
  )
}

async function load(courseSlug: string, lessonSlug: string) {
  const course = await getCourse(courseSlug)
  if (!course) return null

  const found = findLesson(course, lessonSlug)
  if (!found) return null

  return { course, ...found }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string; lesson: string }
}): Promise<Metadata> {
  const data = await load(params.slug, params.lesson)
  if (!data) return { title: 'Lesson not found' }

  return {
    title: data.lesson.title,
    description: `${data.course.title} · Week ${data.lesson.weekNumber}: ${data.lesson.weekTitle}`,
    alternates: { canonical: `/discipleship/${params.slug}/lesson/${params.lesson}` },
  }
}

export default async function LessonPage({
  params,
}: {
  params: { slug: string; lesson: string }
}) {
  const data = await load(params.slug, params.lesson)
  if (!data) notFound()

  const { course, lesson, previous, next, position, total } = data

  return (
    <>
      <section className="relative overflow-hidden bg-royal-gradient text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-dot-grid opacity-[0.16]" />
          <div className="absolute -right-24 -top-32 size-96 rounded-full bg-accent/20 blur-3xl" />
        </div>

        <div className="container relative py-14 sm:py-16">
          <div className="mx-auto max-w-3xl">
            <nav aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-2 text-sm text-white/70">
                <li className="flex items-center gap-2">
                  <Link
                    href="/discipleship"
                    className="rounded font-semibold hover:text-white hover:underline"
                  >
                    Discipleship
                  </Link>
                  <span aria-hidden>/</span>
                </li>
                <li className="flex items-center gap-2">
                  <Link
                    href={`/discipleship/${course.slug}`}
                    className="rounded font-semibold hover:text-white hover:underline"
                  >
                    {course.title}
                  </Link>
                  <span aria-hidden>/</span>
                </li>
                <li className="flex items-center gap-2">
                  <Link
                    href={`/discipleship/${course.slug}/week/${lesson.weekNumber}`}
                    className="rounded font-semibold hover:text-white hover:underline"
                  >
                    Week {lesson.weekNumber}
                  </Link>
                </li>
              </ol>
            </nav>

            <p className="mt-8 text-sm font-bold uppercase tracking-[0.18em] text-accent">
              Week {lesson.weekNumber}: {lesson.weekTitle}
            </p>

            <h1 className="mt-3 font-display text-3xl font-extrabold leading-[1.12] sm:text-4xl lg:text-5xl">
              {lesson.title}
            </h1>

            <div className="mt-8 flex items-center gap-4">
              <ProgressBar
                percent={(position / total) * 100}
                tone="light"
                label={`Lesson ${position} of ${total} in this course`}
              />
              <p className="shrink-0 text-sm font-semibold text-white/80">
                {position} / {total}
              </p>
            </div>
          </div>
        </div>

        <div aria-hidden className="h-12 bg-gradient-to-b from-transparent to-background sm:h-16" />
      </section>

      <div className="container pb-20 pt-4">
        <div className="mx-auto max-w-3xl">
          <article>
            <Markdown>{lesson.content}</Markdown>
          </article>

          {lesson.bibleVerses.length > 0 && (
            <section aria-labelledby="verses" className="mt-14">
              <h2 id="verses" className="flex items-center gap-3 text-2xl">
                <BookMarked className="size-7 text-accent-ink" aria-hidden />
                Read it for yourself
              </h2>
              <ul className="mt-6 space-y-4">
                {lesson.bibleVerses.map((verse) => (
                  <li
                    key={verse}
                    className="rounded-r-2xl border-l-4 border-accent bg-accent-soft/60 py-5 pl-6 pr-5"
                  >
                    <p className="text-pretty font-display text-lg italic leading-relaxed text-foreground">
                      {verse}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {lesson.reflectionQuestions.length > 0 && (
            <section aria-labelledby="reflect" className="mt-14">
              <h2 id="reflect" className="flex items-center gap-3 text-2xl">
                <HelpCircle className="size-7 text-primary" aria-hidden />
                Think it over
              </h2>
              <p className="mt-3 text-muted-foreground">
                Sit with these for a moment. Writing your answers down helps more than you would
                expect.
              </p>
              <ol className="mt-6 space-y-4">
                {lesson.reflectionQuestions.map((question, index) => (
                  <li
                    key={question}
                    className="flex items-start gap-4 rounded-2xl border-2 border-border bg-card p-5 shadow-soft"
                  >
                    <span
                      aria-hidden
                      className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft font-display font-bold text-primary"
                    >
                      {index + 1}
                    </span>
                    <span className="text-pretty text-lg leading-relaxed text-foreground/90">
                      {question}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <div className="mt-14">
            <LessonComplete
              courseSlug={course.slug}
              lessonSlug={lesson.slug}
              nextHref={next ? `/discipleship/${course.slug}/lesson/${next.slug}` : null}
              nextTitle={next?.title ?? null}
            />
          </div>

          <nav aria-label="Lesson navigation" className="mt-8 flex flex-wrap gap-3">
            {previous ? (
              <Link
                href={`/discipleship/${course.slug}/lesson/${previous.slug}`}
                className="group flex min-h-12 items-center gap-2 rounded-xl px-4 font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <ArrowLeft
                  className="size-5 transition-transform group-hover:-translate-x-1 motion-reduce:transform-none"
                  aria-hidden
                />
                <span className="truncate">Previous: {previous.title}</span>
              </Link>
            ) : (
              <Link
                href={`/discipleship/${course.slug}`}
                className="flex min-h-12 items-center gap-2 rounded-xl px-4 font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <ArrowLeft className="size-5" aria-hidden />
                Course overview
              </Link>
            )}
          </nav>
        </div>
      </div>
    </>
  )
}
