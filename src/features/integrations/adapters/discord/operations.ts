/**
 * Discord Corsair operations — full @corsair-dev/discord surface.
 */

import { NonRetriableError } from "inngest"
import { discordIntegrationDefinition } from "@/features/integrations/registry/integrations/discord"
import { resolveOperation } from "@/features/integrations/registry/resolve"

type ApiFn = (args?: Record<string, unknown>) => Promise<unknown>

export type DiscordApiClient = {
  discord: {
    api: {
      messages: {
        send: ApiFn
        reply: ApiFn
        get: ApiFn
        list: ApiFn
        edit: ApiFn
        delete: ApiFn
      }
      threads: {
        create: ApiFn
        createFromMessage: ApiFn
      }
      reactions: {
        add: ApiFn
        remove: ApiFn
        list: ApiFn
      }
      guilds: {
        list: ApiFn
        get: ApiFn
      }
      channels: {
        list: ApiFn
      }
      members: {
        list: ApiFn
        get: ApiFn
      }
    }
  }
}

export type ResolvedDiscordFields = {
  operation: string
  channelId: string
  messageId: string
  content: string
  guildId: string
  userId: string
  emoji: string
  threadName: string
  embedsJson: string
  limit: number
  before: string
  after: string
  around: string
  tts: boolean
  autoArchiveDuration: string
}

function asRecord(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {}
}

function wrap(operation: string, data: unknown): Record<string, unknown> {
  return { operation, ...asRecord(data), data }
}

function normalizeOp(raw: string): string {
  const { operation, requestedKey } = resolveOperation(
    discordIntegrationDefinition,
    raw,
  )
  if (operation.aliases?.includes(requestedKey)) return requestedKey
  return operation.aliases?.[0] ?? operation.key
}

export function isDiscordCorsairOp(operation: string): boolean {
  try {
    resolveOperation(discordIntegrationDefinition, operation)
    return true
  } catch {
    return false
  }
}

function requireChannel(fields: ResolvedDiscordFields, op: string) {
  if (!fields.channelId.trim()) {
    throw new NonRetriableError(`Discord ${op}: channelId is required.`)
  }
}

function requireMessage(fields: ResolvedDiscordFields, op: string) {
  if (!fields.messageId.trim()) {
    throw new NonRetriableError(`Discord ${op}: messageId is required.`)
  }
}

function requireGuild(fields: ResolvedDiscordFields, op: string) {
  if (!fields.guildId.trim()) {
    throw new NonRetriableError(`Discord ${op}: guildId is required.`)
  }
}

function parseEmbeds(fields: ResolvedDiscordFields): unknown[] | undefined {
  const raw = fields.embedsJson.trim()
  if (!raw) return undefined
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      throw new NonRetriableError(
        "Discord embedsJson must be a JSON array of embed objects.",
      )
    }
    return parsed
  } catch (e) {
    if (e instanceof NonRetriableError) throw e
    throw new NonRetriableError(
      "Discord embedsJson is invalid JSON.",
    )
  }
}

function archiveDuration(
  fields: ResolvedDiscordFields,
): 60 | 1440 | 4320 | 10080 | undefined {
  const n = Number(fields.autoArchiveDuration)
  if (n === 60 || n === 1440 || n === 4320 || n === 10080) return n
  return undefined
}

