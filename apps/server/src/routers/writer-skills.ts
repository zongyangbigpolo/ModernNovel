import { and, asc, eq } from "drizzle-orm"
import { type Context, Hono } from "hono"
import { db } from "../db"
import { chapter, projectStyleMemory, projectWriterSkill, work, writerSkill } from "../db/schema"
import {
  buildLearningPrompt,
  collectStyleSampleChapters,
  htmlToPlainText,
  MIN_STYLE_SAMPLE_CHARS,
  parseJsonStringArray,
  parseSkillJson,
  parseSkillMarkdown,
  parseSkillUpdate,
  parseStyleProfileResponse,
  STYLE_LEARNING_SYSTEM_PROMPT,
  stringifyList,
} from "../lib/writer-skills"
import { ensureBuiltInWriterSkills } from "../lib/writer-skills-bootstrap"
import {
  hasProjectMutationAccess,
  requireAuth,
  requireProjectMutationAccess,
  verifyProjectAccess,
} from "../middleware/auth"
import { isCompletionFailure, runCompletionForUser } from "./ai"

interface Env {
  BETTER_AUTH_SECRET: string
  BETTER_AUTH_URL: string
  CORS_ORIGIN: string
  ENCRYPTION_KEY: string
}

interface Variables {
  activeOrganization: {
    id: string
    name: string
    slug: string
  } | null
  session: {
    id: string
    userId: string
  }
  user: {
    id: string
    email: string
    name: string
  }
}

type AppContext = Context<{ Bindings: Env; Variables: Variables }>

function requiredParam(c: AppContext, name: string): string {
  return c.req.param(name) ?? ""
}

const writerSkillsRouter = new Hono<{ Bindings: Env; Variables: Variables }>()

// ---------------------------------------------------------------------------
// DTO shaping

function toSkillDto(
  row: {
    builtIn: boolean
    checklist: string | null
    createdAt: Date
    createdBy: string | null
    description: string | null
    examples: string | null
    id: string
    instructions: string
    name: string
    sourceLicense: string | null
    sourceUrl: string | null
    updatedAt: Date
  },
  binding: { enabled: boolean; order: number } | null
) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    instructions: row.instructions,
    checklist: parseJsonStringArray(row.checklist),
    examples: parseJsonStringArray(row.examples),
    sourceUrl: row.sourceUrl,
    sourceLicense: row.sourceLicense,
    builtIn: row.builtIn,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    binding,
  }
}

