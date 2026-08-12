/**
 * Writer Skills: parsing/validation for user-imported skills, the seeded
 * built-in skill definitions, style-profile validation for the persistent
 * learning feature, and the pure prompt-formatting helpers that inject
 * enabled skills + style memory into the AI system prompt.
 *
 * Everything in this file is pure (no database access) so it can be unit
 * tested directly; routers/writer-skills.ts and lib/writer-skills-bootstrap.ts
 * own the I/O.
 */

import { z } from "zod"

// ---------------------------------------------------------------------------
// Size limits — enforced on every write path (markdown import, JSON import,
// update) and again defensively when formatting for the AI prompt.

export const MAX_MARKDOWN_BYTES = 20_000
export const MAX_JSON_BYTES = 20_000
export const MAX_NAME_CHARS = 200
export const MAX_DESCRIPTION_CHARS = 2000
export const MAX_INSTRUCTIONS_CHARS = 8000
export const MAX_CHECKLIST_ITEMS = 30
export const MAX_CHECKLIST_ITEM_CHARS = 300
export const MAX_EXAMPLES = 20
export const MAX_EXAMPLE_CHARS = 1000
export const MAX_SOURCE_URL_CHARS = 500
export const MAX_SOURCE_LICENSE_CHARS = 200

// Prompt-injection caps — deliberately smaller than the storage caps above so
// a handful of enabled skills can't blow the request budget.
const MAX_SKILLS_IN_PROMPT = 8
const MAX_SKILL_NAME_PROMPT_CHARS = 120
const MAX_SKILL_INSTRUCTIONS_PROMPT_CHARS = 1500
const MAX_CHECKLIST_ITEMS_PROMPT = 10
const MAX_CHECKLIST_ITEM_PROMPT_CHARS = 200
const MAX_STYLE_FIELD_PROMPT_CHARS = 600
const MAX_STYLE_AVOID_ITEM_PROMPT_CHARS = 200

// ---------------------------------------------------------------------------
// Sanitization — no arbitrary HTML. Skill/style content is plain text or
// markdown that gets dropped straight into an AI prompt, never rendered as
// HTML, so any tag-like sequence is stripped rather than escaped.

const HTML_TAG_LIKE_PATTERN = /<\/?[a-zA-Z!][^>]*>/g
// biome-ignore lint/suspicious/noControlCharactersInRegex: intentionally stripping control characters from untrusted skill/style text before it's ever rendered or injected into a prompt
const CONTROL_CHAR_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g
const WHITESPACE_COLLAPSE_PATTERN = /[ \t]+/g
// Guards against a skill's own text hijacking the delimiters we wrap it in
// when it's injected into the system prompt (see formatSkillsForPrompt).
const PROMPT_DELIMITER_PATTERN = /={3,}/g

function stripHtml(value: string): string {
  return value.replace(HTML_TAG_LIKE_PATTERN, "").replace(CONTROL_CHAR_PATTERN, "")
}

function sanitizeText(value: string, maxChars: number): string {
  return stripHtml(value).replace(WHITESPACE_COLLAPSE_PATTERN, " ").trim().slice(0, maxChars)
}

function sanitizeList(values: string[], maxItems: number, maxItemChars: number): string[] {
  return values
    .map((item) => sanitizeText(item, maxItemChars))
    .filter((item) => item.length > 0)
    .slice(0, maxItems)
}

// ---------------------------------------------------------------------------
// Normalized skill shape shared by both import paths.

export interface ParsedSkillInput {
  checklist: string[]
  description: string | null
  examples: string[]
  instructions: string
  name: string
  sourceLicense: string | null
  sourceUrl: string | null
}

export type SkillParseResult =
  | { errors: string[]; ok: false }
  | { ok: true; skill: ParsedSkillInput }

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length
}

// ---------------------------------------------------------------------------
// Markdown import
//
// Expected shape (only the H1 name and Instructions section are required):
//
//   # Skill Name
//   Optional one-or-more-paragraph description.
//
//   ## Instructions
//   Free text guidance, one or more paragraphs.
//
//   ## Checklist
//   - item one
//   - item two
//
//   ## Examples
//   - example one
//
//   ## Source
//   - URL: https://example.com/article
//   - License: CC-BY-4.0

