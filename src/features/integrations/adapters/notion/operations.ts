/**
 * Notion Corsair operations — full @corsair-dev/notion public surface.
 */

import { NonRetriableError } from "inngest"
import { notionIntegrationDefinition } from "@/features/integrations/registry/integrations/notion"
import { resolveOperation } from "@/features/integrations/registry/resolve"

export type NotionApiClient = {
  notion: {
    api: {
      databases: {
        getDatabase: (args: Record<string, unknown>) => Promise<unknown>
        getManyDatabases: (args?: Record<string, unknown>) => Promise<unknown>
        searchDatabase: (args: Record<string, unknown>) => Promise<unknown>
      }
      databasePages: {
        createDatabasePage: (args: Record<string, unknown>) => Promise<unknown>
        getDatabasePage: (args: Record<string, unknown>) => Promise<unknown>
        getManyDatabasePages: (args: Record<string, unknown>) => Promise<unknown>
        updateDatabasePage: (args: Record<string, unknown>) => Promise<unknown>
      }
      pages: {
        archivePage: (args: Record<string, unknown>) => Promise<unknown>
        createPage: (args: Record<string, unknown>) => Promise<unknown>
        searchPage: (args?: Record<string, unknown>) => Promise<unknown>
      }
      blocks: {
        appendBlock: (args: Record<string, unknown>) => Promise<unknown>
        getManyChildBlocks: (args: Record<string, unknown>) => Promise<unknown>
      }
      users: {
        getUser: (args: Record<string, unknown>) => Promise<unknown>
        getManyUsers: (args?: Record<string, unknown>) => Promise<unknown>
      }
    }
  }
}

export type ResolvedNotionFields = {
  operation: string
  databaseId: string
  pageId: string
  blockId: string
  blockContent: string
  searchQuery: string
  filterJson: string
  sortsJson: string
  propertiesJson: string
  notionUserId: string
  pageSize: number
  startCursor: string
  parentPageId: string
}

function asRecord(v: unknown): Record<string, unknown> {
  // unknown: Notion API JSON
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {}
}

function parseJsonObject(raw: string, label: string): Record<string, unknown> {
  if (!raw.trim() || raw.trim() === "{}") return {}
  try {
    // unknown: free-form JSON from node config
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new NonRetriableError(
        `Notion ${label}: expected a JSON object.`,
      )
    }
    return parsed as Record<string, unknown>
  } catch (e) {
    if (e instanceof NonRetriableError) throw e
    throw new NonRetriableError(
      `Notion ${label}: invalid JSON — ${e instanceof Error ? e.message : String(e)}`,
    )
  }
}

function parseJsonArray(raw: string, label: string): unknown[] {
  if (!raw.trim() || raw.trim() === "[]") return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      throw new NonRetriableError(`Notion ${label}: expected a JSON array.`)
    }
    return parsed
  } catch (e) {
    if (e instanceof NonRetriableError) throw e
    throw new NonRetriableError(
      `Notion ${label}: invalid JSON — ${e instanceof Error ? e.message : String(e)}`,
    )
  }
}

function wrap(operation: string, data: unknown): Record<string, unknown> {
  const rec = asRecord(data)
  return {
    operation,
    data: rec,
    ...rec,
  }
}

function normalizeOp(raw: string): string {
  const { operation, requestedKey } = resolveOperation(
    notionIntegrationDefinition,
    raw,
  )
  if (operation.aliases?.includes(requestedKey)) return requestedKey
  return operation.aliases?.[0] ?? operation.key
}

export function isNotionCorsairOp(operation: string): boolean {
  try {
    resolveOperation(notionIntegrationDefinition, operation)
    return true
  } catch {
    return false
  }
}

/** Build simple paragraph children from plain text if blockContent is not JSON */
function childrenFromBlockContent(blockContent: string): unknown[] {
  const trimmed = blockContent.trim()
  if (!trimmed) return []
  if (trimmed.startsWith("[")) {
    return parseJsonArray(trimmed, "blockContent")
  }
  return [
    {
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [
          {
            type: "text",
            text: { content: blockContent },
          },
        ],
      },
    },
  ]
}

