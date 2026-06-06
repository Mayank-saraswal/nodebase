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
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useCredentialsByType } from "@/features/credentials/hooks/use-credentials"
import { CredentialType } from "@/generated/prisma"
import { GmailOperation } from "@/features/executions/enums"
import { CheckIcon, Loader2Icon } from "lucide-react"
import Link from "next/link"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

export interface GmailFormValues {
  credentialId?: string
  operation?: string
  variableName?: string
  to?: string
  cc?: string
  bcc?: string
  subject?: string
  body?: string
  isHtml?: boolean
  replyTo?: string
  messageId?: string
  threadId?: string
  searchQuery?: string
  maxResults?: number
  labelIds?: string
  includeBody?: boolean
  includeHeaders?: boolean
  pageToken?: string
  attachmentData?: string
  attachmentName?: string
  attachmentMime?: string
  attachmentId?: string
  attachmentOutputFormat?: string
  removeLabelIds?: string
  labelName?: string
  draftId?: string
  messageIds?: string
}

interface GmailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: GmailFormValues) => void
  defaultValues?: Partial<GmailFormValues>
  nodeId?: string
  workflowId?: string
}

type GmailOp = `${GmailOperation}`;

const OUTPUT_HINTS: Record<string, string[]> = {
  SEND: ["messageId", "threadId", "to", "subject", "sentAt"],
  REPLY: ["messageId", "threadId", "to", "subject", "repliedTo", "sentAt"],
  FORWARD: ["messageId", "threadId", "to", "subject", "forwardedFrom", "sentAt"],
  CREATE_DRAFT: ["draftId", "messageId", "threadId", "to", "subject", "createdAt"],
  GET_MESSAGE: ["messageId", "threadId", "from", "to", "subject", "date", "snippet", "bodyText", "isUnread", "isStarred", "attachmentCount", "labelIds"],
  LIST_MESSAGES: ["messages", "count", "nextPageToken", "messages.0.messageId", "messages.0.from", "messages.0.subject", "messages.0.isUnread"],
  SEARCH_MESSAGES: ["messages", "count", "nextPageToken", "query", "messages.0.messageId", "messages.0.from", "messages.0.subject"],
  ADD_LABEL: ["messageId", "threadId", "labelIds", "addedLabels"],
  REMOVE_LABEL: ["messageId", "threadId", "labelIds", "removedLabels"],
  MARK_READ: ["messageId", "threadId", "labelIds", "markedRead"],
  MARK_UNREAD: ["messageId", "threadId", "labelIds", "markedUnread"],
  MOVE_TO_TRASH: ["messageId", "threadId", "labelIds", "trashed"],
  GET_ATTACHMENT: ["data", "size", "sizeKb", "attachmentId", "messageId"],
  GET_THREAD: ["threadId", "messageCount", "messages", "conversationText", "firstMessage.from", "lastMessage.subject"],
  LIST_LABELS: ["labels", "count", "userLabels", "systemLabels"],
  CREATE_LABEL: ["labelId", "name", "type"],
  LIST_DRAFTS: ["drafts", "count", "nextPageToken", "drafts.0.draftId"],
  SEND_DRAFT: ["messageId", "threadId", "draftId", "sentAt"],
}

