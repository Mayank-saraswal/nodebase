/**
 * OpenAI Corsair operations — full @corsair-dev/openai surface (129 endpoints).
 *
 * Generic path invoker: registry key `group.leaf` → client.openai.api.group.leaf(args)
 * Convenience fields map to common chat / embeddings / images / moderation ops.
 * Edge cases: messages/params JSON, roles, sampling ranges, stream=true rejected.
 */

import { NonRetriableError } from "inngest"
import { openaiIntegrationDefinition } from "@/features/integrations/registry/integrations/openai"
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

/** Loose nested client — leaves are callables */
export type OpenAIApiClient = {
  openai: {
    api: Record<string, unknown>
  }
}

export type ResolvedOpenAIFields = {
  operation: string
  model: string
  prompt: string
  systemPrompt: string
  userPrompt: string
  input: string
  id: string
  fileId: string
  threadId: string
  assistantId: string
  runId: string
  vectorStoreId: string
  batchId: string
  uploadId: string
  conversationId: string
  messagesJson: string
  paramsJson: string
  temperature: string
  maxTokens: string
  n: string
  size: string
  voice: string
  instructions: string
}

function asRecord(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {}
}

function wrap(operation: string, data: unknown): Record<string, unknown> {
  const rec = asRecord(data)
  // convenience: extract chat text when present
  let text = ""
  const choices = rec.choices
  if (Array.isArray(choices) && choices[0] && typeof choices[0] === "object") {
    const c0 = choices[0] as Record<string, unknown>
    const msg = asRecord(c0.message)
    if (typeof msg.content === "string") text = msg.content
    else if (typeof c0.text === "string") text = c0.text
  }
  return { operation, ...rec, data, ...(text ? { text } : {}) }
}

function normalizeToKey(raw: string): string {
  const { operation } = resolveOperation(openaiIntegrationDefinition, raw)
  return operation.key
}

export function isOpenAICorsairOp(operation: string): boolean {
  try {
    resolveOperation(openaiIntegrationDefinition, operation)
    return true
  } catch {
    return false
  }
}

function resolveApiFn(
  api: Record<string, unknown>,
  key: string,
): ApiFn {
  const parts = key.split(".")
  let cur: unknown = api
  for (const p of parts) {
    if (cur === null || typeof cur !== "object") {
      throw new NonRetriableError(
        `OpenAI Corsair: path ${key} missing at segment '${p}'.`,
      )
    }
    cur = (cur as Record<string, unknown>)[p]
  }
  if (typeof cur !== "function") {
    throw new NonRetriableError(
      `OpenAI Corsair: ${key} is not a callable endpoint on the client.`,
    )
  }
  return cur as ApiFn
}

/**
 * Build args for well-known ops from convenience fields; merge paramsJson last.
 */
