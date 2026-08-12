import { Hono } from "hono"
import { beforeAll, describe, expect, it, vi } from "vitest"

// Exercise the real admin router + middleware against an in-memory database.
// Better Auth's own `getSession`/`banUser`/`unbanUser` calls are stubbed so
// we can control the caller's identity and verify the router calls through
// to them correctly (including surfacing their authorization/error results).

vi.mock("../db", async () => {
  const mod = await import("../test/test-db")
  return { db: mod.testDb }
})

const sessionState = vi.hoisted(() => ({
  current: null as null | {
    user: { id: string; email: string; name: string; role?: string | null; banned?: boolean | null }
    session: { id: string; userId: string }
  },
}))

const mockBanUser = vi.hoisted(() => vi.fn())
const mockUnbanUser = vi.hoisted(() => vi.fn())

vi.mock("../lib/auth", () => ({
  SUPERADMIN_EMAIL: "zongyangpolo@gmail.com",
  SUPERADMIN_ROLE: "superadmin",
  getAuth: () => ({
    api: {
      getSession: () => Promise.resolve(sessionState.current),
      banUser: mockBanUser,
      unbanUser: mockUnbanUser,
    },
  }),
}))

import { APIError } from "better-auth"
import { member, organization, user } from "../db/schema"
import { adminRouter } from "../routers/admin"
import { applyMigrations, testDb } from "../test/test-db"

const SUPERADMIN_ID = "admin-test-superadmin"
const REGULAR_USER_ID = "admin-test-regular-user"
const TARGET_USER_ID = "admin-test-target-user"
const ORG_ID = "admin-test-org"

const app = new Hono()
app.route("/api/admin", adminRouter)

function request(path: string, init?: RequestInit) {
  return app.request(
    `http://localhost${path}`,
    { ...init, headers: { "Content-Type": "application/json", ...init?.headers } },
    {}
  )
}

function actAsSuperadmin() {
  sessionState.current = {
    user: {
      id: SUPERADMIN_ID,
      email: "zongyangpolo@gmail.com",
      name: "Super Admin",
      role: "superadmin",
      banned: false,
    },
    session: { id: "admin-session", userId: SUPERADMIN_ID },
  }
}

function actAsRegularUser() {
  sessionState.current = {
    user: {
      id: REGULAR_USER_ID,
      email: "regular@example.com",
      name: "Regular User",
      role: "user",
      banned: false,
    },
    session: { id: "regular-session", userId: REGULAR_USER_ID },
  }
}

beforeAll(async () => {
  await applyMigrations()

  const now = new Date()
  await testDb.insert(user).values([
    {
      id: SUPERADMIN_ID,
      name: "Super Admin",
      email: "zongyangpolo@gmail.com",
      emailVerified: true,
      role: "superadmin",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: REGULAR_USER_ID,
      name: "Regular User",
      email: "regular@example.com",
      emailVerified: true,
      role: "user",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: TARGET_USER_ID,
      name: "Target User",
      email: "target@example.com",
      emailVerified: true,
      role: "user",
      createdAt: now,
      updatedAt: now,
    },
  ])
  await testDb.insert(organization).values({
    id: ORG_ID,
    name: "Admin Test Org",
    slug: "admin-test-org",
    createdAt: now,
    updatedAt: now,
  })
  await testDb.insert(member).values([
    {
      id: "admin-test-member-1",
      userId: SUPERADMIN_ID,
      organizationId: ORG_ID,
      role: "owner",
      createdAt: now,
    },
    {
      id: "admin-test-member-2",
      userId: TARGET_USER_ID,
      organizationId: ORG_ID,
      role: "member",
      createdAt: now,
    },
  ])
})

describe("authorization", () => {
  it("rejects unauthenticated requests", async () => {
    sessionState.current = null
    const res = await request("/api/admin/users")
    expect(res.status).toBe(401)
  })

  it("rejects non-superadmin users", async () => {
    actAsRegularUser()
    const res = await request("/api/admin/users")
    expect(res.status).toBe(403)
  })

  it("allows the superadmin", async () => {
    actAsSuperadmin()
    const res = await request("/api/admin/users")
    expect(res.status).toBe(200)
  })
})

describe("GET /users", () => {
  it("lists every user in the system", async () => {
    actAsSuperadmin()
    const res = await request("/api/admin/users")
    expect(res.status).toBe(200)
    const body = (await res.json()) as { users: Array<{ id: string; email: string }> }
    const ids = body.users.map((u) => u.id)
    expect(ids).toEqual(expect.arrayContaining([SUPERADMIN_ID, REGULAR_USER_ID, TARGET_USER_ID]))
  })
})

describe("GET /workspaces", () => {
  it("lists every organization system-wide with member counts", async () => {
    actAsSuperadmin()
    const res = await request("/api/admin/workspaces")
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      workspaces: Array<{ id: string; memberCount: number }>
    }
    const org = body.workspaces.find((w) => w.id === ORG_ID)
    expect(org).toBeDefined()
    expect(org?.memberCount).toBe(2)
  })
})

describe("disable/enable", () => {
  it("disables a user via Better Auth's banUser API", async () => {
    actAsSuperadmin()
    mockBanUser.mockResolvedValueOnce({
      user: { id: TARGET_USER_ID, banned: true, banReason: "Abuse" },
    })

    const res = await request(`/api/admin/users/${TARGET_USER_ID}/disable`, {
      method: "POST",
      body: JSON.stringify({ reason: "Abuse" }),
    })

    expect(res.status).toBe(200)
    expect(mockBanUser).toHaveBeenCalledWith(
      expect.objectContaining({ body: { userId: TARGET_USER_ID, banReason: "Abuse" } })
    )
  })

  it("enables a user via Better Auth's unbanUser API", async () => {
    actAsSuperadmin()
    mockUnbanUser.mockResolvedValueOnce({ user: { id: TARGET_USER_ID, banned: false } })

    const res = await request(`/api/admin/users/${TARGET_USER_ID}/enable`, { method: "POST" })

    expect(res.status).toBe(200)
    expect(mockUnbanUser).toHaveBeenCalledWith(
      expect.objectContaining({ body: { userId: TARGET_USER_ID } })
    )
  })

  it("translates a Better Auth APIError into a JSON error response", async () => {
    actAsSuperadmin()
    mockBanUser.mockRejectedValueOnce(
      new APIError(400, { message: "You cannot ban yourself", code: "YOU_CANNOT_BAN_YOURSELF" })
    )

    const res = await request(`/api/admin/users/${SUPERADMIN_ID}/disable`, { method: "POST" })
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: string; code: string }
    expect(body.code).toBe("YOU_CANNOT_BAN_YOURSELF")
  })
})
