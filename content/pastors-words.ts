/**
 * The bundled rotation behind "The Pastor's Word Today".
 *
 * The brief was that this fills itself in but stays editable. So: a row in
 * `PastorsWord` for today wins; failing that one of these is chosen, keyed to
 * the date so it is the same all day for everybody and moves on tomorrow.
 *
 * The section can therefore never be empty, and writing one is a choice rather
 * than a daily obligation. There are enough here that a member would have to be
 * paying close attention over two months to notice a repeat.
 *
 * TODO(ministry): replace these with the pastor's own words as they are
 * preached. Everything here is deliberately short, warm and general — a real
 * word from a real pastor will always land harder.
 */

export type BundledWord = {
  title: string
  body: string
  reference?: string
}

export const bundledPastorsWords: BundledWord[] = [
  {
    title: 'You are not carrying it alone',
    body: 'Whatever you woke up with this morning, you are not the only one who knows about it. God is not waiting for you to sort yourself out before he draws near. Tell him about it plainly, the way you would tell a friend, and then let this church family carry some of it with you.',
    reference: 'Psalm 55:22',
  },
  {
    title: 'Start where you are',
    body: 'You do not need a better week before you can pray. You do not need to feel spiritual. Start with the four verses you can manage and the one honest sentence you can say. Small and real beats big and pretended, every time.',
    reference: 'Zechariah 4:10',
  },
  {
    title: 'Freedom is not a feeling',
    body: 'Some mornings you will feel free and some mornings you will not, and neither of those is the measure. What Christ did on the cross did not become less true because today is hard. Stand on what he did, not on how you feel about it.',
    reference: 'Galatians 5:1',
  },
  {
    title: 'He is not disappointed in you',
    body: 'That voice telling you God is tired of you has never once been the Holy Spirit. Conviction draws you closer; condemnation drives you away. Learn the difference, and come home.',
    reference: 'Romans 8:1',
  },
  {
    title: 'Do the next right thing',
    body: 'You do not have to see the whole road. Make the phone call. Say sorry. Turn up. Obedience is nearly always the next small thing rather than the grand gesture, and God has never once asked you to carry tomorrow today.',
    reference: 'Matthew 6:34',
  },
  {
    title: 'Somebody near you is struggling',
    body: 'They will not say so. They will say they are fine and change the subject. Ask twice this week. Sit with somebody who has gone quiet. That is not extra to the Christian life; it is a large part of it.',
    reference: 'Galatians 6:2',
  },
  {
    title: 'Pray before you plan',
    body: 'We are quick to plan and slow to pray, and then we wonder why we are tired. Give God the first ten minutes of the decision rather than the last ten. He is not a rubber stamp on a plan you already made.',
    reference: 'Proverbs 3:5–6',
  },
  {
    title: 'Forgive while it is still small',
    body: 'Offence is easier to put down on the first day than on the hundredth. You are not saying it did not matter. You are saying you will not be the one collecting on it any more. Hand the account to God and walk lighter.',
    reference: 'Ephesians 4:32',
  },
  {
    title: 'Your worship is not a performance',
    body: 'Nobody in this house is marking you. If you can only whisper it today, whisper it. If all you can do is stand there while everybody else sings, stand there. God is not grading the volume.',
    reference: 'John 4:23',
  },
  {
    title: 'He still heals',
    body: 'We pray for the sick because Jesus did, and because he has not changed. Ask. Keep asking. Take the medicine, see the doctor, and keep asking. Faith and wisdom have never been enemies.',
    reference: 'James 5:14–15',
  },
  {
    title: 'Guard what you feed on',
    body: 'You will become what you keep listening to. Notice what leaves you anxious, bitter or comparing, and turn it down. Give the same hours to something that builds you and watch what changes in a month.',
    reference: 'Philippians 4:8',
  },
  {
    title: 'Waiting is not wasted',
    body: 'God is doing something in the waiting that he could not do in the arrival. That does not make it comfortable and you are allowed to say so. But do not despise the season just because it is slow.',
    reference: 'Isaiah 40:31',
  },
  {
    title: 'Serve where you are',
    body: 'You are not waiting for a platform. The chairs need stacking, the children need teaching, and somebody needs a lift on Sunday. Greatness in this kingdom has always looked like a towel and a basin.',
    reference: 'Mark 10:43–45',
  },
  {
    title: 'Tell somebody',
    body: 'Whatever God has done for you, say it out loud to one person this week. Not a polished testimony — just the true version. Your ordinary story is somebody else’s way through.',
    reference: 'Revelation 12:11',
  },
  {
    title: 'Rest is obedience',
    body: 'You are not more spiritual for being exhausted. God built rest into the week before there was any sin to atone for. Sleep, eat properly, and stop apologising for having a body.',
    reference: 'Mark 6:31',
  },
  {
    title: 'He is coming back',
    body: 'It is our name and it is our hope. Live this week as though he might come on Friday, and plan as though you have forty years. Both are true, and holding both is what a Christian life actually looks like.',
    reference: 'Revelation 22:20',
  },
  {
    title: 'Stop rehearsing the old story',
    body: 'You have told yourself the version where you always fail so many times that you believe it is prophecy. It is not. It is a memory, and Christ has already dealt with it. Put it down.',
    reference: '2 Corinthians 5:17',
  },
  {
    title: 'Give without keeping score',
    body: 'Help somebody this week who cannot repay you and will probably not thank you. That is where the real thing lives. If nobody ever finds out, it still counted.',
    reference: 'Matthew 6:3–4',
  },
  {
    title: 'Bring the children',
    body: 'They are not the church of tomorrow. They are part of this church today, and what they see us do will outlast anything we say. Let them be loud. Let them belong.',
    reference: 'Matthew 19:14',
  },
  {
    title: 'Make room for the Spirit',
    body: 'We would rather wait on him than run a tidy service he was never invited to. Leave space in your own day too — a few minutes with nothing scheduled, so there is room to hear something.',
    reference: 'Acts 2:17',
  },
  {
    title: 'Honesty is the beginning of healing',
    body: 'Nothing gets healed while it is still hidden. Tell one safe person the true thing. Deliverance nearly always starts with somebody finally saying it out loud.',
    reference: 'James 5:16',
  },
]
