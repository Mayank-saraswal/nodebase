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

export interface WhatsAppFormValues {
  credentialId?: string
  operation?: string
  to?: string
  body?: string
  templateName?: string
  templateLang?: string
  templateParams?: string
  mediaUrl?: string
  mediaCaption?: string
  reactionEmoji?: string
  reactionMsgId?: string
}

interface WhatsAppDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: WhatsAppFormValues) => void
  defaultValues?: Partial<WhatsAppFormValues>
  nodeId?: string
  workflowId?: string
}

type WhatsAppOp =
  | "SEND_TEXT"
  | "SEND_TEMPLATE"
  | "SEND_IMAGE"
  | "SEND_DOCUMENT"
  | "SEND_REACTION"

const OUTPUT_HINTS: Record<string, string[]> = {
  SEND_TEXT: [
    "{{whatsapp.messageId}}",
    "{{whatsapp.to}}",
    "{{whatsapp.status}}",
  ],
  SEND_TEMPLATE: [
    "{{whatsapp.messageId}}",
    "{{whatsapp.to}}",
    "{{whatsapp.status}}",
  ],
  SEND_IMAGE: [
    "{{whatsapp.messageId}}",
    "{{whatsapp.to}}",
    "{{whatsapp.status}}",
  ],
  SEND_DOCUMENT: [
    "{{whatsapp.messageId}}",
    "{{whatsapp.to}}",
    "{{whatsapp.status}}",
  ],
  SEND_REACTION: [
    "{{whatsapp.messageId}}",
    "{{whatsapp.to}}",
    "{{whatsapp.status}}",
  ],
}

export const WhatsAppDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  nodeId,
  workflowId,
}: WhatsAppDialogProps) => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const [credentialId, setCredentialId] = useState(
    defaultValues.credentialId || ""
  )
  const [operation, setOperation] = useState<WhatsAppOp>(
    (defaultValues.operation as WhatsAppOp) || "SEND_TEXT"
  )
  const [to, setTo] = useState(defaultValues.to || "")
  const [body, setBody] = useState(defaultValues.body || "")
  const [templateName, setTemplateName] = useState(
    defaultValues.templateName || ""
  )
  const [templateLang, setTemplateLang] = useState(
    defaultValues.templateLang || "en_US"
  )
  const [templateParams, setTemplateParams] = useState(
    defaultValues.templateParams || "[]"
  )
  const [mediaUrl, setMediaUrl] = useState(defaultValues.mediaUrl || "")
  const [mediaCaption, setMediaCaption] = useState(
    defaultValues.mediaCaption || ""
  )
  const [reactionEmoji, setReactionEmoji] = useState(
    defaultValues.reactionEmoji || ""
  )
  const [reactionMsgId, setReactionMsgId] = useState(
    defaultValues.reactionMsgId || ""
  )
  const [saved, setSaved] = useState(false)

  const { data: credentials, isLoading: isLoadingCredentials } =
    useCredentialsByType(CredentialType.WHATSAPP)

  const config = undefined as any;
const isLoading = false;

// Pre-fill from DB config when loaded
  useEffect(() => {
    if (config) {
      setCredentialId(config.credentialId || "")
      setOperation(config.operation as WhatsAppOp)
      setTo(config.to)
      setBody(config.body)
      setTemplateName(config.templateName)
      setTemplateLang(config.templateLang)
      setTemplateParams(config.templateParams)
      setMediaUrl(config.mediaUrl)
      setMediaCaption(config.mediaCaption)
      setReactionEmoji(config.reactionEmoji)
      setReactionMsgId(config.reactionMsgId)
    }
  }, [config])

  // Reset when dialog opens with defaultValues
  useEffect(() => {
    if (open && !config) {
      setCredentialId(defaultValues.credentialId || "")
      setOperation((defaultValues.operation as WhatsAppOp) || "SEND_TEXT")
      setTo(defaultValues.to || "")
      setBody(defaultValues.body || "")
      setTemplateName(defaultValues.templateName || "")
      setTemplateLang(defaultValues.templateLang || "en_US")
      setTemplateParams(defaultValues.templateParams || "[]")
      setMediaUrl(defaultValues.mediaUrl || "")
      setMediaCaption(defaultValues.mediaCaption || "")
      setReactionEmoji(defaultValues.reactionEmoji || "")
      setReactionMsgId(defaultValues.reactionMsgId || "")
    }
  }, [open, defaultValues, config])

  const upsertMutation = { isPending: false, mutate: (args?: any) => {}, mutateAsync: async (args?: any) => {} } as any;

