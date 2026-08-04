import { Settings } from 'lucide-react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { SettingsEditor, type SettingsFormValues } from '@/components/admin/settings-editor'
import { Alert } from '@/components/ui/alert'
import { requireUser } from '@/lib/auth'
import { canManageContent } from '@/lib/permissions'
import { isDatabaseConfigured } from '@/lib/prisma'
import { getSiteSettings } from '@/lib/site-settings'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Ministry details',
  robots: { index: false, follow: false },
}

export default async function AdminSettingsPage() {
  const user = await requireUser('/admin/settings')
  if (!canManageContent(user.role)) redirect('/dashboard?denied=content')

  const settings = await getSiteSettings()

  const values: SettingsFormValues = {
    name: settings.name,
    legalName: settings.legalName,
    shortName: settings.shortName,
    aka: settings.aka,
    tagline: settings.tagline,
    description: settings.description,
    contactEmail: settings.contact.email,
    contactPhone: settings.contact.phone,
    contactAddress: settings.contact.address,
    serviceTimes: settings.serviceTimes,
    facebook: settings.socials.facebook,
    youtube: settings.socials.youtube,
    instagram: settings.socials.instagram,
    source: settings.source,
  }

  return (
    <div className="container py-14 sm:py-20">
      <div className="flex items-center gap-4">
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-royal-gradient text-primary-foreground">
          <Settings className="size-8" aria-hidden />
        </span>
        <div>
          <p className="font-display text-sm font-bold uppercase tracking-[0.16em] text-primary">
            Content
          </p>
          <h1 className="mt-1 text-3xl sm:text-4xl">Ministry details</h1>
        </div>
      </div>

      <p className="mt-6 max-w-2xl text-pretty text-muted-foreground">
        Your name, contact details and service times, used everywhere on the site at once — the
        header, the footer, the homepage, the events page and what people see when they share a
        link.
      </p>

      {!isDatabaseConfigured && (
        <Alert variant="info" className="mt-8">
          No database is connected, so changes cannot be saved yet.
        </Alert>
      )}

      <div className="mt-10 max-w-3xl">
        <SettingsEditor settings={values} />
      </div>
    </div>
  )
}
