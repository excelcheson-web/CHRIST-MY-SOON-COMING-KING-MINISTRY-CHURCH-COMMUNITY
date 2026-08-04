'use client'

import { Flag, Loader2, MoreHorizontal, Paperclip, Radio, Reply, Send, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { AttachmentList, PendingAttachments, type ChatAttachment } from '@/components/chat/attachments'
import { useMessageStream, type ChatMessage } from '@/components/chat/use-message-stream'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ACCEPT_ATTRIBUTE, ACCEPTED_LABEL } from '@/lib/storage-constants'
import { cn } from '@/lib/utils'
import type { ApiResult } from '@/types'

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function dayOf(iso: string) {
  const date = new Date(iso)
  const today = new Date()
  const yesterday = new Date(Date.now() - 864e5)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function ChatThread({
  conversationId,
  canPost,
  isModerator,
}: {
  conversationId: string
  canPost: boolean
  isModerator: boolean
}) {
  const { messages, loading, error, live, mode, refreshNow, cursor } = useMessageStream(conversationId)
  const [body, setBody] = useState('')
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [sending, setSending] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [pending, setPending] = useState<ChatAttachment[]>([])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const endRef = useRef<HTMLDivElement>(null)
  const lastSeqRef = useRef(0)

  // Follow the conversation down as it grows.
  useEffect(() => {
    const newest = messages.at(-1)?.seq ?? 0
    if (newest > lastSeqRef.current) {
      lastSeqRef.current = newest
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [messages])

  // Keep the read pointer roughly in step with what has been displayed.
  useEffect(() => {
    const newest = cursor()
    if (newest === 0) return
    const timer = setTimeout(() => {
      void fetch(`/api/chat/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lastReadSeq: newest }),
      }).catch(() => null)
    }, 1200)
    return () => clearTimeout(timer)
  }, [messages, conversationId, cursor])

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return

    setUploading(true)
    setActionError(null)

    for (const file of Array.from(files).slice(0, 6 - pending.length)) {
      const form = new FormData()
      form.append('conversationId', conversationId)
      form.append('file', file)

      try {
        const response = await fetch('/api/chat/attachments', { method: 'POST', body: form })
        const result = (await response.json()) as ApiResult<ChatAttachment>

        if (!response.ok || !result.ok) {
          setActionError(result.ok ? 'Could not upload that file.' : result.error)
          continue
        }
        setPending((current) => [...current, result.data])
      } catch {
        setActionError('We could not upload that file. Please try again.')
      }
    }

    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function send() {
    const text = body.trim()
    // A message needs words, files, or both.
    if ((!text && pending.length === 0) || sending) return

    setSending(true)
    setActionError(null)

    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: text,
          replyToId: replyTo?.id,
          attachmentIds: pending.map((file) => file.id),
        }),
      })
      const result = (await response.json()) as ApiResult

      if (!response.ok || !result.ok) {
        setActionError(result.ok ? 'Could not send that.' : result.error)
        return
      }

      setBody('')
      setReplyTo(null)
      setPending([])
      refreshNow()
    } catch {
      setActionError('We could not reach the server. Your message was not sent.')
    } finally {
      setSending(false)
    }
  }

  async function remove(id: string) {
    if (!confirm('Remove this message?')) return
    await fetch(`/api/chat/messages/${id}`, { method: 'DELETE' }).catch(() => null)
    setOpenMenu(null)
    refreshNow()
  }

  async function report(id: string) {
    const reason = prompt('What is wrong with this message? Our team will read it.')
    if (!reason?.trim()) return

    const response = await fetch(`/api/chat/messages/${id}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    }).catch(() => null)

    setOpenMenu(null)
    setActionError(
      response?.ok ? null : 'We could not send that report. Please tell a leader directly.',
    )
    if (response?.ok) alert('Thank you. Our team will look at this.')
  }

  let lastDay = ''

  return (
    <div className="flex h-[calc(100dvh-16rem)] min-h-[26rem] flex-col rounded-3xl border-2 border-border bg-card shadow-soft">
      <div className="flex-1 overflow-y-auto p-5 sm:p-6">
        {loading && messages.length === 0 ? (
          <p className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" aria-hidden />
            Loading the conversation…
          </p>
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-pretty text-muted-foreground">
            Nothing here yet. Say hello 👋
          </p>
        ) : (
          <ul className="space-y-4" aria-live="polite" aria-relevant="additions">
            {messages.map((message) => {
              const day = dayOf(message.createdAt)
              const showDay = day !== lastDay
              lastDay = day

              if (message.isSystem) {
                return (
                  <li key={message.id}>
                    {showDay && <DayDivider label={day} />}
                    <p className="mx-auto max-w-md rounded-2xl bg-secondary/60 px-4 py-2.5 text-center text-sm text-muted-foreground">
                      {message.body}
                    </p>
                  </li>
                )
              }

              return (
                <li key={message.id}>
                  {showDay && <DayDivider label={day} />}
                  <div
                    className={cn(
                      'group flex gap-2',
                      message.isMine ? 'flex-row-reverse' : 'flex-row',
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[75%]',
                        message.isMine
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-foreground',
                        message.deletedAt && 'italic opacity-70',
                        message.flagged && !message.deletedAt && 'ring-2 ring-destructive/40',
                      )}
                    >
                      {!message.isMine && (
                        <p className="mb-1 font-display text-sm font-bold text-primary">
                          {message.authorName}
                        </p>
                      )}

                      {message.replyTo && (
                        <p
                          className={cn(
                            'mb-2 rounded-lg border-l-2 px-3 py-1.5 text-sm',
                            message.isMine
                              ? 'border-primary-foreground/40 bg-primary-foreground/10 text-primary-foreground/80'
                              : 'border-primary/40 bg-card/70 text-muted-foreground',
                          )}
                        >
                          <span className="font-semibold">{message.replyTo.authorName}: </span>
                          {message.replyTo.excerpt}
                        </p>
                      )}

                      {message.body && (
                        <p className="whitespace-pre-wrap text-pretty">{message.body}</p>
                      )}

                      <AttachmentList
                        attachments={message.attachments}
                        onOwnBubble={message.isMine}
                      />

                      <p
                        className={cn(
                          'mt-1 text-xs',
                          message.isMine ? 'text-primary-foreground/70' : 'text-muted-foreground',
                        )}
                      >
                        {timeOf(message.createdAt)}
                        {message.editedAt && ' · edited'}
                        {message.flagged && !message.deletedAt && ' · reported'}
                      </p>
                    </div>

                    {!message.deletedAt && (
                      <div className="relative self-end">
                        <button
                          type="button"
                          onClick={() => setOpenMenu(openMenu === message.id ? null : message.id)}
                          aria-label={`Actions for ${message.authorName}'s message`}
                          aria-expanded={openMenu === message.id}
                          className="grid size-11 place-items-center rounded-lg text-muted-foreground opacity-0 transition-opacity hover:bg-secondary focus-visible:opacity-100 group-hover:opacity-100"
                        >
                          <MoreHorizontal className="size-5" aria-hidden />
                        </button>

                        {openMenu === message.id && (
                          <div className="absolute bottom-12 z-10 w-44 overflow-hidden rounded-xl border-2 border-border bg-card shadow-lifted ltr:right-0">
                            {canPost && (
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyTo(message)
                                  setOpenMenu(null)
                                }}
                                className="flex min-h-11 w-full items-center gap-2 px-4 text-left text-sm font-semibold hover:bg-secondary"
                              >
                                <Reply className="size-4" aria-hidden />
                                Reply
                              </button>
                            )}
                            {(message.isMine || isModerator) && (
                              <button
                                type="button"
                                onClick={() => remove(message.id)}
                                className="flex min-h-11 w-full items-center gap-2 px-4 text-left text-sm font-semibold text-destructive hover:bg-secondary"
                              >
                                <Trash2 className="size-4" aria-hidden />
                                Remove
                              </button>
                            )}
                            {!message.isMine && (
                              <button
                                type="button"
                                onClick={() => report(message.id)}
                                className="flex min-h-11 w-full items-center gap-2 px-4 text-left text-sm font-semibold hover:bg-secondary"
                              >
                                <Flag className="size-4" aria-hidden />
                                Report
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-border p-4 sm:p-5">
        {error && (
          <Alert variant="error" className="mb-3">
            {error}
          </Alert>
        )}
        {actionError && (
          <Alert variant="error" className="mb-3">
            {actionError}
          </Alert>
        )}

        {!live ? (
          <p className="mb-3 text-sm text-muted-foreground">
            Paused while this tab is in the background — it will catch up when you come back.
          </p>
        ) : (
          <p className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Radio
              className={cn('size-4', mode === 'stream' ? 'text-success' : 'text-muted-foreground')}
              aria-hidden
            />
            {mode === 'stream'
              ? 'Live'
              : mode === 'polling'
                ? 'Checking every few seconds'
                : 'Connecting…'}
          </p>
        )}

        {replyTo && (
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-secondary px-4 py-2.5">
            <p className="min-w-0 flex-1 truncate text-sm">
              <span className="font-semibold">Replying to {replyTo.authorName}: </span>
              {replyTo.body.slice(0, 80)}
            </p>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="grid size-9 shrink-0 place-items-center rounded-lg hover:bg-card"
              aria-label="Cancel reply"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        )}

        {canPost && (
          <PendingAttachments
            files={pending}
            onRemove={(id) => setPending((current) => current.filter((file) => file.id !== id))}
          />
        )}

        {canPost ? (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void send()
            }}
            className="flex items-end gap-3"
          >
            <label htmlFor="chat-body" className="sr-only">
              Write a message
            </label>
            <textarea
              id="chat-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              onKeyDown={(event) => {
                // Enter sends; Shift+Enter makes a new line.
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  void send()
                }
              }}
              rows={2}
              maxLength={4000}
              placeholder="Write a message…"
              className="max-h-40 min-h-[3.5rem] flex-1 resize-y rounded-xl border-2 border-input bg-card px-4 py-3 text-base"
            />

            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT_ATTRIBUTE}
              multiple
              className="sr-only"
              onChange={(event) => void upload(event.target.files)}
            />
            <Button
              type="button"
              size="lg"
              variant="outline"
              disabled={uploading || pending.length >= 6}
              onClick={() => fileRef.current?.click()}
              title={`Attach a file — ${ACCEPTED_LABEL}`}
            >
              {uploading ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <Paperclip aria-hidden />
              )}
              <span className="sr-only">Attach a file ({ACCEPTED_LABEL})</span>
            </Button>

            <Button
              type="submit"
              size="lg"
              disabled={sending || (!body.trim() && pending.length === 0)}
            >
              {sending ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
              <span className="sr-only sm:not-sr-only">Send</span>
            </Button>
          </form>
        ) : (
          <p className="text-pretty text-muted-foreground">
            You are viewing this conversation as a moderator. Join it to take part.
          </p>
        )}
      </div>
    </div>
  )
}

function DayDivider({ label }: { label: string }) {
  return (
    <p className="my-4 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
      {label}
    </p>
  )
}
