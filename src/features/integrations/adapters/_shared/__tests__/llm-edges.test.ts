import { describe, expect, it } from "vitest"
import {
  assertNoStream,
  assertSamplingParams,
  buildChatMessages,
  parseJsonObject,
  parseValidatedMessages,
} from "../llm-edges"

describe("llm-edges shared validators", () => {
  it("parseJsonObject rejects arrays and invalid JSON", () => {
    expect(() => parseJsonObject("[]", "paramsJson", "X")).toThrow(/object/)
    expect(() => parseJsonObject("not-json", "paramsJson", "X")).toThrow(
      /JSON/,
    )
    expect(parseJsonObject('{"a":1}', "paramsJson", "X")).toEqual({ a: 1 })
  })

  it("strict-chat rejects tool role and non-string content", () => {
    expect(() => parseValidatedMessages("[]", "X", "strict-chat")).toThrow(
      /at least one message/,
    )
    expect(() =>
      parseValidatedMessages(
        JSON.stringify([{ role: "tool", content: "x" }]),
        "X",
        "strict-chat",
      ),
    ).toThrow(/role/)
    expect(() =>
      parseValidatedMessages(
        JSON.stringify([{ role: "user", content: 1 }]),
        "X",
        "strict-chat",
      ),
    ).toThrow(/content must be a string/)
  })

  it("openai-chat allows tool calling full message shapes", () => {
    const msgs = parseValidatedMessages(
      JSON.stringify([
        { role: "user", content: "hi" },
        {
          role: "assistant",
          content: null,
          tool_calls: [
            {
              id: "c1",
              type: "function",
              function: { name: "fn", arguments: "{}" },
            },
          ],
        },
        { role: "tool", tool_call_id: "c1", content: "ok" },
      ]),
      "OpenAI",
      "openai-chat",
    )
    expect(msgs).toHaveLength(3)
    expect(msgs?.[1].tool_calls).toBeDefined()
    expect(msgs?.[2].role).toBe("tool")
  })

  it("openai-chat allows multimodal content arrays", () => {
    const msgs = parseValidatedMessages(
      JSON.stringify([
        {
          role: "user",
          content: [
            { type: "text", text: "see" },
            { type: "image_url", image_url: { url: "https://x" } },
          ],
        },
      ]),
      "OpenAI",
      "openai-chat",
    )
    expect(Array.isArray(msgs?.[0].content)).toBe(true)
  })

  it("buildChatMessages requires prompt fields", () => {
    expect(() =>
      buildChatMessages({
        brand: "X",
        messagesJson: "",
        userPrompt: "",
        prompt: "",
      }),
    ).toThrow(/userPrompt, prompt, or messagesJson/)
  })

  it("assertSamplingParams ranges", () => {
    expect(() => assertSamplingParams("X", { temperature: 3 })).toThrow(
      /temperature/,
    )
    expect(() => assertSamplingParams("X", { topP: 0 })).toThrow(/top_p/)
    expect(() => assertSamplingParams("X", { maxTokens: 0 })).toThrow(
      /max_tokens/,
    )
  })

  it("assertNoStream", () => {
    expect(() => assertNoStream("X", true, {})).toThrow(/stream/)
    expect(() => assertNoStream("X", false, { stream: true })).toThrow(
      /stream/,
    )
  })
})
