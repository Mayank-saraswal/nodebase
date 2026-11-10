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
import { Separator } from "@/components/ui/separator"
import { useTRPC } from "@/trpc/client"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCredentialsByType } from "@/features/credentials/hooks/use-credentials"
import { CredentialType } from "@/generated/prisma"
import { ZohoCrmOperation } from "@/features/executions/enums"
import { CheckIcon, Loader2Icon } from "lucide-react"
import Link from "next/link"

export interface ZohoCrmFormValues {
  credentialId?: string
  operation: ZohoOp
  variableName?: string
  module?: string
  recordId?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  mobile?: string
  company?: string
  title?: string
  website?: string
  leadSource?: string
  leadStatus?: string
  industry?: string
  annualRevenue?: string
  noOfEmployees?: string
  rating?: string
  description?: string
  street?: string
  city?: string
  state?: string
  country?: string
  zipCode?: string
  dealName?: string
  dealStage?: string
  dealAmount?: string
  closingDate?: string
  accountName?: string
  contactName?: string
  probability?: string
  dealType?: string
  accountOwner?: string
  billingCity?: string
  billingState?: string
  subject?: string
  dueDate?: string
  priority?: string
  status?: string
  whoId?: string
  whatId?: string
  whoModule?: string
  whatModule?: string
  callDuration?: string
  callDirection?: string
  callResult?: string
  callStartTime?: string
  callDescription?: string
  meetingStart?: string
  meetingEnd?: string
  meetingAgenda?: string
  participants?: string
  noteTitle?: string
  noteContent?: string
  parentModule?: string
  searchTerm?: string
  searchField?: string
  criteria?: string
  page?: number
  perPage?: number
  createDeal?: boolean
  overwrite?: boolean
  customFields?: string
  duplicateCheckField?: string
  continueOnFail?: boolean
}

interface ZohoCrmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: ZohoCrmFormValues) => void
  defaultValues?: Partial<ZohoCrmFormValues>
  nodeId?: string
  workflowId?: string
}

type ZohoOp = `${ZohoCrmOperation}`;

const RECORD_ID_OPS: ZohoOp[] = [
  "GET_LEAD", "UPDATE_LEAD", "DELETE_LEAD", "CONVERT_LEAD",
  "GET_CONTACT", "UPDATE_CONTACT", "DELETE_CONTACT", "GET_CONTACT_DEALS",
  "GET_DEAL", "UPDATE_DEAL", "DELETE_DEAL", "UPDATE_DEAL_STAGE",
  "GET_ACCOUNT", "UPDATE_ACCOUNT", "DELETE_ACCOUNT",
  "GET_ACTIVITIES", "ADD_NOTE", "GET_NOTES",
]

const CUSTOM_FIELDS_OPS: ZohoOp[] = [
  "CREATE_LEAD", "UPDATE_LEAD", "CREATE_CONTACT", "UPDATE_CONTACT",
  "CREATE_DEAL", "UPDATE_DEAL", "CREATE_ACCOUNT", "UPDATE_ACCOUNT", "UPSERT_RECORD",
]

const ADDRESS_OPS: ZohoOp[] = [
  "CREATE_LEAD", "UPDATE_LEAD", "CREATE_CONTACT", "UPDATE_CONTACT", "CREATE_ACCOUNT", "UPDATE_ACCOUNT",
]

const SEARCH_OPS: ZohoOp[] = ["SEARCH_LEADS", "SEARCH_CONTACTS", "SEARCH_DEALS", "SEARCH_ACCOUNTS", "SEARCH_RECORDS"]
const UPSERT_OPS: ZohoOp[] = ["UPSERT_RECORD"]
const MODULE_OPS: ZohoOp[] = ["GET_ACTIVITIES", "UPSERT_RECORD", "SEARCH_RECORDS", "GET_FIELDS"]
const DEAL_STAGE_OPTIONS = [
  "Qualification", "Needs Analysis", "Value Proposition", "Id. Decision Makers",
  "Perception Analysis", "Proposal/Price Quote", "Negotiation/Review", "Closed Won", "Closed Lost",
]

