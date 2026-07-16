/**
 * Google Sheets Corsair operations — Nodebase GoogleSheetsOp → @corsair-dev/googlesheets
 * client shape: tenant.googlesheets.api.spreadsheets|sheets
 */

import { NonRetriableError } from "inngest"
import { GoogleSheetsOp } from "@/features/executions/enums"
import {
  objectToRow,
  parseJsonField,
  parseValuesInput,
  rowsToObjects,
} from "./helpers"

export type SheetsApiClient = {
  googlesheets: {
    api: {
      spreadsheets: {
        create: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        delete: (args: Record<string, unknown>) => Promise<void>
        list: (args?: Record<string, unknown>) => Promise<Record<string, unknown>>
      }
      sheets: {
        appendRow: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        appendOrUpdateRow: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        getRows: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        updateRow: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        clearSheet: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        createSheet: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        deleteSheet: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        deleteRowsOrColumns: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        listSheetsInSpreadsheet: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
      }
    }
  }
}

export type ResolvedSheetsFields = {
  operation: string
  spreadsheetId: string
  sheetName: string
  range: string
  headerRow: boolean
  includeEmptyRows: boolean
  maxResults: number
  valueInputOption: string
  rowValues: string
  rowData: Array<{ column: string; value: string }>
  rowNumber: string
  updateValues: string
  matchColumn: string
  matchValue: string
  searchColumn: string
  searchValue: string
  clearRange: string
  newSheetName: string
  /** Pagination for list spreadsheets */
  pageToken: string
}

function asRecord(v: unknown): Record<string, unknown> {
  return (v && typeof v === "object" ? v : {}) as Record<string, unknown>
}

function valuesFromRange(res: Record<string, unknown>): string[][] {
  return ((res.values as string[][] | undefined) ?? []).map((r) =>
    r.map((c) => String(c ?? "")),
  )
}

async function getHeaders(
  api: SheetsApiClient["googlesheets"]["api"],
  spreadsheetId: string,
  sheetName: string,
): Promise<string[]> {
  const headerRes = await api.sheets.getRows({
    spreadsheetId,
    sheetName,
    range: "1:1",
  })
  return valuesFromRange(headerRes)[0] ?? []
}

async function resolveSheetId(
  api: SheetsApiClient["googlesheets"]["api"],
  spreadsheetId: string,
  sheetName: string,
): Promise<number> {
  const listed = await api.sheets.listSheetsInSpreadsheet({ spreadsheetId })
  // Plugin may return { sheets: [...] } or array
  const sheets =
    (listed.sheets as Array<Record<string, unknown>> | undefined) ??
    (Array.isArray(listed) ? (listed as Array<Record<string, unknown>>) : [])

  for (const s of sheets) {
    const props = asRecord(s.properties ?? s)
    const title = String(props.title ?? props.sheetTitle ?? s.title ?? "")
    const id = props.sheetId ?? s.sheetId
    if (title === sheetName && typeof id === "number") return id
  }
  // Fallback first sheet
  const first = sheets[0]
  if (first) {
    const props = asRecord(first.properties ?? first)
    const id = props.sheetId ?? first.sheetId
    if (typeof id === "number") return id
  }
  return 0
}

