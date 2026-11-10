import { describe, expect, it } from "vitest"
import { assertTenantAccess, resolveTenantId } from "./tenant"

describe("resolveTenantId", () => {
  it("uses userId when no workspace", () => {
    expect(resolveTenantId({ userId: "user_1" })).toBe("user_1")
  })

  it("prefers workspaceId when set", () => {
    expect(
      resolveTenantId({ userId: "user_1", workspaceId: "ws_9" }),
    ).toBe("ws_9")
  })

  it("throws without userId", () => {
    expect(() => resolveTenantId({ userId: "" })).toThrow(/userId/)
  })
})

describe("assertTenantAccess", () => {
  it("allows matching tenant", () => {
    expect(() =>
      assertTenantAccess("user_1", { userId: "user_1" }),
    ).not.toThrow()
  })

  it("blocks foreign tenant", () => {
    expect(() =>
      assertTenantAccess("user_a", { userId: "user_b" }),
    ).toThrow(/Forbidden/)
  })
})
