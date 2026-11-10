import { describe, expect, it, vi } from "vitest"
import { gmailAdapter } from "../adapter"
import { GmailOperation } from "@/features/executions/enums"

describe("gmailAdapter", () => {
  it("merges result under variableName", async () => {
    const send = vi.fn().mockResolvedValue({
      id: "s1",
      threadId: "t1",
      labelIds: ["SENT"],
    })
    const client = {
      gmail: {
        api: {
          messages: {
            send,
            list: vi.fn(),
            get: vi.fn(),
            modify: vi.fn(),
            trash: vi.fn(),
          },
          labels: { list: vi.fn(), create: vi.fn() },
          drafts: { list: vi.fn(), create: vi.fn(), send: vi.fn() },
          threads: { get: vi.fn() },
        },
      },
    }

    const out = await gmailAdapter.run({
      data: {
        operation: GmailOperation.SEND,
        variableName: "myGmail",
        to: "x@y.com",
        subject: "S",
        body: "B",
      },
      context: { hello: 1 },
      client,
      nodeId: "n1",
      userId: "u1",
    })

    expect(out.hello).toBe(1)
    expect(out.myGmail).toMatchObject({
      operation: GmailOperation.SEND,
      messageId: "s1",
      to: "x@y.com",
    })
    expect(send).toHaveBeenCalled()
  })

  it("throws if client missing gmail.api", async () => {
    await expect(
      gmailAdapter.run({
        data: { operation: "SEND", to: "a@b.com" },
        context: {},
        client: {},
        nodeId: "n1",
        userId: "u1",
      }),
    ).rejects.toThrow(/gmail.api/)
  })
})
