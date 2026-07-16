import { NonRetriableError } from "inngest"
import type { IntegrationAdapter } from "../../types"
import { t } from "../_shared/resolve-fields"
import { mapCorsairError } from "@/lib/corsair/errors"
import {
  runGoogleSheetsOperation,
  type ResolvedSheetsFields,
  type SheetsApiClient,
} from "./operations"

function num(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

export const googleSheetsAdapter: IntegrationAdapter = {
  pluginId: "googlesheets",
  async run({ data, context, client, userId: _userId }) {
    void _userId
    const config = (data ?? {}) as Record<string, unknown>
    const operation = String(config.operation ?? "READ_ROWS")
    const variableName = String(config.variableName || "googleSheets")

    if (!client || typeof client !== "object") {
      throw new NonRetriableError(
        "Google Sheets Corsair: missing tenant client.",
      )
    }
    const sheetsClient = client as SheetsApiClient
    if (!sheetsClient.googlesheets?.api) {
      throw new NonRetriableError(
        "Google Sheets Corsair: client.googlesheets.api missing. Is @corsair-dev/googlesheets registered?",
      )
    }

    const spreadsheetId = t(config.spreadsheetId as string, context)

    // Resolve rowData column values with templates
    // unknown: rowData is free-form JSON array from node config
    const rawRowDataUnknown = config.rowData
    const rawRowData: Array<{ column: string; value: string }> = Array.isArray(
      rawRowDataUnknown,
    )
      ? (rawRowDataUnknown as Array<{ column: string; value: string }>)
      : []
    const rowData = rawRowData.map((c) => ({
      column: c.column,
      value: t(c.value, context),
    }))

    const fields: ResolvedSheetsFields = {
      operation,
      spreadsheetId,
      sheetName: t((config.sheetName as string) || "Sheet1", context),
      range: t((config.range as string) || "A:Z", context),
      headerRow: Boolean(config.headerRow),
      includeEmptyRows: Boolean(config.includeEmptyRows),
      maxResults: num(config.maxResults, 100),
      valueInputOption: String(config.valueInputOption || "USER_ENTERED"),
      rowValues: t(config.rowValues as string, context),
      rowData,
      rowNumber: t(config.rowNumber as string, context),
      updateValues: t(config.updateValues as string, context),
      matchColumn: t(config.matchColumn as string, context),
      matchValue: t(config.matchValue as string, context),
      searchColumn: t(config.searchColumn as string, context),
      searchValue: t(config.searchValue as string, context),
      clearRange: t(config.clearRange as string, context),
      newSheetName: t(config.newSheetName as string, context),
      pageToken: t(config.pageToken as string, context),
    }

    let apiResult: Record<string, unknown>
    try {
      apiResult = await runGoogleSheetsOperation(sheetsClient, fields)
    } catch (err) {
      if (err instanceof NonRetriableError) throw err
      mapCorsairError(err, "Google Sheets")
    }

    return {
      ...context,
      [variableName]: {
        ...apiResult,
        timestamp: new Date().toISOString(),
      },
    }
  },
}
