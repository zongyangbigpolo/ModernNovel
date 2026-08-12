import { and, eq } from "drizzle-orm"
import type { Context } from "hono"
import { db } from "../db"
import { member, organization, project } from "../db/schema"
import { getAuth, SUPERADMIN_ROLE } from "../lib/auth"

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
    activeOrganizationId?: string | null
  }
  user: {
    id: string
    email: string
    name: string
    role?: string | null
    banned?: boolean | null
  }
}

// Middleware to get authenticated user and active organization
export const requireAuth = async (
  c: Context<{ Bindings: Env; Variables: Variables }>,
  next: () => Promise<void>
) => {
  try {
    const auth = getAuth(c.env)
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    })

    if (!session?.user) {
      return c.json({ error: "Unauthorized" }, 401)
    }

    // Defense in depth: Better Auth's admin plugin already blocks session
    // creation for banned users and deletes all of a user's sessions the
    // moment they're banned, but we still reject explicitly here in case a
    // session was already loaded/cached before the ban took effect.
    if (session.user.banned) {
      return c.json({ error: "This account has been disabled" }, 403)
    }

    c.set("user", session.user)
    c.set("session", session.session)

    // Resolve the active organization. Prefer the organization the session
    // itself is switched to (`session.activeOrganizationId`, set via
    // Better Auth's `organization.setActive`), verifying the user is still
    // a member of it. Fall back to the user's first membership only when
    // there's no valid active organization on the session — this keeps
    // single-organization users working exactly as before while making
    // multi-organization switching behave correctly.
    let activeOrganization: Variables["activeOrganization"] = null
    const activeOrganizationId = session.session.activeOrganizationId

    if (activeOrganizationId) {
      const activeMembership = await db
        .select({
          organization: {
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
          },
        })
        .from(member)
        .innerJoin(organization, eq(member.organizationId, organization.id))
        .where(
          and(eq(member.userId, session.user.id), eq(member.organizationId, activeOrganizationId))
        )
        .limit(1)
        .get()

      if (activeMembership) {
        activeOrganization = activeMembership.organization
      }
    }

    if (!activeOrganization) {
      // For certain endpoints, we allow requests without an organization.
      // The dashboard can handle the case where user needs to create an
      // organization.
      const fallbackMembership = await db
        .select({
          organization: {
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
          },
        })
        .from(member)
        .innerJoin(organization, eq(member.organizationId, organization.id))
        .where(eq(member.userId, session.user.id))
        .limit(1)
        .get()

      activeOrganization = fallbackMembership?.organization ?? null
    }

    c.set("activeOrganization", activeOrganization)
    await next()
  } catch {
    return c.json({ error: "Authentication failed" }, 401)
  }
}

// Middleware to require the fixed superadmin role. Must run after
// `requireAuth` (which populates `c.get("user")`). This is an explicit,
// additive authorization check — it never bypasses or mutates a request's
// active organization, it only gates access to superadmin-only routes.
export const requireSuperadmin = async (
  c: Context<{ Bindings: Env; Variables: Variables }>,
  next: () => Promise<void>
) => {
  const user = c.get("user")

  if (!user || user.role !== SUPERADMIN_ROLE) {
    return c.json({ error: "Forbidden" }, 403)
  }

  await next()
}

// Middleware to verify project access
export const verifyProjectAccess = async (
  c: Context<{ Bindings: Env; Variables: Variables }>,
  next: () => Promise<void>
) => {
  const projectId = c.req.param("projectId")
  const activeOrganization = c.get("activeOrganization")

  if (!projectId) {
    return c.json({ error: "Project ID is required" }, 400)
  }

  if (!activeOrganization) {
    return c.json({ error: "No organization found" }, 400)
  }

  // Verify project belongs to user's organization
  const projectData = await db
    .select({ id: project.id })
    .from(project)
    .where(and(eq(project.id, projectId), eq(project.organizationId, activeOrganization.id)))
    .get()

  if (!projectData) {
    return c.json({ error: "Project not found" }, 404)
  }

  await next()
}
