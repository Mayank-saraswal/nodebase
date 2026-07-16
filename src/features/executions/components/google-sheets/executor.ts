import { NonRetriableError, RetryAfterError } from "inngest"
import type { NodeExecutor } from "@/features/executions/types"
import prisma from "@/lib/db"
import { resolveTemplate } from "@/features/executions/lib/template-resolver"
import { googleSheetsChannel } from "@/inngest/channels/google-sheets"
import { GoogleSheetsOp } from "@/features/executions/enums"
import { refreshGoogleSheetsAccessToken } from "@/lib/google-sheets-auth"
import {
  getCorsair,
  isCorsairPluginEnabled,
  mapCorsairError,
  resolveTenantId,
} from "@/lib/corsair"
import { googleSheetsAdapter } from "@/features/integrations/adapters/google-sheets/adapter"

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets"

// ─── sheetsRequest ───────────────────────────────────────────────────────────

async function sheetsRequest(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  token: string,
  body?: unknown
): Promise<Record<string, unknown>> {
  const url = path.startsWith("http") ? path : `${SHEETS_API}${path}`
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }
  const res = await fetch(url, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg =
      (err as Record<string, Record<string, string>>)?.error?.message ??
      `HTTP ${res.status}`
    throw new NonRetriableError(`Google Sheets API error: ${msg}`)
  }
  return (await res.json()) as Record<string, unknown>
}

// ─── rowsToObjects ───────────────────────────────────────────────────────────

function rowsToObjects(
  rows: string[][],
  headerRow: boolean,
  includeEmptyRows: boolean,
  maxResults: number
): unknown[] {
  if (!rows || rows.length === 0) return []

  if (headerRow) {
    const headers = rows[0]
    let dataRows = rows.slice(1)
    if (!includeEmptyRows) {
      dataRows = dataRows.filter((r) => r.some((c) => c !== ""))
    }
    return dataRows.slice(0, maxResults).map((row) => {
      const obj: Record<string, string> = {}
      headers.forEach((h, i) => {
        obj[h] = row[i] ?? ""
      })
      return obj
    })
  }

  let filtered = rows
  if (!includeEmptyRows) {
    filtered = filtered.filter((r) => r.some((c) => c !== ""))
  }
  return filtered.slice(0, maxResults)
}

// ─── GoogleSheetsData ────────────────────────────────────────────────────────

type GoogleSheetsData = {
  nodeId?: string
}

// ─── Main executor ───────────────────────────────────────────────────────────

