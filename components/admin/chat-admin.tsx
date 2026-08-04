'use client'

import { Check, Loader2, Save, ShieldOff, Trash2, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ApiResult } from '@/types'

export type ReportRow = {
  id: string
  reason: string
  status: string
  createdAt: string
  reportedByName: string
  messageId: string
  messageBody: string
  messageDeleted: boolean
  authorName: string
  authorId: string | null
  conversationId: string
}

export type BannedRow = { id: string; name: string; email: string; reason: string | null }

export function ChatAdmin({
  reports,
  banned,
  settings,
}: {
  reports: ReportRow[]
  banned: BannedRow[]
  settings: { enabled: boolean; retentionDays: number | null; bannedWords: string[] }
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  async function send(payload: object) {
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      const response = await fetch('/api/chat/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = (await response.json()) as ApiResult<Record<string, unknown>>
      if (!response.ok || !result.ok) {
        setError(result.ok ? 'Something went wrong.' : result.error)
        return null
      }
      router.refresh()
      return result.data
    } catch {
      setError('We could not reach the server. Please try again.')
      return null
    } finally {
      setBusy(false)
    }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    await send({
      action: 'settings',
      payload: {
        enabled: form.get('enabled') === 'on',
        retentionDays: form.get('retentionDays'),
        bannedWords: form.get('bannedWords'),
      },
    })
  }

  return (
    <div className="space-y-14">
      {error && <Alert variant="error">{error}</Alert>}
      {note && <Alert variant="success">{note}</Alert>}

      <section aria-labelledby="reports">
        <h2 id="reports" className="text-2xl sm:text-3xl">
          Reported messages
        </h2>

        {reports.length === 0 ? (
          <p className="mt-6 rounded-3xl border-2 border-dashed border-border bg-secondary/40 p-10 text-center text-muted-foreground">
            Nothing reported. That is a good sign.
          </p>
        ) : (
          <ul className="mt-6 space-y-4">
            {reports.map((report) => (
              <li
                key={report.id}
                className="rounded-3xl border-2 border-destructive/30 bg-card p-6 shadow-soft"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="font-display font-bold text-foreground">
                    {report.authorName}
                    <span className="ml-2 font-sans text-sm font-normal text-muted-foreground">
                      reported by {report.reportedByName}
                    </span>
                  </p>
                  <time className="text-sm text-muted-foreground">
                    {new Date(report.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </time>
                </div>

                <blockquote className="mt-4 rounded-2xl bg-secondary/60 p-4">
                  <p className="whitespace-pre-wrap text-pretty text-foreground/90">
                    {report.messageDeleted ? 'This message was removed.' : report.messageBody}
                  </p>
                </blockquote>

                <p className="mt-3 text-pretty text-muted-foreground">
                  <span className="font-semibold">Reason: </span>
                  {report.reason}
                </p>

                <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
                  <Link
                    href={`/chat/${report.conversationId}`}
                    className="flex min-h-11 items-center rounded-xl border-2 border-primary/25 bg-card px-4 font-semibold text-primary transition-colors hover:bg-primary-soft"
                  >
                    Open the conversation
                  </Link>

                  {!report.messageDeleted && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        send({
                          action: 'review',
                          payload: { reportId: report.id, status: 'ACTIONED', deleteMessage: true },
                        })
                      }
                    >
                      <Trash2 className="size-4 text-destructive" aria-hidden />
                      Remove the message
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() =>
                      send({
                        action: 'review',
                        payload: { reportId: report.id, status: 'DISMISSED', deleteMessage: false },
                      })
                    }
                  >
                    <Check className="size-4" aria-hidden />
                    Nothing wrong
                  </Button>

                  {report.authorId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => {
                        const reason = prompt('Why is this person being removed from chat?')
                        if (!reason?.trim()) return
                        void send({
                          action: 'ban',
                          payload: { userId: report.authorId, banned: true, reason },
                        })
                      }}
                    >
                      <ShieldOff className="size-4 text-destructive" aria-hidden />
                      Ban from chat
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {banned.length > 0 && (
        <section aria-labelledby="banned">
          <h2 id="banned" className="text-2xl sm:text-3xl">
            Banned from chat
          </h2>
          <ul className="mt-6 space-y-3">
            {banned.map((person) => (
              <li
                key={person.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-border bg-card p-5"
              >
                <div className="min-w-0">
                  <p className="font-display font-bold text-foreground">{person.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {person.email}
                    {person.reason && ` · ${person.reason}`}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    send({ action: 'ban', payload: { userId: person.id, banned: false } })
                  }
                >
                  <X className="size-4" aria-hidden />
                  Lift the ban
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="settings">
        <h2 id="settings" className="text-2xl sm:text-3xl">
          Chat settings
        </h2>

        <form
          onSubmit={saveSettings}
          className="mt-6 space-y-6 rounded-3xl border-2 border-border bg-card p-6 shadow-soft sm:p-8"
        >
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={settings.enabled}
              className="mt-0.5 size-6 shrink-0 rounded border-2 border-input"
            />
            <span>
              <span className="block font-display font-semibold text-foreground">
                Chat is switched on
              </span>
              <span className="mt-0.5 block text-sm text-muted-foreground">
                Turn this off and nobody can read or send. Moderators keep read access.
              </span>
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 block font-display text-base font-semibold text-foreground">
              Keep messages for (days)
            </span>
            <span className="mb-1.5 block text-sm text-muted-foreground">
              Leave blank to keep everything. Older messages are deleted when the sweep runs.
            </span>
            <Input
              name="retentionDays"
              type="number"
              min={1}
              defaultValue={settings.retentionDays ?? ''}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block font-display text-base font-semibold text-foreground">
              Words to flag
            </span>
            <span className="mb-1.5 block text-sm text-muted-foreground">
              One per line. Matching messages are flagged for review, not blocked — a blocked send
              just teaches people to spell around it.
            </span>
            <textarea
              name="bannedWords"
              rows={6}
              defaultValue={settings.bannedWords.join('\n')}
              className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 text-base"
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
              Save settings
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={async () => {
                if (!settings.retentionDays) {
                  setError('Set a retention period first.')
                  return
                }
                if (!confirm('Delete every message older than the retention period? This cannot be undone.')) return
                const data = await send({ action: 'sweep' })
                if (data) setNote(`Removed ${data.deleted} old ${data.deleted === 1 ? 'message' : 'messages'}.`)
              }}
            >
              <Trash2 className="size-4" aria-hidden />
              Run the sweep now
            </Button>
          </div>

          <p className="border-t border-border pt-5 text-sm text-muted-foreground">
            The sweep is manual for now — scheduling it needs a cron route, which arrives with the
            rest of the notification work.
          </p>
        </form>
      </section>
    </div>
  )
}
