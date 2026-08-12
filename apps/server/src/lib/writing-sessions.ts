import { and, desc, eq } from "drizzle-orm"
import { db } from "../db"
import { work, writingSession } from "../db/schema"

// Saves separated by less than this belong to the same sitting; anything
// longer starts a new writing_session row.
export const SESSION_GAP_MS = 30 * 60 * 1000

interface WritingActivity {
  chapterId: string
  now: Date
  projectId: string
  userId: string
  /** New chapter word count minus the count before this save (may be negative). */
  wordDelta: number
  workId: string
}

/**
 * Roll a content save into the writer's current session, or open a new one.
 *
 * `wordsWritten` accumulates only positive deltas so deletions and rewrites
 * don't erase evidence that writing happened; `timeSpent` is the span of the
 * sitting in minutes. Also stamps `work.lastWrittenAt` (the project-level
 * stamp is handled by syncProjectWordCount).
 */
export async function recordWritingActivity(activity: WritingActivity): Promise<void> {
  const { projectId, workId, chapterId, userId, wordDelta, now } = activity
  const wordsAdded = Math.max(wordDelta, 0)

  const latest = await db
    .select({
      id: writingSession.id,
      startTime: writingSession.startTime,
      endTime: writingSession.endTime,
      wordsWritten: writingSession.wordsWritten,
    })
    .from(writingSession)
    .where(and(eq(writingSession.userId, userId), eq(writingSession.chapterId, chapterId)))
    .orderBy(desc(writingSession.startTime))
    .limit(1)
    .get()

  const lastActivity = latest?.endTime ?? latest?.startTime
  if (latest && lastActivity && now.getTime() - lastActivity.getTime() <= SESSION_GAP_MS) {
    await db
      .update(writingSession)
      .set({
        endTime: now,
        wordsWritten: (latest.wordsWritten ?? 0) + wordsAdded,
        timeSpent: Math.round((now.getTime() - latest.startTime.getTime()) / 60_000),
      })
      .where(eq(writingSession.id, latest.id))
  } else {
    await db.insert(writingSession).values({
      id: crypto.randomUUID(),
      projectId,
      workId,
      userId,
      chapterId,
      wordsWritten: wordsAdded,
      timeSpent: 0,
      startTime: now,
      endTime: now,
      createdAt: now,
    })
  }

  await db.update(work).set({ lastWrittenAt: now }).where(eq(work.id, workId))
}
