/**
 * Single source of truth for ministry identity, navigation and contact details.
 *
 * The ministry is **Christ My Soon Coming King Ministry**. "Praise Arena" is the
 * slogan it is also known by — it lives in `aka` and is always shown as a
 * second line, never in place of the name. Getting that the wrong way round
 * renames a church, so `name` and `aka` are deliberately separate fields rather
 * than one string that gets reused.
 *
 * TODO(ministry): replace the placeholder contact block and social handles with
 * the real ones. Everything else on the site reads from here.
 */
export const siteConfig = {
  name: 'Christ My Soon Coming King Ministry',
  legalName: 'Christ My Soon Coming King Ministry',
  shortName: 'CMSCK',
  aka: 'Praise Arena',
  tagline:
    'A deliverance and Holy Ghost ministry — where chains are broken, the Spirit moves, and everyone belongs.',
  description:
    'Christ My Soon Coming King Ministry (CMSCK), also known as Praise Arena — a deliverance and Holy Ghost church family founded in 2015 by Dr Prophet Samuel Orji. Healing, deliverance and love. Come for freedom, the power of the Spirit, and a people who will stand with you.',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  contact: {
    email: 'ccmscktv@gmail.com',
    // TODO(ministry): add the church telephone number in Admin → Settings.
    phone: '+000 000 0000',
    address: '8 Awoni Murphy Street, Haruna Bus Stop, College Road, Ogba, Lagos',
  },
  /*
   * The three gatherings, in the order of the week the church actually keeps.
   *
   * `time` holds the whole range rather than a start time. People plan a Sunday
   * around when a service *ends* at least as much as when it starts, and
   * "9:00 AM" told a first-time visitor with children nothing about that.
   */
  serviceTimes: [
    { day: 'Sunday', label: 'Super Pack Service', time: '9:00 AM – 1:00 PM' },
    { day: 'Wednesday', label: 'Morning Prayer — Speak to Your Day', time: '6:00 AM – 7:00 AM' },
    { day: 'Saturday', label: 'Deliverance Service', time: '9:00 AM – 12:00 PM' },
  ],
  /*
   * The ministry's own accounts. An empty string means "we are not on that
   * one" and the icon is hidden — a social button that goes to `#` is a dead
   * link, and a dead link on a church website reads as a church nobody looks
   * after.
   *
   * The YouTube handle here is also what the sermon importer reads: see
   * `lib/youtube.ts`, which turns it into a channel id and then into the
   * public Atom feed of uploads.
   */
  socials: {
    facebook: 'https://www.facebook.com/share/16gFeYjmda/',
    youtube: 'https://youtube.com/@christmysooncomingkingministry',
    instagram: '',
  },
} as const

/**
 * Is this social link actually set?
 *
 * The settings form stores `'#'` for a cleared field rather than an empty
 * string, so both have to count as "not configured" — otherwise a church that
 * is not on Instagram gets an Instagram button that goes nowhere.
 *
 * It lives here, beside the socials it inspects, rather than in
 * `lib/site-settings.ts` where it started. That module is marked `server-only`,
 * which meant every consumer of this one-line predicate — including the purely
 * computational `lib/seo.ts` — inherited a hard dependency on the server
 * runtime and could not be exercised outside it. `site-settings` re-exports it,
 * so existing imports are unaffected.
 */
export function hasSocial(link: string | null | undefined): link is string {
  return Boolean(link) && link !== '#'
}

export type NavItem = {
  href: string
  label: string
  /** Plain-language hint shown in the mobile drawer and on the home grid. */
  hint: string
  icon:
    | 'home'
    | 'cross'
    | 'family'
    | 'book'
    | 'user'
    | 'salvation'
    | 'disciples'
    | 'prayer'
    | 'events'
    | 'sermons'
    | 'community'
    | 'testimonies'
  /** Rendered as the teal call-to-action rather than a plain link. */
  emphasis?: boolean
}

/**
 * The top bar. Same order, same place, on every page.
 *
 * Eight is the ceiling, and it only fits because the desktop bar drops the
 * icons below 2xl — see `components/layout/header.tsx`. Doctrine and Founder
 * moved to `secondaryNav`: they are pages you read once, where sermons and the
 * community feed change every week. Both are still one tap away in the drawer
 * and in the footer, so nothing is orphaned.
 */
