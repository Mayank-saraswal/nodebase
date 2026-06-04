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
import { Switch } from "@/components/ui/switch"
import { useTRPC } from "@/trpc/client"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCredentialsByType } from "@/features/credentials/hooks/use-credentials"
import { CredentialType } from "@/generated/prisma"
import { CheckIcon, Loader2Icon } from "lucide-react"
import Link from "next/link"
import { Separator } from "@/components/ui/separator"

/* ── Types ── */

export interface SlackFormValues {
  credentialId?: string
  operation?: string
  variableName?: string
  channel?: string
  message?: string
  threadTs?: string
  messageTs?: string
  channelName?: string
  channelTopic?: string
  channelPurpose?: string
  userId?: string
  emoji?: string
  blockKit?: string
  botName?: string
  iconEmoji?: string
  unfurlLinks?: boolean
  channelTypes?: string
  limit?: number
  excludeArchived?: boolean
  isPrivate?: boolean
  filename?: string
  fileType?: string
  title?: string
  initialComment?: string
  email?: string
  statusText?: string
  statusEmoji?: string
  statusExpiration?: string
  sendAt?: string
  content?: string
  fileId?: string
}

interface SlackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: SlackFormValues) => void
  defaultValues?: Partial<SlackFormValues>
  nodeId?: string
  workflowId?: string
}

type SlackOp =
  | "MESSAGE_SEND"
  | "MESSAGE_SEND_WEBHOOK"
  | "MESSAGE_UPDATE"
  | "MESSAGE_DELETE"
  | "MESSAGE_GET_PERMALINK"
  | "MESSAGE_SCHEDULE"
  | "CHANNEL_GET"
  | "CHANNEL_LIST"
  | "CHANNEL_CREATE"
  | "CHANNEL_ARCHIVE"
  | "CHANNEL_UNARCHIVE"
  | "CHANNEL_INVITE"
  | "CHANNEL_KICK"
  | "CHANNEL_SET_TOPIC"
  | "CHANNEL_SET_PURPOSE"
  | "USER_GET"
  | "USER_GET_BY_EMAIL"
  | "USER_LIST"
  | "USER_SET_STATUS"
  | "FILE_UPLOAD"
  | "FILE_GET"
  | "FILE_DELETE"
  | "REACTION_ADD"
  | "REACTION_REMOVE"
  | "REACTION_GET"

const DEFAULT_OPERATION: SlackOp = "MESSAGE_SEND_WEBHOOK"

const OPERATION_LABELS: Record<SlackOp, string> = {
  MESSAGE_SEND: "Send Message (API)",
  MESSAGE_SEND_WEBHOOK: "Send via Webhook",
  MESSAGE_UPDATE: "Update Message",
  MESSAGE_DELETE: "Delete Message",
  MESSAGE_GET_PERMALINK: "Get Permalink",
  MESSAGE_SCHEDULE: "Schedule Message",
  CHANNEL_GET: "Get Channel",
  CHANNEL_LIST: "List Channels",
  CHANNEL_CREATE: "Create Channel",
  CHANNEL_ARCHIVE: "Archive Channel",
  CHANNEL_UNARCHIVE: "Unarchive Channel",
  CHANNEL_INVITE: "Invite to Channel",
  CHANNEL_KICK: "Remove from Channel",
  CHANNEL_SET_TOPIC: "Set Topic",
  CHANNEL_SET_PURPOSE: "Set Purpose",
  USER_GET: "Get User",
  USER_GET_BY_EMAIL: "Get User by Email",
  USER_LIST: "List Users",
  USER_SET_STATUS: "Set Status",
  FILE_UPLOAD: "Upload File",
  FILE_GET: "Get File",
  FILE_DELETE: "Delete File",
  REACTION_ADD: "Add Reaction",
  REACTION_REMOVE: "Remove Reaction",
  REACTION_GET: "Get Reactions",
}