export const GmailDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  nodeId,
  workflowId,
}: GmailDialogProps) => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  // State for all fields
  const [credentialId, setCredentialId] = useState(defaultValues.credentialId || "")
  const [operation, setOperation] = useState<GmailOp>((defaultValues.operation as GmailOp) || "SEND")
  const [variableName, setVariableName] = useState(defaultValues.variableName || "gmail")
  const [to, setTo] = useState(defaultValues.to || "")
  const [cc, setCc] = useState(defaultValues.cc || "")
  const [bcc, setBcc] = useState(defaultValues.bcc || "")
  const [subject, setSubject] = useState(defaultValues.subject || "")
  const [body, setBody] = useState(defaultValues.body || "")
  const [isHtml, setIsHtml] = useState(defaultValues.isHtml ?? false)
  const [replyTo, setReplyTo] = useState(defaultValues.replyTo || "")
  const [messageId, setMessageId] = useState(defaultValues.messageId || "")
  const [threadId, setThreadId] = useState(defaultValues.threadId || "")
  const [searchQuery, setSearchQuery] = useState(defaultValues.searchQuery || "")
  const [maxResults, setMaxResults] = useState(defaultValues.maxResults ?? 10)
  const [labelIds, setLabelIds] = useState(defaultValues.labelIds || "")
  const [includeBody, setIncludeBody] = useState(defaultValues.includeBody ?? true)
  const [includeHeaders, setIncludeHeaders] = useState(defaultValues.includeHeaders ?? false)
  const [attachmentData, setAttachmentData] = useState(defaultValues.attachmentData || "")
  const [attachmentName, setAttachmentName] = useState(defaultValues.attachmentName || "")
  const [attachmentMime, setAttachmentMime] = useState(defaultValues.attachmentMime || "application/octet-stream")
  const [pageToken, setPageToken] = useState(defaultValues.pageToken || "")
  const [attachmentId, setAttachmentId] = useState(defaultValues.attachmentId || "")
  const [attachmentOutputFormat, setAttachmentOutputFormat] = useState(defaultValues.attachmentOutputFormat || "base64")
  const [labelName, setLabelName] = useState(defaultValues.labelName || "")
  const [draftId, setDraftId] = useState(defaultValues.draftId || "")
  const [saved, setSaved] = useState(false)

  const { data: credentials, isLoading: isLoadingCredentials } = useCredentialsByType(CredentialType.GMAIL_OAUTH)

  const config = undefined as any;
  const isLoading = false;

  // Pre-fill from DB config when loaded
  useEffect(() => {
    if (config) {
      setCredentialId((config as any).credentialId || "")
      setOperation((config as any).operation as GmailOp)
      setVariableName((config as any).variableName || "gmail")
      setTo((config as any).to)
      setCc((config as any).cc)
      setBcc((config as any).bcc)
      setSubject((config as any).subject)
      setBody((config as any).body)
      setIsHtml((config as any).isHtml)
      setReplyTo((config as any).replyTo)
      setMessageId((config as any).messageId)
      setThreadId((config as any).threadId)
      setSearchQuery((config as any).searchQuery)
      setMaxResults((config as any).maxResults)
      setLabelIds((config as any).labelIds)
      setIncludeBody((config as any).includeBody)
      setIncludeHeaders((config as any).includeHeaders)
      setAttachmentData((config as any).attachmentData)
      setAttachmentName((config as any).attachmentName)
      setAttachmentMime((config as any).attachmentMime)
      setPageToken((config as any).pageToken)
      setAttachmentId((config as any).attachmentId)
      setAttachmentOutputFormat((config as any).attachmentOutputFormat)
      setLabelName((config as any).labelName)
      setDraftId((config as any).draftId)
    }
  }, [config])

  // Reset when dialog opens with defaultValues
  useEffect(() => {
    if (open && !config) {
      setCredentialId(defaultValues.credentialId || "")
      setOperation((defaultValues.operation as GmailOp) || "SEND")
      setVariableName(defaultValues.variableName || "gmail")
      setTo(defaultValues.to || "")
      setCc(defaultValues.cc || "")
      setBcc(defaultValues.bcc || "")
      setSubject(defaultValues.subject || "")
      setBody(defaultValues.body || "")
      setIsHtml(defaultValues.isHtml ?? false)
      setReplyTo(defaultValues.replyTo || "")
      setMessageId(defaultValues.messageId || "")
      setThreadId(defaultValues.threadId || "")
      setSearchQuery(defaultValues.searchQuery || "")
      setMaxResults(defaultValues.maxResults ?? 10)
      setLabelIds(defaultValues.labelIds || "")
      setIncludeBody(defaultValues.includeBody ?? true)
      setIncludeHeaders(defaultValues.includeHeaders ?? false)
      setAttachmentData(defaultValues.attachmentData || "")
      setAttachmentName(defaultValues.attachmentName || "")
      setAttachmentMime(defaultValues.attachmentMime || "application/octet-stream")
      setPageToken(defaultValues.pageToken || "")
      setAttachmentId(defaultValues.attachmentId || "")
      setAttachmentOutputFormat(defaultValues.attachmentOutputFormat || "base64")
      setLabelName(defaultValues.labelName || "")
      setDraftId(defaultValues.draftId || "")
    }
  }, [open, defaultValues, config])

  const upsertMutation = { isPending: false, mutate: (args: any) => {}, mutateAsync: async (args: any) => {} } as any;
