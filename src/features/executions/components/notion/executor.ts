import { NonRetriableError, RetryAfterError } from "inngest"
import type { NodeExecutor, WorkflowContext } from "@/features/executions/types"
import { asString } from "@/features/executions/types"
import prisma from "@/lib/db"
import { decrypt } from "@/lib/encryption"
import { resolveTemplate } from "@/features/executions/lib/template-resolver"
import { notionChannel } from "@/inngest/channels/notion"
import { NotionOperation } from "@/features/executions/enums"
import {
  mapCorsairError,
  resolveTenantId,
} from "@/lib/corsair"
import { tryRunIntegration } from "@/features/integrations/runner"
import { NodeType } from "@/generated/prisma"

interface NotionCredential {
  apiKey: string
}

type NotionData = {
  nodeId?: string
}

const NOTION_API_BASE = "https://api.notion.com/v1"
const NOTION_VERSION = "2022-06-28"

async function notionRequest(
  method: string,
  path: string,
  apiKey: string,
  body?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const url = `${NOTION_API_BASE}${path}`
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  }

  const response = await fetch(url, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    const errorMsg =
      (error as Record<string, string>)?.message ?? `HTTP ${response.status}`
    throw new NonRetriableError(`Notion API error: ${errorMsg}`)
  }

  return (await response.json()) as Record<string, unknown>
}

