/**
 * Bundled page content for About, Founder and Doctrine.
 *
 * This file is the *fallback and the seed*:
 *   - `npm run db:seed` copies it into the `page_contents` table.
 *   - If the database is unreachable (or not configured yet) the site renders
 *     straight from here, so the public pages never go down.
 *
 * Once an ADMIN edits a page in the dashboard, the database copy wins.
 *
 * TODO(ministry): every `[SQUARE BRACKET]` below is a real detail only you can
 * supply — names, dates, places. Search for "[" and replace. The writing style
 * is deliberately plain so a ten-year-old can read it out loud.
 */

export type StaticPage = {
  slug: 'about' | 'founder' | 'doctrine'
  title: string
  subtitle: string
  /** Markdown. GitHub-flavoured extensions (tables, strikethrough) are enabled. */
  content: string
  meta?: Record<string, unknown>
}

const about: StaticPage = {
  slug: 'about',
  title: 'About Us',
  subtitle: 'Who we are, why we exist, and where we are going.',
  content: `
Welcome to **Christ My Soon Coming King Ministry** — the church family many people know as **Praise Arena**.

We are a **deliverance and Holy Ghost ministry**. That is not a label we borrowed; it is the mandate God gave this house. We believe Jesus Christ is alive, that He still sets people free, that His Spirit still fills and still speaks, and that He is coming back soon. Everything we do grows out of those four sentences.

## Our Mandate

**Deliverance and the Holy Ghost.** In plain words: people arrive here bound, and they are meant to leave free.

- **Deliverance** — we take seriously that some burdens do not lift by advice or willpower. Addiction, torment, fear, generational patterns, sickness of the mind and body. We pray, we fast, we stand with people, and we expect chains to break in Jesus' name.
- **The Holy Ghost** — we make room for the Spirit of God to move. Not noise for its own sake, but real presence: conviction, comfort, gifts, boldness, and power to live differently on Monday.

> "The Spirit of the Lord is upon me, because he has anointed me to proclaim good news to the poor. He has sent me to proclaim liberty to the captives and recovering of sight to the blind, to set at liberty those who are oppressed." — Luke 4:18

We are careful with this. Deliverance here is pastoral, never theatrical. Nobody is put on display, nobody is shamed, and nobody is charged a penny. If what you need is a doctor, we will say so and walk you there — and we will still pray.

## Our Story

Christ My Soon Coming King Ministry was founded in **2015** by **Dr Prophet Samuel Orji**, who answered God's call to preach the Gospel of Jesus Christ with power, truth and compassion. He serves alongside his wife, **Pastor (Mrs) Agatha Samuel**.

It started small, as these things do — more hunger than furniture. There was singing, there was prayer, and there was the Bible opened in the middle of the room. People came because they were welcomed, and they stayed because they met God, and because things changed that they had stopped believing could change.

Since then the family has grown, but the heart has not. We still keep a chair open for whoever walks through the door next.

> "Not by might, nor by power, but by my Spirit, says the Lord of hosts." — Zechariah 4:6

[Read more about our founders →](/founder)

## Our Vision

**To proclaim the Gospel of Jesus Christ, prepare people for His second coming, restore hope to the brokenhearted, and raise believers who live holy lives and faithfully serve God.**

Four things, and each one is doing work:

- **Proclaim the Gospel.** Not hint at it. Not assume everybody has already heard. Say it plainly, often, to anybody who will listen.
- **Prepare people for His second coming.** Our name is a statement of belief. He said he is coming soon, and a church that truly believes that lives differently on a Tuesday.
- **Restore hope to the brokenhearted.** Some people arrive with nothing left. They are not a problem to be managed; they are the reason we exist.
- **Raise believers who live holy lives and faithfully serve God.** Not crowds. Disciples — people who will still be standing in twenty years, and who will carry others while they stand.

## Our Mission

Christ My Soon Coming King Ministry is committed to:

- **Preaching the saving message of Jesus Christ.** In plain language, so a child understands it and an elder is still fed by it.
- **Bringing healing and deliverance through the power of God.** We pray for the sick and we pray for the bound, and we expect God to answer.
- **Demonstrating the love of Christ to all people.** All people. Not the ones who look like us, or agree with us, or can do anything for us.
- **Building lives through prayer, sound biblical teaching, and discipleship.** A changed life is built slowly, on ordinary weeks. We are in no hurry.
- **Preparing people for the glorious return of our Lord and Saviour, Jesus Christ.** Ready and joyful, not anxious.

## Our Core Values

### 🩹 Healing
We believe God still heals — bodies, minds and memories. We pray for the sick without embarrassment and without pretending. When medicine is what somebody needs, we will say so and help them get it, and then we will keep praying.

### ⛓️‍💥 Deliverance
Some burdens do not lift by advice or willpower. Jesus set people free in the Gospels and he has not changed. We pray for freedom for as long as it takes — privately, patiently, without spectacle, without shaming anybody, and **never** for money.

### ❤️ Love
Love is the point. Power without love is a noisy gong, and a church that gets everything else right and this wrong has got nothing right. We are patient with each other, quick to forgive, and slow to judge.

These three are what we are known by, and what we want to be measured against.

## Come and See

You do not need to be invited twice, and you do not need to know anybody.

Come as you are. Sit anywhere. Ask any question. We will be glad you came.
`.trim(),
  meta: {
    heroEmoji: '✝️',
    highlights: [
      { label: 'Founded', value: '2015' },
      { label: 'Mandate', value: 'Deliverance & Holy Ghost' },
      // TODO(ministry): the only detail still missing from this page.
      { label: 'Home', value: '[CITY, COUNTRY]' },
    ],
  },
}

