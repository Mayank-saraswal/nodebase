import { NonRetriableError } from "inngest"

export function rowsToObjects(
  rows: string[][],
  headerRow: boolean,
  includeEmptyRows: boolean,
  maxResults: number,
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

export function parseJsonField(
  raw: string,
  fieldName: string,
  hint: string,
): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    throw new NonRetriableError(
      `Google Sheets ${fieldName}: is not valid JSON. ${hint}`,
    )
  }
}

/** Map object row to ordered array using header names */
export function objectToRow(
  obj: Record<string, unknown>,
  headers: string[],
  existing?: string[],
): string[] {
  return headers.map((h, i) =>
    h in obj ? String(obj[h] ?? "") : (existing?.[i] ?? ""),
  )
}

export function parseValuesInput(
  parsed: unknown,
  headers: string[] | null,
  op: string,
): string[][] {
  if (Array.isArray(parsed)) {
    return Array.isArray(parsed[0])
      ? (parsed as string[][]).map((r) => r.map(String))
      : [(parsed as unknown[]).map(String)]
  }
  if (typeof parsed === "object" && parsed !== null) {
    if (!headers || headers.length === 0) {
      throw new NonRetriableError(
        `Google Sheets ${op}: Sheet has no header row to map columns. ` +
          "Pass values as a plain array or ensure row 1 has headers.",
      )
    }
    return [objectToRow(parsed as Record<string, unknown>, headers)]
  }
  throw new NonRetriableError(
    `Google Sheets ${op}: values must be a JSON object or array.`,
  )
}
