import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { ProfileEditor } from '@/components/community/profile-editor'
import { PageHero } from '@/components/page-hero'
import { requireUser } from '@/lib/auth'
import {
  ensureProfile,
  interestTags,
  skillTags,
  spiritualGifts,
} from '@/lib/profiles'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Your profile',
  robots: { index: false, follow: false },
}

export default async function ProfilePage() {
  const user = await requireUser('/community/profile')
  const profile = await ensureProfile(user.id)

  return (
    <>
      <PageHero
        eyebrow="Your account"
        title="Your profile"
        subtitle="Tell the church family as much or as little as you like. Every detail is hidden until you choose otherwise."
        photo="together"
        crumbs={[
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/community', label: 'Community' },
        ]}
      />

      <div className="container pb-20 pt-4">
        <div className="mx-auto max-w-3xl">
          <Link
            href={`/community/members/${user.id}`}
            className="mb-8 inline-flex min-h-11 items-center gap-2 rounded-lg font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-5" aria-hidden />
            See how your profile looks
          </Link>

          <ProfileEditor
            gifts={spiritualGifts}
            interests={interestTags}
            skills={skillTags}
            initial={{
              headline: profile?.headline ?? '',
              bio: profile?.bio ?? '',
              neighbourhood: profile?.neighbourhood ?? '',
              phone: profile?.phone ?? '',
              address: profile?.address ?? '',
              profession: profile?.profession ?? '',
              // Their own photo, through the same authenticated route everyone
              // else sees it by — so a broken route shows up here first.
              avatar: profile?.avatarKey ? `/api/members/${user.id}/avatar` : null,
              spiritualGifts: (profile?.spiritualGifts ?? []).join('\n'),
              interests: (profile?.interests ?? []).join('\n'),
              skills: (profile?.skills ?? []).join('\n'),
              mentorAvailable: profile?.mentorAvailable ?? false,
              seekingMentor: profile?.seekingMentor ?? false,
              listed: profile?.listed ?? true,
              showEmail: profile?.showEmail ?? false,
              showPhone: profile?.showPhone ?? false,
              showBirthday: profile?.showBirthday ?? false,
              showNeighbourhood: profile?.showNeighbourhood ?? true,
              showAddress: profile?.showAddress ?? false,
              showProfession: profile?.showProfession ?? true,
              dndUntil: profile?.dndUntil?.toISOString() ?? null,
            }}
          />
        </div>
      </div>
    </>
  )
}
