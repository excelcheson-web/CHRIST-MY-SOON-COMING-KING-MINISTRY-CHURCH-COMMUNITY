/**
 * The platform's information documents: terms, privacy, community guidelines,
 * safeguarding and accessibility.
 *
 * ## These are not legal advice
 *
 * They were written to describe **what this platform actually does**, honestly
 * and in plain English, which is the hardest and most useful part of the job
 * and the part a downloaded template always gets wrong. They are not a
 * substitute for review by somebody qualified in the jurisdiction the ministry
 * operates in. Have a lawyer read them before the site goes public, and check
 * anything your country requires that is not here — data-protection
 * registration and children's-ministry law both vary enormously.
 *
 * ## Why they live in code rather than the admin
 *
 * Deliberate. A legal document should change when somebody decides it should
 * change, with a record of what it said before — which a git history gives and
 * a textarea does not. The `updated` date below is shown to readers, so it has
 * to be edited in the same commit as the text.
 *
 * The ministry's *details* — name, email, phone, address — are not written into
 * the prose. They are placeholders, filled at render time from the live site
 * settings, so changing the church's email address in the admin does not leave
 * a stale one buried in the privacy policy.
 *
 * ## Placeholders
 *
 * `{{name}}` `{{shortName}}` `{{legalName}}` `{{email}}` `{{phone}}`
 * `{{address}}` `{{site}}`
 */

export type LegalSlug =
  | 'terms'
  | 'privacy'
  | 'community-guidelines'
  | 'safeguarding'
  | 'accessibility'

export type LegalDoc = {
  slug: LegalSlug
  /** The page title and the link text. */
  title: string
  /** One line. Used on the hub cards and as the meta description. */
  summary: string
  /** ISO date. Shown to readers — edit it whenever the text below changes. */
  updated: string
  /** Markdown. `##` headings become the contents list. */
  body: string
}

