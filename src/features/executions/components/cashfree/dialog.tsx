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
import { CashfreeOperation } from "@/features/executions/enums"
import { CheckIcon, Loader2Icon } from "lucide-react"
import Link from "next/link"
import { Separator } from "@/components/ui/separator"

export interface CashfreeFormValues {
  credentialId?: string
  operation?: CashfreeOperation
  variableName?: string
  continueOnFail?: boolean
  // Order
  orderId?: string
  orderAmount?: string
  orderCurrency?: string
  orderNote?: string
  orderMeta?: string
  // Customer
  customerId?: string
  customerEmail?: string
  customerPhone?: string
  customerName?: string
  // Payment
  cfPaymentId?: string
  cfOrderId?: string
  paymentMethod?: string
  // Refund
  refundId?: string
  refundAmount?: string
  refundNote?: string
  refundSpeed?: string
  refundSplits?: string
  // Settlement
  startDate?: string
  endDate?: string
  cursor?: string
  limit?: number
  // Payment Link
  linkId?: string
  linkAmount?: string
  linkCurrency?: string
  linkPurpose?: string
  linkDescription?: string
  linkExpiryTime?: string
  linkNotifyPhone?: boolean
  linkNotifyEmail?: boolean
  linkAutoReminders?: boolean
  linkMinPartialAmount?: string
  // Subscription
  subscriptionId?: string
  planId?: string
  planName?: string
  planType?: string
  planIntervalType?: string
  planIntervals?: number
  planMaxCycles?: number
  planMaxAmount?: string
  subscriptionFirstChargeTime?: string
  subscriptionExpiryTime?: string
  subscriptionReturnUrl?: string
  subscriptionNotifyUrl?: string
  subscriptionAction?: string
  // Payout / Beneficiary
  beneId?: string
  beneName?: string
  beneEmail?: string
  benePhone?: string
  beneBankAccount?: string
  beneBankIfsc?: string
  beneVpa?: string
  beneAddress?: string
  beneCity?: string
  beneState?: string
  benePincode?: string
  transferId?: string
  transferAmount?: string
  transferRemarks?: string
  transferMode?: string
  batchTransferId?: string
  batchEntries?: string
  // UPI
  upiVpa?: string
  upiAmount?: string
  upiDescription?: string
  // Offer
  offerId?: string
  offerMeta?: string
  offerValidations?: string
  offerDetails?: string
  // Webhook
  webhookSignature?: string
  webhookTimestamp?: string
  webhookRawBody?: string
  webhookThrowOnFail?: boolean
}

interface CashfreeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: CashfreeFormValues) => void
  defaultValues?: Partial<CashfreeFormValues>
  nodeId?: string
  workflowId?: string
}

const OP_GROUPS: Array<{ label: string; ops: CashfreeOperation[] }> = [
  {
    label: "Orders",
    ops: [
      CashfreeOperation.CREATE_ORDER,
      CashfreeOperation.GET_ORDER,
      CashfreeOperation.TERMINATE_ORDER,
      CashfreeOperation.PAY_ORDER,
    ],
  },
  {
    label: "Payments",
    ops: [
      CashfreeOperation.GET_PAYMENTS_FOR_ORDER,
      CashfreeOperation.GET_PAYMENT_BY_ID,
    ],
  },
  {
    label: "Refunds",
    ops: [
      CashfreeOperation.CREATE_REFUND,
      CashfreeOperation.GET_REFUND,
      CashfreeOperation.GET_ALL_REFUNDS_FOR_ORDER,
    ],
  },
  {
    label: "Settlements",
    ops: [
      CashfreeOperation.GET_SETTLEMENTS_FOR_ORDER,
      CashfreeOperation.GET_ALL_SETTLEMENTS,
      CashfreeOperation.GET_SETTLEMENT_RECON,
    ],
  },
  {
    label: "Payment Links",
    ops: [
      CashfreeOperation.CREATE_PAYMENT_LINK,
      CashfreeOperation.GET_PAYMENT_LINK,
      CashfreeOperation.CANCEL_PAYMENT_LINK,
      CashfreeOperation.GET_ORDERS_FOR_LINK,
    ],
  },
  {
    label: "Subscriptions",
    ops: [
      CashfreeOperation.CREATE_SUBSCRIPTION_PLAN,
      CashfreeOperation.GET_SUBSCRIPTION_PLAN,
      CashfreeOperation.CREATE_SUBSCRIPTION,
      CashfreeOperation.GET_SUBSCRIPTION,
      CashfreeOperation.MANAGE_SUBSCRIPTION,
      CashfreeOperation.GET_SUBSCRIPTION_PAYMENTS,
    ],
  },
  {
    label: "Payouts",
    ops: [
      CashfreeOperation.GET_PAYOUT_BALANCE,
      CashfreeOperation.ADD_BENEFICIARY,
      CashfreeOperation.GET_BENEFICIARY,
      CashfreeOperation.REMOVE_BENEFICIARY,
      CashfreeOperation.TRANSFER_TO_BENEFICIARY,
      CashfreeOperation.GET_TRANSFER_STATUS,
      CashfreeOperation.BULK_TRANSFER,
      CashfreeOperation.GET_BATCH_TRANSFER_STATUS,
    ],
  },
  {
    label: "UPI",
    ops: [
      CashfreeOperation.VALIDATE_UPI_ID,
      CashfreeOperation.CREATE_UPI_PAYMENT_LINK,
    ],
  },
  {
    label: "Offers",
    ops: [CashfreeOperation.CREATE_OFFER, CashfreeOperation.GET_OFFER],
  },
  {
    label: "Webhooks",
    ops: [CashfreeOperation.VERIFY_WEBHOOK_SIGNATURE],
  },
]

