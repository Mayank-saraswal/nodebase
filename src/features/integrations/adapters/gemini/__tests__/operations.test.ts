import { describe, expect, it, vi, beforeEach } from "vitest"
import {
  isGeminiCorsairOp,
  runGeminiOperation,
  type GeminiApiClient,
  type ResolvedGeminiFields,
} from "../operations"
import { GEMINI_CORSAIR_ENDPOINTS } from "@/features/integrations/registry/integrations/gemini"

function fields(
  overrides: Partial<ResolvedGeminiFields> = {},
): ResolvedGeminiFields {
  return {
    operation: "CHAT",
    model: "gemini-2.0-flash",
    prompt: "",
    userPrompt: "hello",
    systemPrompt: "",
    contentsJson: "",
    paramsJson: "",
    temperature: "",
    maxOutputTokens: "",
    operationName: "",
    pollIntervalMs: "",
    timeoutMs: "",
    pageSize: "",
    pageToken: "",
    taskType: "",
    title: "",
    ...overrides,
  }
}

function mockClient(): GeminiApiClient {
  return {
    gemini: {
      api: {
        content: {
          generateContent: vi.fn().mockResolvedValue({
            text: "hi",
            candidates: [
              { content: { parts: [{ text: "hi" }] } },
            ],
          }),
          countTokens: vi.fn().mockResolvedValue({ totalTokens: 3 }),
          embedContent: vi
            .fn()
            .mockResolvedValue({ embedding: { values: [0.1, 0.2] } }),
        },
        images: {
          generateImage: vi.fn().mockResolvedValue({ images: [] }),
        },
        videos: {
          generateVideos: vi
            .fn()
            .mockResolvedValue({ operationName: "ops/1", done: false }),
          getVideosOperation: vi
            .fn()
            .mockResolvedValue({ name: "ops/1", done: true }),
          waitForVideo: vi
            .fn()
            .mockResolvedValue({ operationName: "ops/1", done: true }),
        },
        models: {
          listModels: vi.fn().mockResolvedValue({ models: [] }),
        },
      },
    },
  }
}

describe("runGeminiOperation (full Corsair surface + edges)", () => {
  let client: GeminiApiClient

  beforeEach(() => {
    client = mockClient()
  })

  it("CHAT / generateContent", async () => {
    const out = await runGeminiOperation(client, fields())
    expect(client.gemini.api.content.generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemini-2.0-flash",
        contents: [
          expect.objectContaining({
            role: "user",
            parts: [{ text: "hello" }],
          }),
        ],
      }),
    )
    expect(out.operation).toBe("CHAT")
    expect(out.text).toBe("hi")
  })

  it("CHAT requires prompt", async () => {
    await expect(
      runGeminiOperation(client, fields({ userPrompt: "", prompt: "" })),
    ).rejects.toThrow(/contentsJson or userPrompt/)
  })

  it("CHAT accepts contentsJson", async () => {
    await runGeminiOperation(
      client,
      fields({
        userPrompt: "",
        contentsJson: JSON.stringify([
          { role: "user", parts: [{ text: "from json" }] },
        ]),
      }),
    )
    expect(client.gemini.api.content.generateContent).toHaveBeenCalled()
  })

  it("invalid contentsJson", async () => {
    await expect(
      runGeminiOperation(
        client,
        fields({ contentsJson: '{"not":"array"}' }),
      ),
    ).rejects.toThrow(/array/)
  })

  it("COUNT_TOKENS + EMBED edges", async () => {
    await runGeminiOperation(
      client,
      fields({ operation: "COUNT_TOKENS", userPrompt: "hi" }),
    )
    await expect(
      runGeminiOperation(
        client,
        fields({ operation: "EMBED", userPrompt: "", prompt: "" }),
      ),
    ).rejects.toThrow(/prompt/)
    await runGeminiOperation(
      client,
      fields({ operation: "EMBED", prompt: "embed me" }),
    )
    expect(client.gemini.api.content.countTokens).toHaveBeenCalled()
    expect(client.gemini.api.content.embedContent).toHaveBeenCalled()
  })

  it("IMAGE requires prompt", async () => {
    await expect(
      runGeminiOperation(
        client,
        fields({ operation: "IMAGE", userPrompt: "", prompt: "" }),
      ),
    ).rejects.toThrow(/prompt/)
  })

  it("IMAGE + video lifecycle + list models", async () => {
    await runGeminiOperation(
      client,
      fields({ operation: "IMAGE", prompt: "a cat" }),
    )
    await expect(
      runGeminiOperation(
        client,
        fields({ operation: "GENERATE_VIDEO", userPrompt: "", prompt: "" }),
      ),
    ).rejects.toThrow(/prompt/)
    await runGeminiOperation(
      client,
      fields({ operation: "GENERATE_VIDEO", prompt: "ocean" }),
    )
    await expect(
      runGeminiOperation(
        client,
        fields({ operation: "GET_VIDEO_OPERATION" }),
      ),
    ).rejects.toThrow(/operationName/)
    await runGeminiOperation(
      client,
      fields({
        operation: "GET_VIDEO_OPERATION",
        operationName: "ops/1",
      }),
    )
    await expect(
      runGeminiOperation(client, fields({ operation: "WAIT_VIDEO" })),
    ).rejects.toThrow(/operationName/)
    await runGeminiOperation(
      client,
      fields({
        operation: "WAIT_VIDEO",
        operationName: "ops/1",
        pollIntervalMs: "1000",
        timeoutMs: "10000",
      }),
    )
    await runGeminiOperation(client, fields({ operation: "LIST_MODELS" }))
    expect(client.gemini.api.images.generateImage).toHaveBeenCalled()
    expect(client.gemini.api.videos.generateVideos).toHaveBeenCalled()
    expect(client.gemini.api.videos.getVideosOperation).toHaveBeenCalled()
    expect(client.gemini.api.videos.waitForVideo).toHaveBeenCalled()
    expect(client.gemini.api.models.listModels).toHaveBeenCalled()
  })

  it("covers all Corsair path keys", async () => {
    for (const key of GEMINI_CORSAIR_ENDPOINTS) {
      await runGeminiOperation(
        client,
        fields({
          operation: key,
          userPrompt: "x",
          prompt: "x",
          operationName: "ops/1",
        }),
      )
    }
    expect(GEMINI_CORSAIR_ENDPOINTS.length).toBe(8)
  })

  it("invalid paramsJson", async () => {
    await expect(
      runGeminiOperation(
        client,
        fields({ operation: "LIST_MODELS", paramsJson: "[]" }),
      ),
    ).rejects.toThrow(/object/)
  })

  it("isGeminiCorsairOp", () => {
    expect(isGeminiCorsairOp("CHAT")).toBe(true)
    expect(isGeminiCorsairOp("content.generateContent")).toBe(true)
    expect(isGeminiCorsairOp("LIST_MODELS")).toBe(true)
    expect(isGeminiCorsairOp("NOPE")).toBe(false)
  })
})
