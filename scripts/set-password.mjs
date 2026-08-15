/**
 * Set a user's password directly, for when nobody can sign in any more.
 *
 * This is the break-glass tool. It exists because this app has no password
 * reset by email yet, so a forgotten administrator password would otherwise
 * mean nobody can reach /admin ever again — and the only alternative is hand
 * -writing bcrypt hashes into a SQL console, which is worse in every way.
 *
 * ## Usage
 *
 *   npm run db:password -- --email pastor@example.org
 *       Generates a strong password, sets it, prints it once.
 *
 *   npm run db:password -- --email pastor@example.org --password "..."
 *       Uses the one you supply. Note it will be in your shell history.
 *
 *   npm run db:password -- --email old@example.org --new-email new@example.org
 *       Also changes the address the account signs in with. Useful for the
 *       seeded `admin@praisearena.local`, which cannot receive email at all —
 *       `.local` is not a routable domain, so no reset link would ever arrive.
 *
 *   npm run db:password -- --list
 *       Shows the staff accounts without touching anything.
 *
 * Add `--production` to act on a database that is not localhost. That guard is
 * deliberate: the DATABASE_URL in .env points at the live Neon instance, so
 * without it a careless run would change a real person's password on the real
 * site while you thought you were experimenting.
 */

import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'

// Same cost as registration and the seed. They must agree, or an account's
// security would depend on which route last wrote its password.
const BCRYPT_COST = 12

/** `.env` is not loaded for us — this is a plain node script, not Next. */
function loadEnv() {
  try {
    for (const line of readFileSync('.env', 'utf8').split('\n')) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n\r]*)"?\s*$/)
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2]
    }
  } catch {
    // No .env — fine if DATABASE_URL is already exported.
  }
}

function arg(name) {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? undefined : process.argv[index + 1]
}
const flag = (name) => process.argv.includes(`--${name}`)

/**
 * A password worth the name, from a 64-character alphabet.
 *
 * `randomBytes` rather than `Math.random`, and the modulo bias across 64
 * symbols on a 256-value byte is zero because 256 divides evenly by 64.
 */
function generatePassword(length = 20) {
  const alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789-_'
  const bytes = randomBytes(length)
  let out = ''
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length]
  // The schema requires a letter and a digit; guarantee rather than hope.
  return /[0-9]/.test(out) && /[A-Za-z]/.test(out) ? out : generatePassword(length)
}

async function main() {
  loadEnv()

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Add it to .env or export it.')
    process.exit(1)
  }

  const isLocal = /@(localhost|127\.0\.0\.1)/.test(process.env.DATABASE_URL)

  /**
   * The remote-database guard, checked before the write rather than at startup.
   *
   * Putting it at the top blocked `--list` too, which reads and changes
   * nothing — and a safety rail that also blocks looking things up is one
   * people learn to pass `--production` reflexively to get past, which is
   * exactly the habit it exists to prevent.
   */
  function requireProductionFlag() {
    if (isLocal || flag('production')) return
    console.error('Refusing to change a password on a non-local database without --production.')
    console.error('This DATABASE_URL is remote — almost certainly the live site.')
    process.exit(1)
  }

  const prisma = new PrismaClient()

  // Neon suspends an idle branch, and the first query after that always fails.
  for (let attempt = 1; attempt <= 8; attempt++) {
    try {
      await prisma.$queryRaw`select 1`
      break
    } catch (error) {
      if (attempt === 8) {
        console.error('Could not reach the database:', error.message)
        process.exit(1)
      }
      await new Promise((resolve) => setTimeout(resolve, 4000))
    }
  }

  if (flag('list')) {
    const staff = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'PASTOR', 'LEADER', 'FOLLOW_UP_TEAM', 'PRAYER_TEAM'] } },
      select: { email: true, name: true, role: true, twoFactorEnabledAt: true },
      orderBy: { createdAt: 'asc' },
    })
    console.log(`\nStaff accounts (${staff.length}):\n`)
    for (const user of staff) {
      console.log(
        `  ${user.role.padEnd(16)} ${user.email.padEnd(34)} 2fa:${user.twoFactorEnabledAt ? 'on ' : 'off'}  ${user.name}`,
      )
    }
    console.log()
    await prisma.$disconnect()
    return
  }

  const email = arg('email')?.trim().toLowerCase()
  if (!email) {
    console.error('Which account? Pass --email someone@example.org (or --list to see them).')
    process.exit(1)
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, role: true },
  })
  if (!user) {
    console.error(`No account with the email ${email}. Try --list.`)
    process.exit(1)
  }

  const newEmail = arg('new-email')?.trim().toLowerCase()
  if (newEmail) {
    const clash = await prisma.user.findUnique({ where: { email: newEmail }, select: { id: true } })
    if (clash && clash.id !== user.id) {
      console.error(`${newEmail} is already used by another account.`)
      process.exit(1)
    }
  }

  const supplied = arg('password')
  if (supplied && supplied.length < 8) {
    console.error('That password is under 8 characters, which the sign-up form would reject.')
    process.exit(1)
  }
  const password = supplied ?? generatePassword()

  // Everything above only read. This is the point of no return.
  requireProductionFlag()

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: await bcrypt.hash(password, BCRYPT_COST),
      ...(newEmail ? { email: newEmail } : {}),
    },
  })

  console.log(`\n  Account   ${user.name} (${user.role})`)
  console.log(`  Email     ${newEmail ?? email}${newEmail ? `   (was ${email})` : ''}`)
  if (!supplied) console.log(`  Password  ${password}`)
  else console.log('  Password  (the one you supplied)')
  console.log('\n  Sign in, then change it at /account/security. This password is now')
  console.log('  in your terminal scrollback, which is not where it should live.\n')

  await prisma.$disconnect()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
