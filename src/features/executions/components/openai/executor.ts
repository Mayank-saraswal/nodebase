/**
 * OpenAI dual-path executor:
 * 1) Corsair full surface when plugin enabled
 * 2) Shared aiExecutor legacy path (credential + AI SDK)
 */

import { NonRetriableError, RetryAfterError } from "inngest"
import type { NodeExecutor, WorkflowContext } from "@/features/executions/types"
import { asString } from "@/features/executions/types"
import { openAiChannel } from "@/inngest/channels/openai"
import {
  mapCorsairError,
  resolveTenantId,
} from "@/lib/corsair"
import { tryRunIntegration } from "@/features/integrations/runner"
import { isOpenAICorsairOp } from "@/features/integrations/adapters/openai/operations"
import { NodeType } from "@/generated/prisma"
import { aiExecutor } from "@/features/executions/components/ai/executor"

type OpenAiData = {
  variableName?: string
  credentialId?: string
  userPrompt?: string
  systemPrompt?: string
  operation?: string
  model?: string
  provider?: string
}

export const openAiExecutor: NodeExecutor<OpenAiData> = async (params) => {
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
  const operation = asString(
    config.operation ?? config.openaiOperation,
    "CHAT",
  )

  // ── Corsair path ──
  if (isOpenAICorsairOp(operation) && userId) {
    await publish(
      openAiChannel().status({
        nodeId,
        status: "loading",
      }),
    )
    const tenantId =
      tenantIdParam && tenantIdParam.trim() !== ""
        ? tenantIdParam
        : resolveTenantId({ userId })
    try {
      const corsairResult = await step.run(
        `openai-${nodeId}-corsair`,
        async () => {
          return tryRunIntegration({
            nodeType: NodeType.OPENAI,
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
          openAiChannel().status({ nodeId, status: "success" }),
        )
        return corsairResult.context
      }
      // null = plugin disabled → legacy
    } catch (error) {
      if (
        error instanceof NonRetriableError ||
        error instanceof RetryAfterError
      ) {
        await publish(openAiChannel().status({ nodeId, status: "error" }))
        throw error
      }
      // Unexpected Corsair transport errors → map (throws) unless we prefer legacy.
      // Prefer explicit failure for real API errors.
      await publish(openAiChannel().status({ nodeId, status: "error" }))
      mapCorsairError(error, "OpenAI")
    }
  }

  // ── Legacy shared AI executor ──
  const legacyData = {
    ...config,
    provider: "OPENAI",
    operation: asString(config.operation, "CHAT"),
    model: asString(config.model, "gpt-4o-mini"),
  }

  return (await aiExecutor({
    ...params,
    data: legacyData as never,
  })) as WorkflowContext
}
