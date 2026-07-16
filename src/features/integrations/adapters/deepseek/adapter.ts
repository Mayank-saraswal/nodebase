/**
 * DeepSeek Corsair adapter.
 */

import { NonRetriableError } from "inngest"
import type { IntegrationAdapter } from "../../types"
import { t } from "../_shared/resolve-fields"
import { mapCorsairError } from "@/lib/corsair/errors"
import {
  runDeepseekOperation,
  type DeepseekApiClient,
  type ResolvedDeepseekFields,
} from "./operations"

export const deepseekAdapter: IntegrationAdapter = {
  pluginId: "deepseek",
  async run({ data, context, client, userId: _userId }) {
    void _userId
    // unknown: Node.data JSON boundary
    const config = (data ?? {}) as Record<string, unknown>
    const operation = String(config.operation ?? "CHAT")
    const variableName = String(config.variableName || "deepseek")

    if (!client || typeof client !== "object") {
      throw new NonRetriableError("DeepSeek Corsair: missing tenant client.")
    }
    const ds = client as DeepseekApiClient
    if (!ds.deepseek?.api) {
      throw new NonRetriableError(
        "DeepSeek Corsair: client.deepseek.api missing. Is @corsair-dev/deepseek registered?",
      )
    }

    const fields: ResolvedDeepseekFields = {
      operation,
      model: t(
        (config.model as string) || "deepseek-chat",
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
    }

    let apiResult: Record<string, unknown>
    try {
      apiResult = await runDeepseekOperation(ds, fields)
    } catch (err) {
      if (err instanceof NonRetriableError) throw err
      mapCorsairError(err, "DeepSeek")
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
