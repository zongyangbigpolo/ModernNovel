import { beforeAll, describe, expect, it, vi } from "vitest"

// Run the real candidate query against an in-memory database (same harness as
// the router integration tests).

vi.mock("../db", async () => {
  const mod = await import("../test/test-db")
  return { db: mod.testDb }
})

import { chapter, organization, project, user, work } from "../db/schema"
import { applyMigrations, testDb } from "../test/test-db"
import {
  DRAFT_NUDGE_EMAIL_TYPE,
  findDraftNudgeCandidates,
  findReengagementCandidates,
  markEmailSent,
  REENGAGEMENT_EMAIL_TYPE,
} from "./reengagement"

const NOW = new Date("2026-07-20T15:00:00.000Z")
const ORG_ID = "reng-org"

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000)
}

async function seedUser(id: string, opts: { emailVerified: boolean; signedUpDaysAgo: number }) {
  const createdAt = daysAgo(opts.signedUpDaysAgo)
  await testDb.insert(user).values({
    id,
    name: id,
    email: `${id}@example.com`,
    emailVerified: opts.emailVerified,
    createdAt,
    updatedAt: createdAt,
  })
}

async function seedProjectWithChapter(
  ownerId: string,
  wordCount: number,
  lastWrittenAt: Date | null = null
) {
  const projectId = `${ownerId}-project`
  const workId = `${ownerId}-work`
  await testDb.insert(project).values({
    id: projectId,
    title: "Seeded",
    type: "novel",
    status: "draft",
    visibility: "private",
    ownerId,
    organizationId: ORG_ID,
    createdAt: NOW,
    updatedAt: NOW,
    lastWrittenAt,
  })
  await testDb.insert(work).values({
    id: workId,
    projectId,
    title: "Seeded",
    workType: "novel",
    order: 1,
    status: "draft",
    createdAt: NOW,
    updatedAt: NOW,
  })
  await testDb.insert(chapter).values({
    id: `${ownerId}-chapter`,
    title: "Chapter 1",
    content: "",
    wordCount,
    order: 1,
    status: "draft",
    workId,
    createdAt: NOW,
    updatedAt: NOW,
  })
}

beforeAll(async () => {
  await applyMigrations()

  await testDb.insert(organization).values({
    id: ORG_ID,
    name: "Reng Org",
    slug: "reng-org",
    createdAt: NOW,
    updatedAt: NOW,
  })

  // Eligible: verified, in the age window, project but zero words
  await seedUser("eligible", { emailVerified: true, signedUpDaysAgo: 5 })
  await seedProjectWithChapter("eligible", 0)

  // Eligible: verified, in the window, never even created a project
  await seedUser("eligible-no-project", { emailVerified: true, signedUpDaysAgo: 10 })

  // Excluded: actually wrote words
  await seedUser("wrote", { emailVerified: true, signedUpDaysAgo: 5 })
  await seedProjectWithChapter("wrote", 250)

  // Excluded: signed up too recently / too long ago / never verified
  await seedUser("fresh", { emailVerified: true, signedUpDaysAgo: 1 })
  await seedUser("ancient", { emailVerified: true, signedUpDaysAgo: 45 })
  await seedUser("unverified", { emailVerified: false, signedUpDaysAgo: 5 })

  // Draft-nudge cohort: wrote words, last writing activity at various ages
  await seedUser("idle-writer", { emailVerified: true, signedUpDaysAgo: 15 })
  await seedProjectWithChapter("idle-writer", 500, daysAgo(5))
  await seedUser("active-writer", { emailVerified: true, signedUpDaysAgo: 15 })
  await seedProjectWithChapter("active-writer", 800, daysAgo(1))
  await seedUser("long-gone-writer", { emailVerified: true, signedUpDaysAgo: 60 })
  await seedProjectWithChapter("long-gone-writer", 300, daysAgo(30))
})

describe("findReengagementCandidates", () => {
  it("selects only verified, idle users inside the age window", async () => {
    const candidates = await findReengagementCandidates(NOW)
    expect(candidates.map((c) => c.id).sort()).toEqual(["eligible", "eligible-no-project"])
  })

  it("never selects a user twice once the nudge is recorded", async () => {
    await markEmailSent("eligible", REENGAGEMENT_EMAIL_TYPE, NOW)

    const candidates = await findReengagementCandidates(NOW)
    expect(candidates.map((c) => c.id)).toEqual(["eligible-no-project"])
  })
})

describe("findDraftNudgeCandidates", () => {
  it("selects only writers idle 3-21 days, with their word totals", async () => {
    const candidates = await findDraftNudgeCandidates(NOW)
    expect(candidates).toEqual([
      { id: "idle-writer", email: "idle-writer@example.com", name: "idle-writer", totalWords: 500 },
    ])
  })

  it("respects the per-type sent log independently of the signup nudge", async () => {
    // The signup-nudge record must not block the draft nudge…
    await markEmailSent("idle-writer", REENGAGEMENT_EMAIL_TYPE, NOW)
    expect((await findDraftNudgeCandidates(NOW)).map((c) => c.id)).toEqual(["idle-writer"])

    // …but its own record does
    await markEmailSent("idle-writer", DRAFT_NUDGE_EMAIL_TYPE, NOW)
    expect(await findDraftNudgeCandidates(NOW)).toEqual([])
  })
})
