# Telegram operation matrix (Nodebase → Corsair)

Source: `@corsair-dev/telegram` (`telegram.api.*`). Auth: `bot_token` (no OAuth permissions mode on plugin options).

| Group | Corsair endpoints | Product aliases |
|-------|-------------------|-----------------|
| Messages | sendMessage, editMessageText, deleteMessage, pinChatMessage, unpinChatMessage, sendChatAction | SEND_MESSAGE, EDIT_MESSAGE, DELETE_MESSAGE, PIN_MESSAGE, UNPIN_MESSAGE, SEND_CHAT_ACTION |
| Media | sendPhoto, sendVideo, sendAudio, sendDocument, sendSticker, sendAnimation, sendLocation, sendMediaGroup | SEND_PHOTO, SEND_VIDEO, … |
| Chat | getChat, getChatAdministrators, getChatMember | GET_CHAT, GET_CHAT_ADMINS, GET_CHAT_MEMBER |
| Callback | answerCallbackQuery, answerInlineQuery | ANSWER_CALLBACK, ANSWER_INLINE |
| File / Bot | getFile, getMe, getUpdates | GET_FILE, GET_ME, GET_UPDATES |
| Webhook | setWebhook, deleteWebhook | SET_WEBHOOK, DELETE_WEBHOOK |

Completeness test asserts registry ⊇ all nested endpoints above.

Legacy dual-path: plain `sendMessage` with bot token on node config when Corsair is off.