export const ZohoCrmDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  nodeId,
  workflowId,
}: ZohoCrmDialogProps) => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const [credentialId, setCredentialId] = useState(defaultValues.credentialId || "")
  const [operation, setOperation] = useState<ZohoOp>((defaultValues.operation as ZohoOp) || "CREATE_LEAD")
  const [variableName, setVariableName] = useState(defaultValues.variableName || "zoho")
  const [module, setModule] = useState(defaultValues.module || "Leads")
  const [recordId, setRecordId] = useState(defaultValues.recordId || "")
  const [firstName, setFirstName] = useState(defaultValues.firstName || "")
  const [lastName, setLastName] = useState(defaultValues.lastName || "")
  const [email, setEmail] = useState(defaultValues.email || "")
  const [phone, setPhone] = useState(defaultValues.phone || "")
  const [mobile, setMobile] = useState(defaultValues.mobile || "")
  const [company, setCompany] = useState(defaultValues.company || "")
  const [title, setTitle] = useState(defaultValues.title || "")
  const [website, setWebsite] = useState(defaultValues.website || "")
  const [leadSource, setLeadSource] = useState(defaultValues.leadSource || "")
  const [leadStatus, setLeadStatus] = useState(defaultValues.leadStatus || "")
  const [industry, setIndustry] = useState(defaultValues.industry || "")
  const [annualRevenue, setAnnualRevenue] = useState(defaultValues.annualRevenue || "")
  const [noOfEmployees, setNoOfEmployees] = useState(defaultValues.noOfEmployees || "")
  const [rating, setRating] = useState(defaultValues.rating || "")
  const [description, setDescription] = useState(defaultValues.description || "")
  const [street, setStreet] = useState(defaultValues.street || "")
  const [city, setCity] = useState(defaultValues.city || "")
  const [state, setState] = useState(defaultValues.state || "")
  const [country, setCountry] = useState(defaultValues.country || "India")
  const [zipCode, setZipCode] = useState(defaultValues.zipCode || "")
  const [dealName, setDealName] = useState(defaultValues.dealName || "")
  const [dealStage, setDealStage] = useState(defaultValues.dealStage || "Qualification")
  const [dealAmount, setDealAmount] = useState(defaultValues.dealAmount || "")
  const [closingDate, setClosingDate] = useState(defaultValues.closingDate || "")
  const [accountName, setAccountName] = useState(defaultValues.accountName || "")
  const [contactName, setContactName] = useState(defaultValues.contactName || "")
  const [probability, setProbability] = useState(defaultValues.probability || "")
  const [dealType, setDealType] = useState(defaultValues.dealType || "")
  const [accountOwner, setAccountOwner] = useState(defaultValues.accountOwner || "")
  const [billingCity, setBillingCity] = useState(defaultValues.billingCity || "")
  const [billingState, setBillingState] = useState(defaultValues.billingState || "")
  const [subject, setSubject] = useState(defaultValues.subject || "")
  const [dueDate, setDueDate] = useState(defaultValues.dueDate || "")
  const [priority, setPriority] = useState(defaultValues.priority || "High")
  const [status, setStatus] = useState(defaultValues.status || "Not Started")
  const [whoId, setWhoId] = useState(defaultValues.whoId || "")
  const [whatId, setWhatId] = useState(defaultValues.whatId || "")
  const [whoModule, setWhoModule] = useState(defaultValues.whoModule || "Contacts")
  const [whatModule, setWhatModule] = useState(defaultValues.whatModule || "Deals")
  const [callDuration, setCallDuration] = useState(defaultValues.callDuration || "")
  const [callDirection, setCallDirection] = useState(defaultValues.callDirection || "Outbound")
  const [callResult, setCallResult] = useState(defaultValues.callResult || "")
  const [callStartTime, setCallStartTime] = useState(defaultValues.callStartTime || "")
  const [callDescription, setCallDescription] = useState(defaultValues.callDescription || "")
  const [meetingStart, setMeetingStart] = useState(defaultValues.meetingStart || "")
  const [meetingEnd, setMeetingEnd] = useState(defaultValues.meetingEnd || "")
  const [meetingAgenda, setMeetingAgenda] = useState(defaultValues.meetingAgenda || "")
  const [participants, setParticipants] = useState(defaultValues.participants || "")
  const [noteTitle, setNoteTitle] = useState(defaultValues.noteTitle || "")
  const [noteContent, setNoteContent] = useState(defaultValues.noteContent || "")
  const [parentModule, setParentModule] = useState(defaultValues.parentModule || "Leads")
  const [searchTerm, setSearchTerm] = useState(defaultValues.searchTerm || "")
  const [searchField, setSearchField] = useState(defaultValues.searchField || "Email")
  const [criteria, setCriteria] = useState(defaultValues.criteria || "")
  const [page, setPage] = useState(defaultValues.page ?? 1)
  const [perPage, setPerPage] = useState(defaultValues.perPage ?? 10)
  const [createDeal, setCreateDeal] = useState(defaultValues.createDeal ?? false)
  const [overwrite, setOverwrite] = useState(defaultValues.overwrite ?? false)
  const [customFields, setCustomFields] = useState(defaultValues.customFields || "{}")
  const [duplicateCheckField, setDuplicateCheckField] = useState(defaultValues.duplicateCheckField || "Email")
  const [continueOnFail, setContinueOnFail] = useState(defaultValues.continueOnFail ?? false)
  const [saved, setSaved] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  const { data: credentials, isLoading: isLoadingCredentials } = useCredentialsByType(CredentialType.ZOHO_CRM)

  const config = undefined as any;