function toMemoryDto(row: {
  createdAt: Date
  model: string | null
  profile: string
  projectId: string
  provider: string | null
  sourceChapterIds: string | null
  sourceWordCount: number | null
  updatedAt: Date
  version: number
}) {
  return {
    projectId: row.projectId,
    profile: JSON.parse(row.profile),
    sourceChapterIds: parseJsonStringArray(row.sourceChapterIds),
    sourceWordCount: row.sourceWordCount ?? 0,
    version: row.version,
    provider: row.provider,
    model: row.model,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Catalog + bindings

writerSkillsRouter.get(
  "/projects/:projectId/writer-skills",
  requireAuth,
  verifyProjectAccess,
  async (c: AppContext) => {
    await ensureBuiltInWriterSkills()
    const projectId = requiredParam(c, "projectId")
    const user = c.get("user")

    const bindings = await db
      .select()
      .from(projectWriterSkill)
      .where(eq(projectWriterSkill.projectId, projectId))

    const boundSkillIds = bindings.map((b) => b.skillId)
    const boundSet = new Set(boundSkillIds)

    // Visible catalog = built-in skills, skills owned by the requesting
    // user, and any skill already bound to this project (even if owned by
    // someone else, e.g. a former collaborator). This is an OR across
    // independent conditions, so it's simplest and clearest to fetch the
    // (small, global) catalog once and filter in app code rather than
    // building a conditional SQL OR/IN expression.
    const allSkills = await db.select().from(writerSkill)
    const catalog = allSkills.filter(
      (skill) => skill.builtIn || skill.createdBy === user.id || boundSet.has(skill.id)
    )

    const bindingBySkillId = new Map(bindings.map((b) => [b.skillId, b]))

    const dtos = catalog.map((skill) =>
      toSkillDto(
        skill,
        bindingBySkillId.has(skill.id)
          ? {
              enabled: Boolean(bindingBySkillId.get(skill.id)?.enabled),
              order: bindingBySkillId.get(skill.id)?.order ?? 0,
            }
          : null
      )
    )

    dtos.sort((a, b) => {
      const aBound = a.binding !== null
      const bBound = b.binding !== null
      if (aBound && bBound) {
        return (a.binding?.order ?? 0) - (b.binding?.order ?? 0)
      }
      if (aBound !== bBound) {
        return aBound ? -1 : 1
      }
      if (a.builtIn !== b.builtIn) {
        return a.builtIn ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })

    return c.json({
      skills: dtos,
      canManage: await hasProjectMutationAccess({
        projectId,
        activeOrganization: c.get("activeOrganization"),
        user,
      }),
    })
  }
)

writerSkillsRouter.post(
  "/projects/:projectId/writer-skills",
  requireAuth,
  verifyProjectAccess,
  requireProjectMutationAccess,
  async (c: AppContext) => {
    const user = c.get("user")

    let body: { content?: unknown; format?: unknown }
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400)
    }

    if (body.format !== "markdown" && body.format !== "json") {
      return c.json({ error: 'format must be "markdown" or "json"' }, 400)
    }
    if (typeof body.content !== "string") {
      return c.json({ error: "content must be a string" }, 400)
    }

    const result =
      body.format === "markdown" ? parseSkillMarkdown(body.content) : parseSkillJson(body.content)

    if (!result.ok) {
      return c.json({ error: "Invalid skill definition", details: result.errors }, 400)
    }

    const id = crypto.randomUUID()
    const now = new Date()
    const { skill } = result

    await db.insert(writerSkill).values({
      id,
      name: skill.name,
      description: skill.description,
      instructions: skill.instructions,
      checklist: stringifyList(skill.checklist),
      examples: stringifyList(skill.examples),
      sourceUrl: skill.sourceUrl,
      sourceLicense: skill.sourceLicense,
      builtIn: false,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
    })

    const created = await db.select().from(writerSkill).where(eq(writerSkill.id, id)).get()
    if (!created) {
      return c.json({ error: "Failed to create skill" }, 500)
    }

    return c.json({ skill: toSkillDto(created, null) }, 201)
  }
)

interface OwnedSkillError {
  message: string
  status: 403 | 404
}

type OwnedSkillResult =
  | { error: OwnedSkillError }
  | { skill: Awaited<ReturnType<typeof fetchSkillById>> }

function fetchSkillById(skillId: string) {
  return db.select().from(writerSkill).where(eq(writerSkill.id, skillId)).get()
}

async function getOwnedMutableSkill(skillId: string, userId: string): Promise<OwnedSkillResult> {
  const skill = await fetchSkillById(skillId)
  if (!skill) {
    return { error: { message: "Skill not found", status: 404 } }
  }
  if (skill.builtIn) {
    return { error: { message: "Built-in skills cannot be modified", status: 403 } }
  }
  if (skill.createdBy !== userId) {
    return { error: { message: "Only the skill's creator can modify it", status: 403 } }
  }
  return { skill }
}

// ---------------------------------------------------------------------------
// Bindings (enable/disable + order). Registered before the "/:skillId"
// routes below: Hono's router matches literal path segments in registration
// order when they overlap with a param segment, so "/writer-skills/order"
// (an exact, one-segment literal) must be registered before
// "/writer-skills/:skillId" or requests to /order would be captured by the
// :skillId route instead (with skillId="order").

writerSkillsRouter.put(
  "/projects/:projectId/writer-skills/order",
  requireAuth,
  verifyProjectAccess,
  requireProjectMutationAccess,
  async (c: AppContext) => {
    const projectId = requiredParam(c, "projectId")

    let body: { skillIds?: unknown }
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400)
    }

    if (!Array.isArray(body.skillIds) || body.skillIds.some((id) => typeof id !== "string")) {
      return c.json({ error: "skillIds must be an array of strings" }, 400)
    }
    const skillIds = body.skillIds as string[]

    const existingBindings = await db
      .select({ skillId: projectWriterSkill.skillId })
      .from(projectWriterSkill)
      .where(eq(projectWriterSkill.projectId, projectId))

    const existingIds = new Set(existingBindings.map((b) => b.skillId))
    const providedIds = new Set(skillIds)

    if (
      skillIds.length !== existingIds.size ||
      [...existingIds].some((id) => !providedIds.has(id)) ||
      providedIds.size !== skillIds.length
    ) {
      return c.json(
        { error: "skillIds must contain exactly the currently bound skill ids, each once" },
        400
      )
    }

    const now = new Date()
    for (const [index, skillId] of skillIds.entries()) {
      await db
        .update(projectWriterSkill)
        .set({ order: index, updatedAt: now })
        .where(
          and(eq(projectWriterSkill.projectId, projectId), eq(projectWriterSkill.skillId, skillId))
        )
    }

    return c.json({ success: true })
  }
)

