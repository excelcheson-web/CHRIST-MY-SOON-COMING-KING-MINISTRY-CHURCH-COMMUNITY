'use client'

import { Cake, PartyPopper } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

import type { BirthdayPerson } from '@/lib/home-content'
import { cn } from '@/lib/utils'

/**
 * The birthday celebration.
 *
 * When it is somebody's birthday their photograph goes up with their name and
 * confetti falls. It only ever shows members who ticked "show my birthday" —
 * being celebrated is lovely if you asked for it and mortifying if you did not.
 *
 * The confetti is CSS keyframes rather than a canvas library: forty absolutely
 * positioned squares cost nothing, need no dependency, and — crucially — can be
 * switched off wholesale by `prefers-reduced-motion`, which a canvas animation
 * would ignore unless somebody remembered to check.
 */

/** Fixed so the server and the client agree — random would hydrate mismatched. */
const CONFETTI = Array.from({ length: 40 }, (_, index) => {
  // A deterministic scatter. Primes keep the pattern from looking banded.
  const left = (index * 37) % 100
  const delay = ((index * 53) % 30) / 10
  const duration = 3 + ((index * 29) % 25) / 10
  const drift = ((index * 41) % 60) - 30
  const colour = ['bg-accent', 'bg-primary', 'bg-[hsl(43_92%_58%)]', 'bg-destructive'][index % 4]!
  const round = index % 3 === 0
  return { left, delay, duration, drift, colour, round }
})

function Confetti() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden"
    >
      {CONFETTI.map((piece, index) => (
        <span
          key={index}
          className={cn(
            'absolute -top-4 size-2.5 opacity-90',
            piece.colour,
            piece.round ? 'rounded-full' : 'rounded-[2px]',
          )}
          style={{
            left: `${piece.left}%`,
            animation: `confetti-fall ${piece.duration}s linear ${piece.delay}s infinite`,
            // Consumed by the keyframes below, so each piece drifts differently.
            ['--drift' as string]: `${piece.drift}px`,
          }}
        />
      ))}
    </div>
  )
}

export function BirthdayCelebration({ people }: { people: BirthdayPerson[] }) {
  // Rendered only after mount so the confetti starts when somebody is actually
  // looking, rather than mid-way through its loop on a server-rendered page.
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])

  if (people.length === 0) return null

  const names =
    people.length === 1
      ? people[0]!.name
      : people.length === 2
        ? `${people[0]!.name} and ${people[1]!.name}`
        : `${people.slice(0, -1).map((person) => person.name).join(', ')} and ${people.at(-1)!.name}`

  return (
    <section aria-labelledby="birthday-heading" className="container py-10">
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translate3d(0, -10%, 0) rotate(0deg); opacity: 0; }
          10%  { opacity: 0.95; }
          100% { transform: translate3d(var(--drift, 0px), 640px, 0) rotate(540deg); opacity: 0; }
        }
      `}</style>

      <div className="relative overflow-hidden rounded-3xl bg-royal-gradient p-7 text-white shadow-lifted sm:p-10">
        {ready && <Confetti />}

        <div className="relative flex flex-col items-center gap-7 text-center lg:flex-row lg:text-left">
          <ul className="flex shrink-0 -space-x-4">
            {people.slice(0, 4).map((person) => (
              <li key={person.id}>
                {person.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element -- authenticated route, not an optimisable static asset
                  <img
                    src={person.avatar}
                    alt=""
                    className="size-24 rounded-full border-4 border-white object-cover shadow-lifted sm:size-28"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="grid size-24 place-items-center rounded-full border-4 border-white bg-accent font-display text-3xl font-bold text-accent-foreground shadow-lifted sm:size-28"
                  >
                    {person.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </li>
            ))}
          </ul>

          <div className="min-w-0">
            <p className="flex items-center justify-center gap-2 font-display text-sm font-bold uppercase tracking-[0.18em] text-accent lg:justify-start">
              <PartyPopper className="size-4" aria-hidden />
              Happy birthday
            </p>

            <h2 id="birthday-heading" className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">
              {names}
            </h2>

            <p className="mt-3 text-pretty text-lg text-white/85">
              {people.length === 1
                ? 'It is their day today. Send them a word — it takes ten seconds and it lands all day.'
                : 'It is their day today. Send them a word — it takes ten seconds and it lands all day.'}
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3 lg:justify-start">
              <Link
                href="/community/encouragement"
                className="flex min-h-12 items-center gap-2 rounded-xl bg-accent-gradient px-6 font-display font-semibold text-accent-foreground transition-all hover:brightness-105"
              >
                <Cake className="size-5" aria-hidden />
                Wish them well
              </Link>
              {people.length === 1 && (
                <Link
                  href={`/community/members/${people[0]!.id}`}
                  className="flex min-h-12 items-center rounded-xl border-2 border-white/35 px-6 font-display font-semibold text-white transition-colors hover:bg-white/10"
                >
                  See their profile
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