const H1_PATTERN = /^#\s+(.+)$/
const H2_PATTERN = /^##\s+(.+)$/
const LIST_ITEM_PATTERN = /^[-*]\s+(.+)$/
const SOURCE_URL_LINE_PATTERN = /^(?:[-*]\s*)?url\s*:\s*(.+)$/i
const SOURCE_LICENSE_LINE_PATTERN = /^(?:[-*]\s*)?license\s*:\s*(.+)$/i

type MarkdownSectionName = "checklist" | "description" | "examples" | "instructions" | "source"

function sectionNameFromHeading(heading: string): MarkdownSectionName | null {
  const normalized = heading.trim().toLowerCase()
  if (normalized === "instructions") {
    return "instructions"
  }
  if (normalized === "checklist") {
    return "checklist"
  }
  if (normalized === "examples") {
    return "examples"
  }
  if (normalized === "source" || normalized === "provenance") {
    return "source"
  }
  return null
}

export function parseSkillMarkdown(raw: string): SkillParseResult {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return { ok: false, errors: ["Markdown content is required"] }
  }
  if (byteLength(raw) > MAX_MARKDOWN_BYTES) {
    return { ok: false, errors: [`Markdown content must be under ${MAX_MARKDOWN_BYTES} bytes`] }
  }

  const cleaned = stripHtml(raw)
  const lines = cleaned.split("\n")

  let name: string | null = null
  const descriptionLines: string[] = []
  const sections: Record<MarkdownSectionName, string[]> = {
    description: [],
    instructions: [],
    checklist: [],
    examples: [],
    source: [],
  }
  let currentSection: MarkdownSectionName = "description"

  for (const line of lines) {
    const h1Match = line.match(H1_PATTERN)
    if (h1Match && name === null) {
      name = h1Match[1].trim()
      currentSection = "description"
      continue
    }

    const h2Match = line.match(H2_PATTERN)
    if (h2Match) {
      const section = sectionNameFromHeading(h2Match[1])
      if (section) {
        currentSection = section
        continue
      }
    }

    if (currentSection === "description") {
      descriptionLines.push(line)
    } else {
      sections[currentSection].push(line)
    }
  }

  if (!name) {
    return { ok: false, errors: ["Markdown must start with a level-1 heading (# Skill Name)"] }
  }

  const instructionsText = sections.instructions.join("\n").trim()
  if (!instructionsText) {
    return { ok: false, errors: ["Markdown must include an ## Instructions section"] }
  }

  const checklist = extractListItems(sections.checklist)
  const examples = extractListItems(sections.examples)
  const { sourceUrl, sourceLicense } = extractSource(sections.source)
  const description = descriptionLines.join("\n").trim()

  return buildParsedSkill({
    name,
    description: description.length > 0 ? description : null,
    instructions: instructionsText,
    checklist,
    examples,
    sourceUrl,
    sourceLicense,
  })
}

function extractListItems(lines: string[]): string[] {
  const items: string[] = []
  for (const line of lines) {
    const match = line.match(LIST_ITEM_PATTERN)
    if (match) {
      items.push(match[1].trim())
    }
  }
  return items
}

function extractSource(lines: string[]): {
  sourceLicense: string | null
  sourceUrl: string | null
} {
  let sourceUrl: string | null = null
  let sourceLicense: string | null = null
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      continue
    }
    const urlMatch = trimmed.match(SOURCE_URL_LINE_PATTERN)
    if (urlMatch) {
      sourceUrl = urlMatch[1].trim()
      continue
    }
    const licenseMatch = trimmed.match(SOURCE_LICENSE_LINE_PATTERN)
    if (licenseMatch) {
      sourceLicense = licenseMatch[1].trim()
    }
  }
  return { sourceUrl, sourceLicense }
}

// ---------------------------------------------------------------------------
// JSON import

