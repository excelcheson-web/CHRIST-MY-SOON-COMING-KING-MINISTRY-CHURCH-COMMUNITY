import { Quote } from 'lucide-react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { WordEditor, type WordDay } from '@/components/admin/word-editor'
import { requireUser } from '@/lib/auth'
import { startOfDay } from '@/lib/church-year'
import { pastorsWordToday } from '@/lib/home-content'
import { canManageContent } from '@/lib/permissions'
import { getSiteSettings } from '@/lib/site-settings'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "The Pastor's Word",
  robots: { index: false, follow: false },
}

export default async function AdminPastorsWordPage({
  searchParams,
}: {
  searchParams: { date?: string }
}) {
  const user = await requireUser('/admin/pastors-word')
  if (!canManageContent(user.role)) redirect('/dashboard?denied=word')

  const chosen =
    searchParams.date && !Number.isNaN(Date.parse(searchParams.date))
      ? startOfDay(new Date(searchParams.date))
      : startOfDay()

  const [word, settings] = await Promise.all([pastorsWordToday(chosen), getSiteSettings()])

  const initial: WordDay = {
    date: chosen.toISOString().slice(0, 10),
    title: word.title,
    body: word.body,
    reference: word.reference,
    author: word.author,
    written: word.written,
  }

  return (
    <div className="container py-14 sm:py-20">
      <div className="mb-10 flex items-center gap-4">
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-royal-gradient text-primary-foreground">
          <Quote className="size-8" aria-hidden />
        </span>
        <div>
          <p className="font-display text-sm font-bold uppercase tracking-[0.16em] text-primary">
            Home page
          </p>
          <h1 className="mt-1 text-3xl sm:text-4xl">The Pastor&rsquo;s Word</h1>
        </div>
      </div>

      <div className="max-w-3xl">
        <p className="mb-8 text-pretty text-muted-foreground">
          This section fills itself in. If nobody writes anything, the home page shows a word from
          a bundled rotation that changes daily — so it is never empty, and writing one is a choice
          rather than a daily obligation.
        </p>

        <WordEditor initial={initial} defaultAuthor={settings.name} />
      </div>
    </div>
  )
}
