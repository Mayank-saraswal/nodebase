import { describe, expect, it } from "vitest"
import {
  createOAuthState,
  readOAuthState,
  safeReturnPath,
} from "./oauth-state"

describe("OAuth state", () => {
  const payload = {
    userId: "user_1",
    credentialName: "My account",
    credentialType: "GITHUB_APP",
    returnUrl: "/credentials",
  }

  it("creates a fresh random state and reads its server-side payload", () => {
    const first = createOAuthState(payload)
    const second = createOAuthState(payload)

    expect(first.state).not.toBe(second.state)
    expect(readOAuthState(first.cookieValue, first.state)).toEqual(payload)
  })

  it("rejects missing, modified, and malformed state", () => {
    const created = createOAuthState(payload)

    expect(readOAuthState(undefined, created.state)).toBeNull()
    expect(readOAuthState(created.cookieValue, null)).toBeNull()
    expect(readOAuthState(created.cookieValue, `${created.state}x`)).toBeNull()
    expect(readOAuthState("{", created.state)).toBeNull()
  })
})

describe("safeReturnPath", () => {
  it("keeps same-origin paths and their query strings", () => {
    expect(safeReturnPath("/credentials/new?provider=github", "/credentials")).toBe(
      "/credentials/new?provider=github",
    )
  })

  it.each(["https://evil.example", "//evil.example/path", "/\\evil.example/path"])(
    "rejects external redirect path %s",
    (value) => {
      expect(safeReturnPath(value, "/credentials")).toBe("/credentials")
    },
  )
})
