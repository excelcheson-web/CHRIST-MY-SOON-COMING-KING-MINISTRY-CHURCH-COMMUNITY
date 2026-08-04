import type { Metadata } from 'next'

import { ChannelBoard } from '@/components/community/channel-board'
import { PageHero } from '@/components/page-hero'
import { auth } from '@/lib/auth'
import { loadChannel, namableMembers } from '@/lib/channels'
import { canModerateCommunity } from '@/lib/community'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Encouragement wall',
  description: 'Short, public thank-yous. Name somebody and tell them why.',
  alternates: { canonical: '/community/encouragement' },
}

export default async function EncouragementPage() {
  const session = await auth()
  const [{ viewer, posts, nextCursor }, people] = await Promise.all([
    loadChannel('ENCOURAGEMENT', session?.user),
    namableMembers(),
  ])

  return (
    <>
      <PageHero
        eyebrow="Church family"
        title="Encouragement wall"
        subtitle="Somebody carried you this week. Say so here, out loud, where they can see it."
        photo="worship"
        crumbs={[
          { href: '/', label: 'Home' },
          { href: '/community', label: 'Community' },
        ]}
      />

      <div className="container pb-20 pt-4">
        <ChannelBoard
          channel="ENCOURAGEMENT"
          initial={{ posts, nextCursor }}
          signedIn={Boolean(viewer.id)}
          canModerate={canModerateCommunity(viewer.role)}
          people={people}
          placeholder="Thank you for praying with me on Sunday — it made all the difference."
          emptyLine="Nothing on the wall yet. Be the first to thank somebody — it takes ten seconds and it can make a week."
        />
      </div>
    </>
  )
}
