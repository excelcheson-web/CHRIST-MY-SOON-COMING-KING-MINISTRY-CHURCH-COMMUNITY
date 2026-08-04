import { ConversationType } from '@prisma/client'
import { MessageCircle, Users } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { Alert } from '@/components/ui/alert'
import { requireUser } from '@/lib/auth'
import { conversationTitle, conversationTypeLabels, getChatSettings } from '@/lib/chat'
import { prisma } from '@/lib/prisma'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Chat',
  robots: { index: false, follow: false },
}

const typeEmoji: Record<ConversationType, string> = {
  DIRECT: '💬',
  GROUP: '👥',
  MINISTRY: '⛪',
  SMALL_GROUP: '🏠',
  PRAYER_GROUP: '🙏',
}

function whenLabel(iso: string | null) {
  if (!iso) return ''
  const date = new Date(iso)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default async function ChatPage() {
  const user = await requireUser('/chat')

  if (!prisma) {
    return (
      <div className="container py-14 sm:py-20">
        <h1 className="text-3xl sm:text-4xl">Chat</h1>
        <Alert variant="info" className="mt-8">
          No database is connected yet.
        </Alert>
      </div>
    )
  }

  const [settings, me, memberships] = await Promise.all([
    getChatSettings(prisma),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { chatBannedAt: true, chatBanReason: true },
    }),
    prisma.conversationMember.findMany({
      where: { userId: user.id, leftAt: null },
      select: {
        muted: true,
        lastReadSeq: true,
        conversation: {
          select: {
            id: true,
            type: true,
            title: true,
            lastMessageAt: true,
            members: {
              where: { userId: { not: user.id }, leftAt: null },
              select: { user: { select: { name: true } } },
              take: 8,
            },
            _count: { select: { members: true } },
            messages: {
              orderBy: { seq: 'desc' },
              take: 1,
              select: { body: true, deletedAt: true, seq: true },
            },
          },
        },
      },
    }),
  ])

  const conversations = memberships
    .map((m) => {
      const c = m.conversation
      const last = c.messages[0]
      return {
        id: c.id,
        type: c.type,
        title: conversationTitle(c, c.members.map((row) => row.user)),
        preview: last ? (last.deletedAt ? 'Message removed' : last.body.slice(0, 110)) : null,
        lastMessageAt: c.lastMessageAt?.toISOString() ?? null,
        // Cheap approximation from the tail seq — exact counts are on the thread.
        hasUnread: (last?.seq ?? 0) > m.lastReadSeq,
        muted: m.muted,
        memberCount: c._count.members,
      }
    })
    .sort((a, b) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? ''))

  return (
    <div className="container py-14 sm:py-20">
      <div className="flex items-center gap-4">
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-royal-gradient text-primary-foreground">
          <MessageCircle className="size-8" aria-hidden />
        </span>
        <div>
          <p className="font-display text-sm font-bold uppercase tracking-[0.16em] text-primary">
            Community
          </p>
          <h1 className="mt-1 text-3xl sm:text-4xl">Chat</h1>
        </div>
      </div>

      {!settings.enabled && (
        <Alert variant="info" className="mt-8">
          Chat is switched off across the platform at the moment.
        </Alert>
      )}

      {me?.chatBannedAt && (
        <Alert variant="error" className="mt-8">
          {me.chatBanReason || 'You cannot post in chat at the moment.'} You can still read.
        </Alert>
      )}

      <p className="mt-8 max-w-2xl text-pretty text-muted-foreground">
        Your ministry, small group and prayer group conversations appear here automatically.
        Messages refresh every few seconds while this tab is open.
      </p>

      {conversations.length === 0 ? (
        <div className="mt-10 rounded-3xl border-2 border-dashed border-border bg-secondary/40 p-12 text-center">
          <Users className="mx-auto size-10 text-muted-foreground" aria-hidden />
          <p className="mt-4 font-display text-lg font-bold text-foreground">No conversations yet</p>
          <p className="mx-auto mt-2 max-w-md text-pretty text-muted-foreground">
            Join a{' '}
            <Link href="/prayer/groups" className="font-semibold text-primary hover:underline">
              prayer group
            </Link>{' '}
            and its conversation appears here straight away.
          </p>
        </div>
      ) : (
        <ul className="mt-10 space-y-3">
          {conversations.map((conversation) => (
            <li key={conversation.id}>
              <Link
                href={`/chat/${conversation.id}`}
                className={cn(
                  'flex items-center gap-4 rounded-2xl border-2 bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lifted motion-reduce:hover:translate-y-0',
                  conversation.hasUnread && !conversation.muted
                    ? 'border-primary/40'
                    : 'border-border',
                )}
              >
                <span
                  aria-hidden
                  className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-xl"
                >
                  {typeEmoji[conversation.type]}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-lg font-bold text-foreground">
                      {conversation.title}
                    </span>
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {conversationTypeLabels[conversation.type]}
                    </span>
                    {conversation.muted && (
                      <span className="text-xs font-semibold text-muted-foreground">muted</span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-muted-foreground">
                    {conversation.preview ?? 'No messages yet'}
                  </span>
                </span>

                <span className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className="text-sm text-muted-foreground">
                    {whenLabel(conversation.lastMessageAt)}
                  </span>
                  {conversation.hasUnread && !conversation.muted && (
                    <span className="grid size-3 place-items-center rounded-full bg-primary">
                      <span className="sr-only">Unread messages</span>
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
