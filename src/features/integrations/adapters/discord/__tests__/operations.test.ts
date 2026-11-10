import { describe, expect, it, vi, beforeEach } from "vitest"
import {
  isDiscordCorsairOp,
  runDiscordOperation,
  type DiscordApiClient,
  type ResolvedDiscordFields,
} from "../operations"

function fields(
  overrides: Partial<ResolvedDiscordFields> = {},
): ResolvedDiscordFields {
  return {
    operation: "SEND_MESSAGE",
    channelId: "ch1",
    messageId: "",
    content: "hello",
    guildId: "",
    userId: "",
    emoji: "",
    threadName: "",
    embedsJson: "",
    limit: 50,
    before: "",
    after: "",
    around: "",
    tts: false,
    autoArchiveDuration: "",
    ...overrides,
  }
}

function mockClient(): DiscordApiClient {
  const ok = () => vi.fn().mockResolvedValue({ id: "1" })
  return {
    discord: {
      api: {
        messages: {
          send: ok(),
          reply: ok(),
          get: ok(),
          list: vi.fn().mockResolvedValue([]),
          edit: ok(),
          delete: vi.fn().mockResolvedValue(undefined),
        },
        threads: {
          create: ok(),
          createFromMessage: ok(),
        },
        reactions: {
          add: vi.fn().mockResolvedValue(undefined),
          remove: vi.fn().mockResolvedValue(undefined),
          list: vi.fn().mockResolvedValue([]),
        },
        guilds: {
          list: vi.fn().mockResolvedValue([]),
          get: ok(),
        },
        channels: {
          list: vi.fn().mockResolvedValue([]),
        },
        members: {
          list: vi.fn().mockResolvedValue([]),
          get: ok(),
        },
      },
    },
  }
}