const OP_LABEL: Record<string, string> = {
  CREATE_ORDER: "Create Order",
  GET_ORDER: "Get Order",
  TERMINATE_ORDER: "Terminate Order",
  PAY_ORDER: "Pay Order",
  GET_PAYMENTS_FOR_ORDER: "Get Payments for Order",
  GET_PAYMENT_BY_ID: "Get Payment by ID",
  CREATE_REFUND: "Create Refund",
  GET_REFUND: "Get Refund",
  GET_ALL_REFUNDS_FOR_ORDER: "Get All Refunds",
  GET_SETTLEMENTS_FOR_ORDER: "Get Settlements for Order",
  GET_ALL_SETTLEMENTS: "Get All Settlements",
  GET_SETTLEMENT_RECON: "Get Settlement Recon",
  CREATE_PAYMENT_LINK: "Create Payment Link",
  GET_PAYMENT_LINK: "Get Payment Link",
  CANCEL_PAYMENT_LINK: "Cancel Payment Link",
  GET_ORDERS_FOR_LINK: "Get Orders for Link",
  CREATE_SUBSCRIPTION_PLAN: "Create Plan",
  GET_SUBSCRIPTION_PLAN: "Get Plan",
  CREATE_SUBSCRIPTION: "Create Subscription",
  GET_SUBSCRIPTION: "Get Subscription",
  MANAGE_SUBSCRIPTION: "Manage Subscription",
  GET_SUBSCRIPTION_PAYMENTS: "Get Subscription Payments",
  GET_PAYOUT_BALANCE: "Get Payout Balance",
  ADD_BENEFICIARY: "Add Beneficiary",
  GET_BENEFICIARY: "Get Beneficiary",
  REMOVE_BENEFICIARY: "Remove Beneficiary",
  TRANSFER_TO_BENEFICIARY: "Transfer to Beneficiary",
  GET_TRANSFER_STATUS: "Get Transfer Status",
  BULK_TRANSFER: "Bulk Transfer",
  GET_BATCH_TRANSFER_STATUS: "Get Batch Transfer Status",
  VALIDATE_UPI_ID: "Validate UPI ID",
  CREATE_UPI_PAYMENT_LINK: "Create UPI Payment Link",
  CREATE_OFFER: "Create Offer",
  GET_OFFER: "Get Offer",
  VERIFY_WEBHOOK_SIGNATURE: "Verify Webhook Signature",
}

const tf = (
  label: string,
  id: string,
  value: string,
  onChange: (val: string) => void,
  placeholder?: string,
  type: string = "text"
) => (
  <div className="space-y-1" key={id}>
    <Label htmlFor={id}>{label}</Label>
    <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
  </div>
)

