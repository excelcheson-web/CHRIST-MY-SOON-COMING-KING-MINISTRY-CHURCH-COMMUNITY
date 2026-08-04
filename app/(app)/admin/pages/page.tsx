import { FileText } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { PageEditor, type EditablePage } from '@/components/admin/page-editor'
import { requireUser } from '@/lib/auth'
import { getPageContent, type PageSlug } from '@/lib/page-content'
import { canManageContent } from '@/lib/permissions'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Edit pages',
  robots: { index: false, follow: false },
}

const PAGES: { slug: PageSlug; href: string; label: string }[] = [
  { slug: 'about', href: '/about', label: 'About Us' },
  { slug: 'founder', href: '/founder', label: 'Our Founders' },
  { slug: 'doctrine', href: '/doctrine', label: 'What We Believe' },
]

export default async function AdminPagesPage({
  searchParams,
}: {
  searchParams: { page?: string }
}) {
  const user = await requireUser('/admin/pages')
  if (!canManageContent(user.role)) redirect('/dashboard?denied=content')

  const active = PAGES.find((entry) => entry.slug === searchParams.page) ?? PAGES[0]
  const resolved = await getPageContent(active.slug)

  const page: EditablePage = {
    slug: active.slug,
    href: active.href,
    title: resolved.title,
    subtitle: resolved.subtitle,
    content: resolved.content,
    published: true,
    source: resolved.source,
    updatedAt: resolved.updatedAt?.toISOString() ?? null,
  }

  return (
    <div className="container py-14 sm:py-20">
      <div className="flex items-center gap-4">
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-royal-gradient text-primary-foreground">
          <FileText className="size-8" aria-hidden />
        </span>
        <div>
          <p className="font-display text-sm font-bold uppercase tracking-[0.16em] text-primary">
            Content
          </p>
          <h1 className="mt-1 text-3xl sm:text-4xl">Edit pages</h1>
        </div>
      </div>

      <p className="mt-6 max-w-2xl text-pretty text-muted-foreground">
        Change any of this whenever you like — it goes live as soon as you save. If an edit does
        not work out, &ldquo;Undo all my edits&rdquo; puts the original wording back.
      </p>

      <nav aria-label="Choose a page" className="mt-10">
        <ul className="flex flex-wrap gap-2">
          {PAGES.map((entry) => {
            const isActive = entry.slug === active.slug
            return (
              <li key={entry.slug}>
                <Link
                  href={`/admin/pages?page=${entry.slug}`}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex min-h-12 items-center rounded-xl border-2 px-5 font-display font-semibold transition-colors',
                    isActive
                      ? 'border-primary/35 bg-primary-soft text-primary'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/25 hover:text-foreground',
                  )}
                >
                  {entry.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="mt-10 max-w-4xl">
        {/* Remounts when the chosen page changes, so the textarea reloads. */}
        <PageEditor key={active.slug} page={page} />
      </div>
    </div>
  )
}