const founder: StaticPage = {
  slug: 'founder',
  title: 'Our Founders',
  subtitle: 'Meet the shepherds God gave this house.',
  content: `
God does not build churches out of buildings. He builds them out of people who say *yes*.

Christ My Soon Coming King Ministry exists because two people said yes — and never took it back.

## Dr Prophet Samuel Orji

**Founder & Senior Pastor**

In **2015**, Dr Prophet Samuel Orji answered God's call to preach the Gospel of Jesus Christ with **power, truth and compassion**, and Christ My Soon Coming King Ministry was born.

Those three words are worth sitting with, because they are not the same thing and most ministries manage only one or two.

**Power**, because he refused to preach a Gospel that could only comfort people and never change them. This is a deliverance house: chains break here, the sick are prayed for here, and the Holy Ghost is given room to do what only he can do.

**Truth**, because a message that flatters people cannot save them. He preaches the Bible plainly — the parts that encourage and the parts that cost something — in language a child can follow and an elder is still fed by.

**Compassion**, because the people in front of him are not a congregation, they are individuals with names. He has never treated somebody's worst season as a sermon illustration.

Through years of faithful service, he was later awarded a **Doctorate Degree** in recognition of his dedication to Christian ministry and leadership. He wears the title lightly. Ask anyone here and they will tell you the same thing: he is a pastor first.

Today he gives himself to three things — **preaching the word plainly, praying for the flock, and raising leaders** who will one day carry more than he ever did.

### A word from Pastor Samuel

> Friend, I want you to hear this from my own mouth: **you are welcome here.**
>
> This house is not a museum for perfect people. It is a hospital, a school and a home, all at once. If you are bound, come — we will pray with you for as long as it takes. If you are searching, come and bring your questions. If you are strong, come and help us carry somebody else.
>
> Our King is coming back. Until that day, let us love God, love people, and finish well.
>
> — **Dr Prophet Samuel Orji**

## Pastor (Mrs) Agatha Samuel

**Co-Founder**

Pastor Agatha Samuel serves alongside her husband, and the ministry would not be what it is without her.

She is committed to **teaching God's Word**, to **encouraging believers**, and to **supporting the vision of this house** — three callings that rarely get applause and hold everything together.

Her ministry is not loud; it is deep. She notices who has stopped coming. She remembers who is hurting, and follows up long after everybody else has moved on. She teaches so that people leave able to open their own Bible during the week.

If Pastor Samuel carries the mandate of this house, Pastor Agatha carries its warmth. Both are needed. A church with power and no love is a noisy gong.

### A word from Pastor Agatha

> To every woman, every young person, and every child reading this — **I am praying for you.**
>
> You are not too far gone. You are not too young for God to use. And you are not carrying today's weight on your own, whatever it feels like.
>
> Come and sit with us. Bring your children, bring your questions, bring your tears if that is all you have. God meets us exactly where we are, and this family will meet you there too.
>
> — **Pastor (Mrs) Agatha Samuel**

## Together

Ministry of this kind is not done alone, and it is not done from a distance.

They pray with people. They sit in hospitals. They take the phone call at eleven at night. Much of what they do will never be seen from a seat on a Sunday, and that is exactly as it should be.

## Praying for our leaders

Please hold them up. Leadership is a joy, but it is also a weight.

- Pray for **strength and health** for their bodies.
- Pray for **wisdom** as they lead, teach and counsel.
- Pray for **their marriage and their home**.
- Pray for **protection** over their hearts and their family.
- Pray that they **finish well** — that is the whole race.

> "Obey your leaders and submit to them, for they are keeping watch over your souls, as those who will have to give an account. Let them do this with joy and not with groaning, for that would be of no advantage to you." — Hebrews 13:17
`.trim(),
  meta: {
    heroEmoji: '👨‍👩‍👧‍👦',
    /**
     * The founders' own photograph, shown at the top of the page.
     *
     * A real picture of real, identifiable people — supplied by the ministry
     * itself, which is the only basis on which it should ever be published.
     * See public/images/photos/CREDITS.md on consent before adding others.
     */
    founderPhoto: '/images/founders-lg.jpg',
    /** Describes the picture, for somebody who cannot see it. */
    founderPhotoAlt:
      'Pastor Agatha Samuel in white with a blue head-tie, standing beside Dr Prophet Samuel Orji, at the front of the church',
    /** Names them, visibly, under the photograph. */
    founderCaption:
      'Dr Prophet Samuel Orji, Founder & Senior Pastor, with Pastor (Mrs) Agatha Samuel, Co-Founder.',
  },
}

