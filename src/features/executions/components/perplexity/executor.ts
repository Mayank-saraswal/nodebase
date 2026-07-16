/**
 * Perplexity dual-path executor:
 * 1) Corsair full surface when plugin enabled
 * 2) Shared aiExecutor legacy path
 *
 * Security: tenantId from stamp / resolveTenantId(userId) only — never node.data.
 */

import { NonRetriableError, RetryAfterError } from "inngest"
import type { NodeExecutor, WorkflowContext } from "@/features/executions/types"
import { asString } from "@/features/executions/types"
import { perplexityChannel } from "@/inngest/channels/perplexity"
import {
  mapCorsairError,
  resolveTenantId,
} from "@/lib/corsair"
import { tryRunIntegration } from "@/features/integrations/runner"
import { isPerplexityCorsairOp } from "@/features/integrations/adapters/perplexity/operations"
import { NodeType } from "@/generated/prisma"
import { aiExecutor } from "@/features/executions/components/ai/executor"

type PerplexityData = {
  variableName?: string
  credentialId?: string
  userPrompt?: string
  systemPrompt?: string
  operation?: string
  model?: string
}

export const perplexityExecutor: NodeExecutor<PerplexityData> = async (
  params,
) => {
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

  if (isPerplexityCorsairOp(operation) && userId) {
    await publish(
      perplexityChannel().status({ nodeId, status: "loading" }),
    )
    const tenantId =
      tenantIdParam && tenantIdParam.trim() !== ""
        ? tenantIdParam
        : resolveTenantId({ userId })
    try {
      const corsairResult = await step.run(
        `perplexity-${nodeId}-corsair`,
        async () => {
          return tryRunIntegration({
            nodeType: NodeType.PERPLEXITY,
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
          perplexityChannel().status({ nodeId, status: "success" }),
        )
        return corsairResult.context
      }
    } catch (error) {
      if (
        error instanceof NonRetriableError ||
        error instanceof RetryAfterError
      ) {
        await publish(
          perplexityChannel().status({ nodeId, status: "error" }),
        )
        throw error
      }
      await publish(
        perplexityChannel().status({ nodeId, status: "error" }),
      )
      mapCorsairError(error, "Perplexity")
    }
  }

  const legacyData = {
    ...config,
    provider: "PERPLEXITY",
    operation: asString(config.operation, "CHAT"),
    model: asString(config.model, "sonar"),
  }

  return (await aiExecutor({
    ...params,
    data: legacyData as never,
  })) as WorkflowContext
}
