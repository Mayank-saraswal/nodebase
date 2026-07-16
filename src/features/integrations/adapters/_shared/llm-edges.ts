/**
 * Shared LLM edge-case validation for Corsair chat-style adapters
 * (OpenAI, Gemini, DeepSeek, Perplexity).
 *
 * Enforces:
 * - Missing userPrompt / prompt / messagesJson
 * - Empty messagesJson array
 * - Invalid role / non-string content
 * - Invalid messages / params JSON shapes
 * - temperature outside 0–2
 * - top_p outside (0, 1]
 * - max_tokens ≤ 0
 * - stream=true rejected (workflow safety)
 */

import { NonRetriableError } from "inngest"

export type ChatRole = "system" | "user" | "assistant"

export type ChatMessage = {
  role: string
  content: string
}

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

const DEFAULT_ROLES: readonly ChatRole[] = ["system", "user", "assistant"]

/**
 * Parse and validate chat messages from messagesJson.
 * Returns undefined when messagesJson is empty (caller builds from prompts).
 */
export function parseValidatedMessages(
  messagesJson: string,
  brand: string,
  allowedRoles: readonly string[] = DEFAULT_ROLES,
): ChatMessage[] | undefined {
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
        `${brand} messagesJson[${i}] must be an object with role and content.`,
      )
    }
    const rec = item as Record<string, unknown>
    const role = rec.role
    const content = rec.content
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
    if (typeof content !== "string") {
      throw new NonRetriableError(
        `${brand} messagesJson[${i}].content must be a string.`,
      )
    }
    out.push({ role, content })
  }
  return out
}

/**
 * Build OpenAI-style messages from messagesJson or prompt fields.
 */
export function buildChatMessages(opts: {
  brand: string
  messagesJson: string
  userPrompt: string
  prompt: string
  systemPrompt?: string
  /** Also accept `input` as user text (OpenAI convenience) */
  input?: string
  allowedRoles?: readonly string[]
}): ChatMessage[] {
  const fromJson = parseValidatedMessages(
    opts.messagesJson,
    opts.brand,
    opts.allowedRoles,
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
 * Gemini contents: role is user|model, parts[].text required when using JSON.
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
    if (!Array.isArray(rec.parts)) {
      throw new NonRetriableError(
        `${brand} contentsJson[${i}].parts must be an array.`,
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
    throw new NonRetriableError(
      `${brand} Corsair: ${detail}`,
    )
  }
}
