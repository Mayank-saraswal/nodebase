import { NonRetriableError, RetryAfterError } from "inngest"
import type { NodeExecutor, WorkflowContext } from "@/features/executions/types"
import { asString } from "@/features/executions/types"
import { resolveTemplate } from "@/features/executions/lib/template-resolver"
import { telegramChannel } from "@/inngest/channels/telegram"
import { decode } from "html-entities"
import ky from "ky"
import {
  mapCorsairError,
  resolveTenantId,
} from "@/lib/corsair"
import { tryRunIntegration } from "@/features/integrations/runner"
import { isTelegramCorsairOp } from "@/features/integrations/adapters/telegram/operations"
import { NodeType } from "@/generated/prisma"

type TelegramData = {
  variableName?: string
  botToken?: string
  chatId?: string
  content?: string
  operation?: string
  nodeId?: string
}

export const telegramExecutor: NodeExecutor<TelegramData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
  userId,
  tenantId: tenantIdParam,
}): Promise<WorkflowContext> => {
  await publish(
    telegramChannel().status({
      nodeId,
      status: "loading",
    }),
  )

  // unknown: Node.data JSON boundary
  const config = (data ?? {}) as Record<string, unknown>
  const operation = asString(config.operation, "SEND_MESSAGE")

  // ── Corsair multi-tenant path (full Bot API surface) ──
  if (isTelegramCorsairOp(operation) && userId) {
    const tenantId =
      tenantIdParam && tenantIdParam.trim() !== ""
        ? tenantIdParam
        : resolveTenantId({ userId })
    try {
      const corsairResult = await step.run(
        `telegram-${nodeId}-corsair`,
        async () => {
          return tryRunIntegration({
            nodeType: NodeType.TELEGRAM,
            data: config,
            context,
            nodeId,
            userId,
            tenantId,
          })
        },
      )
      if (corsairResult) {
        await publish(
          telegramChannel().status({ nodeId, status: "success" }),
        )
        return corsairResult.context
      }
    } catch (error) {
      await publish(telegramChannel().status({ nodeId, status: "error" }))
      if (
        error instanceof NonRetriableError ||
        error instanceof RetryAfterError
      ) {
        throw error
      }
      mapCorsairError(error, "Telegram")
    }
  }

  // ── Legacy path: direct Bot API sendMessage ──
  const botToken = asString(config.botToken) || asString(data?.botToken)
  const chatId = asString(config.chatId) || asString(data?.chatId)
  const contentRaw =
    asString(config.content) ||
    asString(config.text) ||
    asString(data?.content)
  const variableName =
    asString(config.variableName) ||
    asString(data?.variableName) ||
    "telegram"

  if (!contentRaw) {
    await publish(telegramChannel().status({ nodeId, status: "error" }))
    throw new NonRetriableError("telegram node: content is missing")
  }

  const rawContent = resolveTemplate(contentRaw, context)
  const content = decode(rawContent)

  try {
    await step.run("telegram-send-message", async () => {
      if (!botToken) {
        throw new NonRetriableError("telegram node: bot token is missing")
      }
      if (!chatId) {
        throw new NonRetriableError("telegram node: chat id is missing")
      }

      await ky.post(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          json: {
            chat_id: chatId,
            text: content.slice(0, 4096),
          },
        },
      )
    })

    await publish(telegramChannel().status({ nodeId, status: "success" }))

    return {
      ...context,
      [variableName]: {
        messageContent: content.slice(0, 4096),
      },
    }
  } catch (error) {
    console.error("Telegram Error:", error)
    await publish(telegramChannel().status({ nodeId, status: "error" }))
    if (error instanceof NonRetriableError) throw error
    throw new NonRetriableError(
      `Telegram error: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}
