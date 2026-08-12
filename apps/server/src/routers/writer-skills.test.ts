import { Hono } from "hono"
import { beforeAll, describe, expect, it, vi } from "vitest"

// Real router + middleware + Drizzle against an in-memory libsql database,
// same harness as admin.test.ts/graph-expansion.test.ts. Only Better Auth's
// session lookup and the AI completion call are stubbed so we can control
// caller identity/role and the model's response deterministically.

vi.mock("../db", async () => {
  const mod = await import("../test/test-db")
  return { db: mod.testDb }
})

const sessionState = vi.hoisted(() => ({
  current: null as null | {
    user: { id: string; email: string; name: string }
    session: { id: string; userId: string }
  },
}))

vi.mock("../lib/auth", () => ({
  getAuth: () => ({
    api: {
      getSession: () => Promise.resolve(sessionState.current),
    },
  }),
}))

const runCompletionForUser = vi.hoisted(() => vi.fn())
vi.mock("./ai", async () => {
  const hono = await import("hono")
  return {
    aiRouter: new hono.Hono(),
    isCompletionFailure: (result: object) => "status" in result,
    runCompletionForUser,
  }
})

import { and, eq } from "drizzle-orm"
import {
  chapter,
  member,
  organization,
  project,
  projectStyleMemory,
  projectWriterSkill,
  user,
  work,
  writerSkill,
} from "../db/schema"
import { applyMigrations, testDb } from "../test/test-db"
import { apiRouter } from "./index"

const OWNER_ID = "ws-owner"
const MEMBER_ID = "ws-member"
const OTHER_ORG_MEMBER_ID = "ws-other-org-member"
const ORG_ID = "ws-org"
const OTHER_PROJECT_ID = "ws-other-project"
const PROJECT_ID = "ws-project"

const app = new Hono()
app.route("/api", apiRouter)

const ENV = {
  BETTER_AUTH_SECRET: "test",
  BETTER_AUTH_URL: "http://localhost",
  CORS_ORIGIN: "http://localhost",
}

function request(path: string, init?: RequestInit) {
  return app.request(
    `http://localhost${path}`,
    { ...init, headers: { "Content-Type": "application/json", ...init?.headers } },
    ENV
  )
}

function actAsOwner() {
  sessionState.current = {
    user: { id: OWNER_ID, email: "owner@example.com", name: "Owner" },
    session: { id: "owner-session", userId: OWNER_ID },
  }
}

function actAsMember() {
  sessionState.current = {
    user: { id: MEMBER_ID, email: "member@example.com", name: "Member" },
    session: { id: "member-session", userId: MEMBER_ID },
  }
}

function actAsOutsider() {
  sessionState.current = {
    user: { id: OTHER_ORG_MEMBER_ID, email: "outsider@example.com", name: "Outsider" },
    session: { id: "outsider-session", userId: OTHER_ORG_MEMBER_ID },
  }
}

beforeAll(async () => {
  await applyMigrations()

  const now = new Date()
  await testDb.insert(user).values([
    {
      id: OWNER_ID,
      name: "Owner",
      email: "owner@example.com",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: MEMBER_ID,
      name: "Member",
      email: "member@example.com",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: OTHER_ORG_MEMBER_ID,
      name: "Outsider",
      email: "outsider@example.com",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    },
  ])
  await testDb.insert(organization).values([
    { id: ORG_ID, name: "WS Org", slug: "ws-org", createdAt: now, updatedAt: now },
    {
      id: "some-other-org",
      name: "Some Other Org",
      slug: "some-other-org",
      createdAt: now,
      updatedAt: now,
    },
  ])
  await testDb.insert(member).values([
    {
      id: "ws-member-owner",
      userId: OWNER_ID,
      organizationId: ORG_ID,
      role: "owner",
      createdAt: now,
    },
    {
      id: "ws-member-plain",
      userId: MEMBER_ID,
      organizationId: ORG_ID,
      role: "member",
      createdAt: now,
    },
  ])
  await testDb.insert(project).values([
    {
      id: PROJECT_ID,
      title: "WS Project",
      type: "novel",
      status: "draft",
      visibility: "private",
      ownerId: OWNER_ID,
      organizationId: ORG_ID,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: OTHER_PROJECT_ID,
      title: "Someone Else's Project",
      type: "novel",
      status: "draft",
      visibility: "private",
      ownerId: OWNER_ID,
      organizationId: "some-other-org",
      createdAt: now,
      updatedAt: now,
    },
  ])
})

