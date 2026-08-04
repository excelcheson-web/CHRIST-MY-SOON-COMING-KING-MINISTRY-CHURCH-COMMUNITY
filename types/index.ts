export type { Role, PageContent, User } from '@prisma/client'
export type { StaticPage } from '@/content/pages'
export type { ResolvedPage, PageSlug } from '@/lib/page-content'
export type { NavItem, QuickLink } from '@/lib/site'

/** Shape returned by every JSON API route in this app. */
export type ApiResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }
