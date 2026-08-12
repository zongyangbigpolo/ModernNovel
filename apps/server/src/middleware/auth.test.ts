import { Hono } from "hono"
import { beforeAll, describe, expect, it, vi } from "vitest"

// Exercise the real `requireAuth`/`requireSuperadmin` middleware against an
// in-memory database, stubbing only Better Auth's `getSession` call so each
// test can control exactly what session is "returned" for a request.

vi.mock("../db", async () => {
  const mod = await import("../test/test-db")
  return { db: mod.testDb }
})

const sessionState = vi.hoisted(() => ({
  current: null as null | {
    user: {
      id: string
      email: string
      name: string
      role?: string | null
      banned?: boolean | null
    }
    session: { id: string; userId: string; activeOrganizationId?: string | null }
  },
}))

vi.mock("../lib/auth", () => ({
  SUPERADMIN_EMAIL: "zongyangpolo@gmail.com",
  SUPERADMIN_ROLE: "superadmin",
  getAuth: () => ({
    api: {
      getSession: () => Promise.resolve(sessionState.current),
    },
  }),
}))

import { member, organization, user } from "../db/schema"
import { requireAuth, requireSuperadmin } from "../middleware/auth"
import { applyMigrations, testDb } from "../test/test-db"

const USER_ID = "auth-test-user"
const ORG_A = "auth-test-org-a"
const ORG_B = "auth-test-org-b"

interface TestEnv {
  BETTER_AUTH_SECRET: string
  BETTER_AUTH_URL: string
  CORS_ORIGIN: string
}

interface TestVariables {
  activeOrganization: { id: string; name: string; slug: string } | null
  session: { id: string; userId: string }
  user: {
    id: string
    email: string
    name: string
    role?: string | null
    banned?: boolean | null
  }
}

const app = new Hono<{ Bindings: TestEnv; Variables: TestVariables }>()
app.get("/protected", requireAuth, (c) =>
  c.json({ ok: true, activeOrganization: c.get("activeOrganization") })
)
app.get("/superadmin-only", requireAuth, requireSuperadmin, (c) => c.json({ ok: true }))

function request(path: string) {
  return app.request(`http://localhost${path}`, {}, {})
}

beforeAll(async () => {
  await applyMigrations()

  const now = new Date()
  await testDb.insert(user).values({
    id: USER_ID,
    name: "Auth Tester",
    email: "auth-tester@example.com",
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  })
  await testDb.insert(organization).values([
    { id: ORG_A, name: "Org A", slug: "org-a", createdAt: now, updatedAt: now },
    { id: ORG_B, name: "Org B", slug: "org-b", createdAt: now, updatedAt: now },
  ])
  // User is only ever a member of Org A and Org B, in that insertion order —
  // Org A is the "first membership" fallback.
  await testDb.insert(member).values([
    {
      id: "auth-test-member-a",
      userId: USER_ID,
      organizationId: ORG_A,
      role: "owner",
      createdAt: now,
    },
    {
      id: "auth-test-member-b",
      userId: USER_ID,
      organizationId: ORG_B,
      role: "member",
      createdAt: now,
    },
  ])
})

describe("requireAuth", () => {
  it("rejects requests with no session", async () => {
    sessionState.current = null
    const res = await request("/protected")
    expect(res.status).toBe(401)
  })

  it("rejects banned users even if a session is returned", async () => {
    sessionState.current = {
      user: { id: USER_ID, email: "auth-tester@example.com", name: "Auth Tester", banned: true },
      session: { id: "s1", userId: USER_ID },
    }
    const res = await request("/protected")
    expect(res.status).toBe(403)
  })

  it("uses session.activeOrganizationId when the user is a member of it", async () => {
    sessionState.current = {
      user: { id: USER_ID, email: "auth-tester@example.com", name: "Auth Tester", banned: false },
      session: { id: "s2", userId: USER_ID, activeOrganizationId: ORG_B },
    }
    const res = await request("/protected")
    expect(res.status).toBe(200)
    const body = (await res.json()) as { activeOrganization: { id: string } }
    expect(body.activeOrganization.id).toBe(ORG_B)
  })

  it("falls back to the first membership when activeOrganizationId is unset", async () => {
    sessionState.current = {
      user: { id: USER_ID, email: "auth-tester@example.com", name: "Auth Tester", banned: false },
      session: { id: "s3", userId: USER_ID, activeOrganizationId: null },
    }
    const res = await request("/protected")
    expect(res.status).toBe(200)
    const body = (await res.json()) as { activeOrganization: { id: string } }
    expect(body.activeOrganization.id).toBe(ORG_A)
  })

  it("falls back to the first membership when activeOrganizationId points at an org the user isn't in", async () => {
    sessionState.current = {
      user: { id: USER_ID, email: "auth-tester@example.com", name: "Auth Tester", banned: false },
      session: {
        id: "s4",
        userId: USER_ID,
        activeOrganizationId: "some-other-org-not-a-member-of",
      },
    }
    const res = await request("/protected")
    expect(res.status).toBe(200)
    const body = (await res.json()) as { activeOrganization: { id: string } }
    expect(body.activeOrganization.id).toBe(ORG_A)
  })
})

describe("requireSuperadmin", () => {
  it("rejects a regular user", async () => {
    sessionState.current = {
      user: {
        id: USER_ID,
        email: "auth-tester@example.com",
        name: "Auth Tester",
        role: "user",
        banned: false,
      },
      session: { id: "s5", userId: USER_ID },
    }
    const res = await request("/superadmin-only")
    expect(res.status).toBe(403)
  })

  it("allows a superadmin user", async () => {
    sessionState.current = {
      user: {
        id: USER_ID,
        email: "auth-tester@example.com",
        name: "Auth Tester",
        role: "superadmin",
        banned: false,
      },
      session: { id: "s6", userId: USER_ID },
    }
    const res = await request("/superadmin-only")
    expect(res.status).toBe(200)
  })
})
