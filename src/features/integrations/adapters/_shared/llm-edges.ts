/**
 * Shared LLM edge-case validation for Corsair chat-style adapters
 * (OpenAI, Gemini, DeepSeek, Perplexity).
 *
 * Goals:
 * - Full API potential (tool calling, multimodal content, extra fields)
 * - Hard edges for invalid JSON, empty payloads, bad sampling ranges, stream
 * - Per-provider message profiles via MessageValidationMode
 */

import { NonRetriableError } from "inngest"

export type ChatRole = "system" | "user" | "assistant" | "tool" | "function"

/** Minimal chat message; extra API fields preserved as Record */
export type ChatMessage = Record<string, unknown> & {
  role: string
}

export type MessageValidationMode =
  /** system | user | assistant; content must be string (Perplexity) */
  | "strict-chat"
  /**
   * OpenAI Chat Completions full surface:
   * roles system|user|assistant|tool|function
   * content: string | array | null
   * tool_calls, tool_call_id, name, etc. preserved
   */
  | "openai-chat"
  /**
   * DeepSeek chat: system|user|assistant|tool + string content + tool_calls
   */
  | "deepseek-chat"
  /** Anthropic-style user|assistant only (system separate) */
  | "anthropic-messages"

export function parseJsonObject(
  raw: string,
  field: string,
  brand: string,
): Record<string, unknown> {
  if (!raw.trim()) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      !Array.isArray(parsed)
    ) {
      return parsed as Record<string, unknown>
    }
    throw new NonRetriableError(`${brand} ${field} must be a JSON object.`)
  } catch (e) {
    if (e instanceof NonRetriableError) throw e
    throw new NonRetriableError(`${brand} ${field} is invalid JSON.`)
  }
}

export function parseJsonArray(
  raw: string,
  field: string,
  brand: string,
): unknown[] | undefined {
  if (!raw.trim()) return undefined
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      throw new NonRetriableError(`${brand} ${field} must be a JSON array.`)
    }
    return parsed
  } catch (e) {
    if (e instanceof NonRetriableError) throw e
    throw new NonRetriableError(`${brand} ${field} is invalid JSON.`)
  }
}

export function optNum(value: string): number | undefined {
  if (!value.trim()) return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

/**
 * Validate sampling / token limits used by chat-style APIs.
 * Only validates values that are present (undefined = skip).
 */
export function assertSamplingParams(
  brand: string,
  opts: {
    temperature?: number
    topP?: number
    maxTokens?: number
  },
): void {
  const { temperature, topP, maxTokens } = opts
  if (temperature !== undefined && (temperature < 0 || temperature > 2)) {
    throw new NonRetriableError(
      `${brand}: temperature must be between 0 and 2.`,
    )
  }
  if (topP !== undefined && (topP <= 0 || topP > 1)) {
    throw new NonRetriableError(`${brand}: top_p must be in (0, 1].`)
  }
  if (maxTokens !== undefined && maxTokens <= 0) {
    throw new NonRetriableError(
      `${brand}: max_tokens must be a positive number.`,
    )
  }
}

/**
 * Reject streaming in workflow executors (non-streaming path only).
 * Full ops remain available; streaming is unsafe/unsupported in step runners.
 */
export function assertNoStream(
  brand: string,
  streamFlag: boolean,
  params: Record<string, unknown>,
): void {
  if (streamFlag || params.stream === true) {
    throw new NonRetriableError(
      `${brand}: stream=true is not supported in workflow execution. Use non-streaming completions.`,
    )
  }
}

const ROLE_SETS: Record<MessageValidationMode, readonly string[]> = {
  "strict-chat": ["system", "user", "assistant"],
  "openai-chat": ["system", "user", "assistant", "tool", "function"],
  "deepseek-chat": ["system", "user", "assistant", "tool"],
  "anthropic-messages": ["user", "assistant"],
}

function isValidContent(
  content: unknown,
  mode: MessageValidationMode,
): boolean {
  if (mode === "strict-chat") {
    return typeof content === "string"
  }
  // openai / deepseek: string, array (multimodal), null, or omitted when tool_calls present
  if (content === undefined || content === null) return true
  if (typeof content === "string") return true
  if (Array.isArray(content)) return true
  return false
}

/**
 * Parse and validate chat messages from messagesJson.
 * Returns undefined when messagesJson is empty (caller builds from prompts).
 * Preserves full message objects (tool_calls, tool_call_id, name, …).
 */
export function parseValidatedMessages(
  messagesJson: string,
  brand: string,
  mode: MessageValidationMode | readonly string[] = "strict-chat",
): ChatMessage[] | undefined {
  const resolvedMode: MessageValidationMode =
    typeof mode === "string" ? mode : "strict-chat"
  const allowedRoles =
    typeof mode === "string" ? ROLE_SETS[mode] : mode

  const fromJson = parseJsonArray(messagesJson, "messagesJson", brand)
  if (!fromJson) return undefined

  if (fromJson.length === 0) {
    throw new NonRetriableError(
      `${brand}: messagesJson must contain at least one message.`,
    )
  }

  const out: ChatMessage[] = []
  for (let i = 0; i < fromJson.length; i++) {
    const item = fromJson[i]
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      throw new NonRetriableError(
        `${brand} messagesJson[${i}] must be an object with role (and content when required).`,
      )
    }
    const rec = { ...(item as Record<string, unknown>) }
    const role = rec.role
    if (typeof role !== "string" || !role.trim()) {
      throw new NonRetriableError(
        `${brand} messagesJson[${i}].role must be a non-empty string.`,
      )
    }
    if (!allowedRoles.includes(role)) {
      throw new NonRetriableError(
        `${brand} messagesJson[${i}].role must be one of: ${allowedRoles.join(", ")}.`,
      )
    }

    // tool role requires tool_call_id for OpenAI/DeepSeek tool loops
    if (
      (resolvedMode === "openai-chat" || resolvedMode === "deepseek-chat") &&
      role === "tool"
    ) {
      if (
        rec.tool_call_id !== undefined &&
        typeof rec.tool_call_id !== "string"
      ) {
        throw new NonRetriableError(
          `${brand} messagesJson[${i}].tool_call_id must be a string when present.`,
        )
      }
    }

    // assistant tool_calls must be array when present
    if (rec.tool_calls !== undefined && !Array.isArray(rec.tool_calls)) {
      throw new NonRetriableError(
        `${brand} messagesJson[${i}].tool_calls must be an array when present.`,
      )
    }

    if (!isValidContent(rec.content, resolvedMode)) {
      throw new NonRetriableError(
        resolvedMode === "strict-chat"
          ? `${brand} messagesJson[${i}].content must be a string.`
          : `${brand} messagesJson[${i}].content must be a string, array, null, or omitted.`,
      )
    }

    // strict: content required as string
    if (resolvedMode === "strict-chat" && typeof rec.content !== "string") {
      throw new NonRetriableError(
        `${brand} messagesJson[${i}].content must be a string.`,
      )
    }

    // openai tool message: content should still be string (tool result)
    if (
      (resolvedMode === "openai-chat" || resolvedMode === "deepseek-chat") &&
      role === "tool" &&
      rec.content !== undefined &&
      typeof rec.content !== "string"
    ) {
      throw new NonRetriableError(
        `${brand} messagesJson[${i}].content for role=tool must be a string.`,
      )
    }

    out.push(rec as ChatMessage)
  }
  return out
}

