# Christian calendar photo credits

One photograph for each day in the Christian year, shown on the home page beside the
countdown to it. The mapping lives in [`lib/calendar-art.ts`](../../../lib/calendar-art.ts).

All are from [Unsplash](https://unsplash.com) under the
[Unsplash License](https://unsplash.com/license):

> Unsplash photos are made to be used freely. All photos can be downloaded and used for
> free, for commercial and non-commercial purposes. No permission needed.

None are from **Unsplash+**, the paid tier — that licence is different and does not allow
this. If you replace any of these, check the same thing.

Attribution is **not required** by the licence. It is recorded here because it is the
decent thing to do.

| Day | File | Photographer | Shows |
| --- | --- | --- | --- |
| New Year's Day | `new-year-*.jpg` | Philip Myrtorp | Fireworks bursting over a night sky |
| Epiphany | `epiphany-*.jpg` | Quentin Touvard | A caravan of camels and riders crossing the desert at dusk |
| Ash Wednesday | `ash-wednesday-*.jpg` | Volodymyr Hryshchenko | A single candle burning in the dark |
| Palm Sunday | `palm-sunday-*.jpg` | Alondra S | Green palm fronds against a bright sky |
| Maundy Thursday | `maundy-thursday-*.jpg` | Debby Hudson | A broken loaf beside a pewter communion cup |
| Good Friday | `good-friday-*.jpg` | Aaron Burden | A plain wooden cross against the sky |
| Easter Sunday | `easter-*.jpg` | Hieu Do Quang | The sun rising over green hills, mist still in the valleys |
| Ascension Day | `ascension-*.jpg` | Gabriel Lamza | Sunlight breaking out from behind a tall cloud |
| Pentecost | `pentecost-*.jpg` | Elisabeth Arnold | Flames against a dark background |
| Trinity Sunday | `trinity-sunday-*.jpg` | Ahmed Nishaath | A white dove in flight against a clear sky |
| Harvest Thanksgiving | `harvest-*.jpg` | Nikolett Emmert | Ripe ears of wheat filling the frame |
| Advent Sunday | `advent-*.jpg` | Max Beck | Four lit candles, as on an Advent wreath |
| Christmas Eve | `christmas-eve-*.jpg` | Quilia | An outdoor nativity stable lit up at night |
| Christmas Day | `christmas-*.jpg` | Gareth Harper | Nativity figures around the manger |
| Watch Night | *(reuses `../photos/prayer-*.jpg`)* | Pedro Lima | People holding hands in a circle, praying |

Each is stored twice: `-lg` at 1200×800 for the feature card, `-sm` at 480×320 for the
list tiles. Both were cropped at download time, so the site needs no image-optimisation
binary on the host.

## Three of these were rejected before they got here

The first attempt at Easter, Epiphany and Harvest were thrown out after being looked at:

- **Easter** was a fire burning in the mouth of a cave. On paper it was "sunlight in a
  stone tomb". On screen it read as a furnace.
- **Epiphany** was a starfield so dark it rendered as a blank rectangle at tile size, and
  no star in it stood out.
- **Harvest** was a wheat field under a blown-out white sky — more than half the frame was
  pure white, which on a white page looks like a broken image.

The standard is that the picture describes the day. A photograph that needs a caption to
explain what it has to do with Easter has failed, however good a photograph it is.

## Replacing these with your own

Encouraged, especially for the days your church actually keeps.

1. Crop to 3:2 and save as `<key>-lg.jpg` (1200×800) and `<key>-sm.jpg` (480×320), where
   `<key>` matches the key in `lib/church-year.ts`.
2. Or upload through **Admin → Christian calendar**, which stores the picture in the
   database and overrides the file here without a deploy.
3. **Get permission before publishing a photograph in which anybody is recognisable** —
   especially children.
