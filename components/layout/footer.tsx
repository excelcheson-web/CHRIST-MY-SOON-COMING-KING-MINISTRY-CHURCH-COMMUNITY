import { Clock, Facebook, Heart, Instagram, Mail, MapPin, Phone, Youtube } from 'lucide-react'
import Link from 'next/link'

import { BrandMark } from '@/components/layout/brand'
import { legalDocs } from '@/content/legal'
import { footerNav } from '@/lib/site'
import { getSiteSettings, hasSocial } from '@/lib/site-settings'

/** Every page, plus the two account entry points. Built once at module scope. */
const exploreLinks = [
  ...footerNav.map(({ href, label }) => ({ href, label })),
  { href: '/register', label: 'Join us' },
  { href: '/login', label: 'Sign in' },
]

export async function Footer() {
  const settings = await getSiteSettings()

  /*
   * Built here rather than at module scope so the links follow the admin
   * settings instead of being frozen at import time.
   *
   * Accounts the ministry does not have are dropped entirely. The old code
   * rendered all three whatever they pointed at, so an unconfigured one was a
   * button that went to `#` — and a dead social icon on a church website reads
   * as a church nobody looks after.
   */
  const socialLinks = (
    [
      { key: 'facebook', label: 'Facebook', Icon: Facebook, href: settings.socials.facebook },
      { key: 'youtube', label: 'YouTube', Icon: Youtube, href: settings.socials.youtube },
      { key: 'instagram', label: 'Instagram', Icon: Instagram, href: settings.socials.instagram },
    ] as const
  ).filter((link) => hasSocial(link.href))

  return (
    <footer className="mt-24 border-t border-border bg-secondary/40">
      {/*
        A twelve-column grid rather than four equal ones. The old layout put a
        fourteen-item link list next to a three-item list and let the row take
        the height of the tallest — the footer was mostly white space with a
        column of links down one side of it. Widths here are chosen so the four
        blocks come out roughly the same height.
      */}
      <div className="container grid gap-x-10 gap-y-12 py-16 sm:grid-cols-2 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="flex items-center gap-3">
            <BrandMark className="size-12" />
            <div>
              <p className="font-display text-lg font-extrabold leading-tight text-foreground">
                {settings.name}
              </p>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {settings.shortName} · {settings.aka}
              </p>
            </div>
          </div>
          <p className="mt-5 max-w-sm text-pretty text-muted-foreground">{settings.tagline}</p>

          <ul className="mt-6 flex gap-3">
            {socialLinks.map(({ key, label, Icon, href }) => (
              <li key={key}>
                <a
                  href={href}
                  className="grid size-12 place-items-center rounded-xl border-2 border-border bg-card text-primary transition-colors hover:border-primary/40 hover:bg-primary-soft"
                  {...(href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}
                >
                  <Icon className="size-5" aria-hidden />
                  <span className="sr-only">{label}</span>
                </a>
              </li>
            ))}
          </ul>

          <Link
            href="/register"
            className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-6 font-display font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Heart className="size-5" aria-hidden />
            Join the family
          </Link>
        </div>

        <nav aria-labelledby="footer-explore" className="lg:col-span-3">
          <h2 id="footer-explore" className="font-display text-base font-bold text-foreground">
            Explore
          </h2>
          {/* Two short columns beat one long one — same links, half the height. */}
          <ul className="mt-4 grid grid-cols-2 gap-x-4">
            {exploreLinks.map((item) => (
              <li key={`${item.href}-${item.label}`}>
                <Link
                  href={item.href}
                  className="-mx-2 flex min-h-11 items-center rounded-lg px-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <section aria-labelledby="footer-times" className="lg:col-span-3">
          <h2 id="footer-times" className="font-display text-base font-bold text-foreground">
            When we meet
          </h2>
          <ul className="mt-4 space-y-4">
            {settings.serviceTimes.map((service) => (
              <li key={`${service.day}-${service.label}`} className="flex gap-3">
                <Clock className="mt-0.5 size-5 shrink-0 text-accent-ink" aria-hidden />
                <span className="min-w-0">
                  <span className="block font-display font-bold text-foreground">
                    {service.day}
                  </span>
                  <span className="block text-pretty text-sm text-muted-foreground">
                    {service.label}
                  </span>
                  <span className="mt-0.5 block text-sm font-semibold text-primary">
                    {service.time}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="footer-contact" className="lg:col-span-2">
          <h2 id="footer-contact" className="font-display text-base font-bold text-foreground">
            Reach us
          </h2>
          <ul className="mt-4 space-y-3 text-muted-foreground">
            {/* min-w-0: a flex item will not shrink below its content width
                without it, so a long address pushed the whole page sideways at
                1024px rather than wrapping inside its column. */}
            <li className="flex min-w-0 gap-3">
              <Mail className="mt-0.5 size-5 shrink-0 text-accent-ink" aria-hidden />
              <a
                href={`mailto:${settings.contact.email}`}
                className="min-w-0 break-all rounded transition-colors hover:text-foreground"
              >
                {settings.contact.email}
              </a>
            </li>
            <li className="flex gap-3">
              <Phone className="mt-0.5 size-5 shrink-0 text-accent-ink" aria-hidden />
              <a
                href={`tel:${settings.contact.phone.replace(/\s/g, '')}`}
                className="rounded transition-colors hover:text-foreground"
              >
                {settings.contact.phone}
              </a>
            </li>
            <li className="flex gap-3">
              <MapPin className="mt-0.5 size-5 shrink-0 text-accent-ink" aria-hidden />
              <span className="text-pretty">{settings.contact.address}</span>
            </li>
          </ul>
        </section>
      </div>

      {/*
        The information documents run across the bottom rather than standing as
        a fifth column. As a column they were the tallest thing in the footer
        and left the other four sitting above a band of empty space — and this
        is where a reader expects to find them anyway.
      */}
      <div className="border-t border-border">
        <div className="container py-6">
          <nav aria-label="About this platform">
            <ul className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1 sm:justify-start">
              {legalDocs.map((doc) => (
                <li key={doc.slug}>
                  <Link
                    href={`/${doc.slug}`}
                    className="flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    {doc.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="container flex flex-col items-center justify-between gap-3 py-7 text-center text-sm text-muted-foreground sm:flex-row sm:text-left">
          <p>
            © {new Date().getFullYear()} {settings.legalName}. All rights reserved.
          </p>
          <p className="font-display font-semibold text-primary">Jesus is coming soon. ✝️</p>
        </div>
      </div>
    </footer>
  )
}
