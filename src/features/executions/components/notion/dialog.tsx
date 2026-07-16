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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCredentialsByType } from "@/features/credentials/hooks/use-credentials"
import { CredentialType } from "@/generated/prisma"
import { CheckIcon, Loader2Icon } from "lucide-react"
import Link from "next/link"
import { Separator } from "@/components/ui/separator"

export interface NotionFormValues {
  credentialId?: string
  operation?: string
  variableName?: string
  databaseId?: string
  pageId?: string
  blockId?: string
  blockContent?: string
  searchQuery?: string
  filterJson?: string
  sortsJson?: string
  propertiesJson?: string
  notionUserId?: string
  pageSize?: number
  startCursor?: string
  parentPageId?: string
}

interface NotionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: NotionFormValues) => void
  defaultValues?: Partial<NotionFormValues>
  nodeId?: string
  workflowId?: string
}

type NotionOp =
  | "QUERY_DATABASE"
  | "CREATE_DATABASE_PAGE"
  | "UPDATE_DATABASE_PAGE"
  | "GET_PAGE"
  | "ARCHIVE_PAGE"
  | "APPEND_BLOCK"
  | "GET_BLOCK_CHILDREN"
  | "SEARCH"
  | "GET_DATABASE"
  | "LIST_DATABASES"
  | "SEARCH_DATABASE"
  | "CREATE_PAGE"
  | "GET_USER"
  | "GET_USERS"

const OUTPUT_HINTS: Record<string, string[]> = {
  QUERY_DATABASE: ["data.results", "data.has_more", "data.next_cursor"],
  CREATE_DATABASE_PAGE: ["data.id", "data.url", "data.properties"],
  UPDATE_DATABASE_PAGE: ["data.id", "data.url", "data.properties"],
  GET_PAGE: ["data.id", "data.url", "data.properties"],
  ARCHIVE_PAGE: ["data.id", "data.archived"],
  APPEND_BLOCK: ["data.results"],
  GET_BLOCK_CHILDREN: ["data.results", "data.has_more", "data.next_cursor"],
  SEARCH: ["data.results", "data.has_more", "data.next_cursor"],
  GET_DATABASE: ["data.id", "data.title", "data.properties"],
  LIST_DATABASES: ["data.results", "data.has_more"],
  SEARCH_DATABASE: ["data.results"],
  CREATE_PAGE: ["data.id", "data.url"],
  GET_USER: ["data.id", "data.name", "data.type"],
  GET_USERS: ["data.results", "data.has_more"],
}

const DB_OPS: NotionOp[] = [
  "QUERY_DATABASE",
  "CREATE_DATABASE_PAGE",
  "GET_DATABASE",
  "SEARCH_DATABASE",
]

const PAGE_OPS: NotionOp[] = [
  "UPDATE_DATABASE_PAGE",
  "GET_PAGE",
  "ARCHIVE_PAGE",
  "APPEND_BLOCK",
  "GET_BLOCK_CHILDREN",
]

const PROP_OPS: NotionOp[] = ["CREATE_DATABASE_PAGE", "UPDATE_DATABASE_PAGE", "CREATE_PAGE"]
const BLOCK_OPS: NotionOp[] = ["CREATE_DATABASE_PAGE", "APPEND_BLOCK", "CREATE_PAGE"]
const FILTER_OPS: NotionOp[] = ["QUERY_DATABASE", "SEARCH", "SEARCH_DATABASE"]
const PAGINATED_OPS: NotionOp[] = [
  "QUERY_DATABASE",
  "GET_BLOCK_CHILDREN",
  "SEARCH",
  "GET_USERS",
  "LIST_DATABASES",
  "SEARCH_DATABASE",
]

