/**
 * The ministry's photography.
 *
 * Real photographs rather than drawings, and every one of them was looked at
 * before it went in — a church website is not the place to paste an image
 * nobody has seen.
 *
 * ## Licence
 *
 * All six are from Unsplash, under the [Unsplash
 * License](https://unsplash.com/license): free for commercial and
 * non-commercial use, no permission needed, attribution appreciated but not
 * required. Photographers are credited in `credit` below and on
 * `/images/photos/CREDITS.md` — courtesy, not obligation.
 *
 * ## Two sizes, no image optimiser
 *
 * Each photo ships as `-lg` (1200×800) and `-sm` (480×320), pre-cropped at
 * download time. That is deliberate: `next/image` would need the `sharp`
 * binary installed on the host to optimise at runtime, and this site is meant
 * to deploy anywhere. Plain `<img>` with fixed dimensions and `loading="lazy"`
 * has no such dependency and no layout shift.
 *
 * ## Alt text
 *
 * Every entry has real alt text, but most placements pass `decorative` and
 * render `alt=""` — because the heading beside the photo already says what the
 * page is. Describing a mood photograph twice is noise to a screen reader. The
 * `alt` here is for the places where the picture genuinely carries meaning.
 */

export type PhotoName =
  | 'worship'
  | 'scripture'
  | 'prayer'
  | 'together'
  | 'spirit'
  | 'learning'

export type Photo = {
  /** 1200×800. Heroes and feature cards. */
  lg: string
  /** 480×320. Tiles and thumbnails. */
  sm: string
  alt: string
  credit: string
}

export const photos: Record<PhotoName, Photo> = {
  worship: {
    lg: '/images/photos/worship-lg.jpg',
    sm: '/images/photos/worship-sm.jpg',
    alt: 'A congregation with their hands raised in worship',
    credit: 'Rod Long / Unsplash',
  },
  scripture: {
    lg: '/images/photos/scripture-lg.jpg',
    sm: '/images/photos/scripture-sm.jpg',
    // Open at Isaiah 60–61 — "to proclaim liberty to the captives", which is
    // the passage this ministry's mandate is built on. A happy accident worth
    // keeping.
    alt: 'An open Bible with coloured light from a stained-glass window falling across it',
    credit: 'Shane Hoving / Unsplash',
  },
  prayer: {
    lg: '/images/photos/prayer-lg.jpg',
    sm: '/images/photos/prayer-sm.jpg',
    alt: 'People standing in a circle holding hands as they pray together',
    credit: 'Pedro Lima / Unsplash',
  },
  together: {
    lg: '/images/photos/together-lg.jpg',
    sm: '/images/photos/together-sm.jpg',
    alt: 'A group of people stacking their hands together in the middle of a circle',
    credit: 'Hannah Busing / Unsplash',
  },
  spirit: {
    lg: '/images/photos/spirit-lg.jpg',
    sm: '/images/photos/spirit-sm.jpg',
    alt: 'Hands raised towards a shaft of light in a darkened room',
    credit: 'Edwin Andrade / Unsplash',
  },
  learning: {
    lg: '/images/photos/learning-lg.jpg',
    sm: '/images/photos/learning-sm.jpg',
    alt: 'People seated in a service, taking notes with open Bibles on their laps',
    credit: 'Sincerely Media / Unsplash',
  },
}

/**
 * Source and dimensions, so no call site invents its own.
 *
 * `alt` is deliberately **not** returned. Every `<img>` has to write it out,
 * which forces a decision about whether this particular placement is decorative
 * (`alt=""`) or carries meaning (`alt={photos.worship.alt}`) — and it keeps the
 * `jsx-a11y/alt-text` rule able to see the attribute, which it cannot do
 * through a spread.
 */
export function photoProps(name: PhotoName, size: 'lg' | 'sm' = 'lg') {
  const photo = photos[name]
  return {
    src: size === 'lg' ? photo.lg : photo.sm,
    width: size === 'lg' ? 1200 : 480,
    height: size === 'lg' ? 800 : 320,
  }
}
