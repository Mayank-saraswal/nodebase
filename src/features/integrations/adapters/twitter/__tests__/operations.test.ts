import { describe, expect, it, vi, beforeEach } from "vitest"
import {
  isTwitterCorsairOp,
  runTwitterOperation,
  type ResolvedTwitterFields,
  type TwitterApiClient,
} from "../operations"

function fields(
  overrides: Partial<ResolvedTwitterFields> = {},
): ResolvedTwitterFields {
  return {
    operation: "POST_TWEET",
    text: "hello world",
    quoteTweetId: "",
    inReplyToTweetId: "",
    mediaIds: "",
    replySettings: "",
    excludeReplyUserIds: "",
    ...overrides,
  }
}

function mockClient(): TwitterApiClient {
  return {
    twitter: {
      api: {
        tweets: {
          create: vi.fn().mockResolvedValue({
            data: { id: "1", text: "hello world" },
          }),
          createReply: vi.fn().mockResolvedValue({
            data: { id: "2", text: "reply" },
          }),
        },
      },
    },
  }
}

describe("runTwitterOperation (full Corsair surface)", () => {
  let client: TwitterApiClient

  beforeEach(() => {
    client = mockClient()
  })

  it("POST_TWEET", async () => {
    const out = await runTwitterOperation(client, fields())
    expect(client.twitter.api.tweets.create).toHaveBeenCalledWith(
      expect.objectContaining({ text: "hello world" }),
    )
    expect(out.operation).toBe("POST_TWEET")
  })

  it("requires text", async () => {
    await expect(
      runTwitterOperation(client, fields({ text: "" })),
    ).rejects.toThrow(/text/)
  })

  it("REPLY_TWEET requires inReplyToTweetId", async () => {
    await expect(
      runTwitterOperation(
        client,
        fields({ operation: "REPLY_TWEET", inReplyToTweetId: "" }),
      ),
    ).rejects.toThrow(/inReplyToTweetId/)
  })

  it("REPLY_TWEET", async () => {
    await runTwitterOperation(
      client,
      fields({
        operation: "REPLY_TWEET",
        text: "reply body",
        inReplyToTweetId: "99",
      }),
    )
    expect(client.twitter.api.tweets.createReply).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "reply body",
        inReplyToTweetId: "99",
      }),
    )
  })

  it("POST_TWEET with quote and media", async () => {
    await runTwitterOperation(
      client,
      fields({
        quoteTweetId: "q1",
        mediaIds: "m1, m2",
        replySettings: "following",
      }),
    )
    expect(client.twitter.api.tweets.create).toHaveBeenCalledWith(
      expect.objectContaining({
        quoteTweetId: "q1",
        mediaIds: ["m1", "m2"],
        replySettings: "following",
      }),
    )
  })

  it("truncates to 280", async () => {
    const long = "x".repeat(300)
    await runTwitterOperation(client, fields({ text: long }))
    expect(client.twitter.api.tweets.create).toHaveBeenCalledWith(
      expect.objectContaining({ text: "x".repeat(280) }),
    )
  })

  it("accepts Corsair path keys", async () => {
    const out = await runTwitterOperation(
      client,
      fields({ operation: "tweets.create" }),
    )
    expect(out.operation).toBe("POST_TWEET")
  })

  it("isTwitterCorsairOp", () => {
    expect(isTwitterCorsairOp("POST_TWEET")).toBe(true)
    expect(isTwitterCorsairOp("REPLY_TWEET")).toBe(true)
    expect(isTwitterCorsairOp("NOPE")).toBe(false)
  })
})
