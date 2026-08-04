# 🙏 Christ My Soon Coming King Ministry — *Praise Arena*

A fast, accessible, child-friendly church community platform for a **deliverance and Holy
Ghost ministry**.

> The ministry's name is **Christ My Soon Coming King Ministry**. *Praise Arena* is the
> slogan it is also known by — it belongs under the name, never in place of it. See
> [The ministry's name and mandate](#-the-ministrys-name-and-mandate).

- **Phase One** — About / Founder / Doctrine pages, member registration, admin area.
- **Phase 2B** — Salvation Decision System (gospel journey, follow-up assignment) and
  Digital Discipleship (six-week course with progress tracking and a full CRUD editor).
- **Phase 3A** — Prayer Portal: prayer wall, guest and member requests with privacy
  controls, prayer groups, testimonies with approval, and an intercessor dashboard.
- **Phase 4A** — Event Management: events, guest and member booking with guests and
  waitlists, QR passes, QR/manual check-in, CSV export. Plus the Ministry and
  SmallGroup models the later phases assume.
- **Phase 4B** — In-app chat: direct, group and auto-provisioned ministry/small-group/
  prayer-group conversations, with blocking, reporting, a word filter and moderation.
  Runs on database polling rather than a realtime vendor — the trade-off is documented
  below and is worth reading before the first busy Sunday.
- **Phase 2A** — Sermon Centre: series, search and filters, video/audio player, notes,
  study questions, transcripts, and per-person listen counts.
- **Phase 3B** — Community feed: posts scoped to everyone / members / a ministry / a small
  group, with pictures, replies, likes, reporting and a moderation queue.
- **Phase 3.5** — a fuller community: member profiles with per-field privacy, a searchable
  directory, multi-emoji reactions, a help board, private pastoral care, reading plans,
  fasts, challenges, polls, a verse of the day, group kinds and community-health metrics.
- **Identity & artwork** — the ministry name and its slogan are separate, admin-editable
  fields, and six real photographs carry the topics.

Built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, **Prisma + PostgreSQL**
and **NextAuth.js**.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

That is genuinely all you need to see the site. **No database is required to run
the public pages** — About, Founder and Doctrine fall back to the copy bundled in
[`content/pages.ts`](content/pages.ts).

Accounts and the admin area need a database. See [Connecting a database](#connecting-a-database).

> **⚠️ Windows note — the `&` in the folder path**
>
> This project lives under `…\WEBSITES & APPS\…`. Windows' `.cmd` shims (the ones npm
> creates in `node_modules\.bin`) truncate paths at `&`, so `npx next`, `npx prisma`
> and friends fail here with `Cannot find module 'C:\Users\HP\Desktop\...'`.
>
> Every `package.json` script therefore calls the tool's JS entry point directly
> (`node ./node_modules/next/dist/bin/next dev`). **Use `npm run <script>` and it all
> works.** Only bare `npx <tool>` is affected. Moving the project to a path without
> `&` would let you use `npx` again, but nothing here requires it.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Generates the Prisma client, then builds for production |
| `npm run start` | Serves the production build |
| `npm run lint` | ESLint (`next/core-web-vitals`) |
| `npm run typecheck` | TypeScript, no emit |
| `npm run db:migrate` | Creates/applies the database migration |
| `npm run db:push` | Pushes the schema without a migration file (quick prototyping) |
| `npm run db:seed` | Loads `content/pages.ts` into the database (+ optional first admin) |
| `npm run db:studio` | Prisma Studio, a GUI for the data |

---

## Connecting a database

Any PostgreSQL will do — [Neon](https://neon.tech) and
[Vercel Postgres](https://vercel.com/storage/postgres) both have free tiers and take
about two minutes to set up.

1. Copy the example environment file and fill in `DATABASE_URL`:

   ```bash
   cp .env.example .env
   ```

   A local `.env` was already generated for you with a random `NEXTAUTH_SECRET` —
   just add the `DATABASE_URL` line to it.

2. Create the tables and load the page content:

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

3. To create the first administrator, add these to `.env` **before** seeding, then
   remove them afterwards:

   ```env
   SEED_ADMIN_EMAIL="pastor@example.org"
   SEED_ADMIN_PASSWORD="a-long-password"
   SEED_ADMIN_NAME="Pastor Name"
   ```

Once connected, `/register` creates real accounts, `/login` signs people in, and
`/admin` becomes reachable for `ADMIN` users.

### Google sign-in (optional)

Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env` and the
“Continue with Google” button appears on `/login` by itself. Leave them blank and it
stays hidden. Authorised redirect URI: `<your site>/api/auth/callback/google`.

---

## ❤️ Salvation Decision System

The journey lives at **`/salvation`** and runs in four steps:

| Route | What happens |
| --- | --- |
| `/salvation` | "I want to follow Jesus" — creates an anonymous decision record |
| `/salvation/gospel` | The gospel in four steps, each with a verse |
| `/salvation/prayer` | A prayer of commitment, written to be read aloud |
| `/salvation/contact` | Name + email/phone → **auto-assigns a follow-up carer** |
| `/salvation/complete` | What happens next, and a link into discipleship |

**The gospel and the prayer work with no database at all.** Only the contact step needs
one, and if it is missing the page says so plainly and shows the church's phone and
email instead of failing silently.

### How follow-up assignment works

`lib/follow-up.ts` is not a naive rotation. It picks whoever currently has the **fewest
open follow-ups**, breaking ties in favour of whoever was assigned **least recently**.
That keeps the load even when volunteers go unavailable and come back.

To put someone on the rota, give them the `FOLLOW_UP_TEAM` role. They can step out
temporarily by setting `availableForFollowUp = false` without losing the role.

Email/SMS notification is a single seam — `notifyAssignment()` in `lib/follow-up.ts`.
It logs today; drop Resend or Twilio in there and nothing else changes.

### Who can see what

| Role | Can do |
| --- | --- |
| `MEMBER` | Read everything public, track their own discipleship progress |
| `FOLLOW_UP_TEAM` | See and update **only the decisions assigned to them** |
| `LEADER` | Be assigned as a discipleship mentor |
| `PASTOR` | Everything below, plus edit the curriculum |
| `ADMIN` | Everything |

Enforced in `lib/permissions.ts`, applied in `middleware.ts` (coarse) and again in each
page and API route (specific). The API endpoints are safe on their own — they do not
rely on the UI hiding things.

---

## 💬 Chat — and how it is live without a realtime vendor

**`/chat`.** There is no socket server and no third-party realtime service: this
deployment has Neon and nothing else. Chat is live anyway, in two layers.

### Layer 1 — Server-Sent Events (the normal path)

One long-lived connection per open conversation. The **server** keeps a single shared
watcher per conversation ([`lib/chat-watch.ts`](lib/chat-watch.ts)) that asks the
cheapest question there is — `SELECT max(seq)` against an index — and fans the answer
out to everyone listening. When something changes it pushes a tiny nudge; the browser
then fetches the delta through the ordinary messages endpoint.

Two things fall out of that shape:

- **Messages land in about a second.** The composer shows a green *Live* indicator.
- **Ten people in one conversation cost the same as one.** The expensive query only runs
  when something has actually changed. This is *less* database work than plain polling,
  not more.

Access control, blocking and serialisation stay in exactly one place, because the stream
carries only "something changed" and never the messages themselves.

### Layer 2 — timer polling (the fallback)

If SSE cannot connect — a proxy that buffers, a platform that will not hold connections —
the client drops back to asking on a timer and says *"Checking every few seconds"*. It
keeps working; it is just slower. `EventSource` reconnects on its own, and the stream
closes itself every four minutes so platform timeouts are a non-event.

### Protecting your Neon bill

Neon charges for compute and suspends when idle, so a forgotten background tab must not
keep it awake. Both layers **stop completely when the tab is hidden** and catch up on
return; the polling fallback also backs off from 3s to 30s as a conversation goes quiet.

If chat gets heavily used, Neon compute hours is the number to watch.

### Want true zero-latency push later?

Two routes, both a single-file change to `use-message-stream.ts`:

- **Postgres `LISTEN`/`NOTIFY`** — free, but needs your *unpooled* Neon connection string
  (PgBouncer in transaction mode cannot do it) and a long-running Node process. Works on
  a VPS, Railway, Render; not on serverless.
- **Pusher or Ably** — works anywhere including serverless, free tiers are generous.

Typing indicators are deliberately absent until one of those lands: a three-second-stale
"Ben is typing…" tells the reader something that is no longer true.

### Files in chat

Images (PNG, JPEG, GIF, WebP) and PDFs, up to 8MB. Three deliberate choices:

- **Type is decided by the file's magic bytes, never the browser's claim.** A shell
  script named `innocent.png` and sent as `image/png` is refused. SVG is refused outright
  because it can carry script.
- **Attachments never live in `public/`.** They are served by
  `/api/chat/attachments/[id]`, which re-checks conversation membership on every request.
  A guessable public URL would leak private threads to anyone with the link.
- **Storage keys are random**, never derived from the uploaded name, so path traversal
  cannot be expressed.

The default driver writes to `.uploads/` on disk, which suits a normal server or VPS.
Serverless filesystems are read-only, so deploying to Vercel means swapping the driver in
[`lib/storage.ts`](lib/storage.ts) for Vercel Blob or S3 — three functions, one file.

### Safety

| Rule | Behaviour |
| --- | --- |
| Private threads | An outsider gets **404, not 403** — the API never confirms a conversation exists |
| Moderators | `PASTOR`/`ADMIN` can read any thread, but **cannot post into it**, do not appear in the member list, and their reading never marks it read |
| Blocking | Stops DMs **in both directions** and hides that person from group threads *for the blocker only*. Silent — the blocked person is never told |
| Editing | Author only. A moderator can remove a message but never rewrite one |
| Deleting | Soft — the row stays so reports about it remain reviewable |
| Word filter | **Flags, never blocks.** A blocked send just teaches people to spell around it; a flagged one reaches a moderator with context |
| Chat ban | Stops posting, leaves reading intact, and is separate from a full account ban |

Group conversations are **derived from group membership**, not a second list to maintain:
join a prayer group and its thread appears; leave and it goes. Leaving is a soft `leftAt`
so past messages keep their attribution.

Message retention is configurable at `/admin/chat`, and now runs on a schedule — see
below.

---

## ⛓️‍💥 The ministry's name and mandate

**The ministry is Christ My Soon Coming King Ministry.** "Praise Arena" is the slogan it
is also known by. That distinction is enforced in the data model, not left to whoever
writes the next page:

| Field | Value | Where it shows |
| --- | --- | --- |
| `name` | Christ My Soon Coming King Ministry | Hero heading, page titles, `schema.org` `name`, the header's second line |
| `aka` | Praise Arena | Under the hero heading, beside the abbreviation, `schema.org` `alternateName` |
| `shortName` | CMSCK | The header lockup, where four words would wrap |
| `legalName` | Christ My Soon Coming King Ministry | Footer copyright |

All four are editable at **/admin/settings**. Rename the ministry there and every one of
those places follows — the hero used to have "Praise Arena" written into it as the
heading, which is how the slogan came to outrank the name in the first place.

Leave `aka` blank if a church does not use a slogan; every place that renders it checks
first.

**The mandate is deliverance and the Holy Ghost.** It leads the home page (see
`components/home/mandate.tsx`), opens the About page, and has its own article in the
statement of faith. Two sentences in that copy are deliberate and should survive editing:

> Deliverance here is pastoral, never theatrical. Nobody is put on display, nobody is
> shamed, and nobody is charged a penny.

> If what you need is a doctor, we will say so and walk you there — and we will still pray.

Those are safeguarding statements as much as they are theology. Keep them.

---

## 🎨 Illustrations

`components/illustrations/index.tsx` holds the whole set — thirteen drawings, one per
topic, in the logo's navy, teal and gold.

**They are hand-authored SVG, not downloaded stock.** Three reasons, in order of how much
they matter:

1. **Stock cannot describe these topics.** No library has a chain snapping, or a dove over
   a tongue of fire, in a style that matches this logo. A generic illustration of somebody
   at a laptop would not be "the image that best describes the topic" — it would be filler.
2. **Licensing.** Genuine premium stock is licensed, renewable and per-seat. A church's
   website should not carry a dependency that can lapse. These belong to the ministry.
3. **Speed.** Inline SVG means no extra requests, no CDN, no layout shift while artwork
   loads, and perfect scaling from a 40px tile to a full hero panel.

### Using one

```tsx
import { Illustration, PrayerArt } from '@/components/illustrations'

<PrayerArt className="w-40" />              // light surfaces
<Illustration name="prayer" tone="dark" />  // on the navy hero
```

`tone` is the only thing to get right: `light` on pale surfaces, `dark` on navy. Page
heroes pass `art="…"` to `<PageHero>` and it handles both placements — beside the heading
on desktop, above it on phones.

All are decorative and marked `aria-hidden`, because the heading next to each one already
says what it is. If you ever use one *instead* of text, give it a `<title>` and swap
`aria-hidden` for `role="img"`.

### Two rules if you add more

- **Translucent fills must be `rgba()`, never `hsl(H S% L% / A)`.** Browsers understand
  the slash syntax; plenty of other SVG consumers silently drop the alpha and paint the
  fill fully opaque, turning every soft interior into a solid navy block. This was a real
  bug here, caught by rasterising the set and looking at it.
- **Outline, don't fill.** Solid-filled figures merge into one dark mass at tile size.
  Every person in this set is a stroked outline over a soft tint, which is what keeps five
  people readable as five people.

---

## 📺 Sermon Centre

Every message, kept and findable. `/sermons` is public and needs no account.

### Pasting a video link

Paste whatever the address bar says — a watch link, a share link, a mobile URL, a
`/live/` or `/shorts/` link. `toEmbed()` in `lib/embed.ts` extracts the id and **rebuilds
the embed URL from it**. It never passes the pasted string through.

That distinction is the whole security story: the result goes into an `<iframe src>`, so
forwarding the raw value would let a `javascript:` URL or a lookalike host render inside
the page's own origin. Anything unrecognised returns `null` and is offered as a plain
outbound link instead. Recognised hosts are YouTube (including `youtu.be`), Vimeo and
Facebook.

YouTube embeds use `youtube-nocookie.com` **and do not load until someone presses play** —
a sermons page with twelve cards should not open twelve connections to Google.

Facebook is the exception to "rebuild from the id", because a Facebook video is identified
by page-plus-post and has no stable short id to extract. The rule is kept a different way:
the plugin URL is built from `origin + pathname` only — the pasted query string and
fragment are discarded, the host must be a known Facebook one, and the result is then
URL-encoded into a parameter of a hard-coded `facebook.com` URL. A `javascript:` link
cannot survive that, and neither can a lookalike host.

### Bringing the church's YouTube channel in

**Admin → Sermons → Bring in from YouTube.** It lists the channel's recent uploads with
thumbnails and turns the ones you tick into sermons, which then play inside the site.

It reads the channel's public Atom feed — **no API key, no Google Cloud project, no
quota.** The YouTube Data API would need all three, and the quota is the kind of thing a
church discovers it has exceeded on a Sunday morning. The trade is that the feed carries
the fifteen most recent uploads and no duration; both are fine, because a church imports
as it uploads.

Three details worth knowing:

- **The video id is the identity, not the title.** A church that renames an upload must not
  end up with the same message in the list twice, so the importer matches on the id inside
  the stored URL. Re-importing reports how many were already there and creates nothing.
- **Shorts are flagged and left unticked.** A church channel carries clips as well as
  messages, and a thirty-second Short filed as a sermon is noise in the one place people go
  looking for teaching. It is only a hint — the feed has no duration, so the tags are the
  only signal — and you can tick it anyway.
- **It is a pick-list, not a sync.** Nothing is imported that a pastor did not choose.

The channel id is resolved once from the handle in **Settings → YouTube** and cached in
`SiteSetting.youtubeChannelId`. Resolving it means fetching the channel page and reading
the id out of the markup — there is no public endpoint that converts a handle to a channel
id — so it is cached rather than repeated. Change the YouTube link and clear that column to
re-resolve.

### Audio

An `audioUrl` ending in `.mp3`, `.m4a`, `.aac`, `.ogg`, `.wav` or `.webm` gets a native
player and a download button. Anything else is treated as a link, because an `<audio>`
element pointed at a webpage just fails silently.

Give both a video and an audio link and the video plays at the top with a "Prefer to
listen?" player underneath.

### Counting listens

`SermonView` holds **one row per person per sermon**, keyed on `actorKey`
(`user:<id>` or `guest:<cookie id>`) — the same shape `PrayerLog` uses, and for the same
reason: a nullable `userId` plus a nullable `sessionId` would let Postgres wave duplicate
NULLs through a composite unique index.

So `viewCount` counts *people*, not refreshes. A second visit updates `watchSeconds` and
`completed` (both only ever move forward) without counting again.

The player reports progress fire-and-forget and ignores every response. A broken counter
must never interrupt a sermon.

### Publishing

| Status | Who sees it |
| --- | --- |
| `DRAFT` | Pastors and admins only — including on the public URL, so you can preview |
| `PUBLISHED` | Everyone |
| `ARCHIVED` | Pastors and admins only. Off the list, out of the sitemap, link still works for staff |

The delete button **archives**. A second, explicit delete from the admin screen
(`?permanent=1`) destroys the row. Nobody loses a transcript they spent an evening typing
to one mis-click.

Retitling a sermon moves its URL and leaves the old one to 404 — a stale slug reading
`guest-speaker-tbc` is worse than a changed link, and the 404 means an accidental rename
gets noticed straight away.

### Ask this sermon — and why it costs nothing

Any sermon with a transcript (or decent notes) gets a question box. It runs in two layers,
and **the first needs no AI, no key and no account at all**.

**Layer 1 — retrieval. Always on.** The transcript is split into passages and ranked
against the question with [BM25](lib/sermon-qa.ts). The best three are shown *verbatim*.
Ask "what did he say about forgiveness?" and you get the paragraph where he said it, in
his own words. For most questions that is the whole answer, and it is more trustworthy
than a summary because nothing was rewritten.

BM25 rather than a keyword count because it does two useful things for free: it discounts
words that appear all over the sermon (every passage says "God"), and it stops a long
rambling paragraph outranking a short precise one.

**Layer 2 — a written answer. Only if a free model is configured.** The retrieved
passages, *and nothing else*, go to the model, which is told to answer from them or admit
it cannot. The passages stay on screen underneath, so nobody has to take the machine's
word for anything.

Layer 2 is grounded in layer 1 deliberately. An ungrounded model asked "what does this
church believe about baptism?" will invent something, and a made-up doctrine attributed to
your pastor is a real harm, not a glitch.

### Choosing a free provider

Set `AI_PROVIDER` and one key. Nothing else changes.

| `AI_PROVIDER` | Cost | Get a key | Notes |
| --- | --- | --- | --- |
| *(unset)* | — | — | Retrieval only. Everything works. |
| `gemini` | Free tier | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | Best quality for nothing, no card needed |
| `groq` | Free tier | [console.groq.com/keys](https://console.groq.com/keys) | Very fast, open models |
| `ollama` | Free | [ollama.com](https://ollama.com) | Runs on your own machine. **Private.** |

Free tiers move around. `GEMINI_MODEL` and `GROQ_MODEL` are overridable so a renamed model
is an env change rather than a code change, and your live limits are on
[AI Studio's rate-limit page](https://aistudio.google.com/rate-limit).

Three things keep usage inside a free tier: answers are **cached** per sermon and
normalised question (the tenth person to ask costs nothing), asking is **rate limited** to
20 questions an hour per browser, and **retrieval runs first** — so the feature still works
with the quota at zero.

### ⚠️ The rule about what leaves this server

> **Only content that is already public is ever sent to an outside model.**

This is not a preference. Google's free Gemini tier states plainly that it uses submitted
content "to provide, improve, and develop Google products" and that **"human reviewers may
read, annotate, and process your API input and output"**. Groq's free tier is comparable.

A sermon transcript is fine — it was preached to a room and published on this website.
A prayer request saying *"my marriage is failing"* is not. Neither is a benevolence
request, a chat message, or a members-only post.

So the rule is enforced by the **type system**, not by remembering. `askGrounded()` accepts
only `PublicText`, a branded type that can be produced solely by `markPublic()` — which is
called in exactly one place in the entire codebase, on a **published** sermon's own
transcript. Anything else fails to compile:

```
lib/__proof.ts(4,39): error TS2322:
  Type 'string' is not assignable to type 'PublicText'.
```

You can check this yourself at any time:

```bash
grep -rn "markPublic\|askGrounded" lib app components | grep -v lib/ai.ts
```

If you ever want AI over private content, use `ollama` — it runs on your own hardware and
nothing leaves the building. That is the only configuration where it would be defensible,
and even then it should be a decision the church makes on purpose.

### What people are asking

Every question is stored — as a cache, and because it is worth a pastor's time.
`/admin/questions` shows them ranked by how often they were asked. "What did he say about
forgiveness?" asked eleven times is next month's sermon series, not a support ticket.

---

## 💬 Community feed

`/community` is the conversation between Sundays. Guests see public posts; members see
everything they are entitled to.

### Who can see a post

All of it lives in `postFeedWhere()` in `lib/community.ts`, for the same reason
`prayerWallWhere()` does: a post scoped to a small group was written on the understanding
that eight people would read it. **Every read path builds its filter from that one
function** — nothing assembles its own `where`, so there is exactly one place to get this
wrong and exactly one place to check.

| Visibility | Who reads it |
| --- | --- |
| `PUBLIC` | Anyone, signed in or not |
| `MEMBERS` | Any signed-in member |
| `MINISTRY` | Members of that ministry |
| `SMALL_GROUP` | Members of that small group |

On top of that, always:

- **Your own posts are always yours to read**, whatever scope you chose.
- **Blocked people disappear.** `UserBlock` (shared with chat) hides their posts and
  their replies — from moderators too, because blocking is your choice, not a permission.
- **Soft-deleted posts leave the feed** for everyone, including leaders. They surface only
  in the moderation queue, which asks for them explicitly.

### Posting into a scope you do not belong to

Without a check, `visibility` would be a suggestion — anyone could POST
`{ visibility: 'SMALL_GROUP', smallGroupId: '<any id>' }`. `canPostToScope()` refuses
unless you are a member.

Leaders may post into any group (announcements), so their id gets an existence lookup
first. A member's own membership list already proves the group exists; a leader's does
not, and skipping that check turned a typo'd id into a foreign-key crash rather than a
field error.

### Pictures

Uploaded through the same driver chat attachments use: magic-byte sniffing (never the
claimed `Content-Type`), a random storage key, and bytes written outside `public/`.

They are served from `/api/community/images/[id]`, which **re-runs the visibility check on
every request**. A small-group photo is exactly as private as the post it belongs to, and a
public file URL would stay readable to anyone who had ever seen it.

Feed posts only accept images — the shared sniffer also allows PDFs for chat, but a PDF has
nowhere to go on a card.

### Replies

One level of nesting. Replying to a reply attaches to its parent instead of nesting
deeper — deep threads are unreadable on a phone, and silently re-parenting is friendlier
than refusing the reply.

### The rest of the community section

`/community/hub` is the front door. Eleven places hang off it, and the consolidations
below are the reason it is eleven features rather than eleven codebases.

| Place | What it is |
| --- | --- |
| `/community` | The main feed |
| `/community/encouragement` | Shout-outs — short public thank-yous naming a member |
| `/community/verse` | Verse of the day, and reflections on it |
| `/community/challenge` | This week's challenge, and how people got on |
| `/community/worship` | Songs that carried people this week |
| `/community/growing` | Reading plans, corporate fasts, weekly challenges |
| `/community/directory` | Find members by gift, skill, interest, area or ministry |
| `/community/members/[id]` | A member's profile |
| `/community/profile` | Your own profile and privacy switches |
| `/community/help` | The help board — ask for a hand, or offer one |
| `/community/groups` | Small groups, neighbours, interests, services, support |
| `/community/care` | A private line to the eldership |

### Three consolidations worth knowing about

**Channels, not tables.** The encouragement wall, verse reflections, challenge entries and
worship shares are all `Post` rows with a different `channel`. That means they inherit the
visibility rules, the reaction system and the moderation queue rather than four boards
each reinventing all three — and `postFeedWhere(viewer, channel)` is still the only thing
that decides who sees what.

**One `Initiative`, three features.** A reading plan, a corporate fast and a weekly
challenge are the same shape: a window of days that members join and log against. They
share one model, one sign-up flow, one progress table and one tracker component. Only the
wording differs, and that is a lookup in `lib/community-labels.ts`.

**One `SmallGroup`, six kinds.** Neighbourhood, interest, service-time, support and
leadership groups are small groups with a `kind` and two flags. Membership, posting,
visibility and moderation are shared, so a fix to any of those is a fix for all six.

### Privacy — the parts that matter most

**Contact details are opt-in, one field at a time.** Email, phone, birthday and
neighbourhood each have their own switch and each defaults to *hidden*. `redactProfile()`
is the only function that turns a `MemberProfile` into something renderable, so a field
cannot leak through a template that forgot to check.

**Leaders do not bypass it.** Somebody who hid their phone number hid it from the church,
not from strangers. Pastors who genuinely need it have the admin area.

**Unlisting is real.** Turn off "list me" and the profile stops answering by URL too — a
switch that only hid you from search would be worth very little.

**Birthdays never include the year.** Day and month only, and only if you opted in.

**Support groups are invisible, not merely closed.** Seeing "Grief & Loss — 6 members" in
a list is itself a leak about the six, so `groupListWhere()` omits them entirely for
non-members.

**Anonymous posting is a property of the group.** A client can send `anonymous: true` all
it likes; the route only honours it inside a group that has it switched on *and* that the
member belongs to. Anonymity is then applied in `toFeedPost` — the author's name and
avatar never reach the browser, rather than being hidden in the component.

**Anonymous care requests store no author id at all.** Not a hidden one — `authorId` is
genuinely null, so there is nothing for a future query to leak. The optional reply address
is the only thread back, and the person decides whether to leave it.

**Benevolence requests are pastors-only** — `canReadCare()` is deliberately narrower than
`canModerateCommunity()`. A small-group leader moderates posts; they do not get to read
who in their group asked for help with rent.

### Reactions

Five: 🙏 praying, ❤️ love, 🔥 encouraged, 🤝 amen, 🎉 rejoicing. Praying leads because on a
church feed it is what people reach for, and it says something a plain like cannot.

One row per person per post with the reaction as a *column*, so changing your mind updates
rather than stacking. Tallies come from a `groupBy` — a post with four hundred reactions
costs five numbers, not four hundred rows.

### Badges

Computed, never stored. There is no `MemberBadge` table on purpose: awarding rows means a
background job, a backfill for everyone who qualified before the feature existed, and
silent drift the first time a counter is corrected. Deriving them from numbers that
already exist means a badge is always true by construction.

They are also deliberately quiet — no leaderboard, no points, no ranking members against
each other. A church is not a game.

### What is *not* built, on purpose

**Sentiment analysis over members' posts.** It was on the list. It needs an AI provider
this deployment does not have, but more importantly scanning what people write for signs
of distress is something a church should decide to do deliberately rather than find
switched on. The "quiet for a month" list on `/admin/community-health` catches most of the
same people without reading anybody's words — and it produces a phone call rather than a
flag.

**Push and SMS for urgent prayer.** In-app and email work through `lib/notify.ts` today.
Web push needs VAPID keys; SMS needs a Twilio account.

**Group self-service joining.** Memberships are set in the database or by a leader for
now. That is deliberate while support groups exist — nobody should be able to add
themselves to the grief group by guessing a URL.

### Reporting and moderation

Reporting marks the post `flagged` so it stands out in `/admin/community`, but **does not
hide it**. Hiding anything on a single unreviewed report would hand every disagreement a
mute button.

Leaders can remove (soft), restore, dismiss the reports, pin, or delete for good. Authors
can remove their own posts. Reporting the same post twice returns success rather than an
error — the report is on file either way, and saying "thank you" is both true and kinder.

A chat ban is a community ban. Same person, same behaviour, one switch.

---

## 🧑‍🤝‍🧑 Membership — registering, and what a profile holds

Registration is the door into the community section. `/register` asks four things and
nothing else: **name, email, date of birth, password.** Everything else — a photo, phone
number, home address, neighbourhood, profession, the department you would like to join —
sits behind **"Tell us a little more"**, is entirely optional, and can be added or changed
later from `/community/profile`.

That split is the point. A registration form that demands a home address before it will
let somebody in is a form that loses the person who was only half sure about coming.

### Who can see each field

Not every detail is equally safe to publish, so they do not share one switch.

| Field | Default | Who sees it |
| --- | --- | --- |
| Name, photo | Shown | Any signed-in member |
| Profession | Shown | Any signed-in member |
| Neighbourhood | Shown | Any signed-in member |
| Birthday | **Hidden** | Only if switched on — see below |
| Phone, email | **Hidden** | Only if switched on |
| **Home address** | **Hidden** | Only if switched on, and it has its own switch |

The address is deliberately the most guarded field on the site: it is the one that tells a
stranger where you sleep. It is off by default, it never appears in the directory listing,
and turning on "show my contact details" does *not* turn it on.

Leaving the directory hides you from the member list **and** makes your profile page 404
for everybody else. A switch that hid you from the list but left the URL answering would
be worth very little.

### Birthdays

On somebody's birthday the home page carries a celebration for them — their photo, their
name, and confetti — visible to signed-in members only.

It is **opt-in**. Being celebrated is a lovely thing to be part of and a horrible thing to
be dragged into, so nobody appears without ticking the box. The confetti is forty CSS
keyframe pieces at deterministic positions, no JavaScript, and it is hidden entirely under
`prefers-reduced-motion`.

---

## 📅 The Christian calendar

The home page counts down to what the church is marking next, and `/admin/calendar` lists
the whole year.

### The dates are computed, not typed in

Half the calendar moves. Easter falls on the first Sunday after the first full moon on or
after the spring equinox, and eight other observances hang off it — Ash Wednesday, Palm
Sunday, Maundy Thursday, Good Friday, Ascension, Pentecost, Trinity Sunday. A calendar
that needs somebody to look those up every January is a calendar that will be wrong by
March.

So [`lib/church-year.ts`](lib/church-year.ts) works them out. Easter uses the Anonymous
Gregorian algorithm (Meeus/Jones/Butcher), valid for any Gregorian year; the rest are
offsets from it. Advent Sunday is the fourth Sunday before Christmas. Harvest has no
universal date — the first Sunday of October is a common, defensible choice, and it can be
overridden like anything else.

"Next" rolls into the following year automatically. On 30 December, Epiphany is eight days
away, not three hundred and fifty-seven.

### What an administrator can and cannot change

**Can:** what a day is called, the line underneath it, the picture beside it, and whether
it shows at all. **Cannot:** when it falls. That is arithmetic rather than opinion, and
the API ignores a `month`/`day` sent for a computed feast — there is a regression test that
tries to move Easter to July and asserts it did not work.

One-off dates the church sets itself — a convention, a crusade — are the exception and get
a real date field, because nothing can compute those.

### The pictures

Every one of the fifteen days ships with a photograph, mapped in
[`lib/calendar-art.ts`](lib/calendar-art.ts) and credited in
[`public/images/calendar/CREDITS.md`](public/images/calendar/CREDITS.md). They are
**bundled, not seeded** — the calendar has to look right on a fresh clone with no database,
and an empty `calendar_dates` table means "nothing overridden" rather than "nothing to
show". A church upload through the admin wins over the bundled file.

Every photograph was rendered onto a contact sheet and looked at before it went in, and
three of the first fourteen were thrown out: Easter was a fire in a cave mouth that read as
a furnace, Epiphany was a starfield that rendered as a black rectangle at tile size, and
Harvest was half blown-out white sky. The standard is that the picture describes the day —
one that needs a caption explaining what it has to do with Easter has failed, however good
a photograph it is.

---

## 📣 Announcements

Two boards on the home page: **general** for the whole church, **departmental** for one
ministry. A digital design can be attached to either.

The audience picker is the control that matters. Choosing a department switches the
audience to `MINISTRY` automatically, because a departmental notice sent to the whole
church is exactly the noise this feature exists to avoid — and a general board full of
other people's rota changes is a board people learn to stop reading.

| Audience | Who sees it |
| --- | --- |
| `PUBLIC` | Anyone, including visitors who never sign in |
| `MEMBERS` | Signed-in members |
| `MINISTRY` | That department's members — plus leaders, pastors and admins |

Announcements **expire**. `endsAt` is strongly encouraged in the admin copy for the same
reason: one left up for three months is noise. A notice whose window has passed simply
stops being returned.

Designs on a non-public announcement are served through an authenticated route with a
random storage key, exactly like a community post image — the file is not guessable and
not readable by someone who should not see the notice it belongs to.

---

## 🕊️ The Pastor's Word

A short word on the home page every day, and it fills itself in.

If nobody has written one for today, the page shows one from a bundled rotation of
twenty-one in [`content/pastors-words.ts`](content/pastors-words.ts), picked by day number
so it is the same for everybody all day, changes at midnight, and does not jump about when
the server restarts. `pastorsWordToday()` never returns null — the section cannot be empty,
which means writing one is a choice rather than a daily obligation.

`/admin/pastors-word` opens pre-filled with whatever is currently showing, including the
rotation, so writing one is editing a draft rather than facing a blank box. You can write a
week ahead in one sitting. "Use the automatic word" deletes the row and the rotation takes
that day back, which is why deleting is safe.

---

## 🏛️ The home page, and why it is in that order

The home page runs from what a stranger needs to what a member needs:

1. **Hero** — who this church is, and two ways in.
2. **Birthdays** — signed-in members only, and only when there are any.
3. **When we gather** — the first question anybody has about a church.
4. **The Pastor's Word** — today's word.
5. **The Christian year** — what is coming, with a countdown.
6. **Notices** — general, then your department's.
7. **Our mandate** — what this house is for.
8. **Where would you like to go?** — every section of the site as a tile.
9. **Testimonies and the two doors** — sermons and events.
10. **Invitation** — create an account.

### The alternating bands

Every other section sits on a tinted full-bleed background. That is not decoration: with
ten sections all on the same near-white, the page stopped reading as sections at all and
became one long scroll. The `Band` wrapper lives in
[`app/(public)/page.tsx`](<app/(public)/page.tsx>) so every decision about the page's rhythm
is in one file rather than scattered across ten components that cannot see one another.

Testimonies and the two doors share a band rather than taking one each, because
`FeaturedTestimonies` renders nothing until a testimony has been approved — the rhythm
cannot depend on a component that is allowed to disappear.

### Service times

Edited in **Admin → Settings**, or in `siteConfig.serviceTimes` as the bundled fallback.
`time` holds the whole range ("9:00 AM – 12:00 PM") rather than a start time, because people
plan a Sunday around when a service *ends* at least as much as when it starts.

The band marks whichever service is next by reading the weekday out of the `day` column.
"Sunday", "Sundays" and "sunday" all match; anything that is not a weekday name — "Every
other Tuesday" — simply gets no badge. A wrong "Today" on a church home page sends somebody
out to a locked building.

Never index into `serviceTimes`. An administrator can delete every row from the settings
form, and a home page that throws because a church has not filled in its times yet is a home
page that fails on day one.

---

## 📄 Terms, privacy and the other information pages

Five documents, at `/terms`, `/privacy`, `/community-guidelines`, `/safeguarding` and
`/accessibility`, with a hub at `/legal`. They are written in
[`content/legal.ts`](content/legal.ts).

> **These are not legal advice.** They were written to describe *what this platform actually
> does*, honestly and in plain English — which is the hard part, and the part a downloaded
> template always gets wrong. Have somebody qualified in your jurisdiction read them before
> the site goes public, and check what your country requires that is not here.

### Why they are in code and not the admin

Deliberate. A legal document should change when somebody decides it should change, with a
record of what it said before — which a git history gives and a textarea does not. The
`updated` date is shown to readers, so it has to be edited in the same commit as the text.

### Placeholders

The ministry's details are **not** written into the prose. `{{name}}`, `{{shortName}}`,
`{{legalName}}`, `{{email}}`, `{{phone}}`, `{{address}}` and `{{site}}` are filled at render
time from the live site settings, so changing the church's email address in the admin cannot
leave a stale one buried three screens down the privacy policy.

An unknown placeholder is left visible rather than replaced with nothing — a stray
`{{oops}}` is a bug somebody reports, and a silent blank in a legal document is not.

### Two things in there that are easy to miss

- The privacy policy states plainly that free-tier AI providers may use submitted content
  for product improvement and that **human reviewers may read it** — and then says that only
  published sermon transcripts are ever sent, and that this is enforced by the type system
  rather than by policy. If you change the AI rules, change that paragraph in the same
  commit.
- The safeguarding page ends with a note to the ministry: **name your designated
  safeguarding lead and the statutory reporting body for your country.** A safeguarding page
  that does not say who to ring is not finished.

---

## ⏰ Scheduled jobs

`GET /api/cron` runs three jobs, all safe to repeat:

1. **Chat retention** — deletes messages past the configured age.
2. **Orphaned uploads** — removes files uploaded but never sent, after a day. Bytes go
   before rows: a leftover record is untidy, a leftover file is a privacy problem.
3. **Event reminders** — two days and two hours before each event. The windows are an
   hour wide to suit an hourly schedule, and each event falls in each window once, so
   nobody is reminded twice.

Guarded by `CRON_SECRET`, compared in constant time. Point anything at it hourly:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-site/api/cron
```

Vercel Cron, GitHub Actions, cron-job.org or a plain crontab all work. Without
`CRON_SECRET` set the route returns 503 and does nothing.

---

## 🎟️ Events and check-in

**`/events`** — anyone can book, with or without an account.

### Seats, not bookings

The rule the whole feature turns on: **a party of N takes N seats.** A family of five
booking together cannot walk into a room with two chairs left. Capacity, availability
and waitlist promotion all count `guests + 1`, and the confirm-or-waitlist decision runs
inside a transaction so two people racing for the last seat cannot both win it.

### The waitlist

Strictly first-come-first-served — but it **skips a party too large to fit** rather than
bumping them ahead of someone smaller, and keeps looking down the queue. So one freed
seat goes to the next person who actually fits, and positions renumber to close the gap.
Promotion happens the instant somebody cancels, in the same request.

### Check-in works on any phone

Every booking gets two credentials: a long token inside the QR, and a **six-character
code** printed underneath it. The scanner uses `BarcodeDetector`, which only exists in
Chrome/Android — so manual code entry is a **first-class path**, not a buried fallback. A
volunteer on an iPhone types six characters and gets the identical result.

The code alphabet excludes `0/O/1/I/L` to stop arguments at the door.

Re-scanning is **not an error**: it answers "already checked in, at 09:14" so the steward
waves them through. Scanning a QR photographed off someone's screen cannot check anyone
in — `/check-in/[token]` only ever *shows* the pass; marking attendance needs the
authenticated POST.

### Exports

`/admin/events/[slug]` exports the check-in list as CSV. Cells beginning `=`, `+`, `-` or
`@` are prefixed with an apostrophe: without that, a name like `=cmd` is executed as a
formula when the file opens in Excel.

### Deleting an event

An event with bookings is **cancelled, never deleted** — people hold tickets, and the
registrations are the attendance record. Only an event nobody booked is removed outright.

| Role | Can do |
| --- | --- |
| `LEADER` / `PASTOR` / `ADMIN` | Create and edit events, see registrant lists, export CSV, run check-in |

---

## 🙏 Prayer Portal

**`/prayer`** with four tabs: Prayer Wall, Ask for Prayer, Prayer Groups, Testimonies.

### Who can see a prayer request

This is the most sensitive data in the platform. Someone wrote *"my marriage is
failing"* and ticked **Private** — the rules below are the whole reason they felt safe
doing so.

| Visibility | Who sees it |
| --- | --- |
| `PUBLIC` | Everyone, including signed-out visitors |
| `MEMBERS_ONLY` | Signed-in members |
| `PRIVATE` | **Only** `PRAYER_TEAM`, `PASTOR`, `ADMIN` — never the wall |
| Shared to a group | Only that group's members |
| Anonymous | Content is shown; the name becomes "Anonymous" |

Authors always see their own requests, whatever the state. `LEADER` and
`FOLLOW_UP_TEAM` **cannot** read PRIVATE requests — being staff elsewhere does not grant
access here.

All of it lives in one function, `prayerWallWhere` in
[`lib/prayer.ts`](lib/prayer.ts), and every read path builds its filter from it.
Nothing constructs its own — that is how a private request ends up on a public wall.

Anonymity is resolved **server-side**: the author's id and avatar never reach the
browser for an anonymous request, so no future template can leak them. The prayer team
still sees real names, because you cannot follow up with "Anonymous".

### Who can submit

- **Guests** — one request a day, name required. Always `PUBLIC`.
- **Members** — up to 20 a day, any visibility, optional anonymity, optional group.

A *failed* submission does not consume the daily allowance. A typo in the title must
never cost somebody their one chance to ask for prayer, so the quota is only spent on a
successful write; a separate, generous attempts bucket stops anyone hammering the
endpoint.

### "I prayed for this"

Idempotent by construction: a unique index on `(requestId, actorKey)` means a refresh, a
double tap or a second tab all count once. Guests are identified by an httpOnly cookie
that identifies a *browser*, never a person.

### Prayer groups and testimonies

- Groups have a membership list and a discussion board. Real-time chat is Phase 4.
- Testimonies are **approved before publishing** (`/admin/testimonies`); prayer requests
  are auto-approved with flagging. A testimony is a permanent published page; a prayer
  request is a transient ask — hence the difference.
- Featured testimonies appear on the homepage, and vanish cleanly when there are none.

### Roles

| Role | Can do |
| --- | --- |
| `PRAYER_TEAM` | Read PRIVATE requests, log prayers, mark answered, flag for a pastor, send private notes, approve testimonies, manage groups |
| `PASTOR` / `ADMIN` | All of the above |

Set `availableForFollowUp = false` to step a volunteer out of the urgent-alert rota
without removing their role.

---

## 🔐 Two-factor authentication

Any account can switch it on at **`/account/security`**; staff accounts are prompted on
their dashboard until they do. Standard TOTP — Google Authenticator, Microsoft
Authenticator, Authy and 1Password all work.

Four decisions worth keeping:

- **Enrolment is two steps.** Scanning stores a secret but leaves 2FA *off*. It only
  switches on once a real code proves the app is set up — otherwise a mis-scanned QR
  locks a pastor out of their own church's site.
- **The secret is encrypted at rest** (AES-256-GCM). A stolen database backup should not
  let anyone mint valid codes. Set `TWO_FACTOR_KEY` in production: it falls back to
  `NEXTAUTH_SECRET`, and rotating that would make every stored secret undecryptable.
- **Ten recovery codes, bcrypt-hashed and single-use.** Each is a complete second factor,
  so it gets password treatment. They are shown exactly once.
- **Turning it off needs the password**, so an unattended signed-in laptop is not enough
  to strip the second factor from an account.

A valid code never rescues a wrong password, and the code is only ever requested *after*
the password is correct — so the prompt reveals nothing about which accounts exist.

**Lost phone and no recovery codes?** There is deliberately no self-service escape. Clear
it directly:

```sql
UPDATE users SET "twoFactorSecret" = NULL, "twoFactorEnabledAt" = NULL,
       "twoFactorRecovery" = '{}' WHERE email = 'them@example.com';
```

---

## 🔐 Age gate and account safety

Non-negotiable rules from the Phase 3 plan, enforced in `registerSchema`:

- **Under 13 cannot create an account.** Refused with a kind message, not a bare error.
- **13–17 need a parent or guardian** to tick the consent box. The box only appears once
  the entered date of birth puts them in that range.
- **Banned users cannot sign in** — checked *after* the password, so the form cannot be
  used to discover which accounts are banned. Google sign-in is blocked too.

---

## 📚 Digital Discipleship

**`/discipleship`** — courses, weeks and lessons, with progress tracking for signed-in
members. The bundled course, **First Steps**, is six weeks × three lessons:

1. Salvation · 2. Prayer · 3. Bible Study · 4. Faith · 5. The Holy Spirit · 6. Evangelism

Every lesson has Markdown content, Bible verses and reflection questions.

**Anyone can read every lesson without an account.** Signing in adds the tick-box, the
progress bar, and a "continue where you left off" link on the dashboard.

### Editing the curriculum

Unlike the About/Founder/Doctrine pages, this one has a **working in-browser editor** at
`/admin/discipleship` (ADMIN or PASTOR). Create, edit and delete courses, weeks and
lessons; changes appear on the public site immediately.

Two deliberate safety rules:

- **Lesson URLs never change.** The slug is fixed when a lesson is created, so editing a
  title does not break saved links or anyone's progress.
- **Courses with enrolled people are retired, not deleted.** Deleting a course someone is
  part-way through would erase their work, so it is hidden instead.

Progress is stored by **lesson slug, not id** — meaning `npm run db:seed` can be re-run to
refresh the wording without orphaning anybody's six weeks.

To edit the course as code instead, edit `content/discipleship.ts` and run
`npm run db:seed`.

---

## ✏️ Editing the content — start here

**Everything is editable from `/admin`, in the browser, without a developer.**

| Screen | What you can change |
| --- | --- |
| `/admin/settings` | Ministry name, tagline, description, email, phone, address, service times, social links |
| `/admin/pages` | About Us, Our Founders, What We Believe — Markdown with a live preview |
| `/admin/gospel` | The four gospel steps, the prayer, and what happens next |
| `/admin/discipleship` | Courses, weeks and lessons |
| `/admin/events` | Events, capacity, booking rules |
| `/admin/prayer` · `/admin/testimonies` · `/admin/chat` | Moderation |

Two things worth knowing:

- **Saving is instant.** Pages revalidate on save, so a change is live by the time you
  switch tabs. Ministry details clear the whole site's cache because the name and contact
  details appear in the header, the footer and every link preview.
- **Nothing is destructive.** Each editor has *Undo all my edits*, which deletes the
  database row so the wording this site was built with takes over again. It is a real
  undo, not a blank page.

The files below are now the **seed and the fallback** rather than the source of truth: the
site renders from them if the database is unreachable, and the admin screens win once a
row exists.

**All the placeholder text lives in one file: [`content/pages.ts`](content/pages.ts).**

Search that file for `[` — every `[SQUARE BRACKET]` marks a real detail only the
ministry can supply:

- `content/pages.ts` → `about` — founding year, town, how it started
- `content/pages.ts` → `founder` — **the founder's and his wife's names**, biographies,
  their personal messages
- `content/pages.ts` → `doctrine` — already complete; adjust wording to match your
  statement of faith

Ministry name, tagline, service times, phone, email, address and social links live in
[`lib/site.ts`](lib/site.ts).

The pages are written in **Markdown**: `## ` for a section heading (these also become
the “On this page” list), `### ` for a sub-heading, `- ` for bullets, `**bold**`, and
`> ` for a highlighted quote.

After editing, run `npm run db:seed` if you have a database connected — otherwise the
change shows up on the next `npm run dev`/`npm run build`.

### Photography

Six photographs in `public/images/photos/`, each stored twice: `-lg` (1200×800) for heroes
and feature cards, `-sm` (480×320) for tiles. Both were cropped at download time, and the
registry with alt text lives in [`lib/photos.ts`](lib/photos.ts).

They are plain `<img>` tags with fixed dimensions and `loading="lazy"`, **not**
`next/image` — the optimiser needs the `sharp` binary on the host, and this site should
deploy anywhere. Fixed dimensions also mean no layout shift. The whole home page, every
photo included, is about **560KB**.

`photoProps()` deliberately does **not** return `alt`. Every `<img>` has to write it out,
which forces a decision about whether that placement is decorative (`alt=""`) or carries
meaning — and keeps the `jsx-a11y/alt-text` rule able to see the attribute, which it
cannot do through a spread.

All six are from [Unsplash](https://unsplash.com/license): free for commercial use, no
permission needed, attribution not required. Photographers are credited in
[`public/images/photos/CREDITS.md`](public/images/photos/CREDITS.md) as a courtesy.

**Replace them with photographs of your own church.** Keep the same file names and sizes
and nothing else needs changing — see the CREDITS file for the steps, including the note
about getting consent before publishing a photo in which anybody is recognisable.

### Breakpoints: keep `2xl` and the container in step

`theme.screens.2xl` is **1600px**, not Tailwind's default 1536px, so it matches exactly
where `theme.container` grows to 1600px. When those two disagreed, every viewport between
1536 and 1599 let `2xl:` utilities claim room the container had not yet provided — which
put a horizontal scrollbar on every desktop page. If you change one, change the other.

### The ministry logo

The artwork lives at **`public/images/logo.jpg`** (640 × 640). To replace it, drop a new
file at that exact path and check it:

```bash
npm run check:logo
```

That one file drives everything: the header, the footer, the sign-in panel, the hero,
the browser tab icon, the "add to home screen" icon, and the preview image when someone
shares a link. All of them read [`lib/brand-assets.ts`](lib/brand-assets.ts), so there is
one path to change and no copies to keep in step.

Until the file exists the site falls back to a simplified drawn mark rather than a broken
image — which is why `npm run check:logo` exists. A missing file otherwise looks like a
styling bug instead of a missing file.

Three things the checker will tell you about:

- **Make it square.** Favicons and share previews letterbox anything else.
- **512px or larger.** The hero renders it at ~128px on a retina screen, so smaller
  sources look soft.
- **No spaces in the filename.** A space has to be percent-encoded in a URL and gets
  mishandled by enough tools to be worth avoiding. If the file it wants is missing, the
  checker lists what *is* in the folder so a near miss is obvious.

The printed logo has a white background, so on the navy hero and sign-in panel it is
given a white rounded card of its own (`<BrandMark onDark />`) rather than being dropped
on as a white square.

### Adding your own photos

1. Put image files in [`public/images/`](public/images/).
2. Reference them as `/images/your-file.jpg`.
3. The hero currently shows a designed panel rather than a photo. To use a real
   photograph, replace the marked block in
   [`components/home/hero.tsx`](components/home/hero.tsx) with a `next/image`
   `<Image>` — the comment in the file shows exactly where.

---

## Project structure

```
app/
  (public)/          Home, About, Founder, Doctrine, Salvation, Discipleship,
                     Prayer, Events, Sermons, Community
    legal/           Hub, plus /terms · /privacy · /community-guidelines
                     · /safeguarding · /accessibility
    salvation/       page · gospel · prayer · contact · complete
    discipleship/    page · [slug] · [slug]/week/[week] · [slug]/lesson/[lesson]
    prayer/          wall · submit · submitted · groups · groups/[slug]
                     · testimonies · testimonies/share · testimonies/thank-you
    events/          page · [slug] · [slug]/booked/[token]
    sermons/         page (search + series/speaker filters) · [slug] (+ ask this sermon)
    community/       hub · feed · encouragement · verse · challenge · worship
                     · growing (plans/fasts/challenges) · growing/[slug]
  (auth)/            Login, Register — focused split-screen layout
  (app)/             Dashboard, Admin — signed-in area, same chrome as the site
    community/       directory · members/[id] · profile · help · groups · care
    admin/           page · salvation · discipleship · prayer · testimonies
                     · events · chat · sermons · community · care · community-health
                     · calendar · announcements · pastors-word
                     · pages · settings · gospel
  api/
    auth/[...nextauth]/       NextAuth handler
    register/                 POST — creates a MEMBER account (age-gated)
    salvation/                start · update · contact · assign · decisions (GET/PATCH)
    discipleship/             courses · courses/[slug] · progress (GET/POST)
    discipleship/admin/       courses · weeks · lessons (POST/PATCH/DELETE)
    prayer/requests/          GET/POST · [id] (PATCH/DELETE) · [id]/pray · [id]/responses
    prayer/groups/            POST/PATCH/DELETE · [slug]/membership · [slug]/posts
    testimonies/              GET/POST · [id] (PATCH/DELETE) · [id]/like · [id]/comments
    events/                   GET/POST · [slug] · [slug]/register · [slug]/check-in
    chat/                     conversations · messages · attachments · stream (SSE)
    sermons/                  GET/POST · [slug] (GET/PATCH/DELETE) · [slug]/view · [slug]/ask
                              · series · youtube (GET/POST — import from the channel)
    community/                posts (GET/POST) · posts/[id] (GET/PATCH/DELETE)
                              · posts/[id]/like · /react · /comments · /report
                              · images/[id] · profile · directory · help · care
                              · initiatives · polls · verse
    calendar/                 GET (public) · PUT/DELETE (pastors) · [id]/image
    announcements/            GET/POST/DELETE · [id]/image (authenticated)
    pastors-word/             GET · PUT/DELETE (pastors)
    members/[id]/avatar       Member photos, signed-in members only
  layout.tsx         Fonts, metadata, skip link, session provider
  error.tsx  not-found.tsx  robots.ts  sitemap.ts

components/
  illustrations/     The thirteen drawn topic illustrations, light and dark tones
  home/              Hero, ServiceTimes, Mandate, QuickLinks, Teasers,
                     Invitation, BirthdayCelebration, ChurchCalendar,
                     AnnouncementBoard, PastorsWord
  layout/            Header (+ mobile drawer), Footer, Brand, AuthNav, SiteShell
  auth/              RegisterForm, LoginForm, PasswordInput
  salvation/         JourneyShell, JourneySteps, JourneyButton, ContactForm
  discipleship/      ProgressBar, ProgressPanel, LessonComplete
  prayer/            PrayerTabs, RequestCard, RequestForm, PrayButton,
                     JoinGroupButton, GroupBoard, TestimonyCard, TestimonyForm
  events/            EventCard, EventForm, RegistrationForm, EventPass, CheckInScanner
  chat/              ConversationList, MessageList, Composer, useMessageStream
  sermons/           SermonCard, SermonPlayer, SermonForm, SeriesManager,
                     YouTubeImport
  community/         Feed, Composer, PostCard, CommentThread, ModerationRow
  admin/             DecisionRow, CourseManager, PrayerRow, TestimonyRow,
                     PageEditor, SettingsEditor, GospelEditor, ChatAdmin,
                     CalendarManager, AnnouncementManager, WordEditor
  ui/                Button, Card, Input, Label, Checkbox, Alert, Field
  markdown.tsx       Markdown renderer + heading extraction
  content-page.tsx   Shared About/Founder/Doctrine template
  legal-page.tsx     Shared terms/privacy/safeguarding template + placeholders

content/
  pages.ts           About / Founder / Doctrine copy
  gospel.ts          Gospel steps, prayer of commitment, next steps
  discipleship.ts    The six-week First Steps curriculum
  sermons.ts         Starter sermons, series and opening community posts
  pastors-words.ts   Twenty-one bundled words for the daily rotation
  legal.ts           Terms, privacy, guidelines, safeguarding, accessibility

lib/
  site.ts            Name, slogan (`aka`), mandate, nav, contact, service times
                     (Sunday, Wednesday and Saturday — ranges, not start times),
                     and the ministry's YouTube and Facebook accounts
  prisma.ts          Optional Prisma client (null without DATABASE_URL)
  page-content.ts    Database-first page content with bundled fallback
  discipleship.ts    Database-first curriculum + progress helpers
  prayer.ts          Prayer visibility rules — the only place they live
  community.ts       Community visibility rules — the only place they live
                     (server-only; display helpers live in community-display.ts)
  community-display.ts  Labels, FeedPost shape, timeAgo — safe on both sides
  community-labels.ts   Initiative/help/care/group wording — safe on both sides
  channels.ts        Loads one channel board (wall, verse, challenge, worship)
  profiles.ts        Member profiles, the directory, and redactProfile()
  initiatives.ts     Reading plans, fasts, challenges; help and group queries
  reactions.ts       The five reactions and the channel map — client-safe
  badges.ts          Badges, computed from existing counters rather than stored
  church-year.ts     Easter and the fifteen observances, computed (client-safe)
  calendar-art.ts    The photograph for each day in the Christian year
  home-content.ts    Pastor's word, calendar, announcements and birthdays
  uploads.ts         Shared image accept/serve for calendar and announcements
  metrics.ts         Engagement heatmap, quiet members, popular content
  sermons.ts         Sermon query shapes, filters, formatting
  embed.ts           Pasted YouTube/Vimeo/Facebook links → safe embed URLs
                     (client-safe)
  youtube.ts         Channel handle → id → the public uploads feed. No API key
  ai.ts              Optional free AI (Gemini/Groq/Ollama) + the PublicText guard
  sermon-qa.ts       BM25 retrieval over a transcript; grounds any AI answer
  events.ts          Seat maths, waitlist promotion, registration windows
  chat.ts            Conversation access checks and settings
  chat-watch.ts      One shared per-conversation watcher behind every SSE stream
  follow-up.ts       Least-loaded round-robin assignment
  notify.ts          Every outbound email/SMS funnels through here
  guest-session.ts   Anonymous browser id for prayer counts and guest limits
  permissions.ts     Role capability checks (single source of truth)
  auth.ts            NextAuth options + requireUser / requireAdmin / role guards
  two-factor.ts      TOTP enrolment, verification and recovery codes
  storage.ts         Pluggable upload driver + magic-byte type sniffing
  api-guards.ts      Shared auth + error plumbing for admin API routes
  salvation-session.ts  httpOnly cookie holding the anonymous decision id
  validations.ts     Zod schemas shared by forms and API
  rate-limit.ts      In-memory limiter for public write endpoints
  slug.ts            Slug generation with collision handling

prisma/
  schema.prisma      PageContent, User, Role, SalvationDecision, FollowUp,
                     DiscipleshipCourse/Week/Lesson/Progress, Prayer*, Testimony*,
                     Ministry, SmallGroup, Event*, Conversation/Message/Attachment,
                     SiteSetting (name + aka + youtubeChannelId), GospelContent,
                     Sermon/SermonSeries/SermonView,
                     Post/PostComment/PostReaction/PostReport, MemberProfile,
                     Household, HelpPost, CareRequest, Initiative(+Day/Member/Log),
                     DailyVerse, Poll(+Option/Vote), CalendarDate, Announcement,
                     PastorsWord
  seed.ts            Seeds pages, curriculum, ministries, sermons, groups of every
                     kind, a reading plan, a fast, a challenge, a fortnight of
                     verses, the opening community posts, a first pair of
                     announcements, and the first admin. Calendar artwork is
                     bundled rather than seeded — see lib/calendar-art.ts
middleware.ts        Route guard for /dashboard and /admin — keeps a hand-written
                     copy of the admin role list, because it runs on the edge and
                     cannot import Prisma's `Role`. Mirrors canAccessAdminArea().
```

---

## How content resolves

```
Request /about
   └── DATABASE_URL set?  ──no──► render content/pages.ts        (bundled)
          │yes
          ├── row found & published? ──no──► render content/pages.ts
          └── yes ─────────────────────────► render database copy
   (any database error also falls back to the bundled copy)
```

The public site cannot be taken down by a database problem. Pages revalidate hourly,
so an admin edit appears within the hour without a redeploy.

---

## Accessibility & performance

Built to the Phase One principles:

- **Touch targets** — every interactive element is at least 48px tall; inputs are 56px.
- **Contrast** — the palette in [`styles/globals.css`](styles/globals.css) clears WCAG AA
  at body size in both light and dark themes.
- **Keyboard** — a “Skip to main content” link is the first tab stop, focus rings are
  visible everywhere, and the mobile drawer closes on `Escape` and returns focus.
- **Screen readers** — landmarks, `aria-current="page"`, labelled sections, decorative
  graphics hidden, live regions for form errors.
- **Language** — plain English throughout; “Coming soon” features are labelled honestly
  instead of being dead links.
- **Motion** — every animation is disabled under `prefers-reduced-motion`.
- **Speed** — public pages are statically prerendered at ~96 kB First Load JS, fonts are
  self-hosted via `next/font`, and icon imports are tree-shaken.

Dark mode follows the `.dark` class on `<html>`; the tokens are already defined, so a
theme toggle is a small Phase Two addition.

---

## Security notes

- Passwords are hashed with bcrypt (cost 12) and are never returned by any endpoint.
- Sign-in failures give one generic message, so the form cannot be used to discover
  which emails are registered.
- The anonymous decision id lives in an **httpOnly cookie**, never in the request body.
  If it travelled in the body, anyone could POST an arbitrary id and overwrite someone
  else's decision record.
- `/api/register` (8 per IP / 15 min) and `/api/salvation/contact` (10 per IP / hour) are
  rate-limited in memory — move to Redis when running more than one instance.
- `FOLLOW_UP_TEAM` members can only read and update decisions assigned to them. This is
  enforced in the API route, not just hidden in the UI.
- Markdown is rendered **without** `rehype-raw`, so page content cannot inject scripts.
- A member's **home address** is off by default and has its own switch, separate from the
  one covering phone and email. It is the field that tells a stranger where somebody
  sleeps, and it is never included in the directory listing.
- Leaving the member directory makes the profile page **404**, not merely unlisted — a
  switch that hid you from the list but left the URL answering would be worth very little.
- Announcement designs on non-public notices are served through an authenticated route
  under a random storage key, so the file is neither guessable nor readable by somebody
  outside the department it was posted to.
- `/dashboard` and `/admin` are guarded twice: in `middleware.ts` and again in the
  server components via `requireUser()` / `requireAdmin()`.
- Security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`) are set in [`next.config.mjs`](next.config.mjs).

Set a fresh `NEXTAUTH_SECRET` in production — the generated one in `.env` is for local
development only.

---

## Still to come

| Part | Status | What it needs first |
| --- | --- | --- |
| **2A Sermon Centre** | ✅ Built | — including "Ask this sermon", which works with no AI at all and upgrades on a free key |
| **2B Salvation + Discipleship** | ✅ Built | — |
| **3A Prayer Portal** | ✅ Built | — |
| **3B Community** | ✅ Built | — |
| **3.5 Fuller community** | ✅ Built | — (sentiment analysis deliberately not built — see the community section) |
| **4A Events** | ✅ Built | — |
| **4B In-app chat** | ✅ Built | Database-polling transport on Neon, by your decision — see the chat section for the latency and compute-cost trade-off. |
| **4C Online giving** | Blocked | A live Stripe account and API keys. Half-built payment flows are worse than none, so nothing here is stubbed. |
| **4D Volunteer management** | Ready to build | Nothing — the `Ministry` model it needs exists and is seeded. |
| **4E Admin analytics** | Ready to build | Nothing — prayer, discipleship, salvation, event, sermon and community data are all in place to report on. |
| **4F Push notifications** | Partly blocked | In-app and email work through `lib/notify.ts` today. Web push needs VAPID keys or a OneSignal account. |

Still outstanding:

- **Ministry and small-group management UI.** The models, memberships and seed data
  exist — events, sermons and community posts can all be scoped to a ministry — but there
  is no admin screen to create or edit them yet. That belongs with 4D. Until it lands,
  memberships are set in the database, which is what gates `MINISTRY` and `SMALL_GROUP`
  post visibility.
- **Notifications** — every outbound message funnels through `lib/notify.ts` and
  `notifyAssignment()` in `lib/follow-up.ts`. Both log today; wire Resend/Twilio in
  there and nothing else changes. Two rules hold: they never throw (losing an email must
  not roll back a prayer request), and they never include the body of a PRIVATE request.
- **Mentor assignment UI** — `DiscipleshipProgress.mentorId` and the `LEADER` role exist
  in the schema; nothing writes to them yet.
- A light/dark theme toggle (the tokens are already defined).