/**
 * Build chat messages from messagesJson or prompt fields.
 * mode defaults to strict-chat; pass "openai-chat" for full tool-calling support.
 */
export function buildChatMessages(opts: {
  brand: string
  messagesJson: string
  userPrompt: string
  prompt: string
  systemPrompt?: string
  input?: string
  mode?: MessageValidationMode
  /** @deprecated use mode — still accepted as role list */
  allowedRoles?: readonly string[]
}): ChatMessage[] {
  const mode =
    opts.mode ??
    (opts.allowedRoles
      ? undefined
      : ("strict-chat" as MessageValidationMode))

  const fromJson = parseValidatedMessages(
    opts.messagesJson,
    opts.brand,
    mode ?? opts.allowedRoles ?? "strict-chat",
  )
  if (fromJson) return fromJson

  const user =
    opts.userPrompt.trim() ||
    opts.prompt.trim() ||
    (opts.input ?? "").trim()
  if (!user) {
    throw new NonRetriableError(
      `${opts.brand}: userPrompt, prompt, or messagesJson is required.`,
    )
  }
  const messages: ChatMessage[] = []
  if (opts.systemPrompt?.trim()) {
    messages.push({ role: "system", content: opts.systemPrompt })
  }
  messages.push({ role: "user", content: user })
  return messages
}

/**
 * Gemini contents: role is user|model, parts array required.
 * Supports text parts and inlineData (multimodal full potential).
 */
export function parseGeminiContents(
  contentsJson: string,
  brand: string,
): unknown[] | undefined {
  const fromJson = parseJsonArray(contentsJson, "contentsJson", brand)
  if (!fromJson) return undefined
  if (fromJson.length === 0) {
    throw new NonRetriableError(
      `${brand}: contentsJson must contain at least one content item.`,
    )
  }
  for (let i = 0; i < fromJson.length; i++) {
    const item = fromJson[i]
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      throw new NonRetriableError(
        `${brand} contentsJson[${i}] must be an object.`,
      )
    }
    const rec = item as Record<string, unknown>
    if (rec.role !== undefined) {
      if (typeof rec.role !== "string") {
        throw new NonRetriableError(
          `${brand} contentsJson[${i}].role must be a string.`,
        )
      }
      if (rec.role !== "user" && rec.role !== "model") {
        throw new NonRetriableError(
          `${brand} contentsJson[${i}].role must be user or model.`,
        )
      }
    }
    if (!Array.isArray(rec.parts) || rec.parts.length === 0) {
      throw new NonRetriableError(
        `${brand} contentsJson[${i}].parts must be a non-empty array.`,
      )
    }
    for (let j = 0; j < rec.parts.length; j++) {
      const part = rec.parts[j]
      if (part === null || typeof part !== "object" || Array.isArray(part)) {
        throw new NonRetriableError(
          `${brand} contentsJson[${i}].parts[${j}] must be an object.`,
        )
      }
      const p = part as Record<string, unknown>
      if (p.text !== undefined && typeof p.text !== "string") {
        throw new NonRetriableError(
          `${brand} contentsJson[${i}].parts[${j}].text must be a string.`,
        )
      }
      if (p.inlineData !== undefined) {
        if (
          p.inlineData === null ||
          typeof p.inlineData !== "object" ||
          Array.isArray(p.inlineData)
        ) {
          throw new NonRetriableError(
            `${brand} contentsJson[${i}].parts[${j}].inlineData must be an object.`,
          )
        }
        const id = p.inlineData as Record<string, unknown>
        if (typeof id.mimeType !== "string" || typeof id.data !== "string") {
          throw new NonRetriableError(
            `${brand} contentsJson[${i}].parts[${j}].inlineData requires mimeType and data strings.`,
          )
        }
      }
    }
  }
  return fromJson
}

export function requireClientSurface(
  brand: string,
  ok: boolean,
  detail: string,
): void {
  if (!ok) {
    throw new NonRetriableError(`${brand} Corsair: ${detail}`)
  }
}
