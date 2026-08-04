/**
 * Small in-memory fixed-window limiter for the public write endpoints.
 *
 * Deliberately simple: it lives in the server process, so it resets on deploy
 * and does not coordinate across instances. That is enough to stop casual abuse
 * of /api/register in Phase One. Swap for Upstash/Redis when the platform runs
 * on more than one instance.
 */
type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true as const, remaining: limit - 1, retryAfterSeconds: 0 }
  }

  bucket.count += 1

  if (bucket.count > limit) {
    return {
      ok: false as const,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    }
  }

  return { ok: true as const, remaining: limit - bucket.count, retryAfterSeconds: 0 }
}

/**
 * Checks a bucket without consuming from it.
 *
 * Needed wherever the limit is small and precious — a guest gets one prayer
 * request a day, and a typo in the title must not burn it. Routes peek before
 * validating and only call `rateLimit` once the write actually succeeds.
 */
export function peekRateLimit(key: string, limit: number) {
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= Date.now()) return { ok: true as const, retryAfterSeconds: 0 }

  if (bucket.count >= limit) {
    return {
      ok: false as const,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - Date.now()) / 1000)),
    }
  }

  return { ok: true as const, retryAfterSeconds: 0 }
}

/** Opportunistic cleanup so the map cannot grow without bound. */
export function sweepRateLimits() {
  const now = Date.now()
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

export function clientIp(headers: Headers) {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]!.trim()
  return headers.get('x-real-ip')?.trim() || 'unknown'
}
