/**
 * Telegram Corsair operations — full @corsair-dev/telegram surface.
 */

import { NonRetriableError } from "inngest"
import { telegramIntegrationDefinition } from "@/features/integrations/registry/integrations/telegram"
import { resolveOperation } from "@/features/integrations/registry/resolve"

type ApiFn = (args?: Record<string, unknown>) => Promise<unknown>

export type TelegramApiClient = {
  telegram: {
    api: {
      messages: {
        sendMessage: ApiFn
        editMessageText: ApiFn
        deleteMessage: ApiFn
        pinChatMessage: ApiFn
        unpinChatMessage: ApiFn
        sendPhoto: ApiFn
        sendVideo: ApiFn
        sendAudio: ApiFn
        sendDocument: ApiFn
        sendSticker: ApiFn
        sendAnimation: ApiFn
        sendLocation: ApiFn
        sendMediaGroup: ApiFn
        sendChatAction: ApiFn
      }
      chat: {
        getChat: ApiFn
        getChatAdministrators: ApiFn
        getChatMember: ApiFn
      }
      callback: {
        answerCallbackQuery: ApiFn
        answerInlineQuery: ApiFn
      }
      file: { getFile: ApiFn }
      me: { getMe: ApiFn }
      updates: { getUpdates: ApiFn }
      webhook: {
        setWebhook: ApiFn
        deleteWebhook: ApiFn
      }
    }
  }
}

export type ResolvedTelegramFields = {
  operation: string
  chatId: string
  text: string
  messageId: string
  parseMode: string
  photo: string
  video: string
  audio: string
  document: string
  sticker: string
  animation: string
  caption: string
  latitude: string
  longitude: string
  mediaGroupJson: string
  chatAction: string
  userId: string
  callbackQueryId: string
  inlineQueryId: string
  fileId: string
  webhookUrl: string
  disableNotification: boolean
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
    telegramIntegrationDefinition,
    raw,
  )
  if (operation.aliases?.includes(requestedKey)) return requestedKey
  return operation.aliases?.[0] ?? operation.key
}

export function isTelegramCorsairOp(operation: string): boolean {
  try {
    resolveOperation(telegramIntegrationDefinition, operation)
    return true
  } catch {
    return false
  }
}

function requireChat(fields: ResolvedTelegramFields, op: string) {
  if (!fields.chatId.trim()) {
    throw new NonRetriableError(`Telegram ${op}: chatId is required.`)
  }
}

