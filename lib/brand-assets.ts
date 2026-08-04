/**
 * One place that says where the ministry artwork lives.
 *
 * Everything that shows the logo — the header, the footer, the sign-in panel,
 * the hero, the browser tab icon and the link preview when someone shares the
 * site — reads these constants. Replace the file, and every one of them
 * changes together.
 *
 * The file lives at `public/images/logo.jpg`. Run `npm run check:logo` after
 * replacing it to confirm it is picked up.
 *
 * Keep the filename free of spaces — a space has to be percent-encoded in a URL
 * and gets mishandled by enough tools to be worth avoiding.
 */
export const LOGO_SRC = '/images/logo.jpg'

/** Square artwork, used for favicons and Apple touch icons. */
export const LOGO_SIZE = 512

/** What the link preview shows when the site is shared. */
export const OG_IMAGE = {
  url: LOGO_SRC,
  width: LOGO_SIZE,
  height: LOGO_SIZE,
  alt: 'Christ My Soon Coming King Ministry — Praise Arena',
}
