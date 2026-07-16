import { describe, expect, it, vi, beforeEach } from "vitest"
import {
  isDeepseekCorsairOp,
  runDeepseekOperation,
  type DeepseekApiClient,
  type ResolvedDeepseekFields,
} from "../operations"
import { DEEPSEEK_CORSAIR_ENDPOINTS } from "@/features/integrations/registry/integrations/deepseek"

function fields(
  overrides: Partial<ResolvedDeepseekFields> = {},
): ResolvedDeepseekFields {
  return {
    operation: "CHAT",
    model: "deepseek-chat",
    prompt: "",
    userPrompt: "hello",
    systemPrompt: "",
    messagesJson: "",
    paramsJson: "",
    temperature: "",
    maxTokens: "",
    ...overrides,
  }
}

function mockClient(): DeepseekApiClient {
  return {
    deepseek: {
      api: {
        chat: {
          createCompletion: vi.fn().mockResolvedValue({
            choices: [{ message: { content: "hi there" } }],
          }),
        },
        anthropic: {
          createMessage: vi.fn().mockResolvedValue({
            content: [{ type: "text", text: "anthropic hi" }],
          }),
        },
        user: {
          getBalance: vi.fn().mockResolvedValue({ balance_infos: [] }),
        },
        models: {
          list: vi.fn().mockResolvedValue({ data: [] }),
        },
      },
    },
  }
}

describe("runDeepseekOperation (full Corsair surface + edges)", () => {
  let client: DeepseekApiClient

  beforeEach(() => {
    client = mockClient()
  })

  it("CHAT", async () => {
    const out = await runDeepseekOperation(client, fields())
    expect(client.deepseek.api.chat.createCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "deepseek-chat",
        messages: expect.arrayContaining([
          expect.objectContaining({ role: "user", content: "hello" }),
        ]),
      }),
    )
    expect(out.operation).toBe("CHAT")
    expect(out.text).toBe("hi there")
  })

  it("CHAT requires prompt", async () => {
    await expect(
      runDeepseekOperation(client, fields({ userPrompt: "", prompt: "" })),
    ).rejects.toThrow(/userPrompt|prompt|messagesJson/)
  })

  it("CHAT with system + reasoner model", async () => {
    await runDeepseekOperation(
      client,
      fields({
        model: "deepseek-reasoner",
        systemPrompt: "be brief",
        temperature: "0.2",
        maxTokens: "100",
      }),
    )
    expect(client.deepseek.api.chat.createCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "deepseek-reasoner",
        temperature: 0.2,
        maxTokens: 100,
        messages: [
          { role: "system", content: "be brief" },
          { role: "user", content: "hello" },
        ],
      }),
    )
  })

  it("CHAT accepts messagesJson", async () => {
    await runDeepseekOperation(
      client,
      fields({
        userPrompt: "",
        messagesJson: JSON.stringify([
          { role: "user", content: "from json" },
        ]),
      }),
    )
    expect(client.deepseek.api.chat.createCompletion).toHaveBeenCalled()
  })

  it("invalid messagesJson", async () => {
    await expect(
      runDeepseekOperation(
        client,
        fields({ messagesJson: '{"not":"array"}' }),
      ),
    ).rejects.toThrow(/array/)
  })

  it("ANTHROPIC_MESSAGE requires prompt and maxTokens default", async () => {
    await expect(
      runDeepseekOperation(
        client,
        fields({
          operation: "ANTHROPIC_MESSAGE",
          userPrompt: "",
          prompt: "",
        }),
      ),
    ).rejects.toThrow(/userPrompt|prompt|messagesJson/)
    const out = await runDeepseekOperation(
      client,
      fields({
        operation: "ANTHROPIC_MESSAGE",
        userPrompt: "hi",
        systemPrompt: "sys",
        maxTokens: "512",
      }),
    )
    expect(client.deepseek.api.anthropic.createMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "deepseek-chat",
        maxTokens: 512,
        system: "sys",
        messages: [{ role: "user", content: "hi" }],
      }),
    )
    expect(out.text).toBe("anthropic hi")
  })

  it("GET_BALANCE + LIST_MODELS", async () => {
    await runDeepseekOperation(client, fields({ operation: "GET_BALANCE" }))
    await runDeepseekOperation(client, fields({ operation: "LIST_MODELS" }))
    expect(client.deepseek.api.user.getBalance).toHaveBeenCalled()
    expect(client.deepseek.api.models.list).toHaveBeenCalled()
  })

  it("covers all Corsair path keys", async () => {
    for (const key of DEEPSEEK_CORSAIR_ENDPOINTS) {
      await runDeepseekOperation(
        client,
        fields({
          operation: key,
          userPrompt: "x",
          prompt: "x",
          maxTokens: "256",
        }),
      )
    }
    expect(DEEPSEEK_CORSAIR_ENDPOINTS.length).toBe(4)
  })

  it("invalid paramsJson", async () => {
    await expect(
      runDeepseekOperation(
        client,
        fields({ operation: "LIST_MODELS", paramsJson: "[]" }),
      ),
    ).rejects.toThrow(/object/)
  })

  it("isDeepseekCorsairOp", () => {
    expect(isDeepseekCorsairOp("CHAT")).toBe(true)
    expect(isDeepseekCorsairOp("chat.createCompletion")).toBe(true)
    expect(isDeepseekCorsairOp("ANTHROPIC_MESSAGE")).toBe(true)
    expect(isDeepseekCorsairOp("NOPE")).toBe(false)
  })
})
