import { APIError } from "better-auth"
import { count, desc, eq } from "drizzle-orm"
import { type Context, Hono } from "hono"
import { db } from "../db"
import { member, organization, user } from "../db/schema"
import { getAuth } from "../lib/auth"
import { requireAuth, requireSuperadmin } from "../middleware/auth"

interface Env {
  BETTER_AUTH_SECRET: string
  BETTER_AUTH_URL: string
  CORS_ORIGIN: string
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
    role?: string | null
    banned?: boolean | null
  }
}

type AdminContext = Context<{ Bindings: Env; Variables: Variables }>

const adminRouter = new Hono<{ Bindings: Env; Variables: Variables }>()

// Every route on this router requires a valid session AND the fixed
// superadmin role — this is explicit, additive authorization on top of
// (never a replacement for) Better Auth's own admin-plugin permission
// checks, which we also rely on below when delegating to `auth.api.*`.
adminRouter.use("*", requireAuth, requireSuperadmin)

function handleAuthApiError(c: AdminContext, error: unknown) {
  if (error instanceof APIError) {
    const status = error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 400
    return c.json(
      { error: error.body?.message || error.message, code: error.body?.code },
      // biome-ignore lint/suspicious/noExplicitAny: Hono's status type is a narrow literal union
      status as any
    )
  }
  console.error("[admin router] Unexpected error:", error)
  return c.json({ error: "Internal server error" }, 500)
}

// List every user in the system. Better Auth's admin plugin already exposes
// `/api/auth/admin/list-users` with pagination/search/sorting for the same
// data — this is a simpler convenience read used by the superadmin
// dashboard.
adminRouter.get("/users", async (c: AdminContext) => {
  const users = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      banned: user.banned,
      banReason: user.banReason,
      banExpires: user.banExpires,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(desc(user.createdAt))
    .all()

  return c.json({ users })
})

// List every organization ("workspace") system-wide with member counts.
// This is the one capability Better Auth's organization plugin doesn't
// provide out of the box — `/organization/list` only returns the calling
// user's own organizations, by design.
adminRouter.get("/workspaces", async (c: AdminContext) => {
  const workspaces = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      createdAt: organization.createdAt,
      memberCount: count(member.id),
    })
    .from(organization)
    .leftJoin(member, eq(member.organizationId, organization.id))
    .groupBy(organization.id)
    .orderBy(desc(organization.createdAt))
    .all()

  return c.json({ workspaces })
})

// Disable ("ban") a user. Delegates to Better Auth's own `banUser` endpoint,
// which also revokes every existing session for that user — satisfying
// "existing sessions are invalidated" without any custom session-cleanup
// code here. Better Auth itself refuses self-bans.
adminRouter.post("/users/:id/disable", async (c: AdminContext) => {
  const userId = c.req.param("id")
  const body = await c.req.json().catch(() => ({}))
  const banReason = typeof body?.reason === "string" ? body.reason : undefined

  try {
    const auth = getAuth(c.env)
    const result = await auth.api.banUser({
      headers: c.req.raw.headers,
      body: { userId, banReason },
    })
    return c.json({ user: result.user })
  } catch (error) {
    return handleAuthApiError(c, error)
  }
})

// Re-enable ("unban") a user.
adminRouter.post("/users/:id/enable", async (c: AdminContext) => {
  const userId = c.req.param("id")

  try {
    const auth = getAuth(c.env)
    const result = await auth.api.unbanUser({
      headers: c.req.raw.headers,
      body: { userId },
    })
    return c.json({ user: result.user })
  } catch (error) {
    return handleAuthApiError(c, error)
  }
})

export { adminRouter }
