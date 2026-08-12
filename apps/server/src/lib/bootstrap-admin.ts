import { eq } from "drizzle-orm"
import { db } from "../db"
import { user } from "../db/schema"
import { getAuth, SUPERADMIN_EMAIL, SUPERADMIN_ROLE } from "./auth"

/**
 * Idempotent superadmin bootstrap.
 *
 * Design goals (see task requirements):
 *  - The superadmin *email* is a fixed, public-safe constant
 *    (`SUPERADMIN_EMAIL`), but the password is NEVER hardcoded anywhere in
 *    source. It is supplied out-of-band via the `ADMIN_PASSWORD` environment
 *    binding (a Cloudflare secret in production, `.dev.vars` locally) and is
 *    handed straight to Better Auth's own `signUpEmail`/`setUserPassword`
 *    APIs, which hash it — we never read, log, or persist the plaintext
 *    ourselves.
 *  - Safe to call on every cold start / request: if the env vars aren't
 *    configured, or the account + role already exist as expected, this is a
 *    cheap no-op that never re-hashes a password or mutates ban state.
 *  - Only ever promotes the *fixed* superadmin email — `ADMIN_EMAIL` must
 *    match `SUPERADMIN_EMAIL` or bootstrap is skipped with a warning, so a
 *    misconfigured environment can't accidentally grant superadmin to an
 *    arbitrary address.
 */

export interface BootstrapEnv {
  ADMIN_EMAIL?: string
  ADMIN_PASSWORD?: string
  BETTER_AUTH_SECRET: string
  BETTER_AUTH_URL: string
  CORS_ORIGIN: string
}

// Per-isolate guard so we don't hit the database on every request once
// bootstrap has already been attempted. `resetSuperadminBootstrapForTests`
// clears this for test isolation.
let bootstrapPromise: Promise<void> | null = null

export function resetSuperadminBootstrapForTests() {
  bootstrapPromise = null
}

async function runBootstrap(env: BootstrapEnv): Promise<void> {
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = env

  // No-op unless both bindings are configured. This keeps the bootstrap
  // fully opt-in and safe to ship everywhere (including environments where
  // no superadmin should be provisioned yet).
  if (!(ADMIN_EMAIL && ADMIN_PASSWORD)) {
    return
  }

  if (ADMIN_EMAIL !== SUPERADMIN_EMAIL) {
    console.warn(
      `[bootstrap-admin] ADMIN_EMAIL ("${ADMIN_EMAIL}") does not match the fixed superadmin ` +
        `email ("${SUPERADMIN_EMAIL}"); skipping superadmin bootstrap.`
    )
    return
  }

  const existing = await db.select().from(user).where(eq(user.email, ADMIN_EMAIL)).get()

  if (!existing) {
    const auth = getAuth(env)
    try {
      // Delegates hashing and account/session creation entirely to Better
      // Auth. The plaintext password never touches our own storage or logs.
      await auth.api.signUpEmail({
        body: {
          name: "Super Admin",
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
        },
      })
    } catch (error) {
      console.error("[bootstrap-admin] Failed to create superadmin account:", error)
      return
    }

    await db
      .update(user)
      .set({ role: SUPERADMIN_ROLE, emailVerified: true, updatedAt: new Date() })
      .where(eq(user.email, ADMIN_EMAIL))

    console.info(`[bootstrap-admin] Provisioned superadmin account for ${ADMIN_EMAIL}.`)
    return
  }

  // Account already exists — never touch its password or ban state again.
  // Only promote the role if it isn't already correct, so re-running this
  // (every cold start) stays a pure no-op in the common case.
  if (existing.role !== SUPERADMIN_ROLE) {
    await db
      .update(user)
      .set({ role: SUPERADMIN_ROLE, updatedAt: new Date() })
      .where(eq(user.id, existing.id))

    console.info(`[bootstrap-admin] Promoted existing account ${ADMIN_EMAIL} to superadmin.`)
  }
}

/**
 * Ensures the fixed superadmin account exists and holds the superadmin role.
 * Safe to call unconditionally from request middleware — subsequent calls
 * within the same isolate reuse the first attempt's result instead of
 * re-querying the database.
 */
export function ensureSuperadminBootstrap(env: BootstrapEnv): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = runBootstrap(env).catch((error) => {
      // Never let a bootstrap failure take down request handling; log and
      // allow a future call (e.g. next cold start) to retry.
      console.error("[bootstrap-admin] Unexpected bootstrap error:", error)
      bootstrapPromise = null
    })
  }

  return bootstrapPromise
}
