import { z } from 'zod'

/**
 * Shared by the forms (react-hook-form) and the API routes, so the browser and
 * the server can never disagree about what counts as valid.
 *
 * Error messages are written to be read by anyone — no jargon, no regex talk.
 */

const email = z
  .string()
  .min(1, 'Please enter your email address.')
  .email('That does not look like an email address yet.')
  .max(254, 'That email address is too long.')
  .transform((value) => value.trim().toLowerCase())

const password = z
  .string()
  .min(8, 'Your password needs at least 8 characters.')
  .max(72, 'Your password can be at most 72 characters.') // bcrypt truncates beyond 72 bytes
  .regex(/[A-Za-z]/, 'Please include at least one letter.')
  .regex(/[0-9]/, 'Please include at least one number.')

/** Whole years old on `on` (default: today). Handles leap days correctly. */
export function ageOn(birthDate: Date, on = new Date()) {
  let age = on.getFullYear() - birthDate.getFullYear()
  const monthDelta = on.getMonth() - birthDate.getMonth()
  if (monthDelta < 0 || (monthDelta === 0 && on.getDate() < birthDate.getDate())) age--
  return age
}

export const MINIMUM_AGE = 13
export const CONSENT_AGE = 18

/**
 * Optional text field: empty string and whitespace both become undefined.
 *
 * Declared up here rather than beside the other helpers further down, because
 * `registerSchema` below reads it while this module is still evaluating — a
 * `const` further down the file is still in its temporal dead zone at that
 * point and would throw on import.
 */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Please keep this under ${max} characters.`)
    .optional()
    .transform((value) => (value ? value : undefined))

export const registerSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Please tell us your name.')
      .transform((value) => value.trim().replace(/\s+/g, ' '))
      .pipe(
        z
          .string()
          .min(2, 'Please tell us your full name.')
          .max(80, 'That name is a bit too long.')
          .regex(/^[\p{L}\p{M}'’.\- ]+$/u, 'Please use letters only in your name.'),
      ),
    email,
    password,
    confirmPassword: z.string().min(1, 'Please type your password again.'),
    birthDate: z
      .string()
      .min(1, 'Please tell us your date of birth.')
      .refine((value) => !Number.isNaN(Date.parse(value)), 'Please enter a real date.')
      .refine((value) => {
        const date = new Date(value)
        return date <= new Date() && date.getFullYear() >= 1900
      }, 'Please check that date.'),
    /** Ticked by a parent or guardian for members aged 13–17. */
    parentalConsent: z.boolean().default(false),

    /*
     * Everything below is optional at registration and editable afterwards.
     *
     * A long compulsory form is the fastest way to lose somebody who came to
     * the site ready to join. Name, email, password and date of birth are all
     * that is genuinely required — the rest can be filled in over time from
     * /community/profile, and the form says so plainly.
     */
    phone: optionalText(40),
    address: optionalText(300),
    profession: optionalText(120),
    /** Which department (ministry) they would like to serve in. */
    ministryId: optionalText(40),
    neighbourhood: optionalText(80),
    // `boolean().refine` rather than `literal(true)` so the inferred field type
    // stays `boolean` and matches what the checkbox actually hands back.
    terms: z.boolean().refine((value) => value, {
      message: 'Please tick the box to agree before joining.',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'The two passwords do not match yet.',
    path: ['confirmPassword'],
  })
  // Hard floor: under-13s cannot hold an account here at all.
  .refine((data) => ageOn(new Date(data.birthDate)) >= MINIMUM_AGE, {
    message:
      'You need to be at least 13 to create an account. Please ask a parent or guardian — we would still love to see you on Sunday.',
    path: ['birthDate'],
  })
  // 13–17 may join, but only with a parent or guardian's say-so.
  .refine(
    (data) => {
      const age = ageOn(new Date(data.birthDate))
      return age >= CONSENT_AGE || data.parentalConsent
    },
    {
      message: 'Because you are under 18, a parent or guardian needs to agree as well.',
      path: ['parentalConsent'],
    },
  )

export type RegisterInput = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Please enter your password.'),
})

export type LoginInput = z.infer<typeof loginSchema>

// ---------------------------------------------------------------------------
// Phase 2B — Salvation decisions
// ---------------------------------------------------------------------------

export const decisionTypes = [
  'SALVATION',
  'REDEDICATION',
  'BAPTISM',
  'MEMBERSHIP',
  'PRAYER_REQUEST',
] as const

export const followUpStatuses = [
  'PENDING',
  'CONTACTED',
  'MEETING_SET',
  'DISCIPLESHIP_STARTED',
  'COMPLETED',
  'LOST_CONTACT',
] as const

const personName = z
  .string()
  .min(1, 'Please fill this in.')
  .transform((value) => value.trim().replace(/\s+/g, ' '))
  .pipe(
    z
      .string()
      .min(2, 'That looks a little short.')
      .max(60, 'That is a bit too long.')
      .regex(/^[\p{L}\p{M}'’.\- ]+$/u, 'Please use letters only.'),
  )

export const salvationStartSchema = z.object({
  decision: z.enum(decisionTypes).default('SALVATION'),
})

/** Records how far through the gospel journey someone has read. */
export const salvationStepSchema = z.object({
  step: z.enum(['gospel', 'prayer']),
})

export const salvationContactSchema = z
  .object({
    firstName: personName,
    lastName: personName,
    email: z
      .string()
      .trim()
      .max(254)
      .optional()
      .transform((value) => (value ? value.toLowerCase() : undefined))
      .refine((value) => !value || z.string().email().safeParse(value).success, {
        message: 'That does not look like an email address yet.',
      }),
    phone: z
      .string()
      .trim()
      .max(32)
      .optional()
      .transform((value) => (value ? value : undefined))
      .refine((value) => !value || /^[+0-9][0-9\s()-]{5,}$/.test(value), {
        message: 'Please enter a phone number we can call.',
      }),
    decision: z.enum(decisionTypes).default('SALVATION'),
    notes: optionalText(2000),
  })
  // Someone has to be reachable, or "follow-up" is a promise we cannot keep.
  .refine((data) => Boolean(data.email || data.phone), {
    message: 'Please give us either an email address or a phone number so we can reach you.',
    path: ['email'],
  })

export type SalvationContactInput = z.infer<typeof salvationContactSchema>

export const assignDecisionSchema = z.object({
  decisionId: z.string().min(1),
  /** Omit to let the round-robin choose. */
  assignedToId: z.string().min(1).optional(),
  notes: optionalText(2000),
})

export const updateDecisionSchema = z.object({
  decisionId: z.string().min(1),
  followUpStatus: z.enum(followUpStatuses).optional(),
  notes: optionalText(2000),
  nextContact: z
    .string()
    .datetime({ offset: true })
    .optional()
    .or(z.literal('').transform(() => undefined)),
  completed: z.boolean().optional(),
  discipleshipStarted: z.boolean().optional(),
})

// ---------------------------------------------------------------------------
// Phase 2B — Discipleship
// ---------------------------------------------------------------------------

export const progressSchema = z.object({
  courseSlug: z.string().min(1),
  lessonSlug: z.string().min(1),
  completed: z.boolean(),
})

export const courseSchema = z.object({
  title: z.string().trim().min(3, 'Please give the course a title.').max(120),
  description: optionalText(2000),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).default('BEGINNER'),
  image: optionalText(500),
  isActive: z.boolean().default(true),
  order: z.coerce.number().int().min(0).max(999).default(0),
})

export const weekSchema = z.object({
  courseId: z.string().min(1),
  weekNumber: z.coerce.number().int().min(1, 'Weeks start at 1.').max(104),
  title: z.string().trim().min(2, 'Please give the week a title.').max(120),
  description: optionalText(2000),
})

/** Textareas send one item per line; this turns them into arrays. */
const lines = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => {
    if (!value) return []
    const list = Array.isArray(value) ? value : value.split('\n')
    return list.map((item) => item.trim()).filter(Boolean)
  })

export const lessonSchema = z.object({
  weekId: z.string().min(1),
  order: z.coerce.number().int().min(1, 'Lessons start at 1.').max(99),
  title: z.string().trim().min(2, 'Please give the lesson a title.').max(160),
  content: z.string().trim().min(20, 'A lesson needs some content.'),
  bibleVerses: lines,
  reflectionQuestions: lines,
  videoUrl: optionalText(500),
  audioUrl: optionalText(500),
})

// ---------------------------------------------------------------------------
// Phase 3A — Prayer Portal
// ---------------------------------------------------------------------------

export const prayerCategories = [
  'SALVATION',
  'HEALING',
  'FINANCES',
  'FAMILY',
  'RELATIONSHIPS',
  'GUIDANCE',
  'THANKSGIVING',
  'GENERAL',
] as const

export const prayerUrgencies = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const
export const prayerVisibilities = ['PUBLIC', 'MEMBERS_ONLY', 'PRIVATE'] as const
export const prayerStatuses = ['ACTIVE', 'ANSWERED', 'ARCHIVED', 'FLAGGED'] as const
export const testimonyCategories = [
  'SALVATION',
  'HEALING',
  'PROVISION',
  'BREAKTHROUGH',
  'OTHER',
] as const

export const prayerRequestSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Please give your request a short title.')
    .max(120, 'Please keep the title under 120 characters.'),
  content: z
    .string()
    .trim()
    .min(10, 'Please tell us a little more so we know how to pray.')
    .max(4000, 'Please keep your request under 4000 characters.'),
  category: z.enum(prayerCategories).default('GENERAL'),
  urgency: z.enum(prayerUrgencies).default('NORMAL'),
  visibility: z.enum(prayerVisibilities).default('PUBLIC'),
  anonymous: z.boolean().default(false),
  verse: optionalText(160),
  imageUrl: optionalText(500),
  groupId: optionalText(40),
  notifyOnResponse: z.boolean().default(true),
  /** Guests only — ignored for signed-in members, who are already identified. */
  guestName: optionalText(80),
  guestEmail: z
    .string()
    .trim()
    .max(254)
    .optional()
    .transform((value) => (value ? value.toLowerCase() : undefined))
    .refine((value) => !value || z.string().email().safeParse(value).success, {
      message: 'That does not look like an email address yet.',
    }),
})

export type PrayerRequestInput = z.infer<typeof prayerRequestSchema>

/** Short on purpose: an encouragement, not an essay or a debate. */
export const prayerResponseSchema = z.object({
  content: z
    .string()
    .trim()
    .min(2, 'Please write a few words.')
    .max(200, 'Please keep encouragements under 200 characters.'),
  isPrivate: z.boolean().default(false),
  guestName: optionalText(80),
})

export type PrayerResponseInput = z.infer<typeof prayerResponseSchema>

export const prayerModerateSchema = z.object({
  status: z.enum(prayerStatuses).optional(),
  answerNote: optionalText(2000),
  flagged: z.boolean().optional(),
  flagReason: optionalText(300),
  needsPastoralFollowUp: z.boolean().optional(),
})

export const prayerGroupSchema = z.object({
  name: z.string().trim().min(3, 'Please name the group.').max(80),
  description: optionalText(2000),
  meetingTime: optionalText(120),
  isOnline: z.boolean().default(false),
  isPublic: z.boolean().default(true),
  isActive: z.boolean().default(true),
  shareRequests: z.boolean().default(true),
  leaderId: optionalText(40),
})

export const prayerGroupUpdateSchema = prayerGroupSchema.partial().extend({ id: z.string().min(1) })

export const groupPostSchema = z.object({
  groupId: z.string().min(1),
  content: z
    .string()
    .trim()
    .min(2, 'Please write something.')
    .max(2000, 'Please keep posts under 2000 characters.'),
})

export const testimonySchema = z.object({
  title: z.string().trim().min(3, 'Please give your story a title.').max(120),
  content: z
    .string()
    .trim()
    .min(30, 'Please tell us what God did — a few sentences is plenty.')
    .max(6000, 'Please keep your story under 6000 characters.'),
  category: z.enum(testimonyCategories).default('OTHER'),
  anonymous: z.boolean().default(false),
  guestName: optionalText(80),
  guestEmail: z
    .string()
    .trim()
    .max(254)
    .optional()
    .transform((value) => (value ? value.toLowerCase() : undefined))
    .refine((value) => !value || z.string().email().safeParse(value).success, {
      message: 'That does not look like an email address yet.',
    }),
})

export type TestimonyInput = z.infer<typeof testimonySchema>

export const testimonyModerateSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  isFeatured: z.boolean().optional(),
  rejectReason: optionalText(300),
})

export const testimonyCommentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(2, 'Please write a few words.')
    .max(400, 'Please keep comments under 400 characters.'),
})

// ---------------------------------------------------------------------------
// Phase 4A — Events
// ---------------------------------------------------------------------------

export const eventTypes = [
  'SERVICE',
  'CONFERENCE',
  'CRUSADE',
  'RETREAT',
  'BAPTISM',
  'MEMBERSHIP_CLASS',
  'SMALL_GROUP',
  'PRAYER_MEETING',
  'OUTREACH',
  'WORKSHOP',
  'OTHER',
] as const

export const eventStatuses = ['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'] as const

/** Accepts an ISO string or a datetime-local value; yields a Date. */
const dateTime = z
  .string()
  .min(1, 'Please choose a date and time.')
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Please enter a real date and time.')
  .transform((value) => new Date(value))

const optionalDateTime = z
  .string()
  .optional()
  .transform((value) => (value ? value : undefined))
  .refine((value) => value === undefined || !Number.isNaN(Date.parse(value)), 'Please enter a real date.')
  .transform((value) => (value ? new Date(value) : undefined))

export const eventSchema = z
  .object({
    title: z.string().trim().min(3, 'Please give the event a title.').max(140),
    description: optionalText(6000),
    type: z.enum(eventTypes).default('SERVICE'),
    startsAt: dateTime,
    endsAt: optionalDateTime,
    locationName: optionalText(160),
    address: optionalText(400),
    isOnline: z.boolean().default(false),
    onlineUrl: optionalText(500),
    /** Blank means unlimited, which is different from zero. */
    capacity: z
      .union([z.string(), z.number()])
      .optional()
      .transform((value) => {
        if (value === undefined || value === '' || value === null) return null
        const n = Number(value)
        return Number.isFinite(n) && n > 0 ? Math.floor(n) : null
      }),
    /** Entered in pounds; stored in pence. */
    price: z
      .union([z.string(), z.number()])
      .optional()
      .transform((value) => {
        const n = Number(value ?? 0)
        return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0
      }),
    currency: z.string().trim().length(3).default('GBP'),
    ministryId: optionalText(40),
    smallGroupId: optionalText(40),
    image: optionalText(500),
    isFeatured: z.boolean().default(false),
    status: z.enum(eventStatuses).default('DRAFT'),
    requiresRegistration: z.boolean().default(true),
    registrationClosesAt: optionalDateTime,
    cancellationDeadline: optionalDateTime,
    allowGuests: z.boolean().default(true),
    maxGuestsPerRegistration: z.coerce.number().int().min(0).max(20).default(5),
    allowWaitlist: z.boolean().default(true),
    collectAccessibility: z.boolean().default(true),
    collectDietary: z.boolean().default(false),
  })
  .refine((data) => !data.endsAt || data.endsAt > data.startsAt, {
    message: 'The end time has to be after the start time.',
    path: ['endsAt'],
  })
  .refine((data) => !data.isOnline || Boolean(data.onlineUrl), {
    message: 'Online events need a joining link.',
    path: ['onlineUrl'],
  })

export const eventUpdateSchema = z.object({ id: z.string().min(1) }).and(eventSchema)

export const eventRegistrationSchema = z.object({
  name: z
    .string()
    .min(1, 'Please tell us your name.')
    .transform((value) => value.trim().replace(/\s+/g, ' '))
    .pipe(z.string().min(2, 'Please give your full name.').max(80)),
  email: z
    .string()
    .min(1, 'Please enter your email address.')
    .email('That does not look like an email address yet.')
    .max(254)
    .transform((value) => value.trim().toLowerCase()),
  phone: z
    .string()
    .trim()
    .max(32)
    .optional()
    .transform((value) => (value ? value : undefined))
    .refine((value) => !value || /^[+0-9][0-9\s()-]{5,}$/.test(value), {
      message: 'Please enter a phone number we can call.',
    }),
  guests: z.coerce.number().int().min(0, 'That cannot be negative.').max(20).default(0),
  accessibilityNeeds: optionalText(500),
  dietaryNotes: optionalText(500),
})

export type EventRegistrationInput = z.infer<typeof eventRegistrationSchema>

/** Check-in accepts either the long QR token or the short desk code. */
export const checkInSchema = z.object({
  value: z
    .string()
    .trim()
    .min(4, 'Please scan a code or type the six-character one.')
    .max(200),
  method: z.enum(['QR', 'MANUAL', 'SELF']).default('MANUAL'),
})

// ---------------------------------------------------------------------------
// Phase 4B — Chat
// ---------------------------------------------------------------------------

export const chatMessageSchema = z
  .object({
    body: z.string().trim().max(4000, 'That message is too long — please split it up.').default(''),
    replyToId: optionalText(40),
    attachmentIds: z.array(z.string().min(1)).max(6).optional().default([]),
  })
  // A message needs to carry something: words, files, or both.
  .refine((data) => data.body.length > 0 || data.attachmentIds.length > 0, {
    message: 'Write something or attach a file.',
    path: ['body'],
  })

export const startConversationSchema = z
  .object({
    /** A direct thread with one person. */
    userId: optionalText(40),
    /** Or a named group with several. */
    title: optionalText(120),
    userIds: z.array(z.string().min(1)).max(50).optional(),
  })
  .refine((data) => Boolean(data.userId) || (data.userIds && data.userIds.length > 0), {
    message: 'Choose at least one person to talk to.',
    path: ['userIds'],
  })

export const reportMessageSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(4, 'Please say briefly what is wrong.')
    .max(500, 'Please keep it under 500 characters.'),
})

export const chatSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  retentionDays: z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((value) => {
      if (value === null || value === undefined || value === '') return null
      const n = Number(value)
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : null
    }),
  /** One word or phrase per line in the admin textarea. */
  bannedWords: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => {
      if (!value) return []
      const list = Array.isArray(value) ? value : value.split('\n')
      return list.map((item) => item.trim()).filter(Boolean).slice(0, 300)
    }),
})

export const chatBanSchema = z.object({
  userId: z.string().min(1),
  banned: z.boolean(),
  reason: optionalText(300),
})

export const reportReviewSchema = z.object({
  status: z.enum(['PENDING', 'REVIEWED', 'ACTIONED', 'DISMISSED']),
  reviewNote: optionalText(500),
  /** Remove the reported message as part of the same action. */
  deleteMessage: z.boolean().default(false),
})

// ---------------------------------------------------------------------------
// Phase 5 — Admin-editable content
// ---------------------------------------------------------------------------

export const pageContentSchema = z.object({
  title: z.string().trim().min(2, 'Please give the page a title.').max(140),
  subtitle: optionalText(300),
  content: z.string().trim().min(20, 'A page needs some content.').max(60000),
  published: z.boolean().default(true),
})

const url = (label: string) =>
  z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((value) => (value ? value : '#'))
    .refine((value) => value === '#' || /^https?:\/\//.test(value), {
      message: `${label} needs to start with http:// or https://`,
    })

