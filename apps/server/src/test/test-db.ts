/**
 * In-memory database harness for integration tests.
 *
 * The application talks to Cloudflare D1 via `src/db`. In tests we swap that for
 * an in-memory libsql database (same SQLite dialect) so the real router and
 * middleware queries run against a genuine database without any Workers runtime.
 * The schema is loaded by replaying the committed Drizzle migrations, so these
 * tests track the real schema automatically.
 */

import { readdirSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"

export const testClient = createClient({ url: ":memory:" })
export const testDb = drizzle(testClient)

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "db", "migrations")

let applied = false

/** Replay every committed migration into the in-memory database (once). */
export async function applyMigrations(): Promise<void> {
  if (applied) {
    return
  }
  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort()

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), "utf8")
    // Drizzle separates statements with `--> statement-breakpoint`, which is a
    // SQL line comment; executeMultiple runs the whole script statement by
    // statement and ignores the comment lines.
    await testClient.executeMultiple(sql)
  }
  applied = true
}
