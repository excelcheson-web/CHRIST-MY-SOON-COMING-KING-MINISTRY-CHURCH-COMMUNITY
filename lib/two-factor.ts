import 'server-only'

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  randomInt,
  scryptSync,
} from 'node:crypto'
import bcrypt from 'bcryptjs'
import * as OTPAuth from 'otpauth'

/**
 * Time-based one-time passwords (RFC 6238) for staff accounts.
 *
 * Three things here are deliberate and worth not undoing:
 *
 * 1. **The secret is encrypted at rest.** A stolen database backup should not
 *    let someone mint valid codes for a pastor's account.
 * 2. **Recovery codes are bcrypt-hashed and single-use.** Each one is a
 *    complete second factor, so it gets the same treatment as a password.
 * 3. **Enrolment is not finished until a code is verified.** Trusting an
 *    unverified secret is how people lock themselves out of their own site.
 */

/*
 * Shown as the account label inside Google Authenticator and friends.
 *
 * Deliberately a constant rather than the editable ministry name: changing it
 * does not update secrets already enrolled, so a rename would leave every
 * existing entry labelled with the old text and no way to tell which site it
 * belongs to. Short, because authenticator apps truncate.
 */
const ISSUER = 'CMSCK Ministry'
const DIGITS = 6
const PERIOD = 30
/** One step either side, so a slightly wrong phone clock still works. */
const WINDOW = 1

// --- Secret encryption -----------------------------------------------------

/**
 * The key comes from TWO_FACTOR_KEY if set, otherwise NEXTAUTH_SECRET.
 *
 * That fallback is a convenience with a real consequence: rotating
 * NEXTAUTH_SECRET would make every stored secret undecryptable and lock staff
 * out. Setting TWO_FACTOR_KEY separately keeps the two concerns apart.
 */
function encryptionKey() {
  const material = process.env.TWO_FACTOR_KEY ?? process.env.NEXTAUTH_SECRET
  if (!material) {
    throw new Error('Two-factor authentication needs TWO_FACTOR_KEY or NEXTAUTH_SECRET to be set.')
  }
  // A fixed salt is fine here: the material is already high-entropy, and this
  // is key derivation rather than password storage.
  return scryptSync(material, 'cmsck-2fa-v1', 32)
}

export function encryptSecret(plain: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.')
}

export function decryptSecret(stored: string): string | null {
  try {
    const [ivPart, tagPart, dataPart] = stored.split('.')
    if (!ivPart || !tagPart || !dataPart) return null

    const decipher = createDecipheriv(
      'aes-256-gcm',
      encryptionKey(),
      Buffer.from(ivPart, 'base64url'),
    )
    decipher.setAuthTag(Buffer.from(tagPart, 'base64url'))
    return Buffer.concat([
      decipher.update(Buffer.from(dataPart, 'base64url')),
      decipher.final(),
    ]).toString('utf8')
  } catch {
    // Wrong key or tampered value. Treat as "no usable secret" rather than
    // throwing — a broken secret must not take the sign-in page down.
    return null
  }
}

// --- TOTP ------------------------------------------------------------------

function totpFor(secret: string, label: string) {
  return new OTPAuth.TOTP({
    issuer: ISSUER,
    label,
    algorithm: 'SHA1', // what every authenticator app actually supports
    digits: DIGITS,
    period: PERIOD,
    secret: OTPAuth.Secret.fromBase32(secret),
  })
}

/** A fresh base32 secret plus the otpauth:// URI for the QR code. */
export function newEnrolment(email: string) {
  const secret = new OTPAuth.Secret({ size: 20 })
  const base32 = secret.base32
  return {
    secret: base32,
    // toString() is otpauth's otpauth:// URI — what the QR encodes.
    uri: totpFor(base32, email).toString(),
  }
}

/** True when `code` is valid for the secret right now. */
export function verifyCode(secret: string, code: string, email: string) {
  const cleaned = code.replace(/\D/g, '')
  if (cleaned.length !== DIGITS) return false
  return totpFor(secret, email).validate({ token: cleaned, window: WINDOW }) !== null
}

// --- Recovery codes --------------------------------------------------------

/** Excludes look-alike characters — these get written down and read back. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const RECOVERY_COUNT = 10
const GROUP = 5

export function newRecoveryCodes() {
  return Array.from({ length: RECOVERY_COUNT }, () => {
    const raw = Array.from({ length: GROUP * 2 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')
    return `${raw.slice(0, GROUP)}-${raw.slice(GROUP)}`
  })
}

export async function hashRecoveryCodes(codes: string[]) {
  return Promise.all(codes.map((code) => bcrypt.hash(normaliseRecovery(code), 10)))
}

export function normaliseRecovery(code: string) {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/**
 * Checks a recovery code and reports which hash it burned.
 *
 * The caller removes that hash, which is what makes the code single-use — a
 * recovery code that still worked twice would be a password with extra steps.
 */
export async function matchRecoveryCode(code: string, hashes: string[]) {
  const candidate = normaliseRecovery(code)
  if (candidate.length < 8) return { matched: false as const }

  for (const hash of hashes) {
    if (await bcrypt.compare(candidate, hash)) {
      return { matched: true as const, remaining: hashes.filter((entry) => entry !== hash) }
    }
  }
  return { matched: false as const }
}

/** Sign-in sends one field; this decides which kind of factor it is. */
export function looksLikeRecoveryCode(value: string) {
  return normaliseRecovery(value).length > DIGITS
}