export async function runTelegramOperation(
  client: TelegramApiClient,
  fields: ResolvedTelegramFields,
): Promise<Record<string, unknown>> {
  const api = client.telegram.api
  const op = normalizeOp(fields.operation)
  const chat_id = fields.chatId
  const parse_mode = fields.parseMode || undefined
  const disable_notification = fields.disableNotification

  switch (op) {
    case "SEND_MESSAGE":
    case "SEND_TEXT":
    case "messages.sendMessage": {
      requireChat(fields, "SEND_MESSAGE")
      if (!fields.text.trim()) {
        throw new NonRetriableError("Telegram SEND_MESSAGE: text is required.")
      }
      const data = await api.messages.sendMessage({
        chat_id,
        text: fields.text,
        parse_mode,
        disable_notification,
      })
      return wrap("SEND_MESSAGE", data)
    }
    case "EDIT_MESSAGE":
    case "messages.editMessageText": {
      requireChat(fields, "EDIT_MESSAGE")
      if (!fields.messageId.trim() || !fields.text.trim()) {
        throw new NonRetriableError(
          "Telegram EDIT_MESSAGE: messageId and text are required.",
        )
      }
      const data = await api.messages.editMessageText({
        chat_id,
        message_id: Number(fields.messageId),
        text: fields.text,
        parse_mode,
      })
      return wrap("EDIT_MESSAGE", data)
    }
    case "DELETE_MESSAGE":
    case "messages.deleteMessage": {
      requireChat(fields, "DELETE_MESSAGE")
      if (!fields.messageId.trim()) {
        throw new NonRetriableError(
          "Telegram DELETE_MESSAGE: messageId is required.",
        )
      }
      const data = await api.messages.deleteMessage({
        chat_id,
        message_id: Number(fields.messageId),
      })
      return wrap("DELETE_MESSAGE", data)
    }
    case "PIN_MESSAGE":
    case "messages.pinChatMessage": {
      requireChat(fields, "PIN_MESSAGE")
      if (!fields.messageId.trim()) {
        throw new NonRetriableError(
          "Telegram PIN_MESSAGE: messageId is required.",
        )
      }
      const data = await api.messages.pinChatMessage({
        chat_id,
        message_id: Number(fields.messageId),
        disable_notification,
      })
      return wrap("PIN_MESSAGE", data)
    }
    case "UNPIN_MESSAGE":
    case "messages.unpinChatMessage": {
      requireChat(fields, "UNPIN_MESSAGE")
      const data = await api.messages.unpinChatMessage({
        chat_id,
        message_id: fields.messageId.trim()
          ? Number(fields.messageId)
          : undefined,
      })
      return wrap("UNPIN_MESSAGE", data)
    }
    case "SEND_PHOTO":
    case "messages.sendPhoto": {
      requireChat(fields, "SEND_PHOTO")
      if (!fields.photo.trim()) {
        throw new NonRetriableError(
          "Telegram SEND_PHOTO: photo (file_id or URL) is required.",
        )
      }
      const data = await api.messages.sendPhoto({
        chat_id,
        photo: fields.photo,
        caption: fields.caption || undefined,
        parse_mode,
        disable_notification,
      })
      return wrap("SEND_PHOTO", data)
    }
    case "SEND_VIDEO":
    case "messages.sendVideo": {
      requireChat(fields, "SEND_VIDEO")
      if (!fields.video.trim()) {
        throw new NonRetriableError("Telegram SEND_VIDEO: video is required.")
      }
      const data = await api.messages.sendVideo({
        chat_id,
        video: fields.video,
        caption: fields.caption || undefined,
        parse_mode,
        disable_notification,
      })
      return wrap("SEND_VIDEO", data)
    }
    case "SEND_AUDIO":
    case "messages.sendAudio": {
      requireChat(fields, "SEND_AUDIO")
      if (!fields.audio.trim()) {
        throw new NonRetriableError("Telegram SEND_AUDIO: audio is required.")
      }
      const data = await api.messages.sendAudio({
        chat_id,
        audio: fields.audio,
        caption: fields.caption || undefined,
        parse_mode,
        disable_notification,
      })
      return wrap("SEND_AUDIO", data)
    }
    case "SEND_DOCUMENT":
    case "messages.sendDocument": {
      requireChat(fields, "SEND_DOCUMENT")
      if (!fields.document.trim()) {
        throw new NonRetriableError(
          "Telegram SEND_DOCUMENT: document is required.",
        )
      }
      const data = await api.messages.sendDocument({
        chat_id,
        document: fields.document,
        caption: fields.caption || undefined,
        parse_mode,
        disable_notification,
      })
      return wrap("SEND_DOCUMENT", data)
    }
    case "SEND_STICKER":
    case "messages.sendSticker": {
      requireChat(fields, "SEND_STICKER")
      if (!fields.sticker.trim()) {
        throw new NonRetriableError(
          "Telegram SEND_STICKER: sticker is required.",
        )
      }
      const data = await api.messages.sendSticker({
        chat_id,
        sticker: fields.sticker,
        disable_notification,
      })
      return wrap("SEND_STICKER", data)
    }
    case "SEND_ANIMATION":
    case "messages.sendAnimation": {
      requireChat(fields, "SEND_ANIMATION")
      if (!fields.animation.trim()) {
        throw new NonRetriableError(
          "Telegram SEND_ANIMATION: animation is required.",
        )
      }
      const data = await api.messages.sendAnimation({
        chat_id,
        animation: fields.animation,
        caption: fields.caption || undefined,
        parse_mode,
        disable_notification,
      })
      return wrap("SEND_ANIMATION", data)
    }
    case "SEND_LOCATION":
    case "messages.sendLocation": {
      requireChat(fields, "SEND_LOCATION")
      const lat = Number(fields.latitude)
      const lon = Number(fields.longitude)
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        throw new NonRetriableError(
          "Telegram SEND_LOCATION: latitude and longitude are required numbers.",
        )
      }
      const data = await api.messages.sendLocation({
        chat_id,
        latitude: lat,
        longitude: lon,
        disable_notification,
      })
      return wrap("SEND_LOCATION", data)
    }
    case "SEND_MEDIA_GROUP":
    case "messages.sendMediaGroup": {
      requireChat(fields, "SEND_MEDIA_GROUP")
      if (!fields.mediaGroupJson.trim()) {
        throw new NonRetriableError(
          "Telegram SEND_MEDIA_GROUP: mediaGroupJson array is required.",
        )
      }
      let media: unknown
      try {
        media = JSON.parse(fields.mediaGroupJson)
      } catch {
        throw new NonRetriableError(
          "Telegram SEND_MEDIA_GROUP: mediaGroupJson must be valid JSON.",
        )
      }
      if (!Array.isArray(media) || media.length === 0) {
        throw new NonRetriableError(
          "Telegram SEND_MEDIA_GROUP: mediaGroupJson must be a non-empty array.",
        )
      }
      const data = await api.messages.sendMediaGroup({
        chat_id,
        media,
        disable_notification,
      })
      return wrap("SEND_MEDIA_GROUP", data)
    }
    case "SEND_CHAT_ACTION":
    case "messages.sendChatAction": {
      requireChat(fields, "SEND_CHAT_ACTION")
      const data = await api.messages.sendChatAction({
        chat_id,
        action: fields.chatAction || "typing",
      })
      return wrap("SEND_CHAT_ACTION", data)
    }

    case "GET_CHAT":
    case "chat.getChat": {
      requireChat(fields, "GET_CHAT")
      const data = await api.chat.getChat({ chat_id })
      return wrap("GET_CHAT", data)
    }
    case "GET_CHAT_ADMINS":
    case "chat.getChatAdministrators": {
      requireChat(fields, "GET_CHAT_ADMINS")
      const data = await api.chat.getChatAdministrators({ chat_id })
      return wrap("GET_CHAT_ADMINS", data)
    }
    case "GET_CHAT_MEMBER":
    case "chat.getChatMember": {
      requireChat(fields, "GET_CHAT_MEMBER")
      if (!fields.userId.trim()) {
        throw new NonRetriableError(
          "Telegram GET_CHAT_MEMBER: userId is required.",
        )
      }
      const data = await api.chat.getChatMember({
        chat_id,
        user_id: Number(fields.userId),
      })
      return wrap("GET_CHAT_MEMBER", data)
    }

    case "ANSWER_CALLBACK":
    case "callback.answerCallbackQuery": {
      if (!fields.callbackQueryId.trim()) {
        throw new NonRetriableError(
          "Telegram ANSWER_CALLBACK: callbackQueryId is required.",
        )
      }
      const data = await api.callback.answerCallbackQuery({
        callback_query_id: fields.callbackQueryId,
        text: fields.text || undefined,
      })
      return wrap("ANSWER_CALLBACK", data)
    }
    case "ANSWER_INLINE":
    case "callback.answerInlineQuery": {
      if (!fields.inlineQueryId.trim()) {
        throw new NonRetriableError(
          "Telegram ANSWER_INLINE: inlineQueryId is required.",
        )
      }
      const data = await api.callback.answerInlineQuery({
        inline_query_id: fields.inlineQueryId,
        results: [],
      })
      return wrap("ANSWER_INLINE", data)
    }

    case "GET_FILE":
    case "file.getFile": {
      if (!fields.fileId.trim()) {
        throw new NonRetriableError("Telegram GET_FILE: fileId is required.")
      }
      const data = await api.file.getFile({ file_id: fields.fileId })
      return wrap("GET_FILE", data)
    }
    case "GET_ME":
    case "me.getMe": {
      const data = await api.me.getMe({})
      return wrap("GET_ME", data)
    }
    case "GET_UPDATES":
    case "updates.getUpdates": {
      const data = await api.updates.getUpdates({})
      return wrap("GET_UPDATES", data)
    }
    case "SET_WEBHOOK":
    case "webhook.setWebhook": {
      if (!fields.webhookUrl.trim()) {
        throw new NonRetriableError(
          "Telegram SET_WEBHOOK: webhookUrl is required.",
        )
      }
      const data = await api.webhook.setWebhook({ url: fields.webhookUrl })
      return wrap("SET_WEBHOOK", data)
    }
    case "DELETE_WEBHOOK":
    case "webhook.deleteWebhook": {
      const data = await api.webhook.deleteWebhook({})
      return wrap("DELETE_WEBHOOK", data)
    }

    default:
      throw new NonRetriableError(
        `Unknown Telegram operation: ${fields.operation} (normalized: ${op})`,
      )
  }
}
