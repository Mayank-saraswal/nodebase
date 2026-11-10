# Google Sheets operation matrix (Nodebase → Corsair)

Source: `@corsair-dev/googlesheets` (`client.googlesheets.api.*`).

| Nodebase `GoogleSheetsOp` | Corsair API | Status |
|---------------------------|-------------|--------|
| READ_ROWS | `sheets.getRows` + local `rowsToObjects` | **mapped** |
| APPEND_ROW | `sheets.appendRow` (+ header map for objects) | **mapped** |
| UPDATE_ROW | `sheets.updateRow` (+ merge with existing row) | **mapped** |
| UPDATE_ROWS_BY_QUERY | `getRows` + N× `updateRow` | **mapped** (loop; edge: no matches) |
| DELETE_ROW | `listSheetsInSpreadsheet` → `deleteRowsOrColumns` | **mapped** |
| GET_ROW_BY_NUMBER | `sheets.getRows` range N:N | **mapped** |
| SEARCH_ROWS | `getRows` A1:ZZ + client filter | **mapped** |
| CLEAR_RANGE | `sheets.clearSheet` | **mapped** |
| CREATE_SHEET | `sheets.createSheet` | **mapped** |
| GET_SHEET_INFO | `sheets.listSheetsInSpreadsheet` | **mapped** |

Edge cases covered in operations + tests: empty spreadsheetId, missing rowNumber, invalid JSON, header not found, no match query, empty search results.
