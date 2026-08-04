import { ArrowLeft, HeartHandshake, ShieldCheck, Users } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { BrandLink, BrandMark } from '@/components/layout/brand'
import { getSiteSettings } from '@/lib/site-settings'

const promises = [
  { Icon: Users, text: 'Free, and open to everyone — whatever your age.' },
  { Icon: ShieldCheck, text: 'Your details stay private. We never sell them.' },
  { Icon: HeartHandshake, text: 'One account, ready for everything we build next.' },
]

/**
 * Deliberately quieter than the public shell: no main navigation, one way back
 * home, and nothing competing with the form.
 */
export default async function AuthLayout({ children }: { children: ReactNode }) {
  const settings = await getSiteSettings()

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-2">
      {/* Welcome panel — decorative support, so it is hidden from small screens. */}
      <aside className="relative hidden overflow-hidden bg-royal-gradient p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-dot-grid opacity-[0.16]" />
          <div className="absolute -bottom-40 -left-24 size-[30rem] rounded-full bg-accent/20 blur-3xl" />
        </div>

        <Link href="/" className="relative flex items-center gap-3 self-start rounded-2xl">
          <BrandMark onDark className="size-14" />
          <span className="flex flex-col leading-tight">
            <span className="font-display text-lg font-extrabold">{settings.name}</span>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
              {settings.aka ? `${settings.shortName} · ${settings.aka}` : settings.shortName}
            </span>
          </span>
        </Link>

        <div className="relative max-w-md">
          <h2 className="font-display text-4xl font-extrabold leading-tight">
            You are already part of the family — this just makes it official.
          </h2>
          <ul className="mt-10 space-y-5">
            {promises.map(({ Icon, text }) => (
              <li key={text} className="flex items-start gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/12 backdrop-blur">
                  <Icon className="size-5 text-accent" aria-hidden />
                </span>
                <span className="text-pretty text-white/85">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-white/60">
          © {new Date().getFullYear()} {settings.legalName}
        </p>
      </aside>

      <main id="main-content" tabIndex={-1} className="flex flex-col focus:outline-none">
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 lg:hidden">
          <BrandLink />
        </div>

        <div className="flex flex-1 items-center justify-center px-5 py-12 sm:px-8">
          <div className="w-full max-w-md">
            <Link
              href="/"
              className="mb-8 inline-flex min-h-11 items-center gap-2 rounded-lg font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-5" aria-hidden />
              Back to home
            </Link>
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