export async function runGoogleSheetsOperation(
  client: SheetsApiClient,
  fields: ResolvedSheetsFields,
): Promise<Record<string, unknown>> {
  const api = client.googlesheets.api
  const op = fields.operation

  // Ops that do not require an existing spreadsheetId
  const noSpreadsheetRequired =
    op === GoogleSheetsOp.CREATE_SPREADSHEET ||
    op === "CREATE_SPREADSHEET" ||
    op === "spreadsheets.create" ||
    op === GoogleSheetsOp.LIST_SPREADSHEETS ||
    op === "LIST_SPREADSHEETS" ||
    op === "spreadsheets.list"

  const spreadsheetId = fields.spreadsheetId.trim()
  if (!spreadsheetId && !noSpreadsheetRequired) {
    throw new NonRetriableError(
      "Google Sheets: spreadsheetId is required. Open settings and paste the spreadsheet ID.",
    )
  }

  const sheetName = fields.sheetName || "Sheet1"
  const rangeA1 = fields.range || "A:Z"
  const valueInputOption = fields.valueInputOption || "USER_ENTERED"

  switch (op) {
    case GoogleSheetsOp.READ_ROWS:
    case "READ_ROWS":
    case "sheets.getRows": {
      const data = await api.sheets.getRows({
        spreadsheetId,
        sheetName,
        range: rangeA1,
      })
      const rows = valuesFromRange(data)
      const items = rowsToObjects(
        rows,
        fields.headerRow,
        fields.includeEmptyRows,
        fields.maxResults || 100,
      )
      return {
        operation: "READ_ROWS",
        rows: items,
        totalRows: rows.length,
        range: `${sheetName}!${rangeA1}`,
      }
    }

    case GoogleSheetsOp.APPEND_ROW:
    case "APPEND_ROW": {
      let values: string[][]
      if (fields.rowValues?.trim()) {
        const parsed = parseJsonField(
          fields.rowValues,
          "APPEND_ROW",
          'Expected object like {"Name":"John"} or array like ["John","email"]',
        )
        let headers: string[] | null = null
        if (!Array.isArray(parsed)) {
          headers = await getHeaders(api, spreadsheetId, sheetName)
        }
        values = parseValuesInput(parsed, headers, "APPEND_ROW")
      } else if (fields.rowData?.length) {
        values = [fields.rowData.map((c) => String(c.value ?? ""))]
      } else {
        throw new NonRetriableError(
          "Google Sheets APPEND_ROW: provide rowValues JSON or rowData columns.",
        )
      }

      // Corsair appendRow takes flat values for one row or we send first row
      const flat = values[0] ?? []
      const data = await api.sheets.appendRow({
        spreadsheetId,
        sheetName,
        range: rangeA1,
        values: flat,
        valueInputOption,
        insertDataOption: "INSERT_ROWS",
      })
      const updates = asRecord(data.updates ?? data)
      return {
        operation: "APPEND_ROW",
        success: true,
        updatedRange: updates.updatedRange ?? `${sheetName}!${rangeA1}`,
        updatedRows: updates.updatedRows ?? 1,
      }
    }

    case GoogleSheetsOp.UPDATE_ROW:
    case "UPDATE_ROW": {
      const rowNumStr = fields.rowNumber.trim()
      if (!rowNumStr) {
        throw new NonRetriableError(
          "Google Sheets UPDATE_ROW: 'rowNumber' is required.",
        )
      }
      const rowNum = parseInt(rowNumStr, 10)
      if (isNaN(rowNum) || rowNum < 1) {
        throw new NonRetriableError(
          `Google Sheets UPDATE_ROW: rowNumber must be a positive integer. Received: '${rowNumStr}'`,
        )
      }

      const parsed = parseJsonField(
        fields.updateValues,
        "UPDATE_ROW",
        'Expected object like {"Status":"Sent"} or array like ["val1","val2"]',
      )

      let rowValues: string[]
      if (Array.isArray(parsed)) {
        rowValues = (parsed as unknown[]).map(String)
      } else if (typeof parsed === "object" && parsed !== null) {
        const headers = await getHeaders(api, spreadsheetId, sheetName)
        if (headers.length === 0) {
          throw new NonRetriableError(
            "Google Sheets UPDATE_ROW: Sheet has no header row to map columns.",
          )
        }
        const existingRes = await api.sheets.getRows({
          spreadsheetId,
          sheetName,
          range: `${rowNum}:${rowNum}`,
        })
        const existingRow = valuesFromRange(existingRes)[0] ?? []
        rowValues = objectToRow(
          parsed as Record<string, unknown>,
          headers,
          existingRow,
        )
      } else {
        throw new NonRetriableError(
          "Google Sheets UPDATE_ROW: 'updateValues' must be a JSON object or array.",
        )
      }

      // Corsair updateRow uses 0-based rowIndex for data rows in some plugins —
      // package types say rowIndex optional with range. Prefer range A{row}.
      const data = await api.sheets.updateRow({
        spreadsheetId,
        sheetName,
        range: `A${rowNum}`,
        rowIndex: rowNum - 1,
        values: rowValues,
        valueInputOption,
      })
      return {
        operation: "UPDATE_ROW",
        success: true,
        updatedRange: data.updatedRange ?? `${sheetName}!A${rowNum}`,
        updatedRows: data.updatedRows ?? 1,
      }
    }

    case GoogleSheetsOp.UPDATE_ROWS_BY_QUERY:
    case "UPDATE_ROWS_BY_QUERY": {
      const matchCol = fields.matchColumn.trim()
      const matchVal = fields.matchValue.trim()
      if (!matchCol || !matchVal) {
        throw new NonRetriableError(
          "Google Sheets UPDATE_ROWS_BY_QUERY: 'matchColumn' and 'matchValue' are required.",
        )
      }

      const readData = await api.sheets.getRows({
        spreadsheetId,
        sheetName,
        range: rangeA1,
      })
      const allRows = valuesFromRange(readData)
      if (allRows.length === 0) {
        return {
          operation: "UPDATE_ROWS_BY_QUERY",
          success: true,
          updatedRows: 0,
        }
      }

      const headers = allRows[0]
      const colIndex = headers.indexOf(matchCol)
      if (colIndex === -1) {
        throw new NonRetriableError(
          `Google Sheets UPDATE_ROWS_BY_QUERY: Column '${matchCol}' not found in headers.`,
        )
      }

      const updateObj = parseJsonField(
        fields.updateValues,
        "UPDATE_ROWS_BY_QUERY",
        'Expected object like {"Status":"Done"}',
      ) as Record<string, string>
      if (typeof updateObj !== "object" || Array.isArray(updateObj)) {
        throw new NonRetriableError(
          "Google Sheets UPDATE_ROWS_BY_QUERY: updateValues must be a JSON object.",
        )
      }

      const updatedRowNumbers: number[] = []
      for (let i = 1; i < allRows.length; i++) {
        if (allRows[i][colIndex] === matchVal) {
          const newRow = [...allRows[i]]
          for (const [key, val] of Object.entries(updateObj)) {
            const ki = headers.indexOf(key)
            if (ki !== -1) newRow[ki] = String(val)
          }
          await api.sheets.updateRow({
            spreadsheetId,
            sheetName,
            range: `A${i + 1}`,
            rowIndex: i,
            values: newRow,
            valueInputOption,
          })
          updatedRowNumbers.push(i + 1)
        }
      }

      if (updatedRowNumbers.length === 0) {
        return {
          operation: "UPDATE_ROWS_BY_QUERY",
          success: true,
          updatedRows: 0,
          updatedRowNumbers: [],
          message: `No rows found where ${matchCol} = "${matchVal}"`,
        }
      }

      return {
        operation: "UPDATE_ROWS_BY_QUERY",
        success: true,
        updatedRows: updatedRowNumbers.length,
        updatedRowNumbers,
        matchColumn: matchCol,
        matchValue: matchVal,
      }
    }

    case GoogleSheetsOp.DELETE_ROW:
    case "DELETE_ROW": {
      const rowNumStr = fields.rowNumber.trim()
      if (!rowNumStr) {
        throw new NonRetriableError(
          "Google Sheets DELETE_ROW: 'rowNumber' is required.",
        )
      }
      const rowIndex = parseInt(rowNumStr, 10) - 1
      if (isNaN(rowIndex) || rowIndex < 0) {
        throw new NonRetriableError(
          `Google Sheets DELETE_ROW: 'rowNumber' must be a positive integer. Received: '${rowNumStr}'`,
        )
      }
      const sheetId = await resolveSheetId(api, spreadsheetId, sheetName)
      await api.sheets.deleteRowsOrColumns({
        spreadsheetId,
        sheetId,
        dimension: "ROWS",
        startIndex: rowIndex,
        endIndex: rowIndex + 1,
      })
      return {
        operation: "DELETE_ROW",
        success: true,
        deletedRow: parseInt(rowNumStr, 10),
      }
    }

    case GoogleSheetsOp.GET_ROW_BY_NUMBER:
    case "GET_ROW_BY_NUMBER": {
      const rowNumber = fields.rowNumber.trim()
      if (!rowNumber) {
        throw new NonRetriableError(
          "Google Sheets GET_ROW_BY_NUMBER: rowNumber is required.",
        )
      }
      const rowNum = parseInt(rowNumber, 10)
      if (isNaN(rowNum) || rowNum < 1) {
        throw new NonRetriableError(
          `Google Sheets GET_ROW_BY_NUMBER: must be positive integer. Received: "${rowNumber}"`,
        )
      }

      const [rowData, headerData] = await Promise.all([
        api.sheets.getRows({
          spreadsheetId,
          sheetName,
          range: `${rowNum}:${rowNum}`,
          valueRenderOption: "UNFORMATTED_VALUE",
        }),
        fields.headerRow
          ? api.sheets.getRows({
              spreadsheetId,
              sheetName,
              range: "1:1",
            })
          : Promise.resolve({ values: [] as string[][] }),
      ])

      const rowArr = valuesFromRange(rowData)[0] ?? []
      const headers = fields.headerRow
        ? (valuesFromRange(headerData)[0] ?? [])
        : rowArr.map((_, i) => String.fromCharCode(65 + i))

      const rowObj = Object.fromEntries(
        headers.map((h, i) => [h, rowArr[i] ?? ""]),
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

    case GoogleSheetsOp.SEARCH_ROWS:
    case "SEARCH_ROWS": {
      const searchColumn = fields.searchColumn.trim()
      const searchValue = fields.searchValue.trim()
      if (!searchColumn) {
        throw new NonRetriableError(
          "Google Sheets SEARCH_ROWS: searchColumn is required (header name or 1-based index).",
        )
      }
      if (!searchValue) {
        throw new NonRetriableError(
          "Google Sheets SEARCH_ROWS: searchValue is required.",
        )
      }

      const allData = await api.sheets.getRows({
        spreadsheetId,
        sheetName,
        range: "A1:ZZ",
        valueRenderOption: "UNFORMATTED_VALUE",
      })
      const allValues = valuesFromRange(allData)
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

      const sHeaders = fields.headerRow ? allValues[0] : []
      const dataStart = fields.headerRow ? 1 : 0
      const searchColIdx = fields.headerRow
        ? sHeaders.indexOf(searchColumn)
        : parseInt(searchColumn, 10) - 1

      if (fields.headerRow && searchColIdx === -1) {
        throw new NonRetriableError(
          `Google Sheets SEARCH_ROWS: Column "${searchColumn}" not found. ` +
            `Available: ${sHeaders.join(", ")}`,
        )
      }
      if (!fields.headerRow && (isNaN(searchColIdx) || searchColIdx < 0)) {
        throw new NonRetriableError(
          `Google Sheets SEARCH_ROWS: Invalid column index "${searchColumn}".`,
        )
      }

      const matchedRows: Record<string, unknown>[] = []
      const matchedRowNumbers: number[] = []
      const max = fields.maxResults || 100

      for (
        let i = dataStart;
        i < allValues.length && matchedRows.length < max;
        i++
      ) {
        const row = allValues[i]
        if (String(row[searchColIdx] ?? "") === String(searchValue)) {
          if (fields.headerRow) {
            const obj: Record<string, string> = {}
            sHeaders.forEach((h, j) => {
              obj[h] = row[j] ?? ""
            })
            matchedRows.push(obj)
          } else {
            matchedRows.push(Object.fromEntries(row.map((v, j) => [j, v])))
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

    case GoogleSheetsOp.CLEAR_RANGE:
    case "CLEAR_RANGE": {
      if (!fields.clearRange?.trim()) {
        throw new NonRetriableError(
          "Google Sheets CLEAR_RANGE: range is required. Example: 'A2:Z' or 'Sheet1!A:A'.",
        )
      }
      const resolvedClear = fields.clearRange.trim()
      const rangePart = resolvedClear.includes("!")
        ? resolvedClear.split("!")[1]
        : resolvedClear
      const clearSheetName = resolvedClear.includes("!")
        ? resolvedClear.split("!")[0]
        : sheetName

      await api.sheets.clearSheet({
        spreadsheetId,
        sheetName: clearSheetName,
        range: rangePart,
      })
      const fullRange = resolvedClear.includes("!")
        ? resolvedClear
        : `${sheetName}!${resolvedClear}`
      return {
        operation: "CLEAR_RANGE",
        success: true,
        clearedRange: fullRange,
        sheetName: clearSheetName,
      }
    }

    case GoogleSheetsOp.CREATE_SHEET:
    case "CREATE_SHEET": {
      const newSheetName = fields.newSheetName.trim()
      if (!newSheetName) {
        throw new NonRetriableError(
          "Google Sheets CREATE_SHEET: newSheetName is required.",
        )
      }
      const createResult = await api.sheets.createSheet({
        spreadsheetId,
        title: newSheetName,
      })
      // Parse batchUpdate response if present
      const replies =
        (createResult.replies as Array<Record<string, unknown>> | undefined) ??
        []
      const addSheet = asRecord(asRecord(replies[0]).addSheet)
      const props = asRecord(addSheet.properties)
      return {
        operation: "CREATE_SHEET",
        success: true,
        sheetId: props.sheetId ?? null,
        sheetTitle: (props.title as string) ?? newSheetName,
        spreadsheetId,
      }
    }

    case GoogleSheetsOp.GET_SHEET_INFO:
    case "GET_SHEET_INFO":
    case "sheets.listSheetsInSpreadsheet": {
      const listed = await api.sheets.listSheetsInSpreadsheet({
        spreadsheetId,
      })
      const sheetsRaw =
        (listed.sheets as Array<Record<string, unknown>> | undefined) ??
        (Array.isArray(listed)
          ? (listed as Array<Record<string, unknown>>)
          : [])

      const infoSheets = sheetsRaw.map((s) => {
        const props = asRecord(s.properties ?? s)
        const grid = asRecord(props.gridProperties)
        return {
          sheetId: props.sheetId ?? s.sheetId,
          title: props.title ?? s.title,
          index: props.index ?? s.index,
          rowCount: grid.rowCount ?? props.rowCount ?? null,
          columnCount: grid.columnCount ?? props.columnCount ?? null,
        }
      })

      return {
        operation: "GET_SHEET_INFO",
        title: (listed.title as string) ?? "",
        locale: (listed.locale as string) ?? "",
        sheets: infoSheets,
        sheetCount: infoSheets.length,
        spreadsheetId,
      }
    }

    case GoogleSheetsOp.APPEND_OR_UPDATE_ROW:
    case "APPEND_OR_UPDATE_ROW":
    case "sheets.appendOrUpdateRow": {
      if (!fields.matchColumn.trim() || fields.matchValue === undefined) {
        throw new NonRetriableError(
          "Google Sheets APPEND_OR_UPDATE_ROW: matchColumn and matchValue are required.",
        )
      }
      let values: (string | number | boolean | null)[]
      if (fields.rowValues?.trim()) {
        const parsed = parseJsonField(
          fields.rowValues,
          "APPEND_OR_UPDATE_ROW",
          'Expected object or array of cell values',
        )
        if (Array.isArray(parsed)) {
          values = parsed.map((v) =>
            v === null || v === undefined ? null : String(v),
          )
        } else {
          const headers = await getHeaders(api, spreadsheetId, sheetName)
          values = (parseValuesInput(parsed, headers, "APPEND_OR_UPDATE_ROW")[0] ??
            []) as string[]
        }
      } else if (fields.rowData?.length) {
        values = fields.rowData.map((c) => String(c.value ?? ""))
      } else {
        throw new NonRetriableError(
          "Google Sheets APPEND_OR_UPDATE_ROW: provide rowValues or rowData.",
        )
      }
      const result = await api.sheets.appendOrUpdateRow({
        spreadsheetId,
        sheetName,
        keyColumn: fields.matchColumn,
        keyValue: fields.matchValue,
        values,
        valueInputOption,
        insertDataOption: "INSERT_ROWS",
      })
      return {
        operation: "APPEND_OR_UPDATE_ROW",
        result,
        matchColumn: fields.matchColumn,
        matchValue: fields.matchValue,
        spreadsheetId,
      }
    }

    case GoogleSheetsOp.DELETE_SHEET:
    case "DELETE_SHEET":
    case "sheets.deleteSheet": {
      const sheetId = await resolveSheetId(api, spreadsheetId, sheetName)
      const result = await api.sheets.deleteSheet({
        spreadsheetId,
        sheetId,
      })
      return {
        operation: "DELETE_SHEET",
        success: true,
        sheetId,
        sheetName,
        spreadsheetId,
        result,
      }
    }

    case GoogleSheetsOp.CREATE_SPREADSHEET:
    case "CREATE_SPREADSHEET":
    case "spreadsheets.create": {
      const title =
        fields.newSheetName.trim() ||
        fields.sheetName.trim() ||
        "Untitled Spreadsheet"
      const created = await api.spreadsheets.create({
        properties: { title },
      })
      return {
        operation: "CREATE_SPREADSHEET",
        spreadsheetId: created.spreadsheetId ?? created.id,
        title:
          (asRecord(created.properties).title as string | undefined) ?? title,
        spreadsheetUrl: created.spreadsheetUrl ?? null,
      }
    }

    case GoogleSheetsOp.DELETE_SPREADSHEET:
    case "DELETE_SPREADSHEET":
    case "spreadsheets.delete": {
      if (!spreadsheetId) {
        throw new NonRetriableError(
          "Google Sheets DELETE_SPREADSHEET: spreadsheetId is required.",
        )
      }
      await api.spreadsheets.delete({ spreadsheetId })
      return {
        operation: "DELETE_SPREADSHEET",
        spreadsheetId,
        deleted: true,
      }
    }

    case GoogleSheetsOp.LIST_SPREADSHEETS:
    case "LIST_SPREADSHEETS":
    case "spreadsheets.list": {
      const listed = await api.spreadsheets.list({
        pageSize: fields.maxResults || 50,
        pageToken: fields.pageToken?.trim() || undefined,
        query: fields.searchValue?.trim() || undefined,
      })
      const files =
        (listed.files as Array<Record<string, unknown>> | undefined) ??
        (listed.spreadsheets as Array<Record<string, unknown>> | undefined) ??
        []
      return {
        operation: "LIST_SPREADSHEETS",
        spreadsheets: files.map((f) => ({
          spreadsheetId: f.id ?? f.spreadsheetId,
          name: f.name ?? asRecord(f.properties).title,
          modifiedTime: f.modifiedTime ?? null,
        })),
        count: files.length,
        nextPageToken: (listed.nextPageToken as string) ?? null,
      }
    }

    default:
      throw new NonRetriableError(`Unknown Google Sheets operation: ${op}`)
  }
}