const OPERATION_GROUPS: { label: string; ops: SlackOp[] }[] = [
  {
    label: "Messages",
    ops: [
      "MESSAGE_SEND",
      "MESSAGE_SEND_WEBHOOK",
      "MESSAGE_UPDATE",
      "MESSAGE_DELETE",
      "MESSAGE_GET_PERMALINK",
      "MESSAGE_SCHEDULE",
    ],
  },
  {
    label: "Channels",
    ops: [
      "CHANNEL_GET",
      "CHANNEL_LIST",
      "CHANNEL_CREATE",
      "CHANNEL_ARCHIVE",
      "CHANNEL_UNARCHIVE",
      "CHANNEL_INVITE",
      "CHANNEL_KICK",
      "CHANNEL_SET_TOPIC",
      "CHANNEL_SET_PURPOSE",
    ],
  },
  {
    label: "Users",
    ops: ["USER_GET", "USER_GET_BY_EMAIL", "USER_LIST", "USER_SET_STATUS"],
  },
  {
    label: "Files",
    ops: ["FILE_UPLOAD", "FILE_GET", "FILE_DELETE"],
  },
  {
    label: "Reactions",
    ops: ["REACTION_ADD", "REACTION_REMOVE", "REACTION_GET"],
  },
]

/* ── Output variable hints per operation ── */

const OUTPUT_HINTS: Partial<Record<SlackOp, string[]>> = {
  MESSAGE_SEND: ["messageTs", "channelId"],
  MESSAGE_SEND_WEBHOOK: ["success"],
  MESSAGE_UPDATE: ["messageTs", "channel"],
  MESSAGE_DELETE: ["messageTs", "channel"],
  MESSAGE_GET_PERMALINK: ["permalink"],
  MESSAGE_SCHEDULE: ["scheduledMessageId", "postAt", "channel"],
  CHANNEL_GET: ["channelId", "name", "memberCount"],
  CHANNEL_LIST: ["channels", "count"],
  CHANNEL_CREATE: ["channelId", "name", "memberCount"],
  CHANNEL_ARCHIVE: ["ok", "channel"],
  CHANNEL_UNARCHIVE: ["ok", "channel"],
  CHANNEL_INVITE: ["ok", "channel"],
  CHANNEL_KICK: ["ok", "channel"],
  CHANNEL_SET_TOPIC: ["ok", "topic"],
  CHANNEL_SET_PURPOSE: ["ok", "purpose"],
  USER_GET: ["userId", "email", "displayName"],
  USER_GET_BY_EMAIL: ["userId", "email", "displayName"],
  USER_LIST: ["users", "count"],
  USER_SET_STATUS: ["ok", "statusText"],
  FILE_UPLOAD: ["fileId", "permalink"],
  FILE_GET: ["id", "name", "permalink"],
  FILE_DELETE: ["ok", "fileId"],
  REACTION_ADD: ["ok", "emoji"],
  REACTION_REMOVE: ["ok", "emoji"],
  REACTION_GET: ["reactions"],
}

const needsCredential = (op: SlackOp) => op !== "MESSAGE_SEND_WEBHOOK"

const EXPIRATION_OPTIONS = [
  { label: "Never", value: "0" },
  { label: "30 minutes", value: "1800" },
  { label: "1 hour", value: "3600" },
  { label: "4 hours", value: "14400" },
  { label: "Today", value: "today" },
  { label: "This week", value: "this_week" },
]

function computeExpiration(value: string): string {
  if (value === "today") {
    const now = new Date()
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59
    )
    return String(Math.floor(endOfDay.getTime() / 1000))
  }
  if (value === "this_week") {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek
    const endOfWeek = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + daysUntilSunday,
      23,
      59,
      59
    )
    return String(Math.floor(endOfWeek.getTime() / 1000))
  }
  return value
}

/* ── Component ── */

