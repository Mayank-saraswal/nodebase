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

export interface Msg91FormValues {
  credentialId?: string
  operation?: string
  variableName?: string
  mobile?: string
  senderId?: string
  flowId?: string
  smsVariables?: string
  message?: string
  route?: string
  bulkData?: string
  scheduleTime?: string
  otpTemplateId?: string
  otpExpiry?: number
  otpLength?: number
  otpValue?: string
  retryType?: string
  whatsappTemplate?: string
  whatsappLang?: string
  whatsappParams?: string
  integratedNumber?: string
  mediaType?: string
  mediaUrl?: string
  mediaCaption?: string
  voiceMessage?: string
  toEmail?: string
  subject?: string
  emailBody?: string
  fromEmail?: string
  fromName?: string
  requestId?: string
  continueOnFail?: boolean
}

interface Msg91DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: Msg91FormValues) => void
  defaultValues?: Partial<Msg91FormValues>
  nodeId?: string
  workflowId?: string
}

type Msg91Op =
  | "SEND_SMS" | "SEND_BULK_SMS" | "SEND_TRANSACTIONAL" | "SCHEDULE_SMS"
  | "SEND_OTP" | "VERIFY_OTP" | "RESEND_OTP" | "INVALIDATE_OTP"
  | "SEND_WHATSAPP" | "SEND_WHATSAPP_MEDIA"
  | "SEND_VOICE_OTP"
  | "SEND_EMAIL"
  | "GET_BALANCE" | "GET_REPORT"

const SMS_OPS: Msg91Op[] = ["SEND_SMS", "SEND_BULK_SMS", "SEND_TRANSACTIONAL", "SCHEDULE_SMS"]
const OTP_OPS: Msg91Op[] = ["SEND_OTP", "VERIFY_OTP", "RESEND_OTP", "INVALIDATE_OTP"]
const WHATSAPP_OPS: Msg91Op[] = ["SEND_WHATSAPP", "SEND_WHATSAPP_MEDIA"]
const MOBILE_OPS: Msg91Op[] = [...SMS_OPS, ...OTP_OPS, ...WHATSAPP_OPS, "SEND_VOICE_OTP"]

const needsMobile = (op: string) => MOBILE_OPS.includes(op as Msg91Op)
const needsFlowId = (op: string) =>
  ["SEND_SMS", "SEND_BULK_SMS", "SCHEDULE_SMS"].includes(op)
const needsSenderId = (op: string) =>
  ["SEND_SMS", "SEND_BULK_SMS", "SEND_TRANSACTIONAL", "SCHEDULE_SMS"].includes(op)
const needsOtpFields = (op: string) =>
  ["SEND_OTP", "SEND_VOICE_OTP"].includes(op)

const OUTPUT_HINTS: Record<string, string[]> = {
  SEND_SMS: ["requestId", "status", "mobile"],
  SEND_BULK_SMS: ["requestId", "count", "status"],
  SEND_TRANSACTIONAL: ["requestId", "status", "mobile"],
  SCHEDULE_SMS: ["requestId", "status", "mobile"],
  SEND_OTP: ["status", "mobile"],
  VERIFY_OTP: ["verified", "status", "mobile"],
  RESEND_OTP: ["status", "mobile", "retryType"],
  INVALIDATE_OTP: ["status", "mobile"],
  SEND_WHATSAPP: ["messageId", "status", "mobile"],
  SEND_WHATSAPP_MEDIA: ["messageId", "status", "mobile"],
  SEND_VOICE_OTP: ["status", "mobile"],
  SEND_EMAIL: ["status"],
  GET_BALANCE: ["balance"],
  GET_REPORT: ["requestId", "reports"],
}

