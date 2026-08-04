'use client'

import { ArrowRight, Check, Loader2, LogIn } from 'lucide-react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import type { ApiResult } from '@/types'

type Progress = { completedLessons: string[]; percent: number }

/**
 * "Mark this lesson complete" — optimistic, so the tick is instant, and it
 * rolls back with a visible message if the save actually failed.
 */
export function LessonComplete({
  courseSlug,
  lessonSlug,
  nextHref,
  nextTitle,
}: {
  courseSlug: string
  lessonSlug: string
  nextHref: string | null
  nextTitle: string | null
}) {
  const { status: authStatus } = useSession()
  const pathname = usePathname()
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        if (!cancelled && result.ok) setDone(result.data.completedLessons.includes(lessonSlug))
      })
      .catch(() => null)
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [authStatus, courseSlug, lessonSlug])

  async function toggle() {
    const target = !done
    setDone(target) // optimistic
    setSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/discipleship/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseSlug, lessonSlug, completed: target }),
      })
      const result = (await response.json()) as ApiResult<Progress>

      if (!response.ok || !result.ok) {
        setDone(!target) // roll back
        setError(result.ok ? 'Could not save that.' : result.error)
      }
    } catch {
      setDone(!target)
      setError('We could not reach the server. Your progress was not saved.')
    } finally {
      setSaving(false)
    }
  }

  if (authStatus !== 'authenticated') {
    return (
      <div className="rounded-3xl border-2 border-border bg-secondary/40 p-6 sm:p-8">
        <p className="text-pretty text-foreground/90">
          Sign in to tick this lesson off and pick up where you left off next time. Reading does not
          require an account.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href={`/login?callbackUrl=${encodeURIComponent(pathname)}`}>
              <LogIn aria-hidden />
              Sign in to save progress
            </Link>
          </Button>
          {nextHref && (
            <Button asChild variant="outline">
              <Link href={nextHref}>
                Next lesson
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-3xl border-2 border-border bg-card p-6 shadow-soft sm:p-8">
      {error && (
        <Alert variant="error" className="mb-5">
          {error}
        </Alert>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button
          onClick={toggle}
          disabled={loading || saving}
          size="lg"
          variant={done ? 'outline' : 'default'}
          aria-pressed={done}
          className="sm:flex-1"
        >
          {saving || loading ? (
            <Loader2 className="animate-spin" aria-hidden />
          ) : (
            <Check aria-hidden />
          )}
          {done ? 'Completed — tap to undo' : 'Mark this lesson complete'}
        </Button>

        {nextHref && (
          <Button asChild size="lg" variant={done ? 'default' : 'outline'} className="sm:flex-1">
            <Link href={nextHref}>
              <span className="truncate">{nextTitle ? `Next: ${nextTitle}` : 'Next lesson'}</span>
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}