function buildArgs(
  key: string,
  fields: ResolvedOpenAIFields,
): Record<string, unknown> {
  const extra = parseJsonObject(fields.paramsJson, "paramsJson", "OpenAI")
  assertNoStream("OpenAI", false, extra)
  const model = fields.model.trim() || "gpt-4o-mini"
  const temperature = optNum(fields.temperature)
  const maxTokens = optNum(fields.maxTokens)
  assertSamplingParams("OpenAI", {
    temperature,
    maxTokens,
    topP: typeof extra.top_p === "number" ? extra.top_p : undefined,
  })

  // chat completions
  if (key === "chat.createCompletion") {
    const messages = buildChatMessages({
      brand: "OpenAI CHAT",
      messagesJson: fields.messagesJson,
      userPrompt: fields.userPrompt,
      prompt: fields.prompt,
      systemPrompt: fields.systemPrompt,
      input: fields.input,
    })
    return {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      ...extra,
      stream: undefined,
    }
  }

  if (key === "completions.create") {
    const prompt =
      fields.prompt.trim() || fields.userPrompt.trim() || fields.input.trim()
    if (!prompt) {
      throw new NonRetriableError(
        "OpenAI COMPLETION: prompt / userPrompt is required.",
      )
    }
    return {
      model: fields.model.trim() || "gpt-3.5-turbo-instruct",
      prompt,
      temperature,
      max_tokens: maxTokens,
      n: optNum(fields.n),
      ...extra,
      stream: undefined,
    }
  }

  if (key === "embeddings.create") {
    const input =
      fields.input.trim() || fields.prompt.trim() || fields.userPrompt.trim()
    if (!input) {
      throw new NonRetriableError("OpenAI EMBED: input / prompt is required.")
    }
    return {
      model: fields.model.trim() || "text-embedding-3-small",
      input,
      ...extra,
    }
  }

  if (key === "images.create") {
    const prompt = fields.prompt.trim() || fields.userPrompt.trim()
    if (!prompt) {
      throw new NonRetriableError("OpenAI IMAGE: prompt is required.")
    }
    return {
      model: fields.model.trim() || "dall-e-3",
      prompt,
      n: optNum(fields.n) ?? 1,
      size: fields.size || undefined,
      ...extra,
    }
  }

  if (key === "moderation.create") {
    const input =
      fields.input.trim() || fields.prompt.trim() || fields.userPrompt.trim()
    if (!input) {
      throw new NonRetriableError("OpenAI MODERATE: input is required.")
    }
    return { model: fields.model.trim() || undefined, input, ...extra }
  }

  if (key === "audio.createSpeech") {
    const input =
      fields.input.trim() || fields.prompt.trim() || fields.userPrompt.trim()
    if (!input) {
      throw new NonRetriableError("OpenAI TTS: input text is required.")
    }
    return {
      model: fields.model.trim() || "tts-1",
      input,
      voice: fields.voice || "alloy",
      ...extra,
    }
  }

  if (key === "models.retrieve" || key === "engines.retrieve") {
    requireId(fields.id || fields.model, "id/model", key)
    return { model: fields.id || fields.model, id: fields.id || fields.model, ...extra }
  }

  // id-bearing resources
  const idKeys: Record<string, keyof ResolvedOpenAIFields> = {
    "files.retrieve": "fileId",
    "files.delete": "fileId",
    "files.downloadContent": "fileId",
    "assistants.retrieve": "assistantId",
    "assistants.modify": "assistantId",
    "assistants.delete": "assistantId",
    "threads.retrieve": "threadId",
    "threads.modify": "threadId",
    "threads.delete": "threadId",
    "threads.createAndRun": "threadId",
    "runs.create": "threadId",
    "runs.list": "threadId",
    "runs.retrieve": "runId",
    "runs.modify": "runId",
    "runs.cancel": "runId",
    "runs.submitToolOutputs": "runId",
    "vectorStores.retrieve": "vectorStoreId",
    "vectorStores.modify": "vectorStoreId",
    "vectorStores.delete": "vectorStoreId",
    "vectorStores.search": "vectorStoreId",
    "batches.retrieve": "batchId",
    "batches.cancel": "batchId",
    "uploads.addPart": "uploadId",
    "uploads.complete": "uploadId",
    "uploads.cancel": "uploadId",
    "conversations.update": "conversationId",
    "conversations.delete": "conversationId",
    "conversations.createItems": "conversationId",
    "conversations.listItems": "conversationId",
  }

  const idField = idKeys[key]
  if (idField) {
    const val = String(fields[idField] || fields.id || "").trim()
    if (!val && !extra.id) {
      throw new NonRetriableError(
        `OpenAI ${key}: ${idField} (or id / paramsJson.id) is required.`,
      )
    }
    // most endpoints use `id` or named fields — merge both
    const named: Record<string, string> = {}
    if (idField === "fileId") named.file_id = val
    if (idField === "threadId") named.thread_id = val
    if (idField === "assistantId") named.assistant_id = val
    if (idField === "runId") {
      named.run_id = val
      if (fields.threadId) named.thread_id = fields.threadId
    }
    if (idField === "vectorStoreId") named.vector_store_id = val
    if (idField === "batchId") named.batch_id = val
    if (idField === "uploadId") named.upload_id = val
    if (idField === "conversationId") named.conversation_id = val
    return {
      id: val || (extra.id as string),
      ...named,
      model: fields.model.trim() || undefined,
      instructions: fields.instructions || undefined,
      ...extra,
    }
  }

  // list / create with optional model + params only
  if (key === "assistants.create") {
    return {
      model,
      instructions: fields.instructions || fields.systemPrompt || undefined,
      ...extra,
    }
  }

  // default: paramsJson + common id/model
  const base: Record<string, unknown> = { ...extra }
  if (fields.id.trim()) base.id = fields.id
  if (fields.model.trim()) base.model = fields.model
  if (fields.prompt.trim()) base.prompt = fields.prompt
  if (fields.input.trim()) base.input = fields.input
  if (fields.fileId.trim()) base.file_id = fields.fileId
  if (fields.threadId.trim()) base.thread_id = fields.threadId
  if (fields.assistantId.trim()) base.assistant_id = fields.assistantId
  if (fields.runId.trim()) base.run_id = fields.runId
  if (fields.vectorStoreId.trim()) base.vector_store_id = fields.vectorStoreId
  if (fields.messagesJson.trim()) {
    base.messages = buildChatMessages({
      brand: "OpenAI",
      messagesJson: fields.messagesJson,
      userPrompt: fields.userPrompt,
      prompt: fields.prompt,
      systemPrompt: fields.systemPrompt,
      input: fields.input,
    })
  }

  // create endpoints with empty args must still be callable (e.g. models.list)
  return base
}

function requireId(value: string, field: string, op: string) {
  if (!value.trim()) {
    throw new NonRetriableError(`OpenAI ${op}: ${field} is required.`)
  }
}

export async function runOpenAIOperation(
  client: OpenAIApiClient,
  fields: ResolvedOpenAIFields,
): Promise<Record<string, unknown>> {
  requireClientSurface(
    "OpenAI",
    Boolean(client.openai?.api),
    "client.openai.api missing. Is @corsair-dev/openai registered?",
  )

  const key = normalizeToKey(fields.operation)
  const fn = resolveApiFn(
    client.openai.api as Record<string, unknown>,
    key,
  )
  const args = buildArgs(key, fields)

  // strip undefined so zod optional fields stay clean
  const cleaned: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(args)) {
    if (v !== undefined && k !== "stream") cleaned[k] = v
  }

  const data = await fn(
    Object.keys(cleaned).length ? cleaned : undefined,
  )
  // return product-friendly alias for chat
  const productOp =
    key === "chat.createCompletion"
      ? "CHAT"
      : key === "embeddings.create"
        ? "EMBED"
        : key === "images.create"
          ? "IMAGE"
          : key
  return wrap(productOp, data)
}