export const notionExecutor: NodeExecutor<NotionData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
  userId,
  tenantId: tenantIdParam,
}): Promise<WorkflowContext> => {
  await publish(
    notionChannel().status({
      nodeId,
      status: "loading",
    }),
  )

  // unknown: Node.data JSON boundary
  const config = (data ?? {}) as Record<string, unknown>
  const credentialId = asString(config.credentialId)

  if (Object.keys(config).length === 0) {
    await publish(
      notionChannel().status({
        nodeId,
        status: "error",
      }),
    )
    throw new NonRetriableError(
      "Notion node not configured. Open settings to configure.",
    )
  }

  // ── Corsair multi-tenant path ──
  {
    const tenantId =
      tenantIdParam && tenantIdParam.trim() !== ""
        ? tenantIdParam
        : resolveTenantId({ userId })
    try {
      const corsairResult = await step.run(
        `notion-${nodeId}-corsair`,
        async () => {
          return tryRunIntegration({
            nodeType: NodeType.NOTION,
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
          notionChannel().status({ nodeId, status: "success" }),
        )
        return corsairResult.context
      }
    } catch (error) {
      await publish(notionChannel().status({ nodeId, status: "error" }))
      if (
        error instanceof NonRetriableError ||
        error instanceof RetryAfterError
      ) {
        throw error
      }
      mapCorsairError(error, "Notion")
    }
  }

  // ── Legacy Cryptr + Notion REST ──
  const credential = await step.run(
    `notion-${nodeId}-load-credential`,
    async () => {
      if (!credentialId) return null
      return prisma.credential.findUnique({
        where: {
          id: credentialId,
          userId,
        },
      })
    },
  )

  if (!credential) {
    await publish(
      notionChannel().status({
        nodeId,
        status: "error",
      })
    )
    throw new NonRetriableError(
      "Notion credential not found. Please add a NOTION credential first."
    )
  }

  const raw = decrypt(credential.value)
  let creds: NotionCredential

  try {
    const parsed = JSON.parse(raw)
    // JSON format: {"apiKey": "secret_..."}
    if (parsed.apiKey) {
      creds = parsed
    } else {
      throw new Error("no apiKey field")
    }
  } catch {
    // Plain string format — treat the raw value as the API key directly
    if (raw?.trim().startsWith("secret_") || raw?.trim()) {
      creds = { apiKey: raw.trim() }
    } else {
      await publish(notionChannel().status({ nodeId, status: "error" }))
      throw new NonRetriableError(
        "Notion: Invalid credential. " +
        "Edit your Notion credential and paste your " +
        "Internal Integration Token (starts with secret_)."
      )
    }
  }

  if (!creds.apiKey) {
    await publish(notionChannel().status({ nodeId, status: "error" }))
    throw new NonRetriableError(
      "Notion: Integration Token is empty. " +
      "Edit your Notion credential and paste your token."
    )
  }

  // Step 3: Execute the operation
  try {
    const result = await step.run(`notion-${nodeId}-execute`, async () => {
      const operation = asString(config.operation, "QUERY_DATABASE")
      const databaseId = resolveTemplate(asString(config.databaseId), context)
      const pageId = resolveTemplate(asString(config.pageId), context)
      const searchQuery = resolveTemplate(asString(config.searchQuery), context)
      const blockContent = resolveTemplate(asString(config.blockContent), context)
      const notionUserId = resolveTemplate(asString(config.notionUserId), context)
      const startCursor = resolveTemplate(asString(config.startCursor), context)
      const pageSize =
        typeof config.pageSize === "number" ? config.pageSize : 100

      let filterObj: Record<string, unknown> = {}
      try {
        const resolved = resolveTemplate(
          asString(config.filterJson, "{}"),
          context,
        )
        filterObj = JSON.parse(resolved) as Record<string, unknown>
      } catch {
        throw new NonRetriableError(
          `[Notion] Failed to parse filterJson for node ${nodeId}`,
        )
      }

      let sortsArr: unknown[] = []
      try {
        const resolved = resolveTemplate(
          asString(config.sortsJson, "[]"),
          context,
        )
        sortsArr = JSON.parse(resolved) as unknown[]
      } catch {
        throw new NonRetriableError(
          `[Notion] Failed to parse sortsJson for node ${nodeId}`,
        )
      }

      let propertiesObj: Record<string, unknown> = {}
      try {
        const resolved = resolveTemplate(
          asString(config.propertiesJson, "{}"),
          context,
        )
        propertiesObj = JSON.parse(resolved) as Record<string, unknown>
      } catch {
        throw new NonRetriableError(
          `[Notion] Failed to parse propertiesJson for node ${nodeId}`,
        )
      }

      let data: Record<string, unknown>

      switch (operation) {
        case NotionOperation.QUERY_DATABASE: {
          if (!databaseId)
            throw new NonRetriableError(
              "Notion QUERY_DATABASE: 'databaseId' is required"
            )
          const body: Record<string, unknown> = {
            page_size: pageSize,
          }
          if (Object.keys(filterObj).length > 0) body.filter = filterObj
          if (sortsArr.length > 0) body.sorts = sortsArr
          if (startCursor) body.start_cursor = startCursor
          data = await notionRequest(
            "POST",
            `/databases/${databaseId}/query`,
            creds.apiKey,
            body,
          )
          break
        }

        case NotionOperation.CREATE_DATABASE_PAGE: {
          if (!databaseId)
            throw new NonRetriableError(
              "Notion CREATE_DATABASE_PAGE: 'databaseId' is required"
            )
          const body: Record<string, unknown> = {
            parent: { database_id: databaseId },
            properties: propertiesObj,
          }
          if (blockContent) {
            try {
              body.children = JSON.parse(blockContent)
            } catch {
              // treat as single paragraph
              body.children = [
                {
                  object: "block",
                  type: "paragraph",
                  paragraph: {
                    rich_text: [{ type: "text", text: { content: blockContent } }],
                  },
                },
              ]
            }
          }
          data = await notionRequest("POST", "/pages", creds.apiKey, body)
          break
        }

        case NotionOperation.UPDATE_DATABASE_PAGE: {
          if (!pageId)
            throw new NonRetriableError(
              "Notion UPDATE_DATABASE_PAGE: 'pageId' is required"
            )
          const body: Record<string, unknown> = {
            properties: propertiesObj,
          }
          data = await notionRequest(
            "PATCH",
            `/pages/${pageId}`,
            creds.apiKey,
            body
          )
          break
        }

        case NotionOperation.GET_PAGE: {
          if (!pageId)
            throw new NonRetriableError(
              "Notion GET_PAGE: 'pageId' is required"
            )
          data = await notionRequest("GET", `/pages/${pageId}`, creds.apiKey)
          break
        }

        case NotionOperation.ARCHIVE_PAGE: {
          if (!pageId)
            throw new NonRetriableError(
              "Notion ARCHIVE_PAGE: 'pageId' is required"
            )
          data = await notionRequest("PATCH", `/pages/${pageId}`, creds.apiKey, {
            archived: true,
          })
          break
        }

        case NotionOperation.APPEND_BLOCK: {
          if (!pageId)
            throw new NonRetriableError(
              "Notion APPEND_BLOCK: 'pageId' (block parent) is required"
            )
          if (!blockContent)
            throw new NonRetriableError(
              "Notion APPEND_BLOCK: 'blockContent' is required"
            )
          let children: unknown[]
          try {
            children = JSON.parse(blockContent)
          } catch {
            // treat as single paragraph
            children = [
              {
                object: "block",
                type: "paragraph",
                paragraph: {
                  rich_text: [{ type: "text", text: { content: blockContent } }],
                },
              },
            ]
          }
          data = await notionRequest(
            "PATCH",
            `/blocks/${pageId}/children`,
            creds.apiKey,
            { children }
          )
          break
        }

        case NotionOperation.GET_BLOCK_CHILDREN: {
          if (!pageId)
            throw new NonRetriableError(
              "Notion GET_BLOCK_CHILDREN: 'pageId' (block ID) is required"
            )
          let path = `/blocks/${pageId}/children?page_size=${config.pageSize}`
          if (startCursor) path += `&start_cursor=${startCursor}`
          data = await notionRequest("GET", path, creds.apiKey)
          break
        }

        case NotionOperation.SEARCH: {
          const body: Record<string, unknown> = {
            page_size: config.pageSize,
          }
          if (searchQuery) body.query = searchQuery
          if (Object.keys(filterObj).length > 0) body.filter = filterObj
          // Notion Search API only supports a single sort object, not an array
          if (sortsArr.length > 0) body.sort = sortsArr[0]
          if (startCursor) body.start_cursor = startCursor
          data = await notionRequest("POST", "/search", creds.apiKey, body)
          break
        }

        case NotionOperation.GET_DATABASE: {
          if (!databaseId)
            throw new NonRetriableError(
              "Notion GET_DATABASE: 'databaseId' is required"
            )
          data = await notionRequest(
            "GET",
            `/databases/${databaseId}`,
            creds.apiKey
          )
          break
        }

        case NotionOperation.GET_USER: {
          if (!notionUserId)
            throw new NonRetriableError(
              "Notion GET_USER: 'userId' is required"
            )
          data = await notionRequest(
            "GET",
            `/users/${notionUserId}`,
            creds.apiKey
          )
          break
        }

        case NotionOperation.GET_USERS: {
          let path = `/users?page_size=${pageSize}`
          if (startCursor) path += `&start_cursor=${startCursor}`
          data = await notionRequest("GET", path, creds.apiKey)
          break
        }

        default:
          throw new NonRetriableError(
            `Unknown Notion operation: ${operation}`,
          )
      }

      return {
        ...context,
        notion: {
          operation,
          data,
          timestamp: new Date().toISOString(),
        },
      }
    })

    await publish(
      notionChannel().status({
        nodeId,
        status: "success",
      }),
    )

    return result
  } catch (error) {
    await publish(
      notionChannel().status({
        nodeId,
        status: "error",
      })
    )

    if (error instanceof NonRetriableError) {
      throw error
    }

    const message =
      error instanceof Error ? error.message : "Unknown Notion error"
    throw new NonRetriableError(`Notion error: ${message}`)
  }
}
