/**
 * Seeds the three editable pages and, optionally, a first ADMIN account.
 *
 * Run with: npm run db:seed
 *
 * Page content is upserted by slug, so re-running is safe — but note it will
 * overwrite edits made in the admin dashboard. The admin user is only created
 * if SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are present in the environment.
 */
import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

import { staticCourses } from '../content/discipleship'
import { staticPages } from '../content/pages'
import { seedPosts, seedSeries, seedSermons } from '../content/sermons'

const prisma = new PrismaClient()

async function seedPages() {
  for (const page of staticPages) {
    await prisma.pageContent.upsert({
      where: { slug: page.slug },
      update: {
        title: page.title,
        subtitle: page.subtitle,
        content: page.content,
        meta: (page.meta ?? {}) as object,
        published: true,
      },
      create: {
        slug: page.slug,
        title: page.title,
        subtitle: page.subtitle,
        content: page.content,
        meta: (page.meta ?? {}) as object,
        published: true,
      },
    })
    console.log(`  ✓ page "${page.slug}"`)
  }
}

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.SEED_ADMIN_PASSWORD
  const name = process.env.SEED_ADMIN_NAME?.trim() || 'Ministry Admin'

  if (!email || !password) {
    console.log('  – skipped admin (set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create one)')
    return
  }

  if (password.length < 8) {
    console.warn('  ! SEED_ADMIN_PASSWORD must be at least 8 characters — admin not created')
    return
  }

  const passwordHash = await bcrypt.hash(password, 12)

  await prisma.user.upsert({
    where: { email },
    update: { role: Role.ADMIN },
    create: { email, name, password: passwordHash, role: Role.ADMIN },
  })
  console.log(`  ✓ admin "${email}"`)
}

/**
 * Upserts the discipleship curriculum by slug at every level.
 *
 * Because lessons are matched on their (stable) slug, re-running this updates
 * the wording without touching anyone's progress — progress records store
 * lesson slugs, not ids.
 */
async function seedDiscipleship() {
  for (const course of staticCourses) {
    const courseRecord = await prisma.discipleshipCourse.upsert({
      where: { slug: course.slug },
      update: {
        title: course.title,
        description: course.description,
        difficulty: course.difficulty,
        order: course.order,
        isActive: true,
      },
      create: {
        slug: course.slug,
        title: course.title,
        description: course.description,
        difficulty: course.difficulty,
        order: course.order,
        isActive: true,
      },
      select: { id: true },
    })

    for (const week of course.weeks) {
      const weekRecord = await prisma.discipleshipWeek.upsert({
        where: { courseId_weekNumber: { courseId: courseRecord.id, weekNumber: week.weekNumber } },
        update: { title: week.title, description: week.description },
        create: {
          courseId: courseRecord.id,
          weekNumber: week.weekNumber,
          title: week.title,
          description: week.description,
        },
        select: { id: true },
      })

      for (const lesson of week.lessons) {
        await prisma.discipleshipLesson.upsert({
          where: { slug: lesson.slug },
          update: {
            weekId: weekRecord.id,
            order: lesson.order,
            title: lesson.title,
            content: lesson.content,
            bibleVerses: lesson.bibleVerses,
            reflectionQuestions: lesson.reflectionQuestions,
          },
          create: {
            weekId: weekRecord.id,
            slug: lesson.slug,
            order: lesson.order,
            title: lesson.title,
            content: lesson.content,
            bibleVerses: lesson.bibleVerses,
            reflectionQuestions: lesson.reflectionQuestions,
          },
        })
      }
    }

    const lessonCount = course.weeks.reduce((total, week) => total + week.lessons.length, 0)
    console.log(`  ✓ course "${course.slug}" (${course.weeks.length} weeks, ${lessonCount} lessons)`)
  }
}

/**
 * Starter prayer groups. Upserted by slug, so renaming one in the admin UI and
 * re-running the seed will not create a duplicate.
 *
 * TODO(ministry): rename these to match the groups your church actually runs.
 */
