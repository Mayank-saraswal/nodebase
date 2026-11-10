import { describe, expect, it, vi, beforeEach } from "vitest"
import { GoogleSheetsOp } from "@/features/executions/enums"
import {
  runGoogleSheetsOperation,
  type ResolvedSheetsFields,
  type SheetsApiClient,
} from "../operations"

function fields(
  overrides: Partial<ResolvedSheetsFields> = {},
): ResolvedSheetsFields {
  return {
    operation: GoogleSheetsOp.READ_ROWS,
    spreadsheetId: "ss1",
    sheetName: "Sheet1",
    range: "A:Z",
    headerRow: true,
    includeEmptyRows: false,
    maxResults: 100,
    valueInputOption: "USER_ENTERED",
    rowValues: "",
    rowData: [],
    rowNumber: "",
    updateValues: "",
    matchColumn: "",
    matchValue: "",
    searchColumn: "",
    searchValue: "",
    clearRange: "",
    newSheetName: "",
    pageToken: "",
    ...overrides,
  }
}

function mockClient(): SheetsApiClient {
  return {
    googlesheets: {
      api: {
        spreadsheets: {
          create: vi.fn(),
          delete: vi.fn(),
          list: vi.fn(),
        },
        sheets: {
          appendRow: vi.fn().mockResolvedValue({
            updates: { updatedRange: "Sheet1!A2", updatedRows: 1 },
          }),
          appendOrUpdateRow: vi.fn(),
          getRows: vi.fn().mockResolvedValue({
            values: [
              ["Name", "Email"],
              ["Ada", "ada@x.com"],
              ["Bob", "bob@x.com"],
            ],
          }),
          updateRow: vi.fn().mockResolvedValue({
            updatedRange: "Sheet1!A2",
            updatedRows: 1,
          }),
          clearSheet: vi.fn().mockResolvedValue({}),
          createSheet: vi.fn().mockResolvedValue({
            replies: [{ addSheet: { properties: { sheetId: 9, title: "New" } } }],
          }),
          deleteSheet: vi.fn(),
          deleteRowsOrColumns: vi.fn().mockResolvedValue({}),
          listSheetsInSpreadsheet: vi.fn().mockResolvedValue({
            sheets: [
              { properties: { sheetId: 0, title: "Sheet1", index: 0 } },
            ],
          }),
        },
      },
    },
  }
}