writerSkillsRouter.put(
  "/projects/:projectId/writer-skills/:skillId",
  requireAuth,
  verifyProjectAccess,
  requireProjectMutationAccess,
  async (c: AppContext) => {
    const skillId = requiredParam(c, "skillId")
    const user = c.get("user")

    const owned = await getOwnedMutableSkill(skillId, user.id)
    if ("error" in owned) {
      return c.json({ error: owned.error.message }, owned.error.status)
    }

    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400)
    }

    const result = parseSkillUpdate(body)
    if (!result.ok) {
      return c.json({ error: "Invalid skill update", details: result.errors }, 400)
    }

    const { update } = result
    const now = new Date()

    await db
      .update(writerSkill)
      .set({
        ...(update.name === undefined ? {} : { name: update.name }),
        ...(update.description === undefined ? {} : { description: update.description }),
        ...(update.instructions === undefined ? {} : { instructions: update.instructions }),
        ...(update.checklist === undefined ? {} : { checklist: stringifyList(update.checklist) }),
        ...(update.examples === undefined ? {} : { examples: stringifyList(update.examples) }),
        ...(update.sourceUrl === undefined ? {} : { sourceUrl: update.sourceUrl }),
        ...(update.sourceLicense === undefined ? {} : { sourceLicense: update.sourceLicense }),
        updatedAt: now,
      })
      .where(eq(writerSkill.id, skillId))

    const updated = await db.select().from(writerSkill).where(eq(writerSkill.id, skillId)).get()
    if (!updated) {
      return c.json({ error: "Skill not found" }, 404)
    }

    const binding = await db
      .select({ enabled: projectWriterSkill.enabled, order: projectWriterSkill.order })
      .from(projectWriterSkill)
      .where(
        and(
          eq(projectWriterSkill.projectId, requiredParam(c, "projectId")),
          eq(projectWriterSkill.skillId, skillId)
        )
      )
      .get()

    return c.json({ skill: toSkillDto(updated, binding ?? null) })
  }
)

writerSkillsRouter.delete(
  "/projects/:projectId/writer-skills/:skillId",
  requireAuth,
  verifyProjectAccess,
  requireProjectMutationAccess,
  async (c: AppContext) => {
    const skillId = requiredParam(c, "skillId")
    const user = c.get("user")

    const owned = await getOwnedMutableSkill(skillId, user.id)
    if ("error" in owned) {
      return c.json({ error: owned.error.message }, owned.error.status)
    }

    // Bindings across every project cascade via the FK; this intentionally
    // removes the skill from the whole catalog, not just this project.
    await db.delete(writerSkill).where(eq(writerSkill.id, skillId))

    return c.json({ success: true })
  }
)

