'use client'

import { ChevronDown, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ApiResult } from '@/types'

export type GospelFormValues = {
  steps: {
    id: string
    eyebrow: string
    title: string
    body: string
    verseReference: string
    verseText: string
    emoji: string
  }[]
  prayerTitle: string
  prayerIntro: string
  prayerLines: string
  prayerAfter: string
  afterVerseReference: string
  afterVerseText: string
  nextSteps: { emoji: string; title: string; body: string }[]
  source: 'database' | 'bundled'
}

function Labelled({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-display text-base font-semibold text-foreground">
        {label}
      </span>
      {hint && <span className="mb-1.5 block text-sm text-muted-foreground">{hint}</span>}
      {children}
    </label>
  )
}

const area =
  'w-full rounded-xl border-2 border-input bg-card px-4 py-3 text-base leading-relaxed'

/**
 * Editor for the salvation journey.
 *
 * Purpose-built fields rather than a Markdown box: this is the wording someone
 * reads on the day they decide to follow Jesus, and a stray character should
 * not be able to break that page.
 */
export function GospelEditor({ initial }: { initial: GospelFormValues }) {
  const router = useRouter()
  const [steps, setSteps] = useState(initial.steps)
  const [nextSteps, setNextSteps] = useState(initial.nextSteps)
  const [prayer, setPrayer] = useState({
    prayerTitle: initial.prayerTitle,
    prayerIntro: initial.prayerIntro,
    prayerLines: initial.prayerLines,
    prayerAfter: initial.prayerAfter,
    afterVerseReference: initial.afterVerseReference,
    afterVerseText: initial.afterVerseText,
  })

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  const patchStep = (index: number, patch: Partial<GospelFormValues['steps'][number]>) =>
    setSteps((current) => current.map((s, i) => (i === index ? { ...s, ...patch } : s)))

  async function save() {
    setBusy(true)
    setError(null)
    setSaved(null)

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...prayer, steps, nextSteps }),
      })
      const result = (await response.json()) as ApiResult

      if (!response.ok || !result.ok) {
        setError(result.ok ? 'Something went wrong.' : result.error)
        return
      }

      setSaved('Saved. The salvation pages now show your wording.')
      router.refresh()
    } catch {
      setError('We could not reach the server. Your changes were not saved.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-10">
      {error && <Alert variant="error">{error}</Alert>}
      {saved && <Alert variant="success">{saved}</Alert>}

      <section className="space-y-4">
        <div>
          <h2 className="text-xl">The steps</h2>
          <p className="mt-2 text-pretty text-muted-foreground">
            Shown one after another on <code>/salvation/gospel</code>.
          </p>
        </div>

        {steps.map((step, index) => (
          <details
            key={index}
            open={index === 0}
            className="group rounded-2xl border-2 border-border bg-card"
          >
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 font-display font-semibold text-foreground">
              <span className="flex items-center gap-2">
                <span aria-hidden>{step.emoji}</span>
                {step.title || `Step ${index + 1}`}
              </span>
              <ChevronDown
                className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none"
                aria-hidden
              />
            </summary>

            <div className="space-y-4 border-t border-border p-5">
              <div className="grid gap-4 sm:grid-cols-[6rem_1fr]">
                <Labelled label="Emoji">
                  <Input
                    value={step.emoji}
                    maxLength={8}
                    onChange={(e) => patchStep(index, { emoji: e.target.value })}
                  />
                </Labelled>
                <Labelled label="Heading">
                  <Input
                    value={step.title}
                    maxLength={140}
                    onChange={(e) => patchStep(index, { title: e.target.value })}
                  />
                </Labelled>
              </div>

              <Labelled label="Paragraphs" hint="One paragraph per line.">
                <textarea
                  rows={4}
                  value={step.body}
                  onChange={(e) => patchStep(index, { body: e.target.value })}
                  className={area}
                />
              </Labelled>

              <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
                <Labelled label="Verse reference">
                  <Input
                    value={step.verseReference}
                    maxLength={80}
                    placeholder="John 3:16"
                    onChange={(e) => patchStep(index, { verseReference: e.target.value })}
                  />
                </Labelled>
                <Labelled label="Verse text">
                  <textarea
                    rows={2}
                    value={step.verseText}
                    onChange={(e) => patchStep(index, { verseText: e.target.value })}
                    className={area}
                  />
                </Labelled>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSteps((c) => c.filter((_, i) => i !== index))}
                disabled={steps.length <= 1}
              >
                <Trash2 className="size-4 text-destructive" aria-hidden />
                Remove this step
              </Button>
            </div>
          </details>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setSteps((c) => [
              ...c,
              { id: '', eyebrow: '', title: '', body: '', verseReference: '', verseText: '', emoji: '✝️' },
            ])
          }
        >
          <Plus aria-hidden />
          Add a step
        </Button>
      </section>

      <section className="space-y-5 border-t border-border pt-8">
        <div>
          <h2 className="text-xl">The prayer</h2>
          <p className="mt-2 text-pretty text-muted-foreground">
            Shown on <code>/salvation/prayer</code>.
          </p>
        </div>

        <Labelled label="Heading">
          <Input
            value={prayer.prayerTitle}
            maxLength={140}
            onChange={(e) => setPrayer((p) => ({ ...p, prayerTitle: e.target.value }))}
          />
        </Labelled>

        <Labelled label="Introduction" hint="What you say before the prayer itself.">
          <textarea
            rows={3}
            value={prayer.prayerIntro}
            onChange={(e) => setPrayer((p) => ({ ...p, prayerIntro: e.target.value }))}
            className={area}
          />
        </Labelled>

        <Labelled
          label="The prayer"
          hint="One line per line — each is shown on its own so it is easy to read aloud."
        >
          <textarea
            rows={8}
            value={prayer.prayerLines}
            onChange={(e) => setPrayer((p) => ({ ...p, prayerLines: e.target.value }))}
            className={area}
          />
        </Labelled>

        <Labelled label="After the prayer" hint="What it means that they prayed it.">
          <textarea
            rows={3}
            value={prayer.prayerAfter}
            onChange={(e) => setPrayer((p) => ({ ...p, prayerAfter: e.target.value }))}
            className={area}
          />
        </Labelled>

        <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
          <Labelled label="Closing verse reference">
            <Input
              value={prayer.afterVerseReference}
              maxLength={80}
              onChange={(e) => setPrayer((p) => ({ ...p, afterVerseReference: e.target.value }))}
            />
          </Labelled>
          <Labelled label="Closing verse text">
            <textarea
              rows={2}
              value={prayer.afterVerseText}
              onChange={(e) => setPrayer((p) => ({ ...p, afterVerseText: e.target.value }))}
              className={area}
            />
          </Labelled>
        </div>
      </section>

      <section className="space-y-4 border-t border-border pt-8">
        <div>
          <h2 className="text-xl">What happens next</h2>
          <p className="mt-2 text-pretty text-muted-foreground">
            The numbered list on <code>/salvation/complete</code>.
          </p>
        </div>

        <ul className="space-y-3">
          {nextSteps.map((step, index) => (
            <li key={index} className="grid gap-3 rounded-2xl border-2 border-border bg-card p-4 sm:grid-cols-[5rem_1fr_auto]">
              <Input
                aria-label={`Emoji for next step ${index + 1}`}
                value={step.emoji}
                maxLength={8}
                onChange={(e) =>
                  setNextSteps((c) => c.map((s, i) => (i === index ? { ...s, emoji: e.target.value } : s)))
                }
              />
              <div className="space-y-2">
                <Input
                  aria-label={`Heading for next step ${index + 1}`}
                  placeholder="Start reading"
                  value={step.title}
                  onChange={(e) =>
                    setNextSteps((c) => c.map((s, i) => (i === index ? { ...s, title: e.target.value } : s)))
                  }
                />
                <textarea
                  aria-label={`Description for next step ${index + 1}`}
                  rows={2}
                  value={step.body}
                  onChange={(e) =>
                    setNextSteps((c) => c.map((s, i) => (i === index ? { ...s, body: e.target.value } : s)))
                  }
                  className={area}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setNextSteps((c) => c.filter((_, i) => i !== index))}
                aria-label={`Remove next step ${index + 1}`}
              >
                <Trash2 className="size-5 text-destructive" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>

        <Button
          type="button"
          variant="outline"
          onClick={() => setNextSteps((c) => [...c, { emoji: '•', title: '', body: '' }])}
        >
          <Plus aria-hidden />
          Add a next step
        </Button>
      </section>

      <div className="border-t border-border pt-8">
        <Button size="lg" onClick={save} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
          Save the journey
        </Button>
      </div>
    </div>
  )
}