const testMutation = { isPending: false, mutate: (args: any) => {} } as any;

  const isValid = !!credentialId.trim()

  const handleSave = () => {
    if (!isValid) return

    const values: GmailFormValues = {
      credentialId, operation, variableName,
      to, cc, bcc, subject, body, isHtml,
      replyTo, messageId, threadId,
      searchQuery, maxResults, labelIds,
      includeBody, includeHeaders, pageToken,
      attachmentData, attachmentName, attachmentMime,
      attachmentId, attachmentOutputFormat,
      labelName, draftId,
    }

    onSubmit(values)

    if (workflowId && nodeId) {
      upsertMutation.mutate({
        workflowId,
        nodeId,
        credentialId,
        operation,
        variableName,
        to, cc, bcc, subject, body, isHtml,
        replyTo, messageId, threadId,
        searchQuery, maxResults, labelIds,
        includeBody, includeHeaders, pageToken,
        attachmentData, attachmentName, attachmentMime,
        attachmentId, attachmentOutputFormat,
        labelName, draftId,
      })
    }
  }

  const v = variableName || "gmail"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gmail — Email Integration</DialogTitle>
          <DialogDescription>
            Send, read, search, and organize emails with Gmail
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
                placeholder="gmail"
                value={variableName}
                onChange={(e) => setVariableName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {`Reference as {{${v}.messageId}}, {{${v}.subject}}`}
              </p>
            </div>

            <Separator />

            {/* 2. Credential Selector */}
            <div className="space-y-2">
              <Label>Gmail Credential</Label>
              <div className="flex gap-2">
                <Select
                  value={credentialId}
                  onValueChange={setCredentialId}
                  disabled={isLoadingCredentials || !(credentials as any)?.length}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select credential..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(credentials as any)?.map((credential: any) => {
                      const badgeClass = credential.type === "GMAIL_OAUTH"
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                      return (
                        <SelectItem key={credential.id} value={credential.id}>
                          <span className="flex items-center gap-2">
                            <span className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded ${badgeClass}`}>
                              {credential.type === "GMAIL_OAUTH" ? "OAuth2" : "Legacy"}
                            </span>
                            {credential.name}
                          </span>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                {credentialId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => testMutation.mutate({ credentialId })}
                    disabled={testMutation.isPending}
                  >
                    {testMutation.isPending ? <Loader2Icon className="size-3 animate-spin" /> : "Test"}
                  </Button>
                )}
              </div>
              {!(credentials as any)?.length && !isLoadingCredentials && (
                <p className="text-xs text-muted-foreground">
                  No Gmail credentials found.
                </p>
              )}
              <Link
                href="/api/auth/gmail"
                className="text-xs text-primary hover:underline"
              >
                + Connect new Gmail account
              </Link>
              {!credentialId && (
                <p className="text-xs text-destructive">
                  Credential is required
                </p>
              )}
            </div>

            <Separator />

            {/* 3. Operation (grouped) */}
            <div className="space-y-2">
              <Label>Operation</Label>
              <Select
                value={operation}
                onValueChange={(val) => setOperation(val as GmailOp)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Send &amp; Draft</SelectLabel>
                    <SelectItem value="SEND">Send Email</SelectItem>
                    <SelectItem value="REPLY">Reply to Email</SelectItem>
                    <SelectItem value="FORWARD">Forward Email</SelectItem>
                    <SelectItem value="CREATE_DRAFT">Create Draft</SelectItem>
                    <SelectItem value="SEND_DRAFT">Send Draft</SelectItem>
                    <SelectItem value="LIST_DRAFTS">List Drafts</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Read &amp; Search</SelectLabel>
                    <SelectItem value="GET_MESSAGE">Get Email</SelectItem>
                    <SelectItem value="LIST_MESSAGES">List Emails</SelectItem>
                    <SelectItem value="SEARCH_MESSAGES">Search Emails</SelectItem>
                    <SelectItem value="GET_THREAD">Get Thread</SelectItem>
                    <SelectItem value="GET_ATTACHMENT">Download Attachment</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Organize</SelectLabel>
                    <SelectItem value="ADD_LABEL">Add Label</SelectItem>
                    <SelectItem value="REMOVE_LABEL">Remove Label</SelectItem>
                    <SelectItem value="MARK_READ">Mark as Read</SelectItem>
                    <SelectItem value="MARK_UNREAD">Mark as Unread</SelectItem>
                    <SelectItem value="MOVE_TO_TRASH">Move to Trash</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Labels</SelectLabel>
                    <SelectItem value="LIST_LABELS">List Labels</SelectItem>
                    <SelectItem value="CREATE_LABEL">Create Label</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* 4. Dynamic fields based on operation */}

            {/* ── SEND ── */}
            {operation === "SEND" && (
              <>
                <div className="space-y-2">
                  <Label>To *</Label>
                  <Input
                    placeholder="customer@example.com or {{sheet.email}}"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CC</Label>
                  <Input
                    placeholder="cc@example.com"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>BCC</Label>
                  <Input
                    placeholder="bcc@example.com"
                    value={bcc}
                    onChange={(e) => setBcc(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subject *</Label>
                  <Input
                    placeholder="Your subject here"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {"Supports {{variables}}"}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Body *</Label>
                  <Textarea
                    className="min-h-[150px]"
                    placeholder="Write your email body here..."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={isHtml} onCheckedChange={setIsHtml} />
                  <Label>HTML Mode</Label>
                </div>
                <p className="text-xs text-muted-foreground -mt-3">
                  Enable to send HTML email
                </p>
                <div className="space-y-2">
                  <Label>Attachment Filename</Label>
                  <Input
                    placeholder="invoice.pdf"
                    value={attachmentName}
                    onChange={(e) => setAttachmentName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty for no attachment
                  </p>
                </div>
                {attachmentName && (
                  <>
                    <div className="space-y-2">
                      <Label>Attachment Content</Label>
                      <Textarea
                        className="min-h-[80px] font-mono"
                        placeholder="Base64 encoded content or plain text"
                        value={attachmentData}
                        onChange={(e) => setAttachmentData(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>MIME Type</Label>
                      <Input
                        placeholder="application/pdf"
                        value={attachmentMime}
                        onChange={(e) => setAttachmentMime(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </>
            )}

            {/* ── REPLY ── */}
            {operation === "REPLY" && (
              <>
                <div className="space-y-2">
                  <Label>Message ID *</Label>
                  <Input
                    placeholder="{{gmail.messageId}}"
                    value={messageId}
                    onChange={(e) => setMessageId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    ID of the email you want to reply to
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Reply Body *</Label>
                  <Textarea
                    className="min-h-[150px]"
                    placeholder="Write your reply..."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={isHtml} onCheckedChange={setIsHtml} />
                  <Label>HTML Mode</Label>
                </div>
                <div className="space-y-2">
                  <Label>Override Reply-To</Label>
                  <Input
                    placeholder="reply@example.com"
                    value={replyTo}
                    onChange={(e) => setReplyTo(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to reply to original sender
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>CC</Label>
                  <Input
                    placeholder="cc@example.com"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* ── FORWARD ── */}
            {operation === "FORWARD" && (
              <>
                <div className="space-y-2">
                  <Label>Message ID *</Label>
                  <Input
                    placeholder="{{gmail.messageId}}"
                    value={messageId}
                    onChange={(e) => setMessageId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Forward To *</Label>
                  <Input
                    placeholder="forward-to@example.com"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Additional Note</Label>
                  <Textarea
                    className="min-h-[100px]"
                    placeholder="Optional note prepended before the forwarded message"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Prepended before the forwarded message
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={isHtml} onCheckedChange={setIsHtml} />
                  <Label>HTML Mode</Label>
                </div>
              </>
            )}

            {/* ── GET_MESSAGE ── */}
            {operation === "GET_MESSAGE" && (
              <>
                <div className="space-y-2">
                  <Label>Message ID *</Label>
                  <Input
                    placeholder="{{gmail.messageId}}"
                    value={messageId}
                    onChange={(e) => setMessageId(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={includeBody} onCheckedChange={setIncludeBody} />
                  <Label>Include Full Body</Label>
                </div>
                {!includeBody && (
                  <p className="text-xs text-muted-foreground -mt-3">
                    Only subject, from, date returned (faster)
                  </p>
                )}
                <div className="flex items-center gap-3">
                  <Switch checked={includeHeaders} onCheckedChange={setIncludeHeaders} />
                  <Label>Include All Headers</Label>
                </div>
                <p className="text-xs text-muted-foreground -mt-3">
                  Returns From, To, CC, Reply-To, Date, Message-ID
                </p>
              </>
            )}

            {/* ── LIST_MESSAGES ── */}
            {operation === "LIST_MESSAGES" && (
              <>
                <div className="space-y-2">
                  <Label>Max Results</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={maxResults}
                    onChange={(e) => setMaxResults(Math.min(50, Math.max(1, parseInt(e.target.value) || 10)))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Filter Labels</Label>
                  <Input
                    placeholder="INBOX,UNREAD"
                    value={labelIds}
                    onChange={(e) => setLabelIds(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated label IDs. Leave empty for all mail
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Search Filter</Label>
                  <Input
                    placeholder="from:boss@company.com"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional Gmail query to filter list
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Page Token</Label>
                  <Input
                    placeholder="{{prevStep.nextPageToken}}"
                    value={pageToken}
                    onChange={(e) => setPageToken(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    For pagination. Leave empty for first page.
                  </p>
                </div>
              </>
            )}

            {/* ── SEARCH_MESSAGES ── */}
            {operation === "SEARCH_MESSAGES" && (
              <>
                <div className="space-y-2">
                  <Label>Search Query *</Label>
                  <Input
                    placeholder="from:vendor@example.com has:attachment"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 space-y-1 dark:border-blue-900 dark:bg-blue-950/30">
                  <p className="text-xs font-medium text-muted-foreground">Gmail query examples:</p>
                  <div className="text-xs text-muted-foreground font-mono space-y-0.5">
                    <p>from:user@example.com — from specific sender</p>
                    <p>to:me — sent to you</p>
                    <p>subject:Invoice — subject contains</p>
                    <p>is:unread — unread only</p>
                    <p>has:attachment — has files</p>
                    <p>after:2024/01/01 — after date</p>
                    <p>label:important — has label</p>
                    <p>newer_than:7d — last 7 days</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Max Results</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={maxResults}
                    onChange={(e) => setMaxResults(Math.min(50, Math.max(1, parseInt(e.target.value) || 10)))}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={includeBody} onCheckedChange={setIncludeBody} />
                  <Label>Include Full Body</Label>
                </div>
                <div className="space-y-2">
                  <Label>Page Token</Label>
                  <Input
                    placeholder="{{prevStep.nextPageToken}}"
                    value={pageToken}
                    onChange={(e) => setPageToken(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    For pagination. Leave empty for first page.
                  </p>
                </div>
              </>
            )}

            {/* ── ADD_LABEL ── */}
            {operation === "ADD_LABEL" && (
              <>
                <div className="space-y-2">
                  <Label>Message ID *</Label>
                  <Input
                    placeholder="{{gmail.messageId}}"
                    value={messageId}
                    onChange={(e) => setMessageId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Label IDs *</Label>
                  <Input
                    placeholder="STARRED,IMPORTANT or custom_label_id"
                    value={labelIds}
                    onChange={(e) => setLabelIds(e.target.value)}
                  />
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 space-y-1 dark:border-blue-900 dark:bg-blue-950/30">
                  <p className="text-xs font-medium text-muted-foreground">Label info:</p>
                  <p className="text-xs text-muted-foreground">
                    Built-in labels: STARRED, IMPORTANT, INBOX, SPAM, TRASH, UNREAD
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Custom label IDs can be found in Gmail Settings → Labels
                  </p>
                </div>
              </>
            )}

            {/* ── REMOVE_LABEL ── */}
            {operation === "REMOVE_LABEL" && (
              <>
                <div className="space-y-2">
                  <Label>Message ID *</Label>
                  <Input
                    placeholder="{{gmail.messageId}}"
                    value={messageId}
                    onChange={(e) => setMessageId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Label IDs *</Label>
                  <Input
                    placeholder="UNREAD,SPAM"
                    value={labelIds}
                    onChange={(e) => setLabelIds(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* ── MARK_READ / MARK_UNREAD / MOVE_TO_TRASH ── */}
            {(operation === "MARK_READ" || operation === "MARK_UNREAD" || operation === "MOVE_TO_TRASH") && (
              <div className="space-y-2">
                <Label>Message ID *</Label>
                <Input
                  placeholder="{{gmail.messageId}}"
                  value={messageId}
                  onChange={(e) => setMessageId(e.target.value)}
                />
              </div>
            )}

            {/* ── CREATE_DRAFT ── */}
            {operation === "CREATE_DRAFT" && (
              <>
                <div className="space-y-2">
                  <Label>To *</Label>
                  <Input
                    placeholder="customer@example.com"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CC</Label>
                  <Input
                    placeholder="cc@example.com"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>BCC</Label>
                  <Input
                    placeholder="bcc@example.com"
                    value={bcc}
                    onChange={(e) => setBcc(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input
                    placeholder="Draft subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Body</Label>
                  <Textarea
                    className="min-h-[150px]"
                    placeholder="Write your draft body here..."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={isHtml} onCheckedChange={setIsHtml} />
                  <Label>HTML Mode</Label>
                </div>
              </>
            )}

            {/* ── GET_ATTACHMENT ── */}
            {operation === "GET_ATTACHMENT" && (
              <>
                <div className="space-y-2">
                  <Label>Message ID *</Label>
                  <Input
                    placeholder="{{gmail.messageId}}"
                    value={messageId}
                    onChange={(e) => setMessageId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Attachment ID *</Label>
                  <Input
                    placeholder="{{gmail.attachments.0.attachmentId}}"
                    value={attachmentId}
                    onChange={(e) => setAttachmentId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Output Format</Label>
                  <Select
                    value={attachmentOutputFormat}
                    onValueChange={setAttachmentOutputFormat}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="base64">Base64</SelectItem>
                      <SelectItem value="text">Text (UTF-8)</SelectItem>
                      <SelectItem value="dataUrl">Data URL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* ── GET_THREAD ── */}
            {operation === "GET_THREAD" && (
              <>
                <div className="space-y-2">
                  <Label>Thread ID *</Label>
                  <Input
                    placeholder="{{gmail.threadId}}"
                    value={threadId}
                    onChange={(e) => setThreadId(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={includeBody} onCheckedChange={setIncludeBody} />
                  <Label>Include Full Body</Label>
                </div>
              </>
            )}

            {/* ── LIST_DRAFTS ── */}
            {operation === "LIST_DRAFTS" && (
              <>
                <div className="space-y-2">
                  <Label>Max Results</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={maxResults}
                    onChange={(e) => setMaxResults(Math.min(50, Math.max(1, parseInt(e.target.value) || 10)))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Page Token</Label>
                  <Input
                    placeholder="{{prevStep.nextPageToken}}"
                    value={pageToken}
                    onChange={(e) => setPageToken(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    For pagination. Leave empty for first page.
                  </p>
                </div>
              </>
            )}

            {/* ── SEND_DRAFT ── */}
            {operation === "SEND_DRAFT" && (
              <div className="space-y-2">
                <Label>Draft ID *</Label>
                <Input
                  placeholder="{{gmail.draftId}}"
                  value={draftId}
                  onChange={(e) => setDraftId(e.target.value)}
                />
              </div>
            )}

            {/* ── LIST_LABELS ── */}
            {operation === "LIST_LABELS" && (
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900 dark:bg-blue-950/30">
                <p className="text-xs text-muted-foreground">
                  Returns all Gmail labels including system labels. No inputs needed.
                </p>
              </div>
            )}

            {/* ── CREATE_LABEL ── */}
            {operation === "CREATE_LABEL" && (
              <div className="space-y-2">
                <Label>Label Name *</Label>
                <Input
                  placeholder="Processed"
                  value={labelName}
                  onChange={(e) => setLabelName(e.target.value)}
                />
              </div>
            )}

            {/* 5. Output variables */}
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
