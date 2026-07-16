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
import {
  assertNoStream,
  assertSamplingParams,
  buildChatMessages,
  optNum,
  parseJsonObject,
  requireClientSurface,
} from "../_shared/llm-edges"

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

export async function runPerplexityOperation(
  client: PerplexityApiClient,
  fields: ResolvedPerplexityFields,
): Promise<Record<string, unknown>> {
  requireClientSurface(
    "Perplexity",
    Boolean(client.perplexityai?.api?.chat?.completions),
    "client.perplexityai.api.chat.completions missing. Is @corsair-dev/perplexityai registered?",
  )

  const api = client.perplexityai.api
  const op = normalizeOp(fields.operation)
  const extra = parseJsonObject(fields.paramsJson, "paramsJson", "Perplexity")
  assertNoStream("Perplexity", fields.stream, extra)

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
      const messages = buildChatMessages({
        brand: "Perplexity CHAT",
        messagesJson: fields.messagesJson,
        userPrompt: fields.userPrompt,
        prompt: fields.prompt,
        systemPrompt: fields.systemPrompt,
      })
      const max_tokens = optNum(fields.maxTokens)
      const temperature = optNum(fields.temperature)
      const top_p = optNum(fields.topP)
      const top_k = optNum(fields.topK)
      const presence_penalty = optNum(fields.presencePenalty)
      const frequency_penalty = optNum(fields.frequencyPenalty)

      assertSamplingParams("Perplexity CHAT", {
        temperature,
        topP: top_p,
        maxTokens: max_tokens,
      })

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