const SkillImportSchema = z
  .object({
    name: z.string().min(1).max(MAX_NAME_CHARS),
    description: z.string().max(MAX_DESCRIPTION_CHARS).nullable().optional(),
    instructions: z.string().min(1).max(MAX_INSTRUCTIONS_CHARS),
    checklist: z
      .array(z.string().max(MAX_CHECKLIST_ITEM_CHARS))
      .max(MAX_CHECKLIST_ITEMS)
      .optional(),
    examples: z.array(z.string().max(MAX_EXAMPLE_CHARS)).max(MAX_EXAMPLES).optional(),
    sourceUrl: z.string().max(MAX_SOURCE_URL_CHARS).nullable().optional(),
    sourceLicense: z.string().max(MAX_SOURCE_LICENSE_CHARS).nullable().optional(),
  })
  .strict()

export function parseSkillJson(raw: string): SkillParseResult {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return { ok: false, errors: ["JSON content is required"] }
  }
  if (byteLength(raw) > MAX_JSON_BYTES) {
    return { ok: false, errors: [`JSON content must be under ${MAX_JSON_BYTES} bytes`] }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, errors: ["Invalid JSON"] }
  }

  const result = SkillImportSchema.safeParse(parsed)
  if (!result.success) {
    return { ok: false, errors: result.error.issues.map((issue) => issue.message) }
  }

  const data = result.data
  return buildParsedSkill({
    name: data.name,
    description: data.description ?? null,
    instructions: data.instructions,
    checklist: data.checklist ?? [],
    examples: data.examples ?? [],
    sourceUrl: data.sourceUrl ?? null,
    sourceLicense: data.sourceLicense ?? null,
  })
}

function buildParsedSkill(input: {
  checklist: string[]
  description: string | null
  examples: string[]
  instructions: string
  name: string
  sourceLicense: string | null
  sourceUrl: string | null
}): SkillParseResult {
  const name = sanitizeText(input.name, MAX_NAME_CHARS)
  const instructions = sanitizeText(input.instructions, MAX_INSTRUCTIONS_CHARS)

  const errors: string[] = []
  if (!name) {
    errors.push("Name is required")
  }
  if (!instructions) {
    errors.push("Instructions are required")
  }
  if (errors.length > 0) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    skill: {
      name,
      description: input.description
        ? sanitizeText(input.description, MAX_DESCRIPTION_CHARS)
        : null,
      instructions,
      checklist: sanitizeList(input.checklist, MAX_CHECKLIST_ITEMS, MAX_CHECKLIST_ITEM_CHARS),
      examples: sanitizeList(input.examples, MAX_EXAMPLES, MAX_EXAMPLE_CHARS),
      sourceUrl: input.sourceUrl ? sanitizeText(input.sourceUrl, MAX_SOURCE_URL_CHARS) : null,
      sourceLicense: input.sourceLicense
        ? sanitizeText(input.sourceLicense, MAX_SOURCE_LICENSE_CHARS)
        : null,
    },
  }
}

// Partial update parsing — same rules as create, but every field is optional
// and only fields present in the input are returned (so the caller can build
// a partial SQL SET clause). `errors` covers only fields that were present
// but invalid.
export interface ParsedSkillUpdate {
  checklist?: string[]
  description?: string | null
  examples?: string[]
  instructions?: string
  name?: string
  sourceLicense?: string | null
  sourceUrl?: string | null
}

const SkillUpdateSchema = z
  .object({
    name: z.string().min(1).max(MAX_NAME_CHARS).optional(),
    description: z.string().max(MAX_DESCRIPTION_CHARS).nullable().optional(),
    instructions: z.string().min(1).max(MAX_INSTRUCTIONS_CHARS).optional(),
    checklist: z
      .array(z.string().max(MAX_CHECKLIST_ITEM_CHARS))
      .max(MAX_CHECKLIST_ITEMS)
      .optional(),
    examples: z.array(z.string().max(MAX_EXAMPLE_CHARS)).max(MAX_EXAMPLES).optional(),
    sourceUrl: z.string().max(MAX_SOURCE_URL_CHARS).nullable().optional(),
    sourceLicense: z.string().max(MAX_SOURCE_LICENSE_CHARS).nullable().optional(),
  })
  .strict()