const prayerGroups = [
  {
    slug: 'mens-prayer',
    name: "Men's Prayer",
    description: 'Men of the house standing together in prayer for our families, work and city.',
    meetingTime: 'Saturdays, 6:00 AM',
  },
  {
    slug: 'womens-intercessors',
    name: "Women's Intercessors",
    description: 'Women who carry this church, its children and its homes before God.',
    meetingTime: 'Tuesdays, 10:00 AM',
  },
  {
    slug: 'youth-prayer',
    name: 'Youth Prayer',
    description: 'For our young people — school, friendships, calling and courage.',
    meetingTime: 'Fridays, 5:00 PM',
  },
  {
    slug: 'early-morning-watch',
    name: 'Early Morning Watch',
    description: 'A quiet, faithful few who meet online before the day begins.',
    meetingTime: 'Weekdays, 5:30 AM',
    isOnline: true,
  },
]

async function seedPrayerGroups() {
  for (const group of prayerGroups) {
    await prisma.prayerGroup.upsert({
      where: { slug: group.slug },
      update: {
        name: group.name,
        description: group.description,
        meetingTime: group.meetingTime,
        isOnline: group.isOnline ?? false,
      },
      create: {
        slug: group.slug,
        name: group.name,
        description: group.description,
        meetingTime: group.meetingTime,
        isOnline: group.isOnline ?? false,
        isPublic: true,
        isActive: true,
      },
    })
    console.log(`  ✓ prayer group "${group.slug}"`)
  }
}

/**
 * Starter ministries and small groups.
 *
 * TODO(ministry): rename these to the ones your church actually runs. Events,
 * volunteer rotas and (later) group chats all hang off them.
 */
const ministries = [
  { slug: 'worship', name: 'Worship', description: 'Singers, musicians and the sound desk.', order: 1 },
  { slug: 'ushers', name: 'Ushers & Welcome', description: 'The first face every visitor sees.', order: 2 },
  { slug: 'childrens', name: "Children's Ministry", description: 'Teaching and caring for our youngest.', order: 3 },
  { slug: 'youth', name: 'Youth', description: 'Walking with our teenagers.', order: 4 },
  { slug: 'media', name: 'Media & Tech', description: 'Streaming, slides and sound.', order: 5 },
  { slug: 'outreach', name: 'Outreach', description: 'Taking the good news beyond our walls.', order: 6 },
]

const smallGroups = [
  { slug: 'tuesday-north', name: 'Tuesday Night — North', meetingTime: 'Tuesdays, 7:00 PM', location: 'Hosted in homes' },
  { slug: 'thursday-central', name: 'Thursday Central', meetingTime: 'Thursdays, 7:30 PM', location: 'Church annexe' },
  { slug: 'young-adults', name: 'Young Adults', meetingTime: 'Sundays, 4:00 PM', location: 'The café' },
]

async function seedMinistries() {
  for (const ministry of ministries) {
    await prisma.ministry.upsert({
      where: { slug: ministry.slug },
      update: { name: ministry.name, description: ministry.description, order: ministry.order },
      create: { ...ministry, isActive: true },
    })
  }
  console.log(`  ✓ ${ministries.length} ministries`)

  for (const group of smallGroups) {
    await prisma.smallGroup.upsert({
      where: { slug: group.slug },
      update: { name: group.name, meetingTime: group.meetingTime, location: group.location },
      create: { ...group, isPublic: true, isActive: true },
    })
  }
  console.log(`  ✓ ${smallGroups.length} small groups`)
}

/**
 * Starter sermons and series.
 *
 * Upserted by slug, so re-running updates the wording without creating
 * duplicates — and without touching `viewCount`, which belongs to real
 * listeners rather than the seed.
 */
async function seedSermonCentre() {
  const seriesIds = new Map<string, string>()

  for (const series of seedSeries) {
    const record = await prisma.sermonSeries.upsert({
      where: { slug: series.slug },
      update: { title: series.title, description: series.description, isActive: series.isActive },
      create: { ...series },
      select: { id: true },
    })
    seriesIds.set(series.slug, record.id)
  }
  console.log(`  ✓ ${seedSeries.length} sermon series`)

  for (const sermon of seedSermons) {
    const { slug, seriesSlug, daysAgo, ...rest } = sermon
    const preachedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
    const data = {
      ...rest,
      preachedAt,
      seriesId: seriesSlug ? (seriesIds.get(seriesSlug) ?? null) : null,
      tags: [],
      status: 'PUBLISHED' as const,
    }

    await prisma.sermon.upsert({ where: { slug }, update: data, create: { ...data, slug } })
  }
  console.log(`  ✓ ${seedSermons.length} sermons`)
}

