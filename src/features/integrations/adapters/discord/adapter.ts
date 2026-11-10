/**
 * Discord Corsair adapter.
 */

import { NonRetriableError } from "inngest"
import type { IntegrationAdapter } from "../../types"
import { t, tNumber } from "../_shared/resolve-fields"
import { mapCorsairError } from "@/lib/corsair/errors"
import {
  runDiscordOperation,
  type DiscordApiClient,
  type ResolvedDiscordFields,
} from "./operations"

function num(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

export const discordAdapter: IntegrationAdapter = {
  pluginId: "discord",
  async run({ data, context, client, userId: _userId }) {
    void _userId
    // unknown: Node.data JSON boundary
    const config = (data ?? {}) as Record<string, unknown>
    const operation = String(config.operation ?? "SEND_MESSAGE")
    const variableName = String(config.variableName || "discord")

    if (!client || typeof client !== "object") {
      throw new NonRetriableError("Discord Corsair: missing tenant client.")
    }
    const dc = client as DiscordApiClient
    if (!dc.discord?.api) {
      throw new NonRetriableError(
        "Discord Corsair: client.discord.api missing. Is @corsair-dev/discord registered?",
      )
    }

    const fields: ResolvedDiscordFields = {
      operation,
      channelId: t(
        (config.channelId as string) ||
          (config.channel_id as string) ||
          "",
        context,
      ),
      messageId: t(
        (config.messageId as string) ||
          (config.message_id as string) ||
          "",
        context,
      ),
      content: t(
        (config.content as string) ||
          (config.text as string) ||
          (config.message as string) ||
          "",
        context,
      ),
      guildId: t(
        (config.guildId as string) ||
          (config.guild_id as string) ||
          (config.serverId as string) ||
          "",
        context,
      ),
      userId: t(
        (config.userId as string) || (config.user_id as string) || "",
        context,
      ),
      emoji: t(config.emoji as string, context),
      threadName: t(
        (config.threadName as string) || (config.name as string) || "",
        context,
      ),
      embedsJson: t(
        (config.embedsJson as string) || (config.embeds as string) || "",
        context,
      ),
      limit:
        tNumber(config.limit as string | number | undefined, context) ??
        num(config.limit, 50),
      before: t(config.before as string, context),
      after: t(config.after as string, context),
      around: t(config.around as string, context),
      tts: Boolean(config.tts),
      autoArchiveDuration: t(
        (config.autoArchiveDuration as string) ||
          (config.auto_archive_duration as string) ||
          "",
        context,
      ),
    }

    let apiResult: Record<string, unknown>
    try {
      apiResult = await runDiscordOperation(dc, fields)
    } catch (err) {
      if (err instanceof NonRetriableError) throw err
      mapCorsairError(err, "Discord")
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
