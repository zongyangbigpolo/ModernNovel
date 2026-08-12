import { describe, expect, it } from "vitest"
import { isStaleContentWrite, secondResolutionNow } from "./optimistic-concurrency"

describe("isStaleContentWrite", () => {
  const token = "2026-06-15T12:00:00.000Z"

  it("allows the write when the token matches the current row", () => {
    expect(isStaleContentWrite(token, token)).toBe(false)
  })

  it("rejects the write when the row moved on since the client loaded it", () => {
    expect(isStaleContentWrite(token, "2026-06-15T12:00:05.000Z")).toBe(true)
  })

  it("disables the guard when no token is supplied (legacy / flush-on-exit)", () => {
    expect(isStaleContentWrite(undefined, token)).toBe(false)
  })
})

describe("secondResolutionNow", () => {
  it("floors to whole seconds so the token round-trips through the DB", () => {
    const now = secondResolutionNow()
    expect(now.getMilliseconds()).toBe(0)
    expect(now.toISOString()).toMatch(/\.000Z$/)
  })
})