/**
 * The opening posts in the community feed.
 *
 * Needs an admin to author them, so it is skipped entirely when no admin was
 * seeded — an orphaned post has no author to show, and the schema will not
 * allow one anyway. Matched on exact body text, because a post has no slug.
 */
async function seedCommunity() {
  const author = await prisma.user.findFirst({
    where: { role: Role.ADMIN },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })

  if (!author) {
    console.log('  – skipped community posts (no admin account to author them)')
    return
  }

  for (const post of seedPosts) {
    const existing = await prisma.post.findFirst({
      where: { authorId: author.id, body: post.body },
      select: { id: true },
    })
    if (existing) continue

    await prisma.post.create({
      data: { ...post, authorId: author.id, visibility: 'PUBLIC' },
    })
  }
  console.log(`  ✓ ${seedPosts.length} community posts`)
}

/**
 * Phase 3.5 starter content.
 *
 * Groups of every kind, a reading plan, a fast, this week's challenge, and a
 * fortnight of verses. All upserted by a stable key so re-running the seed
 * refreshes the wording without duplicating anything or resetting anyone's
 * progress.
 */
async function seedCommunityExtras() {
  // --- Groups of each kind -------------------------------------------------
  const groups = [
    {
      slug: 'downtown',
      name: 'CMSCK — Downtown',
      kind: 'NEIGHBOURHOOD' as const,
      description: 'Members living in and around the town centre. Lifts, prayer and local outreach.',
      meetingTime: 'Second Saturday, 10:00 AM',
    },
    {
      slug: 'east-side',
      name: 'CMSCK — East Side',
      kind: 'NEIGHBOURHOOD' as const,
      description: 'The east side family. We share school runs and pray for our streets.',
      meetingTime: 'Second Saturday, 10:00 AM',
    },
    {
      slug: 'church-football',
      name: 'Church Football',
      kind: 'INTEREST' as const,
      description: 'All abilities, no trials, no shouting. Bring water.',
      meetingTime: 'Saturdays, 8:00 AM',
    },
    {
      slug: 'sunday-9am',
      name: 'Sunday 9:00 AM',
      kind: 'SERVICE_TIME' as const,
      description: 'Everyone who comes to the early service. Plan lunch together here.',
      meetingTime: 'Sundays, 9:00 AM',
    },
    {
      slug: 'grief-and-loss',
      name: 'Grief & Loss',
      kind: 'SUPPORT' as const,
      description:
        'A quiet, private place for anyone walking through loss. You can post here without your name showing.',
      meetingTime: 'Thursdays, 7:00 PM',
      inviteOnly: true,
      isPublic: false,
      allowAnonymous: true,
    },
    {
      slug: 'freedom-group',
      name: 'Freedom Group',
      kind: 'SUPPORT' as const,
      description:
        'For anyone fighting addiction. Confidential, unhurried, and never discussed outside this group.',
      meetingTime: 'Mondays, 7:30 PM',
      inviteOnly: true,
      isPublic: false,
      allowAnonymous: true,
    },
    {
      slug: 'leadership',
      name: 'Elders & Ministry Leaders',
      kind: 'LEADERSHIP' as const,
      description: 'Church business, pastoral concerns and planning.',
      inviteOnly: true,
      isPublic: false,
    },
  ]

  for (const group of groups) {
    const { slug, ...rest } = group
    await prisma.smallGroup.upsert({
      where: { slug },
      update: rest,
      create: { slug, isActive: true, ...rest },
    })
  }
  console.log(`  ✓ ${groups.length} community groups`)

  // --- Reading plan, fast and challenge ------------------------------------
  const day = 86_400_000
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const initiatives = [
    {
      slug: 'john-in-21-days',
      kind: 'READING_PLAN' as const,
      title: 'John in 21 Days',
      description: 'One chapter a day through the Gospel of John. Twenty minutes, no commentary.',
      details: `## How it works

One chapter a day, in order. If you miss a day, **do not go back and catch up** — just read today's. Falling behind is the main reason people stop, and nobody is marking this.

Tick the day off here when you have read it. If something stood out, write it down — it helps the person reading it after you.`,
      startsOn: new Date(today.getTime() - 3 * day),
      endsOn: new Date(today.getTime() + 17 * day),
      isFeatured: true,
      days: Array.from({ length: 21 }, (_, index) => `John ${index + 1}`),
    },
    {
      slug: 'three-day-fast',
      kind: 'FAST' as const,
      title: 'Three Days Before the Lord',
      description:
        'The whole church, fasting together for three days — for our city, our families, and freedom.',
      details: `## What we are asking

Three days. **Fast in whatever way is right for your body** — a meal a day, one full day, screens instead of food if health makes fasting unwise. God is not measuring the size of your fast.

> "Is not this the fast that I choose: to loose the bonds of wickedness, to undo the straps of the yoke, to let the oppressed go free?" — Isaiah 58:6

## Please read this

If you are pregnant, diabetic, under 18, recovering from illness or have any history of an eating disorder, **do not fast from food.** Speak to a pastor and fast from something else. This is not negotiable and nobody will think less of you.

## What to pray

- Day one — for our own hearts
- Day two — for our families and our homes
- Day three — for our city, and for those still bound`,
      startsOn: new Date(today.getTime() + 7 * day),
      endsOn: new Date(today.getTime() + 9 * day),
      isFeatured: false,
      days: [
        'Day one — our own hearts',
        'Day two — our families and homes',
        'Day three — our city, and those still bound',
      ],
    },
    {
      slug: 'encourage-a-stranger',
      kind: 'CHALLENGE' as const,
      title: 'Encourage somebody you do not know',
      description:
        'This week, say something kind to one person you have never spoken to. That is the whole challenge.',
      details: `## The challenge

One person. Somebody at church you have never spoken to, or somebody at the shop, or a neighbour.

Say one true, kind thing. Then come back and tell us what happened — including if it was awkward, because it often is.`,
      startsOn: new Date(today.getTime() - 1 * day),
      endsOn: new Date(today.getTime() + 6 * day),
      isFeatured: false,
      days: [],
    },
  ]

  for (const initiative of initiatives) {
    const { slug, days, ...rest } = initiative

    const record = await prisma.initiative.upsert({
      where: { slug },
      update: rest,
      create: { slug, isActive: true, ...rest },
      select: { id: true },
    })

    // Days are matched on their number, so re-seeding updates the reading
    // without detaching anybody's logged progress.
    for (const [index, reference] of days.entries()) {
      await prisma.initiativeDay.upsert({
        where: { initiativeId_dayNumber: { initiativeId: record.id, dayNumber: index + 1 } },
        update: { reference },
        create: { initiativeId: record.id, dayNumber: index + 1, reference },
      })
    }
  }
  console.log(`  ✓ ${initiatives.length} initiatives`)

  // --- A fortnight of verses ----------------------------------------------
  const verses = [
    { reference: 'Isaiah 61:1', text: 'The Spirit of the Sovereign Lord is on me, because the Lord has anointed me to proclaim good news to the poor. He has sent me to bind up the brokenhearted, to proclaim freedom for the captives and release from darkness for the prisoners.' },
    { reference: 'Psalm 34:18', text: 'The Lord is close to the brokenhearted and saves those who are crushed in spirit.' },
    { reference: 'Romans 8:1', text: 'Therefore, there is now no condemnation for those who are in Christ Jesus.' },
    { reference: 'John 8:36', text: 'So if the Son sets you free, you will be free indeed.' },
    { reference: '2 Corinthians 3:17', text: 'Now the Lord is the Spirit, and where the Spirit of the Lord is, there is freedom.' },
    { reference: 'Philippians 4:6–7', text: 'Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.' },
    { reference: 'Isaiah 40:31', text: 'But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint.' },
    { reference: 'Matthew 11:28', text: 'Come to me, all you who are weary and burdened, and I will give you rest.' },
    { reference: 'Joshua 1:9', text: 'Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.' },
    { reference: 'Psalm 46:1', text: 'God is our refuge and strength, an ever-present help in trouble.' },
    { reference: 'Lamentations 3:22–23', text: 'Because of the Lord’s great love we are not consumed, for his compassions never fail. They are new every morning; great is your faithfulness.' },
    { reference: 'Revelation 22:20', text: 'He who testifies to these things says, “Yes, I am coming soon.” Amen. Come, Lord Jesus.' },
    { reference: 'Ephesians 6:12', text: 'For our struggle is not against flesh and blood, but against the rulers, against the authorities, against the powers of this dark world.' },
    { reference: 'Psalm 107:20', text: 'He sent out his word and healed them; he rescued them from the grave.' },
  ]

  for (const [index, verse] of verses.entries()) {
    // Yesterday forwards, so there is always one for today.
    const showOn = new Date(today.getTime() + (index - 1) * day)
    await prisma.dailyVerse.upsert({
      where: { showOn },
      update: verse,
      create: { showOn, ...verse },
    })
  }
  console.log(`  ✓ ${verses.length} daily verses`)

  /*
   * Every existing account gets a profile row. Without one they are invisible
   * in the directory — the filter requires `listed: true`, and a missing row
   * cannot satisfy it. Only creates; never overwrites choices already made.
   */
  const users = await prisma.user.findMany({ select: { id: true } })
  for (const user of users) {
    await prisma.memberProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    })
  }
  console.log(`  ✓ ${users.length} member profiles ensured`)
}

