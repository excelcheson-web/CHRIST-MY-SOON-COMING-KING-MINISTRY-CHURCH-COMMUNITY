import 'server-only'

import { getSiteSettings } from '@/lib/site-settings'

/**
 * Outgoing email, through Resend.
 *
 * ## What this is allowed to send
 *
 * Account mechanics only: a password reset link, a sign-in code, and a notice
 * that one of those things happened. Nothing pastoral, nothing from the prayer
 * wall, no member details. That boundary matters because email is the least
 * private channel this app has — it passes through a third party and sits in a
 * mailbox indefinitely — and because the same rule already governs what may be
 * sent to an AI provider (see `lib/ai.ts`). One rule, two destinations.
 *
 * ## Off unless configured
 *
 * With no `RESEND_API_KEY`, `sendEmail` returns `{ ok: false, reason: 'off' }`
 * and writes nothing to the network. Callers must decide what that means for
 * them, and they differ: the password-reset route treats it as fatal and says
 * so plainly, because a reset flow that silently sends nothing is worse than
 * one that admits it is unavailable.
 *
 * This is deliberately *not* the fail-open behaviour Turnstile has. A missing
 * bot check degrades safety; a missing reset email degrades honesty, and the
 * person is left refreshing an inbox forever.
 *
 * ## Why fetch and not the SDK
 *
 * One POST to one endpoint. The `resend` package would add a dependency, and
 * the AI providers in this codebase are already called with plain `fetch` for
 * the same reason.
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

const RESEND_API_KEY = process.env.RESEND_API_KEY?.trim() ?? ''

/**
 * The From address.
 *
 * Must be on a domain verified in Resend, or every send is rejected. Falls back
 * to Resend's shared `onboarding@resend.dev`, which works immediately without
 * DNS but **can only send to the address that owns the Resend account** — fine
 * for a first test, useless in production. The warning below says so rather
 * than leaving somebody to discover it from a 403.
 */
const EMAIL_FROM = process.env.EMAIL_FROM?.trim() || 'onboarding@resend.dev'

export const isEmailConfigured = Boolean(RESEND_API_KEY)

export type SendResult =
  | { ok: true }
  | { ok: false; reason: 'off' | 'rejected' | 'unreachable'; detail?: string }

/**
 * Escapes text before it goes into the HTML part of an email.
 *
 * These messages carry a person's name, which they chose. Without this, a
 * member calling themselves `<img onerror=...>` would have that rendered by
 * whichever webmail opened it. Same discipline as `components/json-ld.tsx`.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function sendEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string
  subject: string
  /** Always required. Some people read mail as plain text, and spam filters
      treat an HTML-only message as a small strike against it. */
  text: string
  html: string
}): Promise<SendResult> {
  if (!isEmailConfigured) {
    console.warn('[email] RESEND_API_KEY is not set — nothing was sent:', subject)
    return { ok: false, reason: 'off' }
  }

  if (EMAIL_FROM.endsWith('@resend.dev')) {
    console.warn(
      '[email] sending from the shared resend.dev address, which only delivers to the Resend account owner. Set EMAIL_FROM to an address on your verified domain.',
    )
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, text, html }),
      cache: 'no-store',
      // A person is watching a spinner while this runs.
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      console.error('[email] rejected', response.status, detail.slice(0, 300))
      return { ok: false, reason: 'rejected', detail }
    }

    return { ok: true }
  } catch (error) {
    console.error('[email] unreachable:', error)
    return { ok: false, reason: 'unreachable' }
  }
}

/**
 * The shell every message sits in.
 *
 * Inline styles only, and a table-free single column. Webmail clients strip
 * `<style>` blocks and most of what a browser would honour, so anything
 * cleverer than this renders differently in each one — and these messages have
 * exactly one job, which is to get a link or six digits in front of somebody.
 */
