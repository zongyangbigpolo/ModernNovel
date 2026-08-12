import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { admin, organization } from "better-auth/plugins"
import { adminAc, userAc } from "better-auth/plugins/admin/access"
import { db } from "../db"
import {
  account,
  invitation,
  member,
  organization as organizationTable,
  session,
  team,
  teamMember,
  user,
  verification,
} from "../db/schema"
import { sendActionEmail } from "./email"

// Fixed superadmin identity. This is public-safe (just an email address) and
// intentionally hardcoded — the password never is. See lib/bootstrap-admin.ts,
// which provisions/promotes this account from the ADMIN_EMAIL/ADMIN_PASSWORD
// environment bindings instead of any hardcoded credential.
export const SUPERADMIN_EMAIL = "zongyangpolo@gmail.com"
export const SUPERADMIN_ROLE = "superadmin"

interface AuthEnv {
  BETTER_AUTH_SECRET: string
  BETTER_AUTH_URL: string
  CORS_ORIGIN: string
}

function buildAuthInstance(env: AuthEnv) {
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: {
        user,
        session,
        account,
        verification,
        organization: organizationTable,
        member,
        invitation,
        team,
        teamMember,
      },
    }),
    databaseHooks: {
      user: {
        create: {
          after: async (createdUser) => {
            // Automatically create a personal organization for new users
            const orgId = crypto.randomUUID()
            const memberId = crypto.randomUUID()
            const now = new Date()

            // Create personal organization
            await db.insert(organizationTable).values({
              id: orgId,
              name: `${createdUser.name}'s Workspace`,
              slug: `${createdUser.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
              createdAt: now,
              updatedAt: now,
            })

            // Add user as owner
            await db.insert(member).values({
              id: memberId,
              userId: createdUser.id,
              organizationId: orgId,
              role: "owner",
              createdAt: now,
            })
          },
        },
      },
    },
    plugins: [
      // Superadmin/moderation plugin. `adminRoles` maps our "superadmin" role
      // value to Better Auth's built-in admin permission set (user list/ban/
      // impersonate/etc.), so the fixed superadmin account (see
      // lib/bootstrap-admin.ts) can manage users without redefining ACLs.
      admin({
        defaultRole: "user",
        adminRoles: [SUPERADMIN_ROLE],
        roles: {
          user: userAc,
          [SUPERADMIN_ROLE]: adminAc,
        },
        bannedUserMessage:
          "This account has been disabled. Contact support if you believe this is a mistake.",
      }),
      organization({
        // Enable teams/sub-organizations
        teams: {
          enabled: true,
          maximumTeams: 10, // Limit teams per organization
          allowRemovingAllTeams: false, // Prevent removing the last team
        },
        // Organization creation settings
        organizationCreation: {
          disabled: false,
          afterCreate: async () => {
            // Set up default resources for manually created organizations
            // Could add default resources, notifications, etc. here in the future
          },
        },
        // Invitations never require the invitee to have a verified email —
        // email verification is disabled application-wide (see
        // `emailVerification` below), and invitations must stay
        // visible/acceptable in-app even when the notification email never
        // arrives (see `sendInvitationEmail`).
        requireEmailVerificationOnInvitation: false,
        sendInvitationEmail: async (data) => {
          try {
            await sendActionEmail({
              to: data.email,
              subject: `You're invited to join ${data.organization.name} on ModernNovel`,
              body: `${data.inviter.user?.name || "A teammate"} invited you to join "${data.organization.name}" on ModernNovel as a${
                data.role === "owner" ? "n" : ""
              } ${data.role}.`,
              actionUrl: `${env.CORS_ORIGIN}/dashboard/team`,
              actionLabel: "View invitation",
            })
          } catch (error) {
            // Never block invitation creation on email delivery failures —
            // the invitation row already exists and stays visible/acceptable
            // in-app via the organization plugin's list/accept endpoints.
            console.error("Failed to send organization invitation email:", error)
          }
        },
      }),
    ],
    trustedOrigins: [
      ...new Set(
        [
          env.CORS_ORIGIN,
          env.BETTER_AUTH_URL,
          // Local development: Vite (3001) + Wrangler (3000)
          "http://localhost:3001",
          "http://localhost:3000",
        ].filter(Boolean)
      ),
    ],
    // Email verification is disabled: sign-up no longer sends a verification
    // email and sign-in never requires a verified email. Email + password
    // auth itself is unaffected — users can sign up, sign in, and use the
    // app immediately.
    emailVerification: {
      sendOnSignUp: false,
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 6,
      sendResetPassword: async ({ user: recipient, url }) => {
        await sendActionEmail({
          to: recipient.email,
          subject: "Reset your ModernNovel password",
          body: `Hi ${recipient.name || "there"}, we received a request to reset the password for your ModernNovel account.`,
          actionUrl: url,
          actionLabel: "Reset password",
        })
      },
    },
    advanced: {
      ipAddress: {
        // Cloudflare sets the real client IP here; required for rate limiting
        ipAddressHeaders: ["cf-connecting-ip"],
      },
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
  })
}

let authInstance: ReturnType<typeof buildAuthInstance> | null = null

export function createAuthInstance(env: AuthEnv) {
  if (authInstance) {
    return authInstance
  }

  // Validate required environment variables
  const requiredVars = [
    { name: "CORS_ORIGIN", value: env.CORS_ORIGIN },
    { name: "BETTER_AUTH_SECRET", value: env.BETTER_AUTH_SECRET },
    { name: "BETTER_AUTH_URL", value: env.BETTER_AUTH_URL },
  ]

  const missingVars = requiredVars.filter((envVar) => !envVar.value)

  if (missingVars.length > 0) {
    const missing = missingVars.map((envVar) => envVar.name).join(", ")
    throw new Error(
      `Missing required environment variables for authentication: ${missing}. ` +
        "Please set these variables before starting the server."
    )
  }

  authInstance = buildAuthInstance(env)
  return authInstance
}

// For backward compatibility, export a function that gets the auth instance
export const getAuth = (env: AuthEnv) => createAuthInstance(env)