describe("runGoogleSheetsOperation (all ops)", () => {
  let client: SheetsApiClient

  beforeEach(() => {
    client = mockClient()
  })

  it("requires spreadsheetId", async () => {
    await expect(
      runGoogleSheetsOperation(client, fields({ spreadsheetId: "" })),
    ).rejects.toThrow(/spreadsheetId/)
  })

  it("READ_ROWS", async () => {
    const out = await runGoogleSheetsOperation(
      client,
      fields({ operation: GoogleSheetsOp.READ_ROWS }),
    )
    expect(client.googlesheets.api.sheets.getRows).toHaveBeenCalled()
    expect(out.operation).toBe("READ_ROWS")
    expect(out.totalRows).toBe(3)
    expect((out.rows as unknown[]).length).toBe(2)
  })

  it("APPEND_ROW with array JSON", async () => {
    const out = await runGoogleSheetsOperation(
      client,
      fields({
        operation: GoogleSheetsOp.APPEND_ROW,
        rowValues: '["X","y@z.com"]',
      }),
    )
    expect(client.googlesheets.api.sheets.appendRow).toHaveBeenCalledWith(
      expect.objectContaining({
        spreadsheetId: "ss1",
        values: ["X", "y@z.com"],
      }),
    )
    expect(out.success).toBe(true)
  })

  it("APPEND_ROW with object maps headers", async () => {
    await runGoogleSheetsOperation(
      client,
      fields({
        operation: GoogleSheetsOp.APPEND_ROW,
        rowValues: '{"Name":"Eve","Email":"e@x.com"}',
      }),
    )
    expect(client.googlesheets.api.sheets.getRows).toHaveBeenCalled()
    expect(client.googlesheets.api.sheets.appendRow).toHaveBeenCalledWith(
      expect.objectContaining({ values: ["Eve", "e@x.com"] }),
    )
  })

  it("APPEND_ROW invalid JSON", async () => {
    await expect(
      runGoogleSheetsOperation(
        client,
        fields({
          operation: GoogleSheetsOp.APPEND_ROW,
          rowValues: "not-json",
        }),
      ),
    ).rejects.toThrow(/JSON/)
  })

  it("UPDATE_ROW array", async () => {
    const out = await runGoogleSheetsOperation(
      client,
      fields({
        operation: GoogleSheetsOp.UPDATE_ROW,
        rowNumber: "2",
        updateValues: '["A","B"]',
      }),
    )
    expect(client.googlesheets.api.sheets.updateRow).toHaveBeenCalled()
    expect(out.operation).toBe("UPDATE_ROW")
  })

  it("UPDATE_ROW missing rowNumber", async () => {
    await expect(
      runGoogleSheetsOperation(
        client,
        fields({
          operation: GoogleSheetsOp.UPDATE_ROW,
          updateValues: "[]",
        }),
      ),
    ).rejects.toThrow(/rowNumber/)
  })

  it("UPDATE_ROWS_BY_QUERY updates matches", async () => {
    const out = await runGoogleSheetsOperation(
      client,
      fields({
        operation: GoogleSheetsOp.UPDATE_ROWS_BY_QUERY,
        matchColumn: "Name",
        matchValue: "Ada",
        updateValues: '{"Email":"new@x.com"}',
      }),
    )
    expect(out.updatedRows).toBe(1)
    expect(client.googlesheets.api.sheets.updateRow).toHaveBeenCalled()
  })

  it("UPDATE_ROWS_BY_QUERY no match", async () => {
    const out = await runGoogleSheetsOperation(
      client,
      fields({
        operation: GoogleSheetsOp.UPDATE_ROWS_BY_QUERY,
        matchColumn: "Name",
        matchValue: "Nobody",
        updateValues: '{"Email":"x"}',
      }),
    )
    expect(out.updatedRows).toBe(0)
  })

  it("DELETE_ROW", async () => {
    const out = await runGoogleSheetsOperation(
      client,
      fields({
        operation: GoogleSheetsOp.DELETE_ROW,
        rowNumber: "2",
      }),
    )
    expect(
      client.googlesheets.api.sheets.deleteRowsOrColumns,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        dimension: "ROWS",
        startIndex: 1,
        endIndex: 2,
      }),
    )
    expect(out.deletedRow).toBe(2)
  })

  it("GET_ROW_BY_NUMBER", async () => {
    const out = await runGoogleSheetsOperation(
      client,
      fields({
        operation: GoogleSheetsOp.GET_ROW_BY_NUMBER,
        rowNumber: "2",
        headerRow: true,
      }),
    )
    expect(out.rowNumber).toBe(2)
    expect(out.row).toBeTruthy()
  })

  it("SEARCH_ROWS", async () => {
    const out = await runGoogleSheetsOperation(
      client,
      fields({
        operation: GoogleSheetsOp.SEARCH_ROWS,
        searchColumn: "Name",
        searchValue: "Bob",
      }),
    )
    expect(out.count).toBe(1)
    expect(out.firstRowNumber).toBe(3)
  })

  it("SEARCH_ROWS missing column", async () => {
    await expect(
      runGoogleSheetsOperation(
        client,
        fields({
          operation: GoogleSheetsOp.SEARCH_ROWS,
          searchColumn: "Nope",
          searchValue: "x",
        }),
      ),
    ).rejects.toThrow(/not found/)
  })

  it("CLEAR_RANGE", async () => {
    const out = await runGoogleSheetsOperation(
      client,
      fields({
        operation: GoogleSheetsOp.CLEAR_RANGE,
        clearRange: "A2:Z",
      }),
    )
    expect(client.googlesheets.api.sheets.clearSheet).toHaveBeenCalled()
    expect(out.success).toBe(true)
  })

  it("CLEAR_RANGE requires range", async () => {
    await expect(
      runGoogleSheetsOperation(
        client,
        fields({ operation: GoogleSheetsOp.CLEAR_RANGE }),
      ),
    ).rejects.toThrow(/range is required/)
  })

  it("CREATE_SHEET", async () => {
    const out = await runGoogleSheetsOperation(
      client,
      fields({
        operation: GoogleSheetsOp.CREATE_SHEET,
        newSheetName: "Tab2",
      }),
    )
    expect(client.googlesheets.api.sheets.createSheet).toHaveBeenCalledWith({
      spreadsheetId: "ss1",
      title: "Tab2",
    })
    expect(out.success).toBe(true)
  })

  it("GET_SHEET_INFO", async () => {
    const out = await runGoogleSheetsOperation(
      client,
      fields({ operation: GoogleSheetsOp.GET_SHEET_INFO }),
    )
    expect(
      client.googlesheets.api.sheets.listSheetsInSpreadsheet,
    ).toHaveBeenCalled()
    expect(out.sheetCount).toBe(1)
  })

  it("unknown op", async () => {
    await expect(
      runGoogleSheetsOperation(
        client,
        fields({ operation: "NOPE" }),
      ),
    ).rejects.toThrow(/Unknown/)
  })

  it("CREATE_SPREADSHEET does not require spreadsheetId", async () => {
    vi.mocked(client.googlesheets.api.spreadsheets.create).mockResolvedValue({
      spreadsheetId: "new-ss",
      properties: { title: "Created" },
    })
    const out = await runGoogleSheetsOperation(
      client,
      fields({
        operation: GoogleSheetsOp.CREATE_SPREADSHEET,
        spreadsheetId: "",
        newSheetName: "Created",
      }),
    )
    expect(client.googlesheets.api.spreadsheets.create).toHaveBeenCalled()
    expect(out.spreadsheetId).toBe("new-ss")
  })

  it("LIST_SPREADSHEETS", async () => {
    vi.mocked(client.googlesheets.api.spreadsheets.list).mockResolvedValue({
      files: [{ id: "ss1", name: "Sheet A" }],
    })
    const out = await runGoogleSheetsOperation(
      client,
      fields({
        operation: GoogleSheetsOp.LIST_SPREADSHEETS,
        spreadsheetId: "",
      }),
    )
    expect(out.count).toBe(1)
  })

  it("APPEND_OR_UPDATE_ROW", async () => {
    vi.mocked(client.googlesheets.api.sheets.appendOrUpdateRow).mockResolvedValue(
      { updatedRange: "A2" },
    )
    const out = await runGoogleSheetsOperation(
      client,
      fields({
        operation: GoogleSheetsOp.APPEND_OR_UPDATE_ROW,
        matchColumn: "Email",
        matchValue: "a@x.com",
        rowValues: '["Ada","a@x.com"]',
      }),
    )
    expect(client.googlesheets.api.sheets.appendOrUpdateRow).toHaveBeenCalled()
    expect(out.operation).toBe("APPEND_OR_UPDATE_ROW")
  })

  it("DELETE_SHEET", async () => {
    vi.mocked(client.googlesheets.api.sheets.deleteSheet).mockResolvedValue({})
    const out = await runGoogleSheetsOperation(
      client,
      fields({
        operation: GoogleSheetsOp.DELETE_SHEET,
        sheetName: "Sheet1",
      }),
    )
    expect(client.googlesheets.api.sheets.deleteSheet).toHaveBeenCalledWith(
      expect.objectContaining({ spreadsheetId: "ss1", sheetId: 0 }),
    )
    expect(out.success).toBe(true)
  })
})