export const Msg91Dialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  nodeId,
  workflowId,
}: Msg91DialogProps) => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const [credentialId, setCredentialId] = useState(defaultValues.credentialId || "")
  const [operation, setOperation] = useState<Msg91Op>((defaultValues.operation as Msg91Op) || "SEND_OTP")
  const [variableName, setVariableName] = useState(defaultValues.variableName || "msg91")
  const [mobile, setMobile] = useState(defaultValues.mobile || "")
  const [senderId, setSenderId] = useState(defaultValues.senderId || "")
  const [flowId, setFlowId] = useState(defaultValues.flowId || "")
  const [smsVariables, setSmsVariables] = useState(defaultValues.smsVariables || "{}")
  const [message, setMessage] = useState(defaultValues.message || "")
  const [route, setRoute] = useState(defaultValues.route || "4")
  const [bulkData, setBulkData] = useState(defaultValues.bulkData || "[]")
  const [scheduleTime, setScheduleTime] = useState(defaultValues.scheduleTime || "")
  const [otpTemplateId, setOtpTemplateId] = useState(defaultValues.otpTemplateId || "")
  const [otpExpiry, setOtpExpiry] = useState(defaultValues.otpExpiry ?? 10)
  const [otpLength, setOtpLength] = useState(defaultValues.otpLength ?? 6)
  const [otpValue, setOtpValue] = useState(defaultValues.otpValue || "")
  const [retryType, setRetryType] = useState(defaultValues.retryType || "text")
  const [whatsappTemplate, setWhatsappTemplate] = useState(defaultValues.whatsappTemplate || "")
  const [whatsappLang, setWhatsappLang] = useState(defaultValues.whatsappLang || "en")
  const [whatsappParams, setWhatsappParams] = useState(defaultValues.whatsappParams || "[]")
  const [integratedNumber, setIntegratedNumber] = useState(defaultValues.integratedNumber || "")
  const [mediaType, setMediaType] = useState(defaultValues.mediaType || "image")
  const [mediaUrl, setMediaUrl] = useState(defaultValues.mediaUrl || "")
  const [mediaCaption, setMediaCaption] = useState(defaultValues.mediaCaption || "")
  const [voiceMessage, setVoiceMessage] = useState(defaultValues.voiceMessage || "")
  const [toEmail, setToEmail] = useState(defaultValues.toEmail || "")
  const [subject, setSubject] = useState(defaultValues.subject || "")
  const [emailBody, setEmailBody] = useState(defaultValues.emailBody || "")
  const [fromEmail, setFromEmail] = useState(defaultValues.fromEmail || "")
  const [fromName, setFromName] = useState(defaultValues.fromName || "")
  const [requestId, setRequestId] = useState(defaultValues.requestId || "")
  const [continueOnFail, setContinueOnFail] = useState(defaultValues.continueOnFail ?? false)
  const [saved, setSaved] = useState(false)

  const { data: credentials, isLoading: isLoadingCredentials } =
    useCredentialsByType(CredentialType.MSG91)

  const config = undefined as any;
const isLoading = false;

useEffect(() => {
    if (config) {
      setCredentialId(config.credentialId || "")
      setOperation(config.operation as Msg91Op)
      setVariableName(config.variableName || "msg91")
      setMobile(config.mobile)
      setSenderId(config.senderId)
      setFlowId(config.flowId)
      setSmsVariables(config.smsVariables)
      setMessage(config.message)
      setRoute(config.route)
      setBulkData(config.bulkData)
      setScheduleTime(config.scheduleTime)
      setOtpTemplateId(config.otpTemplateId)
      setOtpExpiry(config.otpExpiry)
      setOtpLength(config.otpLength)
      setOtpValue(config.otpValue)
      setRetryType(config.retryType)
      setWhatsappTemplate(config.whatsappTemplate)
      setWhatsappLang(config.whatsappLang)
      setWhatsappParams(config.whatsappParams)
      setIntegratedNumber(config.integratedNumber)
      setMediaType(config.mediaType)
      setMediaUrl(config.mediaUrl)
      setMediaCaption(config.mediaCaption)
      setVoiceMessage(config.voiceMessage)
      setToEmail(config.toEmail)
      setSubject(config.subject)
      setEmailBody(config.emailBody)
      setFromEmail(config.fromEmail)
      setFromName(config.fromName)
      setRequestId(config.requestId)
      setContinueOnFail(config.continueOnFail)
    }
  }, [config])

  useEffect(() => {
    if (open && !config) {
      setCredentialId(defaultValues.credentialId || "")
      setOperation((defaultValues.operation as Msg91Op) || "SEND_OTP")
      setVariableName(defaultValues.variableName || "msg91")
      setMobile(defaultValues.mobile || "")
      setSenderId(defaultValues.senderId || "")
      setFlowId(defaultValues.flowId || "")
      setSmsVariables(defaultValues.smsVariables || "{}")
      setMessage(defaultValues.message || "")
      setRoute(defaultValues.route || "4")
      setBulkData(defaultValues.bulkData || "[]")
      setScheduleTime(defaultValues.scheduleTime || "")
      setOtpTemplateId(defaultValues.otpTemplateId || "")
      setOtpExpiry(defaultValues.otpExpiry ?? 10)
      setOtpLength(defaultValues.otpLength ?? 6)
      setOtpValue(defaultValues.otpValue || "")
      setRetryType(defaultValues.retryType || "text")
      setWhatsappTemplate(defaultValues.whatsappTemplate || "")
      setWhatsappLang(defaultValues.whatsappLang || "en")
      setWhatsappParams(defaultValues.whatsappParams || "[]")
      setIntegratedNumber(defaultValues.integratedNumber || "")
      setMediaType(defaultValues.mediaType || "image")
      setMediaUrl(defaultValues.mediaUrl || "")
      setMediaCaption(defaultValues.mediaCaption || "")
      setVoiceMessage(defaultValues.voiceMessage || "")
      setToEmail(defaultValues.toEmail || "")
      setSubject(defaultValues.subject || "")
      setEmailBody(defaultValues.emailBody || "")
      setFromEmail(defaultValues.fromEmail || "")
      setFromName(defaultValues.fromName || "")
      setRequestId(defaultValues.requestId || "")
      setContinueOnFail(defaultValues.continueOnFail ?? false)
    }
  }, [open, config, defaultValues])

  const upsertMutation = { isPending: false, mutate: (args?: any) => {}, mutateAsync: async (args?: any) => {} } as any;