export const googleSheetsExecutor: NodeExecutor<GoogleSheetsData> = async ({ data, nodeId,
  context,
  step,
  publish,
  userId,
}) => {
  await publish(
    googleSheetsChannel().status({ nodeId, status: "loading" })
  )

  // Step 1: Load config
  const config = data as Record<string, unknown>;

  // ── Corsair backbone path ──
  if (isCorsairPluginEnabled("googlesheets")) {
    if (!config || !config.spreadsheetId) {
      await publish(
        googleSheetsChannel().status({ nodeId, status: "error" }),
      )
      throw new NonRetriableError(
        "Google Sheets node not configured. Set spreadsheet ID in settings.",
      )
    }
    try {
      const result = await step.run(
        `google-sheets-${nodeId}-corsair`,
        async () => {
          const tenantId = resolveTenantId({ userId })
          const client = getCorsair().withTenant(tenantId)
          return googleSheetsAdapter.run({
            data: config,
            context,
            client,
            nodeId,
            userId,
          })
        },
      )
      await publish(
        googleSheetsChannel().status({ nodeId, status: "success" }),
      )
      return result as Record<string, unknown>
    } catch (error) {
      await publish(
        googleSheetsChannel().status({ nodeId, status: "error" }),
      )
      if (
        error instanceof NonRetriableError ||
        error instanceof RetryAfterError
      ) {
        throw error
      }
      mapCorsairError(error, "Google Sheets")
    }
  }

if (!config || !config.credentialId || !config.spreadsheetId) {
    await publish(
      googleSheetsChannel().status({ nodeId, status: "error" })
    )
    throw new NonRetriableError(
      "Google Sheets node not configured. Open settings to configure."
    )
  }

  // ── Legacy path ──
  // Step 2: Get fresh access token (loads credential from DB, decrypts, refreshes)
  const accessToken = await step.run(
    `google-sheets-${nodeId}-token`,
    async () => {
      try {
        return await refreshGoogleSheetsAccessToken(config.credentialId!, userId)
      } catch (err) {
        await publish(googleSheetsChannel().status({ nodeId, status: "error" }))
        throw new NonRetriableError(
          err instanceof Error ? err.message : "Google Sheets: Failed to get access token"
        )
      }
    }
  )

  const spreadsheetId = config.spreadsheetId
  const sheetName = resolveTemplate(config.sheetName || "Sheet1", context)
  const range = `${sheetName}!${config.range || "A:Z"}`
  const varName = config.variableName || "googleSheets"

  // Step 4: Execute operation
  try {
    const result = await step.run(
      `google-sheets-${nodeId}-execute`,
      async () => {
        switch (config.operation) {
          // ── READ_ROWS ────────────────────────────────────────────
          case GoogleSheetsOp.READ_ROWS: {
            const data = await sheetsRequest(
              "GET",
              `/${spreadsheetId}/values/${encodeURIComponent(range)}`,
              accessToken
            )
            const rows = (data.values as string[][] | undefined) ?? []
            const items = rowsToObjects(
              rows,
              config.headerRow,
              config.includeEmptyRows,
              config.maxResults
            )
            return {
              operation: "READ_ROWS",
              rows: items,
              totalRows: rows.length,
              range,
            }
          }

          // ── APPEND_ROW ───────────────────────────────────────────
          case GoogleSheetsOp.APPEND_ROW: {
            let values: string[][]
            if (config.rowValues && config.rowValues.trim()) {
              const resolved = resolveTemplate(config.rowValues as string, context)
              let parsed: unknown
              try {
                parsed = JSON.parse(resolved)
              } catch {
                throw new NonRetriableError(
                  "Google Sheets APPEND_ROW: 'rowValues' is not valid JSON. " +
                    'Expected object like {"Name":"John","Email":"john@example.com"} ' +
                    'or array like ["John","john@example.com"]'
                )
              }

              if (Array.isArray(parsed)) {
                // User passed a flat array — use as-is or as nested array
                values = Array.isArray(parsed[0])
                  ? (parsed as string[][])
                  : [(parsed as unknown[]).map(String)]
              } else if (typeof parsed === "object" && parsed !== null) {
                // User passed an object like {Name:"John", Email:"..."} — map to ordered array
                // Read the header row first to get column order
                const headerRes = await sheetsRequest(
                  "GET",
                  `/${spreadsheetId}/values/${encodeURIComponent(`${sheetName}!1:1`)}`,
                  accessToken
                )
                const headers =
                  (
                    (headerRes.values as string[][] | undefined)?.[0]
                  ) ?? []
                if (headers.length === 0) {
                  throw new NonRetriableError(
                    "Google Sheets APPEND_ROW: Sheet has no header row to map columns. " +
                      "Enable 'Has Header Row' or pass values as a plain array."
                  )
                }
                const obj = parsed as Record<string, unknown>
                const row = headers.map((h) => String(obj[h] ?? ""))
                values = [row]
              } else {
                throw new NonRetriableError(
                  "Google Sheets APPEND_ROW: 'rowValues' must be a JSON object or array."
                )
              }
            } else {
              const rowData = config.rowData as Array<{
                column: string
                value: string
              }>
              values = [
                rowData.map((col) => resolveTemplate(col.value, context)),
              ]
            }
            const data = await sheetsRequest(
              "POST",
              `/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=${config.valueInputOption}&insertDataOption=INSERT_ROWS`,
              accessToken,
              { values }
            )
            return {
              operation: "APPEND_ROW",
              success: true,
              updatedRange:
                (data.updates as Record<string, unknown>)?.updatedRange ??
                range,
              updatedRows:
                (data.updates as Record<string, unknown>)?.updatedRows ?? 1,
            }
          }

          // ── UPDATE_ROW ───────────────────────────────────────────
          case GoogleSheetsOp.UPDATE_ROW: {
            const rowNum = resolveTemplate(config.rowNumber as string, context)
            if (!rowNum)
              throw new NonRetriableError(
                "Google Sheets UPDATE_ROW: 'rowNumber' is required."
              )
            const resolved = resolveTemplate(config.updateValues as string, context)
            let parsed: unknown
            try {
              parsed = JSON.parse(resolved)
            } catch {
              throw new NonRetriableError(
                "Google Sheets UPDATE_ROW: 'updateValues' is not valid JSON. " +
                  'Expected object like {"Status":"Sent"} ' +
                  'or array like ["val1","val2"]'
              )
            }

            let rowValues: string[]
            if (Array.isArray(parsed)) {
              rowValues = (parsed as unknown[]).map(String)
            } else if (typeof parsed === "object" && parsed !== null) {
              // Read headers and existing row to merge changes
              const headerRes = await sheetsRequest(
                "GET",
                `/${spreadsheetId}/values/${encodeURIComponent(`${sheetName}!1:1`)}`,
                accessToken
              )
              const headers =
                (
                  (headerRes.values as string[][] | undefined)?.[0]
                ) ?? []
              if (headers.length === 0) {
                throw new NonRetriableError(
                  "Google Sheets UPDATE_ROW: Sheet has no header row to map columns."
                )
              }
              // Read current row data to preserve unmodified columns
              const existingRes = await sheetsRequest(
                "GET",
                `/${spreadsheetId}/values/${encodeURIComponent(`${sheetName}!${rowNum}:${rowNum}`)}`,
                accessToken
              )
              const existingRow =
                (
                  (existingRes.values as string[][] | undefined)?.[0]
                ) ?? []
              const obj = parsed as Record<string, unknown>
              rowValues = headers.map((h, i) =>
                h in obj ? String(obj[h]) : (existingRow[i] ?? "")
              )
            } else {
              throw new NonRetriableError(
                "Google Sheets UPDATE_ROW: 'updateValues' must be a JSON object or array."
              )
            }

            const updateRange = `${sheetName}!A${rowNum}`
            const data = await sheetsRequest(
              "PUT",
              `/${spreadsheetId}/values/${encodeURIComponent(updateRange)}?valueInputOption=${config.valueInputOption}`,
              accessToken,
              { values: [rowValues] }
            )
            return {
              operation: "UPDATE_ROW",
              success: true,
              updatedRange: data.updatedRange ?? updateRange,
              updatedRows: data.updatedRows ?? 1,
            }
          }

          // ── UPDATE_ROWS_BY_QUERY ─────────────────────────────────
          case GoogleSheetsOp.UPDATE_ROWS_BY_QUERY: {
            const matchCol = resolveTemplate(config.matchColumn as string, context)
            const matchVal = resolveTemplate(config.matchValue as string, context)
            if (!matchCol || !matchVal)
              throw new NonRetriableError(
                "Google Sheets UPDATE_ROWS_BY_QUERY: 'matchColumn' and 'matchValue' are required."
              )
            const readData = await sheetsRequest(
              "GET",
              `/${spreadsheetId}/values/${encodeURIComponent(range)}`,
              accessToken
            )
            const allRows =
              (readData.values as string[][] | undefined) ?? []
            if (allRows.length === 0)
              return {
                operation: "UPDATE_ROWS_BY_QUERY",
                success: true,
                updatedRows: 0,
              }

            const headers = allRows[0]
            const colIndex = headers.indexOf(matchCol)
            if (colIndex === -1)
              throw new NonRetriableError(
                `Google Sheets UPDATE_ROWS_BY_QUERY: Column '${matchCol}' not found in headers.`
              )

            const resolved = resolveTemplate(config.updateValues as string, context)
            let updateObj: Record<string, string>
            try {
              updateObj = JSON.parse(resolved) as Record<string, string>
            } catch {
              throw new NonRetriableError(
                "Google Sheets UPDATE_ROWS_BY_QUERY: 'updateValues' contains invalid JSON."
              )
            }
            // Collect all matching rows and build batch payload
            const batchData: Array<{
              range: string
              majorDimension: "ROWS"
              values: string[][]
            }> = []
            const updatedRowNumbers: number[] = []

            for (let i = 1; i < allRows.length; i++) {
              if (allRows[i][colIndex] === matchVal) {
                const newRow = [...allRows[i]]
                for (const [key, val] of Object.entries(updateObj)) {
                  const ki = headers.indexOf(key)
                  if (ki !== -1) newRow[ki] = val
                }
                batchData.push({
                  range: `${sheetName}!A${i + 1}`,
                  majorDimension: "ROWS",
                  values: [newRow],
                })
                updatedRowNumbers.push(i + 1)
              }
            }

            if (batchData.length === 0) {
              return {
                operation: "UPDATE_ROWS_BY_QUERY",
                success: true,
                updatedRows: 0,
                updatedRowNumbers: [],
                message: `No rows found where ${matchCol} = "${matchVal}"`,
              }
            }

            // Single batchUpdate API call instead of N sequential PUTs
            await sheetsRequest(
              "POST",
              `/${spreadsheetId}/values:batchUpdate`,
              accessToken,
              {
                valueInputOption: config.valueInputOption || "USER_ENTERED",
                data: batchData,
              }
            )

            return {
              operation: "UPDATE_ROWS_BY_QUERY",
              success: true,
              updatedRows: batchData.length,
              updatedRowNumbers,
              matchColumn: matchCol,
              matchValue: matchVal,
            }
          }

          // ── DELETE_ROW ───────────────────────────────────────────
          case GoogleSheetsOp.DELETE_ROW: {
            const rowNum = resolveTemplate(config.rowNumber as string, context)
            if (!rowNum)
              throw new NonRetriableError(
                "Google Sheets DELETE_ROW: 'rowNumber' is required."
              )
            const rowIndex = parseInt(rowNum, 10) - 1
            if (isNaN(rowIndex) || rowIndex < 0)
              throw new NonRetriableError(
                `Google Sheets DELETE_ROW: 'rowNumber' must be a positive integer. Received: '${rowNum}'`
              )
            const meta = await sheetsRequest(
              "GET",
              `/${spreadsheetId}?fields=sheets.properties`,
              accessToken
            )
            const sheets =
              (meta.sheets as Array<{
                properties: { title: string; sheetId: number }
              }>) ?? []
            const sheet = sheets.find(
              (s) => s.properties.title === sheetName
            )
            const sheetId = sheet?.properties.sheetId ?? 0
            await sheetsRequest(
              "POST",
              `/${spreadsheetId}:batchUpdate`,
              accessToken,
              {
                requests: [
                  {
                    deleteDimension: {
                      range: {
                        sheetId,
                        dimension: "ROWS",
                        startIndex: rowIndex,
                        endIndex: rowIndex + 1,
                      },
                    },
                  },
                ],
              }
            )
            return {
              operation: "DELETE_ROW",
              success: true,
              deletedRow: parseInt(rowNum, 10),
            }
          }

          // ── GET_ROW_BY_NUMBER ──────────────────────────────────
          case GoogleSheetsOp.GET_ROW_BY_NUMBER: {
            const rowNumber = resolveTemplate(config.rowNumber as string, context)
            if (!rowNumber.trim())
              throw new NonRetriableError(
                "Google Sheets GET_ROW_BY_NUMBER: rowNumber is required. " +
                  "Row 1 is usually the header. Data rows start at 2."
              )
            const rowNum = parseInt(rowNumber)
            if (isNaN(rowNum) || rowNum < 1)
              throw new NonRetriableError(
                `Google Sheets GET_ROW_BY_NUMBER: must be positive integer. ` +
                  `Received: "${rowNumber}"`
              )

            const [rowData, headerData] = await Promise.all([
              sheetsRequest(
                "GET",
                `/${spreadsheetId}/values/` +
                  `${encodeURIComponent(`${sheetName}!${rowNum}:${rowNum}`)}` +
                  `?valueRenderOption=UNFORMATTED_VALUE`,
                accessToken
              ),
              config.headerRow
                ? sheetsRequest(
                    "GET",
                    `/${spreadsheetId}/values/` +
                      `${encodeURIComponent(`${sheetName}!1:1`)}`,
                    accessToken
                  )
                : Promise.resolve({ values: [] }),
            ])

            const rowArr =
              ((rowData.values as string[][] | undefined) ?? [])[0] ?? []
            const headers = config.headerRow
              ? (((headerData.values as string[][] | undefined) ?? [])[0] ??
                  [])
              : rowArr.map((_, i) => String.fromCharCode(65 + i))

            const rowObj = Object.fromEntries(
              headers.map((h, i) => [h, rowArr[i] ?? ""])
            )
            return {
              operation: "GET_ROW_BY_NUMBER",
              row: rowObj,
              rowNumber: rowNum,
              rowArray: rowArr,
              headers,
              isEmpty: rowArr.length === 0,
              sheetName,
            }
          }

          // ── SEARCH_ROWS ─────────────────────────────────────────
          case GoogleSheetsOp.SEARCH_ROWS: {
            const searchColumn = resolveTemplate(
              config.searchColumn,
              context
            )
            const searchValue = resolveTemplate(
              config.searchValue,
              context
            )
            if (!searchColumn.trim())
              throw new NonRetriableError(
                "Google Sheets SEARCH_ROWS: searchColumn is required. " +
                  "Enter the column header name, e.g. 'Phone' or 'Email'"
              )
            if (!searchValue.trim())
              throw new NonRetriableError(
                "Google Sheets SEARCH_ROWS: searchValue is required."
              )

            const allData = await sheetsRequest(
              "GET",
              `/${spreadsheetId}/values/` +
                `${encodeURIComponent(`${sheetName}!A1:ZZ`)}` +
                `?valueRenderOption=UNFORMATTED_VALUE`,
              accessToken
            )
            const allValues =
              (allData.values as string[][] | undefined) ?? []
            if (allValues.length === 0) {
              return {
                operation: "SEARCH_ROWS",
                rows: [],
                count: 0,
                firstRow: null,
                firstRowNumber: null,
                query: searchValue,
                searchColumn,
                sheetName,
              }
            }

            const sHeaders = config.headerRow ? allValues[0] : []
            const dataStart = config.headerRow ? 1 : 0
            const searchColIdx = config.headerRow
              ? sHeaders.indexOf(searchColumn)
              : parseInt(searchColumn) - 1

            if (config.headerRow && searchColIdx === -1) {
              throw new NonRetriableError(
                `Google Sheets SEARCH_ROWS: Column "${searchColumn}" not found. ` +
                  `Available columns: ${sHeaders.join(", ")}`
              )
            }

            const matchedRows: Record<string, unknown>[] = []
            const matchedRowNumbers: number[] = []

            for (
              let i = dataStart;
              i < allValues.length &&
              matchedRows.length < config.maxResults;
              i++
            ) {
              const row = allValues[i]
              if (
                String(row[searchColIdx] ?? "") ===
                String(searchValue)
              ) {
                if (config.headerRow) {
                  const obj: Record<string, string> = {}
                  sHeaders.forEach((h, j) => {
                    obj[h] = row[j] ?? ""
                  })
                  matchedRows.push(obj)
                } else {
                  matchedRows.push(
                    Object.fromEntries(row.map((v, j) => [j, v]))
                  )
                }
                matchedRowNumbers.push(i + 1)
              }
            }

            return {
              operation: "SEARCH_ROWS",
              rows: matchedRows,
              count: matchedRows.length,
              firstRow: matchedRows[0] ?? null,
              firstRowNumber: matchedRowNumbers[0] ?? null,
              rowNumbers: matchedRowNumbers,
              query: searchValue,
              searchColumn,
              sheetName,
            }
          }

          // ── CLEAR_RANGE ─────────────────────────────────────────
          case GoogleSheetsOp.CLEAR_RANGE: {
            if (!config.clearRange?.trim()) {
              throw new NonRetriableError(
                "Google Sheets CLEAR_RANGE: range is required. " +
                "Example: 'Sheet1!A2:Z' or 'Sheet1!A:A'. " +
                "Open node settings and fill in the Range field."
              )
            }
            const resolvedClear = resolveTemplate(config.clearRange as string, context)
            // If user already included the sheet name (contains "!"), use as-is
            // If not, prefix with sheetName
            const fullRange = resolvedClear.includes("!")
              ? resolvedClear
              : `${sheetName}!${resolvedClear}`
            await sheetsRequest(
              "POST",
              `/${spreadsheetId}/values/${encodeURIComponent(fullRange)}:clear`,
              accessToken,
              {}
            )
            return {
              operation: "CLEAR_RANGE",
              success: true,
              clearedRange: fullRange,
              sheetName,
            }
          }

          // ── CREATE_SHEET ────────────────────────────────────────
          case GoogleSheetsOp.CREATE_SHEET: {
            const newSheetName = resolveTemplate(
              config.newSheetName,
              context
            )
            if (!newSheetName.trim())
              throw new NonRetriableError(
                "Google Sheets CREATE_SHEET: newSheetName is required."
              )
            const createResult = await sheetsRequest(
              "POST",
              `/${spreadsheetId}:batchUpdate`,
              accessToken,
              {
                requests: [
                  {
                    addSheet: {
                      properties: { title: newSheetName },
                    },
                  },
                ],
              }
            )
            const replies =
              (createResult.replies as Array<{
                addSheet?: {
                  properties?: { sheetId?: number; title?: string }
                }
              }>) ?? []
            const newSheet = replies[0]?.addSheet?.properties
            return {
              operation: "CREATE_SHEET",
              success: true,
              sheetId: newSheet?.sheetId ?? null,
              sheetTitle: newSheet?.title ?? newSheetName,
              spreadsheetId,
            }
          }

          // ── GET_SHEET_INFO ──────────────────────────────────────
          case GoogleSheetsOp.GET_SHEET_INFO: {
            const infoData = await sheetsRequest(
              "GET",
              `/${spreadsheetId}?fields=` +
                `properties.title,properties.locale,` +
                `sheets.properties`,
              accessToken
            )
            const props = infoData.properties as Record<
              string,
              unknown
            >
            const infoSheets = (
              infoData.sheets as Array<{
                properties: {
                  sheetId: number
                  title: string
                  index: number
                  gridProperties?: { rowCount?: number; columnCount?: number }
                }
              }>
            )?.map((s) => ({
              sheetId: s.properties.sheetId,
              title: s.properties.title,
              index: s.properties.index,
              rowCount: s.properties.gridProperties?.rowCount ?? null,
              columnCount: s.properties.gridProperties?.columnCount ?? null,
            })) ?? []
            return {
              operation: "GET_SHEET_INFO",
              title: props?.title ?? "",
              locale: props?.locale ?? "",
              sheets: infoSheets,
              sheetCount: infoSheets.length,
              spreadsheetId,
            }
          }

          default:
            throw new NonRetriableError(
              `Unknown Google Sheets operation: ${config.operation}`
            )
        }
      }
    )

    await publish(
      googleSheetsChannel().status({ nodeId, status: "success" })
    )

    return {
      ...context,
      [varName]: result,
    }
  } catch (error) {
    await publish(
      googleSheetsChannel().status({ nodeId, status: "error" })
    )

    if (error instanceof NonRetriableError) throw error

    const message =
      error instanceof Error ? error.message : "Unknown Google Sheets error"
    throw new NonRetriableError(`Google Sheets error: ${message}`)
  }
}
