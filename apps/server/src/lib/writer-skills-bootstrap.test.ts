import { beforeEach, describe, expect, it, vi } from "vitest"

// Exercise the real bootstrap logic against an in-memory database, mirroring
// lib/bootstrap-admin.test.ts.

vi.mock("../db", async () => {
  const mod = await import("../test/test-db")
  return { db: mod.testDb }
})

import { eq } from "drizzle-orm"
import { writerSkill } from "../db/schema"
import { applyMigrations, testDb } from "../test/test-db"
import { BUILT_IN_SKILLS } from "./writer-skills"
import {
  ensureBuiltInWriterSkills,
  resetWriterSkillBootstrapForTests,
} from "./writer-skills-bootstrap"

beforeEach(async () => {
  await applyMigrations()
  resetWriterSkillBootstrapForTests()
  await testDb.delete(writerSkill)
})

describe("ensureBuiltInWriterSkills", () => {
  it("seeds all built-in skills when the table is empty", async () => {
    await ensureBuiltInWriterSkills()

    const rows = await testDb.select().from(writerSkill)
    expect(rows).toHaveLength(BUILT_IN_SKILLS.length)
    for (const skill of BUILT_IN_SKILLS) {
      const row = rows.find((r) => r.id === skill.id)
      expect(row).toBeDefined()
      expect(row?.builtIn).toBe(true)
      expect(row?.createdBy).toBeNull()
      expect(row?.name).toBe(skill.name)
    }
  })

  it("is idempotent: calling it again does not duplicate or re-insert rows", async () => {
    await ensureBuiltInWriterSkills()
    const firstRows = await testDb.select().from(writerSkill)

    resetWriterSkillBootstrapForTests()
    await ensureBuiltInWriterSkills()
    const secondRows = await testDb.select().from(writerSkill)

    expect(secondRows).toHaveLength(firstRows.length)
  })

  it("does not clobber a user's own edits to an already-seeded built-in skill", async () => {
    await ensureBuiltInWriterSkills()

    const [target] = BUILT_IN_SKILLS
    await testDb
      .update(writerSkill)
      .set({ name: "Customized Name" })
      .where(eq(writerSkill.id, target.id))

    resetWriterSkillBootstrapForTests()
    await ensureBuiltInWriterSkills()

    const row = await testDb.select().from(writerSkill).where(eq(writerSkill.id, target.id)).get()
    expect(row?.name).toBe("Customized Name")
  })
})
