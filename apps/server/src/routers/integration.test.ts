import { Hono } from "hono"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

// Run the real routers and middleware against an in-memory database, stubbing
// only the auth provider (Better Auth session lookup). Everything else — route
// handlers, project-access checks, Drizzle queries — is the production code.

vi.mock("../db", async () => {
  const mod = await import("../test/test-db")
  return { db: mod.testDb }
})

vi.mock("../lib/auth", () => ({
  getAuth: () => ({
    api: {
      getSession: () =>
        Promise.resolve({
          user: { id: "test-user", email: "writer@example.com", name: "Writer" },
          session: { id: "test-session", userId: "test-user" },
        }),
    },
  }),
}))

import { and, eq } from "drizzle-orm"
import { member, organization, project, user, work, writingSession } from "../db/schema"
import { applyMigrations, testDb } from "../test/test-db"
import { apiRouter } from "./index"

const USER_ID = "test-user"
const ORG_ID = "test-org"
const PROJECT_ID = "test-project"

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
    {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    },
    ENV
  )
}

beforeAll(async () => {
  await applyMigrations()

  const now = new Date()
  await testDb.insert(user).values({
    id: USER_ID,
    name: "Writer",
    email: "writer@example.com",
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  })
  await testDb.insert(organization).values({
    id: ORG_ID,
    name: "Test Org",
    slug: "test-org",
    createdAt: now,
    updatedAt: now,
  })
  await testDb.insert(member).values({
    id: "test-member",
    userId: USER_ID,
    organizationId: ORG_ID,
    role: "owner",
    createdAt: now,
  })
  await testDb.insert(project).values({
    id: PROJECT_ID,
    title: "Test Project",
    type: "novel",
    status: "draft",
    visibility: "private",
    ownerId: USER_ID,
    organizationId: ORG_ID,
    createdAt: now,
    updatedAt: now,
  })
})

