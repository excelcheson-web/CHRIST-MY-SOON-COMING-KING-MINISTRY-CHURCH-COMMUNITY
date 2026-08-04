import type { ChurchDateKey } from '@/lib/church-year'

/**
 * A photograph for every day in the Christian year.
 *
 * Bundled rather than seeded, for the same reason the dates themselves are
 * computed rather than typed in: the calendar has to look right on a fresh
 * clone with no database, and a church should not have to find fourteen
 * pictures before its home page stops looking unfinished. `/admin/calendar`
 * overrides any of these with the church's own artwork, and the override wins.
 *
 * ## Every one of these was looked at
 *
 * Not chosen from a search result and pasted in. They were downloaded,
 * rendered onto a contact sheet and judged, and three of the first fourteen
 * were thrown out and replaced:
 *
 * - Easter was a fire burning in the mouth of a cave. It read as a furnace,
 *   not a resurrection.
 * - Epiphany was a starfield so dark it rendered as a blank rectangle at tile
 *   size, with no visible star.
 * - Harvest was more than half blown-out white sky, which on a white page
 *   looks like a broken image rather than a photograph.
 *
 * The rule the church asked for is that the picture must describe the topic.
 * A picture that needs a caption to explain what it has to do with the day is
 * one that failed, however good a photograph it is.
 *
 * ## Licence
 *
 * All from [Unsplash](https://unsplash.com) under the [Unsplash
 * License](https://unsplash.com/license) — free for commercial use, no
 * permission needed, attribution appreciated but not required. None are
 * Unsplash+ (the paid tier), which the licence does *not* cover. Credits are
 * repeated in `public/images/calendar/CREDITS.md`.
 *
 * ## Two sizes
 *
 * `lg` 1200x800 for the feature card, `sm` 480x320 for the list tiles, both
 * cropped at download time — matching `lib/photos.ts`, and for the same
 * reason: no image-optimisation binary is needed on the host.
 */
export type CalendarArt = {
  /** 1200x800. The next-observance feature card. */
  lg: string
  /** 480x320. The small tiles beside it. */
  sm: string
  /** What the photograph actually shows. */
  alt: string
  credit: string
}

const art = (key: string, alt: string, credit: string): CalendarArt => ({
  lg: `/images/calendar/${key}-lg.jpg`,
  sm: `/images/calendar/${key}-sm.jpg`,
  alt,
  credit,
})

export const calendarArt: Record<ChurchDateKey, CalendarArt> = {
  'new-year': art('new-year', 'Fireworks bursting over a night sky', 'Philip Myrtorp / Unsplash'),
  epiphany: art(
    'epiphany',
    'A caravan of camels and riders crossing the desert at dusk',
    'Quentin Touvard / Unsplash',
  ),
  'ash-wednesday': art(
    'ash-wednesday',
    'A single candle burning in the dark',
    'Volodymyr Hryshchenko / Unsplash',
  ),
  'palm-sunday': art('palm-sunday', 'Green palm fronds against a bright sky', 'Alondra S / Unsplash'),
  'maundy-thursday': art(
    'maundy-thursday',
    'A broken loaf beside a pewter communion cup on linen',
    'Debby Hudson / Unsplash',
  ),
  'good-friday': art(
    'good-friday',
    'A plain wooden cross standing against the sky',
    'Aaron Burden / Unsplash',
  ),
  easter: art(
    'easter',
    'The sun rising over green hills with mist still in the valleys',
    'Hieu Do Quang / Unsplash',
  ),
  ascension: art(
    'ascension',
    'Sunlight breaking out from behind a tall cloud',
    'Gabriel Lamza / Unsplash',
  ),
  pentecost: art('pentecost', 'Flames against a dark background', 'Elisabeth Arnold / Unsplash'),
  'trinity-sunday': art(
    'trinity-sunday',
    'A white dove in flight against a clear sky',
    'Ahmed Nishaath / Unsplash',
  ),
  harvest: art('harvest', 'Ripe ears of wheat filling the frame', 'Nikolett Emmert / Unsplash'),
  advent: art('advent', 'Four lit candles, as on an Advent wreath', 'Max Beck / Unsplash'),
  'christmas-eve': art(
    'christmas-eve',
    'An outdoor nativity stable lit up at night',
    'Quilia / Unsplash',
  ),
  christmas: art(
    'christmas',
    'Nativity figures around the manger, warm lights behind them',
    'Gareth Harper / Unsplash',
  ),
  /*
   * Watch Night reuses the prayer photograph from `lib/photos.ts` rather than
   * getting one of its own. A vigil that sees the year out on its knees is a
   * room full of people praying — which is exactly what that picture is, and a
   * second photograph of the same thing would be a worse one.
   */
  'watch-night': {
    lg: '/images/photos/prayer-lg.jpg',
    sm: '/images/photos/prayer-sm.jpg',
    alt: 'People standing in a circle holding hands as they pray together',
    credit: 'Pedro Lima / Unsplash',
  },
}