export const mainNav: NavItem[] = [
  { href: '/', label: 'Home', hint: 'Start here', icon: 'home' },
  { href: '/about', label: 'About', hint: 'Who we are', icon: 'cross' },
  { href: '/sermons', label: 'Sermons', hint: 'Watch and listen again', icon: 'sermons' },
  { href: '/events', label: 'Events', hint: 'What is happening next', icon: 'events' },
  { href: '/prayer', label: 'Prayer', hint: 'Pray and be prayed for', icon: 'prayer' },
  // Points at the hub, not the raw feed: the community section is now eleven
  // places, and the feed is only one of them.
  { href: '/community/hub', label: 'Community', hint: 'Talk with the family', icon: 'community' },
  { href: '/discipleship', label: 'Grow', hint: 'Six weeks, step by step', icon: 'disciples' },
  {
    href: '/salvation',
    label: 'Follow Jesus',
    hint: 'Start your journey today',
    icon: 'salvation',
    emphasis: true,
  },
]

/** Shown under a divider in the mobile drawer, and in the footer. */
export const secondaryNav: NavItem[] = [
  { href: '/doctrine', label: 'What we believe', hint: 'Our faith in simple words', icon: 'book' },
  { href: '/founder', label: 'Our founders', hint: 'Meet the pastor and his wife', icon: 'family' },
  {
    href: '/prayer/testimonies',
    label: 'Testimonies',
    hint: 'What God has been doing',
    icon: 'testimonies',
  },
]

/** Everything in the footer's Explore column — nothing gets orphaned. */
export const footerNav: NavItem[] = [
  ...mainNav.filter((item) => !item.emphasis),
  ...secondaryNav,
  { href: '/salvation', label: 'Follow Jesus', hint: 'Start your journey today', icon: 'salvation' },
]

export type QuickLink = {
  href: string
  label: string
  hint: string
  emoji: string
  icon:
    | 'cross'
    | 'family'
    | 'book'
    | 'userPlus'
    | 'sermons'
    | 'prayer'
    | 'events'
    | 'salvation'
    | 'disciples'
    | 'community'
    | 'testimonies'
    | 'church'
  /**
   * Which photograph sits on the tile. A name rather than a component, so this
   * stays a plain data file — see `lib/photos.ts`.
   */
  photo: 'worship' | 'scripture' | 'prayer' | 'together' | 'spirit' | 'learning'
  /** Later-phase features are shown but clearly marked, so nobody hits a dead end. */
  comingSoon?: boolean
  /**
   * Behind the members' door. Shown to everybody and still clickable — the
   * login page explains why and offers the register link — but marked, so a
   * visitor is told before they click rather than after.
   */
  membersOnly?: boolean
}

export const quickLinks: QuickLink[] = [
  { href: '/salvation', label: 'Follow Jesus', hint: 'Start your journey today', emoji: '❤️', icon: 'salvation', photo: 'worship' },
  { href: '/prayer', label: 'Prayer & Deliverance', hint: 'Ask for prayer, pray for others', emoji: '🙏', icon: 'prayer', photo: 'prayer' },
  { href: '/sermons', label: 'Sermons', hint: 'Watch and listen again', emoji: '📺', icon: 'sermons', photo: 'scripture' },
  { href: '/community/hub', label: 'Community', hint: 'Talk with the church family', emoji: '💬', icon: 'community', photo: 'together', membersOnly: true },
  { href: '/discipleship', label: 'Discipleship', hint: 'Grow step by step, six weeks', emoji: '📚', icon: 'disciples', photo: 'learning' },
  { href: '/prayer/testimonies', label: 'Testimonies', hint: 'What God has been doing', emoji: '✨', icon: 'testimonies', photo: 'worship' },
  { href: '/events', label: 'Events', hint: 'What is happening next', emoji: '🎉', icon: 'events', photo: 'spirit' },
  { href: '/about', label: 'About Us', hint: 'Our mandate, story and vision', emoji: '✝️', icon: 'cross', photo: 'worship' },
  { href: '/founder', label: 'Our Founders', hint: 'Meet the pastor and his wife', emoji: '👨‍👩‍👧‍👦', icon: 'family', photo: 'prayer' },
  { href: '/doctrine', label: 'What We Believe', hint: 'Our faith in simple words', emoji: '📖', icon: 'book', photo: 'scripture' },
  { href: '/register', label: 'Join Us', hint: 'Create your free account', emoji: '👤', icon: 'userPlus', photo: 'together' },
]

/**
 * Still to come. Both of the original entries — Sermons and Community — now
 * exist and have moved up into `quickLinks`.
 *
 * Online giving needs a payment provider (Stripe keys) before it can be built
 * at all, so it is listed here rather than half-built. Both render sites check
 * for an empty array, so this can go back to `[]` without anything breaking.
 */
export const futureLinks: QuickLink[] = [
  { href: '#', label: 'Online Giving', hint: 'Tithes and offerings, securely', emoji: '💝', icon: 'church', photo: 'worship', comingSoon: true },
]
