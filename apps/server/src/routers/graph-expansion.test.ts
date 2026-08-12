import { Hono } from "hono"
import { beforeAll, describe, expect, it, vi } from "vitest"

// Same harness as integration.test.ts: real routers + middleware + Drizzle
// against in-memory libsql; only the auth provider and the AI completion
// call are stubbed.

vi.mock("../db", async () => {
  const mod = await import("../test/test-db")
  return { db: mod.testDb }
})

vi.mock("../lib/auth", () => ({
  getAuth: () => ({
    api: {
      getSession: () =>
        Promise.resolve({
          user: { id: "graph-user", email: "graph@example.com", name: "Graph Writer" },
          session: { id: "graph-session", userId: "graph-user" },
        }),
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

import { eq } from "drizzle-orm"
import {
  chapter,
  graphConnection,
  graphNode,
  member,
  organization,
  project,
  user,
} from "../db/schema"
import { applyMigrations, testDb } from "../test/test-db"
import { apiRouter } from "./index"

const USER_ID = "graph-user"
const ORG_ID = "graph-org"
const PROJECT_ID = "graph-project"

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

async function createNode(subType: string, title: string): Promise<string> {
  const res = await request(`/api/projects/${PROJECT_ID}/graph/nodes`, {
    method: "POST",
    body: JSON.stringify({ nodeType: "story_element", subType, title }),
  })
  expect(res.status).toBe(201)
  return ((await res.json()) as { id: string }).id
}

beforeAll(async () => {
  await applyMigrations()

  const now = new Date()
  await testDb.insert(user).values({
    id: USER_ID,
    name: "Graph Writer",
    email: "graph@example.com",
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  })
  await testDb.insert(organization).values({
    id: ORG_ID,
    name: "Graph Org",
    slug: "graph-org",
    createdAt: now,
    updatedAt: now,
  })
  await testDb.insert(member).values({
    id: "graph-member",
    userId: USER_ID,
    organizationId: ORG_ID,
    role: "owner",
    createdAt: now,
  })
  await testDb.insert(project).values({
    id: PROJECT_ID,
    title: "Graph Project",
    type: "novel",
    status: "draft",
    visibility: "private",
    ownerId: USER_ID,
    organizationId: ORG_ID,
    createdAt: now,
    updatedAt: now,
  })
})

describe("node expansion endpoint", () => {
  it("expands a premise into connected act nodes", async () => {
    const premiseId = await createNode("premise", "A keeper guides ghost ships")

    runCompletionForUser.mockResolvedValueOnce({
      message: JSON.stringify([
        { title: "Act I", description: "The first ship arrives." },
        { title: "Act II", description: "The pattern breaks." },
        { title: "Act III", description: "The light goes out." },
      ]),
      provider: "openrouter",
      model: "test-model",
    })

    const res = await request(`/api/projects/${PROJECT_ID}/graph/nodes/${premiseId}/expand`, {
      method: "POST",
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      nodes: { id: string; subType: string; title: string }[]
      connections: { connectionType: string; sourceNodeId: string; targetNodeId: string }[]
    }

    expect(body.nodes).toHaveLength(3)
    expect(body.nodes.every((n) => n.subType === "act")).toBe(true)

    // 3 parent→child expansion edges + 2 sibling story_flow edges
    const expansionEdges = body.connections.filter((c) => c.connectionType === "reference")
    const flowEdges = body.connections.filter((c) => c.connectionType === "story_flow")
    expect(expansionEdges).toHaveLength(3)
    expect(flowEdges).toHaveLength(2)
    expect(expansionEdges.every((c) => c.sourceNodeId === premiseId)).toBe(true)
    expect(flowEdges[0]).toMatchObject({
      sourceNodeId: body.nodes[0].id,
      targetNodeId: body.nodes[1].id,
    })

    // Children persist with a parent link for ancestry-aware prompts
    const stored = await testDb.select().from(graphNode).where(eq(graphNode.id, body.nodes[0].id))
    expect(JSON.parse(stored[0].metadata ?? "{}").parentNodeId).toBe(premiseId)

    const edges = await testDb
      .select()
      .from(graphConnection)
      .where(eq(graphConnection.projectId, PROJECT_ID))
    expect(edges).toHaveLength(5)
  })

  it("returns 502 when the model output is not parseable", async () => {
    const actId = await createNode("act", "Act IV")
    runCompletionForUser.mockResolvedValueOnce({
      message: "Sorry, I would rather write a poem.",
      provider: "openrouter",
      model: "test-model",
    })

    const res = await request(`/api/projects/${PROJECT_ID}/graph/nodes/${actId}/expand`, {
      method: "POST",
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(502)
  })

  it("passes through provider failures like no_provider", async () => {
    const actId = await createNode("act", "Act V")
    runCompletionForUser.mockResolvedValueOnce({
      error: "No AI provider configured.",
      code: "no_provider",
      status: 412,
    })

    const res = await request(`/api/projects/${PROJECT_ID}/graph/nodes/${actId}/expand`, {
      method: "POST",
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(412)
    expect(((await res.json()) as { code: string }).code).toBe("no_provider")
  })

  it("rejects expanding a leaf-level node", async () => {
    const beatId = await createNode("beat", "A single look")
    const res = await request(`/api/projects/${PROJECT_ID}/graph/nodes/${beatId}/expand`, {
      method: "POST",
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
  })
})

describe("promote-to-manuscript endpoint", () => {
  let chapterNodeId = ""

  it("creates a real chapter from a chapter node with its text blocks", async () => {
    chapterNodeId = await createNode("chapter", "The Fog Bell")
    await request(`/api/projects/${PROJECT_ID}/graph/nodes/${chapterNodeId}`, {
      method: "PUT",
      body: JSON.stringify({ description: "Mara hears the bell at noon." }),
    })
    await request(`/api/projects/${PROJECT_ID}/graph/nodes/${chapterNodeId}/text-blocks`, {
      method: "POST",
      body: JSON.stringify({
        storyNodeId: chapterNodeId,
        content: "The bell rang twice.\n\nNo ship <appeared>.",
      }),
    })

    const res = await request(`/api/projects/${PROJECT_ID}/graph/nodes/${chapterNodeId}/promote`, {
      method: "POST",
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { chapterId: string; alreadyPromoted: boolean }
    expect(body.alreadyPromoted).toBe(false)

    const rows = await testDb.select().from(chapter).where(eq(chapter.id, body.chapterId))
    expect(rows).toHaveLength(1)
    expect(rows[0].title).toBe("The Fog Bell")
    expect(rows[0].summary).toBe("Mara hears the bell at noon.")
    expect(rows[0].content).toBe("<p>The bell rang twice.</p><p>No ship &lt;appeared&gt;.</p>")
    // countWordsInHtml tokenizes the escaped "&lt;appeared&gt;." as two words
    expect(rows[0].wordCount).toBe(8)
  })

  it("does not duplicate the chapter when promoted twice", async () => {
    const res = await request(`/api/projects/${PROJECT_ID}/graph/nodes/${chapterNodeId}/promote`, {
      method: "POST",
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(200)
    expect(((await res.json()) as { alreadyPromoted: boolean }).alreadyPromoted).toBe(true)

    const rows = await testDb.select().from(chapter)
    expect(rows.filter((row) => row.title === "The Fog Bell")).toHaveLength(1)
  })

  it("rejects promoting a non-chapter node", async () => {
    const sceneId = await createNode("scene", "Not a chapter")
    const res = await request(`/api/projects/${PROJECT_ID}/graph/nodes/${sceneId}/promote`, {
      method: "POST",
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
  })
})