describe("character CRUD endpoints", () => {
  let characterId = ""

  it("rejects access to a project outside the user's organization", async () => {
    const res = await request("/api/projects/someone-elses-project/characters")
    expect(res.status).toBe(404)
  })

  it("creates a character", async () => {
    const res = await request(`/api/projects/${PROJECT_ID}/characters`, {
      method: "POST",
      body: JSON.stringify({ name: "Frodo", description: "A reluctant hero" }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; id: string }
    expect(body.success).toBe(true)
    characterId = body.id
  })

  it("rejects a character with no name", async () => {
    const res = await request(`/api/projects/${PROJECT_ID}/characters`, {
      method: "POST",
      body: JSON.stringify({ description: "nameless" }),
    })
    expect(res.status).toBe(400)
  })

  it("lists the created character", async () => {
    const res = await request(`/api/projects/${PROJECT_ID}/characters`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { characters: Array<{ id: string; name: string }> }
    expect(body.characters).toHaveLength(1)
    expect(body.characters[0]).toMatchObject({ id: characterId, name: "Frodo" })
  })

  it("updates the character", async () => {
    const res = await request(`/api/projects/${PROJECT_ID}/characters/${characterId}`, {
      method: "PUT",
      body: JSON.stringify({ name: "Samwise" }),
    })
    expect(res.status).toBe(200)

    const getRes = await request(`/api/projects/${PROJECT_ID}/characters/${characterId}`)
    const body = (await getRes.json()) as { character: { name: string } }
    expect(body.character.name).toBe("Samwise")
  })

  it("deletes the character", async () => {
    const res = await request(`/api/projects/${PROJECT_ID}/characters/${characterId}`, {
      method: "DELETE",
    })
    expect(res.status).toBe(200)

    const listRes = await request(`/api/projects/${PROJECT_ID}/characters`)
    const body = (await listRes.json()) as { characters: unknown[] }
    expect(body.characters).toHaveLength(0)
  })
})

describe("chapter content optimistic-concurrency guard", () => {
  let chapterId = ""
  let token0 = ""

  beforeAll(() => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date("2026-06-15T10:00:00.000Z"))
  })

  afterAll(() => {
    vi.useRealTimers()
  })

  it("creates a chapter and reads its initial content token", async () => {
    const createRes = await request(`/api/projects/${PROJECT_ID}/chapters`, {
      method: "POST",
      body: JSON.stringify({ title: "Chapter 1" }),
    })
    expect(createRes.status).toBe(201)
    chapterId = ((await createRes.json()) as { id: string }).id

    const getRes = await request(`/api/projects/${PROJECT_ID}/chapters/${chapterId}/content`)
    const body = (await getRes.json()) as { content: string; updatedAt: string }
    expect(body.content).toBe("")
    token0 = body.updatedAt
  })

  it("saves content when the token is current and bumps word count", async () => {
    vi.setSystemTime(new Date("2026-06-15T10:00:05.000Z"))
    const res = await request(`/api/projects/${PROJECT_ID}/chapters/${chapterId}/content`, {
      method: "PUT",
      body: JSON.stringify({ content: "<p>Hello brave world</p>", baseUpdatedAt: token0 }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { wordCount: number; savedAt: string }
    expect(body.wordCount).toBe(3)
    expect(body.savedAt).not.toBe(token0)
  })

  it("rejects a stale write that would clobber the newer version", async () => {
    vi.setSystemTime(new Date("2026-06-15T10:00:09.000Z"))
    const res = await request(`/api/projects/${PROJECT_ID}/chapters/${chapterId}/content`, {
      method: "PUT",
      body: JSON.stringify({ content: "<p>stale overwrite</p>", baseUpdatedAt: token0 }),
    })
    expect(res.status).toBe(409)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe("stale_content")
  })

  it("still allows a blind write when no token is supplied", async () => {
    const res = await request(`/api/projects/${PROJECT_ID}/chapters/${chapterId}/content`, {
      method: "PUT",
      body: JSON.stringify({ content: "<p>forced</p>" }),
    })
    expect(res.status).toBe(200)
  })
})

describe("writing session instrumentation", () => {
  let chapterId = ""

  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ["Date"] })

    const createRes = await request(`/api/projects/${PROJECT_ID}/chapters`, {
      method: "POST",
      body: JSON.stringify({ title: "Instrumented Chapter" }),
    })
    chapterId = ((await createRes.json()) as { id: string }).id
  })

  afterAll(() => {
    vi.useRealTimers()
  })

  function saveContent(content: string) {
    return request(`/api/projects/${PROJECT_ID}/chapters/${chapterId}/content`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    })
  }

  function sessionsForChapter() {
    return testDb
      .select()
      .from(writingSession)
      .where(and(eq(writingSession.chapterId, chapterId), eq(writingSession.userId, USER_ID)))
      .orderBy(writingSession.startTime)
  }

  it("opens a session on the first save and stamps the work", async () => {
    vi.setSystemTime(new Date("2026-07-01T09:00:00.000Z"))
    const res = await saveContent("<p>Hello brave world</p>")
    expect(res.status).toBe(200)

    const sessions = await sessionsForChapter()
    expect(sessions).toHaveLength(1)
    expect(sessions[0].wordsWritten).toBe(3)
    expect(sessions[0].timeSpent).toBe(0)

    const works = await testDb.select().from(work).where(eq(work.projectId, PROJECT_ID))
    expect(works[0].lastWrittenAt?.toISOString()).toBe("2026-07-01T09:00:00.000Z")
  })

  it("rolls a save within the gap into the same session", async () => {
    vi.setSystemTime(new Date("2026-07-01T09:10:00.000Z"))
    const res = await saveContent("<p>Hello brave world of many more words</p>")
    expect(res.status).toBe(200)

    const sessions = await sessionsForChapter()
    expect(sessions).toHaveLength(1)
    expect(sessions[0].wordsWritten).toBe(7) // 3 + (7 - 3) added words
    expect(sessions[0].timeSpent).toBe(10)
    expect(sessions[0].endTime?.toISOString()).toBe("2026-07-01T09:10:00.000Z")
  })

  it("does not count deletions as words written", async () => {
    vi.setSystemTime(new Date("2026-07-01T09:15:00.000Z"))
    const res = await saveContent("<p>Hello world</p>")
    expect(res.status).toBe(200)

    const sessions = await sessionsForChapter()
    expect(sessions).toHaveLength(1)
    expect(sessions[0].wordsWritten).toBe(7)
  })

  it("opens a new session after the idle gap", async () => {
    vi.setSystemTime(new Date("2026-07-01T10:30:00.000Z"))
    const res = await saveContent("<p>Hello world again</p>")
    expect(res.status).toBe(200)

    const sessions = await sessionsForChapter()
    expect(sessions).toHaveLength(2)
    expect(sessions[1].wordsWritten).toBe(1) // 3 - 2 words added
    expect(sessions[1].timeSpent).toBe(0)
  })
})
