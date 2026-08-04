import { HeartHandshake, ShieldCheck, Users } from 'lucide-react'
import type { Metadata } from 'next'

import { ContactForm } from '@/components/salvation/contact-form'
import { JourneyShell } from '@/components/salvation/journey-shell'
import { Alert } from '@/components/ui/alert'
import { isDatabaseConfigured } from '@/lib/prisma'
import { getSiteSettings } from '@/lib/site-settings'

/*
 * Static, but refreshed every five minutes.
 *
 * These pages read admin-editable content (ministry details, page copy, the
 * gospel wording) that falls back to a bundled file when the database is
 * unreachable. Prerendering them with no revalidation baked whichever answer
 * the build happened to get: a build that ran while Neon was asleep shipped the
 * placeholder copy permanently. Saving in /admin still revalidates instantly —
 * this is the safety net for the build itself.
 */
export const revalidate = 300


export const metadata: Metadata = {
  title: 'Tell us you are here',
  description: 'Leave your details so someone from the church can walk with you from here.',
  alternates: { canonical: '/salvation/contact' },
  robots: { index: false, follow: true },
}

const promises = [
  { Icon: Users, text: 'One real person from our team will get in touch — not a mailing list.' },
  { Icon: HeartHandshake, text: 'No pressure, no sales pitch. Just someone to answer questions.' },
  { Icon: ShieldCheck, text: 'Your details are never sold, shared or published.' },
]

export default async function SalvationContactPage() {
  const settings = await getSiteSettings()

  return (
    <JourneyShell
      step="contact"
      title="Do not do this alone"
      subtitle="Following Jesus was never meant to be a solo project. Leave your details and someone from the family will reach out."
    >
      {!isDatabaseConfigured && (
        <Alert variant="info" className="mb-8">
          Our online form is not switched on yet. Please email{' '}
          <a href={`mailto:${settings.contact.email}`} className="font-semibold underline">
            {settings.contact.email}
          </a>{' '}
          or call {settings.contact.phone} — we would genuinely love to hear from you.
        </Alert>
      )}

      <ul className="mb-10 space-y-3">
        {promises.map(({ Icon, text }) => (
          <li key={text} className="flex items-start gap-3">
            <Icon className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden />
            <span className="text-pretty text-foreground/90">{text}</span>
          </li>
        ))}
      </ul>

      <div className="rounded-3xl border-2 border-border bg-card p-6 shadow-soft sm:p-9">
        <ContactForm />
      </div>
    </JourneyShell>
  )
}