export const siteSettingsSchema = z.object({
  name: z.string().trim().min(2, 'Please give the ministry its name.').max(120),
  legalName: z.string().trim().min(2, 'Please give the full registered name.').max(160),
  shortName: z.string().trim().min(1, 'Please give an abbreviation.').max(24),
  /** The slogan the ministry is also known by. Optional — not every church has one. */
  aka: z.string().trim().max(80).default(''),
  tagline: z.string().trim().min(4, 'Please write a short tagline.').max(300),
  description: z
    .string()
    .trim()
    .min(20, 'Please describe the ministry — this is what search engines show.')
    .max(600),
  contactEmail: z
    .string()
    .trim()
    .min(1, 'Please give an email address.')
    .email('That does not look like an email address yet.')
    .max(254)
    .transform((value) => value.toLowerCase()),
  contactPhone: z.string().trim().min(3, 'Please give a phone number.').max(40),
  contactAddress: z.string().trim().min(3, 'Please give an address.').max(300),
  /** Rows straight from the repeater; blank ones are dropped. */
  serviceTimes: z
    .array(
      z.object({
        day: z.string().trim().max(40).default(''),
        label: z.string().trim().max(80).default(''),
        time: z.string().trim().max(40).default(''),
      }),
    )
    .max(20)
    .default([])
    .transform((rows) => rows.filter((row) => row.day || row.time)),
  facebook: url('The Facebook link'),
  youtube: url('The YouTube link'),
  instagram: url('The Instagram link'),
})

