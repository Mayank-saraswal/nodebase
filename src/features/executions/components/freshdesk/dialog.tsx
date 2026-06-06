"use client"

import { useEffect, useMemo, useState } from "react"
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
import { FreshdeskOperation } from "@/features/executions/enums"
import { CheckIcon, Loader2Icon } from "lucide-react"
import Link from "next/link"
import { Separator } from "@/components/ui/separator"

export interface FreshdeskFormValues {
  credentialId?: string
  operation?: FreshdeskOperation
  variableName?: string

  // Ticket
  subject?: string
  description?: string
  descriptionHtml?: string
  email?: string
  name?: string
  phone?: string
  mobilePhone?: string
  ticketId?: string
  priority?: number
  status?: number
  source?: number
  ticketType?: string
  responderId?: string
  groupId?: string
  productId?: string
  companyId?: string
  fwdEmail?: string
  tags?: string
  customFields?: string

  // Note
  noteId?: string
  noteBody?: string
  notePrivate?: boolean
  noteUserId?: string

  // Contact
  contactId?: string
  contactEmail?: string
  contactName?: string
  contactPhone?: string
  contactMobile?: string
  contactJobTitle?: string
  contactTimeZone?: string
  contactLanguage?: string
  contactTags?: string
  contactCompanyId?: string
  mergeTargetId?: string

  // Company
  companyName?: string
  companyDomain?: string
  companyDescription?: string
  companyNote?: string

  // Agent
  agentId?: string

  // Reply
  replyBody?: string
  replyFrom?: string
  replyTo?: string
  replyCc?: string
  replyBcc?: string

  // Search / filter
  searchQuery?: string
  filterBy?: string
  orderBy?: string
  orderType?: string
  page?: number
  perPage?: number
  updatedSince?: string
  includeStats?: boolean

  continueOnFail?: boolean
}

interface FreshdeskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: FreshdeskFormValues) => void
  defaultValues?: Partial<FreshdeskFormValues>
  nodeId?: string
  workflowId?: string
}

const OP_GROUPS: Array<{ label: string; ops: FreshdeskOperation[] }> = [
  {
    label: "Tickets",
    ops: [
      FreshdeskOperation.CREATE_TICKET,
      FreshdeskOperation.GET_TICKET,
      FreshdeskOperation.UPDATE_TICKET,
      FreshdeskOperation.DELETE_TICKET,
      FreshdeskOperation.LIST_TICKETS,
      FreshdeskOperation.SEARCH_TICKETS,
      FreshdeskOperation.GET_TICKET_FIELDS,
      FreshdeskOperation.RESTORE_TICKET,
    ],
  },
  {
    label: "Ticket Notes",
    ops: [
      FreshdeskOperation.ADD_NOTE,
      FreshdeskOperation.LIST_NOTES,
      FreshdeskOperation.UPDATE_NOTE,
      FreshdeskOperation.DELETE_NOTE,
    ],
  },
  {
    label: "Contacts",
    ops: [
      FreshdeskOperation.CREATE_CONTACT,
      FreshdeskOperation.GET_CONTACT,
      FreshdeskOperation.UPDATE_CONTACT,
      FreshdeskOperation.DELETE_CONTACT,
      FreshdeskOperation.LIST_CONTACTS,
      FreshdeskOperation.SEARCH_CONTACTS,
      FreshdeskOperation.MERGE_CONTACT,
    ],
  },
  {
    label: "Companies",
    ops: [
      FreshdeskOperation.CREATE_COMPANY,
      FreshdeskOperation.GET_COMPANY,
      FreshdeskOperation.UPDATE_COMPANY,
      FreshdeskOperation.DELETE_COMPANY,
      FreshdeskOperation.LIST_COMPANIES,
    ],
  },
  {
    label: "Agents",
    ops: [
      FreshdeskOperation.LIST_AGENTS,
      FreshdeskOperation.GET_AGENT,
      FreshdeskOperation.UPDATE_AGENT,
    ],
  },
  {
    label: "Conversations",
    ops: [
      FreshdeskOperation.LIST_CONVERSATIONS,
      FreshdeskOperation.SEND_REPLY,
      FreshdeskOperation.CREATE_OUTBOUND_EMAIL,
    ],
  },
  {
    label: "Generic",
    ops: [FreshdeskOperation.GET_TICKET_STATS],
  },
]

