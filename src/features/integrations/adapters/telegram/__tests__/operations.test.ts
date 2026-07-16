import { describe, expect, it, vi, beforeEach } from "vitest"
import {
  isTelegramCorsairOp,
  runTelegramOperation,
  type ResolvedTelegramFields,
  type TelegramApiClient,
} from "../operations"

function fields(
  overrides: Partial<ResolvedTelegramFields> = {},
): ResolvedTelegramFields {
  return {
    operation: "SEND_MESSAGE",
    chatId: "123",
    text: "hello",
    messageId: "",
    parseMode: "",
    photo: "",
    video: "",
    audio: "",
    document: "",
    sticker: "",
    animation: "",
    caption: "",
    latitude: "",
    longitude: "",
    mediaGroupJson: "",
    chatAction: "",
    userId: "",
    callbackQueryId: "",
    inlineQueryId: "",
    fileId: "",
    webhookUrl: "",
    disableNotification: false,
    ...overrides,
  }
}

function mockClient(): TelegramApiClient {
  const ok = () => vi.fn().mockResolvedValue({ ok: true, result: {} })
  return {
    telegram: {
      api: {
        messages: {
          sendMessage: ok(),
          editMessageText: ok(),
          deleteMessage: ok(),
          pinChatMessage: ok(),
          unpinChatMessage: ok(),
          sendPhoto: ok(),
          sendVideo: ok(),
          sendAudio: ok(),
          sendDocument: ok(),
          sendSticker: ok(),
          sendAnimation: ok(),
          sendLocation: ok(),
          sendMediaGroup: ok(),
          sendChatAction: ok(),
        },
        chat: {
          getChat: ok(),
          getChatAdministrators: ok(),
          getChatMember: ok(),
        },
        callback: {
          answerCallbackQuery: ok(),
          answerInlineQuery: ok(),
        },
        file: { getFile: ok() },
        me: { getMe: ok() },
        updates: { getUpdates: ok() },
        webhook: { setWebhook: ok(), deleteWebhook: ok() },
      },
    },
  }
}

describe("runTelegramOperation (full Corsair surface)", () => {
  let client: TelegramApiClient

  beforeEach(() => {
    client = mockClient()
  })

  it("SEND_MESSAGE", async () => {
    const out = await runTelegramOperation(client, fields())
    expect(client.telegram.api.messages.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ chat_id: "123", text: "hello" }),
    )
    expect(out.operation).toBe("SEND_MESSAGE")
  })

  it("requires chatId and text", async () => {
    await expect(
      runTelegramOperation(client, fields({ chatId: "", text: "x" })),
    ).rejects.toThrow(/chatId/)
    await expect(
      runTelegramOperation(client, fields({ text: "" })),
    ).rejects.toThrow(/text/)
  })

  it("SEND_PHOTO requires photo", async () => {
    await expect(
      runTelegramOperation(
        client,
        fields({ operation: "SEND_PHOTO", photo: "" }),
      ),
    ).rejects.toThrow(/photo/)
  })

  it("SEND_LOCATION validates numbers", async () => {
    await expect(
      runTelegramOperation(
        client,
        fields({
          operation: "SEND_LOCATION",
          latitude: "x",
          longitude: "1",
        }),
      ),
    ).rejects.toThrow(/latitude/)
  })

  it("SEND_MEDIA_GROUP requires JSON array", async () => {
    await expect(
      runTelegramOperation(
        client,
        fields({ operation: "SEND_MEDIA_GROUP", mediaGroupJson: "{}" }),
      ),
    ).rejects.toThrow(/array/)
  })

  it("GET_ME", async () => {
    await runTelegramOperation(client, fields({ operation: "GET_ME" }))
    expect(client.telegram.api.me.getMe).toHaveBeenCalled()
  })

  it("covers media send ops", async () => {
    await runTelegramOperation(
      client,
      fields({ operation: "SEND_PHOTO", photo: "http://x/p.jpg" }),
    )
    await runTelegramOperation(
      client,
      fields({ operation: "SEND_DOCUMENT", document: "file_id" }),
    )
    await runTelegramOperation(
      client,
      fields({
        operation: "SEND_LOCATION",
        latitude: "1.2",
        longitude: "3.4",
      }),
    )
    expect(client.telegram.api.messages.sendPhoto).toHaveBeenCalled()
    expect(client.telegram.api.messages.sendDocument).toHaveBeenCalled()
    expect(client.telegram.api.messages.sendLocation).toHaveBeenCalled()
  })

  it("isTelegramCorsairOp", () => {
    expect(isTelegramCorsairOp("SEND_MESSAGE")).toBe(true)
    expect(isTelegramCorsairOp("NOPE")).toBe(false)
  })

  it("accepts Corsair path keys", async () => {
    const out = await runTelegramOperation(
      client,
      fields({ operation: "messages.sendMessage" }),
    )
    expect(out.operation).toBe("SEND_MESSAGE")
  })
})