export const gospelContentSchema = z.object({
  steps: z
    .array(
      z.object({
        id: z.string().trim().max(40).default(''),
        eyebrow: z.string().trim().max(60).default(''),
        title: z.string().trim().min(2, 'Each step needs a heading.').max(140),
        /** One paragraph per line in the textarea. */
        body: z
          .union([z.string(), z.array(z.string())])
          .transform((value) => {
            const list = Array.isArray(value) ? value : value.split('\n')
            return list.map((line) => line.trim()).filter(Boolean)
          })
          .refine((lines) => lines.length > 0, 'Each step needs at least one paragraph.'),
        verseReference: z.string().trim().max(80).default(''),
        verseText: z.string().trim().max(600).default(''),
        emoji: z.string().trim().max(8).default('✝️'),
      }),
    )
    .min(1, 'Keep at least one step.')
    .max(8),
  prayerTitle: z.string().trim().min(2, 'The prayer needs a heading.').max(140),
  prayerIntro: z.string().trim().min(10, 'Please introduce the prayer.').max(1200),
  prayerLines: z
    .union([z.string(), z.array(z.string())])
    .transform((value) => {
      const list = Array.isArray(value) ? value : value.split('\n')
      return list.map((line) => line.trim()).filter(Boolean)
    })
    .refine((lines) => lines.length > 0, 'The prayer needs at least one line.'),
  prayerAfter: z.string().trim().min(10, 'Please say what praying it means.').max(1200),
  afterVerseReference: z.string().trim().max(80).default(''),
  afterVerseText: z.string().trim().max(600).default(''),
  nextSteps: z
    .array(
      z.object({
        emoji: z.string().trim().max(8).default('•'),
        title: z.string().trim().min(2, 'Each next step needs a heading.').max(120),
        body: z.string().trim().min(4, 'Each next step needs a sentence.').max(600),
      }),
    )
    .max(8)
    .default([]),
})

