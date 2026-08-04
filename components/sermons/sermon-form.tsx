'use client'

import { Loader2, Save, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { Alert } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { suggestedTopics } from '@/lib/sermons'
import { sermonStatuses } from '@/lib/validations'
import type { ApiResult } from '@/types'

export type SermonFormValues = {
  slug?: string
  title: string
  description: string
  speaker: string
  speakerBio: string
  speakerImage: string
  seriesId: string
  ministryId: string
  biblePassage: string
  bibleText: string
  preachedAt: string
  duration: string
  videoUrl: string
  audioUrl: string
  transcript: string
  notes: string
  studyQuestions: string
  topics: string
  tags: string
  image: string
  isFeatured: boolean
  status: string
}

const statusLabels: Record<string, string> = {
  DRAFT: '📝 Draft — nobody else can see it',
  PUBLISHED: '✅ Published — live on the site',
  ARCHIVED: '📦 Archived — hidden from the list',
}

function Field({
  name,
  label,
  hint,
  error,
  children,
}: {
  name: string
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={name} className="block">
        <span className="mb-1.5 block font-display text-base font-semibold text-foreground">
          {label}
        </span>
        {hint && <span className="mb-1.5 block text-sm text-muted-foreground">{hint}</span>}
      </label>
      {children}
      {error && <p className="mt-1.5 text-sm font-semibold text-destructive">{error}</p>}
    </div>
  )
}

const textareaClass =
  'w-full rounded-xl border-2 border-input bg-card px-4 py-3 text-base text-foreground shadow-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35'

const selectClass =
  'h-14 w-full rounded-xl border-2 border-input bg-card px-4 text-base text-foreground shadow-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35'

export function SermonForm({
  initial,
  series,
  ministries,
  mode,
}: {
  initial: Partial<SermonFormValues>
  series: { id: string; title: string }[]
  ministries: { id: string; name: string }[]
  mode: 'create' | 'edit'
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setFieldErrors({})

    const form = new FormData(event.currentTarget)
    const text = (key: string) => String(form.get(key) ?? '')

    const payload = {
      title: text('title'),
      description: text('description'),
      speaker: text('speaker'),
      speakerBio: text('speakerBio'),
      speakerImage: text('speakerImage'),
      seriesId: text('seriesId') || undefined,
      ministryId: text('ministryId') || undefined,
      biblePassage: text('biblePassage'),
      bibleText: text('bibleText'),
      preachedAt: text('preachedAt'),
      duration: text('duration'),
      videoUrl: text('videoUrl'),
      audioUrl: text('audioUrl'),
      transcript: text('transcript'),
      notes: text('notes'),
      // Textareas send one item per line; the schema splits and trims.
      studyQuestions: text('studyQuestions'),
      topics: text('topics'),
      tags: text('tags'),
      image: text('image'),
      isFeatured: form.get('isFeatured') === 'on',
      status: text('status'),
    }

    try {
      const response = await fetch(
        mode === 'create' ? '/api/sermons' : `/api/sermons/${initial.slug}`,
        {
          method: mode === 'create' ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )
      const result = (await response.json()) as ApiResult<{ slug: string }>

      if (!response.ok || !result.ok) {
        setError(result.ok ? 'Something went wrong.' : result.error)
        if (!result.ok && result.fieldErrors) setFieldErrors(result.fieldErrors)
        return
      }

      router.push(`/admin/sermons/${result.data.slug}`)
      router.refresh()
    } catch {
      setError('We could not reach the server. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function archive() {
    if (!confirm('Archive this sermon? It will be hidden from the public list but kept.')) return
    setBusy(true)
    try {
      const response = await fetch(`/api/sermons/${initial.slug}`, { method: 'DELETE' })
      const result = (await response.json()) as ApiResult<{ archived: boolean }>
      if (!response.ok || !result.ok) {
        setError(result.ok ? 'Could not archive that.' : result.error)
        return
      }
      router.push('/admin/sermons')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  const err = (key: string) => fieldErrors[key]?.[0]

  return (
    <form onSubmit={submit} className="space-y-10">
      {error && <Alert variant="error">{error}</Alert>}

      <section className="space-y-5">
        <h2 className="text-xl">The message</h2>

        <Field name="title" label="Title" error={err('title')}>
          <Input id="title" name="title" defaultValue={initial.title} required />
        </Field>

        <Field
          name="description"
          label="Short description"
          hint="One or two sentences. Shown on the card and used for search results."
        >
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={initial.description}
            className={textareaClass}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="speaker" label="Who preached it" error={err('speaker')}>
            <Input id="speaker" name="speaker" defaultValue={initial.speaker} required />
          </Field>

          <Field name="preachedAt" label="When" error={err('preachedAt')}>
            <Input
              id="preachedAt"
              name="preachedAt"
              type="datetime-local"
              defaultValue={initial.preachedAt}
              required
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="seriesId" label="Series">
            <select
              id="seriesId"
              name="seriesId"
              defaultValue={initial.seriesId ?? ''}
              className={selectClass}
            >
              <option value="">Not part of a series</option>
              {series.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </Field>

          <Field name="ministryId" label="Ministry">
            <select
              id="ministryId"
              name="ministryId"
              defaultValue={initial.ministryId ?? ''}
              className={selectClass}
            >
              <option value="">No particular ministry</option>
              {ministries.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <section className="space-y-5 border-t border-border pt-8">
        <h2 className="text-xl">Recording</h2>

        <Field
          name="videoUrl"
          label="Video link"
          hint="Paste the YouTube or Vimeo address straight from the address bar — we work out the rest."
          error={err('videoUrl')}
        >
          <Input
            id="videoUrl"
            name="videoUrl"
            type="url"
            defaultValue={initial.videoUrl}
            placeholder="https://www.youtube.com/watch?v=…"
          />
        </Field>

        <Field
          name="audioUrl"
          label="Audio link"
          hint="A direct link to an MP3 or M4A file. It gets a player and a download button."
          error={err('audioUrl')}
        >
          <Input
            id="audioUrl"
            name="audioUrl"
            type="url"
            defaultValue={initial.audioUrl}
            placeholder="https://…/sermon.mp3"
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="duration" label="Length in minutes" hint="Leave blank if you are not sure.">
            <Input
              id="duration"
              name="duration"
              type="number"
              min={1}
              max={1440}
              defaultValue={initial.duration}
            />
          </Field>

          <Field name="image" label="Cover picture link">
            <Input id="image" name="image" type="url" defaultValue={initial.image} />
          </Field>
        </div>
      </section>

      <section className="space-y-5 border-t border-border pt-8">
        <h2 className="text-xl">Scripture and notes</h2>

        <Field name="biblePassage" label="Bible passage" hint="e.g. John 3:16–21">
          <Input id="biblePassage" name="biblePassage" defaultValue={initial.biblePassage} />
        </Field>

        <Field name="bibleText" label="The passage in full" hint="Shown in a highlighted panel.">
          <textarea
            id="bibleText"
            name="bibleText"
            rows={5}
            defaultValue={initial.bibleText}
            className={textareaClass}
          />
        </Field>

        <Field
          name="notes"
          label="Sermon notes"
          hint="Markdown works here — ## for headings, - for bullets."
        >
          <textarea
            id="notes"
            name="notes"
            rows={10}
            defaultValue={initial.notes}
            className={textareaClass}
          />
        </Field>

        <Field
          name="studyQuestions"
          label="Questions to talk about"
          hint="One question per line."
        >
          <textarea
            id="studyQuestions"
            name="studyQuestions"
            rows={5}
            defaultValue={initial.studyQuestions}
            className={textareaClass}
          />
        </Field>

        <Field
          name="transcript"
          label="Full transcript"
          hint="Optional. Shown behind a “Read the transcript” toggle, and it makes the sermon findable by anything said in it."
        >
          <textarea
            id="transcript"
            name="transcript"
            rows={8}
            defaultValue={initial.transcript}
            className={textareaClass}
          />
        </Field>
      </section>

      <section className="space-y-5 border-t border-border pt-8">
        <h2 className="text-xl">Finding it later</h2>

        <Field
          name="topics"
          label="Topics"
          hint={`One per line. People filter by these. Common ones: ${suggestedTopics.slice(0, 6).join(', ')}.`}
        >
          <textarea
            id="topics"
            name="topics"
            rows={4}
            defaultValue={initial.topics}
            className={textareaClass}
          />
        </Field>

        <Field name="tags" label="Tags" hint="One per line. Used by search but not shown as chips.">
          <textarea
            id="tags"
            name="tags"
            rows={3}
            defaultValue={initial.tags}
            className={textareaClass}
          />
        </Field>

        <Field name="speakerBio" label="About the speaker">
          <textarea
            id="speakerBio"
            name="speakerBio"
            rows={3}
            defaultValue={initial.speakerBio}
            className={textareaClass}
          />
        </Field>
      </section>

      <section className="space-y-5 border-t border-border pt-8">
        <h2 className="text-xl">Publishing</h2>

        <Field name="status" label="Status">
          <select
            id="status"
            name="status"
            defaultValue={initial.status ?? 'DRAFT'}
            className={selectClass}
          >
            {sermonStatuses.map((value) => (
              <option key={value} value={value}>
                {statusLabels[value]}
              </option>
            ))}
          </select>
        </Field>

        <label className="flex items-start gap-3 rounded-2xl border-2 border-border bg-card p-4">
          <input
            type="checkbox"
            name="isFeatured"
            defaultChecked={initial.isFeatured}
            className="mt-0.5 size-6 shrink-0 rounded border-2 border-input"
          />
          <span>
            <span className="block font-display font-semibold text-foreground">
              Feature this sermon
            </span>
            <span className="mt-0.5 block text-sm text-muted-foreground">
              Shows it under &ldquo;Start here&rdquo; at the top of the sermons page.
            </span>
          </span>
        </label>
      </section>

      <div className="flex flex-wrap gap-3 border-t border-border pt-8">
        <button
          type="submit"
          disabled={busy}
          className="flex min-h-14 items-center gap-2 rounded-xl bg-primary px-8 font-display font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Save className="size-5" aria-hidden />}
          {mode === 'create' ? 'Add sermon' : 'Save changes'}
        </button>

        {mode === 'edit' && (
          <button
            type="button"
            onClick={archive}
            disabled={busy}
            className="flex min-h-14 items-center gap-2 rounded-xl border-2 border-destructive/35 px-6 font-display font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
          >
            <Trash2 className="size-5" aria-hidden />
            Archive
          </button>
        )}
      </div>
    </form>
  )
}
