import type { Metadata } from 'next'

import { ChannelBoard } from '@/components/community/channel-board'
import { PageHero } from '@/components/page-hero'
import { auth } from '@/lib/auth'
import { loadChannel } from '@/lib/channels'
import { canModerateCommunity } from '@/lib/community'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Worship we love',
  description: 'Songs that carried the church family this week, and why.',
  alternates: { canonical: '/community/worship' },
}

export default async function WorshipPage() {
  const session = await auth()
  const { viewer, posts, nextCursor } = await loadChannel('WORSHIP', session?.user)

  return (
    <>
      <PageHero
        eyebrow="Church family"
        title="Worship we love"
        subtitle="Share the song that carried you this week. Paste a YouTube link in the main feed and tell us why it mattered."
        photo="together"
        crumbs={[
          { href: '/', label: 'Home' },
          { href: '/community', label: 'Community' },
        ]}
      />

      <div className="container pb-20 pt-4">
        <ChannelBoard
          channel="WORSHIP"
          initial={{ posts, nextCursor }}
          signedIn={Boolean(viewer.id)}
          canModerate={canModerateCommunity(viewer.role)}
          placeholder="This song got me through the week because…"
          emptyLine="No songs shared yet. What have you had on repeat?"
        />
      </div>
    </>
  )
}
