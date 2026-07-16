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

  it("parseValidatedMessages enforces empty / role / content", () => {
    expect(() => parseValidatedMessages("[]", "X")).toThrow(
      /at least one message/,
    )
    expect(() =>
      parseValidatedMessages(
        JSON.stringify([{ role: "tool", content: "x" }]),
        "X",
      ),
    ).toThrow(/role/)
    expect(() =>
      parseValidatedMessages(
        JSON.stringify([{ role: "user", content: 1 }]),
        "X",
      ),
    ).toThrow(/content must be a string/)
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
