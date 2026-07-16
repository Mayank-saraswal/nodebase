import { describe, expect, it, vi, beforeEach } from "vitest"
import { GmailOperation } from "@/features/executions/enums"
import {
  runGmailOperation,
  type GmailApiClient,
  type ResolvedGmailFields,
} from "../operations"

function baseFields(
  overrides: Partial<ResolvedGmailFields> = {},
): ResolvedGmailFields {
  return {
    operation: GmailOperation.SEND,
    to: "a@example.com",
    subject: "Hi",
    body: "Hello",
    cc: "",
    bcc: "",
    replyTo: "",
    messageId: "",
    messageIds: "",
    threadId: "",
    searchQuery: "",
    labelIds: "",
    labelId: "",
    pageToken: "",
    attachmentData: "",
    attachmentName: "",
    attachmentMime: "",
    attachmentId: "",
    draftId: "",
    labelName: "",
    isHtml: false,
    includeBody: false,
    includeHeaders: false,
    maxResults: 10,
    attachmentOutputFormat: "base64",
    userId: "user_1",
    ...overrides,
  }
}

function mockClient(overrides?: {
  messages?: Partial<GmailApiClient["gmail"]["api"]["messages"]>
  labels?: Partial<GmailApiClient["gmail"]["api"]["labels"]>
  drafts?: Partial<GmailApiClient["gmail"]["api"]["drafts"]>
  threads?: Partial<GmailApiClient["gmail"]["api"]["threads"]>
}): GmailApiClient {
  return {
    gmail: {
      api: {
        messages: {
          list: vi.fn().mockResolvedValue({
            messages: [{ id: "m1" }],
            resultSizeEstimate: 1,
          }),
          get: vi.fn().mockResolvedValue({
            id: "m1",
            threadId: "t1",
            labelIds: ["INBOX", "UNREAD"],
            snippet: "snip",
            payload: {
              headers: [
                { name: "From", value: "from@example.com" },
                { name: "To", value: "to@example.com" },
                { name: "Subject", value: "Subj" },
                { name: "Date", value: "Mon" },
                { name: "Message-ID", value: "<mid@x>" },
                { name: "References", value: "" },
              ],
              body: {},
              parts: [],
            },
          }),
          send: vi.fn().mockResolvedValue({
            id: "sent1",
            threadId: "t1",
            labelIds: ["SENT"],
          }),
          delete: vi.fn().mockResolvedValue(undefined),
          modify: vi.fn().mockResolvedValue({
            id: "m1",
            threadId: "t1",
            labelIds: ["INBOX"],
          }),
          batchModify: vi.fn().mockResolvedValue(undefined),
          trash: vi.fn().mockResolvedValue({
            id: "m1",
            threadId: "t1",
            labelIds: ["TRASH"],
          }),
          untrash: vi.fn().mockResolvedValue({
            id: "m1",
            threadId: "t1",
            labelIds: ["INBOX"],
          }),
          ...overrides?.messages,
        },
        labels: {
          list: vi.fn().mockResolvedValue({
            labels: [
              { id: "INBOX", name: "INBOX", type: "system" },
              { id: "L1", name: "Custom", type: "user" },
            ],
          }),
          get: vi.fn().mockResolvedValue({
            id: "L1",
            name: "Custom",
            type: "user",
            messagesTotal: 3,
          }),
          create: vi.fn().mockResolvedValue({
            id: "L2",
            name: "New",
            type: "user",
          }),
          update: vi.fn().mockResolvedValue({
            id: "L1",
            name: "Renamed",
            type: "user",
          }),
          delete: vi.fn().mockResolvedValue(undefined),
          ...overrides?.labels,
        },
        drafts: {
          list: vi.fn().mockResolvedValue({
            drafts: [{ id: "d1", message: { id: "m9", threadId: "t9" } }],
          }),
          get: vi.fn().mockResolvedValue({
            id: "d1",
            message: { id: "m9", threadId: "t9" },
          }),
          create: vi.fn().mockResolvedValue({
            id: "d1",
            message: { id: "m9", threadId: "t9" },
          }),
          update: vi.fn().mockResolvedValue({
            id: "d1",
            message: { id: "m9", threadId: "t9" },
          }),
          delete: vi.fn().mockResolvedValue(undefined),
          send: vi.fn().mockResolvedValue({ id: "sent_d", threadId: "t9" }),
          ...overrides?.drafts,
        },
        threads: {
          list: vi.fn().mockResolvedValue({
            threads: [{ id: "t1", snippet: "s" }],
            resultSizeEstimate: 1,
          }),
          get: vi.fn().mockResolvedValue({
            id: "t1",
            snippet: "thread",
            messages: [
              {
                id: "m1",
                threadId: "t1",
                labelIds: [],
                snippet: "a",
                payload: {
                  headers: [
                    { name: "From", value: "a@x.com" },
                    { name: "Subject", value: "S" },
                    { name: "Date", value: "D" },
                  ],
                },
              },
            ],
          }),
          modify: vi.fn().mockResolvedValue({
            id: "t1",
            labelIds: ["INBOX"],
          }),
          delete: vi.fn().mockResolvedValue(undefined),
          trash: vi.fn().mockResolvedValue({
            id: "t1",
            labelIds: ["TRASH"],
          }),
          untrash: vi.fn().mockResolvedValue({
            id: "t1",
            labelIds: ["INBOX"],
          }),
          ...overrides?.threads,
        },
      },
    },
  }
}

