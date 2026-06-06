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
  SelectItem,
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

export interface NotionFormValues {
  credentialId?: string
  operation?: string
  databaseId?: string
  pageId?: string
  blockContent?: string
  searchQuery?: string
  filterJson?: string
  sortsJson?: string
  propertiesJson?: string
  notionUserId?: string
  pageSize?: number
  startCursor?: string
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
  | "GET_USER"
  | "GET_USERS"

const OUTPUT_HINTS: Record<string, string[]> = {
  QUERY_DATABASE: [
    "{{notion.data.results}}",
    "{{notion.data.has_more}}",
    "{{notion.data.next_cursor}}",
  ],
  CREATE_DATABASE_PAGE: [
    "{{notion.data.id}}",
    "{{notion.data.url}}",
    "{{notion.data.properties}}",
  ],
  UPDATE_DATABASE_PAGE: [
    "{{notion.data.id}}",
    "{{notion.data.url}}",
    "{{notion.data.properties}}",
  ],
  GET_PAGE: [
    "{{notion.data.id}}",
    "{{notion.data.url}}",
    "{{notion.data.properties}}",
  ],
  ARCHIVE_PAGE: [
    "{{notion.data.id}}",
    "{{notion.data.archived}}",
  ],
  APPEND_BLOCK: [
    "{{notion.data.results}}",
  ],
  GET_BLOCK_CHILDREN: [
    "{{notion.data.results}}",
    "{{notion.data.has_more}}",
    "{{notion.data.next_cursor}}",
  ],
  SEARCH: [
    "{{notion.data.results}}",
    "{{notion.data.has_more}}",
    "{{notion.data.next_cursor}}",
  ],
  GET_DATABASE: [
    "{{notion.data.id}}",
    "{{notion.data.title}}",
    "{{notion.data.properties}}",
  ],
  GET_USER: [
    "{{notion.data.id}}",
    "{{notion.data.name}}",
    "{{notion.data.type}}",
  ],
  GET_USERS: [
    "{{notion.data.results}}",
    "{{notion.data.has_more}}",
  ],
}

// Operations that need databaseId
const DB_OPS: NotionOp[] = [
  "QUERY_DATABASE",
  "CREATE_DATABASE_PAGE",
  "GET_DATABASE",
]

// Operations that need pageId
const PAGE_OPS: NotionOp[] = [
  "UPDATE_DATABASE_PAGE",
  "GET_PAGE",
  "ARCHIVE_PAGE",
  "APPEND_BLOCK",
  "GET_BLOCK_CHILDREN",
]

// Operations that need properties JSON
const PROP_OPS: NotionOp[] = [
  "CREATE_DATABASE_PAGE",
  "UPDATE_DATABASE_PAGE",
]

// Operations that need block content
const BLOCK_OPS: NotionOp[] = [
  "CREATE_DATABASE_PAGE",
  "APPEND_BLOCK",
]

// Operations that support filters/sorts
const FILTER_OPS: NotionOp[] = [
  "QUERY_DATABASE",
  "SEARCH",
]

// Operations with paginated results
const PAGINATED_OPS: NotionOp[] = [
  "QUERY_DATABASE",
  "GET_BLOCK_CHILDREN",
  "SEARCH",
  "GET_USERS",
]

export const NotionDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  nodeId,
  workflowId,
}: NotionDialogProps) => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const [credentialId, setCredentialId] = useState(
    defaultValues.credentialId || ""
  )
  const [operation, setOperation] = useState<NotionOp>(
    (defaultValues.operation as NotionOp) || "QUERY_DATABASE"
  )
  const [databaseId, setDatabaseId] = useState(defaultValues.databaseId || "")
  const [pageId, setPageId] = useState(defaultValues.pageId || "")
  const [blockContent, setBlockContent] = useState(
    defaultValues.blockContent || ""
  )
  const [searchQuery, setSearchQuery] = useState(
    defaultValues.searchQuery || ""
  )
  const [filterJson, setFilterJson] = useState(
    defaultValues.filterJson || "{}"
  )
  const [sortsJson, setSortsJson] = useState(
    defaultValues.sortsJson || "[]"
  )
  const [propertiesJson, setPropertiesJson] = useState(
    defaultValues.propertiesJson || "{}"
  )
  const [notionUserId, setNotionUserId] = useState(
    defaultValues.notionUserId || ""
  )
  const [pageSize, setPageSize] = useState(defaultValues.pageSize ?? 100)
  const [startCursor, setStartCursor] = useState(
    defaultValues.startCursor || ""
  )
  const [saved, setSaved] = useState(false)

  const { data: credentials, isLoading: isLoadingCredentials } =
    useCredentialsByType(CredentialType.NOTION)

  const config = undefined as any;
