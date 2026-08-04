import 'server-only'

/**
 * Every outbound notification in the platform funnels through here.
 *
 * TODO(phase 4): wire to Resend (email) and Twilio (SMS). Keeping one seam
 * means the transport can be swapped without touching a single feature.
 *
 * Two rules hold for every function below:
 *   1. They never throw. A notification failure must not roll back the thing
 *      that triggered it — losing an email is bad, losing a prayer request is
 *      much worse.
 *   2. They never include the body of a PRIVATE prayer request. Someone chose
 *      "only the prayer team sees this"; an email digest is not the prayer team.
 */

type Recipient = { name: string | null; email: string | null }

async function send(channel: string, to: Recipient, subject: string, detail: string) {
  if (!to.email) return
  console.info(`[notify:${channel}] → ${to.email} · ${subject} · ${detail}`)
}

/** Confirms a prayer request was received. */
export async function notifyPrayerReceived(to: Recipient, requestTitle: string) {
  await send('prayer-received', to, 'We are praying with you', requestTitle)
}

/** Someone prayed for, or encouraged, a request. Respects the opt-out. */
export async function notifyPrayerActivity(
  to: Recipient,
  input: { requestTitle: string; kind: 'prayed' | 'encouraged'; notifyOnResponse: boolean },
) {
  if (!input.notifyOnResponse) return
  await send(
    'prayer-activity',
    to,
    input.kind === 'prayed' ? 'Someone prayed for you' : 'Someone left you an encouragement',
    input.requestTitle,
  )
}

/**
 * Alerts the intercessor rota to a HIGH or URGENT request.
 * Deliberately carries only the title and urgency — never the content.
 */
export async function notifyPrayerTeamUrgent(
  team: Recipient[],
  input: { requestTitle: string; urgency: string; isPrivate: boolean },
) {
  const label = input.isPrivate ? '(private request)' : input.requestTitle
  await Promise.all(
    team.map((member) => send('prayer-urgent', member, `${input.urgency} prayer need`, label)),
  )
}

/** Tells a group leader that a request was shared into their group. */
export async function notifyGroupLeader(to: Recipient, input: { groupName: string; requestTitle: string }) {
  await send('prayer-group', to, `New request in ${input.groupName}`, input.requestTitle)
}

/** Confirms a testimony was submitted and is awaiting approval. */
export async function notifyTestimonySubmitted(to: Recipient, title: string) {
  await send('testimony-submitted', to, 'Thank you for sharing your story', title)
}

/** Tells the author their testimony is now live. */
export async function notifyTestimonyApproved(to: Recipient, title: string) {
  await send('testimony-approved', to, 'Your testimony is now published', title)
}

// --- Events ----------------------------------------------------------------

const whenever = (date: Date) =>
  new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeStyle: 'short' }).format(date)

/** Booking confirmation. Carries the desk code so it works without the QR. */
export async function notifyEventRegistered(
  to: Recipient,
  input: { title: string; startsAt: Date; code: string; waitlisted: boolean },
) {
  await send(
    input.waitlisted ? 'event-waitlisted' : 'event-registered',
    to,
    input.waitlisted ? `You are on the waitlist for ${input.title}` : `You are booked for ${input.title}`,
    `${whenever(input.startsAt)} · code ${input.code}`,
  )
}

/** A seat opened up and the waitlist moved. */
export async function notifyWaitlistPromoted(
  to: Recipient,
  input: { title: string; startsAt: Date; code: string },
) {
  await send(
    'event-promoted',
    to,
    `A place has opened up for ${input.title}`,
    `${whenever(input.startsAt)} · code ${input.code}`,
  )
}

export async function notifyEventUpdated(
  recipients: Recipient[],
  input: { title: string; startsAt: Date },
) {
  await Promise.all(
    recipients.map((to) =>
      send('event-updated', to, `${input.title} has moved`, whenever(input.startsAt)),
    ),
  )
}

export async function notifyEventCancelled(
  recipients: Recipient[],
  input: { title: string; startsAt: Date },
) {
  await Promise.all(
    recipients.map((to) =>
      send('event-cancelled', to, `${input.title} has been cancelled`, whenever(input.startsAt)),
    ),
  )
}

/**
 * TODO(phase 4F): the plan wants reminders 2 days and 2 hours out. That needs a
 * scheduler (a cron route hitting this), which is not wired yet — this is the
 * function it will call.
 */
export async function notifyEventReminder(
  recipients: Recipient[],
  input: { title: string; startsAt: Date },
) {
  await Promise.all(
    recipients.map((to) =>
      send('event-reminder', to, `Coming up: ${input.title}`, whenever(input.startsAt)),
    ),
  )
}
