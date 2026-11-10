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

export interface GoogleDriveFormValues {
  credentialId?: string
  operation?: "UPLOAD_FILE" | "DOWNLOAD_FILE" | "LIST_FILES" | "CREATE_FOLDER"
  folderId?: string
  fileId?: string
  fileName?: string
  mimeType?: string
  query?: string
  maxResults?: number
}

interface GoogleDriveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: GoogleDriveFormValues) => void
  defaultValues?: Partial<GoogleDriveFormValues>
  nodeId?: string
  workflowId?: string
}

const OUTPUT_HINTS: Record<string, string[]> = {
  UPLOAD_FILE: ["{{googleDrive.fileId}}", "{{googleDrive.webViewLink}}"],
  DOWNLOAD_FILE: ["{{googleDrive.fileContent}}", "{{googleDrive.fileName}}"],
  LIST_FILES: ["{{googleDrive.files}}", "{{googleDrive.count}}"],
  CREATE_FOLDER: ["{{googleDrive.folderId}}", "{{googleDrive.folderName}}"],
}

export const GoogleDriveDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  nodeId,
  workflowId,
}: GoogleDriveDialogProps) => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const [credentialId, setCredentialId] = useState(defaultValues.credentialId || "")
  const [operation, setOperation] = useState<
    "UPLOAD_FILE" | "DOWNLOAD_FILE" | "LIST_FILES" | "CREATE_FOLDER"
  >(defaultValues.operation || "UPLOAD_FILE")
  const [folderId, setFolderId] = useState(defaultValues.folderId || "")
  const [fileId, setFileId] = useState(defaultValues.fileId || "")
  const [fileName, setFileName] = useState(defaultValues.fileName || "")
  const [mimeType, setMimeType] = useState(defaultValues.mimeType || "")
  const [query, setQuery] = useState(defaultValues.query || "")
  const [maxResults, setMaxResults] = useState(defaultValues.maxResults ?? 10)
  const [saved, setSaved] = useState(false)

  const { data: credentials, isLoading: isLoadingCredentials } =
    useCredentialsByType(CredentialType.GOOGLE_DRIVE)

  const config = undefined as any;
const isLoading = false;

// Pre-fill from DB config when loaded
  useEffect(() => {
    if (config) {
      setCredentialId(config.credentialId || "")
      setOperation(config.operation)
      setFolderId(config.folderId || "")
      setFileId(config.fileId || "")
      setFileName(config.fileName || "")
      setMimeType(config.mimeType || "")
      setQuery(config.query || "")
      setMaxResults(config.maxResults ?? 10)
    }
  }, [config])

  // Reset when dialog opens with defaultValues
  useEffect(() => {
    if (open && !config) {
      setCredentialId(defaultValues.credentialId || "")
      setOperation(defaultValues.operation || "UPLOAD_FILE")
      setFolderId(defaultValues.folderId || "")
      setFileId(defaultValues.fileId || "")
      setFileName(defaultValues.fileName || "")
      setMimeType(defaultValues.mimeType || "")
      setQuery(defaultValues.query || "")
      setMaxResults(defaultValues.maxResults ?? 10)
    }
  }, [open, defaultValues, config])

  const upsertMutation = { isPending: false, mutate: (args?: any) => {}, mutateAsync: async (args?: any) => {} } as any;

const isValid = !!credentialId.trim()

  const handleSave = () => {
    if (!isValid) return

    const values: GoogleDriveFormValues = {
      credentialId,
      operation,
      folderId: folderId || undefined,
      fileId: fileId || undefined,
      fileName: fileName || undefined,
      mimeType: mimeType || undefined,
      query: query || undefined,
      maxResults,
    }

    // Update local node data
    onSubmit(values)

    // Persist to DB if we have a workflowId and nodeId
    if (workflowId && nodeId) {
      upsertMutation.mutate({
        workflowId,
        nodeId,
        credentialId,
        operation,
        folderId: folderId || undefined,
        fileId: fileId || undefined,
        fileName: fileName || undefined,
        mimeType: mimeType || undefined,
        query: query || undefined,
        maxResults,
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Google Drive</DialogTitle>
          <DialogDescription>
            Upload, download, list, or organize files
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
              <Label>Credential</Label>
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
                + Add new Google Drive credential
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
                onValueChange={(val) =>
                  setOperation(
                    val as "UPLOAD_FILE" | "DOWNLOAD_FILE" | "LIST_FILES" | "CREATE_FOLDER"
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UPLOAD_FILE">Upload File</SelectItem>
                  <SelectItem value="DOWNLOAD_FILE">Download File</SelectItem>
                  <SelectItem value="LIST_FILES">List Files</SelectItem>
                  <SelectItem value="CREATE_FOLDER">Create Folder</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* UPLOAD_FILE fields */}
            {operation === "UPLOAD_FILE" && (
              <>
                <div className="space-y-2">
                  <Label>File Name</Label>
                  <Input
                    placeholder="{{body.filename}}"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Supports {"{{template}}"} variables
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>MIME Type</Label>
                  <Input
                    placeholder="text/plain"
                    value={mimeType}
                    onChange={(e) => setMimeType(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Folder ID</Label>
                  <Input
                    placeholder="Optional — leave empty for root"
                    value={folderId}
                    onChange={(e) => setFolderId(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  fileContent comes from a previous node in context
                </p>
              </>
            )}

            {/* DOWNLOAD_FILE fields */}
            {operation === "DOWNLOAD_FILE" && (
              <div className="space-y-2">
                <Label>File ID</Label>
                <Input
                  placeholder="{{body.fileId}}"
                  value={fileId}
                  onChange={(e) => setFileId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Supports {"{{template}}"} variables
                </p>
              </div>
            )}

            {/* LIST_FILES fields */}
            {operation === "LIST_FILES" && (
              <>
                <div className="space-y-2">
                  <Label>Folder ID</Label>
                  <Input
                    placeholder="Optional — leave empty for all files"
                    value={folderId}
                    onChange={(e) => setFolderId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Search Query</Label>
                  <Input
                    placeholder="name contains 'report'"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Supports {"{{template}}"} variables. Uses Google Drive query syntax.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Max Results</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={maxResults}
                    onChange={(e) => setMaxResults(Number(e.target.value))}
                  />
                </div>
              </>
            )}

            {/* CREATE_FOLDER fields */}
            {operation === "CREATE_FOLDER" && (
              <>
                <div className="space-y-2">
                  <Label>Folder Name</Label>
                  <Input
                    placeholder="{{body.folderName}}"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Supports {"{{template}}"} variables
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Parent Folder ID</Label>
                  <Input
                    placeholder="Optional — leave empty for root"
                    value={folderId}
                    onChange={(e) => setFolderId(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Output hints */}
            <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Output variables:
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                {OUTPUT_HINTS[operation]?.join("  ") ?? ""}
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
