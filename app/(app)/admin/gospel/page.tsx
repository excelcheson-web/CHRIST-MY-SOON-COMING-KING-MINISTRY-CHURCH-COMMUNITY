import { Heart } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { GospelEditor, type GospelFormValues } from '@/components/admin/gospel-editor'
import { Alert } from '@/components/ui/alert'
import { requireUser } from '@/lib/auth'
import { getGospelContent } from '@/lib/gospel-content'
import { canManageContent } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Salvation journey',
  robots: { index: false, follow: false },
}

export default async function AdminGospelPage() {
  const user = await requireUser('/admin/gospel')
  if (!canManageContent(user.role)) redirect('/dashboard?denied=content')

  const gospel = await getGospelContent()

  const initial: GospelFormValues = {
    steps: gospel.steps.map((step) => ({
      id: step.id,
      eyebrow: step.eyebrow,
      title: step.title,
      // Paragraphs become lines in the textarea, and lines become paragraphs
      // again on save.
      body: step.body.join('\n'),
      verseReference: step.verse.reference,
      verseText: step.verse.text,
      emoji: step.emoji,
    })),
    prayerTitle: gospel.prayer.title,
    prayerIntro: gospel.prayer.intro,
    prayerLines: gospel.prayer.lines.join('\n'),
    prayerAfter: gospel.prayer.after,
    afterVerseReference: gospel.prayer.afterVerse.reference,
    afterVerseText: gospel.prayer.afterVerse.text,
    nextSteps: gospel.nextSteps,
    source: gospel.source,
  }

  return (
    <div className="container py-14 sm:py-20">
      <div className="flex items-center gap-4">
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-royal-gradient text-primary-foreground">
          <Heart className="size-8" aria-hidden />
        </span>
        <div>
          <p className="font-display text-sm font-bold uppercase tracking-[0.16em] text-primary">
            Content
          </p>
          <h1 className="mt-1 text-3xl sm:text-4xl">Salvation journey</h1>
        </div>
      </div>

      <Alert variant="info" className="mt-8 max-w-3xl">
        This is the wording someone reads on the day they decide to follow Jesus. Please read it
        back on{' '}
        <Link href="/salvation" target="_blank" className="font-semibold underline">
          the live pages
        </Link>{' '}
        after saving.
      </Alert>

      <p className="mt-6 max-w-2xl text-pretty text-muted-foreground">
        {gospel.source === 'database'
          ? 'You have edited this. Everything below is what visitors see.'
          : 'Still showing the wording this site was built with — saving replaces it.'}
      </p>

      <div className="mt-10 max-w-3xl">
        <GospelEditor initial={initial} />
      </div>
    </div>
  )
}