export function parseSkillUpdate(
  body: unknown
): { errors: string[]; ok: false } | { ok: true; update: ParsedSkillUpdate } {
  const result = SkillUpdateSchema.safeParse(body)
  if (!result.success) {
    return { ok: false, errors: result.error.issues.map((issue) => issue.message) }
  }

  const data = result.data
  const update: ParsedSkillUpdate = {}

  if (data.name !== undefined) {
    const name = sanitizeText(data.name, MAX_NAME_CHARS)
    if (!name) {
      return { ok: false, errors: ["Name cannot be empty"] }
    }
    update.name = name
  }
  if (data.description !== undefined) {
    update.description = data.description
      ? sanitizeText(data.description, MAX_DESCRIPTION_CHARS)
      : null
  }
  if (data.instructions !== undefined) {
    const instructions = sanitizeText(data.instructions, MAX_INSTRUCTIONS_CHARS)
    if (!instructions) {
      return { ok: false, errors: ["Instructions cannot be empty"] }
    }
    update.instructions = instructions
  }
  if (data.checklist !== undefined) {
    update.checklist = sanitizeList(data.checklist, MAX_CHECKLIST_ITEMS, MAX_CHECKLIST_ITEM_CHARS)
  }
  if (data.examples !== undefined) {
    update.examples = sanitizeList(data.examples, MAX_EXAMPLES, MAX_EXAMPLE_CHARS)
  }
  if (data.sourceUrl !== undefined) {
    update.sourceUrl = data.sourceUrl ? sanitizeText(data.sourceUrl, MAX_SOURCE_URL_CHARS) : null
  }
  if (data.sourceLicense !== undefined) {
    update.sourceLicense = data.sourceLicense
      ? sanitizeText(data.sourceLicense, MAX_SOURCE_LICENSE_CHARS)
      : null
  }

  return { ok: true, update }
}

// ---------------------------------------------------------------------------
// JSON array (de)serialization for the `checklist`/`examples` text columns.

export function stringifyList(values: string[]): string {
  return JSON.stringify(values)
}