describe("GET /projects/:projectId/writer-skills (catalog)", () => {
  it("seeds and returns the built-in skills for any project member", async () => {
    actAsMember()
    const res = await request(`/api/projects/${PROJECT_ID}/writer-skills`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { skills: { builtIn: boolean; id: string }[] }
    expect(body.skills.filter((s) => s.builtIn).length).toBe(3)
  })

  it("rejects access to a project outside the caller's organization", async () => {
    actAsOwner()
    const res = await request(`/api/projects/${OTHER_PROJECT_ID}/writer-skills`)
    expect(res.status).toBe(404)
  })

  it("rejects an unauthenticated request", async () => {
    sessionState.current = null
    const res = await request(`/api/projects/${PROJECT_ID}/writer-skills`)
    expect(res.status).toBe(401)
  })

  it("rejects a user with no organization membership at all", async () => {
    actAsOutsider()
    const res = await request(`/api/projects/${PROJECT_ID}/writer-skills`)
    expect(res.status).toBe(400)
  })
})

describe("POST /projects/:projectId/writer-skills (create)", () => {
  it("rejects a plain member (view-only)", async () => {
    actAsMember()
    const res = await request(`/api/projects/${PROJECT_ID}/writer-skills`, {
      method: "POST",
      body: JSON.stringify({
        format: "json",
        content: JSON.stringify({ name: "N", instructions: "I" }),
      }),
    })
    expect(res.status).toBe(403)
  })

  it("allows the project owner to import a JSON skill", async () => {
    actAsOwner()
    const res = await request(`/api/projects/${PROJECT_ID}/writer-skills`, {
      method: "POST",
      body: JSON.stringify({
        format: "json",
        content: JSON.stringify({
          name: "Custom Skill",
          instructions: "Do the custom thing.",
          checklist: ["step one"],
        }),
      }),
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as { skill: { createdBy: string; id: string; name: string } }
    expect(body.skill.name).toBe("Custom Skill")
    expect(body.skill.createdBy).toBe(OWNER_ID)
  })

  it("imports a markdown skill", async () => {
    actAsOwner()
    const res = await request(`/api/projects/${PROJECT_ID}/writer-skills`, {
      method: "POST",
      body: JSON.stringify({
        format: "markdown",
        content: "# Markdown Skill\n## Instructions\nDo the markdown thing.",
      }),
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as { skill: { name: string } }
    expect(body.skill.name).toBe("Markdown Skill")
  })

  it("rejects an invalid skill payload with validation details", async () => {
    actAsOwner()
    const res = await request(`/api/projects/${PROJECT_ID}/writer-skills`, {
      method: "POST",
      body: JSON.stringify({ format: "json", content: JSON.stringify({ name: "Only name" }) }),
    })
    expect(res.status).toBe(400)
    const body = (await res.json()) as { details: string[]; error: string }
    expect(body.error).toBeTruthy()
    expect(Array.isArray(body.details)).toBe(true)
  })

  it("rejects an unknown format value", async () => {
    actAsOwner()
    const res = await request(`/api/projects/${PROJECT_ID}/writer-skills`, {
      method: "POST",
      body: JSON.stringify({ format: "xml", content: "whatever" }),
    })
    expect(res.status).toBe(400)
  })
})

describe("PUT/DELETE /projects/:projectId/writer-skills/:skillId (owned skill mutation)", () => {
  let ownedSkillId = ""
  let builtInSkillId = ""

  beforeAll(async () => {
    actAsOwner()
    const createRes = await request(`/api/projects/${PROJECT_ID}/writer-skills`, {
      method: "POST",
      body: JSON.stringify({
        format: "json",
        content: JSON.stringify({ name: "Mutable Skill", instructions: "Original instructions." }),
      }),
    })
    ownedSkillId = ((await createRes.json()) as { skill: { id: string } }).skill.id

    const builtIn = await testDb
      .select()
      .from(writerSkill)
      .where(eq(writerSkill.builtIn, true))
      .get()
    builtInSkillId = builtIn?.id ?? ""
  })

  it("lets the owner update their own skill", async () => {
    actAsOwner()
    const res = await request(`/api/projects/${PROJECT_ID}/writer-skills/${ownedSkillId}`, {
      method: "PUT",
      body: JSON.stringify({ name: "Renamed Skill" }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { skill: { name: string } }
    expect(body.skill.name).toBe("Renamed Skill")
  })

  it("rejects a plain member updating a skill even though they can view", async () => {
    actAsMember()
    const res = await request(`/api/projects/${PROJECT_ID}/writer-skills/${ownedSkillId}`, {
      method: "PUT",
      body: JSON.stringify({ name: "Hijacked" }),
    })
    expect(res.status).toBe(403)
  })

  it("rejects mutating a built-in skill", async () => {
    actAsOwner()
    const res = await request(`/api/projects/${PROJECT_ID}/writer-skills/${builtInSkillId}`, {
      method: "PUT",
      body: JSON.stringify({ name: "Hijacked Built-in" }),
    })
    expect(res.status).toBe(403)
  })

  it("returns 404 for a nonexistent skill id", async () => {
    actAsOwner()
    const res = await request(`/api/projects/${PROJECT_ID}/writer-skills/does-not-exist`, {
      method: "PUT",
      body: JSON.stringify({ name: "X" }),
    })
    expect(res.status).toBe(404)
  })

  it("deletes the owner's own skill", async () => {
    actAsOwner()
    const res = await request(`/api/projects/${PROJECT_ID}/writer-skills/${ownedSkillId}`, {
      method: "DELETE",
    })
    expect(res.status).toBe(200)

    const row = await testDb
      .select()
      .from(writerSkill)
      .where(eq(writerSkill.id, ownedSkillId))
      .get()
    expect(row).toBeUndefined()
  })
})

describe("binding + ordering endpoints", () => {
  let skillAId = ""
  let skillBId = ""

  beforeAll(async () => {
    actAsOwner()
    const resA = await request(`/api/projects/${PROJECT_ID}/writer-skills`, {
      method: "POST",
      body: JSON.stringify({
        format: "json",
        content: JSON.stringify({ name: "Binding Skill A", instructions: "A." }),
      }),
    })
    skillAId = ((await resA.json()) as { skill: { id: string } }).skill.id

    const resB = await request(`/api/projects/${PROJECT_ID}/writer-skills`, {
      method: "POST",
      body: JSON.stringify({
        format: "json",
        content: JSON.stringify({ name: "Binding Skill B", instructions: "B." }),
      }),
    })
    skillBId = ((await resB.json()) as { skill: { id: string } }).skill.id
  })

  it("rejects a plain member binding a skill", async () => {
    actAsMember()
    const res = await request(`/api/projects/${PROJECT_ID}/writer-skills/${skillAId}/binding`, {
      method: "PUT",
      body: JSON.stringify({ enabled: true }),
    })
    expect(res.status).toBe(403)
  })

  it("binds skill A as enabled (owner)", async () => {
    actAsOwner()
    const res = await request(`/api/projects/${PROJECT_ID}/writer-skills/${skillAId}/binding`, {
      method: "PUT",
      body: JSON.stringify({ enabled: true }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { binding: { enabled: boolean; order: number } }
    expect(body.binding.enabled).toBe(true)
  })

  it("binds skill B as enabled", async () => {
    actAsOwner()
    const res = await request(`/api/projects/${PROJECT_ID}/writer-skills/${skillBId}/binding`, {
      method: "PUT",
      body: JSON.stringify({ enabled: true }),
    })
    expect(res.status).toBe(200)
  })

  it("reorders the bound skills", async () => {
    actAsOwner()
    const res = await request(`/api/projects/${PROJECT_ID}/writer-skills/order`, {
      method: "PUT",
      body: JSON.stringify({ skillIds: [skillBId, skillAId] }),
    })
    expect(res.status).toBe(200)

    const bindings = await testDb
      .select()
      .from(projectWriterSkill)
      .where(eq(projectWriterSkill.projectId, PROJECT_ID))
    const bIndex = bindings.find((b) => b.skillId === skillBId)?.order
    const aIndex = bindings.find((b) => b.skillId === skillAId)?.order
    expect(bIndex).toBeLessThan(aIndex ?? Number.POSITIVE_INFINITY)
  })

  it("rejects reordering with a mismatched skillIds set", async () => {
    actAsOwner()
    const res = await request(`/api/projects/${PROJECT_ID}/writer-skills/order`, {
      method: "PUT",
      body: JSON.stringify({ skillIds: [skillAId] }),
    })
    expect(res.status).toBe(400)
  })

  it("disables a binding", async () => {
    actAsOwner()
    const res = await request(`/api/projects/${PROJECT_ID}/writer-skills/${skillAId}/binding`, {
      method: "PUT",
      body: JSON.stringify({ enabled: false }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { binding: { enabled: boolean } }
    expect(body.binding.enabled).toBe(false)
  })

  it("unbinds skill B entirely", async () => {
    actAsOwner()
    const res = await request(`/api/projects/${PROJECT_ID}/writer-skills/${skillBId}/binding`, {
      method: "DELETE",
    })
    expect(res.status).toBe(200)

    const remaining = await testDb
      .select()
      .from(projectWriterSkill)
      .where(
        and(eq(projectWriterSkill.projectId, PROJECT_ID), eq(projectWriterSkill.skillId, skillBId))
      )
    expect(remaining).toHaveLength(0)
  })
})

describe("GET /projects/:projectId/writer-skills/memory", () => {
  it("returns null when no memory has been learned yet", async () => {
    actAsMember()
    const res = await request(`/api/projects/${PROJECT_ID}/writer-skills/memory`)
    expect(res.status).toBe(200)
    expect(((await res.json()) as { memory: unknown }).memory).toBeNull()
  })
})

describe("POST /projects/:projectId/writer-skills/learn", () => {
  it("rejects a plain member triggering learning", async () => {
    actAsMember()
    const res = await request(`/api/projects/${PROJECT_ID}/writer-skills/learn`, {
      method: "POST",
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(403)
  })

  it("returns an explicit no_manuscript_text error when there's no chapter content", async () => {
    actAsOwner()
    const res = await request(`/api/projects/${PROJECT_ID}/writer-skills/learn`, {
      method: "POST",
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(422)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe("no_manuscript_text")
    expect(runCompletionForUser).not.toHaveBeenCalled()
  })

  it("passes through a no_provider failure without silently falling back", async () => {
    actAsOwner()
    const now = new Date()
    const workId = "ws-work-learn"
    await testDb.insert(work).values({
      id: workId,
      projectId: PROJECT_ID,
      title: "Learn Work",
      workType: "novel",
      createdAt: now,
      updatedAt: now,
    })
    await testDb.insert(chapter).values({
      id: "ws-chapter-learn",
      title: "Chapter One",
      content: `<p>${"A long enough chapter of prose to pass the minimum sample size. ".repeat(10)}</p>`,
      order: 1,
      workId,
      createdAt: now,
      updatedAt: now,
    })

    runCompletionForUser.mockResolvedValueOnce({
      error: "No AI provider configured.",
      code: "no_provider",
      status: 412,
    })

    const res = await request(`/api/projects/${PROJECT_ID}/writer-skills/learn`, {
      method: "POST",
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(412)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe("no_provider")
  })

  it("returns 502 when the model doesn't return a valid style profile", async () => {
    actAsOwner()
    runCompletionForUser.mockResolvedValueOnce({
      message: "I decline to produce JSON today.",
      provider: "openrouter",
      model: "test-model",
    })

    const res = await request(`/api/projects/${PROJECT_ID}/writer-skills/learn`, {
      method: "POST",
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(502)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe("invalid_style_profile")
  })

  it("persists a valid style profile and is retrievable via the memory endpoint", async () => {
    actAsOwner()
    const profile = {
      voice: "Wry, understated.",
      sentenceRhythm: "Short declaratives.",
      povTense: "Close third, past.",
      dialogue: "Clipped.",
      imagery: "Coastal.",
      pacing: "Fast then slow.",
      avoid: ["semicolons"],
    }
    runCompletionForUser.mockResolvedValueOnce({
      message: JSON.stringify(profile),
      provider: "openrouter",
      model: "test-model",
    })

    const res = await request(`/api/projects/${PROJECT_ID}/writer-skills/learn`, {
      method: "POST",
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { memory: { profile: typeof profile; version: number } }
    expect(body.memory.profile).toEqual(profile)
    expect(body.memory.version).toBe(1)

    actAsMember()
    const memRes = await request(`/api/projects/${PROJECT_ID}/writer-skills/memory`)
    const memBody = (await memRes.json()) as { memory: { profile: typeof profile } | null }
    expect(memBody.memory?.profile).toEqual(profile)

    const stored = await testDb
      .select()
      .from(projectStyleMemory)
      .where(eq(projectStyleMemory.projectId, PROJECT_ID))
      .get()
    expect(stored).toBeDefined()
  })

  it("bumps the version on a second learn call instead of duplicating the row", async () => {
    actAsOwner()
    const profile = {
      voice: "Updated voice.",
      sentenceRhythm: "Longer, looser.",
      povTense: "First person, present.",
      dialogue: "Talkative.",
      imagery: "Urban.",
      pacing: "Steady.",
      avoid: ["info dumps"],
    }
    runCompletionForUser.mockResolvedValueOnce({
      message: JSON.stringify(profile),
      provider: "openrouter",
      model: "test-model-2",
    })

    const res = await request(`/api/projects/${PROJECT_ID}/writer-skills/learn`, {
      method: "POST",
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { memory: { version: number } }
    expect(body.memory.version).toBe(2)

    const rows = await testDb
      .select()
      .from(projectStyleMemory)
      .where(eq(projectStyleMemory.projectId, PROJECT_ID))
    expect(rows).toHaveLength(1)
  })
})