/** Update variants: every field optional, plus the id of the row to change. */
export const courseUpdateSchema = courseSchema.partial().extend({ id: z.string().min(1) })
export const weekUpdateSchema = weekSchema.partial().extend({ id: z.string().min(1) })
export const lessonUpdateSchema = lessonSchema.partial().extend({ id: z.string().min(1) })

/** Strength hint for the register form's live meter. */
export function passwordStrength(value: string): { score: 0 | 1 | 2 | 3; label: string } {
  if (!value) return { score: 0, label: 'Type a password' }

  let score = 0
  if (value.length >= 8) score++
  if (/[A-Za-z]/.test(value) && /[0-9]/.test(value)) score++
  if (value.length >= 12 || /[^A-Za-z0-9]/.test(value)) score++

  const labels = ['Too short', 'Getting there', 'Good password', 'Strong password'] as const
  return { score: Math.min(score, 3) as 0 | 1 | 2 | 3, label: labels[Math.min(score, 3)] }
}

// ---------------------------------------------------------------------------
// Phase 2A — Sermon Centre
// ---------------------------------------------------------------------------

export const sermonStatuses = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const

/**
 * A pasted media link.
 *
 * Only checks the shape here — `toEmbed` in lib/sermons.ts is what decides
 * whether it can actually be played, and that is the check that keeps arbitrary
 * URLs out of an iframe.
 */