export function parseJsonStringArray(raw: string | null): string[] {
  if (!raw) {
    return []
  }
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : []
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// Manuscript sampling for the learning pass. Chapter content is stored as
// editor HTML; convert it to readable plain text and greedily accumulate a
// bounded sample across chapters (in manuscript order) so the learning
// prompt has a predictable size regardless of how large the project is.

const HTML_BLOCK_BREAK_PATTERN = /<\/(?:p|div|li|h[1-6])>|<br\s*\/?>/gi
const HTML_ENTITY_PATTERN = /&(amp|lt|gt|quot|#39|nbsp);/g
const EXCESS_BLANK_LINE_PATTERN = /\n{3,}/g
const TRAILING_LINE_WHITESPACE_PATTERN = /[ \t]+\n/g

const HTML_ENTITY_MAP: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  "#39": "'",
  nbsp: " ",
}

/** Convert editor HTML content into readable plain text for style analysis. */
export function htmlToPlainText(html: string): string {
  const withBreaks = html.replace(HTML_BLOCK_BREAK_PATTERN, "\n")
  const withoutTags = withBreaks.replace(HTML_TAG_LIKE_PATTERN, "")
  const withEntities = withoutTags.replace(
    HTML_ENTITY_PATTERN,
    (match, key: string) => HTML_ENTITY_MAP[key] ?? match
  )
  return withEntities
    .replace(TRAILING_LINE_WHITESPACE_PATTERN, "\n")
    .replace(EXCESS_BLANK_LINE_PATTERN, "\n\n")
    .trim()
}

export const MAX_STYLE_SAMPLE_TOTAL_CHARS = 16_000
export const MAX_STYLE_SAMPLE_CHARS_PER_CHAPTER = 4000
export const MAX_STYLE_SAMPLE_CHAPTERS = 20
// Below this many characters of total sample text, we don't have enough
// manuscript to learn a meaningful style profile from.
export const MIN_STYLE_SAMPLE_CHARS = 200

export interface StyleSampleSourceChapter {
  id: string
  order: number
  text: string
  title: string
}

export interface StyleSampleCollection {
  chapterIds: string[]
  chapters: StyleSampleChapter[]
  totalChars: number
}

/** Greedily collect a bounded manuscript sample, in chapter order, respecting both a total and a per-chapter character budget. */
export function collectStyleSampleChapters(
  chapters: StyleSampleSourceChapter[]
): StyleSampleCollection {
  const sorted = [...chapters].sort((a, b) => a.order - b.order)
  const collected: StyleSampleChapter[] = []
  const chapterIds: string[] = []
  let totalChars = 0

  for (const ch of sorted) {
    if (
      collected.length >= MAX_STYLE_SAMPLE_CHAPTERS ||
      totalChars >= MAX_STYLE_SAMPLE_TOTAL_CHARS
    ) {
      break
    }

    const trimmed = ch.text.trim()
    if (!trimmed) {
      continue
    }

    const remaining = MAX_STYLE_SAMPLE_TOTAL_CHARS - totalChars
    const perChapterCap = Math.min(MAX_STYLE_SAMPLE_CHARS_PER_CHAPTER, remaining)
    const text = trimmed.slice(0, perChapterCap)
    if (!text) {
      continue
    }

    collected.push({ id: ch.id, title: ch.title, text })
    chapterIds.push(ch.id)
    totalChars += text.length
  }

  return { chapters: collected, chapterIds, totalChars }
}

// ---------------------------------------------------------------------------
// Built-in skills — seeded for every workspace. Each skill's instructions,
// checklist, and examples are original writing-craft content written for
// ModernNovel; none of it is copied from any external source. Where a skill's
// general approach was conceptually inspired by a specific open-source
// project (identified by name/URL/license below), that provenance is
// recorded in `sourceUrl`/`sourceLicense` for auditing — again, only the
// abstract idea (e.g. "parameterize POV/tense", "carry forward state
// between chapters") is reused, never that project's prompt text or code.

export interface BuiltInSkillDefinition extends ParsedSkillInput {
  id: string
}

export const BUILT_IN_SKILLS: readonly BuiltInSkillDefinition[] = [
  {
    id: "builtin-character-interaction-dynamics",
    name: "Character Interaction Dynamics",
    description:
      "A pipeline for building scenes from character drives: profile each character's immediate want and guardrail, map where those drives collide (tension) or unexpectedly align (synergy), then let the scene's turn emerge from that interaction map rather than from plot alone.",
    instructions:
      "Use this pass before drafting a multi-character scene, or as a revision check on one that feels flat.\n\n" +
      "1. PROFILE — For every character who appears on the page, name two things in one line each: their immediate drive (the concrete thing they want right now, not their whole-story arc) and their guardrail (what they refuse to do, or fear, while pursuing it).\n" +
      "2. INTERACTION MAP — Compare every pair of drives. Where do two drives collide head-on (tension)? Where do two different drives unexpectedly point the same way, forcing an uneasy alliance (synergy)? A scene can have both at once between different pairs of characters.\n" +
      "3. SCENE SYNTHESIS — Build the scene's beats from the strongest tension or synergy pair, letting it anchor the turn. Don't outline the scene from external plot events first and retrofit character motives after; let the interaction map generate the beats.\n" +
      "4. FLATNESS CHECK — If every character's drive points the same direction with no collision or unexpected alignment anywhere in the map, the scene will likely read as flat. Either introduce a competing drive for one character, or cut/merge a character who adds no interaction.\n\n" +
      "This works at any scale: a two-person conversation, a full ensemble scene, or a chapter told from one POV but populated by several drives in the room.",
    checklist: [
      "List each on-page character's immediate drive and guardrail in one line.",
      "Identify at least one tension pair (colliding drives) or one synergy pair (unexpectedly aligned drives).",
      "Confirm the scene's turning point traces back to that tension/synergy pair, not an external device alone.",
      "Flag any character whose drive doesn't interact with anyone else's in the scene.",
    ],
    examples: [
      "Drives: Captain — get to port before the storm; guardrail — won't leave the injured deckhand behind. First mate — jettison cargo to lighten the ship; guardrail — won't override the captain without agreement. Tension: schedule vs. safety. Synergy: rerouting instead of jettisoning serves both the deckhand and the cargo, so the scene turns on that compromise, not on the storm itself.",
      "Drives: Daughter — get her mother to sign the discharge papers; guardrail — won't raise her voice in the hospital. Mother — keep control over her own care; guardrail — refuses to admit she can't manage alone. Both drives collide directly; the scene's turn comes from the daughter finding one concession (a home aide, not a facility) that lets the mother feel she still chose it.",
    ],
    sourceUrl: "https://github.com/danielmiessler/Fabric",
    sourceLicense:
      "Inspired by Fabric's abstract pipeline design (github.com/danielmiessler/Fabric), MIT License, (c) 2024 Daniel Miessler. No text/code copied; content is original.",
  },
  {
    id: "builtin-parameterized-prose-practice",
    name: "Parameterized Prose Practice",
    description:
      "A task-based rewrite pass: hold a passage's voice constant while deliberately varying its point of view and tense as explicit parameters, then run a short checklist to catch the drift a POV/tense conversion tends to introduce.",
    instructions:
      "Use this pass when converting a passage's POV or tense, or as a deliberate practice/diagnostic exercise even when no conversion is needed for publication.\n\n" +
      "1. PARAMETERIZE — Before rewriting, state the passage's current point of view (first person, third limited, third omniscient) and tense (past, present), and the target POV/tense if you're converting it. Treat these as the only two parameters you're changing.\n" +
      "2. REWRITE WITH CONSTRAINTS — Hold voice constant: diction, sentence rhythm, and level of interiority should read the same before and after. A POV/tense change is not license to also change how the character sounds.\n" +
      "3. REWRITE CHECKLIST — After the pass, scan specifically for: tense leaks (a stray verb still conjugated in the old tense), POV leaks (a stray reference to a sensation, thought, or piece of knowledge the new POV can't access), and staging drift (a character's position, possession, or timing that quietly changed during the rewrite).\n" +
      "4. Use this as a standing diagnostic: rewriting the same passage under different POV/tense parameters is a fast way to test whether a scene's tension survives a structural change, independent of whether you keep the rewrite.\n\n" +
      "Treat POV and tense as two independent parameters — a passage can be correct on tense but still leaking POV, or vice versa, so check them separately.",
    checklist: [
      "State the passage's current POV and tense, and the target parameters if converting.",
      "Confirm voice (diction, rhythm, interiority level) reads the same before and after.",
      "Scan for tense leaks: verbs still conjugated in the old tense.",
      "Scan for POV leaks: sensations, thoughts, or knowledge the new POV shouldn't have access to.",
      "Confirm physical staging (position, possessions, timing) didn't drift during the rewrite.",
    ],
    examples: [
      'Original (third, past): "She hated this room. The clock ticked too loud, and she hadn\'t noticed until now." Target (first, present): "I hate this room. The clock ticks too loud, and I hadn\'t noticed until now." — checklist catches the surviving past-tense "hadn\'t noticed," which needs to become "haven\'t noticed" to match the new tense.',
      'Original (first, past): "I could smell his cigarette from the hallway before he even knocked." Converted to third-limited on another character: a POV leak, since that character can\'t smell what only the original narrator smelled — the rewrite has to replace it with something the new POV character can actually perceive (hearing footsteps, seeing smoke under the door).',
    ],
    sourceUrl: "https://github.com/a-omukai/Writingway",
    sourceLicense:
      "Inspired by Writingway's parameterized prose workflow (github.com/a-omukai/Writingway), MIT License, (c) 2025 a-omukai. No text/code copied; content is original.",
  },
  {
    id: "builtin-stateful-chapter-continuity",
    name: "Stateful Chapter Continuity",
    description:
      "A carry-forward continuity pass for multi-chapter manuscripts: track a short, factual state of what changed by the end of each chapter, confirm the next chapter's opening is consistent with it, and periodically audit the accumulated state for drift.",
    instructions:
      "Use this pass across a multi-chapter manuscript to keep continuity intact as chapters accumulate.\n\n" +
      "1. CARRY-FORWARD STATE — At the end of each chapter, write a short, factual state note: where each major character physically ends up, anything they now know that they didn't before, any object, promise, or injury introduced, and how much story time elapsed.\n" +
      '2. OPENING CHECK — Before drafting the next chapter (or as a revision pass afterward), confirm its opening is consistent with that carried-forward state: continuous or explicitly skipped time, a consistent or plausibly-transitioned location, and no information being "re-revealed" to a character who already learned it.\n' +
      "3. CONTINUITY AUDIT — Every few chapters, or before a full-manuscript pass, re-read the accumulated state notes end to end looking for contradictions: an injury that heals off-page without mention, an object that reappears without an explanation of how it got there, or a timeline that no longer adds up.\n" +
      "4. Keep each state note short and factual — a continuity checklist, not a scene summary or a recap of the plot.\n\n" +
      "This pass is most useful precisely because it's cheap to run per chapter; the audit step is what catches the slow drift that accumulates across a long manuscript.",
    checklist: [
      "Write a short carry-forward state note after each chapter (location, new knowledge, objects/promises/injuries, elapsed time).",
      "Confirm the next chapter's opening doesn't contradict that state without an explicit explanation.",
      'Check that no character is "re-learning" something they already know.',
      "Periodically audit the full sequence of state notes for drift or contradictions across the manuscript.",
    ],
    examples: [
      'End-of-chapter state: "Mira now knows the letter was forged; she\'s on the train, day 2 of the trip; she has the torn photograph in her coat pocket." If chapter 5 opens with Mira still surprised the letter was forged, the opening check catches the contradiction before it reaches readers.',
      "End-of-chapter state: \"Dev's arm is in a sling; he's still at the hospital.\" A later continuity audit flags that two chapters on, Dev is described lifting boxes with no mention of recovery — either add a recovery beat or adjust the injury's severity.",
    ],
    sourceUrl: "https://github.com/dylanhogg/gptauthor",
    sourceLicense:
      "Inspired by gptauthor's chapter-by-chapter continuity approach (github.com/dylanhogg/gptauthor), MIT License, (c) 2024 Dylan Hogg. No text/code copied; content is original.",
  },
]

// ---------------------------------------------------------------------------
// Style memory: strict structured profile + learning prompt.
//
// Architecture note (provenance, not code/text reuse): persisting a single
// structured, versioned JSON memory record per project — rebuilt from bounded
// source samples and re-injected into the system prompt on every request
// rather than relayed as raw conversation history — is a general persistent-
// memory pattern; this project's implementation was conceptually informed by
// that pattern as used in NousResearch/hermes-agent
// (https://github.com/NousResearch/hermes-agent), MIT License. No code or
// prompt text from that project is copied; `projectStyleMemory` intentionally
// has no per-record `sourceUrl`/`sourceLicense` field (unlike `writerSkill`)
// because each row is original, per-project generated content, not an
// imported/attributable document — this comment is the appropriate place for
// that architectural provenance instead.

export const StyleProfileSchema = z
  .object({
    voice: z.string().min(1).max(600),
    sentenceRhythm: z.string().min(1).max(600),
    povTense: z.string().min(1).max(300),
    dialogue: z.string().min(1).max(600),
    imagery: z.string().min(1).max(600),
    pacing: z.string().min(1).max(600),
    avoid: z.array(z.string().min(1).max(200)).max(20),
  })
  .strict()

export type StyleProfile = z.infer<typeof StyleProfileSchema>

export type StyleProfileParseResult =
  | { error: string; ok: false }
  | { ok: true; profile: StyleProfile }

/**
 * Pull a strict, validated style profile out of a model response that may
 * include stray prose or markdown fences. No silent fallback: any failure to
 * find/parse/validate a JSON object is reported as an explicit error.
 */
export function parseStyleProfileResponse(raw: string): StyleProfileParseResult {
  const start = raw.indexOf("{")
  const end = raw.lastIndexOf("}")
  if (start === -1 || end <= start) {
    return { ok: false, error: "The AI response did not contain a JSON object" }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw.slice(start, end + 1))
  } catch {
    return { ok: false, error: "The AI response was not valid JSON" }
  }

  const result = StyleProfileSchema.safeParse(parsed)
  if (!result.success) {
    return {
      ok: false,
      error: `The AI response did not match the required style profile shape: ${result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ")}`,
    }
  }

  return { ok: true, profile: result.data }
}

