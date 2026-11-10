/**
 * Slack Corsair operations — product ops + full @corsair-dev/slack surface.
 * Client shape: tenant.slack.api.messages|channels|users|files|reactions|stars|…
 */

import { NonRetriableError } from "inngest"
import { SlackOperation } from "@/features/executions/enums"
import { slackIntegrationDefinition } from "@/features/integrations/registry/integrations/slack"
import { resolveOperation } from "@/features/integrations/registry/resolve"

/** Minimal Corsair Slack tenant client surface */
export type SlackApiClient = {
  slack: {
    api: {
      messages: {
        post: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        update: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        delete: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        getPermalink: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        search: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
      }
      channels: {
        get: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        list: (args?: Record<string, unknown>) => Promise<Record<string, unknown>>
        create: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        archive: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        unarchive: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        invite: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        kick: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        setTopic: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        setPurpose: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        getHistory: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        rename: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        open: (args?: Record<string, unknown>) => Promise<Record<string, unknown>>
        close: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        join: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        leave: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        getMembers: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        getReplies: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
      }
      users: {
        get: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        list: (args?: Record<string, unknown>) => Promise<Record<string, unknown>>
        getProfile: (args?: Record<string, unknown>) => Promise<Record<string, unknown>>
        getPresence: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        updateProfile: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
      }
      reactions: {
        add: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        remove: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        get: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
      }
      files: {
        get: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        list: (args?: Record<string, unknown>) => Promise<Record<string, unknown>>
        upload: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
      }
      stars: {
        add: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        remove: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        list: (args?: Record<string, unknown>) => Promise<Record<string, unknown>>
      }
    }
  }
}

export type ResolvedSlackFields = {
  operation: string
  channel: string
  message: string
  threadTs: string
  messageTs: string
  channelName: string
  channelTopic: string
  channelPurpose: string
  /** Slack user id(s) — comma-separated for invite */
  slackUserId: string
  emoji: string
  blockKit: string
  botName: string
  iconEmoji: string
  filename: string
  title: string
  initialComment: string
  email: string
  statusText: string
  statusEmoji: string
  fileId: string
  content: string
  searchQuery: string
  limit: number
  isPrivate: boolean
  excludeArchived: boolean
  channelTypes: string
  unfurlLinks: boolean
}

function asRecord(v: unknown): Record<string, unknown> {
  // unknown: Slack API responses are free-form JSON objects
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {}
}

function normalizeSlackOp(raw: string): string {
  const { operation, requestedKey } = resolveOperation(
    slackIntegrationDefinition,
    raw,
  )
  if (operation.aliases?.includes(requestedKey)) {
    return requestedKey
  }
  return operation.aliases?.[0] ?? operation.key
}

function parseBlocks(blockKit: string): Array<Record<string, unknown>> | undefined {
  if (!blockKit.trim()) return undefined
  try {
    // unknown: Block Kit JSON from node config
    const parsed: unknown = JSON.parse(blockKit)
    if (!Array.isArray(parsed)) {
      throw new NonRetriableError(
        "Block Kit JSON must be an array of block objects.",
      )
    }
    return parsed as Array<Record<string, unknown>>
  } catch (e) {
    if (e instanceof NonRetriableError) throw e
    throw new NonRetriableError(
      `Invalid Block Kit JSON: ${e instanceof Error ? e.message : String(e)}`,
    )
  }
}

/** Ops that must stay on legacy REST (not in Corsair package) */
const LEGACY_ONLY = new Set([
  SlackOperation.MESSAGE_SEND_WEBHOOK,
  "MESSAGE_SEND_WEBHOOK",
  "messages.sendWebhook",
  SlackOperation.MESSAGE_SCHEDULE,
  "MESSAGE_SCHEDULE",
  "messages.schedule",
  SlackOperation.USER_GET_BY_EMAIL,
  "USER_GET_BY_EMAIL",
  "users.getByEmail",
])

export function isSlackLegacyOnlyOp(operation: string): boolean {
  try {
    const key = normalizeSlackOp(operation)
    return LEGACY_ONLY.has(key)
  } catch {
    return LEGACY_ONLY.has(operation)
  }
}