function layout({
  heading,
  body,
  ministry,
  footerNote,
}: {
  heading: string
  body: string
  ministry: string
  footerNote: string
}): string {
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e2e8f0">
    <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#4338ca">${escapeHtml(ministry)}</p>
    <h1 style="margin:0 0 20px;font-size:22px;line-height:1.3;color:#0f172a">${escapeHtml(heading)}</h1>
    ${body}
    <hr style="border:0;border-top:1px solid #e2e8f0;margin:28px 0 16px">
    <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b">${escapeHtml(footerNote)}</p>
  </div>
</body></html>`
}

/** A password reset link. Valid for one hour, single use. */
export async function sendPasswordResetEmail({
  to,
  name,
  resetUrl,
}: {
  to: string
  name: string
  resetUrl: string
}): Promise<SendResult> {
  const settings = await getSiteSettings()
  const ministry = settings.name

  const text = [
    `Hello ${name},`,
    '',
    `Someone asked to reset the password for your ${ministry} account.`,
    '',
    'Open this link to choose a new one:',
    resetUrl,
    '',
    'The link works once and expires in one hour.',
    '',
    "If this was not you, you can ignore this email — nothing has changed, and your password still works.",
  ].join('\n')

  const html = layout({
    ministry,
    heading: 'Choose a new password',
    footerNote:
      'If this was not you, ignore this email. Nothing has changed and your password still works.',
    body: `
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6">Hello ${escapeHtml(name)},</p>
      <p style="margin:0 0 24px;font-size:16px;line-height:1.6">Someone asked to reset the password for your ${escapeHtml(ministry)} account. Choose a new one here:</p>
      <p style="margin:0 0 24px"><a href="${escapeHtml(resetUrl)}" style="display:inline-block;background:#4338ca;color:#ffffff;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:12px;font-size:16px">Choose a new password</a></p>
      <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#475569">The link works once and expires in one hour.</p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;word-break:break-all">Or paste this into your browser:<br>${escapeHtml(resetUrl)}</p>`,
  })

  return sendEmail({ to, subject: `Reset your ${ministry} password`, text, html })
}

/** A six-digit sign-in code, for accounts using email as their second factor. */
export async function sendSignInCodeEmail({
  to,
  name,
  code,
  minutes,
}: {
  to: string
  name: string
  code: string
  minutes: number
}): Promise<SendResult> {
  const settings = await getSiteSettings()
  const ministry = settings.name

  const text = [
    `Hello ${name},`,
    '',
    `Your ${ministry} sign-in code is: ${code}`,
    '',
    `It expires in ${minutes} minutes and can only be used once.`,
    '',
    'If you did not just try to sign in, someone else may know your password. Change it as soon as you can.',
  ].join('\n')

  const html = layout({
    ministry,
    heading: 'Your sign-in code',
    footerNote:
      'If you did not just try to sign in, someone else may know your password. Please change it as soon as you can.',
    body: `
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6">Hello ${escapeHtml(name)},</p>
      <p style="margin:0 0 20px;font-size:16px;line-height:1.6">Type this code to finish signing in:</p>
      <p style="margin:0 0 20px;font-size:38px;font-weight:800;letter-spacing:.22em;color:#4338ca;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">${escapeHtml(code)}</p>
      <p style="margin:0;font-size:14px;line-height:1.6;color:#475569">It expires in ${minutes} minutes and can only be used once.</p>`,
  })

  return sendEmail({ to, subject: `${code} is your ${ministry} sign-in code`, text, html })
}

/**
 * "Your password was changed."
 *
 * Sent after the fact and never blocking the change itself. Its only job is to
 * make an account takeover noisy: if somebody else reset the password, this is
 * the message that tells the real owner while it still matters.
 */
export async function sendPasswordChangedEmail({
  to,
  name,
}: {
  to: string
  name: string
}): Promise<SendResult> {
  const settings = await getSiteSettings()
  const ministry = settings.name
  const contact = settings.contact.email

  const text = [
    `Hello ${name},`,
    '',
    `The password on your ${ministry} account was just changed.`,
    '',
    `If that was you, there is nothing to do. If it was not, contact us immediately at ${contact}.`,
  ].join('\n')

  const html = layout({
    ministry,
    heading: 'Your password was changed',
    footerNote: `If this was not you, contact us immediately at ${contact}.`,
    body: `
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6">Hello ${escapeHtml(name)},</p>
      <p style="margin:0;font-size:16px;line-height:1.6">The password on your ${escapeHtml(ministry)} account was just changed. If that was you, there is nothing to do.</p>`,
  })

  return sendEmail({ to, subject: `Your ${ministry} password was changed`, text, html })
}
