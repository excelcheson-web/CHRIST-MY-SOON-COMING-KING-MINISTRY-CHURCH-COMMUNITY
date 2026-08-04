import { databaseError, jsonError, jsonOk, requirePrisma } from '@/lib/api-guards'
import { getApiUser } from '@/lib/auth'
import { checkAccess, getChatSettings } from '@/lib/chat'
import { clientIp, rateLimit, sweepRateLimits } from '@/lib/rate-limit'
import {
  ACCEPTED_LABEL,
  imageSize,
  MAX_UPLOAD_BYTES,
  safeFileName,
  sniffType,
  storage,
} from '@/lib/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/chat/attachments — upload a file into a conversation.
 *
 * Returns an attachment id; the next message send links it. An attachment that
 * is never linked stays orphaned and is removed by the retention sweep.
 *
 * The file's real type is decided by its magic bytes, not by the Content-Type
 * the browser claimed — otherwise "image/png" is just a promise anyone can make.
 */
export async function POST(request: Request) {
  sweepRateLimits()

  const user = await getApiUser()
  if (!user) return jsonError('Please sign in.', 401)

  const limit = rateLimit(`upload:${user.id}:${clientIp(request.headers)}`, 30, 60 * 60 * 1000)
  if (!limit.ok) return jsonError('That is a lot of files at once. Please try again shortly.', 429)

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return jsonError('We could not read that upload.', 400)
  }

  const conversationId = form.get('conversationId')
  const file = form.get('file')

  if (typeof conversationId !== 'string' || !conversationId) {
    return jsonError('Which conversation is this for?', 422)
  }
  if (!(file instanceof File)) return jsonError('No file was attached.', 422)
  if (file.size === 0) return jsonError('That file is empty.', 422)
  if (file.size > MAX_UPLOAD_BYTES) {
    return jsonError(`That file is too big. The limit is ${ACCEPTED_LABEL}.`, 413)
  }

  try {
    const db = requirePrisma()

    const settings = await getChatSettings(db)
    if (!settings.enabled) return jsonError('Chat is switched off at the moment.', 503)

    const me = await db.user.findUnique({
      where: { id: user.id },
      select: { chatBannedAt: true },
    })
    if (me?.chatBannedAt) return jsonError('You cannot post in chat at the moment.', 403)

    const access = await checkAccess(db, conversationId, user)
    if (!access.ok) return jsonError(access.error, access.status)
    if (access.asModerator) return jsonError('Join this conversation before posting.', 403)

    const bytes = Buffer.from(await file.arrayBuffer())

    // Re-check the size against the bytes we actually received, not the header.
    if (bytes.byteLength > MAX_UPLOAD_BYTES) {
      return jsonError(`That file is too big. The limit is ${ACCEPTED_LABEL}.`, 413)
    }

    const sniffed = sniffType(bytes)
    if (!sniffed) {
      return jsonError(`We can only take ${ACCEPTED_LABEL}.`, 415)
    }

    const stored = await storage.put(bytes, sniffed.ext)
    const dimensions = sniffed.mime.startsWith('image/') ? imageSize(bytes, sniffed.mime) : null

    const attachment = await db.attachment.create({
      data: {
        conversationId,
        uploadedById: user.id,
        fileName: safeFileName(file.name),
        // The sniffed type, never the claimed one.
        mimeType: sniffed.mime,
        size: stored.size,
        storageKey: stored.storageKey,
        width: dimensions?.width,
        height: dimensions?.height,
      },
      select: { id: true, fileName: true, mimeType: true, size: true, width: true, height: true },
    })

    return jsonOk(attachment, 201)
  } catch (error) {
    return databaseError('chat attachment upload', error)
  }
}
