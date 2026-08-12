import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { user } from "./auth"

// Organization table
export const organization = sqliteTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  metadata: text("metadata"), // JSON string for additional org data
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
})

// Member table (links users to organizations with roles)
export const member = sqliteTable(
  "member",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // "owner", "admin", "member"
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    userIdIdx: index("member_user_id_idx").on(table.userId),
    organizationIdIdx: index("member_organization_id_idx").on(table.organizationId),
  })
)

// Invitation table
export const invitation = sqliteTable(
  "invitation",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    status: text("status").notNull(), // "pending", "accepted", "rejected", "expired"
    // Optional team scoping for invites (required by better-auth when teams are enabled)
    teamId: text("team_id").references(() => team.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    emailIdx: index("invitation_email_idx").on(table.email),
    organizationIdIdx: index("invitation_organization_id_idx").on(table.organizationId),
  })
)

// Team table (sub-organizations for better project organization)
export const team = sqliteTable(
  "team",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }),
  },
  (table) => ({
    organizationIdIdx: index("team_organization_id_idx").on(table.organizationId),
  })
)

// Team member table (links members to teams)
export const teamMember = sqliteTable(
  "team_member",
  {
    id: text("id").primaryKey(),
    teamId: text("team_id")
      .notNull()
      .references(() => team.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    teamIdIdx: index("team_member_team_id_idx").on(table.teamId),
    userIdIdx: index("team_member_user_id_idx").on(table.userId),
  })
)
