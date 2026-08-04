/**
 * Upload limits shared by the browser and the server.
 *
 * Separate from `lib/storage.ts` because that module is `server-only` — the
 * composer needs these values, and pulling in the filesystem driver to get them
 * would break the client build.
 *
 * The server re-validates everything here against the file's actual bytes. The
 * `accept` attribute is a convenience for the file picker, never a control.
 */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024

export const ACCEPTED_LABEL = 'PNG, JPEG, GIF, WebP or PDF, up to 8MB'

export const ACCEPT_ATTRIBUTE = 'image/png,image/jpeg,image/gif,image/webp,application/pdf'