const mediaUrl = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((value) => (value ? value : undefined))
  .refine((value) => value === undefined || /^https?:\/\//i.test(value), {
    message: 'A link needs to start with http:// or https://',
  })

/**
 * One item per line in a textarea → a trimmed, de-duplicated, capped array.
 *
 * The plain `lines` above does the same job for the discipleship editor; this
 * one adds the cap and the case folding that tag fields need.
 */
const boundedLines = (max: number, options: { lowercase?: boolean } = {}) =>
  z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => {
      if (!value) return []
      const list = Array.isArray(value) ? value : value.split('\n')
      const cleaned = list
        .map((item) => {
          const trimmed = item.trim()
          return options.lowercase ? trimmed.toLowerCase() : trimmed
        })
        .filter(Boolean)
        .slice(0, max)
      return [...new Set(cleaned)]
    })

export const sermonSeriesSchema = z.object({
  title: z.string().trim().min(2, 'Please give the series a title.').max(140),
  description: optionalText(4000),
  image: optionalText(500),
  startDate: optionalDateTime,
  endDate: optionalDateTime,
  isActive: z.boolean().default(true),
})

export const sermonSchema = z.object({
  title: z.string().trim().min(3, 'Please give the sermon a title.').max(180),
  description: optionalText(4000),
  speaker: z.string().trim().min(2, 'Who preached this?').max(120),
  speakerBio: optionalText(2000),
  speakerImage: optionalText(500),
  seriesId: optionalText(40),
  ministryId: optionalText(40),
  biblePassage: optionalText(200),
  bibleText: optionalText(8000),
  preachedAt: dateTime,
  /** Blank is honest — better than a made-up zero. */
  duration: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => {
      if (value === undefined || value === '' || value === null) return null
      const n = Number(value)
      return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), 1440) : null
    }),
  videoUrl: mediaUrl,
  audioUrl: mediaUrl,
  transcript: optionalText(200000),
  notes: optionalText(60000),
  studyQuestions: boundedLines(20),
  topics: boundedLines(15, { lowercase: true }),
  tags: boundedLines(15, { lowercase: true }),
  image: optionalText(500),
  isFeatured: z.boolean().default(false),
  status: z.enum(sermonStatuses).default('DRAFT'),
})

