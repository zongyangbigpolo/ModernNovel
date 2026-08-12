import { describe, expect, it } from "vitest"
import { buildManuscriptMarkdown, htmlToMarkdown, manuscriptFilename } from "../export-markdown"

describe("htmlToMarkdown", () => {
  it("returns empty string for empty content", () => {
    expect(htmlToMarkdown("")).toBe("")
    expect(htmlToMarkdown("   ")).toBe("")
  })

  it("converts paragraphs and inline marks", () => {
    expect(htmlToMarkdown("<p>Hello <strong>brave</strong> <em>world</em></p>")).toBe(
      "Hello **brave** *world*"
    )
  })

  it("converts headings by level", () => {
    expect(htmlToMarkdown("<h2>Chapter</h2>")).toBe("## Chapter")
  })

  it("converts list items to dashes", () => {
    expect(htmlToMarkdown("<ul><li>one</li><li>two</li></ul>")).toBe("- one\n- two")
  })

  it("converts blockquotes", () => {
    expect(htmlToMarkdown("<blockquote>quoted</blockquote>")).toBe("> quoted")
  })

  it("decodes html entities", () => {
    expect(htmlToMarkdown("<p>Tom &amp; Jerry &lt;3</p>")).toBe("Tom & Jerry <3")
  })

  it("collapses excess blank lines between blocks", () => {
    expect(htmlToMarkdown("<p>a</p><p>b</p>")).toBe("a\n\nb")
  })
})

describe("buildManuscriptMarkdown", () => {
  it("assembles a titled document with chapter headings", () => {
    const md = buildManuscriptMarkdown("My Novel", [
      { title: "Chapter 1", content: "<p>It began.</p>" },
      { title: "Chapter 2", content: "<p>It continued.</p>" },
    ])
    expect(md).toBe("# My Novel\n\n## Chapter 1\n\nIt began.\n\n## Chapter 2\n\nIt continued.\n")
  })

  it("marks empty chapters explicitly", () => {
    const md = buildManuscriptMarkdown("Draft", [{ title: "Chapter 1", content: "" }])
    expect(md).toContain("_(empty chapter)_")
  })
})

describe("manuscriptFilename", () => {
  it("slugifies the title", () => {
    expect(manuscriptFilename("My Great Novel!")).toBe("my-great-novel.md")
  })

  it("falls back when the title has no usable characters", () => {
    expect(manuscriptFilename("!!!")).toBe("manuscript.md")
  })
})
