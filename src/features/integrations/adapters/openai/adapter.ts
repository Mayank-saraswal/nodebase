/**
 * OpenAI Corsair adapter — full package surface via generic path invoker.
 */

import { NonRetriableError } from "inngest"
import type { IntegrationAdapter } from "../../types"
import { t } from "../_shared/resolve-fields"
import { mapCorsairError } from "@/lib/corsair/errors"
import {
  runOpenAIOperation,
  type OpenAIApiClient,
  type ResolvedOpenAIFields,
} from "./operations"

export const openaiAdapter: IntegrationAdapter = {
  pluginId: "openai",
  async run({ data, context, client, userId: _userId }) {
    void _userId
    // unknown: Node.data JSON boundary
    const config = (data ?? {}) as Record<string, unknown>
    const operation = String(
      config.operation ?? config.openaiOperation ?? "CHAT",
    )
    const variableName = String(config.variableName || "openai")

    if (!client || typeof client !== "object") {
      throw new NonRetriableError("OpenAI Corsair: missing tenant client.")
    }
    const oa = client as OpenAIApiClient
    if (!oa.openai?.api) {
      throw new NonRetriableError(
        "OpenAI Corsair: client.openai.api missing. Is @corsair-dev/openai registered?",
      )
    }

    const fields: ResolvedOpenAIFields = {
      operation,
      model: t(
        (config.model as string) ||
          (config.modelId as string) ||
          "gpt-4o-mini",
        context,
      ),
      prompt: t(config.prompt as string, context),
      systemPrompt: t(
        (config.systemPrompt as string) ||
          (config.system as string) ||
          "",
        context,
      ),
      userPrompt: t(
        (config.userPrompt as string) ||
          (config.message as string) ||
          "",
        context,
      ),
      input: t(config.input as string, context),
      id: t(config.id as string, context),
      fileId: t(
        (config.fileId as string) || (config.file_id as string) || "",
        context,
      ),
      threadId: t(
        (config.threadId as string) || (config.thread_id as string) || "",
        context,
      ),
      assistantId: t(
        (config.assistantId as string) ||
          (config.assistant_id as string) ||
          "",
        context,
      ),
      runId: t(
        (config.runId as string) || (config.run_id as string) || "",
        context,
      ),
      vectorStoreId: t(
        (config.vectorStoreId as string) ||
          (config.vector_store_id as string) ||
          "",
        context,
      ),
      batchId: t(
        (config.batchId as string) || (config.batch_id as string) || "",
        context,
      ),
      uploadId: t(
        (config.uploadId as string) || (config.upload_id as string) || "",
        context,
      ),
      conversationId: t(
        (config.conversationId as string) ||
          (config.conversation_id as string) ||
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
        (config.paramsJson as string) || (config.params as string) || "",
        context,
      ),
      temperature: t(config.temperature as string, context),
      maxTokens: t(
        (config.maxTokens as string) ||
          (config.max_tokens as string) ||
          "",
        context,
      ),
      n: t(config.n as string, context),
      size: t(config.size as string, context),
      voice: t(config.voice as string, context),
      instructions: t(config.instructions as string, context),
    }

    let apiResult: Record<string, unknown>
    try {
      apiResult = await runOpenAIOperation(oa, fields)
    } catch (err) {
      if (err instanceof NonRetriableError) throw err
      mapCorsairError(err, "OpenAI")
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
