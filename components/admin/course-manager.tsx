'use client'

import { ChevronDown, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent, type ReactNode } from 'react'

import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ApiResult } from '@/types'

export type AdminLesson = {
  id: string
  slug: string
  order: number
  title: string
  content: string
  bibleVerses: string[]
  reflectionQuestions: string[]
  videoUrl: string | null
  audioUrl: string | null
}

export type AdminWeek = {
  id: string
  weekNumber: number
  title: string
  description: string | null
  lessons: AdminLesson[]
}

export type AdminCourse = {
  id: string
  slug: string
  title: string
  description: string | null
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  order: number
  isActive: boolean
  enrolled: number
  weeks: AdminWeek[]
}

const ENDPOINTS = {
  course: '/api/discipleship/admin/courses',
  week: '/api/discipleship/admin/weeks',
  lesson: '/api/discipleship/admin/lessons',
} as const

type Entity = keyof typeof ENDPOINTS

/** Shared request plumbing: one place for the fetch, the error text and the refresh. */
function useCrud() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function call(
    entity: Entity,
    method: 'POST' | 'PATCH' | 'DELETE',
    payload: Record<string, unknown> | string,
  ) {
    setBusy(true)
    setError(null)

    const url =
      method === 'DELETE'
        ? `${ENDPOINTS[entity]}?id=${encodeURIComponent(payload as string)}`
        : ENDPOINTS[entity]

    try {
      const response = await fetch(url, {
        method,
        ...(method === 'DELETE'
          ? {}
          : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }),
      })
      const result = (await response.json()) as ApiResult

      if (!response.ok || !result.ok) {
        setError(result.ok ? 'Something went wrong.' : result.error)
        return false
      }

      router.refresh()
      return true
    } catch {
      setError('We could not reach the server. Please try again.')
      return false
    } finally {
      setBusy(false)
    }
  }

  return { call, busy, error, setError }
}

function Disclosure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="group rounded-2xl border-2 border-border bg-secondary/30">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 font-display font-semibold text-foreground">
        {label}
        <ChevronDown
          className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none"
          aria-hidden
        />
      </summary>
      <div className="border-t border-border p-4">{children}</div>
    </details>
  )
}

function TextField({
  name,
  label,
  defaultValue,
  type = 'text',
  required,
  placeholder,
}: {
  name: string
  label: string
  defaultValue?: string | number
  type?: string
  required?: boolean
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-display text-sm font-semibold text-foreground">{label}</span>
      <Input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        className="h-12"
      />
    </label>
  )
}

function AreaField({
  name,
  label,
  defaultValue,
  rows = 4,
  hint,
  required,
}: {
  name: string
  label: string
  defaultValue?: string
  rows?: number
  hint?: string
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-display text-sm font-semibold text-foreground">{label}</span>
      {hint && <span className="mb-1.5 block text-sm text-muted-foreground">{hint}</span>}
      <textarea
        name={name}
        rows={rows}
        required={required}
        defaultValue={defaultValue}
        className="w-full rounded-xl border-2 border-input bg-card px-3 py-2 text-base"
      />
    </label>
  )
}

function formValues(event: FormEvent<HTMLFormElement>) {
  event.preventDefault()
  return Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, string>
}

// --- Lessons ---------------------------------------------------------------

