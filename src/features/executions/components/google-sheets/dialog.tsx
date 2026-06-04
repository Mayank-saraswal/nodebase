"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTRPC } from "@/trpc/client"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCredentialsByType } from "@/features/credentials/hooks/use-credentials"
import { CredentialType } from "@/generated/prisma"
import { CheckIcon, Loader2Icon } from "lucide-react"
import Link from "next/link"
import { Separator } from "@/components/ui/separator"

type GoogleSheetsOp =
  | "READ_ROWS"
  | "GET_ROW_BY_NUMBER"
  | "SEARCH_ROWS"
  | "GET_SHEET_INFO"
  | "APPEND_ROW"
  | "UPDATE_ROW"
  | "UPDATE_ROWS_BY_QUERY"
  | "DELETE_ROW"
  | "CLEAR_RANGE"
  | "CREATE_SHEET"

export interface GoogleSheetsFormValues {
  credentialId?: string
  operation?: string
  variableName?: string
  spreadsheetId?: string
  sheetName?: string
  headerRow?: boolean
  rowNumber?: string
  rowValues?: string
  searchColumn?: string
  searchValue?: string
  clearRange?: string
  newSheetName?: string
  valueInputOption?: string
  matchColumn?: string
  matchValue?: string
  updateValues?: string
  maxResults?: number
  includeEmptyRows?: boolean
}

interface GoogleSheetsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: GoogleSheetsFormValues) => void
  defaultValues?: Partial<GoogleSheetsFormValues>
  nodeId?: string
  workflowId?: string
}

const OUTPUT_HINTS: Record<string, string[]> = {
  READ_ROWS: ["rows", "count", "rows.0.ColumnName", "headers"],
  APPEND_ROW: ["appendedRow", "updatedRange"],
  UPDATE_ROW: ["updatedRow", "range"],
  UPDATE_ROWS_BY_QUERY: ["updatedCount", "updatedRows"],
  DELETE_ROW: ["deletedRow", "spreadsheetId"],
  GET_ROW_BY_NUMBER: ["row", "rowNumber", "isEmpty"],
  SEARCH_ROWS: ["rows", "count", "firstRow", "firstRowNumber"],
  CLEAR_RANGE: ["clearedRange"],
  CREATE_SHEET: ["sheetName", "sheetId"],
  GET_SHEET_INFO: ["title", "sheets", "sheetCount"],
}

