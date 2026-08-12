import { and, eq, exists, gt, gte, lte, notExists } from "drizzle-orm"
import { db } from "../db"
import { chapter, project, sentEmail, user, work } from "../db/schema"

export const REENGAGEMENT_EMAIL_TYPE = "reengagement_nudge"
export const DRAFT_NUDGE_EMAIL_TYPE = "draft_nudge"

// Wait long enough that the signup momentum is truly gone, but not so long
// the account feels stale. The upper bound also keeps the cron from blasting
// the historical backlog of inactive accounts when it first ships.
const MIN_ACCOUNT_AGE_DAYS = 3
const MAX_ACCOUNT_AGE_DAYS = 21

// Safety cap per daily run; anyone over the cap is picked up the next day.
export const MAX_EMAILS_PER_RUN = 25

const DAY_MS = 24 * 60 * 60 * 1000

export interface ReengagementCandidate {
  email: string
  id: string
  name: string
}

/**
 * Verified users who signed up 3–21 days ago, have never written a word in
 * any project they own, and haven't received this nudge before.
 */
export async function findReengagementCandidates(now: Date): Promise<ReengagementCandidate[]> {
  const newestEligibleSignup = new Date(now.getTime() - MIN_ACCOUNT_AGE_DAYS * DAY_MS)
  const oldestEligibleSignup = new Date(now.getTime() - MAX_ACCOUNT_AGE_DAYS * DAY_MS)

  return await db
    .select({ id: user.id, email: user.email, name: user.name })
    .from(user)
    .where(
      and(
        eq(user.emailVerified, true),
        lte(user.createdAt, newestEligibleSignup),
        gte(user.createdAt, oldestEligibleSignup),
        notExists(
          db
            .select({ id: sentEmail.id })
            .from(sentEmail)
            .where(and(eq(sentEmail.userId, user.id), eq(sentEmail.type, REENGAGEMENT_EMAIL_TYPE)))
        ),
        notExists(
          db
            .select({ id: chapter.id })
            .from(chapter)
            .innerJoin(work, eq(chapter.workId, work.id))
            .innerJoin(project, eq(work.projectId, project.id))
            .where(and(eq(project.ownerId, user.id), gt(chapter.wordCount, 0)))
        )
      )
    )
    .limit(MAX_EMAILS_PER_RUN)
}

export interface DraftNudgeCandidate {
  email: string
  id: string
  name: string
  totalWords: number
}

/**
 * The warmest cohort: verified users who actually wrote words, but whose most
 * recent writing activity is 3–21 days old. Pulled back to their draft, at
 * most once per user ever.
 */
const MIN_IDLE_DAYS = 3
const MAX_IDLE_DAYS = 21

export async function findDraftNudgeCandidates(now: Date): Promise<DraftNudgeCandidate[]> {
  const idleSince = new Date(now.getTime() - MIN_IDLE_DAYS * DAY_MS)
  const idleFloor = new Date(now.getTime() - MAX_IDLE_DAYS * DAY_MS)

  const candidates = await db
    .select({ id: user.id, email: user.email, name: user.name })
    .from(user)
    .where(
      and(
        eq(user.emailVerified, true),
        notExists(
          db
            .select({ id: sentEmail.id })
            .from(sentEmail)
            .where(and(eq(sentEmail.userId, user.id), eq(sentEmail.type, DRAFT_NUDGE_EMAIL_TYPE)))
        ),
        // Last writing activity falls inside the idle window…
        exists(
          db
            .select({ id: project.id })
            .from(project)
            .where(
              and(
                eq(project.ownerId, user.id),
                lte(project.lastWrittenAt, idleSince),
                gte(project.lastWrittenAt, idleFloor)
              )
            )
        ),
        // …and nothing more recent (still-active writers are left alone)
        notExists(
          db
            .select({ id: project.id })
            .from(project)
            .where(and(eq(project.ownerId, user.id), gt(project.lastWrittenAt, idleSince)))
        ),
        exists(
          db
            .select({ id: chapter.id })
            .from(chapter)
            .innerJoin(work, eq(chapter.workId, work.id))
            .innerJoin(project, eq(work.projectId, project.id))
            .where(and(eq(project.ownerId, user.id), gt(chapter.wordCount, 0)))
        )
      )
    )
    .limit(MAX_EMAILS_PER_RUN)

  // Word totals personalize the email; the cohort is capped and tiny
  return await Promise.all(
    candidates.map(async (candidate) => {
      const rows = await db
        .select({ wordCount: chapter.wordCount })
        .from(chapter)
        .innerJoin(work, eq(chapter.workId, work.id))
        .innerJoin(project, eq(work.projectId, project.id))
        .where(eq(project.ownerId, candidate.id))
      const totalWords = rows.reduce((sum, row) => sum + (row.wordCount ?? 0), 0)
      return { ...candidate, totalWords }
    })
  )
}

/**
 * Record a nudge before sending so a crashed run can never double-send;
 * a missed email costs nothing, a duplicate one reads as spam.
 */
export async function markEmailSent(userId: string, type: string, now: Date): Promise<void> {
  await db.insert(sentEmail).values({
    id: crypto.randomUUID(),
    userId,
    type,
    sentAt: now,
  })
}