/**
 * The home page's first pair of announcements.
 *
 * Calendar artwork is deliberately *not* seeded. Every observance already has
 * a photograph in `lib/calendar-art.ts`, bundled rather than stored, so the
 * calendar looks right on a fresh clone with no database at all — and an
 * empty `calendar_dates` table means "nothing overridden" rather than
 * "nothing to show". /admin/calendar writes the rows when a church wants its
 * own artwork or wording, and those rows win.
 */
async function seedHomePage() {
  const author = await prisma.user.findFirst({
    where: { role: Role.ADMIN },
    select: { id: true },
  })
  const media = await prisma.ministry.findUnique({
    where: { slug: 'media' },
    select: { id: true },
  })

  const month = 30 * 24 * 60 * 60 * 1000
  const samples = [
    {
      title: 'Sunday service — 9:00 AM to 1:00 PM',
      body: 'One service every Sunday, and there is room for you at it. Come a few minutes early if you are bringing somebody for the first time — the welcome team would love to meet them at the door rather than find them in a seat.',
      audience: 'PUBLIC' as const,
      ministryId: null,
      pinned: true,
    },
    {
      title: 'Midweek service — 6:00 AM to 7:00 AM',
      body: 'Wednesday mornings: Speak to Your Day. One hour of prayer before the day starts, and you will still get to work on time. Bring the thing you have been carrying — if you would like somebody to stand with you, the prayer team stays behind afterwards.',
      audience: 'MEMBERS' as const,
      ministryId: null,
      pinned: false,
    },
    ...(media
      ? [
          {
            title: 'Media rota — please check your Sunday',
            body: 'The next quarter’s rota is up. If your Sunday does not work, swap it with somebody on the team and let the department lead know rather than leaving the desk uncovered.',
            audience: 'MINISTRY' as const,
            ministryId: media.id,
            pinned: false,
          },
        ]
      : []),
  ]

  /*
   * Upserted by title, which is not unique in the schema — so this finds first
   * and updates by id. Re-running the seed must not stack up duplicate notices
   * on the boards.
   */
  for (const sample of samples) {
    const existing = await prisma.announcement.findFirst({
      where: { title: sample.title },
      select: { id: true },
    })

    const data = {
      ...sample,
      createdById: author?.id ?? null,
      endsAt: new Date(Date.now() + 3 * month),
    }

    if (existing) {
      await prisma.announcement.update({ where: { id: existing.id }, data })
    } else {
      await prisma.announcement.create({ data })
    }
  }
  console.log(`  ✓ ${samples.length} announcements`)
}

async function main() {
  console.log('Seeding CMSCK / Praise Arena…')
  await seedPages()
  await seedDiscipleship()
  await seedPrayerGroups()
  await seedMinistries()
  await seedSermonCentre()
  // After seedAdmin: the opening posts need an author.
  await seedAdmin()
  await seedCommunity()
  await seedCommunityExtras()
  // After seedAdmin and seedMinistries: announcements need both.
  await seedHomePage()
  console.log('Done.')
}

main()
  .catch((error) => {
    console.error('Seed failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
