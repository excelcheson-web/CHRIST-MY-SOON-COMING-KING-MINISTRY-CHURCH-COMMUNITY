'use client'

import { ArrowRight, Loader2, LogIn, Trophy } from 'lucide-react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import { ProgressBar } from '@/components/discipleship/progress-bar'
import { Button } from '@/components/ui/button'
import type { ApiResult } from '@/types'

type Progress = {
  completedCount: number
  percent: number
  status: string
  nextLesson: { slug: string; title: string; weekNumber: number } | null
}

/**
 * Lives on the client so the course pages themselves stay statically rendered —
 * the lesson content is the same for everyone, only the progress bar is not.
 */
export function ProgressPanel({
  courseSlug,
  lessonCount,
  firstLessonSlug,
}: {
  courseSlug: string
  lessonCount: number
  firstLessonSlug: string | null
}) {
  const { status: authStatus } = useSession()
  const [progress, setProgress] = useState<Progress | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authStatus === 'loading') return
    if (authStatus !== 'authenticated') {
      setLoading(false)
      return
    }

    let cancelled = false
    fetch(`/api/discipleship/progress?courseSlug=${encodeURIComponent(courseSlug)}`)
      .then((response) => response.json() as Promise<ApiResult<Progress>>)
      .then((result) => {
        if (!cancelled && result.ok) setProgress(result.data)
      })
      .catch(() => null)
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [authStatus, courseSlug])

  if (authStatus === 'loading' || loading) {
    return <div aria-hidden className="h-32 animate-pulse rounded-3xl bg-white/10" />
  }

  if (authStatus !== 'authenticated') {
    return (
      <div className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur">
        <p className="text-pretty text-white/85">
          Create a free account and we will remember exactly where you got to.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="accent">
            <Link href={`/login?callbackUrl=${encodeURIComponent(`/discipleship/${courseSlug}`)}`}>
              <LogIn aria-hidden />
              Sign in to track progress
            </Link>
          </Button>
          {firstLessonSlug && (
            <Button
              asChild
              variant="outline"
              className="border-white/35 bg-white/10 text-white hover:border-white/60 hover:bg-white/20"
            >
              <Link href={`/discipleship/${courseSlug}/lesson/${firstLessonSlug}`}>
                Read without signing in
              </Link>
            </Button>
          )}
        </div>
      </div>
    )
  }

  const completed = progress?.completedCount ?? 0
  const percent = progress?.percent ?? 0
  const next = progress?.nextLesson ?? null
  const finished = percent === 100

  return (
    <div className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-lg font-bold text-white">
          {finished ? 'Course complete' : 'Your progress'}
        </p>
        <p className="font-display text-lg font-bold text-accent">
          {completed} of {lessonCount} lessons
        </p>
      </div>

      <ProgressBar
        percent={percent}
        tone="light"
        className="mt-4"
        label={`Course progress: ${percent}% complete`}
      />

      {finished ? (
        <p className="mt-5 flex items-center gap-2 text-pretty text-white/85">
          <Trophy className="size-5 shrink-0 text-accent" aria-hidden />
          You have finished every lesson. Well done — now go and pass it on.
        </p>
      ) : (
        next && (
          <Button asChild variant="accent" className="mt-5">
            <Link href={`/discipleship/${courseSlug}/lesson/${next.slug}`}>
              {completed === 0 ? 'Start lesson 1' : 'Continue'}: {next.title}
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        )
      )}
    </div>
  )
}

/** Shown while the panel decides what to render. */
export function ProgressPanelSkeleton() {
  return (
    <div aria-hidden className="flex h-32 items-center justify-center rounded-3xl bg-white/10">
      <Loader2 className="size-6 animate-spin text-white/60" />
    </div>
  )
}
