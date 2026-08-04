/**
 * Turning a pasted media link into something playable.
 *
 * Kept apart from `lib/sermons.ts` because the sermon player and the community
 * feed both run in the browser, and that module imports `@prisma/client` —
 * which has no business in a client bundle.
 */

export type Embed = { kind: 'youtube' | 'vimeo' | 'facebook'; src: string }

/**
 * Turns a pasted link into an embeddable player source.
 *
 * Security note: the returned URL is **rebuilt from the extracted id**, never
 * the input string. That matters because the result goes into an `<iframe
 * src>` — passing the raw value through would let a `javascript:` or `data:`
 * URL, or a lookalike host, render inside the page's own origin context. An
 * unrecognised link returns null and is offered as a plain outbound link.
 */
export function toEmbed(rawUrl: string | null | undefined): Embed | null {
  if (!rawUrl) return null

  let url: URL
  try {
    url = new URL(rawUrl.trim())
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null

  const host = url.hostname.replace(/^www\./, '').toLowerCase()

  // --- YouTube ------------------------------------------------------------
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
    // /watch?v=ID · /embed/ID · /live/ID · /shorts/ID
    const fromQuery = url.searchParams.get('v')
    const fromPath = url.pathname.match(/^\/(?:embed|live|shorts|v)\/([\w-]{6,20})/)?.[1]
    const id = fromQuery ?? fromPath
    if (id && /^[\w-]{6,20}$/.test(id)) {
      // -nocookie: no tracking cookie is set unless the visitor presses play.
      return { kind: 'youtube', src: `https://www.youtube-nocookie.com/embed/${id}` }
    }
    return null
  }
  if (host === 'youtu.be') {
    const id = url.pathname.slice(1).split('/')[0] ?? ''
    if (/^[\w-]{6,20}$/.test(id)) {
      return { kind: 'youtube', src: `https://www.youtube-nocookie.com/embed/${id}` }
    }
    return null
  }

  // --- Vimeo --------------------------------------------------------------
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = url.pathname.match(/(\d{6,12})/)?.[1]
    if (id) return { kind: 'vimeo', src: `https://player.vimeo.com/video/${id}` }
    return null
  }

  /*
   * --- Facebook ----------------------------------------------------------
   *
   * Facebook's video plugin is the odd one out: it takes the *whole watch URL*
   * as a query parameter rather than an id, because a Facebook video is
   * identified by page-plus-post and there is no stable short id to extract.
   *
   * So the rule the other providers follow — rebuild from the id, never trust
   * the input — is kept a different way. The plugin URL is built from
   * `origin + pathname` only: the query string and fragment of whatever was
   * pasted are dropped, the host must be a known Facebook one, and the result
   * is then URL-encoded into a parameter of a hard-coded facebook.com URL. A
   * `javascript:` link cannot survive that, and neither can a lookalike host.
   */
  if (host === 'facebook.com' || host === 'fb.watch' || host === 'web.facebook.com') {
    const watchUrl = `${url.origin}${url.pathname}`
    return {
      kind: 'facebook',
      src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(watchUrl)}&show_text=false`,
    }
  }

  return null
}

/** Is this something an `<audio>` element can actually play? */
export function isPlayableAudio(rawUrl: string | null | undefined) {
  if (!rawUrl) return false
  try {
    const url = new URL(rawUrl.trim())
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false
    return /\.(mp3|m4a|aac|ogg|oga|wav|webm)$/i.test(url.pathname)
  } catch {
    return false
  }
}
