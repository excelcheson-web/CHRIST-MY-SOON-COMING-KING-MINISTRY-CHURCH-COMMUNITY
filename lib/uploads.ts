import 'server-only'

import { jsonError } from '@/lib/api-guards'
import {
  ACCEPTED_LABEL,
  imageSize,
  MAX_UPLOAD_BYTES,
  sniffType,
  storage,
} from '@/lib/storage'

/**
 * Shared picture handling for profile photos, announcement designs and
 * calendar artwork.
 *
 * All three want exactly the same thing — take a file, prove it really is an
 * image, store it under a random key outside `public/`, hand back the key — and
 * writing that three times is three chances to forget the magic-byte check.
 */

export type StoredImage = { key: string; width: number | null; height: number | null }

export async function acceptImage(
  file: unknown,
  label = 'picture',
): Promise<{ ok: true; image: StoredImage | null } | { ok: false; response: Response }> {
  // No file is a valid answer everywhere this is used — every picture is optional.
  if (!(file instanceof File) || file.size === 0) return { ok: true, image: null }

  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      response: jsonError(`That ${label} is too big. The limit is ${ACCEPTED_LABEL}.`, 413),
    }
  }

  const bytes = Buffer.from(await file.arrayBuffer())
  // Re-check against what actually arrived, not the header we were told.
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      response: jsonError(`That ${label} is too big. The limit is ${ACCEPTED_LABEL}.`, 413),
    }
  }

  /*
   * The type is decided by the file's magic bytes. A browser will happily send
   * `image/png` for a file that is really a script, so the claimed MIME type is
   * a promise anybody can make and this never trusts it. PDFs are refused here
   * even though the shared sniffer accepts them for chat — a profile photo or a
   * flyer has to render inline.
   */
  const sniffed = sniffType(bytes)
  if (!sniffed || !sniffed.mime.startsWith('image/')) {
    return {
      ok: false,
      response: jsonError(`Please choose a picture — PNG, JPEG, GIF or WebP.`, 415),
    }
  }

  const stored = await storage.put(bytes, sniffed.ext)
  const size = imageSize(bytes, sniffed.mime)

  return {
    ok: true,
    image: { key: stored.storageKey, width: size?.width ?? null, height: size?.height ?? null },
  }
}

/** Content type from the stored key's extension. Never from user input. */
export function mimeForKey(storageKey: string) {
  const extension = storageKey.slice(storageKey.lastIndexOf('.')).toLowerCase()
  return (
    { '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' }[
      extension
    ] ?? 'application/octet-stream'
  )
}

/**
 * Streams a stored image back.
 *
 * `Cache-Control: private` on anything member-only: the response depends on who
 * asked, so a shared cache must never hand one person's copy to the next.
 */
export async function serveImage(storageKey: string, isPublic = false) {
  const stream = await storage.stream(storageKey)

  return new Response(stream, {
    headers: {
      'Content-Type': mimeForKey(storageKey),
      'Cache-Control': isPublic ? 'public, max-age=86400' : 'private, max-age=3600',
      'Content-Disposition': 'inline',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
