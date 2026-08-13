import { afterEach, describe, expect, it, vi } from "vitest"
import { signOut } from "../user-menu"

const SIGN_OUT_ENDPOINT = /\/api\/auth\/sign-out$/

describe("signOut", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("sends the JSON request required by Better Auth", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)

    await signOut()

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(SIGN_OUT_ENDPOINT),
      expect.objectContaining({
        body: "{}",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      })
    )
  })

  it("surfaces a failed sign-out request", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 415 })))

    await expect(signOut()).rejects.toThrow("Failed to sign out")
  })
})
