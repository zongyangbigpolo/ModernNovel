import { index, integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core"
import { user } from "./auth"
import { project } from "./project"

// Writer skill catalog — global entries that are either shipped built-ins
// (`builtIn: true`, `createdBy: null`) or authored/imported by a user
// (`builtIn: false`, `createdBy` set). A skill exists independently of any
// project; `projectWriterSkill` below is what actually attaches one to a
// project's persistent style/technique toolkit.
export const writerSkill = sqliteTable(
  "writer_skill",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    // The prompt-facing guidance text for this skill (markdown/plain text).
    instructions: text("instructions").notNull(),
    checklist: text("checklist"), // JSON array of strings
    examples: text("examples"), // JSON array of strings

    // Provenance — left ready for user-imported skills that cite a source;
    // built-ins ship with a license description instead of a URL.
    sourceUrl: text("source_url"),
    sourceLicense: text("source_license"),

    builtIn: integer("built_in", { mode: "boolean" }).notNull().default(false),
    createdBy: text("created_by").references(() => user.id, { onDelete: "cascade" }),

    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    createdByIdx: index("writer_skill_created_by_idx").on(table.createdBy),
    builtInIdx: index("writer_skill_built_in_idx").on(table.builtIn),
  })
)

// Binding table: which skills are attached to a given project, whether
// they're currently enabled, and their deterministic prompt-injection order.
export const projectWriterSkill = sqliteTable(
  "project_writer_skill",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    skillId: text("skill_id")
      .notNull()
      .references(() => writerSkill.id, { onDelete: "cascade" }),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    order: integer("order").notNull().default(0),

    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    projectSkillUnique: unique("project_writer_skill_project_skill_unique").on(
      table.projectId,
      table.skillId
    ),
    projectIdIdx: index("project_writer_skill_project_id_idx").on(table.projectId),
    skillIdIdx: index("project_writer_skill_skill_id_idx").on(table.skillId),
  })
)

// Persistent, per-project style memory: a structured profile learned from the
// project's own manuscript text, plus provenance metadata about what it was
// learned from. One row per project (re-learning replaces the profile and
// bumps `version`), so it survives across sessions the same way the rest of
// the novel's data does.
export const projectStyleMemory = sqliteTable("project_style_memory", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .unique()
    .references(() => project.id, { onDelete: "cascade" }),

  profile: text("profile").notNull(), // JSON string — validated StyleProfile shape
  sourceChapterIds: text("source_chapter_ids"), // JSON array of chapter ids sampled
  sourceWordCount: integer("source_word_count").default(0),
  version: integer("version").notNull().default(1),

  provider: text("provider"),
  model: text("model"),

  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
})
