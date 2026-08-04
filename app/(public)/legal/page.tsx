import { ArrowRight, ShieldCheck } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { PageHero } from '@/components/page-hero'
import { legalDocs } from '@/content/legal'
import { getSiteSettings } from '@/lib/site-settings'
import { formatDate } from '@/lib/utils'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'About this platform',
  description:
    'Terms and conditions, privacy, community guidelines, safeguarding and accessibility — everything about how this platform works and how it looks after you.',
  alternates: { canonical: '/legal' },
}

export default async function LegalHubPage() {
  const settings = await getSiteSettings()

  return (
    <>
      <PageHero
        eyebrow="About this platform"
        title="How this platform works"
        subtitle="What we ask of you, what you can expect from us, and how your details are looked after. Written in plain English — because a document nobody can read protects nobody."
      />

      <div className="container pb-20 pt-4">
        <ul className="grid gap-5 md:grid-cols-2">
          {legalDocs.map((doc) => (
            <li key={doc.slug}>
              <Link
                href={`/${doc.slug}`}
                className="group flex h-full flex-col gap-4 rounded-3xl border-2 border-border bg-card p-7 shadow-soft transition-all hover:-translate-y-1 hover:border-primary/35 hover:shadow-lifted motion-reduce:hover:translate-y-0"
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <ShieldCheck className="size-6" aria-hidden />
                </span>
                <span>
                  <span className="flex items-center gap-2 font-display text-xl font-bold text-foreground">
                    {doc.title}
                    <ArrowRight
                      className="size-5 text-primary transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
                      aria-hidden
                    />
                  </span>
                  <span className="mt-1.5 block text-pretty text-muted-foreground">
                    {doc.summary}
                  </span>
                </span>
                <span className="mt-auto pt-2 text-sm text-muted-foreground">
                  Updated {formatDate(new Date(`${doc.updated}T00:00:00Z`))}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-12 rounded-3xl border-2 border-border bg-secondary/40 p-8 sm:p-10">
          <h2 className="text-2xl">The short version</h2>
          <ul className="mt-6 grid gap-4 text-pretty text-muted-foreground sm:grid-cols-2">
            <li className="flex gap-3">
              <span aria-hidden className="text-xl">
                🔒
              </span>
              <span>
                <strong className="block font-display font-bold text-foreground">
                  We do not sell your data
                </strong>
                No advertising, no third-party tracking, no analytics cookies. There is
                nothing to buy here.
              </span>
            </li>
            <li className="flex gap-3">
              <span aria-hidden className="text-xl">
                🏠
              </span>
              <span>
                <strong className="block font-display font-bold text-foreground">
                  Your address stays yours
                </strong>
                Hidden by default, with its own switch separate from your phone and email.
              </span>
            </li>
            <li className="flex gap-3">
              <span aria-hidden className="text-xl">
                🙏
              </span>
              <span>
                <strong className="block font-display font-bold text-foreground">
                  Prayer requests never leave this server
                </strong>
                Only published sermon transcripts are ever sent to an AI provider, and the
                code will not compile if that changes.
              </span>
            </li>
            <li className="flex gap-3">
              <span aria-hidden className="text-xl">
                ✉️
              </span>
              <span>
                <strong className="block font-display font-bold text-foreground">
                  Ask us to delete it and we will
                </strong>
                Email{' '}
                <a
                  href={`mailto:${settings.contact.email}`}
                  className="font-semibold text-primary hover:underline"
                >
                  {settings.contact.email}
                </a>
                .
              </span>
            </li>
          </ul>
        </div>
      </div>
    </>
  )
}
