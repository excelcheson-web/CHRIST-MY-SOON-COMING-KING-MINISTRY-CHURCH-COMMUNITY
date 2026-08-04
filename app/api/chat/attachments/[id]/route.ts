import { NextResponse } from 'next/server'

import { jsonError, requirePrisma } from '@/lib/api-guards'
import { getApiUser } from '@/lib/auth'
import { checkAccess } from '@/lib/chat'
import { storage } from '@/lib/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/chat/attachments/[id] — download a file.
 *
 * Membership of the conversation is re-checked on **every** request. That is
 * the whole reason attachments are not in `public/`: a private thread's photos
 * must not be readable by anyone who happens to have the URL.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser()
  if (!user) return jsonError('Please sign in.', 401)

  try {
    const db = requirePrisma()

    const attachment = await db.attachment.findUnique({
      where: { id: params.id },
      select: {
        conversationId: true,
        fileName: true,
        mimeType: true,
        size: true,
        storageKey: true,
      },
    })
    if (!attachment) return jsonError('File not found.', 404)

    const access = await checkAccess(db, attachment.conversationId, user)
    // Same answer as a missing file — never confirm a private file exists.
    if (!access.ok) return jsonError('File not found.', 404)

    const body = await storage.stream(attachment.storageKey)

    return new NextResponse(body, {
      headers: {
        'Content-Type': attachment.mimeType,
        'Content-Length': String(attachment.size),
        // `inline` for images so they render; the filename is still quoted.
        'Content-Disposition': `inline; filename="${attachment.fileName.replace(/"/g, '')}"`,
        // Stops a crafted file being interpreted as something executable.
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; img-src 'self'; sandbox",
        // Private: it is per-user authorised, so no shared cache may keep it.
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    console.error('[chat attachment download]', error)
    return jsonError('Could not load that file.', 500)
  }
}