export async function runDiscordOperation(
  client: DiscordApiClient,
  fields: ResolvedDiscordFields,
): Promise<Record<string, unknown>> {
  const api = client.discord.api
  const op = normalizeOp(fields.operation)
  const channel_id = fields.channelId
  const message_id = fields.messageId
  const embeds = parseEmbeds(fields)

  switch (op) {
    case "SEND_MESSAGE":
    case "POST_MESSAGE":
    case "messages.send": {
      requireChannel(fields, "SEND_MESSAGE")
      if (!fields.content.trim() && !embeds) {
        throw new NonRetriableError(
          "Discord SEND_MESSAGE: content or embedsJson is required.",
        )
      }
      const data = await api.messages.send({
        channel_id,
        content: fields.content || undefined,
        embeds,
        tts: fields.tts || undefined,
      })
      return wrap("SEND_MESSAGE", data)
    }
    case "REPLY_MESSAGE":
    case "messages.reply": {
      requireChannel(fields, "REPLY_MESSAGE")
      requireMessage(fields, "REPLY_MESSAGE")
      if (!fields.content.trim() && !embeds) {
        throw new NonRetriableError(
          "Discord REPLY_MESSAGE: content or embedsJson is required.",
        )
      }
      const data = await api.messages.reply({
        channel_id,
        message_id,
        content: fields.content || undefined,
        embeds,
      })
      return wrap("REPLY_MESSAGE", data)
    }
    case "GET_MESSAGE":
    case "messages.get": {
      requireChannel(fields, "GET_MESSAGE")
      requireMessage(fields, "GET_MESSAGE")
      const data = await api.messages.get({ channel_id, message_id })
      return wrap("GET_MESSAGE", data)
    }
    case "LIST_MESSAGES":
    case "messages.list": {
      requireChannel(fields, "LIST_MESSAGES")
      const data = await api.messages.list({
        channel_id,
        limit: fields.limit || undefined,
        before: fields.before || undefined,
        after: fields.after || undefined,
        around: fields.around || undefined,
      })
      return wrap("LIST_MESSAGES", data)
    }
    case "EDIT_MESSAGE":
    case "messages.edit": {
      requireChannel(fields, "EDIT_MESSAGE")
      requireMessage(fields, "EDIT_MESSAGE")
      if (!fields.content.trim() && !embeds) {
        throw new NonRetriableError(
          "Discord EDIT_MESSAGE: content or embedsJson is required.",
        )
      }
      const data = await api.messages.edit({
        channel_id,
        message_id,
        content: fields.content || undefined,
        embeds,
      })
      return wrap("EDIT_MESSAGE", data)
    }
    case "DELETE_MESSAGE":
    case "messages.delete": {
      requireChannel(fields, "DELETE_MESSAGE")
      requireMessage(fields, "DELETE_MESSAGE")
      const data = await api.messages.delete({ channel_id, message_id })
      return wrap("DELETE_MESSAGE", data)
    }
    case "CREATE_THREAD":
    case "threads.create": {
      requireChannel(fields, "CREATE_THREAD")
      if (!fields.threadName.trim()) {
        throw new NonRetriableError(
          "Discord CREATE_THREAD: threadName is required.",
        )
      }
      const data = await api.threads.create({
        channel_id,
        name: fields.threadName,
        auto_archive_duration: archiveDuration(fields),
      })
      return wrap("CREATE_THREAD", data)
    }
    case "CREATE_THREAD_FROM_MESSAGE":
    case "threads.createFromMessage": {
      requireChannel(fields, "CREATE_THREAD_FROM_MESSAGE")
      requireMessage(fields, "CREATE_THREAD_FROM_MESSAGE")
      if (!fields.threadName.trim()) {
        throw new NonRetriableError(
          "Discord CREATE_THREAD_FROM_MESSAGE: threadName is required.",
        )
      }
      const data = await api.threads.createFromMessage({
        channel_id,
        message_id,
        name: fields.threadName,
        auto_archive_duration: archiveDuration(fields),
      })
      return wrap("CREATE_THREAD_FROM_MESSAGE", data)
    }
    case "ADD_REACTION":
    case "reactions.add": {
      requireChannel(fields, "ADD_REACTION")
      requireMessage(fields, "ADD_REACTION")
      if (!fields.emoji.trim()) {
        throw new NonRetriableError("Discord ADD_REACTION: emoji is required.")
      }
      const data = await api.reactions.add({
        channel_id,
        message_id,
        emoji: fields.emoji,
      })
      return wrap("ADD_REACTION", data)
    }
    case "REMOVE_REACTION":
    case "reactions.remove": {
      requireChannel(fields, "REMOVE_REACTION")
      requireMessage(fields, "REMOVE_REACTION")
      if (!fields.emoji.trim()) {
        throw new NonRetriableError(
          "Discord REMOVE_REACTION: emoji is required.",
        )
      }
      const data = await api.reactions.remove({
        channel_id,
        message_id,
        emoji: fields.emoji,
      })
      return wrap("REMOVE_REACTION", data)
    }
    case "LIST_REACTIONS":
    case "reactions.list": {
      requireChannel(fields, "LIST_REACTIONS")
      requireMessage(fields, "LIST_REACTIONS")
      if (!fields.emoji.trim()) {
        throw new NonRetriableError(
          "Discord LIST_REACTIONS: emoji is required.",
        )
      }
      const data = await api.reactions.list({
        channel_id,
        message_id,
        emoji: fields.emoji,
        limit: fields.limit || undefined,
        after: fields.after || undefined,
      })
      return wrap("LIST_REACTIONS", data)
    }
    case "LIST_GUILDS":
    case "guilds.list": {
      const data = await api.guilds.list({
        limit: fields.limit || undefined,
        before: fields.before || undefined,
        after: fields.after || undefined,
      })
      return wrap("LIST_GUILDS", data)
    }
    case "GET_GUILD":
    case "guilds.get": {
      requireGuild(fields, "GET_GUILD")
      const data = await api.guilds.get({ guild_id: fields.guildId })
      return wrap("GET_GUILD", data)
    }
    case "LIST_CHANNELS":
    case "channels.list": {
      requireGuild(fields, "LIST_CHANNELS")
      const data = await api.channels.list({ guild_id: fields.guildId })
      return wrap("LIST_CHANNELS", data)
    }
    case "LIST_MEMBERS":
    case "members.list": {
      requireGuild(fields, "LIST_MEMBERS")
      const data = await api.members.list({
        guild_id: fields.guildId,
        limit: fields.limit || undefined,
        after: fields.after || undefined,
      })
      return wrap("LIST_MEMBERS", data)
    }
    case "GET_MEMBER":
    case "members.get": {
      requireGuild(fields, "GET_MEMBER")
      if (!fields.userId.trim()) {
        throw new NonRetriableError("Discord GET_MEMBER: userId is required.")
      }
      const data = await api.members.get({
        guild_id: fields.guildId,
        user_id: fields.userId,
      })
      return wrap("GET_MEMBER", data)
    }
    default:
      throw new NonRetriableError(
        `Discord ${op}: not available on Corsair path. Disable CORSAIR_PLUGIN_DISCORD for this op or use a supported API operation.`,
      )
  }
}