const isLoading = false;

// Pre-fill from DB config when loaded
  useEffect(() => {
    if (config) {
      setCredentialId(config.credentialId || "")
      setOperation(config.operation as NotionOp)
      setDatabaseId(config.databaseId)
      setPageId(config.pageId)
      setBlockContent(config.blockContent)
      setSearchQuery(config.searchQuery)
      setFilterJson(config.filterJson)
      setSortsJson(config.sortsJson)
      setPropertiesJson(config.propertiesJson)
      setNotionUserId(config.notionUserId)
      setPageSize(config.pageSize)
      setStartCursor(config.startCursor)
    }
  }, [config])

  // Reset when dialog opens with defaultValues
  useEffect(() => {
    if (open && !config) {
      setCredentialId(defaultValues.credentialId || "")
      setOperation((defaultValues.operation as NotionOp) || "QUERY_DATABASE")
      setDatabaseId(defaultValues.databaseId || "")
      setPageId(defaultValues.pageId || "")
      setBlockContent(defaultValues.blockContent || "")
      setSearchQuery(defaultValues.searchQuery || "")
      setFilterJson(defaultValues.filterJson || "{}")
      setSortsJson(defaultValues.sortsJson || "[]")
      setPropertiesJson(defaultValues.propertiesJson || "{}")
      setNotionUserId(defaultValues.notionUserId || "")
      setPageSize(defaultValues.pageSize ?? 100)
      setStartCursor(defaultValues.startCursor || "")
    }
  }, [open, defaultValues, config])

  const upsertMutation = { isPending: false, mutate: (args?: any) => {}, mutateAsync: async (args?: any) => {} } as any;

