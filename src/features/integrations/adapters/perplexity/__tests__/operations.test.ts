import { describe, expect, it, vi, beforeEach } from "vitest"
import {
  isPerplexityCorsairOp,
  runPerplexityOperation,
  type PerplexityApiClient,
  type ResolvedPerplexityFields,
} from "../operations"
import { PERPLEXITY_CORSAIR_ENDPOINTS } from "@/features/integrations/registry/integrations/perplexity"

function fields(
  overrides: Partial<ResolvedPerplexityFields> = {},
): ResolvedPerplexityFields {
  return {
    operation: "CHAT",
    model: "sonar",
    prompt: "",
    userPrompt: "What is Corsair?",
    systemPrompt: "",
    messagesJson: "",
    paramsJson: "",
    temperature: "",
    maxTokens: "",
    topP: "",
    topK: "",
    returnCitations: false,
    returnImages: false,
    stream: false,
    presencePenalty: "",
    frequencyPenalty: "",
    ...overrides,
  }
}

function mockClient(): PerplexityApiClient {
  return {
    perplexityai: {
      api: {
        chat: {
          completions: vi.fn().mockResolvedValue({
            id: "cmpl_1",
            model: "sonar",
            choices: [
              {
                index: 0,
                message: { role: "assistant", content: "Corsair is…" },
              },
            ],
            citations: ["https://example.com"],
          }),
        },
      },
    },
  }
}

describe("runPerplexityOperation (full Corsair surface + edges + security)", () => {
  let client: PerplexityApiClient

  beforeEach(() => {
    client = mockClient()
  })

  it("CHAT success with userPrompt", async () => {
    const out = await runPerplexityOperation(client, fields())
    expect(client.perplexityai.api.chat.completions).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "sonar",
        messages: [{ role: "user", content: "What is Corsair?" }],
      }),
    )
    expect(out.operation).toBe("CHAT")
    expect(out.text).toBe("Corsair is…")
  })

  it("CHAT with system prompt + sampling params + citations", async () => {
    await runPerplexityOperation(
      client,
      fields({
        systemPrompt: "Be concise",
        temperature: "0.3",
        maxTokens: "256",
        topP: "0.9",
        topK: "40",
        returnCitations: true,
        returnImages: true,
        presencePenalty: "0.1",
        frequencyPenalty: "0.2",
      }),
    )
    expect(client.perplexityai.api.chat.completions).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "sonar",
        messages: [
          { role: "system", content: "Be concise" },
          { role: "user", content: "What is Corsair?" },
        ],
        temperature: 0.3,
        max_tokens: 256,
        top_p: 0.9,
        top_k: 40,
        return_citations: true,
        return_images: true,
        presence_penalty: 0.1,
        frequency_penalty: 0.2,
      }),
    )
  })

  it("requires userPrompt / prompt / messagesJson", async () => {
    await expect(
      runPerplexityOperation(
        client,
        fields({ userPrompt: "", prompt: "", messagesJson: "" }),
      ),
    ).rejects.toThrow(/userPrompt|prompt|messagesJson/)
  })

  it("accepts messagesJson", async () => {
    await runPerplexityOperation(
      client,
      fields({
        userPrompt: "",
        messagesJson: JSON.stringify([
          { role: "system", content: "sys" },
          { role: "user", content: "hi" },
        ]),
      }),
    )
    expect(client.perplexityai.api.chat.completions).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          { role: "system", content: "sys" },
          { role: "user", content: "hi" },
        ],
      }),
    )
  })

  it("rejects empty messagesJson array", async () => {
    await expect(
      runPerplexityOperation(
        client,
        fields({ userPrompt: "", messagesJson: "[]" }),
      ),
    ).rejects.toThrow(/at least one message/)
  })

  it("rejects invalid message role", async () => {
    await expect(
      runPerplexityOperation(
        client,
        fields({
          userPrompt: "",
          messagesJson: JSON.stringify([
            { role: "tool", content: "x" },
          ]),
        }),
      ),
    ).rejects.toThrow(/role/)
  })

  it("rejects non-string message content", async () => {
    await expect(
      runPerplexityOperation(
        client,
        fields({
          userPrompt: "",
          messagesJson: JSON.stringify([
            { role: "user", content: { nested: true } },
          ]),
        }),
      ),
    ).rejects.toThrow(/content must be a string/)
  })

  it("rejects invalid messagesJson shape", async () => {
    await expect(
      runPerplexityOperation(
        client,
        fields({ messagesJson: '{"not":"array"}' }),
      ),
    ).rejects.toThrow(/array/)
    await expect(
      runPerplexityOperation(client, fields({ messagesJson: "not-json" })),
    ).rejects.toThrow(/JSON/)
  })

  it("rejects invalid paramsJson", async () => {
    await expect(
      runPerplexityOperation(client, fields({ paramsJson: "[]" })),
    ).rejects.toThrow(/object/)
    await expect(
      runPerplexityOperation(client, fields({ paramsJson: "not-json" })),
    ).rejects.toThrow(/JSON/)
  })

  it("rejects stream=true (security/ops edge)", async () => {
    await expect(
      runPerplexityOperation(client, fields({ stream: true })),
    ).rejects.toThrow(/stream/)
    await expect(
      runPerplexityOperation(
        client,
        fields({ paramsJson: '{"stream":true}' }),
      ),
    ).rejects.toThrow(/stream/)
  })

  it("rejects out-of-range temperature / top_p / max_tokens", async () => {
    await expect(
      runPerplexityOperation(client, fields({ temperature: "3" })),
    ).rejects.toThrow(/temperature/)
    await expect(
      runPerplexityOperation(client, fields({ topP: "1.5" })),
    ).rejects.toThrow(/top_p/)
    await expect(
      runPerplexityOperation(client, fields({ maxTokens: "0" })),
    ).rejects.toThrow(/max_tokens/)
  })

  it("accepts Corsair path key chat.completions", async () => {
    const out = await runPerplexityOperation(
      client,
      fields({ operation: "chat.completions" }),
    )
    expect(out.operation).toBe("CHAT")
  })

  it("covers all package endpoints", async () => {
    for (const key of PERPLEXITY_CORSAIR_ENDPOINTS) {
      await runPerplexityOperation(
        client,
        fields({ operation: key, userPrompt: "x" }),
      )
    }
    expect(PERPLEXITY_CORSAIR_ENDPOINTS).toEqual(["chat.completions"])
  })

  it("isPerplexityCorsairOp", () => {
    expect(isPerplexityCorsairOp("CHAT")).toBe(true)
    expect(isPerplexityCorsairOp("chat.completions")).toBe(true)
    expect(isPerplexityCorsairOp("SEARCH_CHAT")).toBe(true)
    expect(isPerplexityCorsairOp("NOPE")).toBe(false)
  })

  it("throws if client surface missing (misconfiguration)", async () => {
    const bad = { perplexityai: { api: {} } } as unknown as PerplexityApiClient
    await expect(runPerplexityOperation(bad, fields())).rejects.toThrow(
      /missing/,
    )
  })
})