export async function runNotionOperation(
  client: NotionApiClient,
  fields: ResolvedNotionFields,
): Promise<Record<string, unknown>> {
  const api = client.notion.api
  const op = normalizeOp(fields.operation)
  const page_size = fields.pageSize || 100
  const start_cursor = fields.startCursor.trim() || undefined

  switch (op) {
    case "GET_DATABASE":
    case "databases.getDatabase": {
      if (!fields.databaseId.trim()) {
        throw new NonRetriableError(
          "Notion GET_DATABASE: databaseId is required.",
        )
      }
      const data = await api.databases.getDatabase({
        database_id: fields.databaseId,
      })
      return wrap("GET_DATABASE", data)
    }
    case "LIST_DATABASES":
    case "databases.getManyDatabases": {
      const data = await api.databases.getManyDatabases({
        page_size,
        start_cursor,
      })
      return wrap("LIST_DATABASES", data)
    }
    case "SEARCH_DATABASE":
    case "databases.searchDatabase": {
      if (!fields.searchQuery.trim()) {
        throw new NonRetriableError(
          "Notion SEARCH_DATABASE: searchQuery is required.",
        )
      }
      const data = await api.databases.searchDatabase({
        query: fields.searchQuery,
        page_size,
        start_cursor,
      })
      return wrap("SEARCH_DATABASE", data)
    }

    case "CREATE_DATABASE_PAGE":
    case "databasePages.createDatabasePage": {
      if (!fields.databaseId.trim()) {
        throw new NonRetriableError(
          "Notion CREATE_DATABASE_PAGE: databaseId is required.",
        )
      }
      const properties = parseJsonObject(fields.propertiesJson, "propertiesJson")
      const children = childrenFromBlockContent(fields.blockContent)
      const data = await api.databasePages.createDatabasePage({
        parent: { database_id: fields.databaseId },
        properties,
        ...(children.length ? { children } : {}),
      })
      return wrap("CREATE_DATABASE_PAGE", data)
    }
    case "GET_PAGE":
    case "GET_DATABASE_PAGE":
    case "databasePages.getDatabasePage": {
      if (!fields.pageId.trim()) {
        throw new NonRetriableError("Notion GET_PAGE: pageId is required.")
      }
      const data = await api.databasePages.getDatabasePage({
        page_id: fields.pageId,
      })
      return wrap("GET_PAGE", data)
    }
    case "QUERY_DATABASE":
    case "LIST_DATABASE_PAGES":
    case "databasePages.getManyDatabasePages": {
      if (!fields.databaseId.trim()) {
        throw new NonRetriableError(
          "Notion QUERY_DATABASE: databaseId is required.",
        )
      }
      const filter = parseJsonObject(fields.filterJson, "filterJson")
      const sorts = parseJsonArray(fields.sortsJson, "sortsJson")
      const data = await api.databasePages.getManyDatabasePages({
        database_id: fields.databaseId,
        ...(Object.keys(filter).length ? { filter } : {}),
        ...(sorts.length ? { sorts } : {}),
        page_size,
        start_cursor,
      })
      return wrap("QUERY_DATABASE", data)
    }
    case "UPDATE_DATABASE_PAGE":
    case "databasePages.updateDatabasePage": {
      if (!fields.pageId.trim()) {
        throw new NonRetriableError(
          "Notion UPDATE_DATABASE_PAGE: pageId is required.",
        )
      }
      const properties = parseJsonObject(fields.propertiesJson, "propertiesJson")
      const data = await api.databasePages.updateDatabasePage({
        page_id: fields.pageId,
        properties,
      })
      return wrap("UPDATE_DATABASE_PAGE", data)
    }

    case "ARCHIVE_PAGE":
    case "pages.archivePage": {
      if (!fields.pageId.trim()) {
        throw new NonRetriableError("Notion ARCHIVE_PAGE: pageId is required.")
      }
      const data = await api.pages.archivePage({
        page_id: fields.pageId,
      })
      return wrap("ARCHIVE_PAGE", data)
    }
    case "CREATE_PAGE":
    case "pages.createPage": {
      const parentId =
        fields.parentPageId.trim() ||
        fields.pageId.trim() ||
        fields.databaseId.trim()
      if (!parentId) {
        throw new NonRetriableError(
          "Notion CREATE_PAGE: parent pageId or databaseId is required.",
        )
      }
      const properties = parseJsonObject(fields.propertiesJson, "propertiesJson")
      const children = childrenFromBlockContent(fields.blockContent)
      const parent = fields.databaseId.trim()
        ? { database_id: fields.databaseId }
        : { page_id: parentId }
      const data = await api.pages.createPage({
        parent,
        properties:
          Object.keys(properties).length > 0
            ? properties
            : {
                title: {
                  title: [
                    {
                      type: "text",
                      text: { content: fields.searchQuery || "Untitled" },
                    },
                  ],
                },
              },
        ...(children.length ? { children } : {}),
      })
      return wrap("CREATE_PAGE", data)
    }
    case "SEARCH":
    case "SEARCH_PAGE":
    case "pages.searchPage": {
      const data = await api.pages.searchPage({
        query: fields.searchQuery || undefined,
        page_size,
        start_cursor,
        filter: Object.keys(parseJsonObject(fields.filterJson, "filterJson"))
          .length
          ? parseJsonObject(fields.filterJson, "filterJson")
          : undefined,
      })
      return wrap("SEARCH", data)
    }

    case "APPEND_BLOCK":
    case "blocks.appendBlock": {
      const block_id = fields.blockId.trim() || fields.pageId.trim()
      if (!block_id) {
        throw new NonRetriableError(
          "Notion APPEND_BLOCK: pageId (or blockId) is required.",
        )
      }
      const children = childrenFromBlockContent(fields.blockContent)
      if (!children.length) {
        throw new NonRetriableError(
          "Notion APPEND_BLOCK: blockContent is required (plain text or JSON array of blocks).",
        )
      }
      const data = await api.blocks.appendBlock({
        block_id,
        children,
      })
      return wrap("APPEND_BLOCK", data)
    }
    case "GET_BLOCK_CHILDREN":
    case "blocks.getManyChildBlocks": {
      const block_id = fields.blockId.trim() || fields.pageId.trim()
      if (!block_id) {
        throw new NonRetriableError(
          "Notion GET_BLOCK_CHILDREN: pageId (or blockId) is required.",
        )
      }
      const data = await api.blocks.getManyChildBlocks({
        block_id,
        page_size,
        start_cursor,
      })
      return wrap("GET_BLOCK_CHILDREN", data)
    }

    case "GET_USER":
    case "users.getUser": {
      if (!fields.notionUserId.trim()) {
        throw new NonRetriableError("Notion GET_USER: notionUserId is required.")
      }
      const data = await api.users.getUser({
        user_id: fields.notionUserId,
      })
      return wrap("GET_USER", data)
    }
    case "GET_USERS":
    case "LIST_USERS":
    case "users.getManyUsers": {
      const data = await api.users.getManyUsers({
        page_size,
        start_cursor,
      })
      return wrap("GET_USERS", data)
    }

    default:
      throw new NonRetriableError(
        `Unknown Notion operation: ${fields.operation} (normalized: ${op})`,
      )
  }
}
