/**
 * Perplexity AI Corsair operations — full @corsair-dev/perplexityai surface.
 *
 * Security / tenancy notes (enforced by runner, not this module):
 * - tenantId never read from node data
 * - client always from withTenant(tenantId)
 * - op must resolve through registry (no free-form paths)
 */

import { NonRetriableError } from "inngest"
import { perplexityIntegrationDefinition } from "@/features/integrations/registry/integrations/perplexity"
import { resolveOperation } from "@/features/integrations/registry/resolve"

type ApiFn = (args?: Record<string, unknown>) => Promise<unknown>

/**
 * Corsair tenant client shape for perplexityai plugin.
 * Plugin id in package is `perplexityai` → client.perplexityai.api
 */
export type PerplexityApiClient = {
  perplexityai: {
    api: {
      chat: {
        completions: ApiFn
      }
    }
  }
}

export type ResolvedPerplexityFields = {
  operation: string
  model: string
  prompt: string
  userPrompt: string
  systemPrompt: string
  messagesJson: string
  paramsJson: string
  temperature: string
  maxTokens: string
  topP: string
  topK: string
  returnCitations: boolean
  returnImages: boolean
  stream: boolean
  presencePenalty: string
  frequencyPenalty: string
}

function asRecord(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {}
}

function wrap(operation: string, data: unknown): Record<string, unknown> {
  const rec = asRecord(data)
  let text = ""
  const choices = rec.choices
  if (Array.isArray(choices) && choices[0]) {
    const c0 = asRecord(choices[0])
    const msg = asRecord(c0.message)
    if (typeof msg.content === "string") text = msg.content
  }
  return {
    operation,
    ...rec,
    data,
    ...(text ? { text } : {}),
  }
}

function normalizeOp(raw: string): string {
  const { operation, requestedKey } = resolveOperation(
    perplexityIntegrationDefinition,
    raw,
  )
  if (operation.aliases?.includes(requestedKey)) return requestedKey
  return operation.aliases?.[0] ?? operation.key
}

export function isPerplexityCorsairOp(operation: string): boolean {
  try {
    resolveOperation(perplexityIntegrationDefinition, operation)
    return true
  } catch {
    return false
  }
}

function parseJsonObject(raw: string, field: string): Record<string, unknown> {
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
    throw new NonRetriableError(`Perplexity ${field} must be a JSON object.`)
  } catch (e) {
    if (e instanceof NonRetriableError) throw e
    throw new NonRetriableError(`Perplexity ${field} is invalid JSON.`)
  }
}

function parseJsonArray(raw: string, field: string): unknown[] | undefined {
  if (!raw.trim()) return undefined
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      throw new NonRetriableError(`Perplexity ${field} must be a JSON array.`)
    }
    return parsed
  } catch (e) {
    if (e instanceof NonRetriableError) throw e
    throw new NonRetriableError(`Perplexity ${field} is invalid JSON.`)
  }
}

function optNum(value: string): number | undefined {
  if (!value.trim()) return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

/**
 * Build messages for chat.completions.
 * Prefers messagesJson; else system + user convenience fields.
 */
function buildMessages(
  fields: ResolvedPerplexityFields,
): Array<{ role: string; content: string }> {
  const fromJson = parseJsonArray(fields.messagesJson, "messagesJson")
  if (fromJson) {
    // Validate each message shape without any
    const out: Array<{ role: string; content: string }> = []
    for (let i = 0; i < fromJson.length; i++) {
      const item = fromJson[i]
      if (item === null || typeof item !== "object" || Array.isArray(item)) {
        throw new NonRetriableError(
          `Perplexity messagesJson[${i}] must be an object with role and content.`,
        )
      }
      const rec = item as Record<string, unknown>
      const role = rec.role
      const content = rec.content
      if (typeof role !== "string" || !role.trim()) {
        throw new NonRetriableError(
          `Perplexity messagesJson[${i}].role must be a non-empty string.`,
        )
      }
      if (typeof content !== "string") {
        throw new NonRetriableError(
          `Perplexity messagesJson[${i}].content must be a string.`,
        )
      }
      // Reject unknown roles early (package accepts system|user|assistant)
      if (role !== "system" && role !== "user" && role !== "assistant") {
        throw new NonRetriableError(
          `Perplexity messagesJson[${i}].role must be system, user, or assistant.`,
        )
      }
      out.push({ role, content })
    }
    if (out.length === 0) {
      throw new NonRetriableError(
        "Perplexity CHAT: messagesJson must contain at least one message.",
      )
    }
    return out
  }

  const user = fields.userPrompt.trim() || fields.prompt.trim()
  if (!user) {
    throw new NonRetriableError(
      "Perplexity CHAT: userPrompt, prompt, or messagesJson is required.",
    )
  }
  const messages: Array<{ role: string; content: string }> = []
  if (fields.systemPrompt.trim()) {
    messages.push({ role: "system", content: fields.systemPrompt })
  }
  messages.push({ role: "user", content: user })
  return messages
}

export async function runPerplexityOperation(
  client: PerplexityApiClient,
  fields: ResolvedPerplexityFields,
): Promise<Record<string, unknown>> {
  if (!client.perplexityai?.api?.chat?.completions) {
    throw new NonRetriableError(
      "Perplexity Corsair: client.perplexityai.api.chat.completions missing. Is @corsair-dev/perplexityai registered?",
    )
  }

  const api = client.perplexityai.api
  const op = normalizeOp(fields.operation)
  const extra = parseJsonObject(fields.paramsJson, "paramsJson")

  // Strip stream:true for workflow automation — streaming not supported on this path
  if (fields.stream || extra.stream === true) {
    throw new NonRetriableError(
      "Perplexity CHAT: stream=true is not supported in workflow execution. Use non-streaming completions.",
    )
  }

  switch (op) {
    case "CHAT":
    case "CHAT_COMPLETION":
    case "CREATE_COMPLETION":
    case "GENERATE_TEXT":
    case "SEARCH_CHAT":
    case "chat.completions": {
      const model = fields.model.trim() || "sonar"
      if (!model) {
        throw new NonRetriableError("Perplexity CHAT: model is required.")
      }
      const messages = buildMessages(fields)
      const max_tokens = optNum(fields.maxTokens)
      const temperature = optNum(fields.temperature)
      const top_p = optNum(fields.topP)
      const top_k = optNum(fields.topK)
      const presence_penalty = optNum(fields.presencePenalty)
      const frequency_penalty = optNum(fields.frequencyPenalty)

      // Range validation (API common bounds)
      if (temperature !== undefined && (temperature < 0 || temperature > 2)) {
        throw new NonRetriableError(
          "Perplexity CHAT: temperature must be between 0 and 2.",
        )
      }
      if (top_p !== undefined && (top_p <= 0 || top_p > 1)) {
        throw new NonRetriableError(
          "Perplexity CHAT: top_p must be in (0, 1].",
        )
      }
      if (max_tokens !== undefined && max_tokens <= 0) {
        throw new NonRetriableError(
          "Perplexity CHAT: max_tokens must be a positive number.",
        )
      }

      const data = await api.chat.completions({
        model,
        messages,
        max_tokens,
        temperature,
        top_p,
        top_k,
        return_citations: fields.returnCitations || undefined,
        return_images: fields.returnImages || undefined,
        presence_penalty,
        frequency_penalty,
        // never pass stream
        ...extra,
        stream: undefined,
      })
      return wrap("CHAT", data)
    }
    default:
      throw new NonRetriableError(
        `Perplexity ${op}: not available on Corsair path.`,
      )
  }
}