const OP_LABEL: Record<string, string> = {
  CREATE_TICKET: "Create Ticket",
  GET_TICKET: "Get Ticket",
  UPDATE_TICKET: "Update Ticket",
  DELETE_TICKET: "Delete Ticket",
  LIST_TICKETS: "List Tickets",
  SEARCH_TICKETS: "Search Tickets",
  GET_TICKET_FIELDS: "Get Ticket Fields",
  RESTORE_TICKET: "Restore Ticket",
  ADD_NOTE: "Add Note",
  LIST_NOTES: "List Notes",
  UPDATE_NOTE: "Update Note",
  DELETE_NOTE: "Delete Note",
  CREATE_CONTACT: "Create Contact",
  GET_CONTACT: "Get Contact",
  UPDATE_CONTACT: "Update Contact",
  DELETE_CONTACT: "Delete Contact",
  LIST_CONTACTS: "List Contacts",
  SEARCH_CONTACTS: "Search Contacts",
  MERGE_CONTACT: "Merge Contact",
  CREATE_COMPANY: "Create Company",
  GET_COMPANY: "Get Company",
  UPDATE_COMPANY: "Update Company",
  DELETE_COMPANY: "Delete Company",
  LIST_COMPANIES: "List Companies",
  LIST_AGENTS: "List Agents",
  GET_AGENT: "Get Agent",
  UPDATE_AGENT: "Update Agent",
  LIST_CONVERSATIONS: "List Conversations",
  SEND_REPLY: "Send Reply",
  CREATE_OUTBOUND_EMAIL: "Create Outbound Email",
  GET_TICKET_STATS: "Get Ticket Stats",
}

const textField = (
  label: string,
  name: keyof FreshdeskFormValues,
  value: string,
  onChange: (val: string) => void,
  placeholder?: string
) => (
  <div className="space-y-1" key={name}>
    <Label htmlFor={name}>{label}</Label>
    <Input id={name} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
  </div>
)

// ── Which fields are visible for each operation group ──────────
type FieldGroup = "ticket" | "ticketId" | "note" | "noteId" | "contact" | "contactId" | "company" | "companyId" | "agent" | "agentId" | "reply" | "search" | "pagination" | "outbound"

const OP_FIELDS: Record<FreshdeskOperation, FieldGroup[]> = {
  CREATE_TICKET: ["ticket"],
  GET_TICKET: ["ticketId"],
  UPDATE_TICKET: ["ticketId", "ticket"],
  DELETE_TICKET: ["ticketId"],
  LIST_TICKETS: ["pagination"],
  SEARCH_TICKETS: ["search", "pagination"],
  GET_TICKET_FIELDS: [],
  RESTORE_TICKET: ["ticketId"],
  ADD_NOTE: ["ticketId", "note"],
  LIST_NOTES: ["ticketId", "pagination"],
  UPDATE_NOTE: ["ticketId", "noteId", "note"],
  DELETE_NOTE: ["ticketId", "noteId"],
  CREATE_CONTACT: ["contact"],
  GET_CONTACT: ["contactId"],
  UPDATE_CONTACT: ["contactId", "contact"],
  DELETE_CONTACT: ["contactId"],
  LIST_CONTACTS: ["pagination"],
  SEARCH_CONTACTS: ["search", "pagination"],
  MERGE_CONTACT: ["contactId"],
  CREATE_COMPANY: ["company"],
  GET_COMPANY: ["companyId"],
  UPDATE_COMPANY: ["companyId", "company"],
  DELETE_COMPANY: ["companyId"],
  LIST_COMPANIES: ["pagination"],
  LIST_AGENTS: ["pagination"],
  GET_AGENT: ["agentId"],
  UPDATE_AGENT: ["agentId"],
  LIST_CONVERSATIONS: ["ticketId", "pagination"],
  SEND_REPLY: ["ticketId", "reply"],
  CREATE_OUTBOUND_EMAIL: ["outbound"],
  GET_TICKET_STATS: [],
}

