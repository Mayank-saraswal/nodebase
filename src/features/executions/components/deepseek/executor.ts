/**
 * DeepSeek dual-path executor:
 * 1) Corsair full surface when plugin enabled
 * 2) Shared aiExecutor legacy path
 */

import { NonRetriableError, RetryAfterError } from "inngest"
import type { NodeExecutor, WorkflowContext } from "@/features/executions/types"
import { asString } from "@/features/executions/types"
import { deepseekChannel } from "@/inngest/channels/deepseek"
import {
  mapCorsairError,
  resolveTenantId,
} from "@/lib/corsair"
import { tryRunIntegration } from "@/features/integrations/runner"
import { isDeepseekCorsairOp } from "@/features/integrations/adapters/deepseek/operations"
import { NodeType } from "@/generated/prisma"
import { aiExecutor } from "@/features/executions/components/ai/executor"

type DeepseekData = {
  variableName?: string
  credentialId?: string
  userPrompt?: string
  systemPrompt?: string
  operation?: string
  model?: string
}

export const deepseekExecutor: NodeExecutor<DeepseekData> = async (params) => {
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

  if (isDeepseekCorsairOp(operation) && userId) {
    await publish(
      deepseekChannel().status({ nodeId, status: "loading" }),
    )
    const tenantId =
      tenantIdParam && tenantIdParam.trim() !== ""
        ? tenantIdParam
        : resolveTenantId({ userId })
    try {
      const corsairResult = await step.run(
        `deepseek-${nodeId}-corsair`,
        async () => {
          return tryRunIntegration({
            nodeType: NodeType.DEEPSEEK,
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
          deepseekChannel().status({ nodeId, status: "success" }),
        )
        return corsairResult.context
      }
    } catch (error) {
      if (
        error instanceof NonRetriableError ||
        error instanceof RetryAfterError
      ) {
        await publish(deepseekChannel().status({ nodeId, status: "error" }))
        throw error
      }
      await publish(deepseekChannel().status({ nodeId, status: "error" }))
      mapCorsairError(error, "DeepSeek")
    }
  }

  const legacyData = {
    ...config,
    provider: "DEEPSEEK",
    operation: asString(config.operation, "CHAT"),
    model: asString(config.model, "deepseek-chat"),
  }

  return (await aiExecutor({
    ...params,
    data: legacyData as never,
  })) as WorkflowContext
}
