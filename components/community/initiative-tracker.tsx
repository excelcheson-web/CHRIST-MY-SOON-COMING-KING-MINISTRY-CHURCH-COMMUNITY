'use client'

import { Check, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Alert } from '@/components/ui/alert'
import type { ApiResult } from '@/types'
import type { InitiativeKind } from '@prisma/client'
import { cn } from '@/lib/utils'

export type TrackerDay = { dayNumber: number; reference: string; title: string | null }

/**
 * Join an initiative, and tick off the days.
 *
 * Logging a day implies joining — nobody should have to press two buttons to
 * say they read this morning.
 */
export function InitiativeTracker({
  slug,
  kind,
  verbs,
  days,
  totalDays,
  today,
  joined,
  loggedDays,
  status,
  signedIn,
}: {
  slug: string
  kind: InitiativeKind
  verbs: { join: string; joined: string; log: string }
  days: TrackerDay[]
  totalDays: number
  today: number
  joined: boolean
  loggedDays: number[]
  status: 'upcoming' | 'running' | 'finished'
  signedIn: boolean
}) {
  const router = useRouter()
  const [isJoined, setIsJoined] = useState(joined)
  const [logged, setLogged] = useState(new Set(loggedDays))
  const [busy, setBusy] = useState<number | 'join' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [noteFor, setNoteFor] = useState<number | null>(null)

  async function join() {
    if (!signedIn) {
      setError('Please sign in to take part.')
      return
    }
    setBusy('join')
    try {
      const response = await fetch(`/api/community/initiatives/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: isJoined ? 'leave' : 'join' }),
      })
      const result = (await response.json()) as ApiResult<{ joined: boolean }>
      if (result.ok) {
        setIsJoined(result.data.joined)
        router.refresh()
      }
    } finally {
      setBusy(null)
    }
  }

  async function log(dayNumber: number) {
    if (!signedIn) {
      setError('Please sign in to take part.')
      return
    }

    setBusy(dayNumber)
    setError(null)

    try {
      const response = await fetch(`/api/community/initiatives/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'log',
          dayNumber,
          note: noteFor === dayNumber ? note : undefined,
        }),
      })
      const result = (await response.json()) as ApiResult<{ logged: number; completed: boolean }>

      if (!response.ok || !result.ok) {
        setError(result.ok ? 'Something went wrong.' : result.error)
        return
      }

      setLogged((current) => new Set(current).add(dayNumber))
      setIsJoined(true)
      setNote('')
      setNoteFor(null)
      router.refresh()
    } catch {
      setError('We could not reach the server.')
    } finally {
      setBusy(null)
    }
  }

  const done = logged.size
  const percent = totalDays > 0 ? Math.round((done / totalDays) * 100) : 0

  // Fall back to plain numbered days when there are no readings listed — a fast
  // usually has none, and it should still be tickable.
  const rows: TrackerDay[] =
    days.length > 0
      ? days
      : Array.from({ length: totalDays }, (_, index) => ({
          dayNumber: index + 1,
          reference: `Day ${index + 1}`,
          title: null,
        }))

  return (
    <div>
      {error && (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      )}

      <div className="rounded-3xl border-2 border-border bg-card p-6 shadow-soft sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-display text-lg font-bold text-foreground">
              {isJoined ? verbs.joined : 'Take part'}
            </p>
            {isJoined && (
              <p className="mt-1 text-muted-foreground">
                {done} of {totalDays} {totalDays === 1 ? 'day' : 'days'} logged
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={join}
            disabled={busy === 'join' || status === 'finished'}
            className={cn(
              'flex min-h-12 items-center gap-2 rounded-xl px-6 font-display font-semibold transition-colors disabled:opacity-60',
              isJoined
                ? 'border-2 border-border text-muted-foreground hover:text-foreground'
                : 'bg-primary text-primary-foreground hover:bg-primary/90',
            )}
          >
            {busy === 'join' && <Loader2 className="size-5 animate-spin" aria-hidden />}
            {isJoined ? 'Step out' : verbs.join}
          </button>
        </div>

        {isJoined && (
          <div className="mt-5">
            <div
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Your progress"
              className="h-3 overflow-hidden rounded-full bg-secondary"
            >
              <div
                className="h-full rounded-full bg-accent-gradient transition-[width] duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <h2 className="mt-12 text-2xl sm:text-3xl">
        {kind === 'READING_PLAN' ? 'The plan' : kind === 'FAST' ? 'The days' : 'The challenge'}
      </h2>

      <ul className="mt-6 space-y-3">
        {rows.map((day) => {
          const isDone = logged.has(day.dayNumber)
          const isToday = day.dayNumber === today && status === 'running'
          const isFuture = status === 'running' && day.dayNumber > today

          return (
            <li key={day.dayNumber}>
              <div
                className={cn(
                  'rounded-2xl border-2 p-5 transition-colors',
                  isDone
                    ? 'border-success/35 bg-success/5'
                    : isToday
                      ? 'border-primary/35 bg-primary-soft/40'
                      : 'border-border bg-card',
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-display font-bold text-foreground">
                      <span className="text-muted-foreground">Day {day.dayNumber}</span>
                      {isToday && (
                        <span className="ml-2 rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-primary-foreground">
                          Today
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-pretty text-foreground">
                      {day.title ? `${day.title} — ` : ''}
                      {day.reference}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => (noteFor === day.dayNumber ? log(day.dayNumber) : setNoteFor(day.dayNumber))}
                    disabled={busy === day.dayNumber || isFuture}
                    className={cn(
                      'flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 font-semibold transition-colors disabled:opacity-40',
                      isDone
                        ? 'bg-success/15 text-success'
                        : 'border-2 border-primary/25 text-primary hover:bg-primary-soft',
                    )}
                  >
                    {busy === day.dayNumber ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <Check className="size-4" aria-hidden />
                    )}
                    {isDone ? 'Done' : noteFor === day.dayNumber ? 'Save' : verbs.log}
                  </button>
                </div>

                {noteFor === day.dayNumber && (
                  <div className="mt-4">
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-semibold text-muted-foreground">
                        Anything God said? (optional)
                      </span>
                      <textarea
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        rows={2}
                        maxLength={2000}
                        className="w-full rounded-xl border-2 border-input bg-card px-4 py-2.5 text-base text-foreground"
                      />
                    </label>
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
