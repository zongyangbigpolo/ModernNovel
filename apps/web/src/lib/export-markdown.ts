/**
 * Manuscript export: converts the Tiptap HTML stored per chapter into a single
 * Markdown document. Kept dependency-free and DOM-free so it is pure and unit
 * testable; the editor emits well-formed HTML so a focused set of replacements
 * covers the formatting it can produce.
 */

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
}

function decodeEntities(text: string): string {
  return text.replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (match) => ENTITIES[match] ?? match)
}

// Convert inline marks (bold/italic/code) and drop any other tags.
function convertInline(html: string): string {
  return html
    .replace(/<(strong|b)[^>]*>(.*?)<\/\1>/gis, (_match, _tag, inner) => `**${inner}**`)
    .replace(/<(em|i)[^>]*>(.*?)<\/\1>/gis, (_match, _tag, inner) => `*${inner}*`)
    .replace(/<code[^>]*>(.*?)<\/code>/gis, (_match, inner) => `\`${inner}\``)
    .replace(/<[^>]+>/g, "")
}

export function htmlToMarkdown(html: string): string {
  if (!html.trim()) {
    return ""
  }

  let out = html
    .replace(
      /<h([1-6])[^>]*>(.*?)<\/h\1>/gis,
      (_match, level: string, inner: string) =>
        `\n${"#".repeat(Number(level))} ${convertInline(inner).trim()}\n\n`
    )
    .replace(
      /<blockquote[^>]*>(.*?)<\/blockquote>/gis,
      (_match, inner: string) => `\n> ${convertInline(inner).trim()}\n\n`
    )
    .replace(
      /<li[^>]*>(.*?)<\/li>/gis,
      (_match, inner: string) => `- ${convertInline(inner).trim()}\n`
    )
    .replace(/<\/?(?:ul|ol)[^>]*>/gi, "\n")
    .replace(
      /<p[^>]*>(.*?)<\/p>/gis,
      (_match, inner: string) => `${convertInline(inner).trim()}\n\n`
    )
    .replace(/<br\s*\/?>/gi, "\n")

  out = convertInline(out)
  out = decodeEntities(out)
  return out.replace(/\n{3,}/g, "\n\n").trim()
}

export interface ExportChapter {
  content: string
  title: string
}

export function buildManuscriptMarkdown(title: string, chapters: ExportChapter[]): string {
  const parts: string[] = [`# ${title}`, ""]

  for (const chapter of chapters) {
    parts.push(`## ${chapter.title}`, "")
    const body = htmlToMarkdown(chapter.content)
    parts.push(body || "_(empty chapter)_", "")
  }

  return `${parts
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()}\n`
}

/** Turn a project title into a safe Markdown filename. */
export function manuscriptFilename(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return `${slug || "manuscript"}.md`
}