const terms: LegalDoc = {
  slug: 'terms',
  title: 'Terms and Conditions',
  summary: 'What you can expect from this platform, and what we ask of you.',
  updated: '2026-08-04',
  body: `These terms cover your use of {{site}}, the online home of {{name}} ({{shortName}}).
They are written in plain English on purpose. If any part is unclear, email
[{{email}}](mailto:{{email}}) and a person will explain it.

By creating an account or using this site you accept these terms. If you do not accept
them, please do not use the site.

## Who runs this platform

{{legalName}} runs it, as part of the ministry's work. It is not a commercial service, and
it is not run for profit. There is nothing to buy here and no advertising.

## Who can have an account

- You must be **13 or older** to create an account. The registration form asks for your
  date of birth and will refuse anyone younger. This is not us being unwelcoming — under-13
  accounts carry legal duties we cannot properly discharge online. Children are welcome in
  the building, in children's ministry, and at everything we do in person.
- If you are **13 to 17**, we ask that a parent or guardian knows about and agrees to your
  account before you create one.
- One account per person. Do not share your password, and do not use somebody else's
  account.
- Give a real name. This is a church family, not an anonymous forum. Where anonymity is
  genuinely needed — a prayer request, a request for practical help — the platform offers it
  as a specific feature rather than asking you to lie about who you are.

## Your account and its security

You are responsible for what happens under your account. Choose a password you do not use
anywhere else, and turn on two-factor authentication from **Account → Security** — it takes
about a minute and it is the single most useful thing you can do to protect a login.

Tell us immediately at [{{email}}](mailto:{{email}}) if you think somebody else has got
into your account.

## What you may post

You keep ownership of everything you write, photograph or upload. By posting it here you
give the ministry permission to display it on this platform to whoever the visibility
setting allows — nothing more. We do not sell it, license it to anyone, or use it in
advertising.

You confirm that what you post is yours to post: your own words, your own photographs, or
something you have permission to share.

## What you may not post

Not a long list, and none of it will surprise you:

- Anything unlawful, or that encourages something unlawful.
- Abuse, harassment, threats, or contempt directed at a person or a group — including on
  grounds of race, tribe, nationality, sex, disability or age.
- Sexual content, or anything sexualising a child in any way whatsoever.
- Somebody else's private information: their address, their phone number, their health, a
  photograph of them, or something they told you in confidence.
- Advertising, selling, multi-level marketing schemes, or fundraising that is not the
  ministry's own.
- Spam, or software written to break, overload or scrape this site.
- Impersonating a pastor, a leader, or any other member.

The [Community Guidelines](/community-guidelines) go into more detail about how we talk to
one another here.

## Moderation, and what happens when something is reported

Every post, comment and chat message has a **Report** control. Reports go to moderators,
who can hide a post, remove it, or ban an account.

- A chat ban is a community ban. Same person, same behaviour, one switch.
- We may remove content without warning where it is unlawful or puts somebody at risk.
- If your account is banned you can email [{{email}}](mailto:{{email}}) and ask a pastor to
  review it. A person will read it.

## Prayer requests, testimonies and pastoral conversations

Please read this part carefully, because it is the part people most often assume.

- **Pastoral care is not professional care.** Pastors and leaders here are not doctors,
  therapists, lawyers or financial advisers, and nothing said on this platform is medical,
  legal or financial advice.
- **This platform is not for emergencies.** If someone is in danger, or you are thinking of
  harming yourself, contact your local emergency services or a crisis line now. A prayer
  request may not be read for hours.
- A prayer request marked private is visible to pastors and the prayer team, not to the
  congregation. A request submitted anonymously does not show your name to other members —
  but the ministry can still see who submitted it, because a request nobody can follow up is
  not care.
- Testimonies are reviewed before they appear. That is not censorship: it is so that a
  testimony naming a third party, or a medical claim that could be read as advice, can be
  talked through first.

## Requests for practical help

The care and benevolence features exist to connect need with help inside the church family.
They are not a guarantee of assistance, and the ministry decides what it is able to do.
Requests are visible to pastors and administrators only.

## Events and bookings

Booking a seat is free and can be cancelled. A party of five takes five seats — please do
not book more than you need, because somebody else cannot then come. If you cannot make it,
cancel so the waitlist can move.

## "Ask this sermon"

Some sermons offer an AI-assisted question box. Read [how it handles your
words](/privacy#ask-this-sermon-and-what-leaves-this-server) in the privacy policy before
you use it. In short: your question and the published sermon transcript may be sent to an
external AI provider, and **nothing else on this platform ever is**.

Answers are generated from the sermon transcript and can be wrong. Treat them as a study
aid, not as the preacher speaking.

## Availability

We try to keep the site up and the information right. We do not promise either. Services
may be interrupted for maintenance, by our hosting providers, or by problems outside our
control. Nothing here is guaranteed to be available at any particular moment.

## Closing your account

You can ask us to close your account and delete your data at any time — see [Your rights
over your data](/privacy#your-rights-over-your-data). Some records are kept where the law
requires it, or where deleting them would erase somebody else's part of a conversation.

## Changes to these terms

We will update this page and change the date at the top when they change. If a change
materially affects your rights, we will say so on the site rather than letting you discover
it.

## Getting in touch

Email [{{email}}](mailto:{{email}}), call {{phone}}, or speak to a leader in person.

{{address}}`,
}

