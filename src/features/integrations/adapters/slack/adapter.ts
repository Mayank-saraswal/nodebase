/**
 * Slack Corsair adapter — templates → runSlackOperation → context slice.
 */

import { NonRetriableError } from "inngest"
import type { IntegrationAdapter } from "../../types"
import { t, tNumber } from "../_shared/resolve-fields"
import { mapCorsairError } from "@/lib/corsair/errors"
import {
  isSlackLegacyOnlyOp,
  runSlackOperation,
  type ResolvedSlackFields,
  type SlackApiClient,
} from "./operations"

function num(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

export const slackAdapter: IntegrationAdapter = {
  pluginId: "slack",
  async run({ data, context, client, userId: _userId }) {
    void _userId
    // unknown: Node.data JSON boundary
    const config = (data ?? {}) as Record<string, unknown>
    const operation = String(config.operation ?? "MESSAGE_SEND")
    const variableName = String(config.variableName || "slack")

    // Product ops not in Corsair package — force dual-path fallthrough
    if (isSlackLegacyOnlyOp(operation)) {
      throw new NonRetriableError(
        `Slack ${operation}: use legacy path (not in @corsair-dev/slack). ` +
          `Set CORSAIR_PLUGIN_SLACK=false or switch to a Corsair-backed op.`,
      )
    }

    if (!client || typeof client !== "object") {
      throw new NonRetriableError(
        "Slack Corsair: missing tenant client. Ensure multi-tenant Corsair is configured.",
      )
    }

    const slackClient = client as SlackApiClient
    if (!slackClient.slack?.api) {
      throw new NonRetriableError(
        "Slack Corsair: client.slack.api missing. Is @corsair-dev/slack registered?",
      )
    }

    const fields: ResolvedSlackFields = {
      operation,
      channel: t(config.channel as string, context),
      message: t(
        (config.message as string) || (config.content as string) || "",
        context,
      ),
      threadTs: t(config.threadTs as string, context),
      messageTs: t(config.messageTs as string, context),
      channelName: t(config.channelName as string, context),
      channelTopic: t(config.channelTopic as string, context),
      channelPurpose: t(config.channelPurpose as string, context),
      slackUserId: t(
        (config.userId as string) || (config.slackUserId as string) || "",
        context,
      ),
      emoji: t(config.emoji as string, context),
      blockKit: t(config.blockKit as string, context),
      botName: t(config.botName as string, context),
      iconEmoji: t(config.iconEmoji as string, context),
      filename: t(config.filename as string, context),
      title: t(config.title as string, context),
      initialComment: t(config.initialComment as string, context),
      email: t(config.email as string, context),
      statusText: t(config.statusText as string, context),
      statusEmoji: t(config.statusEmoji as string, context),
      fileId: t(config.fileId as string, context),
      content: t(config.content as string, context),
      searchQuery: t(
        (config.searchQuery as string) || (config.query as string) || "",
        context,
      ),
      limit:
        tNumber(config.limit as string | number | undefined, context) ??
        num(config.limit, 100),
      isPrivate: Boolean(config.isPrivate),
      excludeArchived: Boolean(config.excludeArchived),
      channelTypes: t(config.channelTypes as string, context),
      unfurlLinks: config.unfurlLinks === false ? false : true,
    }

    let apiResult: Record<string, unknown>
    try {
      apiResult = await runSlackOperation(slackClient, fields)
    } catch (err) {
      if (err instanceof NonRetriableError) throw err
      mapCorsairError(err, "Slack")
    }

    return {
      ...context,
      [variableName]: {
        operation,
        ...apiResult,
        timestamp: new Date().toISOString(),
      },
    }
  },
}
