/**
 * Gemini dual-path executor:
 * 1) Corsair full surface when plugin enabled
 * 2) Shared aiExecutor legacy path
 */

import { NonRetriableError, RetryAfterError } from "inngest"
import type { NodeExecutor, WorkflowContext } from "@/features/executions/types"
import { asString } from "@/features/executions/types"
import { geminiChannel } from "@/inngest/channels/gemini"
import {
  mapCorsairError,
  resolveTenantId,
} from "@/lib/corsair"
import { tryRunIntegration } from "@/features/integrations/runner"
import { isGeminiCorsairOp } from "@/features/integrations/adapters/gemini/operations"
import { NodeType } from "@/generated/prisma"
import { aiExecutor } from "@/features/executions/components/ai/executor"

type GeminiData = {
  variableName?: string
  credentialId?: string
  userPrompt?: string
  systemPrompt?: string
  operation?: string
  model?: string
}

export const geminiExecutor: NodeExecutor<GeminiData> = async (params) => {
  const {
    data,
    nodeId,
    context,
    step,
    publish,
    userId,
    tenantId: tenantIdParam,
  } = params

  // unknown: Node.data JSON boundary
  const config = (data ?? {}) as Record<string, unknown>
  const operation = asString(config.operation, "CHAT")

  if (isGeminiCorsairOp(operation) && userId) {
    await publish(
      geminiChannel().status({ nodeId, status: "loading" }),
    )
    const tenantId =
      tenantIdParam && tenantIdParam.trim() !== ""
        ? tenantIdParam
        : resolveTenantId({ userId })
    try {
      const corsairResult = await step.run(
        `gemini-${nodeId}-corsair`,
        async () => {
          return tryRunIntegration({
            nodeType: NodeType.GEMINI,
            data: {
              ...config,
              operation,
              userPrompt:
                config.userPrompt ?? config.prompt ?? config.message,
              systemPrompt: config.systemPrompt ?? config.system,
            },
            context,
            nodeId,
            userId,
            tenantId,
          })
        },
      )
      if (corsairResult) {
        await publish(
          geminiChannel().status({ nodeId, status: "success" }),
        )
        return corsairResult.context
      }
    } catch (error) {
      if (
        error instanceof NonRetriableError ||
        error instanceof RetryAfterError
      ) {
        await publish(geminiChannel().status({ nodeId, status: "error" }))
        throw error
      }
      await publish(geminiChannel().status({ nodeId, status: "error" }))
      mapCorsairError(error, "Gemini")
    }
  }

  const legacyData = {
    ...config,
    provider: "GEMINI",
    operation: asString(config.operation, "CHAT"),
    model: asString(config.model, "gemini-2.0-flash"),
  }

  return (await aiExecutor({
    ...params,
    data: legacyData as never,
  })) as WorkflowContext
}