export const sermonUpdateSchema = sermonSchema.partial()

/** Sent by the player as someone watches, so a view is only counted once. */
export const sermonViewSchema = z.object({
  watchSeconds: z.coerce.number().int().min(0).max(60 * 60 * 12).default(0),
  completed: z.boolean().default(false),
})

// ---------------------------------------------------------------------------
// Phase 3B — Community
// ---------------------------------------------------------------------------

export const postTypes = ['GENERAL', 'PRAYER', 'TESTIMONY', 'QUESTION', 'ENCOURAGEMENT'] as const
/*
 * Declared here rather than with the other Phase 3.5 lists further down,
 * because `postSchema` below reads it while this module is still evaluating —
 * a `const` further down the file is still in its temporal dead zone at that
 * point, and would throw on import.
 */
export const postChannels = ['FEED', 'ENCOURAGEMENT', 'VERSE', 'CHALLENGE', 'WORSHIP'] as const
export const postVisibilities = ['PUBLIC', 'MEMBERS', 'MINISTRY', 'SMALL_GROUP'] as const

export const postSchema = z
  .object({
    body: z
      .string()
      .trim()
      .min(2, 'Please write something first.')
      .max(5000, 'Please keep a post under 5000 characters.'),
    type: z.enum(postTypes).default('GENERAL'),
    visibility: z.enum(postVisibilities).default('MEMBERS'),
    ministryId: optionalText(40),
    smallGroupId: optionalText(40),
    videoUrl: mediaUrl,
    /** Which board it goes on. The server re-checks what each one allows. */
    channel: z.enum(postChannels).default('FEED'),
    /** Shout-outs name somebody. Ignored on other channels. */
    praisedId: optionalText(40),
    /**
     * Only honoured in a group that has anonymous posting switched on — the
     * route verifies that rather than trusting this flag.
     */
    anonymous: z.boolean().default(false),
  })
  /*
   * The server re-checks membership in `canPostToScope` — this only catches the
   * empty dropdown early, so the person gets a field error instead of a 403.
   */
  .refine((data) => data.visibility !== 'MINISTRY' || Boolean(data.ministryId), {
    message: 'Please choose which ministry.',
    path: ['ministryId'],
  })
  .refine((data) => data.visibility !== 'SMALL_GROUP' || Boolean(data.smallGroupId), {
    message: 'Please choose which small group.',
    path: ['smallGroupId'],
  })

export const postCommentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'Please write a reply first.')
    .max(2000, 'Please keep a reply under 2000 characters.'),
  parentId: optionalText(40),
})

export const postReportSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(4, 'Please tell us briefly what is wrong.')
    .max(500, 'Please keep this under 500 characters.'),
})

