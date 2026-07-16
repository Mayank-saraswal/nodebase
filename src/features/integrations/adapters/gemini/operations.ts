/**
 * Gemini Corsair operations — full @corsair-dev/gemini surface.
 * Edge cases: contents/params JSON, roles, sampling ranges, stream=true rejected.
 */

import { NonRetriableError } from "inngest"
import { geminiIntegrationDefinition } from "@/features/integrations/registry/integrations/gemini"
import { resolveOperation } from "@/features/integrations/registry/resolve"
import {
  assertNoStream,
  assertSamplingParams,
  optNum,
  parseGeminiContents,
  parseJsonObject,
  requireClientSurface,
} from "../_shared/llm-edges"

type ApiFn = (args?: Record<string, unknown>) => Promise<unknown>

export type GeminiApiClient = {
  gemini: {
    api: {
      content: {
        countTokens: ApiFn
        embedContent: ApiFn
        generateContent: ApiFn
      }
      images: { generateImage: ApiFn }
      videos: {
        generateVideos: ApiFn
        getVideosOperation: ApiFn
        waitForVideo: ApiFn
      }
      models: { listModels: ApiFn }
    }
  }
}

export type ResolvedGeminiFields = {
  operation: string
  model: string
  prompt: string
  userPrompt: string
  systemPrompt: string
  contentsJson: string
  paramsJson: string
  temperature: string
  maxOutputTokens: string
  operationName: string
  pollIntervalMs: string
  timeoutMs: string
  pageSize: string
  pageToken: string
  taskType: string
  title: string
}

function asRecord(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {}
}

function wrap(operation: string, data: unknown): Record<string, unknown> {
  const rec = asRecord(data)
  let text = typeof rec.text === "string" ? rec.text : ""
  if (!text) {
    const candidates = rec.candidates
    if (Array.isArray(candidates) && candidates[0]) {
      const c0 = asRecord(candidates[0])
      const content = asRecord(c0.content)
      const parts = content.parts
      if (Array.isArray(parts) && parts[0]) {
        const p0 = asRecord(parts[0])
        if (typeof p0.text === "string") text = p0.text
      }
    }
  }
  return { operation, ...rec, data, ...(text ? { text } : {}) }
}

function normalizeOp(raw: string): string {
  const { operation, requestedKey } = resolveOperation(
    geminiIntegrationDefinition,
    raw,
  )
  if (operation.aliases?.includes(requestedKey)) return requestedKey
  return operation.aliases?.[0] ?? operation.key
}

export function isGeminiCorsairOp(operation: string): boolean {
  try {
    resolveOperation(geminiIntegrationDefinition, operation)
    return true
  } catch {
    return false
  }
}

function userText(fields: ResolvedGeminiFields): string {
  return fields.userPrompt.trim() || fields.prompt.trim() || ""
}

function buildContents(fields: ResolvedGeminiFields): unknown[] {
  const fromJson = parseGeminiContents(fields.contentsJson, "Gemini")
  if (fromJson) return fromJson
  const text = userText(fields)
  if (!text) {
    throw new NonRetriableError(
      "Gemini: contentsJson or userPrompt/prompt is required.",
    )
  }
  return [{ role: "user", parts: [{ text }] }]
}

function generationConfig(fields: ResolvedGeminiFields) {
  const temperature = optNum(fields.temperature)
  const maxOutputTokens = optNum(fields.maxOutputTokens)
  assertSamplingParams("Gemini", {
    temperature,
    maxTokens: maxOutputTokens,
  })
  if (temperature === undefined && maxOutputTokens === undefined) {
    return undefined
  }
  return {
    ...(temperature !== undefined ? { temperature } : {}),
    ...(maxOutputTokens !== undefined ? { maxOutputTokens } : {}),
  }
}

function systemInstruction(fields: ResolvedGeminiFields) {
  if (!fields.systemPrompt.trim()) return undefined
  return {
    parts: [{ text: fields.systemPrompt }],
  }
}

