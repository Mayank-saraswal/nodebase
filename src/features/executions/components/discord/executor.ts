import { NonRetriableError, RetryAfterError } from "inngest"
import type { NodeExecutor, WorkflowContext } from "@/features/executions/types"
import { asString } from "@/features/executions/types"
import { resolveTemplate } from "@/features/executions/lib/template-resolver"
import { discordChannel } from "@/inngest/channels/discord"
import { decode } from "html-entities"
import ky from "ky"
import {
  mapCorsairError,
  resolveTenantId,
} from "@/lib/corsair"
import { tryRunIntegration } from "@/features/integrations/runner"
import { isDiscordCorsairOp } from "@/features/integrations/adapters/discord/operations"
import { NodeType } from "@/generated/prisma"

type DiscordData = {
  variableName?: string
  credentialId?: string
  webhookUrl?: string
  content?: string
  username?: string
  operation?: string
  channelId?: string
}

export const discordExecutor: NodeExecutor<DiscordData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
  userId,
  tenantId: tenantIdParam,
}): Promise<WorkflowContext> => {
  await publish(
    discordChannel().status({
      nodeId,
      status: "loading",
    }),
  )

  // unknown: Node.data JSON boundary
  const config = (data ?? {}) as Record<string, unknown>
  const operation = asString(config.operation, "SEND_MESSAGE")

  // ── Corsair multi-tenant path (Bot API surface) ──
  // Prefer Corsair when op is mapped and user/tenant is available.
  // Legacy webhook path remains for simple webhookUrl posts when Corsair is off.
  if (isDiscordCorsairOp(operation) && userId && !asString(config.webhookUrl)) {
    const tenantId =
      tenantIdParam && tenantIdParam.trim() !== ""
        ? tenantIdParam
        : resolveTenantId({ userId })
    try {
      const corsairResult = await step.run(
        `discord-${nodeId}-corsair`,
        async () => {
          return tryRunIntegration({
            nodeType: NodeType.DISCORD,
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
          discordChannel().status({ nodeId, status: "success" }),
        )
        return corsairResult.context
      }
    } catch (error) {
      await publish(discordChannel().status({ nodeId, status: "error" }))
      if (
        error instanceof NonRetriableError ||
        error instanceof RetryAfterError
      ) {
        throw error
      }
      mapCorsairError(error, "Discord")
    }
  }

  // ── Legacy path: inbound Discord webhook URL ──
  const webhookUrl =
    asString(config.webhookUrl) || asString(data?.webhookUrl)
  const contentRaw =
    asString(config.content) ||
    asString(config.text) ||
    asString(data?.content)
  const usernameRaw =
    asString(config.username) || asString(data?.username)
  const variableName =
    asString(config.variableName) ||
    asString(data?.variableName) ||
    "discord"

  if (!contentRaw) {
    await publish(discordChannel().status({ nodeId, status: "error" }))
    throw new NonRetriableError("discord node: content is missing")
  }

  const rawContent = resolveTemplate(contentRaw, context)
  const content = decode(rawContent)
  const username = usernameRaw
    ? decode(resolveTemplate(usernameRaw, context))
    : undefined

  try {
    await step.run("discord-webhook", async () => {
      if (!webhookUrl) {
        throw new NonRetriableError("discord node: webhook url is missing")
      }
      await ky.post(webhookUrl, {
        json: {
          content: content.slice(0, 2000),
          username,
        },
      })
    })

    await publish(discordChannel().status({ nodeId, status: "success" }))

    return {
      ...context,
      [variableName]: {
        messageContent: content.slice(0, 2000),
      },
    }
  } catch (error) {
    console.error("Discord Error:", error)
    await publish(discordChannel().status({ nodeId, status: "error" }))
    if (error instanceof NonRetriableError) throw error
    throw new NonRetriableError(
      `Discord error: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}
