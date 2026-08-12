import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { user } from "./auth"

// One row per lifecycle email actually sent, so each nudge type is
// sent at most once per user (checked before sending).
export const sentEmail = sqliteTable(
  "sent_email",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    sentAt: integer("sent_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    userTypeIdx: index("sent_email_user_type_idx").on(table.userId, table.type),
  })
)
