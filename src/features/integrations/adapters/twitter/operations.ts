/**
 * X/Twitter Corsair operations — full @corsair-dev/twitter surface.
 */

import { NonRetriableError } from "inngest"
import { twitterIntegrationDefinition } from "@/features/integrations/registry/integrations/twitter"
import { resolveOperation } from "@/features/integrations/registry/resolve"

type ApiFn = (args?: Record<string, unknown>) => Promise<unknown>

export type TwitterApiClient = {
  twitter: {
    api: {
      tweets: {
        create: ApiFn
        createReply: ApiFn
      }
    }
  }
}

export type ResolvedTwitterFields = {
  operation: string
  text: string
  quoteTweetId: string
  inReplyToTweetId: string
  mediaIds: string
  replySettings: string
  excludeReplyUserIds: string
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
    twitterIntegrationDefinition,
    raw,
  )
  if (operation.aliases?.includes(requestedKey)) return requestedKey
  return operation.aliases?.[0] ?? operation.key
}

export function isTwitterCorsairOp(operation: string): boolean {
  try {
    resolveOperation(twitterIntegrationDefinition, operation)
    return true
  } catch {
    return false
  }
}

function parseCsvIds(raw: string): string[] | undefined {
  const parts = raw
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  return parts.length ? parts : undefined
}

export async function runTwitterOperation(
  client: TwitterApiClient,
  fields: ResolvedTwitterFields,
): Promise<Record<string, unknown>> {
  const api = client.twitter.api
  const op = normalizeOp(fields.operation)

  switch (op) {
    case "POST_TWEET":
    case "CREATE_TWEET":
    case "SEND_TWEET":
    case "tweets.create": {
      if (!fields.text.trim()) {
        throw new NonRetriableError("X POST_TWEET: text is required.")
      }
      const mediaIds = parseCsvIds(fields.mediaIds)
      const replySettings = fields.replySettings.trim()
      const data = await api.tweets.create({
        text: fields.text.slice(0, 280),
        quoteTweetId: fields.quoteTweetId.trim() || undefined,
        mediaIds,
        replySettings:
          replySettings === "following" ||
          replySettings === "mentionedUsers" ||
          replySettings === "subscribers"
            ? replySettings
            : undefined,
      })
      return wrap("POST_TWEET", data)
    }
    case "REPLY_TWEET":
    case "CREATE_REPLY":
    case "tweets.createReply": {
      if (!fields.text.trim()) {
        throw new NonRetriableError("X REPLY_TWEET: text is required.")
      }
      if (!fields.inReplyToTweetId.trim()) {
        throw new NonRetriableError(
          "X REPLY_TWEET: inReplyToTweetId is required.",
        )
      }
      const data = await api.tweets.createReply({
        text: fields.text.slice(0, 280),
        inReplyToTweetId: fields.inReplyToTweetId.trim(),
        excludeReplyUserIds: parseCsvIds(fields.excludeReplyUserIds),
      })
      return wrap("REPLY_TWEET", data)
    }
    default:
      throw new NonRetriableError(
        `X ${op}: not available on Corsair path. Disable CORSAIR_PLUGIN_TWITTER for this op or use a supported API operation.`,
      )
  }
}