const privacy: LegalDoc = {
  slug: 'privacy',
  title: 'Privacy Policy',
  summary: 'What this platform knows about you, who can see it, and how to get it deleted.',
  updated: '2026-08-04',
  body: `{{legalName}} looks after your details. This policy says exactly what the platform
collects, who can see each part, how long it is kept, and what you can ask us to do about
it.

**We do not sell your data. We do not share it with advertisers. There is no advertising on
this site and no third-party tracking.**

## What we collect

### To create your account — required

Your name, email address, date of birth, and a password. The password is hashed with bcrypt
before it is stored: nobody at the ministry can read it, including administrators.

Your date of birth is required for one reason — to check you are old enough to have an
account. It is not shown to anybody unless you turn on your birthday (see below).

### Everything else — optional

A photograph, phone number, home address, neighbourhood, profession, the department you
would like to join, a short bio, your spiritual gifts, what you are happy to help with, and
your interests. **All of it is optional, at registration and afterwards.** You can add,
change or remove any of it from your profile at any time.

### What you create as you use the site

Prayer requests, testimonies, community posts and comments, chat messages, event bookings,
care and benevolence requests, discipleship progress, and which sermons you have opened.

### Collected automatically

- A **session cookie** so you stay signed in. Strictly necessary; the site cannot work
  without it.
- An **anonymous browser id** so a visitor who is not signed in can still be counted once
  when they tap "I prayed for this", and so guest submissions can be rate-limited. It is a
  random value and is not linked to a person.
- A short-lived **httpOnly cookie** holding the id of an anonymous salvation decision, so
  you can return to it. It is httpOnly so that it cannot be read or forged by a script.
- Ordinary server logs, including IP addresses, kept briefly for security and to stop abuse.

**There are no analytics or advertising cookies on this site.**

## Who can see what

Not every detail is equally safe to publish, so they do not share one switch.

| What | Default | Who can see it |
| --- | --- | --- |
| Name and photo | Shown | Signed-in members |
| Profession, neighbourhood | Shown | Signed-in members |
| Birthday | **Hidden** | Only if you switch it on |
| Phone and email | **Hidden** | Only if you switch it on |
| **Home address** | **Hidden** | Only if you switch it on — its own separate switch |
| Care and benevolence requests | Private | Pastors and administrators only |
| Private prayer requests | Private | Pastors and the prayer team |
| Direct messages | Private | You and the person you are talking to |

Your **home address** is the most guarded field here, because it is the one that tells a
stranger where you sleep. It is off by default, it never appears in the member directory,
and turning on "show my contact details" does **not** turn it on.

Leaving the member directory hides you from the member list **and** makes your profile page
return "not found" for everybody else. A switch that hid you from the list but left your
page answering would be worth very little.

Birthdays are opt-in. The home page celebrates a member on their birthday with their photo
and their name, to signed-in members only, and only if they ticked the box.

## Ask this sermon — and what leaves this server

Some sermons offer an AI question box. If you use it, your question and the **published
sermon transcript** are sent to an external AI provider.

**Nothing else on this platform is ever sent to an external AI provider.** Not prayer
requests. Not chat messages. Not care requests. Not member profiles. Not community posts.
This is not a policy we are asking you to trust — it is enforced by the type system in the
code, so that a future change which tried to send anything else would fail to compile.

We say this plainly because the free tiers of these providers are explicit that submitted
content may be used to improve their products and that **human reviewers may read it**. A
published sermon is already public, so sending it costs nothing. A prayer request is not,
and never goes.

If a sermon has no AI provider configured, the question box answers from the transcript
alone and nothing leaves this server at all.

## Where your data is stored

In a PostgreSQL database and in file storage operated by the ministry's hosting providers,
which may be in a different country to you. Uploaded files are stored under random names,
and files attached to anything non-public are served through a route that checks you are
allowed to see them first.

## How long we keep it

- **Your account and profile** — until you ask us to delete it.
- **Chat messages** — deleted automatically after the retention period set by the ministry.
- **Files uploaded but never sent** — deleted after a day. The file goes before the
  database record, deliberately: a leftover record is untidy, a leftover file is a privacy
  problem.
- **Prayer requests, testimonies and posts** — until you or a moderator remove them.
- **Server logs** — a short period, for security.

## Your rights over your data

Depending on where you live, you may have the right to:

- **See** what we hold about you.
- **Correct** anything wrong — most of it you can edit yourself from your profile.
- **Delete** your account and your data.
- **Take a copy** of what you have given us.
- **Object** to a particular use, or withdraw consent you gave earlier.

Email [{{email}}](mailto:{{email}}) and we will respond as quickly as we can. We may ask
you to confirm who you are first — otherwise the right to see your data becomes a way for
somebody else to read it.

Some things cannot be deleted on request: records the law requires us to keep, and
somebody else's side of a conversation you were part of.

## Children

Under-13s cannot create accounts. If you believe a child under 13 has an account here, tell
us at [{{email}}](mailto:{{email}}) and we will remove it.

For members aged 13 to 17 we ask that a parent or guardian knows about the account. See
[Safeguarding](/safeguarding) for how the ministry protects children and vulnerable adults.

## Photographs of people

A photograph of a recognisable person is that person's data as much as yours. Do not upload
one without their agreement — and never a photograph of a child who is not yours without a
parent's written permission.

## Security

Passwords are hashed with bcrypt. Two-factor authentication is available to every account
and is strongly encouraged for anyone with a leadership role. Administrative pages are
guarded twice over. Sign-in failures give one generic message, so the form cannot be used
to work out which email addresses are registered.

No system is perfectly secure. If you find a vulnerability, please tell us privately at
[{{email}}](mailto:{{email}}) before telling anyone else.

## Changes to this policy

We will update this page and change the date at the top. If a change materially affects
you, we will say so on the site.

## Contact

[{{email}}](mailto:{{email}}) · {{phone}}

{{address}}`,
}