describe("runDiscordOperation (full Corsair surface)", () => {
  let client: DiscordApiClient

  beforeEach(() => {
    client = mockClient()
  })

  it("SEND_MESSAGE", async () => {
    const out = await runDiscordOperation(client, fields())
    expect(client.discord.api.messages.send).toHaveBeenCalledWith(
      expect.objectContaining({ channel_id: "ch1", content: "hello" }),
    )
    expect(out.operation).toBe("SEND_MESSAGE")
  })

  it("requires channelId and content", async () => {
    await expect(
      runDiscordOperation(client, fields({ channelId: "" })),
    ).rejects.toThrow(/channelId/)
    await expect(
      runDiscordOperation(client, fields({ content: "" })),
    ).rejects.toThrow(/content/)
  })

  it("REPLY_MESSAGE requires messageId", async () => {
    await expect(
      runDiscordOperation(
        client,
        fields({ operation: "REPLY_MESSAGE", messageId: "" }),
      ),
    ).rejects.toThrow(/messageId/)
  })

  it("REPLY_MESSAGE", async () => {
    await runDiscordOperation(
      client,
      fields({
        operation: "REPLY_MESSAGE",
        messageId: "m1",
        content: "pong",
      }),
    )
    expect(client.discord.api.messages.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        channel_id: "ch1",
        message_id: "m1",
        content: "pong",
      }),
    )
  })

  it("GET/LIST/EDIT/DELETE messages", async () => {
    await runDiscordOperation(
      client,
      fields({ operation: "GET_MESSAGE", messageId: "m1" }),
    )
    await runDiscordOperation(client, fields({ operation: "LIST_MESSAGES" }))
    await runDiscordOperation(
      client,
      fields({
        operation: "EDIT_MESSAGE",
        messageId: "m1",
        content: "edited",
      }),
    )
    await runDiscordOperation(
      client,
      fields({ operation: "DELETE_MESSAGE", messageId: "m1" }),
    )
    expect(client.discord.api.messages.get).toHaveBeenCalled()
    expect(client.discord.api.messages.list).toHaveBeenCalled()
    expect(client.discord.api.messages.edit).toHaveBeenCalled()
    expect(client.discord.api.messages.delete).toHaveBeenCalled()
  })

  it("CREATE_THREAD requires threadName", async () => {
    await expect(
      runDiscordOperation(
        client,
        fields({ operation: "CREATE_THREAD", threadName: "" }),
      ),
    ).rejects.toThrow(/threadName/)
  })

  it("CREATE_THREAD and CREATE_THREAD_FROM_MESSAGE", async () => {
    await runDiscordOperation(
      client,
      fields({ operation: "CREATE_THREAD", threadName: "help" }),
    )
    await runDiscordOperation(
      client,
      fields({
        operation: "CREATE_THREAD_FROM_MESSAGE",
        messageId: "m1",
        threadName: "help2",
        autoArchiveDuration: "1440",
      }),
    )
    expect(client.discord.api.threads.create).toHaveBeenCalled()
    expect(client.discord.api.threads.createFromMessage).toHaveBeenCalledWith(
      expect.objectContaining({ auto_archive_duration: 1440 }),
    )
  })

  it("ADD_REACTION requires emoji", async () => {
    await expect(
      runDiscordOperation(
        client,
        fields({
          operation: "ADD_REACTION",
          messageId: "m1",
          emoji: "",
        }),
      ),
    ).rejects.toThrow(/emoji/)
  })

  it("reactions add/remove/list", async () => {
    await runDiscordOperation(
      client,
      fields({
        operation: "ADD_REACTION",
        messageId: "m1",
        emoji: "👍",
      }),
    )
    await runDiscordOperation(
      client,
      fields({
        operation: "REMOVE_REACTION",
        messageId: "m1",
        emoji: "👍",
      }),
    )
    await runDiscordOperation(
      client,
      fields({
        operation: "LIST_REACTIONS",
        messageId: "m1",
        emoji: "👍",
      }),
    )
    expect(client.discord.api.reactions.add).toHaveBeenCalled()
    expect(client.discord.api.reactions.remove).toHaveBeenCalled()
    expect(client.discord.api.reactions.list).toHaveBeenCalled()
  })

  it("GET_GUILD requires guildId", async () => {
    await expect(
      runDiscordOperation(client, fields({ operation: "GET_GUILD" })),
    ).rejects.toThrow(/guildId/)
  })

  it("guilds / channels / members", async () => {
    await runDiscordOperation(client, fields({ operation: "LIST_GUILDS" }))
    await runDiscordOperation(
      client,
      fields({ operation: "GET_GUILD", guildId: "g1" }),
    )
    await runDiscordOperation(
      client,
      fields({ operation: "LIST_CHANNELS", guildId: "g1" }),
    )
    await runDiscordOperation(
      client,
      fields({ operation: "LIST_MEMBERS", guildId: "g1" }),
    )
    await runDiscordOperation(
      client,
      fields({
        operation: "GET_MEMBER",
        guildId: "g1",
        userId: "u1",
      }),
    )
    expect(client.discord.api.guilds.list).toHaveBeenCalled()
    expect(client.discord.api.guilds.get).toHaveBeenCalled()
    expect(client.discord.api.channels.list).toHaveBeenCalled()
    expect(client.discord.api.members.list).toHaveBeenCalled()
    expect(client.discord.api.members.get).toHaveBeenCalledWith(
      expect.objectContaining({ guild_id: "g1", user_id: "u1" }),
    )
  })

  it("GET_MEMBER requires userId", async () => {
    await expect(
      runDiscordOperation(
        client,
        fields({ operation: "GET_MEMBER", guildId: "g1", userId: "" }),
      ),
    ).rejects.toThrow(/userId/)
  })

  it("invalid embedsJson", async () => {
    await expect(
      runDiscordOperation(
        client,
        fields({ content: "", embedsJson: "not-json" }),
      ),
    ).rejects.toThrow(/JSON/)
    await expect(
      runDiscordOperation(
        client,
        fields({ content: "", embedsJson: '{"a":1}' }),
      ),
    ).rejects.toThrow(/array/)
  })

  it("accepts Corsair path keys", async () => {
    const out = await runDiscordOperation(
      client,
      fields({ operation: "messages.send" }),
    )
    expect(out.operation).toBe("SEND_MESSAGE")
  })

  it("isDiscordCorsairOp", () => {
    expect(isDiscordCorsairOp("SEND_MESSAGE")).toBe(true)
    expect(isDiscordCorsairOp("LIST_GUILDS")).toBe(true)
    expect(isDiscordCorsairOp("NOPE")).toBe(false)
  })
})
