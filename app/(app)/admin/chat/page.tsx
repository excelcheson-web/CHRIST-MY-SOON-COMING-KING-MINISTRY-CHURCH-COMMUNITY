import { MessageCircle } from 'lucide-react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { ChatAdmin, type BannedRow, type ReportRow } from '@/components/admin/chat-admin'
import { Alert } from '@/components/ui/alert'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireUser } from '@/lib/auth'
import { canModerateChat, getChatSettings } from '@/lib/chat'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Chat moderation',
  robots: { index: false, follow: false },
}

export default async function AdminChatPage() {
  const user = await requireUser('/admin/chat')
  if (!canModerateChat(user.role)) redirect('/dashboard?denied=chat')

  if (!prisma) {
    return (
      <div className="container py-14 sm:py-20">
        <h1 className="text-3xl sm:text-4xl">Chat moderation</h1>
        <Alert variant="info" className="mt-8">
          No database is connected yet.
        </Alert>
      </div>
    )
  }

  const [settings, reportRows, bannedRows, messageCount, conversationCount] = await Promise.all([
    getChatSettings(prisma),
    prisma.messageReport.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        reason: true,
        status: true,
        createdAt: true,
        reportedBy: { select: { name: true } },
        message: {
          select: {
            id: true,
            body: true,
            deletedAt: true,
            conversationId: true,
            authorId: true,
            author: { select: { name: true } },
          },
        },
      },
    }),
    prisma.user.findMany({
      where: { chatBannedAt: { not: null } },
      select: { id: true, name: true, email: true, chatBanReason: true },
      orderBy: { chatBannedAt: 'desc' },
    }),
    prisma.message.count(),
    prisma.conversation.count(),
  ])

  const reports: ReportRow[] = reportRows.map((row) => ({
    id: row.id,
    reason: row.reason,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    reportedByName: row.reportedBy.name,
    messageId: row.message.id,
    messageBody: row.message.body,
    messageDeleted: row.message.deletedAt !== null,
    authorName: row.message.author?.name ?? 'Former member',
    authorId: row.message.authorId,
    conversationId: row.message.conversationId,
  }))

  const banned: BannedRow[] = bannedRows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    reason: row.chatBanReason,
  }))

  return (
    <div className="container py-14 sm:py-20">
      <div className="flex items-center gap-4">
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-royal-gradient text-primary-foreground">
          <MessageCircle className="size-8" aria-hidden />
        </span>
        <div>
          <p className="font-display text-sm font-bold uppercase tracking-[0.16em] text-primary">
            Moderation
          </p>
          <h1 className="mt-1 text-3xl sm:text-4xl">Chat</h1>
        </div>
      </div>

      <Alert variant="info" className="mt-8">
        Moderators can open any conversation. That access is logged as read-only — you do not
        appear in the member list and nothing you do marks it as read. Your terms of use need to
        say this plainly.
      </Alert>

      <div className="mt-8 grid gap-5 sm:grid-cols-4">
        <Card className={reports.length > 0 ? 'border-destructive/35 bg-destructive/5' : undefined}>
          <CardHeader className="pb-3">
            <CardDescription className="font-semibold">Reports waiting</CardDescription>
            <CardTitle className="text-4xl">{reports.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="font-semibold">Conversations</CardDescription>
            <CardTitle className="text-4xl">{conversationCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="font-semibold">Messages</CardDescription>
            <CardTitle className="text-4xl">{messageCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={banned.length > 0 ? 'border-accent/40 bg-accent-soft/40' : undefined}>
          <CardHeader className="pb-3">
            <CardDescription className="font-semibold">Banned</CardDescription>
            <CardTitle className="text-4xl">{banned.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="mt-14">
        <ChatAdmin reports={reports} banned={banned} settings={settings} />
      </div>
    </div>
  )
}