// ---------------------------------------------------------------------------
// Bindings (enable/disable), keyed by skill id ("/:skillId/binding" has an
// extra path segment so it never conflicts with "/:skillId" above).

writerSkillsRouter.put(
  "/projects/:projectId/writer-skills/:skillId/binding",
  requireAuth,
  verifyProjectAccess,
  requireProjectMutationAccess,
  async (c: AppContext) => {
    const projectId = requiredParam(c, "projectId")
    const skillId = requiredParam(c, "skillId")

    const skill = await db
      .select({ id: writerSkill.id })
      .from(writerSkill)
      .where(eq(writerSkill.id, skillId))
      .get()
    if (!skill) {
      return c.json({ error: "Skill not found" }, 404)
    }

    let body: { enabled?: unknown; order?: unknown }
    try {
      body = await c.req.json()
    } catch {
      body = {}
    }

    if (body.enabled !== undefined && typeof body.enabled !== "boolean") {
      return c.json({ error: "enabled must be a boolean" }, 400)
    }
    if (
      body.order !== undefined &&
      (typeof body.order !== "number" || !Number.isInteger(body.order))
    ) {
      return c.json({ error: "order must be an integer" }, 400)
    }

    const existing = await db
      .select()
      .from(projectWriterSkill)
      .where(
        and(eq(projectWriterSkill.projectId, projectId), eq(projectWriterSkill.skillId, skillId))
      )
      .get()

    const now = new Date()

    if (existing) {
      await db
        .update(projectWriterSkill)
        .set({
          ...(body.enabled === undefined ? {} : { enabled: body.enabled }),
          ...(body.order === undefined ? {} : { order: body.order }),
          updatedAt: now,
        })
        .where(eq(projectWriterSkill.id, existing.id))
    } else {
      const maxOrderRow = await db
        .select({ order: projectWriterSkill.order })
        .from(projectWriterSkill)
        .where(eq(projectWriterSkill.projectId, projectId))
        .orderBy(asc(projectWriterSkill.order))

      const nextOrder =
        typeof body.order === "number"
          ? body.order
          : maxOrderRow.reduce((max, row) => Math.max(max, row.order), -1) + 1

      await db.insert(projectWriterSkill).values({
        id: crypto.randomUUID(),
        projectId,
        skillId,
        enabled: body.enabled ?? true,
        order: nextOrder,
        createdAt: now,
        updatedAt: now,
      })
    }

    const binding = await db
      .select()
      .from(projectWriterSkill)
      .where(
        and(eq(projectWriterSkill.projectId, projectId), eq(projectWriterSkill.skillId, skillId))
      )
      .get()

    if (!binding) {
      return c.json({ error: "Failed to update binding" }, 500)
    }

    return c.json({ binding: { skillId, enabled: binding.enabled, order: binding.order } })
  }
)

writerSkillsRouter.delete(
  "/projects/:projectId/writer-skills/:skillId/binding",
  requireAuth,
  verifyProjectAccess,
  requireProjectMutationAccess,
  async (c: AppContext) => {
    const projectId = requiredParam(c, "projectId")
    const skillId = requiredParam(c, "skillId")

    const existing = await db
      .select({ id: projectWriterSkill.id })
      .from(projectWriterSkill)
      .where(
        and(eq(projectWriterSkill.projectId, projectId), eq(projectWriterSkill.skillId, skillId))
      )
      .get()

    if (!existing) {
      return c.json({ error: "Skill is not bound to this project" }, 404)
    }

    await db.delete(projectWriterSkill).where(eq(projectWriterSkill.id, existing.id))

    return c.json({ success: true })
  }
)

// ---------------------------------------------------------------------------
// Style memory