export const SlackDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  nodeId,
  workflowId,
}: SlackDialogProps) => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  // ── State ──
  const [credentialId, setCredentialId] = useState(
    defaultValues.credentialId || ""
  )
  const [operation, setOperation] = useState<SlackOp>(
    (defaultValues.operation as SlackOp) || DEFAULT_OPERATION
  )
  const [variableName, setVariableName] = useState(
    defaultValues.variableName || "slack"
  )
  const [channel, setChannel] = useState(defaultValues.channel || "")
  const [message, setMessage] = useState(defaultValues.message || "")
  const [threadTs, setThreadTs] = useState(defaultValues.threadTs || "")
  const [messageTs, setMessageTs] = useState(defaultValues.messageTs || "")
  const [channelName, setChannelName] = useState(
    defaultValues.channelName || ""
  )
  const [channelTopic, setChannelTopic] = useState(
    defaultValues.channelTopic || ""
  )
  const [channelPurpose, setChannelPurpose] = useState(
    defaultValues.channelPurpose || ""
  )
  const [slackUserId, setSlackUserId] = useState(defaultValues.userId || "")
  const [emoji, setEmoji] = useState(defaultValues.emoji || "")
  const [blockKit, setBlockKit] = useState(defaultValues.blockKit || "")
  const [botName, setBotName] = useState(defaultValues.botName || "")
  const [iconEmoji, setIconEmoji] = useState(defaultValues.iconEmoji || "")
  const [unfurlLinks, setUnfurlLinks] = useState(
    defaultValues.unfurlLinks ?? true
  )
  const [channelTypes, setChannelTypes] = useState(
    defaultValues.channelTypes || "public_channel,private_channel"
  )
  const [limit, setLimit] = useState(defaultValues.limit ?? 100)
  const [excludeArchived, setExcludeArchived] = useState(
    defaultValues.excludeArchived ?? true
  )
  const [isPrivate, setIsPrivate] = useState(defaultValues.isPrivate ?? false)
  const [filename, setFilename] = useState(defaultValues.filename || "")
  const [fileType, setFileType] = useState(defaultValues.fileType || "")
  const [title, setTitle] = useState(defaultValues.title || "")
  const [initialComment, setInitialComment] = useState(
    defaultValues.initialComment || ""
  )
  const [email, setEmail] = useState(defaultValues.email || "")
  const [statusText, setStatusText] = useState(defaultValues.statusText || "")
  const [statusEmoji, setStatusEmoji] = useState(
    defaultValues.statusEmoji || ""
  )
  const [statusExpiration, setStatusExpiration] = useState(
    defaultValues.statusExpiration || "0"
  )
  const [sendAt, setSendAt] = useState(defaultValues.sendAt || "")
  const [content, setContent] = useState(defaultValues.content || "")
  const [fileId, setFileId] = useState(defaultValues.fileId || "")
  const [saved, setSaved] = useState(false)

  // ── Queries ──
  const { data: credentials, isLoading: isLoadingCredentials } =
    useCredentialsByType(CredentialType.SLACK)

  const { data: config, isLoading } = useQuery(
    trpc.slack.getByNodeId.queryOptions(
      { nodeId: nodeId! },
      { enabled: open && !!nodeId }
    )
  )

  // Pre-fill from DB config
  useEffect(() => {
    if (config) {
      setCredentialId(config.credentialId || "")
      setOperation(config.operation as SlackOp)
      setVariableName(config.variableName)
      setChannel(config.channel)
      setMessage(config.message)
      setThreadTs(config.threadTs)
      setMessageTs(config.messageTs)
      setChannelName(config.channelName)
      setChannelTopic(config.channelTopic)
      setChannelPurpose(config.channelPurpose)
      setSlackUserId(config.userId)
      setEmoji(config.emoji)
      setBlockKit(config.blockKit)
      setBotName(config.botName)
      setIconEmoji(config.iconEmoji)
      setUnfurlLinks(config.unfurlLinks)
      setChannelTypes(config.channelTypes)
      setLimit(config.limit)
      setExcludeArchived(config.excludeArchived)
      setIsPrivate(config.isPrivate)
      setFilename(config.filename)
      setFileType(config.fileType)
      setTitle(config.title)
      setInitialComment(config.initialComment)
      setEmail(config.email)
      setStatusText(config.statusText)
      setStatusEmoji(config.statusEmoji)
      setStatusExpiration(config.statusExpiration || "0")
      setSendAt(config.sendAt)
      setContent(config.content)
      setFileId(config.fileId)
    }
  }, [config])

  // Reset when dialog opens with defaultValues
  useEffect(() => {
    if (open && !config) {
      setCredentialId(defaultValues.credentialId || "")
      setOperation(
        (defaultValues.operation as SlackOp) || DEFAULT_OPERATION
      )
      setVariableName(defaultValues.variableName || "slack")
      setChannel(defaultValues.channel || "")
      setMessage(defaultValues.message || "")
      setThreadTs(defaultValues.threadTs || "")
      setMessageTs(defaultValues.messageTs || "")
      setChannelName(defaultValues.channelName || "")
      setChannelTopic(defaultValues.channelTopic || "")
      setChannelPurpose(defaultValues.channelPurpose || "")
      setSlackUserId(defaultValues.userId || "")
      setEmoji(defaultValues.emoji || "")
      setBlockKit(defaultValues.blockKit || "")
      setBotName(defaultValues.botName || "")
      setIconEmoji(defaultValues.iconEmoji || "")
      setUnfurlLinks(defaultValues.unfurlLinks ?? true)
      setChannelTypes(
        defaultValues.channelTypes || "public_channel,private_channel"
      )
      setLimit(defaultValues.limit ?? 100)
      setExcludeArchived(defaultValues.excludeArchived ?? true)
      setIsPrivate(defaultValues.isPrivate ?? false)
      setFilename(defaultValues.filename || "")
      setFileType(defaultValues.fileType || "")
      setTitle(defaultValues.title || "")
      setInitialComment(defaultValues.initialComment || "")
      setEmail(defaultValues.email || "")
      setStatusText(defaultValues.statusText || "")
      setStatusEmoji(defaultValues.statusEmoji || "")
      setStatusExpiration(defaultValues.statusExpiration || "0")
      setSendAt(defaultValues.sendAt || "")
      setContent(defaultValues.content || "")
      setFileId(defaultValues.fileId || "")
    }
  }, [open, defaultValues, config])

  // ── Mutation ──
  const upsertMutation = useMutation(
    trpc.slack.upsert.mutationOptions({
      onSuccess: () => {
        if (nodeId) {
          queryClient.invalidateQueries(
            trpc.slack.getByNodeId.queryOptions({ nodeId })
          )
        }
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      },
    })
  )

  const isValid = needsCredential(operation)
    ? !!credentialId.trim()
    : true

  const handleSave = () => {
    if (!isValid) return

    const resolvedExpiration = computeExpiration(statusExpiration)

    const values: SlackFormValues = {
      credentialId,
      operation,
      variableName,
      channel,
      message,
      threadTs,
      messageTs,
      channelName,
      channelTopic,
      channelPurpose,
      userId: slackUserId,
      emoji,
      blockKit,
      botName,
      iconEmoji,
      unfurlLinks,
      channelTypes,
      limit,
      excludeArchived,
      isPrivate,
      filename,
      fileType,
      title,
      initialComment,
      email,
      statusText,
      statusEmoji,
      statusExpiration: resolvedExpiration,
      sendAt,
      content,
      fileId,
    }

    onSubmit(values)

    if (workflowId && nodeId) {
      upsertMutation.mutate({
        workflowId,
        nodeId,
        credentialId: credentialId || undefined,
        operation,
        variableName,
        channel,
        message,
        threadTs,
        messageTs,
        channelName,
        channelTopic,
        channelPurpose,
        userId: slackUserId,
        emoji,
        blockKit,
        botName,
        iconEmoji,
        unfurlLinks,
        channelTypes,
        limit,
        excludeArchived,
        isPrivate,
        filename,
        fileType,
        title,
        initialComment,
        email,
        statusText,
        statusEmoji,
        statusExpiration: resolvedExpiration,
        sendAt,
        content,
        fileId,
      })
    }
  }

  const v = variableName || "slack"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Slack Configuration</DialogTitle>
          <DialogDescription>
            Configure Slack API operations for this node
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
                placeholder="slack"
                value={variableName}
                onChange={(e) => setVariableName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {`Reference as {{${v}.messageTs}}, {{${v}.channelId}}`}
              </p>
            </div>

            <Separator />

            {/* 2. Credential Selector */}
            <div className="space-y-2">
              <Label>Slack Credential</Label>
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
                  No Slack credentials found.
                </p>
              )}
              <Link
                href="/credentials/new"
                className="text-xs text-primary hover:underline"
              >
                + Add Slack credential
              </Link>
              {needsCredential(operation) && !credentialId && (
                <p className="text-xs text-destructive">
                  Credential is required for API operations
                </p>
              )}
            </div>

            <Separator />

            {/* 3. Operation Selector */}
            <div className="space-y-2">
              <Label>Operation</Label>
              <Select
                value={operation}
                onValueChange={(val) => setOperation(val as SlackOp)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPERATION_GROUPS.map((group) => (
                    <div key={group.label}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        {group.label}
                      </div>
                      {group.ops.map((op) => (
                        <SelectItem key={op} value={op}>
                          {OPERATION_LABELS[op]}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* 4. Dynamic Fields */}

            {/* ── MESSAGE_SEND ── */}
            {operation === "MESSAGE_SEND" && (
              <>
                <div className="space-y-2">
                  <Label>
                    Channel <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="#general or C1234567"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {"Channel name, ID, or {{variable}}"}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>
                    Message Text <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    className="min-h-[100px]"
                    placeholder="Hello {{body.name}}!"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {"Use *bold*, _italic_, `code`"}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Block Kit JSON</Label>
                  <Textarea
                    className="min-h-[80px] font-mono text-sm"
                    placeholder='[{"type":"section","text":{"type":"mrkdwn","text":"..."}}]'
                    value={blockKit}
                    onChange={(e) => setBlockKit(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Advanced: Block Kit JSON for rich messages
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Reply to Thread</Label>
                  <Input
                    placeholder={`{{${v}.messageTs}}`}
                    value={threadTs}
                    onChange={(e) => setThreadTs(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Override Bot Name</Label>
                  <Input
                    value={botName}
                    onChange={(e) => setBotName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Override Icon Emoji</Label>
                  <Input
                    placeholder=":robot_face:"
                    value={iconEmoji}
                    onChange={(e) => setIconEmoji(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Unfurl Links</Label>
                  <Switch
                    checked={unfurlLinks}
                    onCheckedChange={setUnfurlLinks}
                  />
                </div>
              </>
            )}

            {/* ── MESSAGE_SEND_WEBHOOK ── */}
            {operation === "MESSAGE_SEND_WEBHOOK" && (
              <>
                <div className="space-y-2">
                  <Label>
                    Message Text <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    className="min-h-[100px]"
                    placeholder="Hello from Nodebase!"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Webhook URL comes from your Slack credential
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Block Kit JSON</Label>
                  <Textarea
                    className="min-h-[80px] font-mono text-sm"
                    placeholder='[{"type":"section","text":{"type":"mrkdwn","text":"..."}}]'
                    value={blockKit}
                    onChange={(e) => setBlockKit(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* ── MESSAGE_UPDATE ── */}
            {operation === "MESSAGE_UPDATE" && (
              <>
                <div className="space-y-2">
                  <Label>
                    Channel <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="#general or C1234567"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Message Timestamp{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder={`{{${v}.messageTs}}`}
                    value={messageTs}
                    onChange={(e) => setMessageTs(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    New Text <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    className="min-h-[100px]"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Block Kit JSON</Label>
                  <Textarea
                    className="min-h-[80px] font-mono text-sm"
                    value={blockKit}
                    onChange={(e) => setBlockKit(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* ── MESSAGE_DELETE ── */}
            {operation === "MESSAGE_DELETE" && (
              <>
                <div className="space-y-2">
                  <Label>
                    Channel <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="#general or C1234567"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Message Timestamp{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder={`{{${v}.messageTs}}`}
                    value={messageTs}
                    onChange={(e) => setMessageTs(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* ── MESSAGE_GET_PERMALINK ── */}
            {operation === "MESSAGE_GET_PERMALINK" && (
              <>
                <div className="space-y-2">
                  <Label>
                    Channel <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="C1234567"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Message Timestamp{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={messageTs}
                    onChange={(e) => setMessageTs(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* ── MESSAGE_SCHEDULE ── */}
            {operation === "MESSAGE_SCHEDULE" && (
              <>
                <div className="space-y-2">
                  <Label>
                    Channel <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="#general or C1234567"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Message Text <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    className="min-h-[100px]"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Send At <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="Unix timestamp e.g. 1735689600"
                    value={sendAt}
                    onChange={(e) => setSendAt(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Block Kit JSON</Label>
                  <Textarea
                    className="min-h-[80px] font-mono text-sm"
                    value={blockKit}
                    onChange={(e) => setBlockKit(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* ── CHANNEL_GET ── */}
            {operation === "CHANNEL_GET" && (
              <div className="space-y-2">
                <Label>
                  Channel <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="C1234567 or #general"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                />
              </div>
            )}

            {/* ── CHANNEL_LIST ── */}
            {operation === "CHANNEL_LIST" && (
              <>
                <div className="space-y-2">
                  <Label>Channel Types</Label>
                  <Input
                    value={channelTypes}
                    onChange={(e) => setChannelTypes(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Limit</Label>
                  <Input
                    type="number"
                    value={limit}
                    onChange={(e) =>
                      setLimit(parseInt(e.target.value) || 100)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Exclude Archived</Label>
                  <Switch
                    checked={excludeArchived}
                    onCheckedChange={setExcludeArchived}
                  />
                </div>
              </>
            )}

            {/* ── CHANNEL_CREATE ── */}
            {operation === "CHANNEL_CREATE" && (
              <>
                <div className="space-y-2">
                  <Label>
                    Channel Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Private Channel</Label>
                  <Switch
                    checked={isPrivate}
                    onCheckedChange={setIsPrivate}
                  />
                </div>
              </>
            )}

            {/* ── CHANNEL_ARCHIVE / CHANNEL_UNARCHIVE ── */}
            {(operation === "CHANNEL_ARCHIVE" ||
              operation === "CHANNEL_UNARCHIVE") && (
              <div className="space-y-2">
                <Label>
                  Channel <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="C1234567"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                />
              </div>
            )}

            {/* ── CHANNEL_INVITE ── */}
            {operation === "CHANNEL_INVITE" && (
              <>
                <div className="space-y-2">
                  <Label>
                    Channel <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="C1234567"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    User IDs <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="U123,U456"
                    value={slackUserId}
                    onChange={(e) => setSlackUserId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated Slack user IDs
                  </p>
                </div>
              </>
            )}

            {/* ── CHANNEL_KICK ── */}
            {operation === "CHANNEL_KICK" && (
              <>
                <div className="space-y-2">
                  <Label>
                    Channel <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="C1234567"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    User ID <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="U1234567"
                    value={slackUserId}
                    onChange={(e) => setSlackUserId(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* ── CHANNEL_SET_TOPIC ── */}
            {operation === "CHANNEL_SET_TOPIC" && (
              <>
                <div className="space-y-2">
                  <Label>
                    Channel <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="C1234567"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Topic <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    value={channelTopic}
                    onChange={(e) => setChannelTopic(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* ── CHANNEL_SET_PURPOSE ── */}
            {operation === "CHANNEL_SET_PURPOSE" && (
              <>
                <div className="space-y-2">
                  <Label>
                    Channel <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="C1234567"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Purpose <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    value={channelPurpose}
                    onChange={(e) => setChannelPurpose(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* ── USER_GET ── */}
            {operation === "USER_GET" && (
              <div className="space-y-2">
                <Label>
                  User ID <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="U1234567"
                  value={slackUserId}
                  onChange={(e) => setSlackUserId(e.target.value)}
                />
              </div>
            )}

            {/* ── USER_GET_BY_EMAIL ── */}
            {operation === "USER_GET_BY_EMAIL" && (
              <div className="space-y-2">
                <Label>
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            )}

            {/* ── USER_LIST ── */}
            {operation === "USER_LIST" && (
              <div className="space-y-2">
                <Label>Limit</Label>
                <Input
                  type="number"
                  value={limit}
                  onChange={(e) =>
                    setLimit(parseInt(e.target.value) || 100)
                  }
                />
              </div>
            )}

            {/* ── USER_SET_STATUS ── */}
            {operation === "USER_SET_STATUS" && (
              <>
                <div className="space-y-2">
                  <Label>
                    Status Text <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    maxLength={100}
                    value={statusText}
                    onChange={(e) => setStatusText(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status Emoji</Label>
                  <Input
                    placeholder=":calendar:"
                    value={statusEmoji}
                    onChange={(e) => setStatusEmoji(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expires In</Label>
                  <Select
                    value={statusExpiration}
                    onValueChange={setStatusExpiration}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPIRATION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* ── FILE_UPLOAD ── */}
            {operation === "FILE_UPLOAD" && (
              <>
                <div className="space-y-2">
                  <Label>
                    Channel <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="C1234567"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    File Content <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    className="min-h-[120px] font-mono text-sm"
                    placeholder="Text content, CSV data, code, or any text"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Text content, CSV data, code, or any text
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>
                    Filename <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="report.csv"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>File Type</Label>
                  <Input
                    placeholder="csv, text, javascript"
                    value={fileType}
                    onChange={(e) => setFileType(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Initial Comment</Label>
                  <Input
                    value={initialComment}
                    onChange={(e) => setInitialComment(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Message to post alongside the file
                  </p>
                </div>
              </>
            )}

            {/* ── FILE_GET / FILE_DELETE ── */}
            {(operation === "FILE_GET" || operation === "FILE_DELETE") && (
              <div className="space-y-2">
                <Label>
                  File ID <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="F01234567"
                  value={fileId}
                  onChange={(e) => setFileId(e.target.value)}
                />
              </div>
            )}

            {/* ── REACTION_ADD / REACTION_REMOVE ── */}
            {(operation === "REACTION_ADD" ||
              operation === "REACTION_REMOVE") && (
              <>
                <div className="space-y-2">
                  <Label>
                    Channel <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="C1234567"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Message Timestamp{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder={`{{${v}.messageTs}}`}
                    value={messageTs}
                    onChange={(e) => setMessageTs(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Emoji <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="thumbsup"
                    value={emoji}
                    onChange={(e) => setEmoji(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Emoji name without colons
                  </p>
                </div>
              </>
            )}

            {/* ── REACTION_GET ── */}
            {operation === "REACTION_GET" && (
              <>
                <div className="space-y-2">
                  <Label>
                    Channel <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="C1234567"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Message Timestamp{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={messageTs}
                    onChange={(e) => setMessageTs(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* 5. Output variables */}
            <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Output variables:
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                {OUTPUT_HINTS[operation]
                  ?.map((f) => `{{${v}.${f}}}`)
                  .join("  ") ?? ""}
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
