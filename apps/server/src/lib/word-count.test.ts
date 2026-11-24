import { describe, expect, it } from "vitest"
import { countWordsInHtml } from "./word-count"

describe("countWordsInHtml", () => {
  it("counts words in plain text", () => {
    expect(countWordsInHtml("It was a dark and stormy night")).toBe(7)
  })

  it("strips HTML tags", () => {
    expect(countWordsInHtml("<h1>Chapter One</h1><p>The dragons were restless.</p>")).toBe(6)
  })

  it("treats entities as separators, not words", () => {
    expect(countWordsInHtml("<p>one&nbsp;two</p>")).toBe(2)
  })

  it("returns 0 for empty content", () => {
    expect(countWordsInHtml("")).toBe(0)
  })

  it("returns 0 for markup-only content", () => {
    expect(countWordsInHtml("<p></p><br><div></div>")).toBe(0)
  })

  it("collapses repeated whitespace", () => {
    expect(countWordsInHtml("<p>one   two\n\nthree</p>")).toBe(3)
  })

  it("counts each Chinese character and ignores full-width punctuation", () => {
    expect(countWordsInHtml("<p>夜雨落在长安城，沈砚撑伞。</p>")).toBe(11)
  })

  it("counts mixed Chinese and English text", () => {
    expect(countWordsInHtml("<p>使用 AI 助手写作</p>")).toBe(7)
  })
})