const guidelines: LegalDoc = {
  slug: 'community-guidelines',
  title: 'Community Guidelines',
  summary: 'How we talk to one another here — and what happens when somebody does not.',
  updated: '2026-08-04',
  body: `The community section of {{name}} is a church family talking to one another. It
works when people are kind, and it stops working the moment they are not.

These are not rules invented to catch people out. They are what a healthy church looks like,
written down.

## The short version

Speak to people here the way you would speak to them if they were standing in front of you
on Sunday morning. That single sentence covers almost everything below.

## Be kind, especially when you disagree

You will disagree with people in this family. Disagree with what someone said, not with who
they are. No name-calling, no mockery, no pile-ons, and no going quiet on someone in a way
that makes a point.

If a conversation is getting heated, take it out of the feed. A private message, a phone
call, or a cup of coffee has resolved a thousand arguments that a comment thread only made
worse.

## Guard what people tell you

The single fastest way to kill trust in a church is for something private to travel.

- Do not repeat what somebody shared in a small group, in a prayer request, or in a message.
- Do not post another person's phone number, address, health situation or family
  circumstances — not even to ask people to pray. Ask them first, every time.
- Do not post a photograph of somebody who has not agreed to it. Never a photograph of
  somebody else's child.

## Prayer requests are not gossip

"Please pray for X, who is going through Y" is gossip wearing a coat, unless X asked you to
post it. If someone tells you their trouble, ask what they want shared before you share
anything.

## Do not use the family as a marketplace

No advertising, no selling, no recruiting for schemes, no fundraising that is not the
ministry's own. The help board exists for genuine needs and genuine offers of help — please
do not turn it into a shop window.

## Correction is a pastor's job

If you believe someone is teaching something wrong, take it to a leader. Do not correct
doctrine in public comments. It rarely changes a mind and it always changes the room.

## Anonymity, where it is offered

Some parts of this platform let you post without your name — a prayer request, a request for
practical help, a support group. That exists for people carrying something they are not
ready to put a name to, and it is one of the most valuable things here.

Do not use it to say something you would not put your name to about another person. Posting
anonymously does not make you anonymous to the ministry.

## Reporting

Every post, comment and message has a **Report** control. Use it. It goes to moderators, not
to the person you reported, and the person you reported is not told who reported them.

You will see "thank you" whether or not the report was a duplicate. The report is on file
either way, and saying thank you is both true and kinder than an error message.

## What moderators can do

Hide a post, remove it, or ban an account. A chat ban is a community ban — same person, same
behaviour, one switch.

We aim to warn before we ban, but we will remove content immediately where it is unlawful,
where it puts a child at risk, or where somebody's private information has been posted.

If you have been banned and believe it was wrong, email [{{email}}](mailto:{{email}}). A
pastor will read it personally.

## If something is seriously wrong

If a post suggests somebody is in danger, or that a child is being harmed, do not only
report it in the app. Contact a pastor directly, and contact your local emergency services.
See [Safeguarding](/safeguarding).`,
}

