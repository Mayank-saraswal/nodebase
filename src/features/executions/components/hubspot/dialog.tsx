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
import { HubspotOperation } from "@/features/executions/enums"
import { CheckIcon, Loader2Icon } from "lucide-react"
import Link from "next/link"
import { Separator } from "@/components/ui/separator"

export interface HubspotFormValues {
  credentialId?: string
  operation?: HubspotOperation
  variableName?: string
  objectType?: string
  recordId?: string

  email?: string
  firstName?: string
  lastName?: string
  phone?: string
  website?: string
  company?: string
  jobTitle?: string
  lifecycleStage?: string
  leadStatus?: string

  companyName?: string
  domain?: string
  industry?: string
  annualRevenue?: string
  numberOfEmployees?: string
  city?: string
  state?: string
  country?: string

  dealName?: string
  dealStage?: string
  pipeline?: string
  amount?: string
  closeDate?: string
  dealType?: string
  priority?: string

  ticketName?: string
  ticketPipeline?: string
  ticketStatus?: string
  ticketPriority?: string
  ticketDescription?: string
  ticketSource?: string

  noteBody?: string
  taskSubject?: string
  taskBody?: string
  taskStatus?: string
  taskPriority?: string
  taskDueDate?: string
  callBody?: string
  callDuration?: string
  callDirection?: string
  callDisposition?: string
  emailSubject?: string
  emailBody?: string
  emailFrom?: string
  emailTo?: string

  fromObjectType?: string
  fromObjectId?: string
  toObjectType?: string
  toObjectId?: string
  associationType?: string

  listId?: string

  searchQuery?: string
  filterProperty?: string
  filterOperator?: string
  filterValue?: string
  sortProperty?: string
  sortDirection?: string
  limit?: number
  after?: string

  customProperties?: string

  continueOnFail?: boolean
}

interface HubspotDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: HubspotFormValues) => void
  defaultValues?: Partial<HubspotFormValues>
  nodeId?: string
  workflowId?: string
}

const OP_GROUPS: Array<{ label: string; ops: HubspotOperation[] }> = [
  {
    label: "Contacts",
    ops: [
      HubspotOperation.CREATE_CONTACT,
      HubspotOperation.GET_CONTACT,
      HubspotOperation.UPDATE_CONTACT,
      HubspotOperation.DELETE_CONTACT,
      HubspotOperation.SEARCH_CONTACTS,
      HubspotOperation.GET_CONTACT_PROPERTIES,
      HubspotOperation.UPSERT_CONTACT,
      HubspotOperation.GET_CONTACT_ASSOCIATIONS,
    ],
  },
  {
    label: "Companies",
    ops: [
      HubspotOperation.CREATE_COMPANY,
      HubspotOperation.GET_COMPANY,
      HubspotOperation.UPDATE_COMPANY,
      HubspotOperation.DELETE_COMPANY,
      HubspotOperation.SEARCH_COMPANIES,
    ],
  },
  {
    label: "Deals",
    ops: [
      HubspotOperation.CREATE_DEAL,
      HubspotOperation.GET_DEAL,
      HubspotOperation.UPDATE_DEAL,
      HubspotOperation.DELETE_DEAL,
      HubspotOperation.SEARCH_DEALS,
      HubspotOperation.UPDATE_DEAL_STAGE,
    ],
  },
  {
    label: "Tickets",
    ops: [
      HubspotOperation.CREATE_TICKET,
      HubspotOperation.GET_TICKET,
      HubspotOperation.UPDATE_TICKET,
      HubspotOperation.DELETE_TICKET,
      HubspotOperation.SEARCH_TICKETS,
    ],
  },
  {
    label: "Activities",
    ops: [
      HubspotOperation.CREATE_NOTE,
      HubspotOperation.CREATE_TASK,
      HubspotOperation.CREATE_CALL,
      HubspotOperation.CREATE_EMAIL_LOG,
    ],
  },
  {
    label: "Associations",
    ops: [HubspotOperation.CREATE_ASSOCIATION, HubspotOperation.DELETE_ASSOCIATION],
  },
  {
    label: "Lists",
    ops: [
      HubspotOperation.ADD_CONTACT_TO_LIST,
      HubspotOperation.REMOVE_CONTACT_FROM_LIST,
      HubspotOperation.GET_LIST_CONTACTS,
    ],
  },
  {
    label: "Generic",
    ops: [HubspotOperation.SEARCH_OBJECTS, HubspotOperation.GET_PROPERTIES],
  },
]

