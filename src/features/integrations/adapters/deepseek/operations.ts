/**
 * DeepSeek Corsair operations — full @corsair-dev/deepseek surface.
 */

import { NonRetriableError } from "inngest"
import { deepseekIntegrationDefinition } from "@/features/integrations/registry/integrations/deepseek"
import { resolveOperation } from "@/features/integrations/registry/resolve"

type ApiFn = (args?: Record<string, unknown>) => Promise<unknown>

export type DeepseekApiClient = {
  deepseek: {
    api: {
      chat: { createCompletion: ApiFn }
      anthropic: { createMessage: ApiFn }
      user: { getBalance: ApiFn }
      models: { list: ApiFn }
    }
  }
}

export type ResolvedDeepseekFields = {
  operation: string
  model: string
  prompt: string
  userPrompt: string
  systemPrompt: string
  messagesJson: string
  paramsJson: string
  temperature: string
  maxTokens: string
}

function asRecord(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {}
}

function wrap(operation: string, data: unknown): Record<string, unknown> {
  const rec = asRecord(data)
  let text = ""
  // OpenAI-style choices
  const choices = rec.choices
  if (Array.isArray(choices) && choices[0]) {
    const c0 = asRecord(choices[0])
    const msg = asRecord(c0.message)
    if (typeof msg.content === "string") text = msg.content
  }
  // Anthropic-style content array
  if (!text && Array.isArray(rec.content)) {
    const parts = rec.content as unknown[]
    const texts = parts
      .map((p) => asRecord(p))
      .filter((p) => p.type === "text" && typeof p.text === "string")
      .map((p) => p.text as string)
    if (texts.length) text = texts.join("")
  }
  return { operation, ...rec, data, ...(text ? { text } : {}) }
}

function normalizeOp(raw: string): string {
  const { operation, requestedKey } = resolveOperation(
    deepseekIntegrationDefinition,
    raw,
  )
  if (operation.aliases?.includes(requestedKey)) return requestedKey
  return operation.aliases?.[0] ?? operation.key
}

export function isDeepseekCorsairOp(operation: string): boolean {
  try {
    resolveOperation(deepseekIntegrationDefinition, operation)
    return true
  } catch {
    return false
  }
}

function parseJsonObject(raw: string, field: string): Record<string, unknown> {
  if (!raw.trim()) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
    throw new NonRetriableError(`DeepSeek ${field} must be a JSON object.`)
  } catch (e) {
    if (e instanceof NonRetriableError) throw e
    throw new NonRetriableError(`DeepSeek ${field} is invalid JSON.`)
  }
}

function parseJsonArray(raw: string, field: string): unknown[] | undefined {
  if (!raw.trim()) return undefined
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      throw new NonRetriableError(`DeepSeek ${field} must be a JSON array.`)
    }
    return parsed
  } catch (e) {
    if (e instanceof NonRetriableError) throw e
    throw new NonRetriableError(`DeepSeek ${field} is invalid JSON.`)
  }
}

function optNum(value: string): number | undefined {
  if (!value.trim()) return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

function resolveModel(fields: ResolvedDeepseekFields): "deepseek-chat" | "deepseek-reasoner" {
  const m = fields.model.trim()
  if (m === "deepseek-reasoner") return "deepseek-reasoner"
  return "deepseek-chat"
}

function buildChatMessages(fields: ResolvedDeepseekFields): unknown[] {
  const fromJson = parseJsonArray(fields.messagesJson, "messagesJson")
  if (fromJson) return fromJson
  const user =
    fields.userPrompt.trim() || fields.prompt.trim()
  if (!user) {
    throw new NonRetriableError(
      "DeepSeek CHAT: userPrompt, prompt, or messagesJson is required.",
    )
  }
  const messages: Array<Record<string, string>> = []
  if (fields.systemPrompt.trim()) {
    messages.push({ role: "system", content: fields.systemPrompt })
  }
  messages.push({ role: "user", content: user })
  return messages
}

function buildAnthropicMessages(fields: ResolvedDeepseekFields): unknown[] {
  const fromJson = parseJsonArray(fields.messagesJson, "messagesJson")
  if (fromJson) return fromJson
  const user = fields.userPrompt.trim() || fields.prompt.trim()
  if (!user) {
    throw new NonRetriableError(
      "DeepSeek ANTHROPIC_MESSAGE: userPrompt, prompt, or messagesJson is required.",
    )
  }
  return [{ role: "user", content: user }]
}

export async function runDeepseekOperation(
  client: DeepseekApiClient,
  fields: ResolvedDeepseekFields,
): Promise<Record<string, unknown>> {
  const api = client.deepseek.api
  const op = normalizeOp(fields.operation)
  const model = resolveModel(fields)
  const extra = parseJsonObject(fields.paramsJson, "paramsJson")

  switch (op) {
    case "CHAT":
    case "CHAT_COMPLETION":
    case "CREATE_COMPLETION":
    case "GENERATE_TEXT":
    case "chat.createCompletion": {
      const messages = buildChatMessages(fields)
      const data = await api.chat.createCompletion({
        model,
        messages,
        temperature: optNum(fields.temperature),
        maxTokens: optNum(fields.maxTokens),
        ...extra,
      })
      return wrap("CHAT", data)
    }
    case "ANTHROPIC_MESSAGE":
    case "CREATE_MESSAGE":
    case "anthropic.createMessage": {
      const messages = buildAnthropicMessages(fields)
      const maxTokens = optNum(fields.maxTokens) ?? 1024
      if (maxTokens <= 0) {
        throw new NonRetriableError(
          "DeepSeek ANTHROPIC_MESSAGE: maxTokens must be a positive number.",
        )
      }
      const data = await api.anthropic.createMessage({
        model,
        maxTokens,
        messages,
        system: fields.systemPrompt.trim() || undefined,
        temperature: optNum(fields.temperature),
        ...extra,
      })
      return wrap("ANTHROPIC_MESSAGE", data)
    }
    case "GET_BALANCE":
    case "BALANCE":
    case "user.getBalance": {
      const data = await api.user.getBalance({ ...extra })
      return wrap("GET_BALANCE", data)
    }
    case "LIST_MODELS":
    case "models.list": {
      const data = await api.models.list({ ...extra })
      return wrap("LIST_MODELS", data)
    }
    default:
      throw new NonRetriableError(
        `DeepSeek ${op}: not available on Corsair path.`,
      )
  }
}
