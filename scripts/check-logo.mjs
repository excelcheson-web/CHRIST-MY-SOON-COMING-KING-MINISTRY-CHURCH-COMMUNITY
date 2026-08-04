/**
 * Confirms the ministry logo is in place and usable.
 *
 * Run: npm run check:logo
 *
 * Exists because "the logo did not change" is otherwise a confusing thing to
 * debug — the app falls back to a drawn mark rather than showing a broken
 * image, so a missing file looks like a styling problem instead of a missing
 * file.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const IMAGES_DIR = path.join(process.cwd(), 'public', 'images')

/**
 * The filename the app actually asks for, read from the single source of truth
 * rather than repeated here — so the two can never disagree.
 */
const expectedName = readFileSync(path.join(process.cwd(), 'lib', 'brand-assets.ts'), 'utf8')
  .match(/LOGO_SRC = '\/images\/([^']+)'/)?.[1]

const TARGET = path.join(IMAGES_DIR, expectedName ?? 'logo.jpg')

const green = (s) => `[32m${s}[0m`
const red = (s) => `[31m${s}[0m`
const dim = (s) => `[2m${s}[0m`

/** Reads width/height straight from the PNG/JPEG header. */
function dimensions(bytes) {
  const isPng = bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  if (isPng) return { type: 'PNG', width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }

  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2
    while (offset < bytes.length - 9) {
      if (bytes[offset] !== 0xff) break
      const marker = bytes[offset + 1]
      const length = bytes.readUInt16BE(offset + 2)
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { type: 'JPEG', height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) }
      }
      offset += 2 + length
    }
    return { type: 'JPEG', width: null, height: null }
  }
  return null
}

let stats
try {
  stats = statSync(TARGET)
} catch {
  console.log(`\n${red('✗  Logo not found')}\n`)
  console.log(`   The app is looking for:\n     ${TARGET}\n`)

  // A near miss is far more likely than nothing at all — say so, rather than
  // letting someone re-save a file that is already there under another name.
  let nearby = []
  try {
    nearby = readdirSync(IMAGES_DIR).filter((name) =>
      /\.(png|jpe?g|webp|gif|svg)$/i.test(name),
    )
  } catch {
    console.log(red('   There is no public/images folder at all.\n'))
  }

  if (nearby.length > 0) {
    console.log('   These images are in that folder already:')
    for (const name of nearby) console.log(`     • ${name}`)
    console.log('\n   Either rename one of them to match, or point')
    console.log(`   ${dim('lib/brand-assets.ts → LOGO_SRC')} at it.`)
    console.log(dim('   Avoid spaces in the filename — they need URL-encoding.\n'))
  } else {
    console.log('   Save the ministry logo there, then run this again.')
    console.log(dim('   Until then the site shows a simplified drawn version instead.\n'))
  }

  process.exit(1)
}

const bytes = readFileSync(TARGET)
const size = dimensions(bytes)
const kb = Math.round(stats.size / 1024)

console.log(`\n${green('✓  Logo found')}   ${TARGET}\n`)
console.log(`   Format   ${size?.type ?? 'unknown — is this really an image?'}`)
console.log(`   Size     ${kb} KB`)
if (size?.width) console.log(`   Pixels   ${size.width} × ${size.height}`)

const notes = []
if (!size) notes.push('The file does not look like a PNG or JPEG. Re-save it as PNG.')
if (size?.width && size.width < 256) {
  notes.push(`It is only ${size.width}px wide — it will look soft on the hero. 512px or more is better.`)
}
if (size?.width && size.height && Math.abs(size.width - size.height) > size.width * 0.1) {
  notes.push('It is not square, so favicons and share previews will letterbox it.')
}
if (kb > 500) notes.push(`${kb} KB is heavy for a logo. Compressing it will speed every page up.`)

if (notes.length > 0) {
  console.log('\n   Worth knowing:')
  for (const note of notes) console.log(`     • ${note}`)
}

console.log(`\n   It is now used for the header, footer, sign-in panel, hero,`)
console.log(`   browser tab icon and link previews.\n`)
