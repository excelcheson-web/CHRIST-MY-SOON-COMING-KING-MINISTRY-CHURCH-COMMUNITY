import { ArrowRight, CalendarClock, Mail } from 'lucide-react'
import Link from 'next/link'

import { extractHeadings, Markdown } from '@/components/markdown'
import { PageHero } from '@/components/page-hero'
import type { LegalDoc } from '@/content/legal'
import { legalDocs } from '@/content/legal'
import type { SiteSettings } from '@/lib/site-settings'
import { formatDate } from '@/lib/utils'

/**
 * Fills `{{name}}`-style placeholders from the live site settings.
 *
 * The ministry's contact details are never written into the legal prose, so
 * changing the church's email address in the admin cannot leave a stale one
 * buried three screens down the privacy policy.
 *
 * Only the keys below are substituted. An unknown placeholder is left exactly
 * as written rather than replaced with `undefined` — a visible `{{oops}}` is a
 * bug somebody reports, and a silent blank in a legal document is not.
 */
export function fillPlaceholders(markdown: string, settings: SiteSettings) {
  const values: Record<string, string> = {
    name: settings.name,
    shortName: settings.shortName,
    legalName: settings.legalName,
    email: settings.contact.email,
    phone: settings.contact.phone,
    address: settings.contact.address,
    site: settings.url.replace(/^https?:\/\//, ''),
  }

  return markdown.replace(/\{\{(\w+)\}\}/g, (whole, key: string) => values[key] ?? whole)
}

export function LegalPage({ doc, settings }: { doc: LegalDoc; settings: SiteSettings }) {
  const body = fillPlaceholders(doc.body, settings)
  const headings = extractHeadings(body)
  const others = legalDocs.filter((entry) => entry.slug !== doc.slug)

  return (
    <>
      <PageHero
        eyebrow="About this platform"
        title={doc.title}
        subtitle={doc.summary}
        crumbs={[{ href: '/legal', label: 'Information' }]}
      />

      <div className="container pb-20 pt-4">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-16">
          <div className="min-w-0">
            <p className="mb-8 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <CalendarClock className="size-4 text-primary" aria-hidden />
              Last updated {formatDate(new Date(`${doc.updated}T00:00:00Z`))}
            </p>

            <Markdown className="max-w-3xl">{body}</Markdown>

            <div className="mt-14 rounded-3xl border-2 border-border bg-secondary/40 p-7">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold text-foreground">
                <Mail className="size-5 text-primary" aria-hidden />
                Questions about any of this?
              </h2>
              <p className="mt-2 text-pretty text-muted-foreground">
                Email us and a person will answer — not a form, and not a robot.
              </p>
              <a
                href={`mailto:${settings.contact.email}`}
                className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-6 font-display font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {settings.contact.email}
              </a>
            </div>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            {headings.length > 1 && (
              <nav aria-labelledby="on-this-page" className="mb-10">
                <h2
                  id="on-this-page"
                  className="font-display text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground"
                >
                  On this page
                </h2>
                <ul className="mt-4 space-y-1 border-l-2 border-border">
                  {headings.map((heading) => (
                    <li key={heading.id}>
                      <a
                        href={`#${heading.id}`}
                        className="-ml-0.5 block border-l-2 border-transparent py-2 pl-4 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                      >
                        {heading.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}

            <div>
              <h2 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Also worth reading
              </h2>
              <ul className="mt-4 space-y-2">
                {others.map((entry) => (
                  <li key={entry.slug}>
                    <Link
                      href={`/${entry.slug}`}
                      className="group flex items-start gap-2 rounded-xl border-2 border-border bg-card p-4 transition-colors hover:border-primary/30"
                    >
                      <span className="min-w-0">
                        <span className="block font-display font-bold text-foreground">
                          {entry.title}
                        </span>
                        <span className="mt-0.5 block text-sm text-muted-foreground">
                          {entry.summary}
                        </span>
                      </span>
                      <ArrowRight
                        className="mt-1 size-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none"
                        aria-hidden
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}