export const NotionDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: NotionDialogProps) => {
  const [credentialId, setCredentialId] = useState(
    defaultValues.credentialId || "",
  )
  const [operation, setOperation] = useState<NotionOp>(
    (defaultValues.operation as NotionOp) || "QUERY_DATABASE",
  )
  const [variableName, setVariableName] = useState(
    defaultValues.variableName || "notion",
  )
  const [databaseId, setDatabaseId] = useState(defaultValues.databaseId || "")
  const [pageId, setPageId] = useState(defaultValues.pageId || "")
  const [blockId, setBlockId] = useState(defaultValues.blockId || "")
  const [blockContent, setBlockContent] = useState(
    defaultValues.blockContent || "",
  )
  const [searchQuery, setSearchQuery] = useState(
    defaultValues.searchQuery || "",
  )
  const [filterJson, setFilterJson] = useState(
    defaultValues.filterJson || "{}",
  )
  const [sortsJson, setSortsJson] = useState(defaultValues.sortsJson || "[]")
  const [propertiesJson, setPropertiesJson] = useState(
    defaultValues.propertiesJson || "{}",
  )
  const [notionUserId, setNotionUserId] = useState(
    defaultValues.notionUserId || "",
  )
  const [pageSize, setPageSize] = useState(defaultValues.pageSize ?? 100)
  const [startCursor, setStartCursor] = useState(
    defaultValues.startCursor || "",
  )
  const [parentPageId, setParentPageId] = useState(
    defaultValues.parentPageId || "",
  )
  const [saved, setSaved] = useState(false)

  const { data: credentials, isLoading: isLoadingCredentials } =
    useCredentialsByType(CredentialType.NOTION)

  useEffect(() => {
    if (!open) return
    setCredentialId(defaultValues.credentialId || "")
    setOperation((defaultValues.operation as NotionOp) || "QUERY_DATABASE")
    setVariableName(defaultValues.variableName || "notion")
    setDatabaseId(defaultValues.databaseId || "")
    setPageId(defaultValues.pageId || "")
    setBlockId(defaultValues.blockId || "")
    setBlockContent(defaultValues.blockContent || "")
    setSearchQuery(defaultValues.searchQuery || "")
    setFilterJson(defaultValues.filterJson || "{}")
    setSortsJson(defaultValues.sortsJson || "[]")
    setPropertiesJson(defaultValues.propertiesJson || "{}")
    setNotionUserId(defaultValues.notionUserId || "")
    setPageSize(defaultValues.pageSize ?? 100)
    setStartCursor(defaultValues.startCursor || "")
    setParentPageId(defaultValues.parentPageId || "")
    setSaved(false)
  }, [open, defaultValues])

  const isValid = !!credentialId.trim()
  const v = variableName || "notion"

  const handleSave = () => {
    if (!isValid) return
    const values: NotionFormValues = {
      credentialId,
      operation,
      variableName,
      databaseId,
      pageId,
      blockId,
      blockContent,
      searchQuery,
      filterJson,
      sortsJson,
      propertiesJson,
      notionUserId,
      pageSize,
      startCursor,
      parentPageId,
    }
    onSubmit(values)
    setSaved(true)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Notion</DialogTitle>
          <DialogDescription>
            Interact with Notion databases, pages, blocks, and users via Corsair
            when enabled (full package surface).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Variable Name</Label>
            <Input
              placeholder="notion"
              value={variableName}
              onChange={(e) => setVariableName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {`Reference as {{${v}.data.id}}, {{${v}.data.results}}`}
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Notion Credential</Label>
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
              href="/credentials"
              className="text-xs text-primary hover:underline"
            >
              + Add Notion integration token
            </Link>
            {!credentialId && (
              <p className="text-xs text-destructive">Credential is required</p>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Operation</Label>
            <Select
              value={operation}
              onValueChange={(val) => setOperation(val as NotionOp)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Databases</SelectLabel>
                  <SelectItem value="QUERY_DATABASE">Query Database</SelectItem>
                  <SelectItem value="GET_DATABASE">Get Database</SelectItem>
                  <SelectItem value="LIST_DATABASES">List Databases</SelectItem>
                  <SelectItem value="SEARCH_DATABASE">Search Database</SelectItem>
                  <SelectItem value="CREATE_DATABASE_PAGE">
                    Create Database Page
                  </SelectItem>
                  <SelectItem value="UPDATE_DATABASE_PAGE">
                    Update Database Page
                  </SelectItem>
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Pages</SelectLabel>
                  <SelectItem value="GET_PAGE">Get Page</SelectItem>
                  <SelectItem value="CREATE_PAGE">Create Page</SelectItem>
                  <SelectItem value="ARCHIVE_PAGE">Archive Page</SelectItem>
                  <SelectItem value="SEARCH">Search Pages</SelectItem>
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Blocks</SelectLabel>
                  <SelectItem value="APPEND_BLOCK">Append Block</SelectItem>
                  <SelectItem value="GET_BLOCK_CHILDREN">
                    Get Block Children
                  </SelectItem>
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Users</SelectLabel>
                  <SelectItem value="GET_USER">Get User</SelectItem>
                  <SelectItem value="GET_USERS">List Users</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {DB_OPS.includes(operation) && (
            <div className="space-y-2">
              <Label>Database ID *</Label>
              <Input
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={databaseId}
                onChange={(e) => setDatabaseId(e.target.value)}
              />
            </div>
          )}

          {PAGE_OPS.includes(operation) && (
            <div className="space-y-2">
              <Label>Page ID *</Label>
              <Input
                placeholder="{{notion.data.id}}"
                value={pageId}
                onChange={(e) => setPageId(e.target.value)}
              />
            </div>
          )}

          {operation === "CREATE_PAGE" && (
            <>
              <div className="space-y-2">
                <Label>Parent Page ID (or use Database ID)</Label>
                <Input
                  placeholder="parent page id"
                  value={parentPageId}
                  onChange={(e) => setParentPageId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Database ID (optional parent)</Label>
                <Input
                  value={databaseId}
                  onChange={(e) => setDatabaseId(e.target.value)}
                />
              </div>
            </>
          )}

          {(operation === "APPEND_BLOCK" ||
            operation === "GET_BLOCK_CHILDREN") && (
            <div className="space-y-2">
              <Label>Block ID (optional; defaults to Page ID)</Label>
              <Input
                placeholder="block id"
                value={blockId}
                onChange={(e) => setBlockId(e.target.value)}
              />
            </div>
          )}

          {PROP_OPS.includes(operation) && (
            <div className="space-y-2">
              <Label>Properties JSON</Label>
              <Textarea
                className="min-h-[120px] font-mono text-xs"
                placeholder='{"Name":{"title":[{"text":{"content":"Hello"}}]}}'
                value={propertiesJson}
                onChange={(e) => setPropertiesJson(e.target.value)}
              />
            </div>
          )}

          {BLOCK_OPS.includes(operation) && (
            <div className="space-y-2">
              <Label>Block Content</Label>
              <Textarea
                className="min-h-[100px]"
                placeholder="Plain text paragraph, or JSON array of Notion blocks"
                value={blockContent}
                onChange={(e) => setBlockContent(e.target.value)}
              />
            </div>
          )}

          {(operation === "SEARCH" ||
            operation === "SEARCH_DATABASE" ||
            operation === "CREATE_PAGE") && (
            <div className="space-y-2">
              <Label>
                {operation === "CREATE_PAGE" ? "Title (fallback)" : "Search Query"}
              </Label>
              <Input
                placeholder={
                  operation === "CREATE_PAGE" ? "Untitled" : "search terms"
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}

          {FILTER_OPS.includes(operation) && (
            <>
              <div className="space-y-2">
                <Label>Filter JSON</Label>
                <Textarea
                  className="min-h-[80px] font-mono text-xs"
                  value={filterJson}
                  onChange={(e) => setFilterJson(e.target.value)}
                />
              </div>
              {operation === "QUERY_DATABASE" && (
                <div className="space-y-2">
                  <Label>Sorts JSON</Label>
                  <Textarea
                    className="min-h-[60px] font-mono text-xs"
                    value={sortsJson}
                    onChange={(e) => setSortsJson(e.target.value)}
                  />
                </div>
              )}
            </>
          )}

          {operation === "GET_USER" && (
            <div className="space-y-2">
              <Label>Notion User ID *</Label>
              <Input
                value={notionUserId}
                onChange={(e) => setNotionUserId(e.target.value)}
              />
            </div>
          )}

          {PAGINATED_OPS.includes(operation) && (
            <>
              <div className="space-y-2">
                <Label>Page Size</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={pageSize}
                  onChange={(e) =>
                    setPageSize(Math.min(100, Math.max(1, parseInt(e.target.value) || 100)))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Start Cursor</Label>
                <Input
                  placeholder={`{{${v}.data.next_cursor}}`}
                  value={startCursor}
                  onChange={(e) => setStartCursor(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              Output variables:
            </p>
            <div className="flex flex-wrap gap-1">
              {(OUTPUT_HINTS[operation] || []).map((hint) => (
                <code
                  key={hint}
                  className="rounded bg-background px-1.5 py-0.5 text-[10px] font-mono"
                >
                  {`{{${v}.${hint}}}`}
                </code>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!isValid}>
              {saved ? (
                <>
                  <CheckIcon className="mr-1 size-4" /> Saved
                </>
              ) : isLoadingCredentials ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
