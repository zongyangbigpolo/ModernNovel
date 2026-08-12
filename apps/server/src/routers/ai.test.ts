import { beforeAll, describe, expect, it, vi } from "vitest"

// buildSystemPrompt is pure-ish (only reads via the shared `db`), so we can
// exercise it directly against the in-memory libsql database without any
// HTTP layer, verifying the deterministic ordering and injection behavior
// documented in the feature spec.

vi.mock("../db", async () => {
  const mod = await import("../test/test-db")
  return { db: mod.testDb }
})

vi.mock("../lib/auth", () => ({
  getAuth: () => ({
    api: {
      getSession: () => Promise.resolve(null),
    },
  }),
}))

import { eq } from "drizzle-orm"
import {
  character,
  organization,
  project,
  projectStyleMemory,
  projectWriterSkill,
  user,
  writerSkill,
} from "../db/schema"
import { applyMigrations, testDb } from "../test/test-db"
import { buildSystemPrompt } from "./ai"

const ORG_ID = "prompt-org"
const PROJECT_ID = "prompt-project"
const OWNER_ID = "prompt-owner"

beforeAll(async () => {
  await applyMigrations()

  const now = new Date()
  await testDb.insert(user).values({
    id: OWNER_ID,
    name: "Prompt Writer",
    email: "prompt@example.com",
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  })
  await testDb.insert(organization).values({
    id: ORG_ID,
    name: "Prompt Org",
    slug: "prompt-org",
    createdAt: now,
    updatedAt: now,
  })
  await testDb.insert(project).values({
    id: PROJECT_ID,
    title: "The Long Winter",
    type: "novel",
    genre: "Literary Fiction",
    status: "draft",
    visibility: "private",
    ownerId: OWNER_ID,
    organizationId: ORG_ID,
    createdAt: now,
    updatedAt: now,
  })
  await testDb.insert(character).values({
    id: "prompt-character",
    projectId: PROJECT_ID,
    name: "Mira",
    description: "A dockworkers' union organizer.",
    createdAt: now,
    updatedAt: now,
  })
})

describe("buildSystemPrompt", () => {
  it("returns the base prompt unchanged when no project id is given", async () => {
    const prompt = await buildSystemPrompt(undefined, ORG_ID)
    expect(prompt).not.toContain("WRITER SKILLS")
    expect(prompt).not.toContain("STYLE MEMORY")
  })

  it("includes project/character context but no skills/memory sections when none are configured", async () => {
    const prompt = await buildSystemPrompt(PROJECT_ID, ORG_ID)
    expect(prompt).toContain("The Long Winter")
    expect(prompt).toContain("Mira")
    expect(prompt).not.toContain("WRITER SKILLS")
    expect(prompt).not.toContain("STYLE MEMORY")
  })

  it("injects only enabled skills, in binding-order then name order, deterministically", async () => {
    const now = new Date()
    await testDb.insert(writerSkill).values([
      {
        id: "skill-z",
        name: "Z Skill",
        instructions: "Do Z.",
        builtIn: false,
        createdBy: OWNER_ID,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "skill-a",
        name: "A Skill",
        instructions: "Do A.",
        builtIn: false,
        createdBy: OWNER_ID,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "skill-disabled",
        name: "Disabled Skill",
        instructions: "Should never appear.",
        builtIn: false,
        createdBy: OWNER_ID,
        createdAt: now,
        updatedAt: now,
      },
    ])
    // Both "Z Skill" and "A Skill" share order=0, so name order breaks the
    // tie (A before Z) — this must be stable across repeated calls.
    await testDb.insert(projectWriterSkill).values([
      {
        id: "binding-z",
        projectId: PROJECT_ID,
        skillId: "skill-z",
        enabled: true,
        order: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "binding-a",
        projectId: PROJECT_ID,
        skillId: "skill-a",
        enabled: true,
        order: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "binding-disabled",
        projectId: PROJECT_ID,
        skillId: "skill-disabled",
        enabled: false,
        order: 1,
        createdAt: now,
        updatedAt: now,
      },
    ])

    const prompt = await buildSystemPrompt(PROJECT_ID, ORG_ID)
    expect(prompt).toContain("=== WRITER SKILLS")
    expect(prompt).not.toContain("Disabled Skill")
    expect(prompt.indexOf("A Skill")).toBeLessThan(prompt.indexOf("Z Skill"))

    // Re-running must produce byte-identical output (deterministic order).
    const promptAgain = await buildSystemPrompt(PROJECT_ID, ORG_ID)
    expect(promptAgain).toBe(prompt)
  })

  it("injects a valid stored style memory profile", async () => {
    const now = new Date()
    const profile = {
      voice: "Wry, understated.",
      sentenceRhythm: "Short declaratives.",
      povTense: "Close third, past.",
      dialogue: "Clipped.",
      imagery: "Coastal.",
      pacing: "Fast then slow.",
      avoid: ["semicolons"],
    }
    await testDb.insert(projectStyleMemory).values({
      id: "memory-1",
      projectId: PROJECT_ID,
      profile: JSON.stringify(profile),
      version: 1,
      createdAt: now,
      updatedAt: now,
    })

    const prompt = await buildSystemPrompt(PROJECT_ID, ORG_ID)
    expect(prompt).toContain("=== PROJECT STYLE MEMORY")
    expect(prompt).toContain("Wry, understated.")
  })

  it("silently omits a corrupted stored style memory profile rather than injecting garbage", async () => {
    await testDb
      .update(projectStyleMemory)
      .set({ profile: "not valid json" })
      .where(eq(projectStyleMemory.id, "memory-1"))

    const prompt = await buildSystemPrompt(PROJECT_ID, ORG_ID)
    expect(prompt).not.toContain("STYLE MEMORY")
  })
})