export const postModerationSchema = z.object({
  action: z.enum(['pin', 'unpin', 'remove', 'restore', 'dismiss']),
  note: optionalText(500),
})

// ---------------------------------------------------------------------------
// Phase 3.5 — A fuller community
// ---------------------------------------------------------------------------

export const reactionTypes = ['PRAYING', 'LOVE', 'ENCOURAGED', 'AMEN', 'REJOICING'] as const
export const groupKinds = [
  'SMALL_GROUP',
  'NEIGHBOURHOOD',
  'INTEREST',
  'SERVICE_TIME',
  'SUPPORT',
  'LEADERSHIP',
] as const
export const helpKinds = ['REQUEST', 'OFFER'] as const
export const helpCategories = [
  'TRANSPORT',
  'MOVING',
  'MEALS',
  'CHILDCARE',
  'REPAIRS',
  'TECH',
  'TUTORING',
  'ADMIN',
  'CLEANING',
  'OTHER',
] as const
export const helpStatuses = ['OPEN', 'CLAIMED', 'DONE', 'CANCELLED'] as const
export const careKinds = ['QUESTION', 'BENEVOLENCE', 'PASTORAL_VISIT'] as const
export const careStatuses = ['OPEN', 'IN_PROGRESS', 'ANSWERED', 'CLOSED'] as const
export const initiativeKinds = ['READING_PLAN', 'FAST', 'CHALLENGE'] as const

/** A member profile. Every field is optional — a blank profile is valid. */
export const memberProfileSchema = z.object({
  headline: optionalText(120),
  bio: optionalText(2000),
  neighbourhood: optionalText(80),
  phone: optionalText(40),
  address: optionalText(300),
  profession: optionalText(120),
  spiritualGifts: boundedLines(12, { lowercase: true }),
  interests: boundedLines(15, { lowercase: true }),
  skills: boundedLines(15, { lowercase: true }),
  mentorAvailable: z.boolean().default(false),
  seekingMentor: z.boolean().default(false),
  listed: z.boolean().default(true),
  showEmail: z.boolean().default(false),
  showPhone: z.boolean().default(false),
  showBirthday: z.boolean().default(false),
  showNeighbourhood: z.boolean().default(true),
  showAddress: z.boolean().default(false),
  showProfession: z.boolean().default(true),
})

/**
 * Pause notifications for a while.
 *
 * Hours rather than a date, because "quiet until Monday" is a calculation and
 * "for the next 24 hours" is a decision. Zero clears it.
 */
export const snoozeSchema = z.object({
  hours: z.coerce.number().int().min(0).max(24 * 30).default(0),
})

export const reactionSchema = z.object({
  /** Null removes the reaction — pressing the same one again is a toggle. */
  type: z.enum(reactionTypes).nullable().default(null),
})

export const shoutOutSchema = z.object({
  /** Who is being thanked. Optional — some thanks are for everybody. */
  praisedId: optionalText(40),
  body: z
    .string()
    .trim()
    .min(4, 'Tell them what you are thankful for.')
    .max(600, 'Keep a shout-out short — under 600 characters.'),
})

export const helpPostSchema = z.object({
  kind: z.enum(helpKinds),
  category: z.enum(helpCategories).default('OTHER'),
  title: z.string().trim().min(4, 'Give it a short title.').max(140),
  body: z.string().trim().min(10, 'Please say a little more.').max(3000),
  timeframe: optionalText(120),
  area: optionalText(80),
})

export const helpReplySchema = z.object({
  body: z.string().trim().min(2, 'Please write a reply.').max(1500),
})

export const helpStatusSchema = z.object({
  status: z.enum(helpStatuses),
  /** Set when accepting an offer of help. */
  claimedById: optionalText(40),
})

export const careRequestSchema = z.object({
  kind: z.enum(careKinds),
  subject: z.string().trim().min(4, 'Give it a subject.').max(160),
  body: z.string().trim().min(10, 'Please tell us a little more.').max(5000),
  /** Send it without your name attached. */
  anonymous: z.boolean().default(false),
  replyToEmail: z
    .string()
    .trim()
    .max(254)
    .optional()
    .transform((value) => (value ? value.toLowerCase() : undefined))
    .refine((value) => !value || z.string().email().safeParse(value).success, {
      message: 'That does not look like an email address yet.',
    }),
})

export const careReviewSchema = z.object({
  status: z.enum(careStatuses),
  response: optionalText(5000),
  assignedToId: optionalText(40),
})

export const initiativeSchema = z
  .object({
    kind: z.enum(initiativeKinds),
    title: z.string().trim().min(3, 'Give it a title.').max(140),
    description: optionalText(600),
    details: optionalText(20000),
    startsOn: dateTime,
    endsOn: dateTime,
    isActive: z.boolean().default(true),
    isFeatured: z.boolean().default(false),
    /// One day per line: "John 1–3" or "Encourage a stranger".
    days: boundedLines(400),
  })
  .refine((data) => data.endsOn >= data.startsOn, {
    message: 'The end date has to be on or after the start date.',
    path: ['endsOn'],
  })

