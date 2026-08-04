import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PageHero } from '@/components/page-hero'
import { Button } from '@/components/ui/button'
import { getCourse, getCourses } from '@/lib/discipleship'

export const revalidate = 3600

export async function generateStaticParams() {
  const courses = await getCourses()
  return courses.flatMap((course) =>
    course.weeks.map((week) => ({ slug: course.slug, week: String(week.weekNumber) })),
  )
}

async function load(slug: string, weekParam: string) {
  const course = await getCourse(slug)
  if (!course) return null

  const weekNumber = Number(weekParam)
  if (!Number.isInteger(weekNumber)) return null

  const week = course.weeks.find((candidate) => candidate.weekNumber === weekNumber)
  if (!week) return null

  const index = course.weeks.indexOf(week)
  return {
    course,
    week,
    previous: index > 0 ? course.weeks[index - 1] : null,
    next: index < course.weeks.length - 1 ? course.weeks[index + 1] : null,
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string; week: string }
}): Promise<Metadata> {
  const data = await load(params.slug, params.week)
  if (!data) return { title: 'Week not found' }

  return {
    title: `Week ${data.week.weekNumber}: ${data.week.title}`,
    description: data.week.description,
    alternates: { canonical: `/discipleship/${params.slug}/week/${data.week.weekNumber}` },
  }
}

export default async function WeekPage({ params }: { params: { slug: string; week: string } }) {
  const data = await load(params.slug, params.week)
  if (!data) notFound()

  const { course, week, previous, next } = data

  return (
    <>
      <PageHero
        eyebrow={`${course.title} · Week ${week.weekNumber} of ${course.weeks.length}`}
        title={week.title}
        subtitle={week.description}
        crumbs={[
          { href: '/discipleship', label: 'Discipleship' },
          { href: `/discipleship/${course.slug}`, label: course.title },
        ]}
      />

      <div className="container pb-20 pt-4">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl sm:text-3xl">
            {week.lessons.length} {week.lessons.length === 1 ? 'lesson' : 'lessons'} this week
          </h2>

          <ol className="mt-8 space-y-4">
            {week.lessons.map((lesson) => (
              <li key={lesson.slug}>
                <Link
                  href={`/discipleship/${course.slug}/lesson/${lesson.slug}`}
                  className="group flex items-center gap-5 rounded-3xl border-2 border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lifted motion-reduce:hover:translate-y-0"
                >
                  <span
                    aria-hidden
                    className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary-soft font-display text-xl font-extrabold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground"
                  >
                    {lesson.order}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-xl font-bold text-foreground">
                      {lesson.title}
                    </span>
                    <span className="mt-1 flex items-center gap-2 text-muted-foreground">
                      <BookOpen className="size-4" aria-hidden />
                      {lesson.reflectionQuestions.length} reflection questions
                    </span>
                  </span>
                  <ArrowRight
                    className="size-6 shrink-0 text-primary transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ol>

          <nav aria-label="Other weeks" className="mt-14 grid gap-4 border-t border-border pt-10 sm:grid-cols-2">
            {previous ? (
              <Button asChild variant="outline" size="lg" className="justify-start">
                <Link href={`/discipleship/${course.slug}/week/${previous.weekNumber}`}>
                  <ArrowLeft aria-hidden />
                  <span className="truncate">Week {previous.weekNumber}: {previous.title}</span>
                </Link>
              </Button>
            ) : (
              <Button asChild variant="outline" size="lg" className="justify-start">
                <Link href={`/discipleship/${course.slug}`}>
                  <ArrowLeft aria-hidden />
                  Course overview
                </Link>
              </Button>
            )}

            {next && (
              <Button asChild variant="outline" size="lg" className="justify-end sm:col-start-2">
                <Link href={`/discipleship/${course.slug}/week/${next.weekNumber}`}>
                  <span className="truncate">Week {next.weekNumber}: {next.title}</span>
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            )}
          </nav>
        </div>
      </div>
    </>
  )
}