const doctrine: StaticPage = {
  slug: 'doctrine',
  title: 'What We Believe',
  subtitle: 'Our faith, written plainly — short enough to read, clear enough to stand on.',
  content: `
Christians have believed the same core truths for two thousand years. Below is what we hold to, said as simply as we know how.

If any of it raises a question, **that is a good sign**. Ask us. Questions are welcome here.

## Statement of Faith

### The Bible
We believe the Bible is God's word — trustworthy, God-breathed, and the final authority for what we believe and how we live. We read it together, and we let it correct us.

### One God, Three Persons
We believe in one God who is eternally **Father, Son and Holy Spirit**. Three persons, one God. This is a mystery we worship rather than a puzzle we solve.

### Jesus Christ
We believe Jesus is fully God and fully human. He was born of a virgin, lived without sin, died on a cross in our place, rose bodily from the dead on the third day, and is alive today.

### Salvation
We believe people are saved by **grace**, through **faith** in Jesus — not by being good enough, not by religious effort. It is a gift. You receive it; you do not earn it.

### The Holy Spirit
We believe the Holy Spirit lives in every believer. He comforts, teaches, convicts, and gives power to live and serve. We believe in the **baptism of the Holy Ghost** and welcome His gifts today — this is a Holy Ghost church, and we say so plainly.

### Deliverance
We believe Jesus still **sets people free**. He did it in the Gospels and He has not changed. Freedom from sin, from torment, from addiction, from fear, from every chain that has a name and some that do not.

We hold two things together and refuse to drop either: **the authority of Jesus is real, and people are precious.** So we pray with faith, and we pray with care — privately, patiently, without spectacle, without shaming anybody, and without ever asking for money. Where medicine or a counsellor is what is needed, we will say so and help you get there. Then we will keep praying.

### The Church
We believe the church is a family, not a building. Every believer belongs, and every believer has something to give.

### He Is Coming Back
We believe Jesus Christ will return, personally and visibly, to judge the world and to gather His people. **Our name says it: Christ, my soon coming King.** We live ready.

### Eternity
We believe in the resurrection of the dead — eternal life with God for those who are in Christ, and eternal separation from Him for those who reject Him.

## Our Practices

### 💧 Baptism
We baptise believers in water, by full immersion, after they have chosen to follow Jesus. It is a public picture of an inward change: the old life buried, the new life raised.

### 🍞 Holy Communion
We share bread and cup together regularly, remembering the body and blood of Jesus, until He comes. The table belongs to the Lord, and every believer is welcome at it.

### 🔥 Spiritual Gifts
We believe the gifts of the Holy Spirit are for today. We welcome them, and we use them **in order, in love, and for building people up** — never for show.

### 🙏 Prayer
We pray about everything. Personally, in families, and together as a church.

### ⛓️‍💥 Deliverance ministry
If you need prayer for freedom, ask any pastor or use the prayer wall on this site. It is private, it is unhurried, and it costs nothing — ever.

### 💒 Marriage & Family
We believe marriage is a covenant before God between one man and one woman, and that homes are the first place faith is taught.

### 🎁 Giving
We give cheerfully — of our money, our time and our skills — because everything we have came from God first.

## What We Teach (In Short)

- God loves you. **Right now**, before you fix anything.
- Sin is real, and it separates us from God.
- Jesus dealt with sin at the cross so we could come home.
- Anyone can be saved — **anyone**, today.
- Following Jesus changes how you live, and that change is good news.
- The Holy Spirit gives you power; you were never meant to do this alone.
- The church is your family; you belong in it.
- Jesus is coming back, so live wide awake and full of hope.

## Questions People Ask

### Do I have to be a member to attend?
No. Come whenever you like, as often as you like. Membership is a step you can take later if you want to.

### What should I wear?
Whatever you own. Nobody here is checking.

### Is there anything for my children?
Yes — children are a full part of this family, and we are building more for them in every phase of this platform.

### I have a lot of doubts. Is that allowed?
Yes. Honest doubt is not the opposite of faith; pretending is. Bring your questions.

### How do I become a Christian?
Talk to God simply and honestly: admit you need Him, believe Jesus died and rose for you, and ask Him to lead your life. Then tell somebody here — we would love to walk with you.

### How do I get in touch?
Create a free account, or reach out with the contact details in the footer of this page.
`.trim(),
  meta: {
    heroEmoji: '📖',
  },
}

export const staticPages: StaticPage[] = [about, founder, doctrine]

export const staticPagesBySlug: Record<StaticPage['slug'], StaticPage> = {
  about,
  founder,
  doctrine,
}
