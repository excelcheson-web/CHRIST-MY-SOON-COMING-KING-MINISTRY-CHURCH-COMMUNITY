import { Quote } from 'lucide-react'

import type { PastorsWordView } from '@/lib/home-content'

/**
 * The pastor's word for today.
 *
 * This section can never be empty: `pastorsWordToday()` falls back to a bundled
 * rotation keyed to the date when nobody has written one. That is the whole
 * design — an empty "Pastor's Word Today" heading looks worse than no section
 * at all, and nobody should have to write one every morning to prevent it.
 */
export function PastorsWord({ word, author }: { word: PastorsWordView; author: string }) {
  return (
    <section aria-labelledby="word-heading" className="container py-16 sm:py-20">
      <div className="mx-auto max-w-4xl rounded-3xl border-2 border-accent/25 bg-accent-soft/50 p-7 sm:p-10">
        <p className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-[0.18em] text-accent-ink">
          <Quote className="size-4" aria-hidden />
          The Pastor&rsquo;s Word today
        </p>

        <h2 id="word-heading" className="mt-4 text-2xl sm:text-3xl">
          {word.title}
        </h2>

        <div className="mt-5 space-y-4 text-pretty text-lg leading-relaxed text-foreground">
          {word.body.split(/\n{2,}/).map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>{paragraph}</p>
          ))}
        </div>

        {word.reference && (
          <p className="mt-6 font-display font-bold text-accent-ink">{word.reference}</p>
        )}

        <p className="mt-6 border-t border-accent/20 pt-4 text-sm text-muted-foreground">
          {/*
            Only signed when a pastor actually wrote it. Attributing a line from
            the bundled rotation to a named person would be putting words in
            their mouth, which is not a small thing in a church.
          */}
          {word.written ? `— ${word.author ?? author}` : 'A word for the day from the ministry.'}
        </p>
      </div>
    </section>
  )
}
