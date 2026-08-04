'use client'

import { createContext, useContext, type ReactNode } from 'react'

import { siteConfig } from '@/lib/site'

/**
 * Live ministry identity for client components.
 *
 * Server components call `getSiteSettings()` directly. The header is a client
 * component (it owns the mobile drawer), so it reads from here instead —
 * resolved once in the root layout and handed down, rather than every component
 * fetching it.
 *
 * The default is the compiled-in config, so anything rendered outside the
 * provider still shows sensible text rather than blanks.
 */
export type BrandIdentity = {
  name: string
  legalName: string
  shortName: string
  /** The slogan the ministry is also known by. Never replaces `name`. */
  aka: string
  tagline: string
}

const fallback: BrandIdentity = {
  name: siteConfig.name,
  legalName: siteConfig.legalName,
  shortName: siteConfig.shortName,
  aka: siteConfig.aka,
  tagline: siteConfig.tagline,
}

const SiteSettingsContext = createContext<BrandIdentity>(fallback)

export function SiteSettingsProvider({
  value,
  children,
}: {
  value: BrandIdentity
  children: ReactNode
}) {
  return <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>
}

export function useBrand() {
  return useContext(SiteSettingsContext)
}
