'use client'

import { Loader2, Mail, Phone, UserCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { followUpStatuses } from '@/lib/validations'
import type { ApiResult } from '@/types'

export type DecisionSummary = {
  id: string
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
  decision: string
  followUpStatus: string
  notes: string | null
  createdAt: string
  assignedToName: string | null
}

export type TeamMember = { id: string; name: string; role: string }

const statusStyles: Record<string, string> = {
  PENDING: 'bg-accent-soft text-accent-ink',
  CONTACTED: 'bg-primary-soft text-primary',
  MEETING_SET: 'bg-primary-soft text-primary',
  DISCIPLESHIP_STARTED: 'bg-success/15 text-success',
  COMPLETED: 'bg-success/15 text-success',
  LOST_CONTACT: 'bg-destructive/10 text-destructive',
}

const statusLabels: Record<string, string> = {
  PENDING: 'Needs contact',
  CONTACTED: 'Contacted',
  MEETING_SET: 'Meeting set',
  DISCIPLESHIP_STARTED: 'Discipleship started',
  COMPLETED: 'Completed',
  LOST_CONTACT: 'Lost contact',
}

const decisionLabels: Record<string, string> = {
  SALVATION: 'Salvation',
  REDEDICATION: 'Rededication',
  BAPTISM: 'Baptism',
  MEMBERSHIP: 'Membership',
  PRAYER_REQUEST: 'Prayer request',
}

export function DecisionRow({
  decision,
  team,
  canAssign,
}: {
  decision: DecisionSummary
  team: TeamMember[]
  canAssign: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState(decision.notes ?? '')

  const name = [decision.firstName, decision.lastName].filter(Boolean).join(' ') || 'Anonymous visitor'

  async function send(url: string, method: 'POST' | 'PATCH', body: Record<string, unknown>) {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = (await response.json()) as ApiResult
      if (!response.ok || !result.ok) {
        setError(result.ok ? 'Something went wrong.' : result.error)
        return
      }
      router.refresh()
    } catch {
      setError('We could not reach the server. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="rounded-3xl border-2 border-border bg-card p-6 shadow-soft">
      {error && (
        <Alert variant="error" className="mb-5">
          {error}
        </Alert>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-display text-xl font-bold text-foreground">{name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {decisionLabels[decision.decision] ?? decision.decision} ·{' '}
            {new Date(decision.createdAt).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        </div>

        <span
          className={cn(
            'shrink-0 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider',
            statusStyles[decision.followUpStatus] ?? 'bg-secondary text-foreground',
          )}
        >
          {statusLabels[decision.followUpStatus] ?? decision.followUpStatus}
        </span>
      </div>

      <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-sm">
        {decision.email && (
          <div className="flex items-center gap-2">
            <Mail className="size-4 text-accent-ink" aria-hidden />
            <dt className="sr-only">Email</dt>
            <dd>
              <a href={`mailto:${decision.email}`} className="font-semibold hover:underline">
                {decision.email}
              </a>
            </dd>
          </div>
        )}
        {decision.phone && (
          <div className="flex items-center gap-2">
            <Phone className="size-4 text-accent-ink" aria-hidden />
            <dt className="sr-only">Phone</dt>
            <dd>
              <a href={`tel:${decision.phone}`} className="font-semibold hover:underline">
                {decision.phone}
              </a>
            </dd>
          </div>
        )}
        <div className="flex items-center gap-2">
          <UserCheck className="size-4 text-accent-ink" aria-hidden />
          <dt className="sr-only">Assigned to</dt>
          <dd className={decision.assignedToName ? 'font-semibold' : 'text-muted-foreground'}>
            {decision.assignedToName ?? 'Not assigned yet'}
          </dd>
        </div>
      </dl>

      <div className="mt-6 space-y-4 border-t border-border pt-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex-1 min-w-[12rem]">
            <span className="mb-1.5 block font-display text-sm font-semibold text-foreground">
              Status
            </span>
            <select
              defaultValue={decision.followUpStatus}
              disabled={busy}
              onChange={(event) =>
                send('/api/salvation/decisions', 'PATCH', {
                  decisionId: decision.id,
                  followUpStatus: event.target.value,
                })
              }
              className="h-12 w-full rounded-xl border-2 border-input bg-card px-3 text-base"
            >
              {followUpStatuses.map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </select>
          </label>

          {canAssign && (
            <label className="flex-1 min-w-[12rem]">
              <span className="mb-1.5 block font-display text-sm font-semibold text-foreground">
                Assign to
              </span>
              <select
                defaultValue=""
                disabled={busy}
                onChange={(event) => {
                  const value = event.target.value
                  if (!value) return
                  send('/api/salvation/assign', 'POST', {
                    decisionId: decision.id,
                    ...(value === '__auto' ? {} : { assignedToId: value }),
                  })
                }}
                className="h-12 w-full rounded-xl border-2 border-input bg-card px-3 text-base"
              >
                <option value="">Choose…</option>
                <option value="__auto">Auto (fewest open cases)</option>
                {team.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div>
          <label
            htmlFor={`notes-${decision.id}`}
            className="mb-1.5 block font-display text-sm font-semibold text-foreground"
          >
            Follow-up notes
          </label>
          <textarea
            id={`notes-${decision.id}`}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            className="w-full rounded-xl border-2 border-input bg-card px-3 py-2 text-base"
            placeholder="What happened when you got in touch?"
          />
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            disabled={busy || notes === (decision.notes ?? '')}
            onClick={() => send('/api/salvation/decisions', 'PATCH', { decisionId: decision.id, notes })}
          >
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Save notes
          </Button>
        </div>
      </div>
    </article>
  )
}