/** Validate a style profile already persisted as JSON (defensive re-check). */
export function parseStoredStyleProfile(raw: string): StyleProfile | null {
  try {
    const result = StyleProfileSchema.safeParse(JSON.parse(raw))
    return result.success ? result.data : null
  } catch {
    return null
  }
}

export const STYLE_LEARNING_SYSTEM_PROMPT = `You are a literary style analyst for ModernNovel.
Read the manuscript excerpt(s) below and infer the author's prose style as it actually reads on the page.
Respond with ONLY a JSON object, no prose, no markdown fences, matching exactly this shape:
{"voice": "...", "sentenceRhythm": "...", "povTense": "...", "dialogue": "...", "imagery": "...", "pacing": "...", "avoid": ["...", "..."]}
Keep every value concise (1-3 sentences) and grounded in the excerpt(s) — do not invent details not evidenced in the text.
"avoid" lists concrete stylistic habits or crutches this author should avoid over-using, as short phrases.`

export interface StyleSampleChapter {
  id: string
  text: string
  title: string
}

const MAX_SAMPLE_CHAPTERS_IN_PROMPT = 12

/** Pure prompt builder for the learning pass — the sample text is already collected/truncated by the caller. */
export function buildLearningPrompt(chapters: StyleSampleChapter[]): string {
  const lines = ["Analyze the following manuscript excerpts from a single project, in order:"]
  for (const chapter of chapters.slice(0, MAX_SAMPLE_CHAPTERS_IN_PROMPT)) {
    lines.push("")
    lines.push(`--- EXCERPT: ${chapter.title} ---`)
    lines.push(chapter.text)
    lines.push("--- END EXCERPT ---")
  }
  lines.push("")
  lines.push("Output ONLY the JSON style profile object.")
  return lines.join("\n")
}

