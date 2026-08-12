import { describe, expect, it } from "vitest"
import {
  buildExpansionPrompt,
  isExpandableSubType,
  parseExpansionResponse,
} from "./story-expansion"

describe("parseExpansionResponse", () => {
  it("parses a clean JSON array", () => {
    const raw = '[{"title": "Act I", "description": "The setup."}]'
    expect(parseExpansionResponse(raw)).toEqual([{ title: "Act I", description: "The setup." }])
  })

  it("extracts the array from markdown fences and surrounding prose", () => {
    const raw = 'Here you go:\n```json\n[{"title": "Act I", "description": "Setup"}]\n```\nEnjoy!'
    expect(parseExpansionResponse(raw)).toEqual([{ title: "Act I", description: "Setup" }])
  })

  it("tolerates a missing description", () => {
    expect(parseExpansionResponse('[{"title": "Act I"}]')).toEqual([
      { title: "Act I", description: "" },
    ])
  })

  it("rejects entries without a title", () => {
    expect(parseExpansionResponse('[{"description": "no title"}]')).toBeNull()
  })

  it("rejects non-array and unparseable responses", () => {
    expect(parseExpansionResponse('{"title": "not an array"}')).toBeNull()
    expect(parseExpansionResponse("I cannot help with that.")).toBeNull()
    expect(parseExpansionResponse("[not json]")).toBeNull()
    expect(parseExpansionResponse("[]")).toBeNull()
  })

  it("caps runaway responses at 8 children and truncates long fields", () => {
    const many = JSON.stringify(
      Array.from({ length: 20 }, (_, i) => ({ title: `Scene ${i}`.padEnd(500, "x") }))
    )
    const parsed = parseExpansionResponse(many)
    expect(parsed).toHaveLength(8)
    expect(parsed?.[0].title.length).toBeLessThanOrEqual(200)
  })
})

describe("isExpandableSubType", () => {
  it("accepts the four decomposable levels", () => {
    for (const subType of ["premise", "act", "chapter", "scene"]) {
      expect(isExpandableSubType(subType)).toBe(true)
    }
  })

  it("rejects leaves and unknown subtypes", () => {
    expect(isExpandableSubType("beat")).toBe(false)
    expect(isExpandableSubType("plot_point")).toBe(false)
    expect(isExpandableSubType(null)).toBe(false)
  })
})

describe("buildExpansionPrompt", () => {
  it("includes the ancestry chain, context, and child-level instruction", () => {
    const prompt = buildExpansionPrompt({
      projectTitle: "The Lighthouse",
      projectGenre: "Fantasy",
      node: { title: "Act II", description: "Things get worse." },
      nodeSubType: "act",
      childSubType: "chapter",
      ancestors: [{ title: "A keeper guides ghost ships", description: null }],
      characters: [{ title: "Mara", description: "The keeper" }],
      locations: [],
      lore: [],
      instructions: "Keep it moody",
    })

    expect(prompt).toContain("PROJECT: The Lighthouse (Fantasy)")
    expect(prompt).toContain("WITHIN: A keeper guides ghost ships")
    expect(prompt).toContain("ELEMENT TO EXPAND (act): Act II")
    expect(prompt).toContain("- Mara — The keeper")
    expect(prompt).toContain("ADDITIONAL INSTRUCTIONS: Keep it moody")
    expect(prompt).toContain("into 3-6 chapters")
  })
})
