/** URL-safe slug from arbitrary title text. Unicode-aware, so non-ASCII names work. */
export function slugify(value: string) {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/**
 * Appends -2, -3, … until the slug is free.
 * `exists` is injected so this stays testable and database-agnostic.
 */
export async function uniqueSlug(base: string, exists: (slug: string) => Promise<boolean>) {
  const root = slugify(base) || 'untitled'
  let candidate = root

  for (let suffix = 2; await exists(candidate); suffix++) {
    candidate = `${root}-${suffix}`
    if (suffix > 999) throw new Error(`Could not find a free slug for "${base}"`)
  }

  return candidate
}
