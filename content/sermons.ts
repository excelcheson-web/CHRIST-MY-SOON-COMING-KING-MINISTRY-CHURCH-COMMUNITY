/**
 * Starter sermon content.
 *
 * TODO(ministry): replace all of this with real recordings. It exists so the
 * Sermon Centre is not an empty page on the day it goes live, and so a pastor
 * can see what a well-filled sermon looks like before writing their own.
 *
 * Deliberately no `videoUrl` or `audioUrl`: a sermon card that promises a
 * recording and then plays nothing is worse than one that is honest about
 * being a placeholder. Add the links as the real recordings are uploaded.
 */

export type SeedSeries = {
  slug: string
  title: string
  description: string
  isActive: boolean
}

export type SeedSermon = {
  slug: string
  title: string
  seriesSlug: string | null
  speaker: string
  description: string
  biblePassage: string
  bibleText: string
  /** Whole days before today, so the seed never dates itself. */
  daysAgo: number
  duration: number
  notes: string
  /**
   * Optional. Where present it powers "Ask this sermon" — the question box only
   * appears once there is enough text to search.
   */
  transcript?: string
  studyQuestions: string[]
  topics: string[]
  isFeatured: boolean
}

export const seedSeries: SeedSeries[] = [
  {
    slug: 'he-is-coming-soon',
    title: 'He Is Coming Soon',
    description:
      'Four weeks in the promises Jesus made about his return — what they meant then, and what they ask of us now.',
    isActive: true,
  },
  {
    slug: 'foundations',
    title: 'Foundations',
    description: 'The basics of following Jesus, for anyone starting out or starting again.',
    isActive: true,
  },
]

