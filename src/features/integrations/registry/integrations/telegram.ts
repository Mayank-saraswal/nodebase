/**
 * Telegram registry — full @corsair-dev/telegram surface.
 */

import type { IntegrationDefinition } from "../types"

export const telegramIntegrationDefinition: IntegrationDefinition = {
  typeKey: "telegram",
  kind: "integration",
  corsairPluginId: "telegram",
  label: "Telegram",
  operations: [
    // messages
    { key: "messages.sendMessage", aliases: ["SEND_MESSAGE", "SEND_TEXT"], label: "Send Message", group: "Messages", risk: "write" },
    { key: "messages.editMessageText", aliases: ["EDIT_MESSAGE"], label: "Edit Message", group: "Messages", risk: "write" },
    { key: "messages.deleteMessage", aliases: ["DELETE_MESSAGE"], label: "Delete Message", group: "Messages", risk: "destructive" },
    { key: "messages.pinChatMessage", aliases: ["PIN_MESSAGE"], label: "Pin Message", group: "Messages", risk: "write" },
    { key: "messages.unpinChatMessage", aliases: ["UNPIN_MESSAGE"], label: "Unpin Message", group: "Messages", risk: "write" },
    { key: "messages.sendPhoto", aliases: ["SEND_PHOTO"], label: "Send Photo", group: "Media", risk: "write" },
    { key: "messages.sendVideo", aliases: ["SEND_VIDEO"], label: "Send Video", group: "Media", risk: "write" },
    { key: "messages.sendAudio", aliases: ["SEND_AUDIO"], label: "Send Audio", group: "Media", risk: "write" },
    { key: "messages.sendDocument", aliases: ["SEND_DOCUMENT"], label: "Send Document", group: "Media", risk: "write" },
    { key: "messages.sendSticker", aliases: ["SEND_STICKER"], label: "Send Sticker", group: "Media", risk: "write" },
    { key: "messages.sendAnimation", aliases: ["SEND_ANIMATION"], label: "Send Animation", group: "Media", risk: "write" },
    { key: "messages.sendLocation", aliases: ["SEND_LOCATION"], label: "Send Location", group: "Media", risk: "write" },
    { key: "messages.sendMediaGroup", aliases: ["SEND_MEDIA_GROUP"], label: "Send Media Group", group: "Media", risk: "write" },
    { key: "messages.sendChatAction", aliases: ["SEND_CHAT_ACTION"], label: "Send Chat Action", group: "Messages", risk: "write" },
    // chat
    { key: "chat.getChat", aliases: ["GET_CHAT"], label: "Get Chat", group: "Chat", risk: "read" },
    { key: "chat.getChatAdministrators", aliases: ["GET_CHAT_ADMINS"], label: "Get Chat Admins", group: "Chat", risk: "read" },
    { key: "chat.getChatMember", aliases: ["GET_CHAT_MEMBER"], label: "Get Chat Member", group: "Chat", risk: "read" },
    // callback
    { key: "callback.answerCallbackQuery", aliases: ["ANSWER_CALLBACK"], label: "Answer Callback Query", group: "Callback", risk: "write" },
    { key: "callback.answerInlineQuery", aliases: ["ANSWER_INLINE"], label: "Answer Inline Query", group: "Callback", risk: "write" },
    // file / me / updates / webhook
    { key: "file.getFile", aliases: ["GET_FILE"], label: "Get File", group: "File", risk: "read" },
    { key: "me.getMe", aliases: ["GET_ME"], label: "Get Me", group: "Bot", risk: "read" },
    { key: "updates.getUpdates", aliases: ["GET_UPDATES"], label: "Get Updates", group: "Bot", risk: "read" },
    { key: "webhook.setWebhook", aliases: ["SET_WEBHOOK"], label: "Set Webhook", group: "Bot", risk: "write" },
    { key: "webhook.deleteWebhook", aliases: ["DELETE_WEBHOOK"], label: "Delete Webhook", group: "Bot", risk: "destructive" },
  ],
}