const safeguarding: LegalDoc = {
  slug: 'safeguarding',
  title: 'Safeguarding',
  summary: 'How this ministry protects children and vulnerable adults, online and in person.',
  updated: '2026-08-04',
  body: `{{legalName}} is committed to the safety of every child, young person and
vulnerable adult who comes to us — in the building and on this platform.

Safeguarding is not a policy that sits in a drawer. It is everybody's business, including
yours, and it starts with knowing what to do when something worries you.

> **If a child or vulnerable adult is in immediate danger, contact your local emergency
> services first.** Then tell a pastor. Do not wait for the ministry to act before you call
> for help.

## Our commitment

- Every child and vulnerable adult is treated with respect and listened to.
- Anyone working with children or vulnerable adults is recruited carefully, checked as far
  as the law of our country allows, and does not work unsupervised until that is complete.
- Concerns are taken seriously, recorded, and acted on. Nobody who raises a concern in good
  faith will be treated badly for it — however it turns out.
- We cooperate fully with statutory authorities. Safeguarding is not something a church
  settles internally.

## Online, on this platform

The platform is built with a number of protections in place:

- **Under-13s cannot create accounts.** The registration form asks for a date of birth and
  refuses anyone younger.
- **13 to 17 requires a parent or guardian to know about and agree to the account.**
- Contact details, including home addresses, are **hidden by default** on every profile.
- Direct messaging can be limited, and any member can be reported or blocked.
- Every post, comment and message carries a **Report** control that reaches moderators.
- Photographs of recognisable children must not be uploaded without a parent's written
  permission. This applies to the ministry's own photography as much as to members'.

If you are a parent, you are welcome to ask a leader to sit down and walk you through
exactly what your child's account can see and do.

## In person

- Children are signed in and signed out of children's ministry by a known adult.
- Workers do not spend time alone and unobserved with a child.
- Any injury, allegation or concern is recorded and reported.
- Trips and events involving under-18s require written parental consent.

## What to do if you are worried about a child

1. **If they are in immediate danger, call your local emergency services.**
2. Tell a pastor or the safeguarding lead as soon as you can — the same day.
3. Write down what you saw or were told, in the words used, with the date and time. Do this
   while it is fresh.
4. Do not investigate it yourself. Do not question the child repeatedly. Do not confront the
   person you are worried about.
5. Do not discuss it with anyone who does not need to know. Not a spouse, not a small group,
   not a prayer chain.

## If a child tells you something

- Listen. Do not interrupt, and do not push for detail.
- Take it seriously, whatever it is and whoever it is about.
- Do not promise to keep it secret. You cannot, and saying you will breaks trust twice
  over. Tell them you have to tell someone whose job it is to keep them safe.
- Reassure them they were right to tell you.
- Write it down afterwards, and pass it on the same day.

## Vulnerable adults

The same care applies to any adult who may be at risk because of age, illness, disability,
isolation, or circumstance. Financial exploitation and coercive control are safeguarding
matters as much as physical harm, and both turn up in church life more often than anybody
expects.

## Who to contact

Speak to a pastor, or email [{{email}}](mailto:{{email}}) marking it **Safeguarding**.
Call {{phone}}.

{{address}}

> **A note for the ministry:** name your designated safeguarding lead and their direct
> contact details here, together with the statutory reporting body for your country. A
> safeguarding page that does not say who to ring is not finished.`,
}

const accessibility: LegalDoc = {
  slug: 'accessibility',
  title: 'Accessibility',
  summary: 'This site is built to be usable by everybody. Here is what that means in practice.',
  updated: '2026-08-04',
  body: `A church website that some of the church cannot use is not finished. This one was
built for people using screen readers, keyboards, magnification, and phones held in one hand
on a bus.

## What we have done

- **Every button and link is at least 48 pixels tall**, and form fields are 56. Nothing here
  needs a precise tap.
- **Colour contrast meets WCAG 2.1 AA** at body size, in both the light and dark themes.
- **Everything works from the keyboard.** "Skip to main content" is the first thing you
  reach with Tab, focus outlines are visible everywhere, and the mobile menu closes on
  Escape and puts focus back where it was.
- **Screen readers get real structure** — landmarks, headings in order, labelled sections,
  the current page marked, form errors announced, and decorative images hidden rather than
  read aloud.
- **Animation respects your settings.** If your device asks for reduced motion, every
  animation on this site — including the birthday confetti — stops.
- **Plain English throughout.** Features that are not built yet say so honestly instead of
  being dead links.
- **It is fast.** Pages are pre-rendered and fonts are served from this site, so it works on
  a slow connection and an old phone.

## Where we know it falls short

Being honest is more useful than claiming perfection:

- Video and audio sermons **do not yet have captions or transcripts** as standard. Where a
  transcript exists it is used to power the sermon question box, but not every sermon has
  one. This is the biggest gap on the site and we know it.
- Some content is written by members, and we cannot guarantee they described their
  photographs.
- The site has not yet been audited by an independent accessibility specialist.

## If something does not work for you

Please tell us — it is the fastest way anything here gets fixed. Email
[{{email}}](mailto:{{email}}), or call {{phone}} and describe what you were trying to do.

If you cannot use part of this site, we will find another way to get you what you need.
Ring us and a person will read it to you, take your prayer request over the phone, or book
your seat for you.

{{address}}`,
}

export const legalDocs: LegalDoc[] = [
  terms,
  privacy,
  guidelines,
  safeguarding,
  accessibility,
]

export function findLegalDoc(slug: string): LegalDoc | undefined {
  return legalDocs.find((doc) => doc.slug === slug)
}
