import { NonRetriableError, RetryAfterError } from "inngest"
import type { NodeExecutor, WorkflowContext } from "@/features/executions/types"
import { asString } from "@/features/executions/types"
import { resolveTemplate } from "@/features/executions/lib/template-resolver"
import { xChannel } from "@/inngest/channels/x"
import { decode } from "html-entities"
import { TwitterApi } from "twitter-api-v2"
import {
  mapCorsairError,
  resolveTenantId,
} from "@/lib/corsair"
import { tryRunIntegration } from "@/features/integrations/runner"
import { isTwitterCorsairOp } from "@/features/integrations/adapters/twitter/operations"
import { NodeType } from "@/generated/prisma"

type XData = {
  variableName?: string
  apiKey?: string
  apiSecretKey?: string
  accessToken?: string
  accessTokenSecret?: string
  content?: string
  operation?: string
}

export const xExecutor: NodeExecutor<XData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
  userId,
  tenantId: tenantIdParam,
}): Promise<WorkflowContext> => {
  await publish(
    xChannel().status({
      nodeId,
      status: "loading",
    }),
  )

  // unknown: Node.data JSON boundary
  const config = (data ?? {}) as Record<string, unknown>
  const operation = asString(config.operation, "POST_TWEET")

  // ── Corsair multi-tenant path ──
  // Prefer Corsair when OAuth1 keys are not on the node (legacy force-path).
  const hasLegacyKeys =
    Boolean(asString(config.apiKey) || data?.apiKey) &&
    Boolean(asString(config.apiSecretKey) || data?.apiSecretKey)

  if (isTwitterCorsairOp(operation) && userId && !hasLegacyKeys) {
    const tenantId =
      tenantIdParam && tenantIdParam.trim() !== ""
        ? tenantIdParam
        : resolveTenantId({ userId })
    try {
      const corsairResult = await step.run(
        `x-${nodeId}-corsair`,
        async () => {
          return tryRunIntegration({
            nodeType: NodeType.X,
            data: config,
            context,
            nodeId,
            userId,
            tenantId,
          })
        },
      )
      if (corsairResult) {
        await publish(xChannel().status({ nodeId, status: "success" }))
        return corsairResult.context
      }
    } catch (error) {
      await publish(xChannel().status({ nodeId, status: "error" }))
      if (
        error instanceof NonRetriableError ||
        error instanceof RetryAfterError
      ) {
        throw error
      }
      mapCorsairError(error, "X")
    }
  }

  // ── Legacy path: OAuth 1.0a via twitter-api-v2 ──
  const contentRaw =
    asString(config.content) ||
    asString(config.text) ||
    asString(data?.content)
  const variableName =
    asString(config.variableName) ||
    asString(data?.variableName) ||
    "x"
  const apiKey = asString(config.apiKey) || asString(data?.apiKey)
  const apiSecretKey =
    asString(config.apiSecretKey) || asString(data?.apiSecretKey)
  const accessToken =
    asString(config.accessToken) || asString(data?.accessToken)
  const accessTokenSecret =
    asString(config.accessTokenSecret) || asString(data?.accessTokenSecret)

  if (!contentRaw) {
    await publish(xChannel().status({ nodeId, status: "error" }))
    throw new NonRetriableError("x node: content is missing")
  }

  const rawContent = resolveTemplate(contentRaw, context)
  const content = decode(rawContent)

  try {
    const result = await step.run("x-post-tweet", async () => {
      if (!apiKey) {
        throw new NonRetriableError("x node: API Key is missing")
      }
      if (!apiSecretKey) {
        throw new NonRetriableError("x node: API Secret Key is missing")
      }
      if (!accessToken) {
        throw new NonRetriableError("x node: Access Token is missing")
      }
      if (!accessTokenSecret) {
        throw new NonRetriableError("x node: Access Token Secret is missing")
      }

      const client = new TwitterApi({
        appKey: apiKey,
        appSecret: apiSecretKey,
        accessToken,
        accessSecret: accessTokenSecret,
      })

      const rwClient = client.readWrite
      return rwClient.v2.tweet(content.slice(0, 280))
    })

    await publish(xChannel().status({ nodeId, status: "success" }))

    return {
      ...context,
      [variableName]: {
        messageContent: content.slice(0, 280),
        tweet: result,
      },
    }
  } catch (error) {
    console.error("X Error:", error)
    await publish(xChannel().status({ nodeId, status: "error" }))
    if (error instanceof NonRetriableError) throw error
    throw new NonRetriableError(
      `X error: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
  }
}
