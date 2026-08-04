import { ArrowLeft, ShieldAlert } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ChatThread } from '@/components/chat/chat-thread'
import { Alert } from '@/components/ui/alert'
import { requireUser } from '@/lib/auth'
import {
  canModerateChat,
  checkAccess,
  conversationTitle,
  conversationTypeLabels,
} from '@/lib/chat'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Conversation',
  robots: { index: false, follow: false },
}

export default async function ConversationPage({ params }: { params: { id: string } }) {
  const user = await requireUser(`/chat/${params.id}`)
  if (!prisma) notFound()

  const access = await checkAccess(prisma, params.id, user)
  if (!access.ok) notFound()

  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      type: true,
      title: true,
      members: {
        where: { leftAt: null },
        select: { userId: true, user: { select: { name: true } } },
        take: 30,
      },
      _count: { select: { members: true } },
    },
  })
  if (!conversation) notFound()

  const others = conversation.members
    .filter((m) => m.userId !== user.id)
    .map((m) => m.user)

  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { chatBannedAt: true },
  })

  const canPost = !access.asModerator && !me?.chatBannedAt
  const isModerator = Boolean(access.membership?.isModerator) || canModerateChat(user.role)

  return (
    <div className="container py-8 sm:py-12">
      <Link
        href="/chat"
        className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-lg font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-5" aria-hidden />
        All conversations
      </Link>

      <div className="mx-auto max-w-3xl">
        <div className="mb-5">
          <h1 className="text-2xl sm:text-3xl">{conversationTitle(conversation, others)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {conversationTypeLabels[conversation.type]} · {conversation._count.members}{' '}
            {conversation._count.members === 1 ? 'person' : 'people'}
          </p>
        </div>

        {access.asModerator && (
          <Alert variant="info" className="mb-5">
            <ShieldAlert aria-hidden />
            You are reading this as a moderator. You are not a member, nothing you do marks it as
            read, and you cannot post here.
          </Alert>
        )}

        <ChatThread
          conversationId={conversation.id}
          canPost={canPost}
          isModerator={isModerator}
        />
      </div>
    </div>
  )
}
