import { Home, Search } from 'lucide-react'
import Link from 'next/link'

import { SiteShell } from '@/components/layout/site-shell'
import { Button } from '@/components/ui/button'
import { mainNav } from '@/lib/site'

export default function NotFound() {
  return (
    <SiteShell>
      <div className="container flex flex-col items-center py-24 text-center sm:py-32">
        <span className="grid size-20 place-items-center rounded-3xl bg-primary-soft text-primary">
          <Search className="size-10" aria-hidden />
        </span>

        <h1 className="mt-8 text-4xl sm:text-5xl">We could not find that page</h1>
        <p className="mt-5 max-w-lg text-pretty text-lg text-muted-foreground">
          The link may be old, or the page may have moved. Nothing is broken — let us get you back
          on track.
        </p>

        <Button asChild size="xl" className="mt-9">
          <Link href="/">
            <Home aria-hidden />
            Take me home
          </Link>
        </Button>

        <nav aria-label="Suggested pages" className="mt-12 w-full max-w-xl">
          <h2 className="font-display text-base font-bold text-foreground">Or try one of these</h2>
          <ul className="mt-4 flex flex-wrap justify-center gap-3">
            {mainNav
              .filter((item) => item.href !== '/')
              .map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex min-h-12 items-center rounded-xl border-2 border-border bg-card px-5 font-display font-semibold text-foreground transition-colors hover:border-primary/35 hover:bg-secondary"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
          </ul>
        </nav>
      </div>
    </SiteShell>
  )
}