export const GoogleSheetsDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  nodeId,
  workflowId,
}: GoogleSheetsDialogProps) => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  // State for all fields
  const [credentialId, setCredentialId] = useState(defaultValues.credentialId || "")
  const [operation, setOperation] = useState<GoogleSheetsOp>(
    (defaultValues.operation as GoogleSheetsOp) || "APPEND_ROW"
  )
  const [variableName, setVariableName] = useState(defaultValues.variableName || "googleSheets")
  const [spreadsheetId, setSpreadsheetId] = useState(defaultValues.spreadsheetId || "")
  const [sheetName, setSheetName] = useState(defaultValues.sheetName || "Sheet1")
  const [headerRow, setHeaderRow] = useState(defaultValues.headerRow ?? true)
  const [rowNumber, setRowNumber] = useState(defaultValues.rowNumber || "")
  const [rowValues, setRowValues] = useState(defaultValues.rowValues || "")
  const [searchColumn, setSearchColumn] = useState(defaultValues.searchColumn || "")
  const [searchValue, setSearchValue] = useState(defaultValues.searchValue || "")
  const [clearRange, setClearRange] = useState(defaultValues.clearRange || "")
  const [newSheetName, setNewSheetName] = useState(defaultValues.newSheetName || "")
  const [valueInputOption, setValueInputOption] = useState(defaultValues.valueInputOption || "USER_ENTERED")
  const [matchColumn, setMatchColumn] = useState(defaultValues.matchColumn || "")
  const [matchValue, setMatchValue] = useState(defaultValues.matchValue || "")
  const [updateValues, setUpdateValues] = useState(defaultValues.updateValues || "")
  const [maxResults, setMaxResults] = useState(defaultValues.maxResults ?? 100)
  const [includeEmptyRows, setIncludeEmptyRows] = useState(defaultValues.includeEmptyRows ?? false)
  const [saved, setSaved] = useState(false)

  const { data: credentials, isLoading: isLoadingCredentials } =
    useCredentialsByType(CredentialType.GOOGLE_SHEETS)

  const { data: config, isLoading } = useQuery(
    trpc.googleSheets.getByNodeId.queryOptions(
      { nodeId: nodeId! },
      { enabled: open && !!nodeId }
    )
  )

  // Pre-fill from DB config when loaded
  useEffect(() => {
    if (config) {
      setCredentialId(config.credentialId || "")
      setOperation(config.operation as GoogleSheetsOp)
      setVariableName(config.variableName || "googleSheets")
      setSpreadsheetId(config.spreadsheetId)
      setSheetName(config.sheetName)
      setHeaderRow(config.headerRow)
      setRowNumber(config.rowNumber)
      setRowValues(config.rowValues)
      setSearchColumn(config.searchColumn)
      setSearchValue(config.searchValue)
      setClearRange(config.clearRange)
      setNewSheetName(config.newSheetName)
      setValueInputOption(config.valueInputOption)
      setMatchColumn(config.matchColumn)
      setMatchValue(config.matchValue)
      setUpdateValues(config.updateValues)
      setMaxResults(config.maxResults)
      setIncludeEmptyRows(config.includeEmptyRows)
    }
  }, [config])

  // Reset when dialog opens with defaultValues
  useEffect(() => {
    if (open && !config) {
      setCredentialId(defaultValues.credentialId || "")
      setOperation((defaultValues.operation as GoogleSheetsOp) || "APPEND_ROW")
      setVariableName(defaultValues.variableName || "googleSheets")
      setSpreadsheetId(defaultValues.spreadsheetId || "")
      setSheetName(defaultValues.sheetName || "Sheet1")
      setHeaderRow(defaultValues.headerRow ?? true)
      setRowNumber(defaultValues.rowNumber || "")
      setRowValues(defaultValues.rowValues || "")
      setSearchColumn(defaultValues.searchColumn || "")
      setSearchValue(defaultValues.searchValue || "")
      setClearRange(defaultValues.clearRange || "")
      setNewSheetName(defaultValues.newSheetName || "")
      setValueInputOption(defaultValues.valueInputOption || "USER_ENTERED")
      setMatchColumn(defaultValues.matchColumn || "")
      setMatchValue(defaultValues.matchValue || "")
      setUpdateValues(defaultValues.updateValues || "")
      setMaxResults(defaultValues.maxResults ?? 100)
      setIncludeEmptyRows(defaultValues.includeEmptyRows ?? false)
    }
  }, [open, defaultValues, config])

  const upsertMutation = useMutation(
    trpc.googleSheets.upsert.mutationOptions({
      onSuccess: () => {
        if (nodeId) {
          queryClient.invalidateQueries(
            trpc.googleSheets.getByNodeId.queryOptions({ nodeId })
          )
        }
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      },
    })
  )

  const isValid = !!credentialId.trim() && !!spreadsheetId.trim()

  const handleSave = () => {
    if (!isValid) return

    const values: GoogleSheetsFormValues = {
      credentialId,
      operation,
      variableName,
      spreadsheetId,
      sheetName,
      headerRow,
      rowNumber,
      rowValues,
      searchColumn,
      searchValue,
      clearRange,
      newSheetName,
      valueInputOption,
      matchColumn,
      matchValue,
      updateValues,
      maxResults,
      includeEmptyRows,
    }

    onSubmit(values)

    if (workflowId && nodeId) {
      upsertMutation.mutate({
        workflowId,
        nodeId,
        credentialId,
        operation,
        variableName,
        spreadsheetId,
        sheetName,
        headerRow,
        rowNumber,
        rowValues,
        searchColumn,
        searchValue,
        clearRange,
        newSheetName,
        valueInputOption,
        matchColumn,
        matchValue,
        updateValues,
        maxResults,
        includeEmptyRows,
      })
    }
  }

  const v = variableName || "googleSheets"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Google Sheets</DialogTitle>
          <DialogDescription>
            Read, write, search, and manage Google Spreadsheets
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* 1. Variable Name */}
            <div className="space-y-2">
              <Label>Variable Name</Label>
              <Input
                placeholder="googleSheets"
                value={variableName}
                onChange={(e) => setVariableName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {`Reference as {{${v}.rows}}, {{${v}.firstRowNumber}}`}
              </p>
            </div>

            <Separator />

            {/* 2. Credential Selector */}
            <div className="space-y-2">
              <Label>Google Sheets Credential</Label>
              <Select
                value={credentialId}
                onValueChange={setCredentialId}
                disabled={isLoadingCredentials || !credentials?.length}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select credential..." />
                </SelectTrigger>
                <SelectContent>
                  {credentials?.map((credential) => (
                    <SelectItem key={credential.id} value={credential.id}>
                      {credential.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Link
                href="/credentials/new"
                className="text-xs text-primary hover:underline"
              >
                + Add new Google Sheets credential
              </Link>
              {!credentialId && (
                <p className="text-xs text-destructive">
                  Credential is required
                </p>
              )}
            </div>

            <Separator />

            {/* 3. Spreadsheet ID */}
            <div className="space-y-2">
              <Label>Spreadsheet ID *</Label>
              <Input
                placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                value={spreadsheetId}
                onChange={(e) => setSpreadsheetId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {"Found in Google Sheets URL: .../spreadsheets/d/{ID}/edit"}
              </p>
              {!spreadsheetId.trim() && (
                <p className="text-xs text-destructive">
                  Spreadsheet ID is required
                </p>
              )}
            </div>

            <Separator />

            {/* 4. Operation (grouped) */}
            <div className="space-y-2">
              <Label>Operation</Label>
              <Select
                value={operation}
                onValueChange={(val) => setOperation(val as GoogleSheetsOp)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Read</SelectLabel>
                    <SelectItem value="READ_ROWS">Read Rows</SelectItem>
                    <SelectItem value="GET_ROW_BY_NUMBER">Get Row by Number</SelectItem>
                    <SelectItem value="SEARCH_ROWS">Search Rows</SelectItem>
                    <SelectItem value="GET_SHEET_INFO">Get Sheet Info</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Write</SelectLabel>
                    <SelectItem value="APPEND_ROW">Append Row</SelectItem>
                    <SelectItem value="UPDATE_ROW">Update Row</SelectItem>
                    <SelectItem value="UPDATE_ROWS_BY_QUERY">Update Rows by Query</SelectItem>
                    <SelectItem value="DELETE_ROW">Delete Row</SelectItem>
                    <SelectItem value="CLEAR_RANGE">Clear Range</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Manage</SelectLabel>
                    <SelectItem value="CREATE_SHEET">Create Sheet</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* ── DYNAMIC FIELDS per operation ── */}

            {/* READ_ROWS */}
            {operation === "READ_ROWS" && (
              <>
                <div className="space-y-2">
                  <Label>Sheet Name</Label>
                  <Input
                    placeholder="Sheet1"
                    value={sheetName}
                    onChange={(e) => setSheetName(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Has Header Row</Label>
                  <Switch checked={headerRow} onCheckedChange={setHeaderRow} />
                </div>
                <div className="space-y-2">
                  <Label>Max Rows</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10000}
                    value={maxResults}
                    onChange={(e) => setMaxResults(parseInt(e.target.value) || 100)}
                  />
                </div>
              </>
            )}

            {/* APPEND_ROW */}
            {operation === "APPEND_ROW" && (
              <>
                <div className="space-y-2">
                  <Label>Sheet Name</Label>
                  <Input
                    placeholder="Sheet1"
                    value={sheetName}
                    onChange={(e) => setSheetName(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Has Header Row</Label>
                  <Switch checked={headerRow} onCheckedChange={setHeaderRow} />
                </div>
                <div className="space-y-2">
                  <Label>Row Values *</Label>
                  <Textarea
                    className="min-h-[120px] font-mono"
                    placeholder={'{"Name": "John", "Email": "john@example.com"}'}
                    value={rowValues}
                    onChange={(e) => setRowValues(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    JSON object. Keys must match column headers exactly.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Value Input Option</Label>
                  <Select value={valueInputOption} onValueChange={setValueInputOption}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USER_ENTERED">User Entered (parses formulas)</SelectItem>
                      <SelectItem value="RAW">Raw (stores as-is)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* UPDATE_ROW */}
            {operation === "UPDATE_ROW" && (
              <>
                <div className="space-y-2">
                  <Label>Sheet Name</Label>
                  <Input
                    placeholder="Sheet1"
                    value={sheetName}
                    onChange={(e) => setSheetName(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Has Header Row</Label>
                  <Switch checked={headerRow} onCheckedChange={setHeaderRow} />
                </div>
                <div className="space-y-2">
                  <Label>Row Number *</Label>
                  <Input
                    placeholder="{{googleSheets.firstRowNumber}}"
                    value={rowNumber}
                    onChange={(e) => setRowNumber(e.target.value)}
                  />
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-1 dark:border-blue-800 dark:bg-blue-950">
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                      ℹ️ How to get the row number:
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      1. Add a SEARCH_ROWS node before this node
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      {`2. Pass {{${v}.firstRowNumber}} into this field`}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      Row numbers are 1-indexed. Row 1 = header (skip it).
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Row Values *</Label>
                  <Textarea
                    className="min-h-[120px] font-mono"
                    placeholder={'{"Status": "Sent", "SentAt": "2024-01-15"}'}
                    value={updateValues}
                    onChange={(e) => setUpdateValues(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Only included columns will be updated. Other columns unchanged.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Value Input Option</Label>
                  <Select value={valueInputOption} onValueChange={setValueInputOption}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USER_ENTERED">User Entered (parses formulas)</SelectItem>
                      <SelectItem value="RAW">Raw (stores as-is)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* UPDATE_ROWS_BY_QUERY */}
            {operation === "UPDATE_ROWS_BY_QUERY" && (
              <>
                <div className="space-y-2">
                  <Label>Sheet Name</Label>
                  <Input
                    placeholder="Sheet1"
                    value={sheetName}
                    onChange={(e) => setSheetName(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Has Header Row</Label>
                  <Switch checked={headerRow} onCheckedChange={setHeaderRow} />
                </div>
                <div className="space-y-2">
                  <Label>Match Column *</Label>
                  <Input
                    placeholder="Email"
                    value={matchColumn}
                    onChange={(e) => setMatchColumn(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Column header name to search in
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Match Value *</Label>
                  <Input
                    placeholder="{{customer.email}}"
                    value={matchValue}
                    onChange={(e) => setMatchValue(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    All rows where this column equals this value will be updated
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Update Values *</Label>
                  <Textarea
                    className="min-h-[120px] font-mono"
                    placeholder={'{"Status": "Processed", "ProcessedAt": "2024-01-15"}'}
                    value={updateValues}
                    onChange={(e) => setUpdateValues(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Value Input Option</Label>
                  <Select value={valueInputOption} onValueChange={setValueInputOption}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USER_ENTERED">User Entered (parses formulas)</SelectItem>
                      <SelectItem value="RAW">Raw (stores as-is)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* DELETE_ROW */}
            {operation === "DELETE_ROW" && (
              <>
                <div className="space-y-2">
                  <Label>Sheet Name</Label>
                  <Input
                    placeholder="Sheet1"
                    value={sheetName}
                    onChange={(e) => setSheetName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Row Number *</Label>
                  <Input
                    placeholder="{{googleSheets.firstRowNumber}}"
                    value={rowNumber}
                    onChange={(e) => setRowNumber(e.target.value)}
                  />
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1 dark:border-amber-800 dark:bg-amber-950">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                    ⚠️ This permanently deletes the row and cannot be undone.
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {`Rows below shift up. Use {{${v}.firstRowNumber}} from a SEARCH_ROWS result to target a specific row.`}
                  </p>
                </div>
              </>
            )}

            {/* GET_ROW_BY_NUMBER */}
            {operation === "GET_ROW_BY_NUMBER" && (
              <>
                <div className="space-y-2">
                  <Label>Sheet Name</Label>
                  <Input
                    placeholder="Sheet1"
                    value={sheetName}
                    onChange={(e) => setSheetName(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Has Header Row</Label>
                  <Switch checked={headerRow} onCheckedChange={setHeaderRow} />
                </div>
                <div className="space-y-2">
                  <Label>Row Number *</Label>
                  <Input
                    placeholder="2"
                    value={rowNumber}
                    onChange={(e) => setRowNumber(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Row 1 is usually the header. Data starts at row 2.
                  </p>
                </div>
              </>
            )}

            {/* SEARCH_ROWS */}
            {operation === "SEARCH_ROWS" && (
              <>
                <div className="space-y-2">
                  <Label>Sheet Name</Label>
                  <Input
                    placeholder="Sheet1"
                    value={sheetName}
                    onChange={(e) => setSheetName(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Has Header Row</Label>
                  <Switch checked={headerRow} onCheckedChange={setHeaderRow} />
                </div>
                <div className="space-y-2">
                  <Label>Search Column *</Label>
                  <Input
                    placeholder="Phone"
                    value={searchColumn}
                    onChange={(e) => setSearchColumn(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Exact column header name to search in
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Search Value *</Label>
                  <Input
                    placeholder="{{webhook.body.phone}}"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Exact match only (case-sensitive)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Max Results</Label>
                  <Input
                    type="number"
                    min={1}
                    max={1000}
                    value={maxResults}
                    onChange={(e) => setMaxResults(parseInt(e.target.value) || 100)}
                  />
                </div>
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 space-y-1 dark:border-green-800 dark:bg-green-950">
                  <p className="text-xs font-medium text-green-700 dark:text-green-300">
                    ✅ After search, use in next nodes:
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 font-mono">
                    {`{{${v}.firstRowNumber}}`} → row number of first match
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 font-mono">
                    {`{{${v}.firstRow.Email}}`} → Email of first match
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 font-mono">
                    {`{{${v}.count}}`} → total matches
                  </p>
                </div>
              </>
            )}

            {/* CLEAR_RANGE */}
            {operation === "CLEAR_RANGE" && (
              <>
                <div className="space-y-2">
                  <Label>Range *</Label>
                  <Input
                    placeholder="Sheet1!A2:Z1000"
                    value={clearRange}
                    onChange={(e) => setClearRange(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Include sheet name: Sheet1!A2:Z or just A2:Z (sheet name auto-added)
                  </p>
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-1 dark:border-blue-800 dark:bg-blue-950">
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                    Common patterns:
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-mono">
                    Sheet1!A2:Z &nbsp;&nbsp;&nbsp;— all data rows (keeps header)
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-mono">
                    Sheet1!A:A &nbsp;&nbsp;&nbsp;&nbsp;— entire column A
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-mono">
                    Sheet1!B2:D50 — partial range
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-mono">
                    Sheet1!A2:Z100 — first 100 data rows
                  </p>
                </div>
              </>
            )}

            {/* CREATE_SHEET */}
            {operation === "CREATE_SHEET" && (
              <div className="space-y-2">
                <Label>New Sheet Name *</Label>
                <Input
                  placeholder="Orders_2024"
                  value={newSheetName}
                  onChange={(e) => setNewSheetName(e.target.value)}
                />
              </div>
            )}

            {/* GET_SHEET_INFO — no extra fields */}

            {/* Output variables box */}
            <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Output variables:
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                {OUTPUT_HINTS[operation]?.map((f) => `{{${v}.${f}}}`).join("  ") ?? ""}
              </p>
            </div>

            {/* Save / Cancel */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSave}
                disabled={!isValid || upsertMutation.isPending}
              >
                {upsertMutation.isPending ? (
                  <>
                    <Loader2Icon className="size-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : saved ? (
                  <>
                    <CheckIcon className="size-4 mr-2" />
                    Saved ✓
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
