import { Handshake, MapPin, Sparkles } from 'lucide-react'
import Link from 'next/link'

import type { PublicProfile } from '@/lib/profiles'

export function MemberCard({ person, reasons }: { person: PublicProfile; reasons?: string[] }) {
  return (
    <article className="flex h-full flex-col rounded-3xl border-2 border-border bg-card p-6 shadow-soft transition-all hover:border-primary/30 hover:shadow-lifted">
      <div className="flex items-center gap-4">
        {person.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatars come from arbitrary providers
          <img src={person.avatar} alt="" className="size-14 shrink-0 rounded-full object-cover" />
        ) : (
          <span
            aria-hidden
            className="grid size-14 shrink-0 place-items-center rounded-full bg-primary-soft font-display text-xl font-bold text-primary"
          >
            {person.name.charAt(0).toUpperCase()}
          </span>
        )}

        <div className="min-w-0">
          <h3 className="font-display text-lg font-bold text-foreground">
            <Link href={`/community/members/${person.id}`} className="rounded hover:text-primary">
              {person.name}
            </Link>
          </h3>
          {person.headline && (
            <p className="truncate text-sm text-muted-foreground">{person.headline}</p>
          )}
        </div>
      </div>

      {person.neighbourhood && (
        <p className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="size-4" aria-hidden />
          {person.neighbourhood}
        </p>
      )}

      {person.spiritualGifts.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {person.spiritualGifts.slice(0, 4).map((gift) => (
            <li
              key={gift}
              className="rounded-lg bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent-ink"
            >
              {gift}
            </li>
          ))}
        </ul>
      )}

      {person.mentorAvailable && (
        <p className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-primary">
          <Handshake className="size-4" aria-hidden />
          Happy to mentor
        </p>
      )}

      {/* Why we suggested them — shown only on the suggestions row. */}
      {reasons && reasons.length > 0 && (
        <p className="mt-auto flex items-start gap-1.5 pt-4 text-sm text-muted-foreground">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-accent-ink" aria-hidden />
          {reasons[0]}
        </p>
      )}
    </article>
  )
}