function LessonForm({
  weekId,
  lesson,
  onDone,
}: {
  weekId: string
  lesson?: AdminLesson
  onDone?: () => void
}) {
  const { call, busy, error } = useCrud()
  const editing = Boolean(lesson)

  async function submit(event: FormEvent<HTMLFormElement>) {
    const values = formValues(event)
    const payload = { ...values, weekId, ...(lesson ? { id: lesson.id } : {}) }
    const ok = await call('lesson', editing ? 'PATCH' : 'POST', payload)
    if (ok && !editing) event.currentTarget.reset()
    if (ok) onDone?.()
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-[6rem_1fr]">
        <TextField name="order" label="No." type="number" defaultValue={lesson?.order ?? 1} required />
        <TextField name="title" label="Lesson title" defaultValue={lesson?.title} required />
      </div>

      <AreaField
        name="content"
        label="Lesson content"
        hint="Markdown. Use ## for section headings, - for bullets, > for a quote."
        rows={10}
        defaultValue={lesson?.content}
        required
      />

      <AreaField
        name="bibleVerses"
        label="Bible verses"
        hint="One per line, e.g. John 3:16 — For God so loved the world…"
        defaultValue={lesson?.bibleVerses.join('\n')}
      />

      <AreaField
        name="reflectionQuestions"
        label="Reflection questions"
        hint="One per line."
        defaultValue={lesson?.reflectionQuestions.join('\n')}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="videoUrl"
          label="Video URL (optional)"
          defaultValue={lesson?.videoUrl ?? ''}
          placeholder="https://…"
        />
        <TextField
          name="audioUrl"
          label="Audio URL (optional)"
          defaultValue={lesson?.audioUrl ?? ''}
          placeholder="https://…"
        />
      </div>

      <Button type="submit" disabled={busy}>
        {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
        {editing ? 'Save lesson' : 'Add lesson'}
      </Button>
    </form>
  )
}

function LessonItem({ weekId, lesson }: { weekId: string; lesson: AdminLesson }) {
  const { call, busy, error } = useCrud()

  return (
    <li className="rounded-2xl border-2 border-border bg-card p-4">
      {error && (
        <Alert variant="error" className="mb-3">
          {error}
        </Alert>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 font-display font-bold text-foreground">
          <span className="text-primary">{lesson.order}.</span> {lesson.title}{' '}
          <span className="font-sans text-sm font-normal text-muted-foreground">/{lesson.slug}</span>
        </p>
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() => {
            if (confirm(`Delete the lesson "${lesson.title}"? This cannot be undone.`)) {
              void call('lesson', 'DELETE', lesson.id)
            }
          }}
        >
          <Trash2 className="size-4 text-destructive" aria-hidden />
          <span className="sr-only">Delete {lesson.title}</span>
        </Button>
      </div>

      <div className="mt-3">
        <Disclosure label="Edit this lesson">
          <LessonForm weekId={weekId} lesson={lesson} />
        </Disclosure>
      </div>
    </li>
  )
}

// --- Weeks -----------------------------------------------------------------

function WeekBlock({ week }: { week: AdminWeek }) {
  const { call, busy, error } = useCrud()

  async function submit(event: FormEvent<HTMLFormElement>) {
    const values = formValues(event)
    await call('week', 'PATCH', { ...values, id: week.id })
  }

  return (
    <li className="rounded-3xl border-2 border-border bg-card p-5 sm:p-6">
      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="font-display text-lg font-bold text-foreground">
          Week {week.weekNumber}: {week.title}
        </h4>
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() => {
            if (confirm(`Delete week ${week.weekNumber} and all ${week.lessons.length} of its lessons?`)) {
              void call('week', 'DELETE', week.id)
            }
          }}
        >
          <Trash2 className="size-4 text-destructive" aria-hidden />
          <span className="sr-only">Delete week {week.weekNumber}</span>
        </Button>
      </div>

      <div className="mt-4 space-y-3">
        <Disclosure label="Edit week details">
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[6rem_1fr]">
              <TextField name="weekNumber" label="Week" type="number" defaultValue={week.weekNumber} required />
              <TextField name="title" label="Title" defaultValue={week.title} required />
            </div>
            <AreaField name="description" label="Description" defaultValue={week.description ?? ''} rows={3} />
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
              Save week
            </Button>
          </form>
        </Disclosure>

        <p className="pt-1 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {week.lessons.length} {week.lessons.length === 1 ? 'lesson' : 'lessons'}
        </p>

        <ul className="space-y-3">
          {week.lessons.map((lesson) => (
            <LessonItem key={lesson.id} weekId={week.id} lesson={lesson} />
          ))}
        </ul>

        <Disclosure label="+ Add a lesson to this week">
          <LessonForm weekId={week.id} />
        </Disclosure>
      </div>
    </li>
  )
}

// --- Courses ---------------------------------------------------------------

function CourseBlock({ course }: { course: AdminCourse }) {
  const { call, busy, error } = useCrud()

  async function saveCourse(event: FormEvent<HTMLFormElement>) {
    const values = formValues(event)
    await call('course', 'PATCH', { ...values, id: course.id, isActive: values.isActive === 'on' })
  }

  async function addWeek(event: FormEvent<HTMLFormElement>) {
    const values = formValues(event)
    const ok = await call('week', 'POST', { ...values, courseId: course.id })
    if (ok) event.currentTarget.reset()
  }

  return (
    <section className="rounded-3xl border-2 border-border bg-secondary/20 p-6 sm:p-8">
      {error && (
        <Alert variant="error" className="mb-5">
          {error}
        </Alert>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-2xl">{course.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            /{course.slug} · {course.weeks.length} weeks ·{' '}
            {course.weeks.reduce((total, week) => total + week.lessons.length, 0)} lessons ·{' '}
            {course.enrolled} enrolled
            {!course.isActive && ' · hidden'}
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => {
            const message =
              course.enrolled > 0
                ? `${course.enrolled} people are part way through this course. It will be hidden rather than deleted so their progress survives. Continue?`
                : `Delete "${course.title}" and everything in it? This cannot be undone.`
            if (confirm(message)) void call('course', 'DELETE', course.id)
          }}
        >
          <Trash2 className="size-4 text-destructive" aria-hidden />
          {course.enrolled > 0 ? 'Retire' : 'Delete'}
        </Button>
      </div>

      <div className="mt-6 space-y-4">
        <Disclosure label="Edit course details">
          <form onSubmit={saveCourse} className="space-y-4">
            <TextField name="title" label="Title" defaultValue={course.title} required />
            <AreaField name="description" label="Description" defaultValue={course.description ?? ''} rows={3} />

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block font-display text-sm font-semibold text-foreground">
                  Difficulty
                </span>
                <select
                  name="difficulty"
                  defaultValue={course.difficulty}
                  className="h-12 w-full rounded-xl border-2 border-input bg-card px-3 text-base"
                >
                  <option value="BEGINNER">Brand new to faith</option>
                  <option value="INTERMEDIATE">Growing</option>
                  <option value="ADVANCED">Going deeper</option>
                </select>
              </label>

              <TextField name="order" label="Sort order" type="number" defaultValue={course.order} />
            </div>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={course.isActive}
                className="size-6 rounded border-2 border-input"
              />
              <span className="font-semibold text-foreground">Visible to visitors</span>
            </label>

            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
              Save course
            </Button>
          </form>
        </Disclosure>

        <ul className="space-y-4">
          {course.weeks.map((week) => (
            <WeekBlock key={week.id} week={week} />
          ))}
        </ul>

        <Disclosure label="+ Add a week to this course">
          <form onSubmit={addWeek} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[6rem_1fr]">
              <TextField
                name="weekNumber"
                label="Week"
                type="number"
                defaultValue={course.weeks.length + 1}
                required
              />
              <TextField name="title" label="Title" required placeholder="e.g. Prayer" />
            </div>
            <AreaField name="description" label="Description" rows={3} />
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />}
              Add week
            </Button>
          </form>
        </Disclosure>
      </div>
    </section>
  )
}

export function CourseManager({ courses }: { courses: AdminCourse[] }) {
  const { call, busy, error } = useCrud()

  async function addCourse(event: FormEvent<HTMLFormElement>) {
    const values = formValues(event)
    const ok = await call('course', 'POST', { ...values, isActive: true })
    if (ok) event.currentTarget.reset()
  }

  return (
    <div className="space-y-8">
      {courses.map((course) => (
        <CourseBlock key={course.id} course={course} />
      ))}

      <section className="rounded-3xl border-2 border-dashed border-border bg-card p-6 sm:p-8">
        <h3 className="text-xl">Create a new course</h3>
        {error && (
          <Alert variant="error" className="mt-4">
            {error}
          </Alert>
        )}
        <form onSubmit={addCourse} className="mt-5 space-y-4">
          <TextField name="title" label="Title" required placeholder="e.g. Growing Deeper" />
          <AreaField name="description" label="Description" rows={3} />
          <label className="block">
            <span className="mb-1.5 block font-display text-sm font-semibold text-foreground">
              Difficulty
            </span>
            <select
              name="difficulty"
              defaultValue="BEGINNER"
              className="h-12 w-full rounded-xl border-2 border-input bg-card px-3 text-base"
            >
              <option value="BEGINNER">Brand new to faith</option>
              <option value="INTERMEDIATE">Growing</option>
              <option value="ADVANCED">Going deeper</option>
            </select>
          </label>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />}
            Create course
          </Button>
        </form>
      </section>
    </div>
  )
}