const handleSave = () => {
    if (!nodeId || !workflowId) return
    const values: Msg91FormValues = {
      credentialId: credentialId || undefined,
      operation,
      variableName,
      mobile,
      senderId,
      flowId,
      smsVariables,
      message,
      route,
      bulkData,
      scheduleTime,
      otpTemplateId,
      otpExpiry,
      otpLength,
      otpValue,
      retryType,
      whatsappTemplate,
      whatsappLang,
      whatsappParams,
      integratedNumber,
      mediaType,
      mediaUrl,
      mediaCaption,
      voiceMessage,
      toEmail,
      subject,
      emailBody,
      fromEmail,
      fromName,
      requestId,
      continueOnFail,
    }
    upsertMutation.mutate({
      nodeId,
      workflowId,
      credentialId: credentialId || undefined,
      operation,
      variableName,
      mobile,
      senderId,
      flowId,
      smsVariables,
      message,
      route,
      bulkData,
      scheduleTime,
      otpTemplateId,
      otpExpiry,
      otpLength,
      otpValue,
      retryType,
      whatsappTemplate,
      whatsappLang,
      whatsappParams,
      integratedNumber,
      mediaType,
      mediaUrl,
      mediaCaption,
      voiceMessage,
      toEmail,
      subject,
      emailBody,
      fromEmail,
      fromName,
      requestId,
      continueOnFail,
    })
    onSubmit(values)
  }

  const v = variableName || "msg91"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>MSG91 Configuration</DialogTitle>
          <DialogDescription>
            SMS, OTP, WhatsApp, Voice & Email via MSG91
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2Icon className="animate-spin size-6 text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* ── SECTION 1: Always visible ───────────────── */}

            {/* Credential */}
            <div className="space-y-2">
              <Label>MSG91 Credential</Label>
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
                  No MSG91 credentials.{" "}
                  <Link href="/credentials" className="underline">Add one</Link>
                </p>
              )}
            </div>

            <Separator />

            {/* Operation (grouped) */}
            <div className="space-y-2">
              <Label>Operation</Label>
              <Select value={operation} onValueChange={(val) => setOperation(val as Msg91Op)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>SMS</SelectLabel>
                    <SelectItem value="SEND_SMS">Send SMS (Template)</SelectItem>
                    <SelectItem value="SEND_TRANSACTIONAL">Send Transactional SMS</SelectItem>
                    <SelectItem value="SEND_BULK_SMS">Send Bulk SMS</SelectItem>
                    <SelectItem value="SCHEDULE_SMS">Schedule SMS</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>OTP</SelectLabel>
                    <SelectItem value="SEND_OTP">Send OTP</SelectItem>
                    <SelectItem value="VERIFY_OTP">Verify OTP</SelectItem>
                    <SelectItem value="RESEND_OTP">Resend OTP</SelectItem>
                    <SelectItem value="INVALIDATE_OTP">Invalidate OTP</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>WhatsApp</SelectLabel>
                    <SelectItem value="SEND_WHATSAPP">Send WhatsApp Template</SelectItem>
                    <SelectItem value="SEND_WHATSAPP_MEDIA">Send WhatsApp Media</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Voice</SelectLabel>
                    <SelectItem value="SEND_VOICE_OTP">Send Voice OTP</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Email</SelectLabel>
                    <SelectItem value="SEND_EMAIL">Send Email</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Account</SelectLabel>
                    <SelectItem value="GET_BALANCE">Get SMS Balance</SelectItem>
                    <SelectItem value="GET_REPORT">Get Delivery Report</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Variable name */}
            <div className="space-y-2">
              <Label>Variable Name</Label>
              <Input value={variableName} onChange={(e) => setVariableName(e.target.value)} placeholder="msg91" />
              <p className="text-xs text-muted-foreground">Access output as {`{{${v}.status}}`}.</p>
            </div>

            {/* Continue on fail */}
            <div className="flex items-center justify-between">
              <Label>Continue on Fail</Label>
              <Switch checked={continueOnFail} onCheckedChange={setContinueOnFail} />
            </div>

            <Separator />

            {/* ── SECTION 2: Mobile number ────────────────── */}
            {needsMobile(operation) && (
              <div className="space-y-2">
                <Label>Mobile Number</Label>
                <Input
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="919876543210 or {{whatsappTrigger.from}}"
                />
                <p className="text-xs text-muted-foreground">
                  Include country code without + (e.g. 919876543210 for India). Supports {"{{variables}}"}.
                </p>
              </div>
            )}

            {/* ── SECTION 3: Conditional fields ───────────── */}

            {/* ── SEND_SMS / SCHEDULE_SMS ─────────────────── */}
            {(operation === "SEND_SMS" || operation === "SCHEDULE_SMS") && (
              <>
                {needsSenderId(operation) && (
                  <div className="space-y-2">
                    <Label>Sender ID</Label>
                    <Input value={senderId} onChange={(e) => setSenderId(e.target.value)} placeholder="NODEBS" maxLength={6} />
                    <p className="text-xs text-muted-foreground">6-character DLT-registered sender ID</p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Flow ID</Label>
                  <Input value={flowId} onChange={(e) => setFlowId(e.target.value)} placeholder="MSG91 Flow ID" />
                  <p className="text-xs text-muted-foreground">Find in MSG91 Dashboard → SMS → Flows</p>
                </div>
                <div className="space-y-2">
                  <Label>SMS Variables (JSON)</Label>
                  <Textarea
                    value={smsVariables}
                    onChange={(e) => setSmsVariables(e.target.value)}
                    placeholder={'{"VAR1": "{{order.amount}}", "VAR2": "Order #{{order.id}}"}'}
                    rows={3}
                  />
                </div>
                {operation === "SCHEDULE_SMS" && (
                  <div className="space-y-2">
                    <Label>Schedule Time</Label>
                    <Input
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      placeholder="2025-04-01 10:00:00 or {{trigger.scheduledAt}}"
                    />
                  </div>
                )}
                {/* DLT Compliance Card */}
                <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-1">
                  <p className="text-xs font-medium">📋 DLT Registration Required</p>
                  <p className="text-xs text-muted-foreground">
                    India&apos;s TRAI mandates DLT registration for commercial SMS.
                    Register templates at Jio DLT portal or via your telecom operator.
                    Your Flow ID must correspond to a DLT-approved template.
                  </p>
                </div>
              </>
            )}

            {/* ── SEND_TRANSACTIONAL ──────────────────────── */}
            {operation === "SEND_TRANSACTIONAL" && (
              <>
                <div className="space-y-2">
                  <Label>Sender ID</Label>
                  <Input value={senderId} onChange={(e) => setSenderId(e.target.value)} placeholder="NODEBS" maxLength={6} />
                  <p className="text-xs text-muted-foreground">6-character DLT-registered sender ID</p>
                </div>
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Your message text — supports {{variables}}"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Route</Label>
                  <Select value={route} onValueChange={setRoute}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4">4 - Transactional</SelectItem>
                      <SelectItem value="8">8 - DND Transactional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* ── SEND_BULK_SMS ───────────────────────────── */}
            {operation === "SEND_BULK_SMS" && (
              <>
                <div className="space-y-2">
                  <Label>Sender ID</Label>
                  <Input value={senderId} onChange={(e) => setSenderId(e.target.value)} placeholder="NODEBS" maxLength={6} />
                  <p className="text-xs text-muted-foreground">6-character DLT-registered sender ID</p>
                </div>
                <div className="space-y-2">
                  <Label>Flow ID</Label>
                  <Input value={flowId} onChange={(e) => setFlowId(e.target.value)} placeholder="MSG91 Flow ID" />
                  <p className="text-xs text-muted-foreground">Find in MSG91 Dashboard → SMS → Flows</p>
                </div>
                <div className="space-y-2">
                  <Label>Bulk Data (JSON Array)</Label>
                  <Textarea
                    value={bulkData}
                    onChange={(e) => setBulkData(e.target.value)}
                    placeholder={`[
  {"mobile": "919876543210", "VAR1": "Order #1234"},
  {"mobile": "919876543211", "VAR1": "Order #5678"}
]`}
                    rows={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    Each item needs &quot;mobile&quot; plus your template variables. CSV import coming soon.
                  </p>
                </div>
              </>
            )}

            {/* ── SEND_OTP ────────────────────────────────── */}
            {operation === "SEND_OTP" && (
              <>
                <div className="space-y-2">
                  <Label>OTP Template ID</Label>
                  <Input value={otpTemplateId} onChange={(e) => setOtpTemplateId(e.target.value)} placeholder="DLT-registered template ID" />
                  <p className="text-xs text-muted-foreground">Find in MSG91 Dashboard → OTP</p>
                </div>
                <div className="space-y-2">
                  <Label>OTP Length</Label>
                  <Select value={String(otpLength)} onValueChange={(val) => setOtpLength(Number(val))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4">4 digits</SelectItem>
                      <SelectItem value="5">5 digits</SelectItem>
                      <SelectItem value="6">6 digits</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>OTP Expiry (minutes)</Label>
                  <Input type="number" value={otpExpiry} onChange={(e) => setOtpExpiry(Number(e.target.value))} placeholder="10" />
                </div>
                {/* OTP Info Card */}
                <div className="rounded-lg border border-blue-300 bg-blue-50 dark:bg-blue-950/30 p-3 space-y-1">
                  <p className="text-xs font-medium">ℹ️ OTP is auto-generated by MSG91</p>
                  <p className="text-xs text-muted-foreground">
                    The OTP is NOT returned in the output for security.
                    Flow: Send OTP → user enters OTP → Verify OTP in next node.
                    Use IF/Else on {`{{${v}.verified}}`} to gate access.
                  </p>
                </div>
              </>
            )}

            {/* ── VERIFY_OTP ──────────────────────────────── */}
            {operation === "VERIFY_OTP" && (
              <>
                <div className="space-y-2">
                  <Label>OTP Value</Label>
                  <Input
                    value={otpValue}
                    onChange={(e) => setOtpValue(e.target.value)}
                    placeholder="{{body.otp}} or {{form.otp}}"
                  />
                  <p className="text-xs text-muted-foreground">
                    The OTP entered by the user — usually from a form or webhook
                  </p>
                </div>
                {/* Verify Info Card */}
                <div className="rounded-lg border border-blue-300 bg-blue-50 dark:bg-blue-950/30 p-3 space-y-1">
                  <p className="text-xs font-medium">ℹ️ Verification result</p>
                  <p className="text-xs text-muted-foreground">
                    Use {`{{${v}.verified}}`} in an IF/Else node to gate the next step.
                    If verified = false and continueOnFail is ON, workflow continues.
                    If verified = false and continueOnFail is OFF, workflow stops.
                  </p>
                </div>
              </>
            )}

            {/* ── RESEND_OTP ──────────────────────────────── */}
            {operation === "RESEND_OTP" && (
              <div className="space-y-2">
                <Label>Retry Type</Label>
                <Select value={retryType} onValueChange={setRetryType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">text - SMS</SelectItem>
                    <SelectItem value="voice">voice - Phone Call</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* ── SEND_VOICE_OTP ──────────────────────────── */}
            {operation === "SEND_VOICE_OTP" && (
              <>
                <div className="space-y-2">
                  <Label>OTP Template ID</Label>
                  <Input value={otpTemplateId} onChange={(e) => setOtpTemplateId(e.target.value)} placeholder="DLT-registered template ID" />
                  <p className="text-xs text-muted-foreground">Find in MSG91 Dashboard → OTP</p>
                </div>
                <div className="space-y-2">
                  <Label>OTP Length</Label>
                  <Select value={String(otpLength)} onValueChange={(val) => setOtpLength(Number(val))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4">4 digits</SelectItem>
                      <SelectItem value="5">5 digits</SelectItem>
                      <SelectItem value="6">6 digits</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>OTP Expiry (minutes)</Label>
                  <Input type="number" value={otpExpiry} onChange={(e) => setOtpExpiry(Number(e.target.value))} placeholder="10" />
                </div>
              </>
            )}

            {/* ── SEND_WHATSAPP ───────────────────────────── */}
            {operation === "SEND_WHATSAPP" && (
              <>
                <div className="space-y-2">
                  <Label>Integrated Number</Label>
                  <Input value={integratedNumber} onChange={(e) => setIntegratedNumber(e.target.value)} placeholder="Your MSG91 WhatsApp number" />
                </div>
                <div className="space-y-2">
                  <Label>Template Name</Label>
                  <Input value={whatsappTemplate} onChange={(e) => setWhatsappTemplate(e.target.value)} placeholder="order_confirmation" />
                </div>
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={whatsappLang} onValueChange={setWhatsappLang}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">en — English</SelectItem>
                      <SelectItem value="en_US">en_US — English (US)</SelectItem>
                      <SelectItem value="hi">hi — Hindi</SelectItem>
                      <SelectItem value="ta">ta — Tamil</SelectItem>
                      <SelectItem value="te">te — Telugu</SelectItem>
                      <SelectItem value="kn">kn — Kannada</SelectItem>
                      <SelectItem value="mr">mr — Marathi</SelectItem>
                      <SelectItem value="bn">bn — Bengali</SelectItem>
                      <SelectItem value="gu">gu — Gujarati</SelectItem>
                      <SelectItem value="ml">ml — Malayalam</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Template Params (JSON Array)</Label>
                  <Textarea
                    value={whatsappParams}
                    onChange={(e) => setWhatsappParams(e.target.value)}
                    placeholder={'[{"type":"body","parameters":[{"type":"text","text":"{{order.id}}"}]}]'}
                    rows={3}
                  />
                </div>
              </>
            )}

            {/* ── SEND_WHATSAPP_MEDIA ─────────────────────── */}
            {operation === "SEND_WHATSAPP_MEDIA" && (
              <>
                <div className="space-y-2">
                  <Label>Integrated Number</Label>
                  <Input value={integratedNumber} onChange={(e) => setIntegratedNumber(e.target.value)} placeholder="Your MSG91 WhatsApp number" />
                </div>
                <div className="space-y-2">
                  <Label>Media Type</Label>
                  <Select value={mediaType} onValueChange={setMediaType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="document">Document</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Media URL</Label>
                  <Input
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg or {{variable}}"
                  />
                  <p className="text-xs text-muted-foreground">Public URL of media to send. Supports {"{{variables}}"}.</p>
                </div>
                <div className="space-y-2">
                  <Label>Caption</Label>
                  <Input value={mediaCaption} onChange={(e) => setMediaCaption(e.target.value)} placeholder="Optional caption" />
                </div>
              </>
            )}

            {/* ── SEND_EMAIL ──────────────────────────────── */}
            {operation === "SEND_EMAIL" && (
              <>
                <div className="space-y-2">
                  <Label>To Email</Label>
                  <Input value={toEmail} onChange={(e) => setToEmail(e.target.value)} placeholder="recipient@example.com or {{variable}}" />
                  <p className="text-xs text-muted-foreground">Supports {"{{variables}}"}</p>
                </div>
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject — supports {{variables}}" />
                </div>
                <div className="space-y-2">
                  <Label>Email Body</Label>
                  <Textarea
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    placeholder="Email content (HTML supported, supports {{variables}})"
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label>From Email</Label>
                  <Input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="sender@yourdomain.com" />
                </div>
                <div className="space-y-2">
                  <Label>From Name</Label>
                  <Input value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Your Name" />
                </div>
              </>
            )}

            {/* ── GET_REPORT ──────────────────────────────── */}
            {operation === "GET_REPORT" && (
              <div className="space-y-2">
                <Label>Request ID</Label>
                <Input
                  value={requestId}
                  onChange={(e) => setRequestId(e.target.value)}
                  placeholder={`{{${v}.requestId}} from a previous Send SMS node`}
                />
              </div>
            )}

            <Separator />

            {/* ── SECTION 4: Output variables ─────────────── */}
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

            {/* ── SECTION 5: Save ─────────────────────────── */}
            <Button onClick={handleSave} disabled={upsertMutation.isPending} className="w-full">
              {upsertMutation.isPending ? (
                <Loader2Icon className="animate-spin size-4 mr-2" />
              ) : saved ? (
                <CheckIcon className="size-4 mr-2" />
              ) : null}
              {saved ? "Saved!" : "Save"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
