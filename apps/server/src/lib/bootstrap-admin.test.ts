import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Exercise the real bootstrap logic against an in-memory database, stubbing
// only Better Auth's `signUpEmail` call (password hashing / account+session
// creation is Better Auth's job, not ours).

vi.mock("../db", async () => {
  const mod = await import("../test/test-db")
  return { db: mod.testDb }
})

const mockSignUpEmail = vi.hoisted(() => vi.fn())

vi.mock("./auth", () => ({
  SUPERADMIN_EMAIL: "zongyangpolo@gmail.com",
  SUPERADMIN_ROLE: "superadmin",
  getAuth: () => ({
    api: {
      signUpEmail: mockSignUpEmail,
    },
  }),
}))

import { eq } from "drizzle-orm"
import { user } from "../db/schema"
import { applyMigrations, testDb } from "../test/test-db"
import { ensureSuperadminBootstrap, resetSuperadminBootstrapForTests } from "./bootstrap-admin"

const ENV = {
  BETTER_AUTH_SECRET: "test",
  BETTER_AUTH_URL: "http://localhost",
  CORS_ORIGIN: "http://localhost",
}

function findByEmail(email: string) {
  return testDb.select().from(user).where(eq(user.email, email)).get()
}

beforeEach(async () => {
  await applyMigrations()
  resetSuperadminBootstrapForTests()
  mockSignUpEmail.mockReset()
})

afterEach(async () => {
  // Each test asserts on a clean slate; the in-memory DB is shared across
  // tests in this file, so clear out any users a previous test created.
  await testDb.delete(user)
})

describe("ensureSuperadminBootstrap", () => {
  it("no-ops when ADMIN_EMAIL/ADMIN_PASSWORD are not configured", async () => {
    await ensureSuperadminBootstrap(ENV)
    expect(mockSignUpEmail).not.toHaveBeenCalled()
    expect(await findByEmail("zongyangpolo@gmail.com")).toBeUndefined()
  })

  it("skips bootstrap when ADMIN_EMAIL doesn't match the fixed superadmin email", async () => {
    await ensureSuperadminBootstrap({
      ...ENV,
      ADMIN_EMAIL: "someone-else@example.com",
      ADMIN_PASSWORD: "super-secret-password",
    })
    expect(mockSignUpEmail).not.toHaveBeenCalled()
    expect(await findByEmail("someone-else@example.com")).toBeUndefined()
  })

  it("creates and promotes the fixed superadmin account when it doesn't exist", async () => {
    mockSignUpEmail.mockImplementation(
      async ({ body }: { body: { email: string; name: string } }) => {
        // Simulate what Better Auth's real signUpEmail does: create the user
        // row (with a hashed password in a separate `account` row we don't
        // need for this test) and return it.
        const now = new Date()
        await testDb.insert(user).values({
          id: "bootstrap-created-user",
          name: body.name,
          email: body.email,
          emailVerified: false,
          createdAt: now,
          updatedAt: now,
        })
        return { token: "fake-token", user: { id: "bootstrap-created-user", email: body.email } }
      }
    )

    await ensureSuperadminBootstrap({
      ...ENV,
      ADMIN_EMAIL: "zongyangpolo@gmail.com",
      ADMIN_PASSWORD: "super-secret-password",
    })

    expect(mockSignUpEmail).toHaveBeenCalledTimes(1)
    // The plaintext password must be handed to Better Auth and never stored
    // by our own code — assert the call body carries it through as-is
    // (Better Auth hashes it internally) and that we never persist it
    // ourselves anywhere in the `user` table.
    expect(mockSignUpEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          email: "zongyangpolo@gmail.com",
          password: "super-secret-password",
        }),
      })
    )

    const created = await findByEmail("zongyangpolo@gmail.com")
    expect(created?.role).toBe("superadmin")
    expect(created?.emailVerified).toBe(true)
    for (const value of Object.values(created ?? {})) {
      expect(value).not.toBe("super-secret-password")
    }
  })

  it("is idempotent: calling it again does not re-create or re-hash anything", async () => {
    mockSignUpEmail.mockImplementation(
      async ({ body }: { body: { email: string; name: string } }) => {
        const now = new Date()
        await testDb.insert(user).values({
          id: "bootstrap-created-user-2",
          name: body.name,
          email: body.email,
          emailVerified: false,
          createdAt: now,
          updatedAt: now,
        })
        return { token: "fake-token", user: { id: "bootstrap-created-user-2", email: body.email } }
      }
    )

    const env = {
      ...ENV,
      ADMIN_EMAIL: "zongyangpolo@gmail.com",
      ADMIN_PASSWORD: "super-secret-password",
    }

    await ensureSuperadminBootstrap(env)
    expect(mockSignUpEmail).toHaveBeenCalledTimes(1)

    // Second call within the same isolate reuses the cached promise and
    // never touches signUpEmail (or the DB) again.
    await ensureSuperadminBootstrap(env)
    expect(mockSignUpEmail).toHaveBeenCalledTimes(1)

    // Simulate a fresh isolate (new cold start) re-attempting bootstrap:
    // the account already exists with the right role, so it must stay a
    // pure no-op — no further signUpEmail calls, no password rotation.
    resetSuperadminBootstrapForTests()
    await ensureSuperadminBootstrap(env)
    expect(mockSignUpEmail).toHaveBeenCalledTimes(1)
  })

  it("promotes an existing account to superadmin without touching its password", async () => {
    const now = new Date()
    await testDb.insert(user).values({
      id: "pre-existing-user",
      name: "Zongyang Polo",
      email: "zongyangpolo@gmail.com",
      emailVerified: true,
      role: "user",
      createdAt: now,
      updatedAt: now,
    })

    await ensureSuperadminBootstrap({
      ...ENV,
      ADMIN_EMAIL: "zongyangpolo@gmail.com",
      ADMIN_PASSWORD: "super-secret-password",
    })

    // Existing accounts are only promoted — signUpEmail must never be
    // called (that would risk clobbering their existing password).
    expect(mockSignUpEmail).not.toHaveBeenCalled()

    const promoted = await findByEmail("zongyangpolo@gmail.com")
    expect(promoted?.role).toBe("superadmin")
  })
})
