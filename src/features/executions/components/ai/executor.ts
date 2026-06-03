import type { NodeExecutor } from "@/features/executions/types"
import { NonRetriableError, RetryAfterError } from "inngest"
import { resolveTemplate } from "@/features/executions/lib/template-resolver"
import prisma from "@/lib/db"
import { decrypt } from "@/lib/encryption"
import { aiChannel } from "@/inngest/channels/ai"
import { uploadMedia } from "@/lib/media-service"
import { AICallInput, AIOperation, AIProvider, callProvider } from "./lib/providers"

function tryParseJson<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str) as T
  } catch {
    return fallback
  }
}

type AiNodeData = { nodeId?: string }

export const aiExecutor: NodeExecutor<AiNodeData> = async ({
  nodeId,
  context,
  step,
  publish,
  userId,
}) => {
  // ── Step 1: Load config ────────────────────────────────────────────────────
  const config = await step.run(`ai-${nodeId}-load`, async () => {
    return prisma.aINode.findUnique({
      where: { nodeId },
      include: { workflow: { select: { userId: true } } },
    })
  })

  // ── Step 2: Validate ───────────────────────────────────────────────────────
  await step.run(`ai-${nodeId}-validate`, async () => {
    if (!config) {
      throw new NonRetriableError(
        "AI node not configured. Open settings and save configuration.",
      )
    }
    if (config.workflow.userId !== userId) {
      throw new NonRetriableError("AI node: unauthorized")
    }
    return { valid: true }
  })

  if (!config) throw new NonRetriableError("AI node not configured")

  // ── Step 3: Execute ────────────────────────────────────────────────────────
  return await step.run(`ai-${nodeId}-execute`, async () => {
    await publish(aiChannel(nodeId).status({ status: "loading", nodeId }))

    const r = (field: string) => resolveTemplate(field, context)

    // Decrypt credential
    let apiKey = ""
    if (config.credentialId) {
      const credential = await prisma.credential.findUnique({
        where: { id: config.credentialId, userId },
      })
      if (!credential) {
        throw new NonRetriableError(
          "AI node: credential not found. Re-select credential in settings.",
        )
      }
      try {
        const parsed = JSON.parse(decrypt(credential.value)) as { apiKey?: string; apikey?: string }
        apiKey = parsed.apiKey ?? parsed.apikey ?? ""
      } catch {
        // credential.value might be a plain decrypted string
        apiKey = decrypt(credential.value)
      }
    }

    if (!apiKey) {
      throw new NonRetriableError(
        "AI node: API key is empty. Check credential configuration.",
      )
    }

    // Build conversation history
    let history: Array<{ role: "user" | "assistant"; content: string }> = []
    if (
      (config.operation === "CHAT_WITH_HISTORY" ||
        config.operation === "CHAT") &&
      config.historyKey
    ) {
      const raw = context[config.historyKey]
      if (Array.isArray(raw)) {
        history = (raw as Array<{ role: "user" | "assistant"; content: string }>)
          .slice(-(config.maxHistory * 2))
      }
    }

    // Resolve image URLs
    const imageUrls: string[] = []
    if (config.imageUrl) imageUrls.push(r(config.imageUrl))
    const extraImageUrls = tryParseJson<string[]>(r(config.imageUrls), [])
    if (Array.isArray(extraImageUrls)) imageUrls.push(...extraImageUrls)

    const callInput: AICallInput = {
      operation: config.operation as AIOperation,
      provider: config.provider as AIProvider,
      model: config.model,
      apiKey,
      systemPrompt: r(config.systemPrompt),
      userPrompt: r(config.userPrompt),
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      topP: config.topP,
      frequencyPenalty: config.frequencyPenalty,
      presencePenalty: config.presencePenalty,
      responseFormat: config.responseFormat,
      jsonSchema: config.jsonSchema,
      toolsJson: r(config.toolsJson),
      toolChoice: config.toolChoice,
      imageUrl: r(config.imageUrl),
      imageUrls,
      imageDetail: config.imageDetail,
      history,
      embeddingInput: r(config.embeddingInput),
      audioUrl: r(config.audioUrl),
      audioLanguage: config.audioLanguage,
      transcriptionFormat: config.transcriptionFormat,
      imagePrompt: r(config.imagePrompt),
      imageSize: config.imageSize,
      imageQuality: config.imageQuality,
      imageStyle: config.imageStyle,
      imageCount: config.imageCount,
      classifyLabels: config.classifyLabels
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      classifyExamples: tryParseJson<Array<{ text: string; label: string }>>(
        r(config.classifyExamples),
        [],
      ),
    }

    let output
    try {
      output = await callProvider(callInput)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      // Rate-limit detection
      if (msg.includes("429") || msg.toLowerCase().includes("rate limit")) {
        await publish(aiChannel(nodeId).status({ status: "error", nodeId }))
        throw new RetryAfterError(`AI rate limit: ${msg}`, "60s")
      }
      await publish(aiChannel(nodeId).status({ status: "error", nodeId }))
      throw new NonRetriableError(`AI call failed: ${msg}`)
    }

    // ── Media upload: persist generated images to DigitalOcean Spaces immediately ──
    // This prevents temp DALL-E/Gemini URLs from expiring before consumer nodes run.
    const executionId = (context.__executionId as string) ?? undefined
    const mediaOpts = {
      userId,
      workflowId: config.workflowId,
      executionId,
    }

    let persistedImageUrls: string[] = []
    let persistedImageUrl = ""

    if (output.imageUrls && output.imageUrls.length > 0) {
      const uploadPromises = (output.imageUrls as string[]).map(
        async (imgSrc: string, i: number) => {
          try {
            const result = await uploadMedia(imgSrc, "image/png", {
              ...mediaOpts,
              filename: `generated-image-${i}.png`,
            })
            return result.publicUrl
          } catch (err) {
            // Log but don't crash — return original URL as fallback
            console.error(`MediaService: Failed to upload image ${i}:`, err)
            return imgSrc
          }
        }
      )
      persistedImageUrls = await Promise.all(uploadPromises)
      persistedImageUrl = persistedImageUrls[0] ?? ""
    }

    // Build finalOutput — replace temp URLs with persisted cloud storage URLs
    const finalOutput = {
      ...output,
      ...(persistedImageUrls.length > 0
        ? {
            imageUrls: persistedImageUrls,
            imageUrl: persistedImageUrl,
            // Keep original temp URL for debugging
            originalImageUrls: output.imageUrls,
          }
        : {}),
    }

    await publish(aiChannel(nodeId).status({ status: "success", nodeId }))

    const variableName = config.variableName || "ai"

    // Build updated history for CHAT_WITH_HISTORY
    const updatedHistory = [
      ...history,
      { role: "user" as const, content: callInput.userPrompt },
      { role: "assistant" as const, content: output.text ?? "" },
    ].slice(-(config.maxHistory * 2))

    // Extract provider-specific extras
    const rawResp = output.rawResponse as Record<string, unknown> | undefined
    const citations = rawResp?.citations as string[] | undefined
    const reasoningContent = (rawResp?.choices as Array<{ message?: { reasoning_content?: string } }>)?.[0]?.message?.reasoning_content
      ?? (rawResp?.reasoning_content as string | undefined)

    return {
      ...context,
      [variableName]: {
        operation: config.operation,
        model: config.model,
        // Chat outputs
        ...(finalOutput.text !== undefined ? { text: finalOutput.text, aiResponse: finalOutput.text } : {}),
        ...(finalOutput.json !== undefined ? { json: finalOutput.json } : {}),
        ...(finalOutput.toolCalls ? { toolCalls: finalOutput.toolCalls } : {}),
        // Special outputs
        ...(finalOutput.embedding ? { embedding: finalOutput.embedding } : {}),
        ...(finalOutput.imageUrls
          ? {
              imageUrls: finalOutput.imageUrls,
              imageUrl: finalOutput.imageUrls[0] ?? "",
              ...(finalOutput.originalImageUrls ? { originalImageUrls: finalOutput.originalImageUrls } : {}),
            }
          : {}),
        ...(finalOutput.transcript !== undefined ? { transcript: finalOutput.transcript } : {}),
        ...(finalOutput.label !== undefined
          ? { label: finalOutput.label, confidence: finalOutput.confidence }
          : {}),
        // Provider-specific
        ...(citations ? { citations } : {}),
        ...(reasoningContent ? { reasoning: reasoningContent } : {}),
        // Usage
        usage: finalOutput.usage ?? null,
        // History for CHAT_WITH_HISTORY
        history: updatedHistory,
      },
    }
  })
}