const isLoading = false;

useEffect(() => {
    if (config) {
      setCredentialId(config.credentialId || "")
      setOperation(config.operation as ZohoOp)
      setVariableName(config.variableName || "zoho")
      setModule(config.module)
      setRecordId(config.recordId)
      setFirstName(config.firstName)
      setLastName(config.lastName)
      setEmail(config.email)
      setPhone(config.phone)
      setMobile(config.mobile)
      setCompany(config.company)
      setTitle(config.title)
      setWebsite(config.website)
      setLeadSource(config.leadSource)
      setLeadStatus(config.leadStatus)
      setIndustry(config.industry)
      setAnnualRevenue(config.annualRevenue)
      setNoOfEmployees(config.noOfEmployees)
      setRating(config.rating)
      setDescription(config.description)
      setStreet(config.street)
      setCity(config.city)
      setState(config.state)
      setCountry(config.country)
      setZipCode(config.zipCode)
      setDealName(config.dealName)
      setDealStage(config.dealStage || "Qualification")
      setDealAmount(config.dealAmount)
      setClosingDate(config.closingDate)
      setAccountName(config.accountName)
      setContactName(config.contactName)
      setProbability(config.probability)
      setDealType(config.dealType)
      setAccountOwner(config.accountOwner)
      setBillingCity(config.billingCity)
      setBillingState(config.billingState)
      setSubject(config.subject)
      setDueDate(config.dueDate)
      setPriority(config.priority)
      setStatus(config.status)
      setWhoId(config.whoId)
      setWhatId(config.whatId)
      setWhoModule(config.whoModule)
      setWhatModule(config.whatModule)
      setCallDuration(config.callDuration)
      setCallDirection(config.callDirection)
      setCallResult(config.callResult)
      setCallStartTime(config.callStartTime)
      setCallDescription(config.callDescription)
      setMeetingStart(config.meetingStart)
      setMeetingEnd(config.meetingEnd)
      setMeetingAgenda(config.meetingAgenda)
      const rawParticipants = config.participants || "[]"
      try {
        const arr = JSON.parse(rawParticipants) as string[]
        setParticipants(Array.isArray(arr) ? arr.join(", ") : "")
      } catch {
        setParticipants(rawParticipants === "[]" ? "" : rawParticipants)
      }
      setNoteTitle(config.noteTitle)
      setNoteContent(config.noteContent)
      setParentModule(config.parentModule)
      setSearchTerm(config.searchTerm)
      setSearchField(config.searchField)
      setCriteria(config.criteria)
      setPage(config.page)
      setPerPage(config.perPage)
      setCreateDeal(config.createDeal)
      setOverwrite(config.overwrite)
      setCustomFields(config.customFields)
      setDuplicateCheckField(config.duplicateCheckField)
      setContinueOnFail(config.continueOnFail)
      setHydrated(true)
    }
  }, [config])

  useEffect(() => {
    if (open && !config) {
      setCredentialId(defaultValues.credentialId || "")
      setOperation((defaultValues.operation as ZohoOp) || "CREATE_LEAD")
      setVariableName(defaultValues.variableName || "zoho")
      setParticipants(defaultValues.participants || "")
      setHydrated(true)
    }
  }, [open, config, defaultValues])

  const upsertMutation = { isPending: false, mutate: (args?: any) => {}, mutateAsync: async (args?: any) => {} } as any;

