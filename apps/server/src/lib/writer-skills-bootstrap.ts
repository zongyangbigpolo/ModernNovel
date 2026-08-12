/**
 * Idempotent seeding of the built-in writer skills (see BUILT_IN_SKILLS in
 * ./writer-skills.ts). Mirrors the pattern used by lib/bootstrap-admin.ts:
 * safe to call unconditionally from request middleware, memoized per isolate,
 * and never blocks/crashes the request if it fails.
 */

import { inArray } from "drizzle-orm"
import { db } from "../db"
import { writerSkill } from "../db/schema"
import { BUILT_IN_SKILLS } from "./writer-skills"

let bootstrapPromise: Promise<void> | null = null

export function resetWriterSkillBootstrapForTests(): void {
  bootstrapPromise = null
}

async function runBootstrap(): Promise<void> {
  const ids = BUILT_IN_SKILLS.map((skill) => skill.id)
  const existing = await db
    .select({ id: writerSkill.id })
    .from(writerSkill)
    .where(inArray(writerSkill.id, ids))

  const existingIds = new Set(existing.map((row) => row.id))
  const missing = BUILT_IN_SKILLS.filter((skill) => !existingIds.has(skill.id))

  if (missing.length === 0) {
    return
  }

  const now = new Date()
  for (const skill of missing) {
    await db
      .insert(writerSkill)
      .values({
        id: skill.id,
        name: skill.name,
        description: skill.description,
        instructions: skill.instructions,
        checklist: JSON.stringify(skill.checklist),
        examples: JSON.stringify(skill.examples),
        sourceUrl: skill.sourceUrl,
        sourceLicense: skill.sourceLicense,
        builtIn: true,
        createdBy: null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing()
  }
}

/**
 * Ensures the built-in writer skills exist in the catalog. Safe to call
 * unconditionally from request middleware — subsequent calls within the same
 * isolate reuse the first attempt's result instead of re-querying.
 */
export function ensureBuiltInWriterSkills(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = runBootstrap().catch((error) => {
      console.error("[writer-skills-bootstrap] Unexpected bootstrap error:", error)
      bootstrapPromise = null
    })
  }

  return bootstrapPromise
}
