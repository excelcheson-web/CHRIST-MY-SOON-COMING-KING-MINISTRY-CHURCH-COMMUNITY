import type { Metadata } from 'next'

import { Suspense } from 'react'

import { AnnouncementBoard } from '@/components/home/announcement-board'
import { BirthdayCelebration } from '@/components/home/birthday-celebration'
import { ChurchCalendar } from '@/components/home/church-calendar'
import { FeaturedTestimonies } from '@/components/home/featured-testimonies'
import { Hero } from '@/components/home/hero'
import { Invitation } from '@/components/home/invitation'
import { LiveBanner } from '@/components/home/live-banner'
import { Mandate } from '@/components/home/mandate'
import { PastorsWord } from '@/components/home/pastors-word'
import { QuickLinks } from '@/components/home/quick-links'
import { ServiceTimes } from '@/components/home/service-times'
import { Teasers } from '@/components/home/teasers'
import { auth } from '@/lib/auth'
import { birthdays, loadAnnouncements, pastorsWordToday, upcomingChurchDates } from '@/lib/home-content'
import { getSiteSettings } from '@/lib/site-settings'

/*
 * Was static with a five-minute revalidate. It is now per-viewer: the
 * birthday celebration and the departmental notices depend on who is asking,
 * and a shared cached copy would show one member another member's board.
 */
export const dynamic = 'force-dynamic'


export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()
  return {
    title: `${settings.name} — a deliverance and Holy Ghost church family`,
    description: settings.description,
    alternates: { canonical: '/' },
  }
}

/**
 * Church schema for search engines, built from the live settings.
 *
 * `name` is the ministry; `alternateName` carries the slogan and the
 * abbreviation, so a search for "Praise Arena" or "CMSCK" still finds the
 * church under its proper name.
 */
function buildStructuredData(settings: {
  legalName: string
  name: string
  shortName: string
  aka: string
  description: string
  url: string
  contact: { email: string; phone: string }
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Church',
    name: settings.legalName,
    alternateName: [settings.aka, settings.shortName].filter(Boolean),
    description: settings.description,
    url: settings.url,
    email: settings.contact.email,
    telephone: settings.contact.phone,
  }
}

export default async function HomePage() {
  const session = await auth()
  const signedIn = Boolean(session?.user)

  const [settings, word, calendar, announcements, birthdayList] = await Promise.all([
    getSiteSettings(),
    pastorsWordToday(),
    upcomingChurchDates(4),
    loadAnnouncements(session?.user),
    signedIn ? birthdays() : Promise.resolve({ today: [], soon: [] }),
  ])

  const todaysBirthdays = birthdayList.today
  const structuredData = buildStructuredData(settings)

  return (
    <>
      <script
        type="application/ld+json"
        // Static, developer-authored object — no user input reaches this string.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      {/* Above the hero, because a service happening right now outranks
          everything else on the page. Renders nothing when nothing is live. */}
      <LiveBanner />

      <Hero />

      {/*
        Birthdays first when there are any — it is the warmest thing on the page
        and it is time-sensitive in a way nothing else here is. Members only:
        `birthdays()` already filters to people who opted in, and a guest has no
        business seeing who in this church is having a birthday.
      */}
      {signedIn && <BirthdayCelebration people={todaysBirthdays} />}

      {/*
        The order below is deliberate, and so is the alternating tone.

        **Order** runs from what a stranger needs to what a member needs. When
        we gather is the first question anybody has about a church, so it sits
        directly under the hero. Then the word for today, then the calendar and
        the notice boards, then what this house believes, then the ways in.

        **Tone** alternates because everything on this page used to sit on the
        same near-white background, and eight sections deep it stopped reading
        as sections at all — just one long scroll. `Band` gives every other
        section a tinted full-bleed background, so the page has a rhythm and
        the dark hero and invitation bookend it.
      */}
      <Band tone="tinted">
        <ServiceTimes services={settings.serviceTimes} address={settings.contact.address} />
      </Band>

      <PastorsWord word={word} author={settings.name} />

      <Band tone="tinted">
        <ChurchCalendar dates={calendar} />
      </Band>

      <AnnouncementBoard general={announcements.general} departmental={announcements.departmental} />

      <Band tone="tinted">
        <Mandate />
      </Band>

      <QuickLinks />

      {/*
        Testimonies and the two doors share one tinted band rather than taking
        one each. `FeaturedTestimonies` renders nothing when no testimony has
        been approved yet, and a strict every-other-section alternation would
        then collapse into three plain sections in a row — the rhythm cannot
        depend on a component that is allowed to disappear.
      */}
      <Band tone="tinted">
        {/* Streams in so a database round-trip never delays the hero. */}
        <Suspense fallback={null}>
          <FeaturedTestimonies />
        </Suspense>
        <Teasers />
      </Band>

      <Invitation />
    </>
  )
}

/**
 * A full-bleed background behind one home-page section.
 *
 * The sections themselves each render `container`, so this only has to supply
 * the colour — which keeps every decision about the page's rhythm in this file
 * rather than scattered across nine components that cannot see one another.
 */
function Band({ tone, children }: { tone: 'plain' | 'tinted'; children: React.ReactNode }) {
  return <div className={tone === 'tinted' ? 'bg-secondary/40' : undefined}>{children}</div>
}