const isValid = !!credentialId.trim() && !!to.trim()

  const handleSave = () => {
    if (!isValid) return

    const values: WhatsAppFormValues = {
      credentialId,
      operation,
      to,
      body,
      templateName,
      templateLang,
      templateParams,
      mediaUrl,
      mediaCaption,
      reactionEmoji,
      reactionMsgId,
    }

    onSubmit(values)

    if (workflowId && nodeId) {
      upsertMutation.mutate({
        workflowId,
        nodeId,
        credentialId: credentialId || undefined,
        operation,
        to,
        body,
        templateName,
        templateLang,
        templateParams,
        mediaUrl,
        mediaCaption,
        reactionEmoji,
        reactionMsgId,
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>WhatsApp — Send Message</DialogTitle>
          <DialogDescription>
            Send messages via Meta WhatsApp Cloud API
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
              <Label>WhatsApp Credential</Label>
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
                  No WhatsApp credentials found.
                </p>
              )}
              <Link
                href="/credentials/new"
                className="text-xs text-primary hover:underline"
              >
                + Add new WhatsApp credential
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
                onValueChange={(val) => setOperation(val as WhatsAppOp)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SEND_TEXT">Send Text</SelectItem>
                  <SelectItem value="SEND_TEMPLATE">Send Template</SelectItem>
                  <SelectItem value="SEND_IMAGE">Send Image</SelectItem>
                  <SelectItem value="SEND_DOCUMENT">Send Document</SelectItem>
                  <SelectItem value="SEND_REACTION">Send Reaction</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Phone Number — always shown */}
            <div className="space-y-2">
              <Label>To (Phone Number)</Label>
              <Input
                placeholder="+919876543210"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                E.164 format. Tip: Use {"{{body.phone}}"} for dynamic values
              </p>
              {!to.trim() && (
                <p className="text-xs text-destructive">
                  Phone number is required
                </p>
              )}
            </div>

            <Separator />

            {/* SEND_TEXT fields */}
            {operation === "SEND_TEXT" && (
              <div className="space-y-2">
                <Label>Message Body</Label>
                <Textarea
                  className="min-h-[120px] font-mono text-sm"
                  placeholder="Hello {{body.name}}, your order is confirmed!"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Supports {"{{variables}}"} for dynamic values
                </p>
              </div>
            )}

            {/* SEND_TEMPLATE fields */}
            {operation === "SEND_TEMPLATE" && (
              <>
                <div className="space-y-2">
                  <Label>Template Name</Label>
                  <Input
                    placeholder="hello_world"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Input
                    placeholder="en_US"
                    value={templateLang}
                    onChange={(e) => setTemplateLang(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Parameters (JSON array)</Label>
                  <Textarea
                    className="min-h-[80px] font-mono text-sm"
                    placeholder='["Mayank", "Order #123"]'
                    value={templateParams}
                    onChange={(e) => setTemplateParams(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    JSON array of strings. Supports {"{{variables}}"} inside each
                    parameter.
                  </p>
                </div>
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900 dark:bg-yellow-950">
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    Template must be pre-approved in Meta Business Manager.
                    Required for first-contact messages.
                  </p>
                </div>
              </>
            )}

            {/* SEND_IMAGE fields */}
            {operation === "SEND_IMAGE" && (
              <>
                <div className="space-y-2">
                  <Label>Image URL</Label>
                  <Input
                    placeholder="https://example.com/image.jpg"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Caption (optional)</Label>
                  <Input
                    placeholder="Check out this image"
                    value={mediaCaption}
                    onChange={(e) => setMediaCaption(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* SEND_DOCUMENT fields */}
            {operation === "SEND_DOCUMENT" && (
              <>
                <div className="space-y-2">
                  <Label>Document URL</Label>
                  <Input
                    placeholder="https://example.com/document.pdf"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Caption (optional)</Label>
                  <Input
                    placeholder="Your invoice"
                    value={mediaCaption}
                    onChange={(e) => setMediaCaption(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* SEND_REACTION fields */}
            {operation === "SEND_REACTION" && (
              <>
                <div className="space-y-2">
                  <Label>Message ID to react to</Label>
                  <Input
                    placeholder="{{whatsapp.messageId}}"
                    value={reactionMsgId}
                    onChange={(e) => setReactionMsgId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use {"{{whatsapp.messageId}}"} from a previous WhatsApp send
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Emoji</Label>
                  <Input
                    placeholder="👍"
                    value={reactionEmoji}
                    onChange={(e) => setReactionEmoji(e.target.value)}
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
              <p className="text-xs text-muted-foreground font-mono">
                {"{{whatsapp.timestamp}}"}
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