export async function runSlackOperation(
  client: SlackApiClient,
  fields: ResolvedSlackFields,
): Promise<Record<string, unknown>> {
  const api = client.slack.api
  const op = normalizeSlackOp(fields.operation)

  if (LEGACY_ONLY.has(op)) {
    throw new NonRetriableError(
      `Slack ${op}: not available on Corsair path. Disable CORSAIR_PLUGIN_SLACK for this op or use a supported API operation.`,
    )
  }

  const blocks = parseBlocks(fields.blockKit)

  switch (op) {
    case SlackOperation.MESSAGE_SEND:
    case "MESSAGE_SEND": {
      if (!fields.channel.trim()) {
        throw new NonRetriableError("Slack MESSAGE_SEND: channel is required.")
      }
      if (!fields.message.trim() && !blocks) {
        throw new NonRetriableError(
          "Slack MESSAGE_SEND: message text or blockKit is required.",
        )
      }
      const data = await api.messages.post({
        channel: fields.channel,
        text: fields.message || undefined,
        thread_ts: fields.threadTs || undefined,
        blocks,
        unfurl_links: fields.unfurlLinks,
        username: fields.botName || undefined,
        icon_emoji: fields.iconEmoji || undefined,
      })
      const message = asRecord(data.message)
      return {
        operation: "MESSAGE_SEND",
        ok: data.ok,
        messageTs: message.ts ?? data.ts,
        channelId: data.channel,
      }
    }

    case SlackOperation.MESSAGE_UPDATE:
    case "MESSAGE_UPDATE": {
      if (!fields.channel.trim() || !fields.messageTs.trim()) {
        throw new NonRetriableError(
          "Slack MESSAGE_UPDATE: channel and messageTs are required.",
        )
      }
      const data = await api.messages.update({
        channel: fields.channel,
        ts: fields.messageTs,
        text: fields.message || undefined,
        blocks,
      })
      return {
        operation: "MESSAGE_UPDATE",
        messageTs: data.ts,
        channel: data.channel,
      }
    }

    case SlackOperation.MESSAGE_DELETE:
    case "MESSAGE_DELETE": {
      if (!fields.channel.trim() || !fields.messageTs.trim()) {
        throw new NonRetriableError(
          "Slack MESSAGE_DELETE: channel and messageTs are required.",
        )
      }
      const data = await api.messages.delete({
        channel: fields.channel,
        ts: fields.messageTs,
      })
      return {
        operation: "MESSAGE_DELETE",
        messageTs: data.ts,
        channel: data.channel,
      }
    }

    case SlackOperation.MESSAGE_GET_PERMALINK:
    case "MESSAGE_GET_PERMALINK": {
      if (!fields.channel.trim() || !fields.messageTs.trim()) {
        throw new NonRetriableError(
          "Slack MESSAGE_GET_PERMALINK: channel and messageTs are required.",
        )
      }
      const data = await api.messages.getPermalink({
        channel: fields.channel,
        message_ts: fields.messageTs,
      })
      return {
        operation: "MESSAGE_GET_PERMALINK",
        permalink: data.permalink,
        channel: fields.channel,
        messageTs: fields.messageTs,
      }
    }

    case SlackOperation.MESSAGE_SEARCH:
    case "MESSAGE_SEARCH": {
      if (!fields.searchQuery.trim()) {
        throw new NonRetriableError(
          "Slack MESSAGE_SEARCH: searchQuery is required.",
        )
      }
      const data = await api.messages.search({
        query: fields.searchQuery,
        count: fields.limit || 20,
      })
      return {
        operation: "MESSAGE_SEARCH",
        query: fields.searchQuery,
        ...data,
      }
    }

    case SlackOperation.CHANNEL_GET:
    case SlackOperation.CHANNEL_INFO:
    case "CHANNEL_GET":
    case "CHANNEL_INFO": {
      if (!fields.channel.trim()) {
        throw new NonRetriableError("Slack CHANNEL_GET: channel is required.")
      }
      const data = await api.channels.get({
        channel: fields.channel,
        include_num_members: true,
      })
      const ch = asRecord(data.channel)
      return {
        operation: "CHANNEL_GET",
        channelId: ch.id,
        name: ch.name,
        memberCount: ch.num_members,
        topic: asRecord(ch.topic).value,
        purpose: asRecord(ch.purpose).value,
      }
    }

    case SlackOperation.CHANNEL_LIST:
    case "CHANNEL_LIST": {
      const data = await api.channels.list({
        exclude_archived: fields.excludeArchived,
        types: fields.channelTypes || undefined,
        limit: fields.limit || 100,
      })
      const channels = (data.channels as unknown[]) ?? []
      return {
        operation: "CHANNEL_LIST",
        channels,
        count: channels.length,
      }
    }

    case SlackOperation.CHANNEL_CREATE:
    case "CHANNEL_CREATE": {
      if (!fields.channelName.trim()) {
        throw new NonRetriableError(
          "Slack CHANNEL_CREATE: channelName is required.",
        )
      }
      const data = await api.channels.create({
        name: fields.channelName,
        is_private: fields.isPrivate,
      })
      const ch = asRecord(data.channel)
      return {
        operation: "CHANNEL_CREATE",
        channelId: ch.id,
        name: ch.name,
      }
    }

    case SlackOperation.CHANNEL_ARCHIVE:
    case "CHANNEL_ARCHIVE": {
      if (!fields.channel.trim()) {
        throw new NonRetriableError("Slack CHANNEL_ARCHIVE: channel is required.")
      }
      await api.channels.archive({ channel: fields.channel })
      return { operation: "CHANNEL_ARCHIVE", ok: true, channel: fields.channel }
    }

    case SlackOperation.CHANNEL_UNARCHIVE:
    case "CHANNEL_UNARCHIVE": {
      if (!fields.channel.trim()) {
        throw new NonRetriableError(
          "Slack CHANNEL_UNARCHIVE: channel is required.",
        )
      }
      await api.channels.unarchive({ channel: fields.channel })
      return {
        operation: "CHANNEL_UNARCHIVE",
        ok: true,
        channel: fields.channel,
      }
    }

    case SlackOperation.CHANNEL_INVITE:
    case "CHANNEL_INVITE": {
      if (!fields.channel.trim() || !fields.slackUserId.trim()) {
        throw new NonRetriableError(
          "Slack CHANNEL_INVITE: channel and userId(s) are required.",
        )
      }
      await api.channels.invite({
        channel: fields.channel,
        users: fields.slackUserId,
      })
      return {
        operation: "CHANNEL_INVITE",
        ok: true,
        channel: fields.channel,
        users: fields.slackUserId,
      }
    }

    case SlackOperation.CHANNEL_KICK:
    case "CHANNEL_KICK": {
      if (!fields.channel.trim() || !fields.slackUserId.trim()) {
        throw new NonRetriableError(
          "Slack CHANNEL_KICK: channel and userId are required.",
        )
      }
      await api.channels.kick({
        channel: fields.channel,
        user: fields.slackUserId.split(",")[0]?.trim(),
      })
      return {
        operation: "CHANNEL_KICK",
        ok: true,
        channel: fields.channel,
        user: fields.slackUserId,
      }
    }

    case SlackOperation.CHANNEL_SET_TOPIC:
    case "CHANNEL_SET_TOPIC": {
      if (!fields.channel.trim()) {
        throw new NonRetriableError(
          "Slack CHANNEL_SET_TOPIC: channel is required.",
        )
      }
      await api.channels.setTopic({
        channel: fields.channel,
        topic: fields.channelTopic,
      })
      return {
        operation: "CHANNEL_SET_TOPIC",
        ok: true,
        topic: fields.channelTopic,
      }
    }

    case SlackOperation.CHANNEL_SET_PURPOSE:
    case "CHANNEL_SET_PURPOSE": {
      if (!fields.channel.trim()) {
        throw new NonRetriableError(
          "Slack CHANNEL_SET_PURPOSE: channel is required.",
        )
      }
      await api.channels.setPurpose({
        channel: fields.channel,
        purpose: fields.channelPurpose,
      })
      return {
        operation: "CHANNEL_SET_PURPOSE",
        ok: true,
        purpose: fields.channelPurpose,
      }
    }

    case SlackOperation.CHANNEL_HISTORY:
    case "CHANNEL_HISTORY": {
      if (!fields.channel.trim()) {
        throw new NonRetriableError(
          "Slack CHANNEL_HISTORY: channel is required.",
        )
      }
      const data = await api.channels.getHistory({
        channel: fields.channel,
        limit: fields.limit || 100,
      })
      return {
        operation: "CHANNEL_HISTORY",
        messages: data.messages ?? [],
        hasMore: data.has_more ?? false,
      }
    }

    case SlackOperation.CHANNEL_RENAME:
    case "CHANNEL_RENAME": {
      if (!fields.channel.trim() || !fields.channelName.trim()) {
        throw new NonRetriableError(
          "Slack CHANNEL_RENAME: channel and channelName are required.",
        )
      }
      const data = await api.channels.rename({
        channel: fields.channel,
        name: fields.channelName,
      })
      const ch = asRecord(data.channel)
      return {
        operation: "CHANNEL_RENAME",
        channelId: ch.id,
        name: ch.name,
      }
    }

    case SlackOperation.CONVERSATION_OPEN:
    case "CONVERSATION_OPEN":
    case "CHANNEL_OPEN": {
      const data = await api.channels.open({
        users: fields.slackUserId || undefined,
        channel: fields.channel || undefined,
      })
      const ch = asRecord(data.channel)
      return {
        operation: "CONVERSATION_OPEN",
        channelId: ch.id ?? data.channel,
      }
    }

    case "CHANNEL_CLOSE": {
      if (!fields.channel.trim()) {
        throw new NonRetriableError("Slack CHANNEL_CLOSE: channel is required.")
      }
      await api.channels.close({ channel: fields.channel })
      return { operation: "CHANNEL_CLOSE", ok: true, channel: fields.channel }
    }

    case "CHANNEL_JOIN": {
      if (!fields.channel.trim()) {
        throw new NonRetriableError("Slack CHANNEL_JOIN: channel is required.")
      }
      const data = await api.channels.join({ channel: fields.channel })
      return { operation: "CHANNEL_JOIN", channel: data.channel }
    }

    case "CHANNEL_LEAVE": {
      if (!fields.channel.trim()) {
        throw new NonRetriableError("Slack CHANNEL_LEAVE: channel is required.")
      }
      await api.channels.leave({ channel: fields.channel })
      return { operation: "CHANNEL_LEAVE", ok: true }
    }

    case "CHANNEL_GET_MEMBERS": {
      if (!fields.channel.trim()) {
        throw new NonRetriableError(
          "Slack CHANNEL_GET_MEMBERS: channel is required.",
        )
      }
      const data = await api.channels.getMembers({
        channel: fields.channel,
        limit: fields.limit || 100,
      })
      return {
        operation: "CHANNEL_GET_MEMBERS",
        members: data.members ?? [],
      }
    }

    case "CHANNEL_GET_REPLIES": {
      if (!fields.channel.trim() || !fields.messageTs.trim()) {
        throw new NonRetriableError(
          "Slack CHANNEL_GET_REPLIES: channel and messageTs are required.",
        )
      }
      const data = await api.channels.getReplies({
        channel: fields.channel,
        ts: fields.messageTs,
      })
      return {
        operation: "CHANNEL_GET_REPLIES",
        messages: data.messages ?? [],
      }
    }

    case SlackOperation.USER_GET:
    case SlackOperation.USER_INFO:
    case "USER_GET":
    case "USER_INFO": {
      if (!fields.slackUserId.trim()) {
        throw new NonRetriableError("Slack USER_GET: userId is required.")
      }
      const data = await api.users.get({
        user: fields.slackUserId.split(",")[0]?.trim(),
      })
      const user = asRecord(data.user)
      return {
        operation: "USER_GET",
        userId: user.id,
        name: user.name,
        realName: user.real_name,
        profile: user.profile,
      }
    }

    case SlackOperation.USER_LIST:
    case "USER_LIST": {
      const data = await api.users.list({
        limit: fields.limit || 100,
      })
      const members = (data.members as unknown[]) ?? []
      return {
        operation: "USER_LIST",
        users: members,
        count: members.length,
      }
    }

    case "USER_GET_PROFILE": {
      const data = await api.users.getProfile({
        user: fields.slackUserId || undefined,
      })
      return {
        operation: "USER_GET_PROFILE",
        profile: data.profile,
      }
    }

    case SlackOperation.USER_GET_PRESENCE:
    case "USER_GET_PRESENCE": {
      if (!fields.slackUserId.trim()) {
        throw new NonRetriableError(
          "Slack USER_GET_PRESENCE: userId is required.",
        )
      }
      const data = await api.users.getPresence({
        user: fields.slackUserId.split(",")[0]?.trim(),
      })
      return {
        operation: "USER_GET_PRESENCE",
        presence: data.presence,
        online: data.online,
      }
    }

    case SlackOperation.USER_SET_STATUS:
    case "USER_SET_STATUS": {
      const data = await api.users.updateProfile({
        profile: {
          status_text: fields.statusText || undefined,
          status_emoji: fields.statusEmoji || undefined,
        },
      })
      return {
        operation: "USER_SET_STATUS",
        profile: data.profile,
      }
    }

    case SlackOperation.REACTION_ADD:
    case "REACTION_ADD": {
      if (!fields.channel.trim() || !fields.messageTs.trim() || !fields.emoji.trim()) {
        throw new NonRetriableError(
          "Slack REACTION_ADD: channel, messageTs, and emoji are required.",
        )
      }
      await api.reactions.add({
        channel: fields.channel,
        timestamp: fields.messageTs,
        name: fields.emoji.replace(/^:/, "").replace(/:$/, ""),
      })
      return {
        operation: "REACTION_ADD",
        ok: true,
        emoji: fields.emoji,
      }
    }

    case SlackOperation.REACTION_REMOVE:
    case "REACTION_REMOVE": {
      if (!fields.channel.trim() || !fields.messageTs.trim() || !fields.emoji.trim()) {
        throw new NonRetriableError(
          "Slack REACTION_REMOVE: channel, messageTs, and emoji are required.",
        )
      }
      await api.reactions.remove({
        channel: fields.channel,
        timestamp: fields.messageTs,
        name: fields.emoji.replace(/^:/, "").replace(/:$/, ""),
      })
      return { operation: "REACTION_REMOVE", ok: true }
    }

    case SlackOperation.REACTION_GET:
    case "REACTION_GET": {
      if (!fields.channel.trim() || !fields.messageTs.trim()) {
        throw new NonRetriableError(
          "Slack REACTION_GET: channel and messageTs are required.",
        )
      }
      const data = await api.reactions.get({
        channel: fields.channel,
        timestamp: fields.messageTs,
      })
      return {
        operation: "REACTION_GET",
        message: data.message,
      }
    }

    case SlackOperation.FILE_GET:
    case SlackOperation.FILE_INFO:
    case "FILE_GET":
    case "FILE_INFO": {
      if (!fields.fileId.trim()) {
        throw new NonRetriableError("Slack FILE_GET: fileId is required.")
      }
      const data = await api.files.get({ file: fields.fileId })
      return {
        operation: "FILE_GET",
        file: data.file,
      }
    }

    case SlackOperation.FILE_LIST:
    case "FILE_LIST": {
      const data = await api.files.list({
        channel: fields.channel || undefined,
        count: fields.limit || 100,
      })
      return {
        operation: "FILE_LIST",
        files: data.files ?? [],
      }
    }

    case SlackOperation.FILE_UPLOAD:
    case "FILE_UPLOAD": {
      if (!fields.content.trim() && !fields.filename.trim()) {
        throw new NonRetriableError(
          "Slack FILE_UPLOAD: content (and filename) are required.",
        )
      }
      const data = await api.files.upload({
        channels: fields.channel || undefined,
        content: fields.content || undefined,
        filename: fields.filename || "file.txt",
        title: fields.title || undefined,
        initial_comment: fields.initialComment || undefined,
      })
      return {
        operation: "FILE_UPLOAD",
        file: data.file,
      }
    }

    case SlackOperation.FILE_DELETE:
    case "FILE_DELETE": {
      // files.delete not in Corsair package — fail clearly
      throw new NonRetriableError(
        "Slack FILE_DELETE: not available in @corsair-dev/slack. Use legacy path or remove the node op.",
      )
    }

    case "STAR_ADD": {
      await api.stars.add({
        channel: fields.channel || undefined,
        timestamp: fields.messageTs || undefined,
        file: fields.fileId || undefined,
      })
      return { operation: "STAR_ADD", ok: true }
    }

    case "STAR_REMOVE": {
      await api.stars.remove({
        channel: fields.channel || undefined,
        timestamp: fields.messageTs || undefined,
        file: fields.fileId || undefined,
      })
      return { operation: "STAR_REMOVE", ok: true }
    }

    case "STAR_LIST": {
      const data = await api.stars.list({ count: fields.limit || 100 })
      return {
        operation: "STAR_LIST",
        items: data.items ?? [],
      }
    }

    default:
      throw new NonRetriableError(
        `Unknown Slack operation: ${fields.operation} (normalized: ${op})`,
      )
  }
}