const isValid = !!credentialId.trim()

  const handleSave = () => {
    if (!isValid) return

    const values: NotionFormValues = {
      credentialId,
      operation,
      databaseId,
      pageId,
      blockContent,
      searchQuery,
      filterJson,
      sortsJson,
      propertiesJson,
      notionUserId,
      pageSize,
      startCursor,
    }

    onSubmit(values)

    if (workflowId && nodeId) {
      upsertMutation.mutate({
        workflowId,
        nodeId,
        credentialId: credentialId || undefined,
        operation,
        databaseId,
        pageId,
        blockContent,
        searchQuery,
        filterJson,
        sortsJson,
        propertiesJson,
        notionUserId,
        pageSize,
        startCursor,
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Notion</DialogTitle>
          <DialogDescription>
            Interact with Notion databases, pages, blocks, and users
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Credential Selector */}
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
              {!credentials?.length && !isLoadingCredentials && (
                <p className="text-xs text-muted-foreground">
                  No Notion credentials found.
                </p>
              )}
              <Link
                href="/credentials/new"
                className="text-xs text-primary hover:underline"
              >
                + Add new Notion credential
              </Link>
              {!credentialId && (
                <p className="text-xs text-destructive">
                  Credential is required
                </p>
              )}
            </div>

            <Separator />

            {/* Operation */}
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
                  <SelectItem value="QUERY_DATABASE">Query Database</SelectItem>
                  <SelectItem value="CREATE_DATABASE_PAGE">Create Page in Database</SelectItem>
                  <SelectItem value="UPDATE_DATABASE_PAGE">Update Page in Database</SelectItem>
                  <SelectItem value="GET_PAGE">Get Page</SelectItem>
                  <SelectItem value="ARCHIVE_PAGE">Archive Page</SelectItem>
                  <SelectItem value="APPEND_BLOCK">Append Block Children</SelectItem>
                  <SelectItem value="GET_BLOCK_CHILDREN">Get Block Children</SelectItem>
                  <SelectItem value="SEARCH">Search</SelectItem>
                  <SelectItem value="GET_DATABASE">Get Database</SelectItem>
                  <SelectItem value="GET_USER">Get User</SelectItem>
                  <SelectItem value="GET_USERS">List Users</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Database ID — for DB operations */}
            {DB_OPS.includes(operation) && (
              <div className="space-y-2">
                <Label>Database ID</Label>
                <Input
                  placeholder="e.g. 8c7a9d2e..."
                  value={databaseId}
                  onChange={(e) => setDatabaseId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  The Notion database ID. Tip: Use {"{{variables}}"} for dynamic
                  values
                </p>
              </div>
            )}

            {/* Page / Block ID — for page operations */}
            {PAGE_OPS.includes(operation) && (
              <div className="space-y-2">
                <Label>
                  {operation === "APPEND_BLOCK" || operation === "GET_BLOCK_CHILDREN"
                    ? "Block / Page ID"
                    : "Page ID"}
                </Label>
                <Input
                  placeholder="e.g. a1b2c3d4..."
                  value={pageId}
                  onChange={(e) => setPageId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {operation === "APPEND_BLOCK" || operation === "GET_BLOCK_CHILDREN"
                    ? "The block or page ID to operate on"
                    : "The Notion page ID"}
                </p>
              </div>
            )}

            {/* Properties JSON — for create/update */}
            {PROP_OPS.includes(operation) && (
              <div className="space-y-2">
                <Label>Properties (JSON)</Label>
                <Textarea
                  className="min-h-[120px] font-mono text-sm"
                  placeholder='{"Name": {"title": [{"text": {"content": "New Page"}}]}}'
                  value={propertiesJson}
                  onChange={(e) => setPropertiesJson(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Notion page properties as JSON. See Notion API docs for schema.
                </p>
              </div>
            )}

            {/* Block Content — for create page / append block */}
            {BLOCK_OPS.includes(operation) && (
              <div className="space-y-2">
                <Label>Block Content</Label>
                <Textarea
                  className="min-h-[100px] font-mono text-sm"
                  placeholder="Plain text or JSON array of Notion block objects"
                  value={blockContent}
                  onChange={(e) => setBlockContent(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Plain text (auto-wrapped as paragraph) or JSON array of block objects
                </p>
              </div>
            )}

            {/* Filter JSON — for query/search */}
            {FILTER_OPS.includes(operation) && (
              <div className="space-y-2">
                <Label>Filter (JSON)</Label>
                <Textarea
                  className="min-h-[80px] font-mono text-sm"
                  placeholder='{"property": "Status", "select": {"equals": "Done"}}'
                  value={filterJson}
                  onChange={(e) => setFilterJson(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Notion filter object. Leave as {"{ }"} for no filter.
                </p>
              </div>
            )}

            {/* Sorts JSON — for query/search */}
            {FILTER_OPS.includes(operation) && (
              <div className="space-y-2">
                <Label>Sorts (JSON array)</Label>
                <Textarea
                  className="min-h-[60px] font-mono text-sm"
                  placeholder='[{"property": "Created", "direction": "descending"}]'
                  value={sortsJson}
                  onChange={(e) => setSortsJson(e.target.value)}
                />
              </div>
            )}

            {/* Search query */}
            {operation === "SEARCH" && (
              <div className="space-y-2">
                <Label>Search Query</Label>
                <Input
                  placeholder="Search text..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Optional text to search for across pages and databases
                </p>
              </div>
            )}

            {/* User ID for GET_USER */}
            {operation === "GET_USER" && (
              <div className="space-y-2">
                <Label>User ID</Label>
                <Input
                  placeholder="e.g. d40e767c-..."
                  value={notionUserId}
                  onChange={(e) => setNotionUserId(e.target.value)}
                />
              </div>
            )}

            {/* Page size — for paginated results */}
            {PAGINATED_OPS.includes(operation) && (
              <div className="space-y-2">
                <Label>Page Size</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={pageSize}
                  onChange={(e) =>
                    setPageSize(Math.min(100, Math.max(1, Number(e.target.value) || 100)))
                  }
                />
              </div>
            )}

            {/* Start cursor — for pagination */}
            {PAGINATED_OPS.includes(operation) && (
              <div className="space-y-2">
                <Label>Start Cursor (optional)</Label>
                <Input
                  placeholder="For pagination — use {{notion.data.next_cursor}}"
                  value={startCursor}
                  onChange={(e) => setStartCursor(e.target.value)}
                />
              </div>
            )}

            {/* Output hints */}
            <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Output variables:
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                {OUTPUT_HINTS[operation]?.join("  ") ?? ""}
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                {"{{notion.timestamp}}"}
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
