/**
 * Telegram Corsair adapter.
 */

import { NonRetriableError } from "inngest"
import type { IntegrationAdapter } from "../../types"
import { t } from "../_shared/resolve-fields"
import { mapCorsairError } from "@/lib/corsair/errors"
import {
  runTelegramOperation,
  type ResolvedTelegramFields,
  type TelegramApiClient,
} from "./operations"

export const telegramAdapter: IntegrationAdapter = {
  pluginId: "telegram",
  async run({ data, context, client, userId: _userId }) {
    void _userId
    // unknown: Node.data JSON boundary
    const config = (data ?? {}) as Record<string, unknown>
    const operation = String(config.operation ?? "SEND_MESSAGE")
    const variableName = String(config.variableName || "telegram")

    if (!client || typeof client !== "object") {
      throw new NonRetriableError("Telegram Corsair: missing tenant client.")
    }
    const tg = client as TelegramApiClient
    if (!tg.telegram?.api) {
      throw new NonRetriableError(
        "Telegram Corsair: client.telegram.api missing. Is @corsair-dev/telegram registered?",
      )
    }

    const fields: ResolvedTelegramFields = {
      operation,
      chatId: t(
        (config.chatId as string) || (config.chat_id as string) || "",
        context,
      ),
      text: t(
        (config.text as string) ||
          (config.message as string) ||
          (config.content as string) ||
          "",
        context,
      ),
      messageId: t(
        (config.messageId as string) || (config.message_id as string) || "",
        context,
      ),
      parseMode: t(
        (config.parseMode as string) || (config.parse_mode as string) || "",
        context,
      ),
      photo: t(config.photo as string, context),
      video: t(config.video as string, context),
      audio: t(config.audio as string, context),
      document: t(config.document as string, context),
      sticker: t(config.sticker as string, context),
      animation: t(config.animation as string, context),
      caption: t(config.caption as string, context),
      latitude: t(config.latitude as string, context),
      longitude: t(config.longitude as string, context),
      mediaGroupJson: t(config.mediaGroupJson as string, context),
      chatAction: t(config.chatAction as string, context),
      userId: t(config.userId as string, context),
      callbackQueryId: t(config.callbackQueryId as string, context),
      inlineQueryId: t(config.inlineQueryId as string, context),
      fileId: t(config.fileId as string, context),
      webhookUrl: t(config.webhookUrl as string, context),
      disableNotification: Boolean(config.disableNotification),
    }

    let apiResult: Record<string, unknown>
    try {
      apiResult = await runTelegramOperation(tg, fields)
    } catch (err) {
      if (err instanceof NonRetriableError) throw err
      mapCorsairError(err, "Telegram")
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
