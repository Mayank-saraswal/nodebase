/**
 * Gemini Corsair adapter.
 */

import { NonRetriableError } from "inngest"
import type { IntegrationAdapter } from "../../types"
import { t } from "../_shared/resolve-fields"
import { mapCorsairError } from "@/lib/corsair/errors"
import {
  runGeminiOperation,
  type GeminiApiClient,
  type ResolvedGeminiFields,
} from "./operations"

export const geminiAdapter: IntegrationAdapter = {
  pluginId: "gemini",
  async run({ data, context, client, userId: _userId }) {
    void _userId
    // unknown: Node.data JSON boundary
    const config = (data ?? {}) as Record<string, unknown>
    const operation = String(config.operation ?? "CHAT")
    const variableName = String(config.variableName || "gemini")

    if (!client || typeof client !== "object") {
      throw new NonRetriableError("Gemini Corsair: missing tenant client.")
    }
    const g = client as GeminiApiClient
    if (!g.gemini?.api) {
      throw new NonRetriableError(
        "Gemini Corsair: client.gemini.api missing. Is @corsair-dev/gemini registered?",
      )
    }

    const fields: ResolvedGeminiFields = {
      operation,
      model: t(
        (config.model as string) || "gemini-2.0-flash",
        context,
      ),
      prompt: t(config.prompt as string, context),
      userPrompt: t(
        (config.userPrompt as string) || (config.message as string) || "",
        context,
      ),
      systemPrompt: t(
        (config.systemPrompt as string) || (config.system as string) || "",
        context,
      ),
      contentsJson: t(
        (config.contentsJson as string) ||
          (config.contents as string) ||
          "",
        context,
      ),
      paramsJson: t(
        (config.paramsJson as string) || (config.params as string) || "",
        context,
      ),
      temperature: t(config.temperature as string, context),
      maxOutputTokens: t(
        (config.maxOutputTokens as string) ||
          (config.maxTokens as string) ||
          "",
        context,
      ),
      operationName: t(
        (config.operationName as string) ||
          (config.operation_name as string) ||
          "",
        context,
      ),
      pollIntervalMs: t(config.pollIntervalMs as string, context),
      timeoutMs: t(config.timeoutMs as string, context),
      pageSize: t(config.pageSize as string, context),
      pageToken: t(config.pageToken as string, context),
      taskType: t(config.taskType as string, context),
      title: t(config.title as string, context),
    }

    let apiResult: Record<string, unknown>
    try {
      apiResult = await runGeminiOperation(g, fields)
    } catch (err) {
      if (err instanceof NonRetriableError) throw err
      mapCorsairError(err, "Gemini")
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
