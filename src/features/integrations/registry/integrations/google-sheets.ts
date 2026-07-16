import type { IntegrationDefinition } from "../types"

export const googleSheetsIntegrationDefinition: IntegrationDefinition = {
  typeKey: "google_sheets",
  kind: "integration",
  corsairPluginId: "googlesheets",
  label: "Google Sheets",
  operations: [
    { key: "sheets.getRows", aliases: ["READ_ROWS", "GET_ROW_BY_NUMBER", "SEARCH_ROWS"], label: "Read / Search Rows", group: "Rows", risk: "read" },
    { key: "sheets.appendRow", aliases: ["APPEND_ROW"], label: "Append Row", group: "Rows", risk: "write" },
    { key: "sheets.appendOrUpdateRow", aliases: ["APPEND_OR_UPDATE_ROW"], label: "Append or Update Row", group: "Rows", risk: "write" },
    { key: "sheets.updateRow", aliases: ["UPDATE_ROW", "UPDATE_ROWS_BY_QUERY"], label: "Update Row(s)", group: "Rows", risk: "write" },
    { key: "sheets.deleteRowsOrColumns", aliases: ["DELETE_ROW"], label: "Delete Row/Column", group: "Rows", risk: "destructive" },
    { key: "sheets.clearSheet", aliases: ["CLEAR_RANGE"], label: "Clear Range", group: "Rows", risk: "destructive" },
    { key: "sheets.createSheet", aliases: ["CREATE_SHEET"], label: "Create Sheet Tab", group: "Sheets", risk: "write" },
    { key: "sheets.deleteSheet", aliases: ["DELETE_SHEET"], label: "Delete Sheet Tab", group: "Sheets", risk: "destructive" },
    { key: "sheets.listSheetsInSpreadsheet", aliases: ["GET_SHEET_INFO"], label: "List Sheets / Info", group: "Sheets", risk: "read" },
    { key: "spreadsheets.create", aliases: ["CREATE_SPREADSHEET"], label: "Create Spreadsheet", group: "Spreadsheets", risk: "write" },
    { key: "spreadsheets.delete", aliases: ["DELETE_SPREADSHEET"], label: "Delete Spreadsheet", group: "Spreadsheets", risk: "destructive" },
    { key: "spreadsheets.list", aliases: ["LIST_SPREADSHEETS"], label: "List Spreadsheets", group: "Spreadsheets", risk: "read" },
  ],
}