export async function runGeminiOperation(
  client: GeminiApiClient,
  fields: ResolvedGeminiFields,
): Promise<Record<string, unknown>> {
  requireClientSurface(
    "Gemini",
    Boolean(client.gemini?.api?.content?.generateContent),
    "client.gemini.api missing. Is @corsair-dev/gemini registered?",
  )

  const api = client.gemini.api
  const op = normalizeOp(fields.operation)
  const model = fields.model.trim() || "gemini-2.0-flash"
  const extra = parseJsonObject(fields.paramsJson, "paramsJson", "Gemini")
  assertNoStream("Gemini", false, extra)

  switch (op) {
    case "CHAT":
    case "GENERATE_CONTENT":
    case "GENERATE_TEXT":
    case "content.generateContent": {
      const contents = buildContents(fields)
      const data = await api.content.generateContent({
        model,
        contents,
        generationConfig: generationConfig(fields),
        systemInstruction: systemInstruction(fields),
        ...extra,
        stream: undefined,
      })
      return wrap("CHAT", data)
    }
    case "COUNT_TOKENS":
    case "content.countTokens": {
      const contents = buildContents(fields)
      const data = await api.content.countTokens({
        model,
        contents,
        ...extra,
      })
      return wrap("COUNT_TOKENS", data)
    }
    case "EMBED":
    case "EMBED_CONTENT":
    case "content.embedContent": {
      const text = userText(fields)
      if (!text && !extra.content) {
        throw new NonRetriableError(
          "Gemini EMBED: prompt / userPrompt is required.",
        )
      }
      const data = await api.content.embedContent({
        model: fields.model.trim() || "text-embedding-004",
        content: extra.content ?? {
          role: "user",
          parts: [{ text }],
        },
        taskType: fields.taskType || undefined,
        title: fields.title || undefined,
        ...extra,
      })
      return wrap("EMBED", data)
    }
    case "IMAGE":
    case "GENERATE_IMAGE":
    case "images.generateImage": {
      const prompt = fields.prompt.trim() || fields.userPrompt.trim()
      if (!prompt) {
        throw new NonRetriableError("Gemini IMAGE: prompt is required.")
      }
      const data = await api.images.generateImage({
        model: fields.model.trim() || "imagen-3.0-generate-002",
        prompt,
        generationConfig: generationConfig(fields),
        ...extra,
      })
      return wrap("IMAGE", data)
    }
    case "GENERATE_VIDEO":
    case "VIDEO":
    case "videos.generateVideos": {
      const prompt = fields.prompt.trim() || fields.userPrompt.trim()
      if (!prompt) {
        throw new NonRetriableError(
          "Gemini GENERATE_VIDEO: prompt is required.",
        )
      }
      const data = await api.videos.generateVideos({
        model: fields.model.trim() || "veo-2.0-generate-001",
        prompt,
        ...extra,
      })
      return wrap("GENERATE_VIDEO", data)
    }
    case "GET_VIDEO_OPERATION":
    case "GET_VIDEO_OP":
    case "videos.getVideosOperation": {
      if (!fields.operationName.trim()) {
        throw new NonRetriableError(
          "Gemini GET_VIDEO_OPERATION: operationName is required.",
        )
      }
      const data = await api.videos.getVideosOperation({
        operationName: fields.operationName,
        ...extra,
      })
      return wrap("GET_VIDEO_OPERATION", data)
    }
    case "WAIT_VIDEO":
    case "WAIT_FOR_VIDEO":
    case "videos.waitForVideo": {
      if (!fields.operationName.trim()) {
        throw new NonRetriableError(
          "Gemini WAIT_VIDEO: operationName is required.",
        )
      }
      const data = await api.videos.waitForVideo({
        operationName: fields.operationName,
        pollIntervalMs: optNum(fields.pollIntervalMs) ?? 5000,
        timeoutMs: optNum(fields.timeoutMs) ?? 300000,
        ...extra,
      })
      return wrap("WAIT_VIDEO", data)
    }
    case "LIST_MODELS":
    case "models.listModels": {
      const data = await api.models.listModels({
        pageSize: optNum(fields.pageSize),
        pageToken: fields.pageToken || undefined,
        ...extra,
      })
      return wrap("LIST_MODELS", data)
    }
    default:
      throw new NonRetriableError(
        `Gemini ${op}: not available on Corsair path.`,
      )
  }
}