// ---------------------------------------------------------------------------
// Prompt formatting for enabled skills + style memory (used by
// routers/ai.ts's buildSystemPrompt). Deterministic order is the caller's
// responsibility (query ORDER BY); these functions only format and cap.

function escapeForPrompt(value: string, maxChars: number): string {
  return stripHtml(value).replace(PROMPT_DELIMITER_PATTERN, "-").trim().slice(0, maxChars)
}

export interface PromptSkill {
  checklist: string[]
  instructions: string
  name: string
}

export function formatSkillsForPrompt(skills: PromptSkill[]): string {
  if (skills.length === 0) {
    return ""
  }

  const lines = ["=== WRITER SKILLS (apply these techniques while writing) ==="]
  for (const skill of skills.slice(0, MAX_SKILLS_IN_PROMPT)) {
    lines.push(`--- SKILL: ${escapeForPrompt(skill.name, MAX_SKILL_NAME_PROMPT_CHARS)} ---`)
    lines.push(escapeForPrompt(skill.instructions, MAX_SKILL_INSTRUCTIONS_PROMPT_CHARS))
    if (skill.checklist.length > 0) {
      lines.push("Checklist:")
      for (const item of skill.checklist.slice(0, MAX_CHECKLIST_ITEMS_PROMPT)) {
        lines.push(`- ${escapeForPrompt(item, MAX_CHECKLIST_ITEM_PROMPT_CHARS)}`)
      }
    }
    lines.push("--- END SKILL ---")
  }
  lines.push("=== END WRITER SKILLS ===")
  return lines.join("\n")
}