export const seedSermons: SeedSermon[] = [
  {
    slug: 'surely-i-am-coming-soon',
    title: 'Surely I Am Coming Soon',
    seriesSlug: 'he-is-coming-soon',
    speaker: 'Pastor',
    description:
      'The last promise in the Bible is a promise about coming back. What difference does it make to a Tuesday?',
    biblePassage: 'Revelation 22:12–21',
    bibleText:
      '“Behold, I am coming soon! My reward is with me, and I will give to each person according to what they have done. I am the Alpha and the Omega, the First and the Last, the Beginning and the End.”',
    daysAgo: 7,
    duration: 42,
    notes: `## The promise

The Bible does not end with a warning or a rule. It ends with a promise, and the promise is a person: *"Surely I am coming soon."*

## Three things that promise does

1. **It gives us hope.** Whatever this week holds, it is not the end of the story.
2. **It gives us urgency.** If he is coming, the people around us matter more than our comfort.
3. **It gives us patience.** We are not asked to fix everything. We are asked to be faithful until he comes.

## What now

Live this week as though he might come on Friday — and plan as though you have forty years. Both are true.`,
    /*
     * A worked example so "Ask this sermon" has something real to search on a
     * fresh install. Written to cover several distinct subjects — the promise,
     * fear, forgiveness, waiting, and Monday morning — because a transcript
     * that only says one thing cannot demonstrate retrieval.
     *
     * TODO(ministry): replace with the real transcript of a real sermon.
     */
    transcript: `Turn with me, if you would, to the very last page of your Bible. Revelation chapter twenty-two. And I want you to notice something before we read a single word — notice where we are. This is the end. Sixty-six books, hundreds of years, prophets and kings and letters and songs, and it all comes down to this page.

And do you know what is on it? Not a warning. Not a rule. Not a list of everything we got wrong. A promise. And the promise is a person. "Surely I am coming soon."

Now I want to be honest with you this morning, because I think we are often not honest in church about this. When some of us hear "Jesus is coming back", the first thing we feel is not joy. It is fear. We start doing sums. We start thinking about the argument we had on Thursday, or the thing nobody knows about, and something in us goes cold.

If that is you this morning, I want you to hear me. That fear is not from God. Perfect love casts out fear. The One who is coming is the same One who went to the cross for you. He is not coming to catch you out. He is coming to collect what he already paid for. You are not a debt he is coming to call in. You are a child he is coming to bring home.

Let me say something about forgiveness, because I do not think you can hold onto this promise with a clenched fist. Some of you are carrying something against somebody in this room. You have carried it for years. And you have got very good at carrying it — you can carry it and sing at the same time.

Here is the thing about unforgiveness. It does not hurt the person you are angry with. They are asleep. They are fine. It hurts you. It sits in your chest and it makes you tired. Jesus said, forgive us our debts as we forgive our debtors — and I have always found that a frightening prayer, because it asks God to treat me the way I treat other people.

Forgiveness is not saying it did not matter. It mattered. Forgiveness is saying: I am not going to be the one who collects on this any more. I am handing the account over to God. Let him settle it. That is not weakness, that is freedom, and some of you need to walk out of here free today.

Now, waiting. Because this is where it gets practical. He said soon, and it has been two thousand years, and if we are honest that is a long time to hold your breath.

The five wise girls and the five foolish girls in Matthew twenty-five did exactly the same thing for most of the night. They both waited. They both fell asleep. Nobody in that story is blamed for sleeping. The difference was what they had prepared before the waiting started. The oil was in the jar before the lamp ran dry.

You cannot borrow oil at midnight. You cannot borrow your mother's walk with God. You cannot borrow this church's faith. When the moment comes it will be what you built quietly, on ordinary Tuesdays, when nobody was watching, that holds you up.

So what does that look like on Monday morning? I will tell you what it does not look like. It does not look like calculating dates. It does not look like being frightened of the news. Watching is not the same as worrying. Jesus asked for the first and warned against the second.

It looks like this. Read a little of the Bible, even four verses. Talk to God like he is actually listening, because he is. Do your work honestly. Be kind to somebody who cannot repay you. Deal with the thing you have been avoiding. And forgive that person.

And here is what I want you to leave with. Live this week as though he might come on Friday. And plan as though you have forty years. Both of those are true at once, and holding both is what a Christian life actually looks like.

Because our King is coming back. And until that day — let us love God, love people, and finish well.`,
    studyQuestions: [
      'When you hear "Jesus is coming back", what is the first feeling that comes up — hope, fear, or nothing much? Why do you think that is?',
      'Which of the three things above do you most need this week?',
      'Is there one person you would want to have spoken to, if he came on Friday?',
    ],
    topics: ['end times', 'hope', 'faith'],
    isFeatured: true,
  },
  {
    slug: 'keeping-watch-without-fear',
    title: 'Keeping Watch Without Fear',
    seriesSlug: 'he-is-coming-soon',
    speaker: 'Pastor',
    description:
      'Jesus told us to stay awake, not to be afraid. This message is about the difference between the two.',
    biblePassage: 'Matthew 25:1–13',
    bibleText:
      '“Therefore keep watch, because you do not know the day or the hour.” The wise ones took oil in jars along with their lamps.',
    daysAgo: 14,
    duration: 38,
    notes: `## Two kinds of waiting

The five wise bridesmaids and the five foolish ones did exactly the same thing for most of the night: they waited, and they fell asleep. The difference was what they had prepared before the waiting started.

## Oil is not something you can borrow

You cannot borrow someone else's walk with God at the last minute. Not your parents'. Not your church's. Your own lamp needs your own oil.

## Watching is not worrying

Watching looks like: praying, gathering, serving, staying ready. Worrying looks like: calculating dates and losing sleep. Jesus asked for the first and warned against the second.`,
    studyQuestions: [
      'What does "having oil" look like in an ordinary week for you?',
      'Where have you been tempted to borrow someone else’s faith rather than build your own?',
      'What is one thing you could prepare now that you would be glad of later?',
    ],
    topics: ['end times', 'faith', 'discipleship'],
    isFeatured: false,
  },
  {
    slug: 'what-happens-when-you-say-yes',
    title: 'What Happens When You Say Yes',
    seriesSlug: 'foundations',
    speaker: 'Pastor',
    description:
      'If you prayed to follow Jesus this week — or years ago and you are not sure it took — this one is for you.',
    biblePassage: '2 Corinthians 5:17',
    bibleText:
      'Therefore, if anyone is in Christ, the new creation has come: The old has gone, the new is here!',
    daysAgo: 21,
    duration: 35,
    notes: `## You are not on probation

Saying yes to Jesus is not signing up for a trial period. The Bible's language is adoption, not audition.

## Three things that are true from day one

- **You are forgiven.** Not "will be" — are.
- **You belong.** To him first, and to this family second.
- **You will change.** Slowly, unevenly, and really.

## The first three habits

Read a little of the Bible. Talk to God like he is listening, because he is. Tell one other Christian you have started. That is it — the rest grows from those.`,
    studyQuestions: [
      'Which of the three things above is hardest for you to believe today?',
      'Who is one person you could tell?',
      'What would a realistic daily habit look like for your actual life this month?',
    ],
    topics: ['faith', 'grace', 'discipleship'],
    isFeatured: false,
  },
  {
    slug: 'praying-when-you-have-no-words',
    title: 'Praying When You Have No Words',
    seriesSlug: 'foundations',
    speaker: 'Pastor',
    description:
      'Most of us learned to pray by copying people who were good at it. This is about praying when you are not.',
    biblePassage: 'Romans 8:26–27',
    bibleText:
      'In the same way, the Spirit helps us in our weakness. We do not know what we ought to pray for, but the Spirit himself intercedes for us through wordless groans.',
    daysAgo: 28,
    duration: 40,
    notes: `## Prayer is not a performance

If prayer were a skill, God would have given us a manual. Instead he gave us a Spirit who prays on our behalf when we cannot.

## When you are stuck

- Say the truth, even if the truth is "I do not want to be here."
- Use somebody else's words. The Psalms exist for exactly this.
- Say nothing and stay. Sitting with God counts.

## What this church does

Nobody here has to pray out loud, ever. If you want prayer and cannot ask for it, write it on the wall — anonymously if that helps.`,
    studyQuestions: [
      'What made you stop praying the last time you stopped?',
      'Which Psalm could you borrow this week?',
      'Is there something you have never said to God out loud?',
    ],
    topics: ['prayer', 'faith', 'hope'],
    isFeatured: false,
  },
]

/**
 * The first few posts in the community feed.
 *
 * All authored by the seeded admin account and all PUBLIC, so a visitor who
 * lands on /community before signing up still sees a living church rather than
 * an empty box. Members' own posts default to MEMBERS.
 */
export const seedPosts = [
  {
    type: 'ENCOURAGEMENT' as const,
    body: 'Welcome to the community feed! 💛\n\nThis is where our church family talks between Sundays. Share what God has been doing, ask us to pray, or just encourage somebody who needs it today.\n\nTwo house rules: be kind, and what is shared in a group post stays in that group.',
    pinned: true,
  },
  {
    type: 'QUESTION' as const,
    body: 'For anyone new here — what is one thing you would want to ask a pastor, if you knew nobody would think it was a silly question?\n\nReply below and we will work through them together.',
    pinned: false,
  },
  {
    type: 'PRAYER' as const,
    body: 'We are praying through the week ahead as a church. If there is something you are carrying, put it on the prayer wall — you can post anonymously, and the prayer team reads every one.',
    pinned: false,
  },
]