const values = useMemo<ZohoCrmFormValues>(() => ({
    credentialId: credentialId || undefined,
    operation,
    variableName,
    module,
    recordId,
    firstName,
    lastName,
    email,
    phone,
    mobile,
    company,
    title,
    website,
    leadSource,
    leadStatus,
    industry,
    annualRevenue,
    noOfEmployees,
    rating,
    description,
    street,
    city,
    state,
    country,
    zipCode,
    dealName,
    dealStage,
    dealAmount,
    closingDate,
    accountName,
    contactName,
    probability,
    dealType,
    accountOwner,
    billingCity,
    billingState,
    subject,
    dueDate,
    priority,
    status,
    whoId,
    whatId,
    whoModule,
    whatModule,
    callDuration,
    callDirection,
    callResult,
    callStartTime,
    callDescription,
    meetingStart,
    meetingEnd,
    meetingAgenda,
    participants: JSON.stringify(
      participants.split(",").map((e) => e.trim()).filter(Boolean)
    ),
    noteTitle,
    noteContent,
    parentModule,
    searchTerm,
    searchField,
    criteria,
    page,
    perPage,
    createDeal,
    overwrite,
    customFields,
    duplicateCheckField,
    continueOnFail,
  }), [
    credentialId, operation, variableName, module, recordId, firstName, lastName, email, phone, mobile, company,
    title, website, leadSource, leadStatus, industry, annualRevenue, noOfEmployees, rating, description, street,
    city, state, country, zipCode, dealName, dealStage, dealAmount, closingDate, accountName, contactName,
    probability, dealType, accountOwner, billingCity, billingState, subject, dueDate, priority, status, whoId,
    whatId, whoModule, whatModule, callDuration, callDirection, callResult, callStartTime, callDescription,
    meetingStart, meetingEnd, meetingAgenda, participants, noteTitle, noteContent, parentModule, searchTerm,
    searchField, criteria, page, perPage, createDeal, overwrite, customFields, duplicateCheckField, continueOnFail,
  ])

  useEffect(() => {
    if (!open || !nodeId || !workflowId || !hydrated) return

    const timer = setTimeout(() => {
      upsertMutation.mutate({
        nodeId,
        workflowId,
        ...values,
      })
      onSubmit(values)
    }, 300)

    return () => clearTimeout(timer)
  }, [open, nodeId, workflowId, hydrated, values, upsertMutation.mutate])

  const showRecordId = RECORD_ID_OPS.includes(operation)
  const showAddress = ADDRESS_OPS.includes(operation)
  const showCustomFields = CUSTOM_FIELDS_OPS.includes(operation)
  const showSearch = SEARCH_OPS.includes(operation)
  const showModule = MODULE_OPS.includes(operation)
  const showUpsert = UPSERT_OPS.includes(operation)
  const v = variableName || "zoho"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Zoho CRM Configuration</DialogTitle>
          <DialogDescription>
            Leads, contacts, deals, activities, notes and advanced Zoho CRM operations.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2Icon className="animate-spin size-6 text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Zoho CRM Credential</Label>
              {isLoadingCredentials ? (
                <div className="text-sm text-muted-foreground">Loading credentials…</div>
              ) : credentials && credentials.length > 0 ? (
                <Select value={credentialId} onValueChange={setCredentialId}>
                  <SelectTrigger><SelectValue placeholder="Select credential" /></SelectTrigger>
                  <SelectContent>
                    {credentials.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No Zoho CRM credentials. <Link href="/credentials" className="underline">Add one</Link>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Variable Name</Label>
              <Input value={variableName} onChange={(e) => setVariableName(e.target.value)} placeholder="zoho" />
              <p className="text-xs text-muted-foreground">Use <code>{`{{${v}.fieldName}}`}</code> in downstream nodes</p>
            </div>

            <div className="space-y-2">
              <Label>Operation</Label>
              <Select value={operation} onValueChange={(val) => setOperation(val as ZohoOp)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Leads</SelectLabel>
                    <SelectItem value="CREATE_LEAD">Create Lead</SelectItem>
                    <SelectItem value="GET_LEAD">Get Lead</SelectItem>
                    <SelectItem value="UPDATE_LEAD">Update Lead</SelectItem>
                    <SelectItem value="DELETE_LEAD">Delete Lead</SelectItem>
                    <SelectItem value="SEARCH_LEADS">Search Leads</SelectItem>
                    <SelectItem value="CONVERT_LEAD">Convert Lead</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Contacts</SelectLabel>
                    <SelectItem value="CREATE_CONTACT">Create Contact</SelectItem>
                    <SelectItem value="GET_CONTACT">Get Contact</SelectItem>
                    <SelectItem value="UPDATE_CONTACT">Update Contact</SelectItem>
                    <SelectItem value="DELETE_CONTACT">Delete Contact</SelectItem>
                    <SelectItem value="SEARCH_CONTACTS">Search Contacts</SelectItem>
                    <SelectItem value="GET_CONTACT_DEALS">Get Contact Deals</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Deals</SelectLabel>
                    <SelectItem value="CREATE_DEAL">Create Deal</SelectItem>
                    <SelectItem value="GET_DEAL">Get Deal</SelectItem>
                    <SelectItem value="UPDATE_DEAL">Update Deal</SelectItem>
                    <SelectItem value="DELETE_DEAL">Delete Deal</SelectItem>
                    <SelectItem value="SEARCH_DEALS">Search Deals</SelectItem>
                    <SelectItem value="UPDATE_DEAL_STAGE">Update Deal Stage</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Accounts</SelectLabel>
                    <SelectItem value="CREATE_ACCOUNT">Create Account</SelectItem>
                    <SelectItem value="GET_ACCOUNT">Get Account</SelectItem>
                    <SelectItem value="UPDATE_ACCOUNT">Update Account</SelectItem>
                    <SelectItem value="DELETE_ACCOUNT">Delete Account</SelectItem>
                    <SelectItem value="SEARCH_ACCOUNTS">Search Accounts</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Activities</SelectLabel>
                    <SelectItem value="CREATE_TASK">Create Task</SelectItem>
                    <SelectItem value="CREATE_CALL_LOG">Log Call</SelectItem>
                    <SelectItem value="CREATE_MEETING">Create Meeting</SelectItem>
                    <SelectItem value="GET_ACTIVITIES">Get Activities</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Notes</SelectLabel>
                    <SelectItem value="ADD_NOTE">Add Note</SelectItem>
                    <SelectItem value="GET_NOTES">Get Notes</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Advanced</SelectLabel>
                    <SelectItem value="UPSERT_RECORD">Upsert Record</SelectItem>
                    <SelectItem value="SEARCH_RECORDS">Search Records</SelectItem>
                    <SelectItem value="GET_FIELDS">Get Fields</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {showRecordId && (
              <div className="space-y-2">
                <Label>Record ID</Label>
                <Input value={recordId} onChange={(e) => setRecordId(e.target.value)} placeholder="{{variableName.fieldName}} or static value" />
              </div>
            )}

            {(showModule || ["ADD_NOTE", "GET_NOTES"].includes(operation)) && (
              <div className="space-y-2">
                <Label>Module</Label>
                <Select value={["ADD_NOTE", "GET_NOTES"].includes(operation) ? parentModule : module} onValueChange={(value) => {
                  if (["ADD_NOTE", "GET_NOTES"].includes(operation)) setParentModule(value)
                  else setModule(value)
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Leads">Leads</SelectItem>
                    <SelectItem value="Contacts">Contacts</SelectItem>
                    <SelectItem value="Deals">Deals</SelectItem>
                    <SelectItem value="Accounts">Accounts</SelectItem>
                    <SelectItem value="Tasks">Tasks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {["CREATE_LEAD", "UPDATE_LEAD", "CREATE_CONTACT", "UPDATE_CONTACT", "UPSERT_RECORD"].includes(operation) && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>First Name</Label><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="{{variableName.fieldName}} or static value" /></div>
                  <div className="space-y-2"><Label>Last Name</Label><Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="{{variableName.fieldName}} or static value" /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2"><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="{{variableName.fieldName}} or static value" /></div>
                  <div className="space-y-2"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="{{variableName.fieldName}} or static value" /></div>
                  <div className="space-y-2"><Label>Mobile</Label><Input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="{{variableName.fieldName}} or static value" /></div>
                </div>
              </>
            )}

            {["CREATE_LEAD", "UPDATE_LEAD"].includes(operation) && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Company</Label><Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="{{variableName.fieldName}} or static value" /></div>
                  <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="{{variableName.fieldName}} or static value" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Website</Label><Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="{{variableName.fieldName}} or static value" /></div>
                  <div className="space-y-2"><Label>Lead Source</Label><Input value={leadSource} onChange={(e) => setLeadSource(e.target.value)} placeholder="{{variableName.fieldName}} or static value" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Lead Status</Label><Input value={leadStatus} onChange={(e) => setLeadStatus(e.target.value)} placeholder="{{variableName.fieldName}} or static value" /></div>
                  <div className="space-y-2"><Label>Industry</Label><Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="{{variableName.fieldName}} or static value" /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2"><Label>Annual Revenue</Label><Input value={annualRevenue} onChange={(e) => setAnnualRevenue(e.target.value)} placeholder="{{variableName.fieldName}} or static value" /></div>
                  <div className="space-y-2"><Label>No. of Employees</Label><Input value={noOfEmployees} onChange={(e) => setNoOfEmployees(e.target.value)} placeholder="{{variableName.fieldName}} or static value" /></div>
                  <div className="space-y-2"><Label>Rating</Label><Input value={rating} onChange={(e) => setRating(e.target.value)} placeholder="{{variableName.fieldName}} or static value" /></div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="{{variableName.fieldName}} or static value"
                    rows={3}
                  />
                </div>
              </>
            )}

            {["CREATE_CONTACT", "CREATE_DEAL", "CREATE_ACCOUNT", "UPDATE_ACCOUNT"].includes(operation) && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Account Name</Label><Input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="{{variableName.fieldName}} or static value" /></div>
                {operation === "CREATE_DEAL" && <div className="space-y-2"><Label>Contact Name</Label><Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="{{variableName.fieldName}} or static value" /></div>}
              </div>
            )}

            {["CREATE_CONTACT", "UPDATE_CONTACT"].includes(operation) && (
              <>
                <div className="space-y-2">
                  <Label>Job Title</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="{{variableName.fieldName}} or static value"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Lead Source</Label>
                  <Input
                    value={leadSource}
                    onChange={(e) => setLeadSource(e.target.value)}
                    placeholder="{{variableName.fieldName}} or static value"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="{{variableName.fieldName}} or static value"
                    rows={3}
                  />
                </div>
              </>
            )}

            {( ["CREATE_DEAL", "UPDATE_DEAL", "UPDATE_DEAL_STAGE"].includes(operation) ||
              (operation === "CONVERT_LEAD" && createDeal)) && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Deal Name</Label><Input value={dealName} onChange={(e) => setDealName(e.target.value)} placeholder="{{variableName.fieldName}} or static value" /></div>
                  <div className="space-y-2">
                    <Label>Stage</Label>
                    <Select value={dealStage} onValueChange={setDealStage}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DEAL_STAGE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2"><Label>Amount</Label><Input value={dealAmount} onChange={(e) => setDealAmount(e.target.value)} placeholder="{{variableName.fieldName}} or static value" /></div>
                  <div className="space-y-2"><Label>Closing Date</Label><Input type="date" value={closingDate} onChange={(e) => setClosingDate(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Probability</Label><Input value={probability} onChange={(e) => setProbability(e.target.value)} placeholder="{{variableName.fieldName}} or static value" /></div>
                </div>
                <div className="space-y-2"><Label>Deal Type</Label><Input value={dealType} onChange={(e) => setDealType(e.target.value)} placeholder="{{variableName.fieldName}} or static value" /></div>
                {["CREATE_DEAL", "UPDATE_DEAL"].includes(operation) && (
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="{{variableName.fieldName}} or static value"
                      rows={3}
                    />
                  </div>
                )}
              </>
            )}

            {["CREATE_ACCOUNT", "UPDATE_ACCOUNT"].includes(operation) && (
              <>
                <div className="space-y-2">
                  <Label>Account Owner</Label>
                  <Input
                    value={accountOwner}
                    onChange={(e) => setAccountOwner(e.target.value)}
                    placeholder="{{variableName.fieldName}} or owner name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Billing City</Label>
                    <Input
                      value={billingCity}
                      onChange={(e) => setBillingCity(e.target.value)}
                      placeholder="{{variableName.fieldName}} or static value"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Billing State</Label>
                    <Input
                      value={billingState}
                      onChange={(e) => setBillingState(e.target.value)}
                      placeholder="{{variableName.fieldName}} or static value"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="{{variableName.fieldName}} or static value"
                    rows={3}
                  />
                </div>
              </>
            )}

            {showAddress && (
              <>
                <div className="space-y-2"><Label>Street</Label><Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="{{variableName.fieldName}} or static value" /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2"><Label>City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="{{variableName.fieldName}} or static value" /></div>
                  <div className="space-y-2"><Label>State</Label><Input value={state} onChange={(e) => setState(e.target.value)} placeholder="{{variableName.fieldName}} or static value" /></div>
                  <div className="space-y-2"><Label>Country</Label><Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="{{variableName.fieldName}} or static value" /></div>
                </div>
                <div className="space-y-2"><Label>ZIP Code</Label><Input value={zipCode} onChange={(e) => setZipCode(e.target.value)} placeholder="{{variableName.fieldName}} or static value" /></div>
              </>
            )}

            {operation === "CREATE_TASK" && (
              <>
                <div className="space-y-2"><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="{{variableName.fieldName}} or static value" /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Status</Label><Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Not Started">Not Started</SelectItem><SelectItem value="In Progress">In Progress</SelectItem><SelectItem value="Completed">Completed</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label>Priority</Label><Select value={priority} onValueChange={setPriority}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="High">High</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="Low">Low</SelectItem></SelectContent></Select></div>
                </div>
                <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="{{variableName.fieldName}} or static value" /></div>
              </>
            )}

            {operation === "CREATE_CALL_LOG" && (
              <>
                <div className="space-y-2"><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="{{variableName.fieldName}} or static value" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Duration (HH:MM)</Label><Input value={callDuration} onChange={(e) => setCallDuration(e.target.value)} placeholder="00:01" /></div>
                  <div className="space-y-2"><Label>Direction</Label><Select value={callDirection} onValueChange={setCallDirection}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Inbound">Inbound</SelectItem><SelectItem value="Outbound">Outbound</SelectItem></SelectContent></Select></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Result</Label><Input value={callResult} onChange={(e) => setCallResult(e.target.value)} placeholder="{{variableName.fieldName}} or static value" /></div>
                  <div className="space-y-2"><Label>Start Time</Label><Input type="datetime-local" value={callStartTime} onChange={(e) => setCallStartTime(e.target.value)} /></div>
                </div>
                <div className="space-y-2"><Label>Description</Label><Textarea value={callDescription} onChange={(e) => setCallDescription(e.target.value)} placeholder="{{variableName.fieldName}} or static value" /></div>
              </>
            )}

            {operation === "CREATE_MEETING" && (
              <>
                <div className="space-y-2"><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="{{variableName.fieldName}} or static value" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Start DateTime</Label><Input type="datetime-local" value={meetingStart} onChange={(e) => setMeetingStart(e.target.value)} /></div>
                  <div className="space-y-2"><Label>End DateTime</Label><Input type="datetime-local" value={meetingEnd} onChange={(e) => setMeetingEnd(e.target.value)} /></div>
                </div>
                <div className="space-y-2"><Label>Agenda</Label><Textarea value={meetingAgenda} onChange={(e) => setMeetingAgenda(e.target.value)} placeholder="{{variableName.fieldName}} or static value" /></div>
                <div className="space-y-2">
                  <Label>Participants (comma-separated emails)</Label>
                  <Input
                    value={participants}
                    onChange={(e) => setParticipants(e.target.value)}
                    placeholder="rahul@brand.com, priya@brand.com"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Separate multiple emails with commas</p>
                </div>
              </>
            )}

            {["CREATE_TASK", "CREATE_CALL_LOG", "CREATE_MEETING"].includes(operation) && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Who ID</Label><Input value={whoId} onChange={(e) => setWhoId(e.target.value)} placeholder="{{variableName.fieldName}} or static value" /></div>
                <div className="space-y-2"><Label>Who Module</Label><Input value={whoModule} onChange={(e) => setWhoModule(e.target.value)} placeholder="Contacts" /></div>
                <div className="space-y-2"><Label>What ID</Label><Input value={whatId} onChange={(e) => setWhatId(e.target.value)} placeholder="{{variableName.fieldName}} or static value" /></div>
                <div className="space-y-2"><Label>What Module</Label><Input value={whatModule} onChange={(e) => setWhatModule(e.target.value)} placeholder="Deals" /></div>
              </div>
            )}

            {operation === "ADD_NOTE" && (
              <>
                <div className="space-y-2"><Label>Note Title</Label><Input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="{{variableName.fieldName}} or static value" /></div>
                <div className="space-y-2"><Label>Note Content</Label><Textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} placeholder="{{variableName.fieldName}} or static value" /></div>
              </>
            )}

            {showSearch && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Search Term</Label><Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="{{variableName.fieldName}} or static value" /></div>
                  <div className="space-y-2"><Label>Criteria</Label><Input value={criteria} onChange={(e) => setCriteria(e.target.value)} placeholder="(Email:equals:test@example.com)" /></div>
                </div>
                {["SEARCH_CONTACTS", "SEARCH_LEADS"].includes(operation) && (
                  <div className="space-y-2">
                    <Label>Search Field</Label>
                    <Select value={searchField} onValueChange={setSearchField}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {operation === "SEARCH_LEADS" ? (
                          <>
                            <SelectItem value="Email">Email</SelectItem>
                            <SelectItem value="Phone">Phone</SelectItem>
                            <SelectItem value="Company">Company</SelectItem>
                            <SelectItem value="Last_Name">Last Name</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="Email">Email</SelectItem>
                            <SelectItem value="Phone">Phone</SelectItem>
                            <SelectItem value="Mobile">Mobile</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Page</Label><Input type="number" value={page} onChange={(e) => setPage(Number(e.target.value || 1))} /></div>
                  <div className="space-y-2"><Label>Per Page</Label><Input type="number" value={perPage} onChange={(e) => setPerPage(Number(e.target.value || 10))} /></div>
                </div>
              </>
            )}

            {operation === "CONVERT_LEAD" && (
              <>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div><Label>Create Deal</Label><p className="text-xs text-muted-foreground">Create deal during conversion</p></div>
                  <Switch checked={createDeal} onCheckedChange={setCreateDeal} />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div><Label>Overwrite</Label><p className="text-xs text-muted-foreground">Overwrite existing data</p></div>
                  <Switch checked={overwrite} onCheckedChange={setOverwrite} />
                </div>
              </>
            )}

            {["GET_CONTACT_DEALS", "GET_ACTIVITIES", "GET_NOTES"].includes(operation) && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Page</Label>
                  <Input type="number" min={1} value={page} onChange={(e) => setPage(Number(e.target.value || 1))} />
                </div>
                <div className="space-y-2">
                  <Label>Per Page</Label>
                  <Input type="number" min={1} max={200} value={perPage} onChange={(e) => setPerPage(Number(e.target.value || 10))} />
                </div>
              </div>
            )}

            {showUpsert && (
              <div className="space-y-2"><Label>Duplicate Check Field</Label><Input value={duplicateCheckField} onChange={(e) => setDuplicateCheckField(e.target.value)} placeholder="Email" /></div>
            )}

            {showCustomFields && (
              <div className="space-y-2">
                <Label>Custom Fields (JSON)</Label>
                <Textarea rows={4} className="font-mono text-xs" value={customFields} onChange={(e) => setCustomFields(e.target.value)} placeholder='{"Custom_Field__c": "value", "Another_Field__c": 42}' />
              </div>
            )}

            <Separator />

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label>Continue on Fail</Label>
                <p className="text-xs text-muted-foreground">Continue workflow if this node errors</p>
              </div>
              <Switch checked={continueOnFail} onCheckedChange={setContinueOnFail} />
            </div>

            <div className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
              <p>Template input placeholder: <code>{"{{variableName.fieldName}} or static value"}</code></p>
            </div>

            <Button onClick={() => onOpenChange(false)} className="w-full" disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? <><Loader2Icon className="size-4 mr-2 animate-spin" />Saving…</> : saved ? <><CheckIcon className="size-4 mr-2" />Saved</> : "Close"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ZohoCrmDialog