export function formatStyleMemoryForPrompt(profile: StyleProfile): string {
  const lines = ["=== PROJECT STYLE MEMORY (match this author's established voice) ==="]
  lines.push(`Voice: ${escapeForPrompt(profile.voice, MAX_STYLE_FIELD_PROMPT_CHARS)}`)
  lines.push(
    `Sentence rhythm: ${escapeForPrompt(profile.sentenceRhythm, MAX_STYLE_FIELD_PROMPT_CHARS)}`
  )
  lines.push(`POV & tense: ${escapeForPrompt(profile.povTense, MAX_STYLE_FIELD_PROMPT_CHARS)}`)
  lines.push(`Dialogue: ${escapeForPrompt(profile.dialogue, MAX_STYLE_FIELD_PROMPT_CHARS)}`)
  lines.push(`Imagery: ${escapeForPrompt(profile.imagery, MAX_STYLE_FIELD_PROMPT_CHARS)}`)
  lines.push(`Pacing: ${escapeForPrompt(profile.pacing, MAX_STYLE_FIELD_PROMPT_CHARS)}`)
  if (profile.avoid.length > 0) {
    lines.push(
      `Avoid: ${profile.avoid.map((item) => escapeForPrompt(item, MAX_STYLE_AVOID_ITEM_PROMPT_CHARS)).join("; ")}`
    )
  }
  lines.push("=== END PROJECT STYLE MEMORY ===")
  return lines.join("\n")
}
