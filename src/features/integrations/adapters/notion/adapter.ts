/**
 * Notion Corsair adapter — templates → runNotionOperation → context slice.
 */

import { NonRetriableError } from "inngest"
import type { IntegrationAdapter } from "../../types"
import { t, tNumber } from "../_shared/resolve-fields"
import { mapCorsairError } from "@/lib/corsair/errors"
import {
  runNotionOperation,
  type NotionApiClient,
  type ResolvedNotionFields,
} from "./operations"

function num(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

export const notionAdapter: IntegrationAdapter = {
  pluginId: "notion",
  async run({ data, context, client, userId: _userId }) {
    void _userId
    // unknown: Node.data JSON boundary
    const config = (data ?? {}) as Record<string, unknown>
    const operation = String(config.operation ?? "QUERY_DATABASE")
    const variableName = String(config.variableName || "notion")

    if (!client || typeof client !== "object") {
      throw new NonRetriableError(
        "Notion Corsair: missing tenant client. Ensure multi-tenant Corsair is configured.",
      )
    }

    const notionClient = client as NotionApiClient
    if (!notionClient.notion?.api) {
      throw new NonRetriableError(
        "Notion Corsair: client.notion.api missing. Is @corsair-dev/notion registered?",
      )
    }

    const fields: ResolvedNotionFields = {
      operation,
      databaseId: t(config.databaseId as string, context),
      pageId: t(config.pageId as string, context),
      blockId: t(config.blockId as string, context),
      blockContent: t(config.blockContent as string, context),
      searchQuery: t(config.searchQuery as string, context),
      filterJson: t((config.filterJson as string) || "{}", context),
      sortsJson: t((config.sortsJson as string) || "[]", context),
      propertiesJson: t((config.propertiesJson as string) || "{}", context),
      notionUserId: t(config.notionUserId as string, context),
      pageSize:
        tNumber(config.pageSize as string | number | undefined, context) ??
        num(config.pageSize, 100),
      startCursor: t(config.startCursor as string, context),
      parentPageId: t(config.parentPageId as string, context),
    }

    let apiResult: Record<string, unknown>
    try {
      apiResult = await runNotionOperation(notionClient, fields)
    } catch (err) {
      if (err instanceof NonRetriableError) throw err
      mapCorsairError(err, "Notion")
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
