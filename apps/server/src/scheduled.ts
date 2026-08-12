import { sendActionEmail } from "./lib/email"
import {
  DRAFT_NUDGE_EMAIL_TYPE,
  findDraftNudgeCandidates,
  findReengagementCandidates,
  markEmailSent,
  REENGAGEMENT_EMAIL_TYPE,
} from "./lib/reengagement"

const APP_URL = "https://openwrite.iliareingold.com"

// Deliberately impersonal copy: user names are free-form text and the email
// template interpolates the body into HTML unescaped. Word counts are numbers
// and safe to include.
const SIGNUP_NUDGE = {
  subject: "Your first chapter is still waiting",
  body: "You signed up for OpenWrite a few days ago, but your story hasn't started yet. Open your project and the editor will set up Chapter 1 for you — all that's missing is the first sentence.",
  actionLabel: "Start writing",
  actionUrl: `${APP_URL}/dashboard`,
}

function draftNudgeBody(totalWords: number): string {
  return `You've written ${totalWords.toLocaleString("en-US")} words on OpenWrite, and your story is right where you left it. The next sentence is always the hardest one — come write it.`
}

interface NudgeTarget {
  body: string
  email: string
  id: string
  subject: string
  type: string
}

async function sendNudge(target: NudgeTarget, now: Date): Promise<void> {
  // Mark first: a duplicate nudge reads as spam, a missed one costs nothing.
  await markEmailSent(target.id, target.type, now)
  await sendActionEmail({
    to: target.email,
    subject: target.subject,
    body: target.body,
    actionLabel: target.type === DRAFT_NUDGE_EMAIL_TYPE ? "Continue writing" : "Start writing",
    actionUrl: SIGNUP_NUDGE.actionUrl,
  })
}

/** Daily sweep: nudge signups who never wrote, and writers who went idle. */
export async function runScheduledJobs(now: Date): Promise<void> {
  const [signupCandidates, draftCandidates] = await Promise.all([
    findReengagementCandidates(now),
    findDraftNudgeCandidates(now),
  ])

  const targets: NudgeTarget[] = [
    ...signupCandidates.map((candidate) => ({
      id: candidate.id,
      email: candidate.email,
      type: REENGAGEMENT_EMAIL_TYPE,
      subject: SIGNUP_NUDGE.subject,
      body: SIGNUP_NUDGE.body,
    })),
    ...draftCandidates.map((candidate) => ({
      id: candidate.id,
      email: candidate.email,
      type: DRAFT_NUDGE_EMAIL_TYPE,
      subject: "Your draft is waiting",
      body: draftNudgeBody(candidate.totalWords),
    })),
  ]

  if (targets.length === 0) {
    return
  }

  const results = await Promise.allSettled(targets.map((target) => sendNudge(target, now)))
  for (const [index, result] of results.entries()) {
    if (result.status === "rejected") {
      console.error(
        `${targets[index].type} nudge failed for user ${targets[index].id}:`,
        result.reason
      )
    }
  }
}