export const initiativeJoinSchema = z.object({
  intent: optionalText(200),
  visible: z.boolean().default(true),
})

export const initiativeLogSchema = z.object({
  dayNumber: z.coerce.number().int().min(1).max(400),
  note: optionalText(2000),
})

export const dailyVerseSchema = z.object({
  /** The day it belongs to. One verse per day, enforced by the database. */
  showOn: dateTime,
  reference: z.string().trim().min(2, 'Which passage?').max(120),
  text: z.string().trim().min(4, 'Please paste the verse.').max(2000),
  reflection: optionalText(2000),
})

export const pollSchema = z
  .object({
    question: z.string().trim().min(4, 'What are you asking?').max(200),
    /** One option per line. */
    options: boundedLines(10),
    multiple: z.boolean().default(false),
    closesAt: optionalDateTime,
    visibility: z.enum(postVisibilities).default('MEMBERS'),
  })
  .refine((data) => data.options.length >= 2, {
    message: 'A poll needs at least two options.',
    path: ['options'],
  })

export const pollVoteSchema = z.object({
  optionIds: z.array(z.string().min(1)).min(1, 'Choose an answer.').max(10),
})

export const groupSchema = z.object({
  name: z.string().trim().min(2, 'Give the group a name.').max(120),
  kind: z.enum(groupKinds).default('SMALL_GROUP'),
  description: optionalText(2000),
  meetingTime: optionalText(120),
  location: optionalText(160),
  isOnline: z.boolean().default(false),
  isPublic: z.boolean().default(true),
  inviteOnly: z.boolean().default(false),
  allowAnonymous: z.boolean().default(false),
  capacity: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => {
      if (value === undefined || value === '' || value === null) return null
      const n = Number(value)
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : null
    }),
  leaderId: optionalText(40),
})

export const householdSchema = z.object({
  name: z.string().trim().min(2, 'Give the household a name.').max(120),
})

export const householdMemberSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Which member?')
    .email('That does not look like an email address yet.')
    .max(254)
    .transform((value) => value.toLowerCase()),
  isGuardian: z.boolean().default(false),
})

/** A question asked of a sermon. Short on purpose — this is search, not chat. */
export const askSermonSchema = z.object({
  question: z
    .string()
    .trim()
    .min(4, 'Please write a question first.')
    .max(300, 'Please keep the question short — a sentence is plenty.'),
})

// ---------------------------------------------------------------------------
// Membership extras, the church calendar, announcements and the daily word
// ---------------------------------------------------------------------------

export const announcementAudiences = ['PUBLIC', 'MEMBERS', 'MINISTRY'] as const

export const announcementSchema = z
  .object({
    title: z.string().trim().min(3, 'Give the announcement a title.').max(160),
    body: z.string().trim().min(5, 'Please say a little more.').max(6000),
    /** Blank means the whole church; set means that department only. */
    ministryId: optionalText(40),
    audience: z.enum(announcementAudiences).default('MEMBERS'),
    startsAt: optionalDateTime,
    endsAt: optionalDateTime,
    pinned: z.boolean().default(false),
  })
  .refine((data) => data.audience !== 'MINISTRY' || Boolean(data.ministryId), {
    message: 'A departmental announcement needs a department.',
    path: ['ministryId'],
  })
  .refine((data) => !data.endsAt || !data.startsAt || data.endsAt > data.startsAt, {
    message: 'The end date has to be after the start date.',
    path: ['endsAt'],
  })

export const calendarDateSchema = z
  .object({
    /** Matches a computed feast to override it, or names a new date. */
    key: z
      .string()
      .trim()
      .min(2, 'Give it a short key, e.g. christmas.')
      .max(60)
      .regex(/^[a-z0-9-]+$/, 'Use lower-case letters, numbers and hyphens only.'),
    title: z.string().trim().min(2, 'Give it a title.').max(140),
    description: optionalText(600),
    /** Fixed annual dates. Leave blank for a computed feast or a one-off. */
    month: z.coerce.number().int().min(1).max(12).optional().nullable(),
    day: z.coerce.number().int().min(1).max(31).optional().nullable(),
    /** A date that does not repeat — a convention, a crusade. */
    onceOn: optionalDateTime,
    image: optionalText(500),
    accent: optionalText(24),
    isActive: z.boolean().default(true),
    order: z.coerce.number().int().min(0).max(999).default(0),
  })
  .refine((data) => !data.month === !data.day, {
    message: 'Give both a month and a day, or neither.',
    path: ['day'],
  })

export const pastorsWordSchema = z.object({
  /** The day it belongs to. One per day, enforced by the database. */
  showOn: dateTime,
  title: z.string().trim().min(3, 'Give it a heading.').max(140),
  body: z.string().trim().min(20, 'Please write a little more.').max(4000),
  reference: optionalText(120),
  author: optionalText(120),
})
