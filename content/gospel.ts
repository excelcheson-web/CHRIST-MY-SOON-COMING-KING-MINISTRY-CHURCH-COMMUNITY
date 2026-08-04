/**
 * The gospel presentation and prayer of commitment.
 *
 * Pure content — no database needed. Someone can read every word of this and
 * pray, whether or not the ministry has a database connected. Only the step
 * that records their details needs one.
 *
 * TODO(ministry): the wording is deliberately plain and non-denominational.
 * Adjust it to match how your pastors teach the gospel.
 */

export type GospelStep = {
  id: string
  eyebrow: string
  title: string
  /** One or two short paragraphs. Aimed at a reading age of about ten. */
  body: string[]
  verse: { reference: string; text: string }
  emoji: string
}

export const gospelSteps: GospelStep[] = [
  {
    id: 'loved',
    eyebrow: 'Step 1 of 4',
    title: 'God loves you',
    body: [
      'Before you did anything right and before you did anything wrong, God already loved you. He made you on purpose, and He knows your name.',
      'This is where everything starts. Not with your effort — with His love.',
    ],
    verse: {
      reference: 'John 3:16',
      text: 'For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life.',
    },
    emoji: '❤️',
  },
  {
    id: 'gap',
    eyebrow: 'Step 2 of 4',
    title: 'Something got in the way',
    body: [
      'The Bible calls it sin. It is the wrong we do, the good we skip, and the pull inside all of us to run our own lives without God.',
      'Sin is not just breaking rules — it breaks the friendship we were made for. And none of us can fix that on our own, no matter how hard we try.',
    ],
    verse: {
      reference: 'Romans 3:23',
      text: 'For all have sinned and fall short of the glory of God.',
    },
    emoji: '🕳️',
  },
  {
    id: 'jesus',
    eyebrow: 'Step 3 of 4',
    title: 'Jesus made a way',
    body: [
      'God did not leave us stuck. Jesus — fully God and fully human — lived the life we could not live, and then died the death we deserved.',
      'Three days later He rose from the dead. That is not a legend the church tells; it is the reason the church exists. The gap is closed. The way home is open.',
    ],
    verse: {
      reference: 'Romans 5:8',
      text: 'But God shows his love for us in that while we were still sinners, Christ died for us.',
    },
    emoji: '✝️',
  },
  {
    id: 'respond',
    eyebrow: 'Step 4 of 4',
    title: 'Now it is your turn',
    body: [
      'Salvation is a gift. You cannot earn a gift — you can only receive it. Receiving it looks like turning to God, believing Jesus died and rose for you, and asking Him to lead your life.',
      'You do not need special words. You do not need to clean yourself up first. You just need to mean it.',
    ],
    verse: {
      reference: 'Romans 10:9',
      text: 'If you confess with your mouth that Jesus is Lord and believe in your heart that God raised him from the dead, you will be saved.',
    },
    emoji: '🙌',
  },
]

export const commitmentPrayer = {
  title: 'A prayer you can pray',
  intro:
    'There is nothing magic about these words. God listens to your heart, not your vocabulary. But if you are not sure what to say, you can pray this — out loud if you can.',
  lines: [
    'Father God, thank You for loving me.',
    'I am sorry for the wrong in my life, and for going my own way.',
    'I believe Jesus died for me and rose again.',
    'Today I turn to You. Please forgive me and make me new.',
    'Jesus, come and lead my life from now on.',
    'Holy Spirit, fill me and help me follow.',
    'Thank You that I belong to You. Amen.',
  ],
  after:
    'If you prayed that and meant it, the Bible says you are a child of God. Not because you feel different — because He said so.',
  afterVerse: {
    reference: 'John 1:12',
    text: 'But to all who did receive him, who believed in his name, he gave the right to become children of God.',
  },
}

/** Shown on the final page — what actually happens next, in order. */
export const nextSteps = [
  {
    emoji: '📖',
    title: 'Start reading',
    body: 'Begin with the Gospel of John. A chapter a day is plenty. We will walk you through it.',
  },
  {
    emoji: '🙏',
    title: 'Keep talking to God',
    body: 'Prayer is just honest conversation. There is no right time, place or posture.',
  },
  {
    emoji: '👨‍👩‍👧‍👦',
    title: 'Do not do this alone',
    body: 'Someone from our follow-up team will reach out. Come and meet the family in person.',
  },
  {
    emoji: '🌱',
    title: 'Grow step by step',
    body: 'Our six-week course starts right where you are — no Bible knowledge assumed.',
  },
]
