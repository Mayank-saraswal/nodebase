import { describe, expect, it, vi, beforeEach } from "vitest"
import { SlackOperation } from "@/features/executions/enums"
import {
  isSlackLegacyOnlyOp,
  runSlackOperation,
  type ResolvedSlackFields,
  type SlackApiClient,
} from "../operations"

function baseFields(
  overrides: Partial<ResolvedSlackFields> = {},
): ResolvedSlackFields {
  return {
    operation: SlackOperation.MESSAGE_SEND,
    channel: "C123",
    message: "hello",
    threadTs: "",
    messageTs: "",
    channelName: "",
    channelTopic: "",
    channelPurpose: "",
    slackUserId: "",
    emoji: "",
    blockKit: "",
    botName: "",
    iconEmoji: "",
    filename: "",
    title: "",
    initialComment: "",
    email: "",
    statusText: "",
    statusEmoji: "",
    fileId: "",
    content: "",
    searchQuery: "",
    limit: 100,
    isPrivate: false,
    excludeArchived: false,
    channelTypes: "",
    unfurlLinks: true,
    ...overrides,
  }
}

function mockClient(): SlackApiClient {
  return {
    slack: {
      api: {
        messages: {
          post: vi.fn().mockResolvedValue({
            ok: true,
            ts: "1.2",
            channel: "C123",
            message: { ts: "1.2" },
          }),
          update: vi.fn().mockResolvedValue({ ok: true, ts: "1.2" }),
          delete: vi.fn().mockResolvedValue({ ok: true, ts: "1.2" }),
          getPermalink: vi.fn().mockResolvedValue({
            ok: true,
            permalink: "https://slack.com/x",
          }),
          search: vi.fn().mockResolvedValue({ ok: true, messages: { matches: [] } }),
        },
        channels: {
          get: vi.fn().mockResolvedValue({
            ok: true,
            channel: { id: "C123", name: "general", num_members: 3 },
          }),
          list: vi.fn().mockResolvedValue({
            ok: true,
            channels: [{ id: "C1" }],
          }),
          create: vi.fn().mockResolvedValue({
            ok: true,
            channel: { id: "C9", name: "new" },
          }),
          archive: vi.fn().mockResolvedValue({ ok: true }),
          unarchive: vi.fn().mockResolvedValue({ ok: true }),
          invite: vi.fn().mockResolvedValue({ ok: true }),
          kick: vi.fn().mockResolvedValue({ ok: true }),
          setTopic: vi.fn().mockResolvedValue({ ok: true }),
          setPurpose: vi.fn().mockResolvedValue({ ok: true }),
          getHistory: vi.fn().mockResolvedValue({
            ok: true,
            messages: [{ ts: "1" }],
          }),
          rename: vi.fn().mockResolvedValue({
            ok: true,
            channel: { id: "C123", name: "renamed" },
          }),
          open: vi.fn().mockResolvedValue({
            ok: true,
            channel: { id: "D1" },
          }),
          close: vi.fn().mockResolvedValue({ ok: true }),
          join: vi.fn().mockResolvedValue({ ok: true }),
          leave: vi.fn().mockResolvedValue({ ok: true }),
          getMembers: vi.fn().mockResolvedValue({
            ok: true,
            members: ["U1"],
          }),
          getReplies: vi.fn().mockResolvedValue({
            ok: true,
            messages: [],
          }),
        },
        users: {
          get: vi.fn().mockResolvedValue({
            ok: true,
            user: { id: "U1", name: "ada" },
          }),
          list: vi.fn().mockResolvedValue({
            ok: true,
            members: [{ id: "U1" }],
          }),
          getProfile: vi.fn().mockResolvedValue({ ok: true, profile: {} }),
          getPresence: vi.fn().mockResolvedValue({
            ok: true,
            presence: "active",
          }),
          updateProfile: vi.fn().mockResolvedValue({ ok: true, profile: {} }),
        },
        reactions: {
          add: vi.fn().mockResolvedValue({ ok: true }),
          remove: vi.fn().mockResolvedValue({ ok: true }),
          get: vi.fn().mockResolvedValue({ ok: true, message: {} }),
        },
        files: {
          get: vi.fn().mockResolvedValue({ ok: true, file: { id: "F1" } }),
          list: vi.fn().mockResolvedValue({ ok: true, files: [] }),
          upload: vi.fn().mockResolvedValue({ ok: true, file: { id: "F2" } }),
        },
        stars: {
          add: vi.fn().mockResolvedValue({ ok: true }),
          remove: vi.fn().mockResolvedValue({ ok: true }),
          list: vi.fn().mockResolvedValue({ ok: true, items: [] }),
        },
      },
    },
  }
}

describe("runSlackOperation", () => {
  let client: SlackApiClient

  beforeEach(() => {
    client = mockClient()
  })

  it("MESSAGE_SEND posts message", async () => {
    const out = await runSlackOperation(
      client,
      baseFields({ operation: SlackOperation.MESSAGE_SEND }),
    )
    expect(client.slack.api.messages.post).toHaveBeenCalled()
    expect(out.messageTs).toBe("1.2")
  })

  it("MESSAGE_SEND requires channel", async () => {
    await expect(
      runSlackOperation(
        client,
        baseFields({ channel: "  ", message: "hi" }),
      ),
    ).rejects.toThrow(/channel/)
  })

  it("CHANNEL_LIST", async () => {
    const out = await runSlackOperation(
      client,
      baseFields({ operation: SlackOperation.CHANNEL_LIST }),
    )
    expect(out.count).toBe(1)
  })

  it("REACTION_ADD", async () => {
    await runSlackOperation(
      client,
      baseFields({
        operation: SlackOperation.REACTION_ADD,
        messageTs: "1.0",
        emoji: "thumbsup",
      }),
    )
    expect(client.slack.api.reactions.add).toHaveBeenCalled()
  })

  it("accepts Corsair path keys", async () => {
    const out = await runSlackOperation(
      client,
      baseFields({ operation: "messages.post" }),
    )
    expect(out.operation).toBe("MESSAGE_SEND")
  })

  it("legacy-only ops are detected", () => {
    expect(isSlackLegacyOnlyOp("MESSAGE_SEND_WEBHOOK")).toBe(true)
    expect(isSlackLegacyOnlyOp("MESSAGE_SEND")).toBe(false)
  })

  it("legacy-only ops throw on Corsair path", async () => {
    await expect(
      runSlackOperation(
        client,
        baseFields({ operation: SlackOperation.MESSAGE_SEND_WEBHOOK }),
      ),
    ).rejects.toThrow(/legacy path|not available on Corsair/i)
  })

  it("rejects unknown ops", async () => {
    await expect(
      runSlackOperation(client, baseFields({ operation: "NOT_REAL" })),
    ).rejects.toThrow(/unknown operation/i)
  })
})
