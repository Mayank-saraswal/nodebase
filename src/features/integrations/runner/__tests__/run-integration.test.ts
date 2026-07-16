import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("@/lib/corsair", () => ({
  getCorsair: vi.fn(() => ({
    withTenant: vi.fn(() => ({
      gmail: {
        api: {
          messages: {
            send: vi.fn().mockResolvedValue({
              id: "m1",
              threadId: "t1",
              labelIds: ["SENT"],
            }),
            list: vi.fn(),
            get: vi.fn(),
            delete: vi.fn(),
            modify: vi.fn(),
            batchModify: vi.fn(),
            trash: vi.fn(),
            untrash: vi.fn(),
          },
          labels: {
            list: vi.fn(),
            get: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
          },
          drafts: {
            list: vi.fn(),
            get: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            send: vi.fn(),
          },
          threads: {
            list: vi.fn(),
            get: vi.fn(),
            modify: vi.fn(),
            delete: vi.fn(),
            trash: vi.fn(),
            untrash: vi.fn(),
          },
        },
      },
    })),
  })),
  isCorsairPluginEnabled: vi.fn(() => true),
  mapCorsairError: (err: unknown, label: string): never => {
    throw err instanceof Error
      ? err
      : new Error(`${label}: ${String(err)}`)
  },
  resolveTenantId: ({ userId }: { userId: string }) => userId,
}))

import { canRunViaCorsair, runIntegration } from "../run-integration"
import { NodeType } from "@/generated/prisma"

describe("runIntegration security / edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("rejects empty tenantId (tenant isolation)", async () => {
    await expect(
      runIntegration({
        nodeType: NodeType.GMAIL,
        data: { operation: "SEND", to: "a@b.com", subject: "s", body: "b" },
        context: {},
        nodeId: "n1",
        userId: "u1",
        tenantId: "",
      }),
    ).rejects.toThrow(/tenantId/)
  })

  it("rejects missing operation", async () => {
    await expect(
      runIntegration({
        nodeType: NodeType.GMAIL,
        data: { to: "a@b.com" },
        context: {},
        nodeId: "n1",
        userId: "u1",
        tenantId: "tenant_1",
      }),
    ).rejects.toThrow(/operation is required/i)
  })

  it("rejects unknown operation via registry", async () => {
    await expect(
      runIntegration({
        nodeType: NodeType.GMAIL,
        data: { operation: "NOT_REAL" },
        context: {},
        nodeId: "n1",
        userId: "u1",
        tenantId: "tenant_1",
      }),
    ).rejects.toThrow(/unknown operation/i)
  })

  it("runs Gmail SEND via tenant client when valid", async () => {
    const result = await runIntegration({
      nodeType: NodeType.GMAIL,
      data: {
        operation: "SEND",
        to: "a@example.com",
        subject: "Hi",
        body: "Hello",
        variableName: "gmail",
      },
      context: { prev: 1 },
      nodeId: "n1",
      userId: "u1",
      tenantId: "tenant_1",
    })
    expect(result.operationKey).toBe("messages.send")
    expect(result.context.gmail).toBeDefined()
    expect(result.context.prev).toBe(1)
  })

  it("canRunViaCorsair is false for platform nodes", () => {
    expect(canRunViaCorsair(NodeType.IF_ELSE)).toBe(false)
  })
})