export const CashfreeDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  nodeId,
  workflowId,
}: CashfreeDialogProps) => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { data: credentials } = useCredentialsByType(CredentialType.CASHFREE)

  const existingConfig = undefined as any;
  const isLoading = false;

  const upsert = { isPending: false, isSuccess: false, mutateAsync: async (args: any, opts: any) => {} } as any;

  const e = existingConfig
  const d = defaultValues

  const initialState: CashfreeFormValues = useMemo(
    () => ({
      credentialId: d.credentialId || e?.credentialId || "",
      operation: (d.operation as CashfreeOperation | undefined) || e?.operation || CashfreeOperation.CREATE_ORDER,
      variableName: d.variableName || e?.variableName || "cashfree",
      continueOnFail: d.continueOnFail ?? e?.continueOnFail ?? false,
      orderId: d.orderId || e?.orderId || "",
      orderAmount: d.orderAmount || e?.orderAmount || "",
      orderCurrency: d.orderCurrency || e?.orderCurrency || "INR",
      orderNote: d.orderNote || e?.orderNote || "",
      orderMeta: d.orderMeta || e?.orderMeta || "{}",
      customerId: d.customerId || e?.customerId || "",
      customerEmail: d.customerEmail || e?.customerEmail || "",
      customerPhone: d.customerPhone || e?.customerPhone || "",
      customerName: d.customerName || e?.customerName || "",
      cfPaymentId: d.cfPaymentId || e?.cfPaymentId || "",
      cfOrderId: d.cfOrderId || e?.cfOrderId || "",
      paymentMethod: d.paymentMethod || e?.paymentMethod || "",
      refundId: d.refundId || e?.refundId || "",
      refundAmount: d.refundAmount || e?.refundAmount || "",
      refundNote: d.refundNote || e?.refundNote || "",
      refundSpeed: d.refundSpeed || e?.refundSpeed || "STANDARD",
      refundSplits: d.refundSplits || e?.refundSplits || "[]",
      startDate: d.startDate || e?.startDate || "",
      endDate: d.endDate || e?.endDate || "",
      cursor: d.cursor || e?.cursor || "",
      limit: d.limit ?? e?.limit ?? 10,
      linkId: d.linkId || e?.linkId || "",
      linkAmount: d.linkAmount || e?.linkAmount || "",
      linkCurrency: d.linkCurrency || e?.linkCurrency || "INR",
      linkPurpose: d.linkPurpose || e?.linkPurpose || "",
      linkDescription: d.linkDescription || e?.linkDescription || "",
      linkExpiryTime: d.linkExpiryTime || e?.linkExpiryTime || "",
      linkNotifyPhone: d.linkNotifyPhone ?? e?.linkNotifyPhone ?? true,
      linkNotifyEmail: d.linkNotifyEmail ?? e?.linkNotifyEmail ?? true,
      linkAutoReminders: d.linkAutoReminders ?? e?.linkAutoReminders ?? true,
      linkMinPartialAmount: d.linkMinPartialAmount || e?.linkMinPartialAmount || "",
      subscriptionId: d.subscriptionId || e?.subscriptionId || "",
      planId: d.planId || e?.planId || "",
      planName: d.planName || e?.planName || "",
      planType: d.planType || e?.planType || "PERIODIC",
      planIntervalType: d.planIntervalType || e?.planIntervalType || "MONTH",
      planIntervals: d.planIntervals ?? e?.planIntervals ?? 1,
      planMaxCycles: d.planMaxCycles ?? e?.planMaxCycles ?? 0,
      planMaxAmount: d.planMaxAmount || e?.planMaxAmount || "",
      subscriptionFirstChargeTime: d.subscriptionFirstChargeTime || e?.subscriptionFirstChargeTime || "",
      subscriptionExpiryTime: d.subscriptionExpiryTime || e?.subscriptionExpiryTime || "",
      subscriptionReturnUrl: d.subscriptionReturnUrl || e?.subscriptionReturnUrl || "",
      subscriptionNotifyUrl: d.subscriptionNotifyUrl || e?.subscriptionNotifyUrl || "",
      subscriptionAction: d.subscriptionAction || e?.subscriptionAction || "PAUSE",
      beneId: d.beneId || e?.beneId || "",
      beneName: d.beneName || e?.beneName || "",
      beneEmail: d.beneEmail || e?.beneEmail || "",
      benePhone: d.benePhone || e?.benePhone || "",
      beneBankAccount: d.beneBankAccount || e?.beneBankAccount || "",
      beneBankIfsc: d.beneBankIfsc || e?.beneBankIfsc || "",
      beneVpa: d.beneVpa || e?.beneVpa || "",
      beneAddress: d.beneAddress || e?.beneAddress || "",
      beneCity: d.beneCity || e?.beneCity || "",
      beneState: d.beneState || e?.beneState || "India",
      benePincode: d.benePincode || e?.benePincode || "",
      transferId: d.transferId || e?.transferId || "",
      transferAmount: d.transferAmount || e?.transferAmount || "",
      transferRemarks: d.transferRemarks || e?.transferRemarks || "",
      transferMode: d.transferMode || e?.transferMode || "banktransfer",
      batchTransferId: d.batchTransferId || e?.batchTransferId || "",
      batchEntries: d.batchEntries || e?.batchEntries || "[]",
      upiVpa: d.upiVpa || e?.upiVpa || "",
      upiAmount: d.upiAmount || e?.upiAmount || "",
      upiDescription: d.upiDescription || e?.upiDescription || "",
      offerId: d.offerId || e?.offerId || "",
      offerMeta: d.offerMeta || e?.offerMeta || "{}",
      offerValidations: d.offerValidations || e?.offerValidations || "{}",
      offerDetails: d.offerDetails || e?.offerDetails || "{}",
      webhookSignature: d.webhookSignature || e?.webhookSignature || "",
      webhookTimestamp: d.webhookTimestamp || e?.webhookTimestamp || "",
      webhookRawBody: d.webhookRawBody || e?.webhookRawBody || "",
      webhookThrowOnFail: d.webhookThrowOnFail ?? e?.webhookThrowOnFail ?? true,
    }),
    [d, e]
  )

  const [fv, setFv] = useState<CashfreeFormValues>(initialState)
  useEffect(() => { setFv(initialState) }, [initialState])

  const hc = <K extends keyof CashfreeFormValues>(key: K, value: CashfreeFormValues[K]) =>
    setFv((prev) => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    if (!nodeId || !workflowId) return
    const payload = {
      ...fv,
      nodeId,
      workflowId,
      operation: fv.operation ?? CashfreeOperation.CREATE_ORDER,
      variableName: fv.variableName || "cashfree",
      limit: fv.limit ?? 10,
      planIntervals: fv.planIntervals ?? 1,
      planMaxCycles: fv.planMaxCycles ?? 0,
    }
    await upsert.mutateAsync(payload, {
      onSuccess: () => {
        queryClient.invalidateQueries(({} as any)({ nodeId }))
      },
    })
    onSubmit(payload)
    onOpenChange(false)
  }

  const op = fv.operation ?? CashfreeOperation.CREATE_ORDER

  // ── Field visibility helpers ──────────────────────────────────
  const needsOrderId = ([
    CashfreeOperation.CREATE_ORDER,
    CashfreeOperation.GET_ORDER, CashfreeOperation.TERMINATE_ORDER,
    CashfreeOperation.PAY_ORDER,
    CashfreeOperation.GET_PAYMENTS_FOR_ORDER, CashfreeOperation.GET_PAYMENT_BY_ID,
    CashfreeOperation.CREATE_REFUND, CashfreeOperation.GET_REFUND,
    CashfreeOperation.GET_ALL_REFUNDS_FOR_ORDER, CashfreeOperation.GET_SETTLEMENTS_FOR_ORDER,
  ] as CashfreeOperation[]).includes(op)

  const needsOrderCreate = op === CashfreeOperation.CREATE_ORDER
  const needsCustomer = ([
    CashfreeOperation.CREATE_ORDER, CashfreeOperation.CREATE_SUBSCRIPTION,
    CashfreeOperation.CREATE_PAYMENT_LINK, CashfreeOperation.CREATE_UPI_PAYMENT_LINK,
  ] as CashfreeOperation[]).includes(op)
  const needsCfPaymentId = op === CashfreeOperation.GET_PAYMENT_BY_ID
  const needsPayOrder = op === CashfreeOperation.PAY_ORDER
  const needsRefund = ([CashfreeOperation.CREATE_REFUND, CashfreeOperation.GET_REFUND] as CashfreeOperation[]).includes(op)
  const needsRefundId = ([CashfreeOperation.GET_REFUND, CashfreeOperation.CREATE_REFUND] as CashfreeOperation[]).includes(op)
  const needsSettlementPagination = ([CashfreeOperation.GET_ALL_SETTLEMENTS, CashfreeOperation.GET_SETTLEMENT_RECON] as CashfreeOperation[]).includes(op)
  const needsLinkFields = ([
    CashfreeOperation.CREATE_PAYMENT_LINK, CashfreeOperation.CREATE_UPI_PAYMENT_LINK,
    CashfreeOperation.GET_PAYMENT_LINK, CashfreeOperation.CANCEL_PAYMENT_LINK,
    CashfreeOperation.GET_ORDERS_FOR_LINK,
  ] as CashfreeOperation[]).includes(op)
  const needsLinkCreate = ([CashfreeOperation.CREATE_PAYMENT_LINK, CashfreeOperation.CREATE_UPI_PAYMENT_LINK] as CashfreeOperation[]).includes(op)
  const needsPlanFields = ([CashfreeOperation.CREATE_SUBSCRIPTION_PLAN, CashfreeOperation.GET_SUBSCRIPTION_PLAN] as CashfreeOperation[]).includes(op)
  const needsPlanCreate = op === CashfreeOperation.CREATE_SUBSCRIPTION_PLAN
  const needsSubscriptionId = ([
    CashfreeOperation.CREATE_SUBSCRIPTION, CashfreeOperation.GET_SUBSCRIPTION,
    CashfreeOperation.MANAGE_SUBSCRIPTION, CashfreeOperation.GET_SUBSCRIPTION_PAYMENTS,
  ] as CashfreeOperation[]).includes(op)
  const needsSubscriptionCreate = op === CashfreeOperation.CREATE_SUBSCRIPTION
  const needsSubscriptionAction = op === CashfreeOperation.MANAGE_SUBSCRIPTION
  const needsBeneId = ([
    CashfreeOperation.ADD_BENEFICIARY, CashfreeOperation.GET_BENEFICIARY,
    CashfreeOperation.REMOVE_BENEFICIARY, CashfreeOperation.TRANSFER_TO_BENEFICIARY,
  ] as CashfreeOperation[]).includes(op)
  const needsBeneCreate = op === CashfreeOperation.ADD_BENEFICIARY
  const needsTransfer = ([CashfreeOperation.TRANSFER_TO_BENEFICIARY, CashfreeOperation.GET_TRANSFER_STATUS] as CashfreeOperation[]).includes(op)
  const needsBatch = ([CashfreeOperation.BULK_TRANSFER, CashfreeOperation.GET_BATCH_TRANSFER_STATUS] as CashfreeOperation[]).includes(op)
  const needsUpi = ([CashfreeOperation.VALIDATE_UPI_ID, CashfreeOperation.CREATE_UPI_PAYMENT_LINK] as CashfreeOperation[]).includes(op)
  const needsOffer = ([CashfreeOperation.CREATE_OFFER, CashfreeOperation.GET_OFFER] as CashfreeOperation[]).includes(op)
  const needsWebhook = op === CashfreeOperation.VERIFY_WEBHOOK_SIGNATURE

  const TPH = "{{previousNode.fieldName}}"
  const AMOUNT_PH = "Amount in INR (e.g. 999.00)"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-4xl">
        <DialogHeader>
          <DialogTitle>Configure Cashfree</DialogTitle>
          <DialogDescription>35 operations — orders, payments, refunds, payouts, UPI, payment links, and more.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" /> Loading configuration…
          </div>
        ) : (
          <div className="space-y-4">
            {/* ── Credential + Operation ── */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Credential</Label>
                <Select value={fv.credentialId ?? ""} onValueChange={(val) => hc("credentialId", val)}>
                  <SelectTrigger><SelectValue placeholder="Select a Cashfree credential" /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Cashfree Credentials</SelectLabel>
                      {(credentials || []).map((cred) => (
                        <SelectItem key={cred.id} value={cred.id}>{cred.name}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {(!credentials || credentials.length === 0) && (
                  <p className="text-xs text-muted-foreground">
                    No credentials found.{" "}
                    <Link href="/credentials/new" className="text-primary underline">Create one</Link>
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Operation</Label>
                <Select value={fv.operation ?? CashfreeOperation.CREATE_ORDER} onValueChange={(val) => hc("operation", val as CashfreeOperation)}>
                  <SelectTrigger><SelectValue placeholder="Select an operation" /></SelectTrigger>
                  <SelectContent>
                    {OP_GROUPS.map((group) => (
                      <SelectGroup key={group.label}>
                        <SelectLabel>{group.label}</SelectLabel>
                        {group.ops.map((o) => (
                          <SelectItem key={o} value={o}>{OP_LABEL[o] ?? o}</SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {tf("Variable Name", "variableName", fv.variableName ?? "cashfree", (val) => hc("variableName", val), "cashfree")}

            <Separator />

            {/* ── Order ID ── */}
            {needsOrderId && tf("Order ID", "orderId", fv.orderId ?? "", (val) => hc("orderId", val), TPH)}

            {/* ── Create Order fields ── */}
            {needsOrderCreate && (
              <>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {tf("Order Amount (INR)", "orderAmount", fv.orderAmount ?? "", (val) => hc("orderAmount", val), AMOUNT_PH)}
                  {tf("Currency", "orderCurrency", fv.orderCurrency ?? "INR", (val) => hc("orderCurrency", val), "INR")}
                  {tf("Order Note", "orderNote", fv.orderNote ?? "", (val) => hc("orderNote", val), "Optional note")}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="orderMeta">Order Meta (JSON)</Label>
                  <Textarea id="orderMeta" value={fv.orderMeta ?? "{}"} onChange={(e) => hc("orderMeta", e.target.value)} placeholder='{"return_url": "https://...", "notify_url": "https://..."}' rows={2} className="font-mono text-xs" />
                </div>
              </>
            )}

            {/* ── Customer fields ── */}
            {needsCustomer && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {tf("Customer ID", "customerId", fv.customerId ?? "", (val) => hc("customerId", val), TPH)}
                {tf("Customer Phone", "customerPhone", fv.customerPhone ?? "", (val) => hc("customerPhone", val), TPH)}
                {tf("Customer Email", "customerEmail", fv.customerEmail ?? "", (val) => hc("customerEmail", val), TPH)}
                {tf("Customer Name", "customerName", fv.customerName ?? "", (val) => hc("customerName", val), TPH)}
              </div>
            )}

            {/* ── Pay Order ── */}
            {needsPayOrder && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {tf("Payment Session ID", "cfOrderId", fv.cfOrderId ?? "", (val) => hc("cfOrderId", val), "From CREATE_ORDER output")}
                {tf("Payment Method (JSON)", "paymentMethod", fv.paymentMethod ?? "", (val) => hc("paymentMethod", val), '{"upi": {"channel": "collect", "upi_id": "user@upi"}}')}
              </div>
            )}

            {/* ── CF Payment ID ── */}
            {needsCfPaymentId && tf("CF Payment ID", "cfPaymentId", fv.cfPaymentId ?? "", (val) => hc("cfPaymentId", val), TPH)}

            {/* ── Refund fields ── */}
            {needsRefundId && tf("Refund ID", "refundId", fv.refundId ?? "", (val) => hc("refundId", val), TPH)}
            {needsRefund && op === CashfreeOperation.CREATE_REFUND && (
              <>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {tf("Refund Amount (INR)", "refundAmount", fv.refundAmount ?? "", (val) => hc("refundAmount", val), AMOUNT_PH)}
                  {tf("Refund Note", "refundNote", fv.refundNote ?? "", (val) => hc("refundNote", val), "Reason for refund")}
                </div>
                <div className="space-y-1">
                  <Label>Refund Speed</Label>
                  <Select value={fv.refundSpeed ?? "STANDARD"} onValueChange={(val) => hc("refundSpeed", val)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STANDARD">Standard</SelectItem>
                      <SelectItem value="INSTANT">Instant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* ── Settlement pagination ── */}
            {needsSettlementPagination && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {tf("Cursor (pagination)", "cursor", fv.cursor ?? "", (val) => hc("cursor", val), "Leave empty for first page")}
                {tf("Limit", "limit", String(fv.limit ?? 10), (val) => hc("limit", Number(val) || 10), "10")}
                {tf("Start Date", "startDate", fv.startDate ?? "", (val) => hc("startDate", val), "2024-01-01")}
                {tf("End Date", "endDate", fv.endDate ?? "", (val) => hc("endDate", val), "2024-12-31")}
              </div>
            )}

            {/* ── Payment Link ID ── */}
            {needsLinkFields && tf("Link ID", "linkId", fv.linkId ?? "", (val) => hc("linkId", val), TPH)}
            {needsLinkCreate && (
              <>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {tf("Link Amount (INR)", "linkAmount", fv.linkAmount ?? "", (val) => hc("linkAmount", val), AMOUNT_PH)}
                  {tf("Currency", "linkCurrency", fv.linkCurrency ?? "INR", (val) => hc("linkCurrency", val), "INR")}
                  {tf("Purpose", "linkPurpose", fv.linkPurpose ?? "", (val) => hc("linkPurpose", val), "Order Payment")}
                  {tf("Description", "linkDescription", fv.linkDescription ?? "", (val) => hc("linkDescription", val), "Optional")}
                  {tf("Expiry Time", "linkExpiryTime", fv.linkExpiryTime ?? "", (val) => hc("linkExpiryTime", val), "2024-12-31T23:59:59+05:30")}
                  {tf("Min Partial Amount", "linkMinPartialAmount", fv.linkMinPartialAmount ?? "", (val) => hc("linkMinPartialAmount", val), "Optional partial amount")}
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Switch id="linkNotifyPhone" checked={fv.linkNotifyPhone ?? true} onCheckedChange={(val) => hc("linkNotifyPhone", val)} />
                    <Label htmlFor="linkNotifyPhone">Notify via SMS</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="linkNotifyEmail" checked={fv.linkNotifyEmail ?? true} onCheckedChange={(val) => hc("linkNotifyEmail", val)} />
                    <Label htmlFor="linkNotifyEmail">Notify via Email</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="linkAutoReminders" checked={fv.linkAutoReminders ?? true} onCheckedChange={(val) => hc("linkAutoReminders", val)} />
                    <Label htmlFor="linkAutoReminders">Auto Reminders</Label>
                  </div>
                </div>
              </>
            )}

            {/* ── Subscription Plan fields ── */}
            {needsPlanFields && tf("Plan ID", "planId", fv.planId ?? "", (val) => hc("planId", val), TPH)}
            {needsPlanCreate && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {tf("Plan Name", "planName", fv.planName ?? "", (val) => hc("planName", val), "Monthly Premium")}
                {tf("Recurring Amount (INR)", "orderAmount", fv.orderAmount ?? "", (val) => hc("orderAmount", val), AMOUNT_PH)}
                {tf("Max Amount (INR)", "planMaxAmount", fv.planMaxAmount ?? "", (val) => hc("planMaxAmount", val), "Optional")}
                {tf("Max Cycles", "planMaxCycles", String(fv.planMaxCycles ?? 0), (val) => hc("planMaxCycles", Number(val) || 0), "0 = unlimited")}
                {tf("Intervals", "planIntervals", String(fv.planIntervals ?? 1), (val) => hc("planIntervals", Number(val) || 1), "1")}
              </div>
            )}

            {/* ── Subscription ID ── */}
            {needsSubscriptionId && tf("Subscription ID", "subscriptionId", fv.subscriptionId ?? "", (val) => hc("subscriptionId", val), TPH)}
            {needsSubscriptionCreate && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {tf("Return URL", "subscriptionReturnUrl", fv.subscriptionReturnUrl ?? "", (val) => hc("subscriptionReturnUrl", val), "https://yoursite.com/return")}
                {tf("Notify URL", "subscriptionNotifyUrl", fv.subscriptionNotifyUrl ?? "", (val) => hc("subscriptionNotifyUrl", val), "https://yoursite.com/webhook")}
                {tf("First Charge Time", "subscriptionFirstChargeTime", fv.subscriptionFirstChargeTime ?? "", (val) => hc("subscriptionFirstChargeTime", val), "2024-01-15T10:00:00+05:30")}
                {tf("Expiry Time", "subscriptionExpiryTime", fv.subscriptionExpiryTime ?? "", (val) => hc("subscriptionExpiryTime", val), "2025-01-15T10:00:00+05:30")}
              </div>
            )}
            {needsSubscriptionAction && (
              <div className="space-y-1">
                <Label>Action</Label>
                <Select value={fv.subscriptionAction ?? "PAUSE"} onValueChange={(val) => hc("subscriptionAction", val)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PAUSE">Pause</SelectItem>
                    <SelectItem value="RESUME">Resume</SelectItem>
                    <SelectItem value="CANCEL">Cancel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* ── Beneficiary fields ── */}
            {needsBeneId && tf("Beneficiary ID", "beneId", fv.beneId ?? "", (val) => hc("beneId", val), TPH)}
            {needsBeneCreate && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {tf("Name", "beneName", fv.beneName ?? "", (val) => hc("beneName", val), "Vendor Name")}
                {tf("Phone", "benePhone", fv.benePhone ?? "", (val) => hc("benePhone", val), "9876543210")}
                {tf("Email", "beneEmail", fv.beneEmail ?? "", (val) => hc("beneEmail", val), "vendor@example.com")}
                {tf("Bank Account", "beneBankAccount", fv.beneBankAccount ?? "", (val) => hc("beneBankAccount", val), "Account number")}
                {tf("Bank IFSC", "beneBankIfsc", fv.beneBankIfsc ?? "", (val) => hc("beneBankIfsc", val), "HDFC0001234")}
                {tf("UPI VPA", "beneVpa", fv.beneVpa ?? "", (val) => hc("beneVpa", val), "vendor@upi (optional)")}
                {tf("Address", "beneAddress", fv.beneAddress ?? "", (val) => hc("beneAddress", val), "Street address")}
                {tf("City", "beneCity", fv.beneCity ?? "", (val) => hc("beneCity", val), "Mumbai")}
                {tf("State", "beneState", fv.beneState ?? "India", (val) => hc("beneState", val), "India")}
                {tf("Pincode", "benePincode", fv.benePincode ?? "", (val) => hc("benePincode", val), "400001")}
              </div>
            )}

            {/* ── Transfer fields ── */}
            {needsTransfer && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {tf("Transfer ID", "transferId", fv.transferId ?? "", (val) => hc("transferId", val), "Unique transfer ID")}
                {op === CashfreeOperation.TRANSFER_TO_BENEFICIARY && tf("Transfer Amount (INR)", "transferAmount", fv.transferAmount ?? "", (val) => hc("transferAmount", val), AMOUNT_PH)}
                {op === CashfreeOperation.TRANSFER_TO_BENEFICIARY && tf("Remarks", "transferRemarks", fv.transferRemarks ?? "", (val) => hc("transferRemarks", val), "Payment for invoice #123")}
              </div>
            )}
            {op === CashfreeOperation.TRANSFER_TO_BENEFICIARY && (
              <div className="space-y-1">
                <Label>Transfer Mode</Label>
                <Select value={fv.transferMode ?? "banktransfer"} onValueChange={(val) => hc("transferMode", val)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="banktransfer">Bank Transfer</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* ── Batch Transfer ── */}
            {needsBatch && (
              <>
                {tf("Batch Transfer ID", "batchTransferId", fv.batchTransferId ?? "", (val) => hc("batchTransferId", val), "Unique batch ID")}
                {op === CashfreeOperation.BULK_TRANSFER && (
                  <div className="space-y-1">
                    <Label htmlFor="batchEntries">Batch Entries (JSON Array)</Label>
                    <Textarea id="batchEntries" value={fv.batchEntries ?? "[]"} onChange={(e) => hc("batchEntries", e.target.value)} placeholder='[{"transferId":"T1","amount":"500","beneId":"BENE001"}]' rows={3} className="font-mono text-xs" />
                  </div>
                )}
              </>
            )}

            {/* ── UPI fields ── */}
            {needsUpi && tf("UPI VPA", "upiVpa", fv.upiVpa ?? "", (val) => hc("upiVpa", val), "user@upi")}

            {/* ── Offer fields ── */}
            {needsOffer && op === CashfreeOperation.GET_OFFER && tf("Offer ID", "offerId", fv.offerId ?? "", (val) => hc("offerId", val), TPH)}
            {needsOffer && op === CashfreeOperation.CREATE_OFFER && (
              <>
                <div className="space-y-1">
                  <Label htmlFor="offerMeta">Offer Meta (JSON)</Label>
                  <Textarea id="offerMeta" value={fv.offerMeta ?? "{}"} onChange={(e) => hc("offerMeta", e.target.value)} rows={2} className="font-mono text-xs" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="offerValidations">Offer Validations (JSON)</Label>
                  <Textarea id="offerValidations" value={fv.offerValidations ?? "{}"} onChange={(e) => hc("offerValidations", e.target.value)} rows={2} className="font-mono text-xs" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="offerDetails">Offer Details (JSON)</Label>
                  <Textarea id="offerDetails" value={fv.offerDetails ?? "{}"} onChange={(e) => hc("offerDetails", e.target.value)} rows={2} className="font-mono text-xs" />
                </div>
              </>
            )}

            {/* ── Webhook fields ── */}
            {needsWebhook && (
              <>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {tf("Webhook Signature", "webhookSignature", fv.webhookSignature ?? "", (val) => hc("webhookSignature", val), "{{webhookTrigger.headers.x-webhook-signature}}")}
                  {tf("Webhook Timestamp", "webhookTimestamp", fv.webhookTimestamp ?? "", (val) => hc("webhookTimestamp", val), "{{webhookTrigger.headers.x-webhook-timestamp}}")}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="webhookRawBody">Raw Body</Label>
                  <Textarea id="webhookRawBody" value={fv.webhookRawBody ?? ""} onChange={(e) => hc("webhookRawBody", e.target.value)} placeholder="{{webhookTrigger.rawBody}}" rows={2} />
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="webhookThrowOnFail" checked={fv.webhookThrowOnFail ?? true} onCheckedChange={(val) => hc("webhookThrowOnFail", val)} />
                  <Label htmlFor="webhookThrowOnFail">Throw error on invalid signature</Label>
                </div>
              </>
            )}

            <Separator />

            <div className="flex items-center gap-2">
              <Switch id="continueOnFail" checked={fv.continueOnFail ?? false} onCheckedChange={(val) => hc("continueOnFail", val)} />
              <Label htmlFor="continueOnFail">Continue on Fail</Label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
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
