import { MessageCircleQuestion } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { Alert } from '@/components/ui/alert'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { aiConfig } from '@/lib/ai'
import { requireUser } from '@/lib/auth'
import { canManageContent } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'What people are asking',
  robots: { index: false, follow: false },
}

/**
 * The questions people put to the sermons.
 *
 * This exists because it is pastorally useful, not because it is analytics.
 * "What did he say about forgiveness?" asked eleven times is next month's
 * sermon series. A question nobody could get an answer to is a gap in the
 * teaching, and it is right here in the church's own words.
 */
export default async function AdminQuestionsPage() {
  const user = await requireUser('/admin/questions')
  if (!canManageContent(user.role)) redirect('/dashboard?denied=questions')

  const config = aiConfig()

  if (!prisma) {
    return (
      <div className="container py-14 sm:py-20">
        <h1 className="text-3xl sm:text-4xl">What people are asking</h1>
        <Alert variant="info" className="mt-8">
          No database is connected yet.
        </Alert>
      </div>
    )
  }

  const questions = await prisma.sermonQuestion.findMany({
    orderBy: [{ askCount: 'desc' }, { updatedAt: 'desc' }],
    take: 100,
    include: { sermon: { select: { slug: true, title: true } } },
  })

  const totalAsks = questions.reduce((sum, row) => sum + row.askCount, 0)
  const unanswered = questions.filter((row) => !row.answer).length

  return (
    <div className="container py-14 sm:py-20">
      <div className="flex items-center gap-4">
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-royal-gradient text-primary-foreground">
          <MessageCircleQuestion className="size-8" aria-hidden />
        </span>
        <div>
          <p className="font-display text-sm font-bold uppercase tracking-[0.16em] text-primary">
            Sermon Centre
          </p>
          <h1 className="mt-1 text-3xl sm:text-4xl">What people are asking</h1>
        </div>
      </div>

      <Alert variant={config.ready ? 'success' : 'info'} className="mt-8">
        {config.ready ? (
          <>
            <strong>{config.label}</strong> is switched on
            {config.model && <> — model <code>{config.model}</code></>}.
            {config.private ? (
              <> Questions and extracts stay on your own machine.</>
            ) : (
              <>
                {' '}
                Only <strong>published sermon transcripts</strong> are ever sent — never prayer
                requests, care requests, chat or members-only posts.
              </>
            )}
          </>
        ) : (
          <>
            <strong>No AI is configured</strong>, and everything still works: people get the parts
            of the sermon that match their question, in the preacher&rsquo;s own words. To add a
            free written summary on top, set <code>AI_PROVIDER</code> and a key — see the README.
          </>
        )}
      </Alert>

      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="font-semibold">Distinct questions</CardDescription>
            <CardTitle className="text-4xl">{questions.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="font-semibold">Times asked</CardDescription>
            <CardTitle className="text-4xl">{totalAsks}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="font-semibold">Search-only answers</CardDescription>
            <CardTitle className="text-4xl">{unanswered}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {questions.length === 0 ? (
        <div className="mt-12 rounded-3xl border-2 border-dashed border-border bg-secondary/40 p-12 text-center">
          <MessageCircleQuestion className="mx-auto size-10 text-muted-foreground" aria-hidden />
          <p className="mt-4 font-display text-lg font-bold text-foreground">
            Nobody has asked anything yet
          </p>
          <p className="mx-auto mt-2 max-w-md text-pretty text-muted-foreground">
            The box appears on any sermon with a transcript or notes. Add a transcript to one and
            questions will start arriving here.
          </p>
        </div>
      ) : (
        <ul className="mt-12 space-y-4">
          {questions.map((row) => (
            <li key={row.id}>
              <article className="rounded-3xl border-2 border-border bg-card p-6 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-display text-lg font-bold text-foreground">
                      “{row.question}”
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      <Link
                        href={`/sermons/${row.sermon.slug}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {row.sermon.title}
                      </Link>
                      {' · '}
                      asked {row.askCount} {row.askCount === 1 ? 'time' : 'times'}
                    </p>
                  </div>

                  {row.askCount >= 3 && (
                    <span className="shrink-0 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-accent-ink">
                      Asked a lot
                    </span>
                  )}
                </div>

                {row.answer ? (
                  <p className="mt-4 whitespace-pre-wrap text-pretty rounded-2xl bg-secondary/50 p-4 text-sm text-muted-foreground">
                    {row.answer}
                  </p>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Answered with matching extracts from the sermon.
                  </p>
                )}
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