const textField = (
  label: string,
  name: keyof HubspotFormValues,
  value: string,
  onChange: (val: string) => void,
  placeholder?: string
) => (
  <div className="space-y-1">
    <Label htmlFor={name}>{label}</Label>
    <Input id={name} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
  </div>
)

export const HubspotDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  nodeId,
  workflowId,
}: HubspotDialogProps) => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { data: credentials } = useCredentialsByType(CredentialType.HUBSPOT)

  const existingConfig = undefined as any;
  const isLoading = false;

  const upsert = { isPending: false, mutateAsync: async (args: any) => {} } as any

  const initialState: HubspotFormValues = useMemo(
    () => ({
      credentialId: defaultValues.credentialId || (existingConfig as any)?.credentialId || "",
      operation:
        (defaultValues.operation as HubspotOperation | undefined) ||
        (existingConfig as any)?.operation ||
        HubspotOperation.CREATE_CONTACT,
      variableName: defaultValues.variableName || (existingConfig as any)?.variableName || "hubspot",
      objectType: defaultValues.objectType || (existingConfig as any)?.objectType || "contacts",
      recordId: defaultValues.recordId || (existingConfig as any)?.recordId || "",
      email: defaultValues.email || (existingConfig as any)?.email || "",
      firstName: defaultValues.firstName || (existingConfig as any)?.firstName || "",
      lastName: defaultValues.lastName || (existingConfig as any)?.lastName || "",
      phone: defaultValues.phone || (existingConfig as any)?.phone || "",
      website: defaultValues.website || (existingConfig as any)?.website || "",
      company: defaultValues.company || (existingConfig as any)?.company || "",
      jobTitle: defaultValues.jobTitle || (existingConfig as any)?.jobTitle || "",
      lifecycleStage: defaultValues.lifecycleStage || (existingConfig as any)?.lifecycleStage || "",
      leadStatus: defaultValues.leadStatus || (existingConfig as any)?.leadStatus || "",
      companyName: defaultValues.companyName || (existingConfig as any)?.companyName || "",
      domain: defaultValues.domain || (existingConfig as any)?.domain || "",
      industry: defaultValues.industry || (existingConfig as any)?.industry || "",
      annualRevenue: defaultValues.annualRevenue || (existingConfig as any)?.annualRevenue || "",
      numberOfEmployees: defaultValues.numberOfEmployees || (existingConfig as any)?.numberOfEmployees || "",
      city: defaultValues.city || (existingConfig as any)?.city || "",
      state: defaultValues.state || (existingConfig as any)?.state || "",
      country: defaultValues.country || (existingConfig as any)?.country || "India",
      dealName: defaultValues.dealName || (existingConfig as any)?.dealName || "",
      dealStage: defaultValues.dealStage || (existingConfig as any)?.dealStage || "",
      pipeline: defaultValues.pipeline || (existingConfig as any)?.pipeline || "default",
      amount: defaultValues.amount || (existingConfig as any)?.amount || "",
      closeDate: defaultValues.closeDate || (existingConfig as any)?.closeDate || "",
      dealType: defaultValues.dealType || (existingConfig as any)?.dealType || "",
      priority: defaultValues.priority || (existingConfig as any)?.priority || "",
      ticketName: defaultValues.ticketName || (existingConfig as any)?.ticketName || "",
      ticketPipeline: defaultValues.ticketPipeline || (existingConfig as any)?.ticketPipeline || "0",
      ticketStatus: defaultValues.ticketStatus || (existingConfig as any)?.ticketStatus || "",
      ticketPriority: defaultValues.ticketPriority || (existingConfig as any)?.ticketPriority || "",
      ticketDescription: defaultValues.ticketDescription || (existingConfig as any)?.ticketDescription || "",
      ticketSource: defaultValues.ticketSource || (existingConfig as any)?.ticketSource || "",
      noteBody: defaultValues.noteBody || (existingConfig as any)?.noteBody || "",
      taskSubject: defaultValues.taskSubject || (existingConfig as any)?.taskSubject || "",
      taskBody: defaultValues.taskBody || (existingConfig as any)?.taskBody || "",
      taskStatus: defaultValues.taskStatus || (existingConfig as any)?.taskStatus || "NOT_STARTED",
      taskPriority: defaultValues.taskPriority || (existingConfig as any)?.taskPriority || "NONE",
      taskDueDate: defaultValues.taskDueDate || (existingConfig as any)?.taskDueDate || "",
      callBody: defaultValues.callBody || (existingConfig as any)?.callBody || "",
      callDuration: defaultValues.callDuration || (existingConfig as any)?.callDuration || "",
      callDirection: defaultValues.callDirection || (existingConfig as any)?.callDirection || "OUTBOUND",
      callDisposition: defaultValues.callDisposition || (existingConfig as any)?.callDisposition || "",
      emailSubject: defaultValues.emailSubject || (existingConfig as any)?.emailSubject || "",
      emailBody: defaultValues.emailBody || (existingConfig as any)?.emailBody || "",
      emailFrom: defaultValues.emailFrom || (existingConfig as any)?.emailFrom || "",
      emailTo: defaultValues.emailTo || (existingConfig as any)?.emailTo || "",
      fromObjectType: defaultValues.fromObjectType || (existingConfig as any)?.fromObjectType || "contacts",
      fromObjectId: defaultValues.fromObjectId || (existingConfig as any)?.fromObjectId || "",
      toObjectType: defaultValues.toObjectType || (existingConfig as any)?.toObjectType || "deals",
      toObjectId: defaultValues.toObjectId || (existingConfig as any)?.toObjectId || "",
      associationType: defaultValues.associationType || (existingConfig as any)?.associationType || "",
      listId: defaultValues.listId || (existingConfig as any)?.listId || "",
      searchQuery: defaultValues.searchQuery || (existingConfig as any)?.searchQuery || "",
      filterProperty: defaultValues.filterProperty || (existingConfig as any)?.filterProperty || "",
      filterOperator: defaultValues.filterOperator || (existingConfig as any)?.filterOperator || "EQ",
      filterValue: defaultValues.filterValue || (existingConfig as any)?.filterValue || "",
      sortProperty: defaultValues.sortProperty || (existingConfig as any)?.sortProperty || "createdate",
      sortDirection: defaultValues.sortDirection || (existingConfig as any)?.sortDirection || "DESCENDING",
      limit: defaultValues.limit ?? (existingConfig as any)?.limit ?? 10,
      after: defaultValues.after || (existingConfig as any)?.after || "",
      customProperties: defaultValues.customProperties || (existingConfig as any)?.customProperties || "{}",
      continueOnFail: defaultValues.continueOnFail ?? (existingConfig as any)?.continueOnFail ?? false,
    }),
    [defaultValues, existingConfig]
  )

  const [formValues, setFormValues] = useState<HubspotFormValues>(initialState)

  useEffect(() => {
    setFormValues(initialState)
  }, [initialState])

  const handleChange = <K extends keyof HubspotFormValues>(key: K, value: HubspotFormValues[K]) => {
    setFormValues((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    if (!nodeId || !workflowId) return
    const payload = {
      ...formValues,
      nodeId,
      workflowId,
      operation: formValues.operation ?? HubspotOperation.CREATE_CONTACT,
      variableName: formValues.variableName || "hubspot",
      limit: Number(formValues.limit ?? 10),
    }
    await upsert.mutateAsync(payload)
    onSubmit(payload)
    onOpenChange(false)
  }

  const availableOps = useMemo(() => OP_GROUPS, [])

  const renderTextFields = (
    fields: Array<{ name: keyof HubspotFormValues; label: string; placeholder?: string }>
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
          <DialogTitle>Configure HubSpot</DialogTitle>
          <DialogDescription>OAuth-powered HubSpot CRM node with 35 operations.</DialogDescription>
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
                    <SelectValue placeholder="Select a HubSpot credential" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>HubSpot Credentials</SelectLabel>
                      {(credentials || []).map((cred) => (
                        <SelectItem key={cred.id} value={cred.id}>
                          {cred.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Need one? <Link href="/credentials/new" className="underline">Create a credential</Link>
                </p>
              </div>

              <div className="space-y-2">
                <Label>Variable Name</Label>
                <Input
                  value={formValues.variableName ?? "hubspot"}
                  onChange={(e) => handleChange("variableName", e.target.value)}
                  placeholder="hubspot"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Operation</Label>
                <Select
                  value={(formValues.operation || HubspotOperation.CREATE_CONTACT).toString()}
                  onValueChange={(val) => handleChange("operation", val as HubspotOperation)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select operation" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableOps.map((group) => (
                      <SelectGroup key={group.label}>
                        <SelectLabel>{group.label}</SelectLabel>
                        {group.ops.map((op) => (
                          <SelectItem key={op} value={op}>
                            {op.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Object Type (generic/search)</Label>
                <Input
                  value={formValues.objectType ?? "contacts"}
                  onChange={(e) => handleChange("objectType", e.target.value)}
                  placeholder="contacts"
                />
              </div>
            </div>

            <Separator />
            <div className="space-y-3">
              <Label>Identifiers</Label>
              {renderTextFields([
                { name: "recordId", label: "Record ID" },
                { name: "listId", label: "List ID" },
                { name: "fromObjectType", label: "From Object Type" },
                { name: "fromObjectId", label: "From Object ID" },
                { name: "toObjectType", label: "To Object Type" },
                { name: "toObjectId", label: "To Object ID" },
                { name: "associationType", label: "Association Type" },
              ])}
            </div>

            <Separator />
            <div className="space-y-3">
              <Label>Contact</Label>
              {renderTextFields([
                { name: "email", label: "Email" },
                { name: "firstName", label: "First Name" },
                { name: "lastName", label: "Last Name" },
                { name: "phone", label: "Phone" },
                { name: "website", label: "Website" },
                { name: "company", label: "Company" },
                { name: "jobTitle", label: "Job Title" },
                { name: "lifecycleStage", label: "Lifecycle Stage" },
                { name: "leadStatus", label: "Lead Status" },
              ])}
            </div>

            <Separator />
            <div className="space-y-3">
              <Label>Company</Label>
              {renderTextFields([
                { name: "companyName", label: "Company Name" },
                { name: "domain", label: "Domain" },
                { name: "industry", label: "Industry" },
                { name: "annualRevenue", label: "Annual Revenue" },
                { name: "numberOfEmployees", label: "Number of Employees" },
                { name: "city", label: "City" },
                { name: "state", label: "State" },
                { name: "country", label: "Country" },
              ])}
            </div>

            <Separator />
            <div className="space-y-3">
              <Label>Deal</Label>
              {renderTextFields([
                { name: "dealName", label: "Deal Name" },
                { name: "dealStage", label: "Deal Stage" },
                { name: "pipeline", label: "Pipeline" },
                { name: "amount", label: "Amount" },
                { name: "closeDate", label: "Close Date" },
                { name: "dealType", label: "Deal Type" },
                { name: "priority", label: "Priority" },
              ])}
            </div>

            <Separator />
            <div className="space-y-3">
              <Label>Ticket</Label>
              {renderTextFields([
                { name: "ticketName", label: "Ticket Name" },
                { name: "ticketPipeline", label: "Ticket Pipeline" },
                { name: "ticketStatus", label: "Ticket Status" },
                { name: "ticketPriority", label: "Ticket Priority" },
                { name: "ticketDescription", label: "Description" },
                { name: "ticketSource", label: "Source" },
              ])}
            </div>

            <Separator />
            <div className="space-y-3">
              <Label>Activities</Label>
              {renderTextFields([
                { name: "noteBody", label: "Note Body" },
                { name: "taskSubject", label: "Task Subject" },
                { name: "taskBody", label: "Task Body" },
                { name: "taskStatus", label: "Task Status" },
                { name: "taskPriority", label: "Task Priority" },
                { name: "taskDueDate", label: "Task Due Date" },
                { name: "callBody", label: "Call Body" },
                { name: "callDuration", label: "Call Duration" },
                { name: "callDirection", label: "Call Direction" },
                { name: "callDisposition", label: "Call Disposition" },
                { name: "emailSubject", label: "Email Subject" },
                { name: "emailBody", label: "Email Body" },
                { name: "emailFrom", label: "Email From" },
                { name: "emailTo", label: "Email To" },
              ])}
            </div>

            <Separator />
            <div className="space-y-3">
              <Label>Search & Sorting</Label>
              {renderTextFields([
                { name: "searchQuery", label: "Search Query" },
                { name: "filterProperty", label: "Filter Property" },
                { name: "filterOperator", label: "Filter Operator" },
                { name: "filterValue", label: "Filter Value" },
                { name: "sortProperty", label: "Sort Property" },
                { name: "sortDirection", label: "Sort Direction" },
                { name: "after", label: "After Cursor" },
              ])}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="limit">Limit</Label>
                  <Input
                    id="limit"
                    type="number"
                    value={formValues.limit ?? 10}
                    onChange={(e) => handleChange("limit", Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <Separator />
            <div className="space-y-2">
              <Label>Custom Properties (JSON)</Label>
              <Textarea
                className="font-mono text-xs"
                rows={4}
                value={formValues.customProperties ?? "{}"}
                onChange={(e) => handleChange("customProperties", e.target.value)}
                placeholder='{"custom_field": "value"}'
              />
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label>Continue on Fail</Label>
                <p className="text-xs text-muted-foreground">If enabled, execution continues even if HubSpot returns an error.</p>
              </div>
              <Switch
                checked={!!formValues.continueOnFail}
                onCheckedChange={(checked) => handleChange("continueOnFail", checked)}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={upsert.isPending}>
                {upsert.isPending ? <Loader2Icon className="mr-2 size-4 animate-spin" /> : <CheckIcon className="mr-2 size-4" />}
                Save
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