export const FreshdeskDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  nodeId,
  workflowId,
}: FreshdeskDialogProps) => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { data: credentials } = useCredentialsByType(CredentialType.FRESHDESK)

  const existingConfig = undefined as any;
  const isLoading = false;

  const upsert = { isPending: false, isSuccess: false, mutateAsync: async (args: any, opts: any) => {} } as any;

  const initialState: FreshdeskFormValues = useMemo(
    () => ({
      credentialId: defaultValues.credentialId || existingConfig?.credentialId || "",
      operation:
        (defaultValues.operation as FreshdeskOperation | undefined) ||
        existingConfig?.operation ||
        FreshdeskOperation.CREATE_TICKET,
      variableName: defaultValues.variableName || existingConfig?.variableName || "freshdesk",

      subject: defaultValues.subject || existingConfig?.subject || "",
      description: defaultValues.description || existingConfig?.description || "",
      descriptionHtml: defaultValues.descriptionHtml || existingConfig?.descriptionHtml || "",
      email: defaultValues.email || existingConfig?.email || "",
      name: defaultValues.name || existingConfig?.name || "",
      phone: defaultValues.phone || existingConfig?.phone || "",
      mobilePhone: defaultValues.mobilePhone || existingConfig?.mobilePhone || "",
      ticketId: defaultValues.ticketId || existingConfig?.ticketId || "",
      priority: defaultValues.priority ?? existingConfig?.priority ?? 2,
      status: defaultValues.status ?? existingConfig?.status ?? 2,
      source: defaultValues.source ?? existingConfig?.source ?? 2,
      ticketType: defaultValues.ticketType || existingConfig?.ticketType || "",
      responderId: defaultValues.responderId || existingConfig?.responderId || "",
      groupId: defaultValues.groupId || existingConfig?.groupId || "",
      productId: defaultValues.productId || existingConfig?.productId || "",
      companyId: defaultValues.companyId || existingConfig?.companyId || "",
      fwdEmail: defaultValues.fwdEmail || existingConfig?.fwdEmail || "",
      tags: defaultValues.tags || existingConfig?.tags || "",
      customFields: defaultValues.customFields || existingConfig?.customFields || "{}",

      noteId: defaultValues.noteId || existingConfig?.noteId || "",
      noteBody: defaultValues.noteBody || existingConfig?.noteBody || "",
      notePrivate: defaultValues.notePrivate ?? existingConfig?.notePrivate ?? false,
      noteUserId: defaultValues.noteUserId || existingConfig?.noteUserId || "",

      contactId: defaultValues.contactId || existingConfig?.contactId || "",
      contactEmail: defaultValues.contactEmail || existingConfig?.contactEmail || "",
      contactName: defaultValues.contactName || existingConfig?.contactName || "",
      contactPhone: defaultValues.contactPhone || existingConfig?.contactPhone || "",
      contactMobile: defaultValues.contactMobile || existingConfig?.contactMobile || "",
      contactJobTitle: defaultValues.contactJobTitle || existingConfig?.contactJobTitle || "",
      contactTimeZone: defaultValues.contactTimeZone || existingConfig?.contactTimeZone || "",
      contactLanguage: defaultValues.contactLanguage || existingConfig?.contactLanguage || "",
      contactTags: defaultValues.contactTags || existingConfig?.contactTags || "",
      contactCompanyId: defaultValues.contactCompanyId || existingConfig?.contactCompanyId || "",
      mergeTargetId: defaultValues.mergeTargetId || existingConfig?.mergeTargetId || "",

      companyName: defaultValues.companyName || existingConfig?.companyName || "",
      companyDomain: defaultValues.companyDomain || existingConfig?.companyDomain || "",
      companyDescription: defaultValues.companyDescription || existingConfig?.companyDescription || "",
      companyNote: defaultValues.companyNote || existingConfig?.companyNote || "",

      agentId: defaultValues.agentId || existingConfig?.agentId || "",

      replyBody: defaultValues.replyBody || existingConfig?.replyBody || "",
      replyFrom: defaultValues.replyFrom || existingConfig?.replyFrom || "",
      replyTo: defaultValues.replyTo || existingConfig?.replyTo || "",
      replyCc: defaultValues.replyCc || existingConfig?.replyCc || "",
      replyBcc: defaultValues.replyBcc || existingConfig?.replyBcc || "",

      searchQuery: defaultValues.searchQuery || existingConfig?.searchQuery || "",
      filterBy: defaultValues.filterBy || existingConfig?.filterBy || "",
      orderBy: defaultValues.orderBy || existingConfig?.orderBy || "created_at",
      orderType: defaultValues.orderType || existingConfig?.orderType || "desc",
      page: defaultValues.page ?? existingConfig?.page ?? 1,
      perPage: defaultValues.perPage ?? existingConfig?.perPage ?? 30,
      updatedSince: defaultValues.updatedSince || existingConfig?.updatedSince || "",
      includeStats: defaultValues.includeStats ?? existingConfig?.includeStats ?? false,

      continueOnFail: defaultValues.continueOnFail ?? existingConfig?.continueOnFail ?? false,
    }),
    [defaultValues, existingConfig]
  )

  const [formValues, setFormValues] = useState<FreshdeskFormValues>(initialState)

  useEffect(() => {
    setFormValues(initialState)
  }, [initialState])

  const handleChange = <K extends keyof FreshdeskFormValues>(key: K, value: FreshdeskFormValues[K]) => {
    setFormValues((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    if (!nodeId || !workflowId) return
    const payload = {
      ...formValues,
      nodeId,
      workflowId,
      operation: formValues.operation ?? FreshdeskOperation.CREATE_TICKET,
      variableName: formValues.variableName || "freshdesk",
      priority: formValues.priority ?? 2,
      status: formValues.status ?? 2,
      source: formValues.source ?? 2,
      page: formValues.page ?? 1,
      perPage: formValues.perPage ?? 30,
    }
    await upsert.mutateAsync(payload, {
      onSuccess: () => {
        queryClient.invalidateQueries(({} as any)({ nodeId }))
      },
    })
    onSubmit(payload)
    onOpenChange(false)
  }

  const op = formValues.operation ?? FreshdeskOperation.CREATE_TICKET
  const fieldGroups = OP_FIELDS[op] ?? []
  const show = (g: FieldGroup) => fieldGroups.includes(g)

  const renderTextFields = (
    fields: Array<{ name: keyof FreshdeskFormValues; label: string; placeholder?: string }>
  ) => (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {fields.map((field) =>
        textField(
          field.label,
          field.name,
          String(formValues[field.name] ?? ""),
          (val) => handleChange(field.name, val),
          field.placeholder
        )
      )}
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-4xl">
        <DialogHeader>
          <DialogTitle>Configure Freshdesk</DialogTitle>
          <DialogDescription>32 operations across tickets, contacts, companies, agents, and conversations.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" /> Loading configuration…
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Credential</Label>
                <Select
                  value={formValues.credentialId ?? ""}
                  onValueChange={(val) => handleChange("credentialId", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a Freshdesk credential" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Freshdesk Credentials</SelectLabel>
                      {(credentials || []).map((cred) => (
                        <SelectItem key={cred.id} value={cred.id}>
                          {cred.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {(!credentials || credentials.length === 0) && (
                  <p className="text-xs text-muted-foreground">
                    No credentials found.{" "}
                    <Link href="/credentials/new" className="text-primary underline">
                      Create one
                    </Link>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Operation</Label>
                <Select
                  value={formValues.operation ?? FreshdeskOperation.CREATE_TICKET}
                  onValueChange={(val) => handleChange("operation", val as FreshdeskOperation)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an operation" />
                  </SelectTrigger>
                  <SelectContent>
                    {OP_GROUPS.map((group) => (
                      <SelectGroup key={group.label}>
                        <SelectLabel>{group.label}</SelectLabel>
                        {group.ops.map((o) => (
                          <SelectItem key={o} value={o}>
                            {OP_LABEL[o] ?? o}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {textField(
              "Variable Name",
              "variableName",
              formValues.variableName ?? "freshdesk",
              (val) => handleChange("variableName", val),
              "freshdesk"
            )}

            <Separator />

            {/* ── Ticket ID field ── */}
            {show("ticketId") &&
              textField("Ticket ID", "ticketId", formValues.ticketId ?? "", (val) => handleChange("ticketId", val), "{{trigger.ticketId}}")}

            {/* ── Ticket creation/update fields ── */}
            {show("ticket") && (
              <>
                {renderTextFields([
                  { name: "subject", label: "Subject", placeholder: "Ticket subject" },
                  { name: "email", label: "Requester Email", placeholder: "customer@example.com" },
                  { name: "name", label: "Requester Name", placeholder: "John Doe" },
                  { name: "phone", label: "Phone", placeholder: "+91..." },
                  { name: "ticketType", label: "Type", placeholder: "Question / Incident / Problem" },
                  { name: "responderId", label: "Responder ID", placeholder: "Agent ID (number)" },
                  { name: "groupId", label: "Group ID", placeholder: "Group ID (number)" },
                  { name: "tags", label: "Tags", placeholder: "tag1, tag2, tag3" },
                ])}

                <div className="space-y-1">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formValues.description ?? ""}
                    onChange={(e) => handleChange("description", e.target.value)}
                    placeholder="Ticket description (supports {{variables}})"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label>Priority</Label>
                    <Select
                      value={String(formValues.priority ?? 2)}
                      onValueChange={(val) => handleChange("priority", Number(val))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Low</SelectItem>
                        <SelectItem value="2">Medium</SelectItem>
                        <SelectItem value="3">High</SelectItem>
                        <SelectItem value="4">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label>Status</Label>
                    <Select
                      value={String(formValues.status ?? 2)}
                      onValueChange={(val) => handleChange("status", Number(val))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">Open</SelectItem>
                        <SelectItem value="3">Pending</SelectItem>
                        <SelectItem value="4">Resolved</SelectItem>
                        <SelectItem value="5">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label>Source</Label>
                    <Select
                      value={String(formValues.source ?? 2)}
                      onValueChange={(val) => handleChange("source", Number(val))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Email</SelectItem>
                        <SelectItem value="2">Portal</SelectItem>
                        <SelectItem value="3">Phone</SelectItem>
                        <SelectItem value="7">Chat</SelectItem>
                        <SelectItem value="9">Twitter DM</SelectItem>
                        <SelectItem value="10">WhatsApp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="customFields">Custom Fields (JSON)</Label>
                  <Textarea
                    id="customFields"
                    value={formValues.customFields ?? "{}"}
                    onChange={(e) => handleChange("customFields", e.target.value)}
                    placeholder='{"cf_order_id": "ORD-123"}'
                    rows={2}
                    className="font-mono text-xs"
                  />
                </div>
              </>
            )}

            {/* ── Note fields ── */}
            {show("note") && (
              <>
                <div className="space-y-1">
                  <Label htmlFor="noteBody">Note Body</Label>
                  <Textarea
                    id="noteBody"
                    value={formValues.noteBody ?? ""}
                    onChange={(e) => handleChange("noteBody", e.target.value)}
                    placeholder="HTML or plain-text note body"
                    rows={3}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="notePrivate"
                    checked={formValues.notePrivate ?? false}
                    onCheckedChange={(val) => handleChange("notePrivate", val)}
                  />
                  <Label htmlFor="notePrivate">Private Note</Label>
                </div>
                {textField("User ID", "noteUserId", formValues.noteUserId ?? "", (val) => handleChange("noteUserId", val), "Agent user ID (optional)")}
              </>
            )}

            {show("noteId") &&
              textField("Note ID", "noteId", formValues.noteId ?? "", (val) => handleChange("noteId", val), "Note ID")}

            {/* ── Contact fields ── */}
            {show("contactId") &&
              textField("Contact ID", "contactId", formValues.contactId ?? "", (val) => handleChange("contactId", val), "{{trigger.contactId}}")}

            {show("contact") && (
              <>
                {renderTextFields([
                  { name: "contactName", label: "Name", placeholder: "Full name" },
                  { name: "contactEmail", label: "Email", placeholder: "contact@example.com" },
                  { name: "contactPhone", label: "Phone", placeholder: "+91..." },
                  { name: "contactMobile", label: "Mobile", placeholder: "+91..." },
                  { name: "contactJobTitle", label: "Job Title", placeholder: "Manager" },
                  { name: "contactTimeZone", label: "Timezone", placeholder: "Asia/Kolkata" },
                  { name: "contactLanguage", label: "Language", placeholder: "en" },
                  { name: "contactTags", label: "Tags", placeholder: "vip, premium" },
                  { name: "contactCompanyId", label: "Company ID", placeholder: "Company ID" },
                ])}
              </>
            )}

            {op === FreshdeskOperation.MERGE_CONTACT &&
              textField("Merge Target Contact ID", "mergeTargetId", formValues.mergeTargetId ?? "", (val) => handleChange("mergeTargetId", val), "Contact to merge into primary")}

            {/* ── Company fields ── */}
            {show("companyId") &&
              textField("Company ID", "companyId", formValues.companyId ?? "", (val) => handleChange("companyId", val), "{{trigger.companyId}}")}

            {show("company") &&
              renderTextFields([
                { name: "companyName", label: "Company Name", placeholder: "Acme Inc." },
                { name: "companyDomain", label: "Domain", placeholder: "acme.com" },
                { name: "companyDescription", label: "Description", placeholder: "Company description" },
                { name: "companyNote", label: "Note", placeholder: "Internal note" },
              ])}

            {/* ── Agent fields ── */}
            {show("agentId") &&
              textField("Agent ID", "agentId", formValues.agentId ?? "", (val) => handleChange("agentId", val), "Agent ID")}

            {/* ── Reply fields ── */}
            {show("reply") && (
              <>
                <div className="space-y-1">
                  <Label htmlFor="replyBody">Reply Body (HTML)</Label>
                  <Textarea
                    id="replyBody"
                    value={formValues.replyBody ?? ""}
                    onChange={(e) => handleChange("replyBody", e.target.value)}
                    placeholder="<p>Thank you for contacting us...</p>"
                    rows={3}
                  />
                </div>
                {renderTextFields([
                  { name: "replyTo", label: "To (comma-separated)", placeholder: "customer@example.com" },
                  { name: "replyFrom", label: "From Email (optional)", placeholder: "support@company.com" },
                  { name: "replyCc", label: "CC", placeholder: "cc@example.com" },
                  { name: "replyBcc", label: "BCC", placeholder: "bcc@example.com" },
                ])}
              </>
            )}

            {/* ── Outbound email ── */}
            {show("outbound") && (
              <>
                {renderTextFields([
                  { name: "subject", label: "Subject", placeholder: "Email subject" },
                  { name: "email", label: "To Email", placeholder: "customer@example.com" },
                  { name: "tags", label: "Tags", placeholder: "tag1, tag2" },
                ])}
                <div className="space-y-1">
                  <Label htmlFor="description">Body</Label>
                  <Textarea
                    id="description"
                    value={formValues.description ?? ""}
                    onChange={(e) => handleChange("description", e.target.value)}
                    placeholder="Email body content"
                    rows={3}
                  />
                </div>
              </>
            )}

            {/* ── Search fields ── */}
            {show("search") &&
              textField("Search Query", "searchQuery", formValues.searchQuery ?? "", (val) => handleChange("searchQuery", val), '"priority:2 AND status:2"')}

            {/* ── Pagination ── */}
            {show("pagination") && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {textField("Page", "page", String(formValues.page ?? 1), (val) => handleChange("page", Number(val) || 1), "1")}
                {textField("Per Page", "perPage", String(formValues.perPage ?? 30), (val) => handleChange("perPage", Number(val) || 30), "30")}
                {textField("Updated Since", "updatedSince", formValues.updatedSince ?? "", (val) => handleChange("updatedSince", val), "2024-01-01T00:00:00Z")}
              </div>
            )}

            <Separator />

            <div className="flex items-center gap-2">
              <Switch
                id="continueOnFail"
                checked={formValues.continueOnFail ?? false}
                onCheckedChange={(val) => handleChange("continueOnFail", val)}
              />
              <Label htmlFor="continueOnFail">Continue on Fail</Label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={upsert.isPending}>
                {upsert.isPending ? (
                  <Loader2Icon className="size-4 mr-1 animate-spin" />
                ) : upsert.isSuccess ? (
                  <CheckIcon className="size-4 mr-1" />
                ) : null}
                {upsert.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
