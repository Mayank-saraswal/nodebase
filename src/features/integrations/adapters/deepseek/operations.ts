/**
 * DeepSeek Corsair operations — full @corsair-dev/deepseek surface.
 * Edge cases: messages/params JSON, roles, sampling ranges, stream=true rejected.
 */

import { NonRetriableError } from "inngest"
import { deepseekIntegrationDefinition } from "@/features/integrations/registry/integrations/deepseek"
import { resolveOperation } from "@/features/integrations/registry/resolve"
import {
  assertNoStream,
  assertSamplingParams,
  buildChatMessages,
  optNum,
  parseJsonObject,
  parseValidatedMessages,
  requireClientSurface,
} from "../_shared/llm-edges"

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
  const choices = rec.choices
  if (Array.isArray(choices) && choices[0]) {
    const c0 = asRecord(choices[0])
    const msg = asRecord(c0.message)
    if (typeof msg.content === "string") text = msg.content
  }
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

function resolveModel(
  fields: ResolvedDeepseekFields,
): "deepseek-chat" | "deepseek-reasoner" {
  const m = fields.model.trim()
  if (m === "deepseek-reasoner") return "deepseek-reasoner"
  return "deepseek-chat"
}

/** Anthropic path only allows user|assistant in messages (system is separate). */
function buildAnthropicMessages(
  fields: ResolvedDeepseekFields,
): Array<Record<string, unknown>> {
  const fromJson = parseValidatedMessages(
    fields.messagesJson,
    "DeepSeek",
    "anthropic-messages",
  )
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
  requireClientSurface(
    "DeepSeek",
    Boolean(client.deepseek?.api?.chat?.createCompletion),
    "client.deepseek.api missing. Is @corsair-dev/deepseek registered?",
  )

  const api = client.deepseek.api
  const op = normalizeOp(fields.operation)
  const model = resolveModel(fields)
  const extra = parseJsonObject(fields.paramsJson, "paramsJson", "DeepSeek")
  assertNoStream("DeepSeek", false, extra)

  const temperature = optNum(fields.temperature)
  const maxTokens = optNum(fields.maxTokens)
  assertSamplingParams("DeepSeek", {
    temperature,
    maxTokens,
    topP: typeof extra.topP === "number" ? extra.topP : undefined,
  })

  switch (op) {
    case "CHAT":
    case "CHAT_COMPLETION":
    case "CREATE_COMPLETION":
    case "GENERATE_TEXT":
    case "chat.createCompletion": {
      const messages = buildChatMessages({
        brand: "DeepSeek CHAT",
        messagesJson: fields.messagesJson,
        userPrompt: fields.userPrompt,
        prompt: fields.prompt,
        systemPrompt: fields.systemPrompt,
        // Full chat potential: system|user|assistant|tool + tools via paramsJson
        mode: "deepseek-chat",
      })
      const data = await api.chat.createCompletion({
        model,
        messages,
        temperature,
        maxTokens,
        // tools / toolChoice pass through paramsJson
        ...extra,
        stream: undefined,
      })
      return wrap("CHAT", data)
    }
    case "ANTHROPIC_MESSAGE":
    case "CREATE_MESSAGE":
    case "anthropic.createMessage": {
      const messages = buildAnthropicMessages(fields)
      const tokens = maxTokens ?? 1024
      if (tokens <= 0) {
        throw new NonRetriableError(
          "DeepSeek ANTHROPIC_MESSAGE: maxTokens must be a positive number.",
        )
      }
      const data = await api.anthropic.createMessage({
        model,
        maxTokens: tokens,
        messages,
        system: fields.systemPrompt.trim() || undefined,
        temperature,
        ...extra,
        stream: undefined,
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