describe("runGmailOperation (all Nodebase ops)", () => {
  let client: GmailApiClient

  beforeEach(() => {
    client = mockClient()
  })

  it("SEND calls messages.send with raw", async () => {
    const out = await runGmailOperation(
      client,
      baseFields({ operation: GmailOperation.SEND }),
    )
    expect(client.gmail.api.messages.send).toHaveBeenCalled()
    const arg = vi.mocked(client.gmail.api.messages.send).mock.calls[0][0]
    expect(arg.raw).toBeTruthy()
    expect(out.messageId).toBe("sent1")
    expect(out.to).toBe("a@example.com")
  })

  it("SEND rejects empty to", async () => {
    await expect(
      runGmailOperation(
        client,
        baseFields({ operation: GmailOperation.SEND, to: "  " }),
      ),
    ).rejects.toThrow(/To/)
  })

  it("REPLY fetches metadata then send", async () => {
    const out = await runGmailOperation(
      client,
      baseFields({
        operation: GmailOperation.REPLY,
        messageId: "m1",
        body: "Thanks",
      }),
    )
    expect(client.gmail.api.messages.get).toHaveBeenCalled()
    expect(client.gmail.api.messages.send).toHaveBeenCalled()
    expect(out.repliedTo).toBe("m1")
  })

  it("FORWARD builds forward body and sends", async () => {
    const out = await runGmailOperation(
      client,
      baseFields({
        operation: GmailOperation.FORWARD,
        messageId: "m1",
        to: "b@example.com",
      }),
    )
    expect(client.gmail.api.messages.get).toHaveBeenCalledWith(
      expect.objectContaining({ id: "m1", format: "full" }),
    )
    expect(out.forwardedFrom).toBe("m1")
    expect(out.to).toBe("b@example.com")
  })

  it("GET_MESSAGE", async () => {
    const out = await runGmailOperation(
      client,
      baseFields({
        operation: GmailOperation.GET_MESSAGE,
        messageId: "m1",
        includeBody: true,
      }),
    )
    expect(client.gmail.api.messages.get).toHaveBeenCalledWith(
      expect.objectContaining({ id: "m1", format: "full" }),
    )
    expect(out.messageId).toBe("m1")
  })

  it("LIST_MESSAGES", async () => {
    const out = await runGmailOperation(
      client,
      baseFields({
        operation: GmailOperation.LIST_MESSAGES,
        labelIds: "INBOX",
      }),
    )
    expect(client.gmail.api.messages.list).toHaveBeenCalled()
    expect(out.count).toBe(1)
    expect(Array.isArray(out.messages)).toBe(true)
  })

  it("SEARCH_MESSAGES requires query", async () => {
    await expect(
      runGmailOperation(
        client,
        baseFields({ operation: GmailOperation.SEARCH_MESSAGES }),
      ),
    ).rejects.toThrow(/searchQuery/)
  })

  it("SEARCH_MESSAGES lists with q", async () => {
    const out = await runGmailOperation(
      client,
      baseFields({
        operation: GmailOperation.SEARCH_MESSAGES,
        searchQuery: "from:me",
      }),
    )
    expect(client.gmail.api.messages.list).toHaveBeenCalledWith(
      expect.objectContaining({ q: "from:me" }),
    )
    expect(out.query).toBe("from:me")
  })

  it("ADD_LABEL", async () => {
    const out = await runGmailOperation(
      client,
      baseFields({
        operation: GmailOperation.ADD_LABEL,
        messageId: "m1",
        labelIds: "STARRED,IMPORTANT",
      }),
    )
    expect(client.gmail.api.messages.modify).toHaveBeenCalledWith({
      id: "m1",
      addLabelIds: ["STARRED", "IMPORTANT"],
    })
    expect(out.addedLabels).toEqual(["STARRED", "IMPORTANT"])
  })

  it("REMOVE_LABEL", async () => {
    await runGmailOperation(
      client,
      baseFields({
        operation: GmailOperation.REMOVE_LABEL,
        messageId: "m1",
        labelIds: "STARRED",
      }),
    )
    expect(client.gmail.api.messages.modify).toHaveBeenCalledWith({
      id: "m1",
      removeLabelIds: ["STARRED"],
    })
  })

  it("MARK_READ", async () => {
    const out = await runGmailOperation(
      client,
      baseFields({
        operation: GmailOperation.MARK_READ,
        messageId: "m1",
      }),
    )
    expect(client.gmail.api.messages.modify).toHaveBeenCalledWith({
      id: "m1",
      removeLabelIds: ["UNREAD"],
    })
    expect(out.markedRead).toBe(true)
  })

  it("MARK_UNREAD", async () => {
    const out = await runGmailOperation(
      client,
      baseFields({
        operation: GmailOperation.MARK_UNREAD,
        messageId: "m1",
      }),
    )
    expect(client.gmail.api.messages.modify).toHaveBeenCalledWith({
      id: "m1",
      addLabelIds: ["UNREAD"],
    })
    expect(out.markedUnread).toBe(true)
  })

  it("MOVE_TO_TRASH", async () => {
    const out = await runGmailOperation(
      client,
      baseFields({
        operation: GmailOperation.MOVE_TO_TRASH,
        messageId: "m1",
      }),
    )
    expect(client.gmail.api.messages.trash).toHaveBeenCalledWith({ id: "m1" })
    expect(out.trashed).toBe(true)
  })

  it("CREATE_DRAFT", async () => {
    const out = await runGmailOperation(
      client,
      baseFields({ operation: GmailOperation.CREATE_DRAFT }),
    )
    expect(client.gmail.api.drafts.create).toHaveBeenCalled()
    expect(out.draftId).toBe("d1")
  })

  it("GET_ATTACHMENT uses inline part data when present", async () => {
    const b64url = Buffer.from("hello").toString("base64url")
    client = mockClient({
      messages: {
        get: vi.fn().mockResolvedValue({
          id: "m1",
          payload: {
            parts: [
              {
                body: {
                  attachmentId: "att1",
                  data: b64url,
                  size: 5,
                },
              },
            ],
          },
        }),
      },
    })
    const out = await runGmailOperation(
      client,
      baseFields({
        operation: GmailOperation.GET_ATTACHMENT,
        messageId: "m1",
        attachmentId: "att1",
      }),
    )
    expect(out.attachmentId).toBe("att1")
    expect(out.data).toBeTruthy()
  })

  it("GET_THREAD", async () => {
    const out = await runGmailOperation(
      client,
      baseFields({
        operation: GmailOperation.GET_THREAD,
        threadId: "t1",
      }),
    )
    expect(client.gmail.api.threads.get).toHaveBeenCalledWith(
      expect.objectContaining({ id: "t1" }),
    )
    expect(out.messageCount).toBe(1)
  })

  it("LIST_LABELS", async () => {
    const out = await runGmailOperation(
      client,
      baseFields({ operation: GmailOperation.LIST_LABELS }),
    )
    expect(client.gmail.api.labels.list).toHaveBeenCalled()
    expect(out.count).toBe(2)
    expect((out.userLabels as unknown[]).length).toBe(1)
  })

  it("CREATE_LABEL", async () => {
    const out = await runGmailOperation(
      client,
      baseFields({
        operation: GmailOperation.CREATE_LABEL,
        labelName: "New",
      }),
    )
    expect(client.gmail.api.labels.create).toHaveBeenCalledWith({
      label: expect.objectContaining({ name: "New" }),
    })
    expect(out.labelId).toBe("L2")
  })

  it("LIST_DRAFTS", async () => {
    const out = await runGmailOperation(
      client,
      baseFields({ operation: GmailOperation.LIST_DRAFTS }),
    )
    expect(client.gmail.api.drafts.list).toHaveBeenCalled()
    expect(out.count).toBe(1)
  })

  it("SEND_DRAFT", async () => {
    const out = await runGmailOperation(
      client,
      baseFields({
        operation: GmailOperation.SEND_DRAFT,
        draftId: "d1",
      }),
    )
    expect(client.gmail.api.drafts.send).toHaveBeenCalledWith({ id: "d1" })
    expect(out.messageId).toBe("sent_d")
  })

  it("DELETE_MESSAGE permanent delete", async () => {
    const out = await runGmailOperation(
      client,
      baseFields({
        operation: GmailOperation.DELETE_MESSAGE,
        messageId: "m1",
      }),
    )
    expect(client.gmail.api.messages.delete).toHaveBeenCalledWith({ id: "m1" })
    expect(out.deleted).toBe(true)
  })

  it("UNTRASH_MESSAGE", async () => {
    const out = await runGmailOperation(
      client,
      baseFields({
        operation: GmailOperation.UNTRASH_MESSAGE,
        messageId: "m1",
      }),
    )
    expect(client.gmail.api.messages.untrash).toHaveBeenCalledWith({ id: "m1" })
    expect(out.untrashed).toBe(true)
  })

  it("LIST_THREADS", async () => {
    const out = await runGmailOperation(
      client,
      baseFields({ operation: GmailOperation.LIST_THREADS }),
    )
    expect(client.gmail.api.threads.list).toHaveBeenCalled()
    expect(out.count).toBe(1)
  })

  it("GET_LABEL", async () => {
    const out = await runGmailOperation(
      client,
      baseFields({
        operation: GmailOperation.GET_LABEL,
        labelId: "L1",
      }),
    )
    expect(client.gmail.api.labels.get).toHaveBeenCalledWith({ id: "L1" })
    expect(out.labelId).toBe("L1")
  })

  it("accepts Corsair path keys", async () => {
    const out = await runGmailOperation(
      client,
      baseFields({ operation: "messages.send" }),
    )
    expect(out.messageId).toBe("sent1")
  })

  it("unknown op throws via registry", async () => {
    await expect(
      runGmailOperation(
        client,
        baseFields({ operation: "NOT_A_REAL_OP" }),
      ),
    ).rejects.toThrow(/unknown operation/i)
  })
})