writerSkillsRouter.get(
  "/projects/:projectId/writer-skills/memory",
  requireAuth,
  verifyProjectAccess,
  async (c: AppContext) => {
    const projectId = requiredParam(c, "projectId")

    const memory = await db
      .select()
      .from(projectStyleMemory)
      .where(eq(projectStyleMemory.projectId, projectId))
      .get()

    return c.json({ memory: memory ? toMemoryDto(memory) : null })
  }
)

async function collectManuscriptSample(projectId: string, requestedChapterIds?: string[]) {
  const rows = await db
    .select({
      id: chapter.id,
      title: chapter.title,
      content: chapter.content,
      order: chapter.order,
    })
    .from(chapter)
    .innerJoin(work, eq(chapter.workId, work.id))
    .where(eq(work.projectId, projectId))
    .orderBy(asc(chapter.order))

  const filtered =
    requestedChapterIds && requestedChapterIds.length > 0
      ? rows.filter((row) => requestedChapterIds.includes(row.id))
      : rows

  const sourceChapters = filtered
    .filter((row) => typeof row.content === "string" && row.content.trim().length > 0)
    .map((row) => ({
      id: row.id,
      order: row.order,
      title: row.title,
      text: htmlToPlainText(row.content ?? ""),
    }))

  return collectStyleSampleChapters(sourceChapters)
}

writerSkillsRouter.post(
  "/projects/:projectId/writer-skills/learn",
  requireAuth,
  verifyProjectAccess,
  requireProjectMutationAccess,
  async (c: AppContext) => {
    const projectId = requiredParam(c, "projectId")
    const user = c.get("user")

    let body: { chapterIds?: unknown; model?: unknown }
    try {
      body = await c.req.json()
    } catch {
      body = {}
    }

    const requestedChapterIds =
      Array.isArray(body.chapterIds) && body.chapterIds.every((id) => typeof id === "string")
        ? (body.chapterIds as string[])
        : undefined
    const model = typeof body.model === "string" ? body.model : undefined

    const sample = await collectManuscriptSample(projectId, requestedChapterIds)

    if (sample.totalChars < MIN_STYLE_SAMPLE_CHARS) {
      return c.json(
        {
          error:
            "This project doesn't have enough written chapter text yet to learn a style profile from. Write more manuscript content, then try again.",
          code: "no_manuscript_text",
        },
        422
      )
    }

    const prompt = buildLearningPrompt(sample.chapters)

    const result = await runCompletionForUser({
      userId: user.id,
      env: c.env,
      system: STYLE_LEARNING_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
      model,
    })

    if (isCompletionFailure(result)) {
      return c.json(
        { error: result.error, ...(result.code ? { code: result.code } : {}) },
        result.status
      )
    }

    const parsed = parseStyleProfileResponse(result.message)
    if (!parsed.ok) {
      return c.json({ error: parsed.error, code: "invalid_style_profile" }, 502)
    }

    const now = new Date()
    const existing = await db
      .select({ id: projectStyleMemory.id, version: projectStyleMemory.version })
      .from(projectStyleMemory)
      .where(eq(projectStyleMemory.projectId, projectId))
      .get()

    const values = {
      profile: JSON.stringify(parsed.profile),
      sourceChapterIds: stringifyList(sample.chapterIds),
      sourceWordCount: Math.round(sample.totalChars / 6), // rough words-from-chars estimate for reporting
      provider: result.provider,
      model: result.model,
      updatedAt: now,
    }

    if (existing) {
      await db
        .update(projectStyleMemory)
        .set({ ...values, version: existing.version + 1 })
        .where(eq(projectStyleMemory.id, existing.id))
    } else {
      await db.insert(projectStyleMemory).values({
        id: crypto.randomUUID(),
        projectId,
        version: 1,
        createdAt: now,
        ...values,
      })
    }

    const saved = await db
      .select()
      .from(projectStyleMemory)
      .where(eq(projectStyleMemory.projectId, projectId))
      .get()

    if (!saved) {
      return c.json({ error: "Failed to persist style memory" }, 500)
    }

    return c.json({ memory: toMemoryDto(saved) })
  }
)

export { writerSkillsRouter }
