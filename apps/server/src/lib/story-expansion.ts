/**
 * Prompt building and response parsing for node expansion — decomposing one
 * story element into the next level down (premise → acts → chapters → scenes
 * → beats). Pure functions; the endpoint in routers/graph.ts does the I/O.
 */

export const EXPANSION_CHILD_SUBTYPE = {
  premise: "act",
  act: "chapter",
  chapter: "scene",
  scene: "beat",
} as const

export type ExpandableSubType = keyof typeof EXPANSION_CHILD_SUBTYPE
export type ExpansionChildSubType = (typeof EXPANSION_CHILD_SUBTYPE)[ExpandableSubType]

const CHILD_COUNT_RANGE: Record<ExpandableSubType, { max: number; min: number }> = {
  premise: { min: 3, max: 5 },
  act: { min: 3, max: 6 },
  chapter: { min: 3, max: 6 },
  scene: { min: 3, max: 5 },
}

export function isExpandableSubType(subType: string | null): subType is ExpandableSubType {
  return subType !== null && subType in EXPANSION_CHILD_SUBTYPE
}

export const EXPANSION_SYSTEM_PROMPT = `You are a story architect for OpenWrite.
You break a story element into the next level of structure, in narrative order.
Respond with ONLY a JSON array, no prose, no markdown fences. Each element is an object:
{"title": "short evocative title", "description": "1-3 sentences describing what happens"}`

const MAX_CONTEXT_ITEMS = 8
const MAX_TITLE_CHARS = 200
const MAX_DESCRIPTION_CHARS = 1000
const MAX_CHILDREN = 8

export interface ExpansionContextItem {
  description: string | null
  title: string
}

export interface ExpansionPromptOptions {
  ancestors: ExpansionContextItem[] // outermost first, e.g. [premise, act]
  characters: ExpansionContextItem[]
  childSubType: ExpansionChildSubType
  instructions?: string
  locations: ExpansionContextItem[]
  lore: ExpansionContextItem[]
  node: ExpansionContextItem
  nodeSubType: ExpandableSubType
  projectGenre: string | null
  projectTitle: string
}

function contextSection(label: string, items: ExpansionContextItem[]): string[] {
  if (items.length === 0) {
    return []
  }
  const lines = [`${label}:`]
  for (const item of items.slice(0, MAX_CONTEXT_ITEMS)) {
    const description = item.description ? ` — ${item.description.slice(0, 300)}` : ""
    lines.push(`- ${item.title}${description}`)
  }
  return lines
}

export function buildExpansionPrompt(options: ExpansionPromptOptions): string {
  const range = CHILD_COUNT_RANGE[options.nodeSubType]
  const lines: string[] = []

  lines.push(
    `PROJECT: ${options.projectTitle}${options.projectGenre ? ` (${options.projectGenre})` : ""}`
  )

  for (const [index, ancestor] of options.ancestors.entries()) {
    const indent = "  ".repeat(index)
    lines.push(
      `${indent}WITHIN: ${ancestor.title}${
        ancestor.description ? ` — ${ancestor.description.slice(0, 300)}` : ""
      }`
    )
  }

  lines.push("")
  lines.push(`ELEMENT TO EXPAND (${options.nodeSubType}): ${options.node.title}`)
  if (options.node.description) {
    lines.push(`Description: ${options.node.description.slice(0, 1200)}`)
  }

  lines.push(...contextSection("CHARACTERS", options.characters))
  lines.push(...contextSection("SETTINGS", options.locations))
  lines.push(...contextSection("LORE / WORLD RULES", options.lore))

  if (options.instructions) {
    lines.push("")
    lines.push(`ADDITIONAL INSTRUCTIONS: ${options.instructions.slice(0, 1000)}`)
  }

  lines.push("")
  lines.push(
    `Break this ${options.nodeSubType} into ${range.min}-${range.max} ${options.childSubType}s in narrative order. ` +
      `Each ${options.childSubType} gets a short evocative title and a 1-3 sentence description of what happens. ` +
      "Cover the full span of the parent element — the last entry should land on its ending. " +
      "Output ONLY the JSON array."
  )

  return lines.join("\n")
}

export interface ExpansionChild {
  description: string
  title: string
}

/**
 * Pull the JSON array out of a model response that may include stray prose or
 * markdown fences. Returns null when nothing parseable/valid is found.
 */
export function parseExpansionResponse(raw: string): ExpansionChild[] | null {
  const start = raw.indexOf("[")
  const end = raw.lastIndexOf("]")
  if (start === -1 || end <= start) {
    return null
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw.slice(start, end + 1))
  } catch {
    return null
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return null
  }

  const children: ExpansionChild[] = []
  for (const item of parsed.slice(0, MAX_CHILDREN)) {
    if (typeof item !== "object" || item === null) {
      return null
    }
    const { title, description } = item as { description?: unknown; title?: unknown }
    if (typeof title !== "string" || !title.trim()) {
      return null
    }
    children.push({
      title: title.trim().slice(0, MAX_TITLE_CHARS),
      description:
        typeof description === "string" ? description.trim().slice(0, MAX_DESCRIPTION_CHARS) : "",
    })
  }

  return children
}
