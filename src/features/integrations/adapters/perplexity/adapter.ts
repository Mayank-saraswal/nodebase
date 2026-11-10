/**
 * Perplexity AI Corsair adapter.
 * Type-safe field resolution; no implicit any.
 */

import { NonRetriableError } from "inngest"
import type { IntegrationAdapter } from "../../types"
import { t } from "../_shared/resolve-fields"
import { mapCorsairError } from "@/lib/corsair/errors"
import {
  runPerplexityOperation,
  type PerplexityApiClient,
  type ResolvedPerplexityFields,
} from "./operations"

function asBool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value
  if (value === "true" || value === 1 || value === "1") return true
  if (value === "false" || value === 0 || value === "0") return false
  return fallback
}

export const perplexityAdapter: IntegrationAdapter = {
  pluginId: "perplexityai",
  async run({ data, context, client, userId: _userId }) {
    void _userId
    // unknown: Node.data JSON boundary
    const config = (data ?? {}) as Record<string, unknown>
    const operation = String(config.operation ?? "CHAT")
    const variableName = String(config.variableName || "perplexity")

    if (!client || typeof client !== "object") {
      throw new NonRetriableError(
        "Perplexity Corsair: missing tenant client.",
      )
    }
    const px = client as PerplexityApiClient
    if (!px.perplexityai?.api) {
      throw new NonRetriableError(
        "Perplexity Corsair: client.perplexityai.api missing. Is @corsair-dev/perplexityai registered?",
      )
    }

    const fields: ResolvedPerplexityFields = {
      operation,
      model: t(
        (config.model as string) || "sonar",
        context,
      ),
      prompt: t(config.prompt as string, context),
      userPrompt: t(
        (config.userPrompt as string) ||
          (config.message as string) ||
          "",
        context,
      ),
      systemPrompt: t(
        (config.systemPrompt as string) ||
          (config.system as string) ||
          "",
        context,
      ),
      messagesJson: t(
        (config.messagesJson as string) ||
          (config.messages as string) ||
          "",
        context,
      ),
      paramsJson: t(
        (config.paramsJson as string) ||
          (config.params as string) ||
          "",
        context,
      ),
      temperature: t(config.temperature as string, context),
      maxTokens: t(
        (config.maxTokens as string) ||
          (config.max_tokens as string) ||
          "",
        context,
      ),
      topP: t(
        (config.topP as string) || (config.top_p as string) || "",
        context,
      ),
      topK: t(
        (config.topK as string) || (config.top_k as string) || "",
        context,
      ),
      returnCitations: asBool(
        config.returnCitations ?? config.return_citations,
        false,
      ),
      returnImages: asBool(
        config.returnImages ?? config.return_images,
        false,
      ),
      stream: asBool(config.stream, false),
      presencePenalty: t(
        (config.presencePenalty as string) ||
          (config.presence_penalty as string) ||
          "",
        context,
      ),
      frequencyPenalty: t(
        (config.frequencyPenalty as string) ||
          (config.frequency_penalty as string) ||
          "",
        context,
      ),
    }

    let apiResult: Record<string, unknown>
    try {
      apiResult = await runPerplexityOperation(px, fields)
    } catch (err) {
      if (err instanceof NonRetriableError) throw err
      mapCorsairError(err, "Perplexity")
    }

    return {
      ...context,
      [variableName]: {
        operation,
        ...apiResult,
        timestamp: new Date().toISOString(),
      },
    }
  },
}
