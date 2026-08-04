/**
 * The bundled discipleship curriculum — six weeks, three lessons each.
 *
 * Same pattern as `content/pages.ts`: this file is both the *seed* and the
 * *fallback*. `npm run db:seed` loads it into the database; if no database is
 * reachable, the courses still render straight from here. Only progress
 * tracking needs a database, because it needs somewhere to remember you.
 *
 * TODO(ministry): this is solid, plainly written teaching, but it is not your
 * teaching. Edit freely — the structure matters more than my wording.
 */

export type StaticLesson = {
  slug: string
  order: number
  title: string
  /** Markdown, rendered by `components/markdown.tsx`. */
  content: string
  bibleVerses: string[]
  reflectionQuestions: string[]
}

export type StaticWeek = {
  weekNumber: number
  title: string
  description: string
  lessons: StaticLesson[]
}

export type StaticCourse = {
  slug: string
  title: string
  description: string
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  order: number
  weeks: StaticWeek[]
}

const firstStepsWeeks: StaticWeek[] = [
  {
    weekNumber: 1,
    title: 'Salvation',
    description: 'What actually happened when you said yes to Jesus — and how you can be sure of it.',
    lessons: [
      {
        slug: 'what-just-happened',
        order: 1,
        title: 'What just happened?',
        content: `
If you have recently given your life to Jesus, you may be wondering what changed. Maybe you felt something. Maybe you felt nothing at all. Both are normal.

Here is what the Bible says happened, whether or not you felt it:

**You were forgiven.** Every wrong thing — the ones people know about and the ones they do not — was dealt with at the cross. Not filed away. Not put on a payment plan. Cancelled.

**You were adopted.** You did not just get a clean record; you got a Father. God is not tolerating you. He is delighted in you.

**You were made new.** Something genuinely changed on the inside. The Bible calls it being "born again" — a fresh start at the deepest level.

## Feelings are not the proof

A lot of new Christians panic because the emotion fades after a few days. It usually does. Feelings are a weather system; they move.

Your standing with God does not rest on how you feel today. It rests on what Jesus did, which is finished and cannot be undone.

## So what do I do now?

Nothing, to *become* God's child — that is settled. But a great deal to *enjoy* it: talk to Him, read what He says, and get around people who will walk with you.

That is exactly what the next five weeks are for.
`.trim(),
        bibleVerses: [
          '2 Corinthians 5:17 — Therefore, if anyone is in Christ, he is a new creation. The old has passed away; behold, the new has come.',
          'Colossians 1:13-14 — He has delivered us from the domain of darkness and transferred us to the kingdom of his beloved Son, in whom we have redemption, the forgiveness of sins.',
        ],
        reflectionQuestions: [
          'Which of the three things above — forgiven, adopted, made new — is hardest for you to believe today?',
          'Who is one person you could tell about your decision this week?',
        ],
      },
      {
        slug: 'how-can-i-be-sure',
        order: 2,
        title: 'How can I be sure?',
        content: `
Doubt visits every Christian. It visited the disciples who watched Jesus rise from the dead. You are in good company.

The question is not whether doubt shows up, but what you do when it does.

## Do not build on sand

If your assurance rests on your performance, it will rise and fall every single day. Good week, feels secure. Bad week, feels lost. That is exhausting, and it is not what God offers.

## Build on what was said and done

Assurance rests on three solid things:

- **The promise of God.** He said whoever comes to Him He will never cast out. God does not bluff.
- **The work of Jesus.** The cross was not a partial payment. Jesus said, "It is finished."
- **The witness of the Spirit.** Over time the Holy Spirit gives you a quiet inner confidence that you belong.

## When doubt comes anyway

Do not argue with your feelings — they do not respond to reason. Instead, speak the truth back to yourself out loud. Read the promise again. Tell someone in the family. Doubt shrinks fast in company and grows fast in isolation.

And remember: the fact that you *care* whether you are saved is itself a sign of life. Dead people do not worry about being dead.
`.trim(),
        bibleVerses: [
          'John 10:28-29 — I give them eternal life, and they will never perish, and no one will snatch them out of my hand.',
          '1 John 5:13 — I write these things to you who believe in the name of the Son of God, that you may know that you have eternal life.',
        ],
        reflectionQuestions: [
          'When doubt comes, what do you usually reach for first?',
          'Write out one promise from the verses above in your own words.',
        ],
      },
      {
        slug: 'your-new-identity',
        order: 3,
        title: 'Your new identity',
        content: `
Most people carry a label. Failure. Too much. Not enough. The one who always messes it up.

Following Jesus does not mean pretending those labels never stuck. It means learning that God has renamed you.

## What God calls you now

- **Child.** Not servant, not guest — family, with full rights.
- **Forgiven.** Past tense. Completed action.
- **Chosen.** He picked you on purpose. You are not a backup plan.
- **Loved.** Not because you improved, and not less when you struggle.

## Living from it, not for it

Here is the shift that changes everything: you do not obey God so He will accept you. You are already accepted, so you obey Him.

Religion says *do more, be more, then maybe*. The gospel says *it is done, now come and live like it*.

## When you get it wrong

You will. Everyone does. Getting it wrong does not change your name — it just means you go to your Father, tell Him the truth, and keep walking. That is not failure; that is how family works.

The old label may still shout. It just does not get the final word any more.
`.trim(),
        bibleVerses: [
          'Ephesians 1:4-5 — He chose us in him before the foundation of the world... he predestined us for adoption to himself as sons through Jesus Christ.',
          'Romans 8:1 — There is therefore now no condemnation for those who are in Christ Jesus.',
        ],
        reflectionQuestions: [
          'What old label do you still hear loudest?',
          'Which of the four names above do you most need to believe this week?',
        ],
      },
    ],
  },
  {
    weekNumber: 2,
    title: 'Prayer',
    description: 'Prayer is not a performance. It is a conversation with a Father who is glad to hear from you.',
    lessons: [
      {
        slug: 'talking-with-god',
        order: 1,
        title: 'Talking with God',
        content: `
Many people think prayer is a skill they have not learned yet. It is not. Prayer is a relationship you have already been given.

If you can talk, you can pray.

## Four things that are not true

- **"I have to use special words."** God is not impressed by vocabulary. Talk to Him the way you would talk to someone who loves you.
- **"I have to feel something."** Some of the most honest prayers are prayed flat.
- **"I have to be good first."** If you had to be clean to come, nobody would ever come.
- **"I have to be alone and kneeling."** Pray while you walk, cook, queue, or lie awake. God is not fussy about posture.

## A simple shape to start with

If a blank page is intimidating, try four short movements:

1. **Thank you** — name one thing, however small.
2. **Sorry** — say the thing you would rather not say.
3. **Please** — for others first, then for yourself.
4. **Listen** — thirty seconds of quiet. That is enough to start.

Five minutes done daily beats an hour done once and abandoned.

## Start today, not tomorrow

Do not wait until you feel ready or holy enough. Say one honest sentence to God right now. That is prayer. You have already begun.
`.trim(),
        bibleVerses: [
          'Philippians 4:6 — Do not be anxious about anything, but in everything by prayer and supplication with thanksgiving let your requests be made known to God.',
          'Hebrews 4:16 — Let us then with confidence draw near to the throne of grace.',
        ],
        reflectionQuestions: [
          'Which of the four "not true" statements have you believed?',
          'What time of day could realistically become your five minutes?',
        ],
      },
      {
        slug: 'how-jesus-taught-us-to-pray',
        order: 2,
        title: 'How Jesus taught us to pray',
        content: `
The disciples watched Jesus do many things without asking for lessons. They saw Him pray and said: teach us that.

What He gave them was short. Roughly thirty seconds long. That should tell us something.

## Walking through it

**"Our Father in heaven"** — Relationship comes before requests. He is near enough to be called Father, great enough to be trusted with everything.

**"Hallowed be your name"** — Worship before wanting. It puts you in the right size before you start asking.

**"Your kingdom come, your will be done"** — Prayer is not bending God to your plan. It is joining yours to His.

**"Give us this day our daily bread"** — Ask plainly for what you need. Today's need, today. He is not offended by ordinary requests.

**"Forgive us... as we forgive"** — Come clean, and let others off the hook too. These two are tied together on purpose.

**"Lead us not into temptation, but deliver us"** — Ask for help before you are in trouble, not only after.

## Use it as a frame

You can pray these words exactly. You can also use each line as a doorway and pray your own life into it. Both are right.
`.trim(),
        bibleVerses: [
          'Matthew 6:9-13 — Pray then like this: "Our Father in heaven, hallowed be your name..."',
          'Luke 11:1 — Lord, teach us to pray, as John taught his disciples.',
        ],
        reflectionQuestions: [
          'Which line of that prayer is hardest for you to mean?',
          'Is there someone you need to forgive before you can pray it honestly?',
        ],
      },
      {
        slug: 'when-prayer-feels-hard',
        order: 3,
        title: 'When prayer feels hard',
        content: `
Sooner or later prayer goes quiet. The words dry up, heaven feels like a ceiling, and you wonder whether anyone is listening.

This is not a sign that you are failing. It is a normal season, and almost every Christian who has walked with God for long has been through it.

## What to do when it is dry

**Keep the appointment.** Show up even when you feel nothing. Faithfulness in the dark is worth more than enthusiasm in the light.

**Pray the Bible.** When you have no words, borrow some. The Psalms carry almost every emotion a human can feel — including anger, fear and complaint.

**Be honest.** "God, I do not want to be here and I do not feel You" is a real prayer. God can handle it. Pretending is what damages prayer, not honesty.

**Ask someone to pray with you.** Some weights are not meant to be carried alone.

## What silence usually is not

It is usually not punishment, and it is usually not absence. God's presence is a promise, not a feeling — and promises hold when feelings do not.

Often what feels like distance is actually growth: He is teaching you to walk by trust rather than by sensation. That is not Him withdrawing. That is Him maturing you.
`.trim(),
        bibleVerses: [
          'Psalm 13:1-2 — How long, O Lord? Will you forget me forever?',
          'Romans 8:26 — The Spirit helps us in our weakness. For we do not know what to pray for as we ought, but the Spirit himself intercedes for us.',
        ],
        reflectionQuestions: [
          'Have you ever hidden how you really feel from God? Why?',
          'Who could you ask to pray with you this week?',
        ],
      },
    ],
  },
  {
    weekNumber: 3,
    title: 'Bible Study',
    description: 'How to open the Bible for yourself — and actually understand what you find.',
    lessons: [
      {
        slug: 'why-the-bible-matters',
        order: 1,
        title: 'Why the Bible matters',
        content: `
The Bible is not one book. It is a library of sixty-six, written across roughly fifteen hundred years, by kings, shepherds, fishermen and doctors, on three continents.

And it tells one story: God making a people for Himself, and coming to rescue them.

## Why bother reading it?

**It is how God speaks.** Not the only way, but the clearest and the safest. Every other impression you have gets tested against this.

**It tells you who God is.** Left to ourselves, we invent a god who conveniently agrees with us. Scripture introduces us to the real one.

**It tells you who you are.** Your identity, your worth and your purpose are all in here.

**It changes you.** Slowly, and often without you noticing, until one day you respond differently than you would have a year ago.

## A word about difficulty

Some parts are hard. Some parts are strange. Some parts you will not understand for years.

That is not a reason to stay away — it is a reason to keep coming back. Start with what is clear, and let the clear parts light up the rest. Nobody has ever exhausted this book, and nobody has ever needed to before they could start.
`.trim(),
        bibleVerses: [
          '2 Timothy 3:16-17 — All Scripture is breathed out by God and profitable for teaching, for reproof, for correction, and for training in righteousness.',
          'Psalm 119:105 — Your word is a lamp to my feet and a light to my path.',
        ],
        reflectionQuestions: [
          'What has your experience of the Bible been so far — helpful, confusing, or unfamiliar?',
          'What is one thing you hope to find in it?',
        ],
      },
      {
        slug: 'how-to-read-it',
        order: 2,
        title: 'How to read it',
        content: `
Do not start at Genesis and try to bulldoze through to Revelation. Most people give up somewhere in Leviticus, and conclude the problem is them.

## Where to start

Start with **the Gospel of John**. It was written for exactly this purpose — so that people would believe. One chapter a day gets you through in three weeks.

After that: **Mark** (fast and vivid), then **Philippians** (short and warm), then **Psalms** (honest prayer for every mood).

## A method that works

For each passage, ask four questions:

1. **What does it say?** Read it twice. Slowly. Notice what is actually there.
2. **What does it mean?** Who was it written to, and what would they have understood?
3. **What does it say about God?** Every passage shows you something about His character.
4. **What do I do with it?** One specific, small response. Not ten.

Write down one sentence. That single habit turns reading into remembering.

## Practical notes

- **Use a modern translation.** The NIV, ESV or NLT are all good. Read the one you actually understand.
- **Small and regular beats big and rare.** Ten verses every day will change you more than three chapters once a month.
- **Do not panic at the hard bits.** Mark them, move on, come back later. It is allowed.
`.trim(),
        bibleVerses: [
          'Acts 17:11 — They received the word with all eagerness, examining the Scriptures daily to see if these things were so.',
          'James 1:22 — But be doers of the word, and not hearers only, deceiving yourselves.',
        ],
        reflectionQuestions: [
          'Which book will you start with, and when will you read it?',
          'Try the four questions on one paragraph of John 1. What did you notice?',
        ],
      },
      {
        slug: 'making-it-a-habit',
        order: 3,
        title: 'Making it a habit',
        content: `
Almost every Christian intends to read the Bible daily. Far fewer actually do. The gap is rarely about desire — it is about design.

## Build the habit, not the willpower

**Pick a time and defend it.** The best time is the one you will actually keep. For most people that is early, before the day gets loud.

**Pick a place.** Same chair, same corner. Your brain learns the cue faster than you think.

**Attach it to something you already do.** After the kettle boils. After you brush your teeth. New habits stick best when they lean on old ones.

**Keep the bar low.** Ten minutes. If ten feels impossible, do three. A habit you keep beats a plan you abandon.

**Leave the Bible open.** Physically open, on the table. Friction is the enemy of consistency.

## When you miss a day

You will miss days. The danger is not the missed day — it is the story you tell about it. "I am hopeless at this" ends habits. "I missed yesterday, so I am reading today" keeps them.

Never miss twice in a row. That one rule will carry you further than any amount of guilt.

## The long game

You are not trying to finish the Bible. You are trying to know God. Those are different goals, and only one of them ever ends.
`.trim(),
        bibleVerses: [
          'Joshua 1:8 — This Book of the Law shall not depart from your mouth, but you shall meditate on it day and night.',
          'Psalm 1:2-3 — His delight is in the law of the Lord... He is like a tree planted by streams of water.',
        ],
        reflectionQuestions: [
          'What time, place and existing habit will you attach your reading to?',
          'What story do you usually tell yourself when you miss a day?',
        ],
      },
    ],
  },
  {
    weekNumber: 4,
    title: 'Faith',
    description: 'What faith actually is, how it holds up in hard seasons, and how it grows.',
    lessons: [
      {
        slug: 'what-faith-actually-is',
        order: 1,
        title: 'What faith actually is',
        content: `
Faith is one of the most misunderstood words in the Christian vocabulary. Many people hear it as "believing things that are not true" or "being very, very sure."

Neither is what the Bible means.

## Faith is trust, placed in someone

Biblical faith is not a feeling of certainty you manufacture. It is trust — directed at a person who has proved reliable.

You use this kind of faith constantly. You sit on chairs without testing them. You take medicine you cannot chemically verify. That is not irrationality; it is trust based on good grounds.

## The object matters more than the amount

Jesus said faith the size of a mustard seed is enough. That is a strange thing to say if faith works by volume.

It makes perfect sense if faith works by *object*. A little trust in something completely reliable will hold. Enormous confidence in thin ice will not.

So the question is never "do I have enough faith?" It is "who am I trusting?"

## Faith and doubt can share a room

The father in Mark 9 says, "I believe; help my unbelief." Jesus does not rebuke him — He answers him.

You do not need to eliminate doubt before you act. You need to act in the direction of what you trust, doubts and all. That is what faith has always looked like.
`.trim(),
        bibleVerses: [
          'Hebrews 11:1 — Now faith is the assurance of things hoped for, the conviction of things not seen.',
          'Mark 9:24 — I believe; help my unbelief!',
        ],
        reflectionQuestions: [
          'Have you been measuring your faith by how certain you feel?',
          'What is one thing you could do this week that trusts God rather than waits to feel sure?',
        ],
      },
      {
        slug: 'faith-in-hard-times',
        order: 2,
        title: 'Faith in hard times',
        content: `
Nobody's faith is really tested on an easy day. It is tested when the diagnosis comes, when the money runs out, when the prayer you prayed for years is still unanswered.

The Bible does not pretend otherwise. It is remarkably honest about suffering.

## What God does not promise

He does not promise an easy life. He does not promise that everything will make sense at the time. And He does not promise to explain Himself.

Pretending He did sets people up to feel betrayed by God for something He never said.

## What God does promise

**He will be with you.** Not always to remove the fire, but always to be in it.

**He will not waste it.** Nothing you go through is thrown away. God works even the wreckage into something.

**He will finish what He started.** Your struggle is not evidence that He gave up on you.

## Holding on when it is dark

Say the truth out loud even when you cannot feel it. Stay near people who will carry you. Keep showing up — to prayer, to Scripture, to church — especially when it feels pointless.

And be honest with God about the pain. Lament is not the failure of faith. It is one of faith's oldest languages. A third of the Psalms are written in it.
`.trim(),
        bibleVerses: [
          'Isaiah 43:2 — When you pass through the waters, I will be with you; and through the rivers, they shall not overwhelm you.',
          'Romans 8:28 — And we know that for those who love God all things work together for good.',
        ],
        reflectionQuestions: [
          'What is the hardest thing you are carrying right now?',
          'Have you told God honestly how it feels — or only how you think you should feel?',
        ],
      },
      {
        slug: 'growing-your-faith',
        order: 3,
        title: 'Growing your faith',
        content: `
Faith is not static. It can grow, and it can shrink. The good news is that growth is not mysterious — it happens through fairly ordinary means.

## Four things that grow faith

**Hearing.** Faith comes by hearing God's word. Read it, and sit under teaching that takes it seriously.

**Remembering.** Write down what God does. Memory is short and discouragement is loud. A written record of answered prayer will steady you on a bad day more than almost anything else.

**Stepping out.** Faith grows by use, like a muscle. Do the small obedient thing you have been putting off. Give when it is inconvenient. Have the conversation you are afraid of.

**Company.** You will absorb the faith of the people you spend time with. Choose some of them on purpose.

## What shrinks faith

Isolation. Comparison. Living on other people's spiritual experience instead of your own. And feeding constantly on things that leave you anxious and cynical.

You do not have to be dramatic about this. Just notice what leaves you trusting God more, and what leaves you trusting Him less, and adjust accordingly.

## Be patient with yourself

Nobody grows in a straight line. There will be seasons that feel like standing still, and then you will look back after a year and realise how far you came.

Keep walking. That is the whole instruction.
`.trim(),
        bibleVerses: [
          'Romans 10:17 — So faith comes from hearing, and hearing through the word of Christ.',
          '2 Peter 3:18 — But grow in the grace and knowledge of our Lord and Savior Jesus Christ.',
        ],
        reflectionQuestions: [
          'Which of the four growth habits is weakest for you right now?',
          'What is one small step of obedience you have been putting off?',
        ],
      },
    ],
  },
  {
    weekNumber: 5,
    title: 'The Holy Spirit',
    description: 'Who the Holy Spirit is, what He does in you, and how to live in step with Him.',
    lessons: [
      {
        slug: 'who-the-holy-spirit-is',
        order: 1,
        title: 'Who the Holy Spirit is',
        content: `
The Holy Spirit is the most overlooked person of the Trinity — and He is exactly that: a person, not a force, an atmosphere or an "it."

He can be grieved. He speaks, teaches, comforts and decides. Forces do not do those things.

## He is God, fully

The Spirit is not a junior member of the team. He is God — eternal, all-knowing, present everywhere. When the Spirit is with you, God is with you.

## Jesus said it was better this way

This is one of the most startling things in the Gospels. Jesus told His disciples it was to their *advantage* that He go away, so the Spirit could come.

Why? Because Jesus in the flesh could only be in one place. The Spirit is with every believer, everywhere, at once. Whatever you are facing tonight, God is not waiting for you somewhere else.

## What He does in you

- **He convicts** — showing you what is wrong, gently and specifically, never with vague shame.
- **He comforts** — the word Jesus used means one called alongside to help.
- **He teaches** — bringing Scripture to mind at the moment you need it.
- **He empowers** — giving strength and courage that is honestly not yours.
- **He assures** — that quiet inner witness that you belong to God.

If you belong to Jesus, He already lives in you. You are not waiting for Him to arrive.
`.trim(),
        bibleVerses: [
          'John 14:16-17 — And I will ask the Father, and he will give you another Helper, to be with you forever, even the Spirit of truth.',
          'Romans 8:16 — The Spirit himself bears witness with our spirit that we are children of God.',
        ],
        reflectionQuestions: [
          'Had you thought of the Holy Spirit as a person before? What changes if He is?',
          'Which of His five works do you most need this week?',
        ],
      },
      {
        slug: 'living-by-the-spirit',
        order: 2,
        title: 'Living by the Spirit',
        content: `
Knowing the Holy Spirit lives in you is one thing. Living in step with Him day to day is another.

The Bible uses a walking picture: keeping in step, matching your pace to His.

## Three practical habits

**Ask, then wait.** Begin the day by asking Him to lead it, and leave a little silence. You are not summoning Him — He is already there — you are turning your attention to Him.

**Obey the nudge.** That small prompt to call someone, apologise, give, or stay quiet — act on it. Responsiveness grows sensitivity. Ignoring it dulls you.

**Keep short accounts.** When you know you have gone wrong, deal with it quickly. Unaddressed sin does not break the relationship, but it muffles the conversation.

## Testing what you sense

Not every impression is from God. Some are anxiety, some are appetite, some are last night's conversation. Test them:

- Does it agree with Scripture? The Spirit never contradicts the Bible He inspired.
- Does it look like Jesus — truthful, humble, loving?
- Do mature believers around you confirm it?
- Does it produce peace, or frantic pressure?

## Fruit takes time

The change the Spirit brings is agricultural, not mechanical. Fruit grows slowly and mostly out of sight. Do not despise a year that looks like nothing much. Roots are being laid.
`.trim(),
        bibleVerses: [
          'Galatians 5:22-23 — But the fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faithfulness, gentleness, self-control.',
          'Galatians 5:25 — If we live by the Spirit, let us also keep in step with the Spirit.',
        ],
        reflectionQuestions: [
          'Which fruit of the Spirit is God clearly growing in you right now?',
          'Was there a nudge recently that you ignored? What would obeying it look like?',
        ],
      },
      {
        slug: 'gifts-and-power',
        order: 3,
        title: 'Gifts and power',
        content: `
The Holy Spirit does not only change you. He also gives you something to give away.

## Everyone gets something

There is no such thing as a Christian without a gift. Paul is explicit: to each one is given a manifestation of the Spirit. If you are in the family, you have been handed something.

The gifts vary widely — teaching, serving, encouraging, giving, leading, mercy, healing, prophecy, hospitality, administration. Some look spectacular; most look like showing up faithfully.

## What they are for

Gifts are never for display, status or comparison. Paul gives one purpose: **for the common good**. They are tools for building people up.

This is why the famous chapter on love sits right in the middle of the chapters on gifts. Gift without love is noise.

## Finding yours

- **Try things.** You will not discover your gift by taking a quiz alone in a room. Serve somewhere and pay attention.
- **Notice what builds people.** Where does your effort seem to help others disproportionately?
- **Ask people who know you.** Others often see it before you do.
- **Do not despise the ordinary ones.** Quiet faithfulness is not a lesser gift.

## About power

The Spirit gives real power — not to make life comfortable, but to make you a witness. Courage where you would normally shrink. Words when you have none. Strength to forgive what you cannot forgive.

Ask for it. Jesus said the Father gives the Spirit gladly to those who ask.
`.trim(),
        bibleVerses: [
          '1 Corinthians 12:7 — To each is given the manifestation of the Spirit for the common good.',
          'Acts 1:8 — But you will receive power when the Holy Spirit has come upon you, and you will be my witnesses.',
        ],
        reflectionQuestions: [
          'Where have you served and sensed it went unusually well?',
          'Who could you ask this week what gift they see in you?',
        ],
      },
    ],
  },
  {
    weekNumber: 6,
    title: 'Evangelism',
    description: 'Sharing your faith without a script, a sales pitch, or a personality transplant.',
    lessons: [
      {
        slug: 'your-story-matters',
        order: 1,
        title: 'Your story matters',
        content: `
The most powerful thing you own is not an argument. It is a testimony — and nobody can debate what happened to you.

In John 9, a man healed of blindness is interrogated by experts. He cannot answer their theological questions. So he says: "One thing I know, that though I was blind, now I see."

That ended the discussion. Yours can too.

## Your story in three parts

**Before.** What life was like — the ache, the emptiness, the thing you were chasing. Be honest, not dramatic. "I looked fine and felt lost" is a story many people need to hear.

**How.** What happened. Who said something. What you understood. What you did about it.

**Since.** What is different now. Not "everything is perfect" — that is not true and people can smell it. Something more like "I still struggle with X, but I am not carrying it alone any more."

## Keep it short

Practise until you can tell it in two minutes. Most opportunities are short. A story you can actually tell beats an eloquent one you never finish.

## You do not need a dramatic testimony

Growing up safe and coming to Jesus quietly is a wonderful story. It says God's grace can reach a life before it breaks. Do not apologise for it.
`.trim(),
        bibleVerses: [
          'John 9:25 — One thing I know, that though I was blind, now I see.',
          '1 Peter 3:15 — Always being prepared to make a defense to anyone who asks you for a reason for the hope that is in you; yet do it with gentleness and respect.',
        ],
        reflectionQuestions: [
          'Write your before, how and since in three sentences each.',
          'Who is one person who might need to hear it?',
        ],
      },
      {
        slug: 'sharing-simply',
        order: 2,
        title: 'Sharing simply',
        content: `
Most Christians want to talk about Jesus and freeze when the moment comes. Usually the problem is a picture in our heads of what evangelism has to look like — a debate we must win.

It is not that. It is a conversation.

## Start by listening

You cannot speak to someone's life if you do not know it. Ask questions. Be genuinely curious. Most people have never had a Christian listen to them without an agenda, and that alone is remarkable.

## Then be honest

You do not need answers to everything. "I do not know" is a complete and trustworthy sentence. So is "That is a good question — can I find out and come back to you?"

Honesty earns more trust than expertise.

## Three low-pressure openings

- **"Can I pray for you about that?"** Almost nobody says no. It is kind, concrete and immediate.
- **"That reminds me of something I have been learning..."** Then tell the truth in one sentence.
- **"Would you like to come with me on Sunday?"** An invitation is not a confrontation.

## Leave room

You are not responsible for the outcome. You are responsible for being faithful and kind. Plant, water, and let God do what only God does.

And expect no for a while. No is not failure — it is often part of a longer journey you are only seeing one page of.
`.trim(),
        bibleVerses: [
          '1 Corinthians 3:6 — I planted, Apollos watered, but God gave the growth.',
          'Colossians 4:5-6 — Walk in wisdom toward outsiders, making the best use of the time. Let your speech always be gracious, seasoned with salt.',
        ],
        reflectionQuestions: [
          'Which of the three openings could you actually see yourself using?',
          'What stops you most — fear of the question, or fear of the reaction?',
        ],
      },
      {
        slug: 'going-with-courage',
        order: 3,
        title: 'Going with courage',
        content: `
You have reached the last lesson. Six weeks ago you may have been brand new. Look at what you now know: who you are, how to pray, how to read, how to trust, who lives in you, and how to speak.

None of it was meant to stop with you.

## The commission is for ordinary people

Jesus gave the Great Commission to a group that included doubters. Matthew records it plainly: they worshipped, but some doubted. And He sent them anyway.

If He waited for people who had it all together, nothing would ever have happened.

## Three things to hold on to

**You are not alone.** "I am with you always" was the last thing He said, and it was not decoration. It was the whole basis for going.

**You are not the Saviour.** Enormous relief lives in that sentence. You introduce people to Jesus. He does the saving.

**Start where you are.** Your family, your street, your class, your workplace. Nobody has to cross an ocean to obey this.

## What now?

Pick one person. Pray for them by name every day for a month. Look for one opportunity to be kind and one to be honest.

That is how this actually spreads. Not by campaigns — by ordinary people who kept walking with Jesus and did not keep quiet about it.

Welcome to the family. Now go and make it bigger.
`.trim(),
        bibleVerses: [
          'Matthew 28:19-20 — Go therefore and make disciples of all nations... And behold, I am with you always, to the end of the age.',
          'Romans 1:16 — For I am not ashamed of the gospel, for it is the power of God for salvation to everyone who believes.',
        ],
        reflectionQuestions: [
          'Who is the one person you will pray for by name this month?',
          'Looking back over six weeks, what has changed most in you?',
        ],
      },
    ],
  },
]

export const staticCourses: StaticCourse[] = [
  {
    slug: 'first-steps',
    title: 'First Steps',
    description:
      'A six-week walk through the foundations of following Jesus — salvation, prayer, the Bible, faith, the Holy Spirit and sharing your story. No Bible knowledge assumed, and no question is too basic.',
    difficulty: 'BEGINNER',
    order: 1,
    weeks: firstStepsWeeks,
  },
]

export const staticCoursesBySlug: Record<string, StaticCourse> = Object.fromEntries(
  staticCourses.map((course) => [course.slug, course]),
)

/** Total lessons in a course — used for progress bars everywhere. */
export function countLessons(course: StaticCourse) {
  return course.weeks.reduce((total, week) => total + week.lessons.length, 0)
}
