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

export interface RazorpayFormValues {
  credentialId?: string
  operation?: string
  variableName?: string
  amount?: string
  currency?: string
  description?: string
  receipt?: string
  notes?: string
  partialPayment?: boolean
  orderId?: string
  paymentId?: string
  captureAmount?: string
  refundAmount?: string
  refundSpeed?: string
  refundId?: string
  customerId?: string
  customerName?: string
  customerEmail?: string
  customerContact?: string
  failExisting?: boolean
  planId?: string
  totalCount?: string
  quantity?: string
  startAt?: string
  subscriptionId?: string
  cancelAtCycleEnd?: boolean
  invoiceType?: string
  lineItems?: string
  expireBy?: string
  smsNotify?: boolean
  emailNotify?: boolean
  invoiceId?: string
  paymentLinkId?: string
  referenceId?: string
  reminderEnable?: boolean
  callbackUrl?: string
  callbackMethod?: string
  accountNumber?: string
  fundAccountId?: string
  payoutMode?: string
  payoutPurpose?: string
  narration?: string
  queueIfLowBalance?: boolean
  payoutId?: string
  signature?: string
  throwOnInvalid?: boolean
  count?: string
  skip?: string
  fromDate?: string
  toDate?: string
  authorized?: string
}

interface RazorpayDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: RazorpayFormValues) => void
  defaultValues?: Partial<RazorpayFormValues>
  nodeId?: string
  workflowId?: string
}

type RazorpayOp =
  | "ORDER_CREATE" | "ORDER_FETCH" | "ORDER_FETCH_PAYMENTS" | "ORDER_LIST"
  | "PAYMENT_FETCH" | "PAYMENT_CAPTURE" | "PAYMENT_LIST" | "PAYMENT_UPDATE"
  | "REFUND_CREATE" | "REFUND_FETCH" | "REFUND_LIST"
  | "CUSTOMER_CREATE" | "CUSTOMER_FETCH" | "CUSTOMER_UPDATE"
  | "SUBSCRIPTION_CREATE" | "SUBSCRIPTION_FETCH" | "SUBSCRIPTION_CANCEL"
  | "INVOICE_CREATE" | "INVOICE_FETCH" | "INVOICE_SEND" | "INVOICE_CANCEL"
  | "PAYMENT_LINK_CREATE" | "PAYMENT_LINK_FETCH" | "PAYMENT_LINK_UPDATE" | "PAYMENT_LINK_CANCEL"
  | "PAYOUT_CREATE" | "PAYOUT_FETCH"
  | "VERIFY_PAYMENT_SIGNATURE"

const OUTPUT_HINTS: Record<string, string[]> = {
  ORDER_CREATE: ["orderId", "amount", "amountInRupees", "currency", "status", "receipt", "raw"],
  ORDER_FETCH: ["orderId", "amount", "amountInRupees", "currency", "status", "receipt", "raw"],
  ORDER_FETCH_PAYMENTS: ["orderId", "payments", "count", "raw"],
  ORDER_LIST: ["orders", "count", "raw"],
  PAYMENT_FETCH: ["paymentId", "orderId", "amount", "amountInRupees", "currency", "status", "method", "email", "contact", "captured", "raw"],
  PAYMENT_CAPTURE: ["paymentId", "orderId", "amount", "amountInRupees", "currency", "status", "method", "raw"],
  PAYMENT_LIST: ["payments", "count", "raw"],
  PAYMENT_UPDATE: ["paymentId", "orderId", "amount", "amountInRupees", "status", "raw"],
  REFUND_CREATE: ["refundId", "paymentId", "amount", "amountInRupees", "currency", "status", "speed", "raw"],
  REFUND_FETCH: ["refundId", "paymentId", "amount", "amountInRupees", "currency", "status", "speed", "raw"],
  REFUND_LIST: ["refunds", "count", "raw"],
  CUSTOMER_CREATE: ["customerId", "name", "email", "contact", "raw"],
  CUSTOMER_FETCH: ["customerId", "name", "email", "contact", "raw"],
  CUSTOMER_UPDATE: ["customerId", "name", "email", "contact", "raw"],
  SUBSCRIPTION_CREATE: ["subscriptionId", "planId", "status", "paidCount", "remainingCount", "raw"],
  SUBSCRIPTION_FETCH: ["subscriptionId", "planId", "status", "paidCount", "remainingCount", "raw"],
  SUBSCRIPTION_CANCEL: ["subscriptionId", "status", "raw"],
  INVOICE_CREATE: ["invoiceId", "invoiceNumber", "status", "shortUrl", "amount", "amountInRupees", "raw"],
  INVOICE_FETCH: ["invoiceId", "invoiceNumber", "status", "shortUrl", "amount", "amountInRupees", "raw"],
  INVOICE_SEND: ["invoiceId", "smsSent", "emailSent"],
  INVOICE_CANCEL: ["invoiceId", "invoiceNumber", "status", "shortUrl", "amount", "amountInRupees", "raw"],
  PAYMENT_LINK_CREATE: ["paymentLinkId", "shortUrl", "amount", "amountInRupees", "status", "raw"],
  PAYMENT_LINK_FETCH: ["paymentLinkId", "shortUrl", "amount", "amountInRupees", "status", "raw"],
  PAYMENT_LINK_UPDATE: ["paymentLinkId", "shortUrl", "amount", "amountInRupees", "status", "raw"],
  PAYMENT_LINK_CANCEL: ["paymentLinkId", "shortUrl", "amount", "amountInRupees", "status", "raw"],
  PAYOUT_CREATE: ["payoutId", "amount", "amountInRupees", "mode", "status", "utr", "raw"],
  PAYOUT_FETCH: ["payoutId", "amount", "amountInRupees", "mode", "status", "utr", "raw"],
  VERIFY_PAYMENT_SIGNATURE: ["isValid", "orderId", "paymentId", "message"],
}

// Which operations need which fields
const needsAmount = (op: string) => ["ORDER_CREATE", "PAYMENT_LINK_CREATE", "PAYOUT_CREATE"].includes(op)
const needsCurrency = (op: string) => ["ORDER_CREATE", "PAYMENT_CAPTURE", "REFUND_CREATE", "INVOICE_CREATE", "PAYMENT_LINK_CREATE", "PAYOUT_CREATE"].includes(op)
const needsOrderId = (op: string) => ["ORDER_FETCH", "ORDER_FETCH_PAYMENTS", "VERIFY_PAYMENT_SIGNATURE"].includes(op)
const needsPaymentId = (op: string) => ["PAYMENT_FETCH", "PAYMENT_CAPTURE", "PAYMENT_UPDATE", "REFUND_CREATE", "VERIFY_PAYMENT_SIGNATURE"].includes(op)
const needsRefundId = (op: string) => op === "REFUND_FETCH"
const needsCustomerId = (op: string) => ["CUSTOMER_FETCH", "CUSTOMER_UPDATE", "SUBSCRIPTION_CREATE"].includes(op)
const needsCustomerFields = (op: string) => ["CUSTOMER_CREATE", "CUSTOMER_UPDATE", "INVOICE_CREATE", "PAYMENT_LINK_CREATE"].includes(op)
const needsNotes = (op: string) => ["ORDER_CREATE", "REFUND_CREATE", "CUSTOMER_CREATE", "CUSTOMER_UPDATE", "SUBSCRIPTION_CREATE", "PAYMENT_LINK_CREATE", "PAYMENT_LINK_UPDATE", "PAYOUT_CREATE", "PAYMENT_UPDATE"].includes(op)
const needsDescription = (op: string) => ["INVOICE_CREATE", "PAYMENT_LINK_CREATE"].includes(op)
const needsListParams = (op: string) => ["ORDER_LIST", "PAYMENT_LIST", "REFUND_LIST"].includes(op)
const needsSubscriptionId = (op: string) => ["SUBSCRIPTION_FETCH", "SUBSCRIPTION_CANCEL"].includes(op)
const needsInvoiceId = (op: string) => ["INVOICE_FETCH", "INVOICE_SEND", "INVOICE_CANCEL"].includes(op)
const needsPaymentLinkId = (op: string) => ["PAYMENT_LINK_FETCH", "PAYMENT_LINK_UPDATE", "PAYMENT_LINK_CANCEL"].includes(op)
const needsSignature = (op: string) => op === "VERIFY_PAYMENT_SIGNATURE"

export const RazorpayDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
  nodeId,
  workflowId,
}: RazorpayDialogProps) => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  // State for all fields
  const [credentialId, setCredentialId] = useState(defaultValues.credentialId || "")
  const [operation, setOperation] = useState<RazorpayOp>((defaultValues.operation as RazorpayOp) || "ORDER_CREATE")
  const [variableName, setVariableName] = useState(defaultValues.variableName || "razorpay")
  const [amount, setAmount] = useState(defaultValues.amount || "")
  const [currency, setCurrency] = useState(defaultValues.currency || "INR")
  const [description, setDescription] = useState(defaultValues.description || "")
  const [receipt, setReceipt] = useState(defaultValues.receipt || "")
  const [notes, setNotes] = useState(defaultValues.notes || "")
  const [partialPayment, setPartialPayment] = useState(defaultValues.partialPayment ?? false)
  const [orderId, setOrderId] = useState(defaultValues.orderId || "")
  const [paymentId, setPaymentId] = useState(defaultValues.paymentId || "")
  const [captureAmount, setCaptureAmount] = useState(defaultValues.captureAmount || "")
  const [refundAmount, setRefundAmount] = useState(defaultValues.refundAmount || "")
  const [refundSpeed, setRefundSpeed] = useState(defaultValues.refundSpeed || "normal")
  const [refundId, setRefundId] = useState(defaultValues.refundId || "")
  const [customerId, setCustomerId] = useState(defaultValues.customerId || "")
  const [customerName, setCustomerName] = useState(defaultValues.customerName || "")
  const [customerEmail, setCustomerEmail] = useState(defaultValues.customerEmail || "")
  const [customerContact, setCustomerContact] = useState(defaultValues.customerContact || "")
  const [failExisting, setFailExisting] = useState(defaultValues.failExisting ?? false)
  const [planId, setPlanId] = useState(defaultValues.planId || "")
  const [totalCount, setTotalCount] = useState(defaultValues.totalCount || "")
  const [quantity, setQuantity] = useState(defaultValues.quantity || "1")
  const [startAt, setStartAt] = useState(defaultValues.startAt || "")
  const [subscriptionId, setSubscriptionId] = useState(defaultValues.subscriptionId || "")
  const [cancelAtCycleEnd, setCancelAtCycleEnd] = useState(defaultValues.cancelAtCycleEnd ?? false)
  const [invoiceType, setInvoiceType] = useState(defaultValues.invoiceType || "invoice")
  const [lineItems, setLineItems] = useState(defaultValues.lineItems || "")
  const [expireBy, setExpireBy] = useState(defaultValues.expireBy || "")
  const [smsNotify, setSmsNotify] = useState(defaultValues.smsNotify ?? true)
  const [emailNotify, setEmailNotify] = useState(defaultValues.emailNotify ?? true)
  const [invoiceId, setInvoiceId] = useState(defaultValues.invoiceId || "")
  const [paymentLinkId, setPaymentLinkId] = useState(defaultValues.paymentLinkId || "")
  const [referenceId, setReferenceId] = useState(defaultValues.referenceId || "")
  const [reminderEnable, setReminderEnable] = useState(defaultValues.reminderEnable ?? true)
  const [callbackUrl, setCallbackUrl] = useState(defaultValues.callbackUrl || "")
  const [callbackMethod, setCallbackMethod] = useState(defaultValues.callbackMethod || "")
  const [accountNumber, setAccountNumber] = useState(defaultValues.accountNumber || "")
  const [fundAccountId, setFundAccountId] = useState(defaultValues.fundAccountId || "")
  const [payoutMode, setPayoutMode] = useState(defaultValues.payoutMode || "")
  const [payoutPurpose, setPayoutPurpose] = useState(defaultValues.payoutPurpose || "payout")
  const [narration, setNarration] = useState(defaultValues.narration || "")
  const [queueIfLowBalance, setQueueIfLowBalance] = useState(defaultValues.queueIfLowBalance ?? false)
  const [payoutId, setPayoutId] = useState(defaultValues.payoutId || "")
  const [signature, setSignature] = useState(defaultValues.signature || "")
  const [throwOnInvalid, setThrowOnInvalid] = useState(defaultValues.throwOnInvalid ?? true)
  const [count, setCount] = useState(defaultValues.count || "")
  const [skip, setSkip] = useState(defaultValues.skip || "")
  const [fromDate, setFromDate] = useState(defaultValues.fromDate || "")
  const [toDate, setToDate] = useState(defaultValues.toDate || "")
  const [authorized, setAuthorized] = useState(defaultValues.authorized || "")
  const [saved, setSaved] = useState(false)

  const { data: credentials, isLoading: isLoadingCredentials } =
    useCredentialsByType(CredentialType.RAZORPAY)

  const config = undefined as any;
const isLoading = false;

// Pre-fill from DB config when loaded
  useEffect(() => {
    if (config) {
      setCredentialId(config.credentialId || "")
      setOperation(config.operation as RazorpayOp)
      setVariableName(config.variableName || "razorpay")
      setAmount(config.amount)
      setCurrency(config.currency)
      setDescription(config.description)
      setReceipt(config.receipt)
      setNotes(config.notes)
      setPartialPayment(config.partialPayment)
      setOrderId(config.orderId)
      setPaymentId(config.paymentId)
      setCaptureAmount(config.captureAmount)
      setRefundAmount(config.refundAmount)
      setRefundSpeed(config.refundSpeed)
      setRefundId(config.refundId)
      setCustomerId(config.customerId)
      setCustomerName(config.customerName)
      setCustomerEmail(config.customerEmail)
      setCustomerContact(config.customerContact)
      setFailExisting(config.failExisting)
      setPlanId(config.planId)
      setTotalCount(config.totalCount)
      setQuantity(config.quantity)
      setStartAt(config.startAt)
      setSubscriptionId(config.subscriptionId)
      setCancelAtCycleEnd(config.cancelAtCycleEnd)
      setInvoiceType(config.invoiceType)
      setLineItems(config.lineItems)
      setExpireBy(config.expireBy)
      setSmsNotify(config.smsNotify)
      setEmailNotify(config.emailNotify)
      setInvoiceId(config.invoiceId)
      setPaymentLinkId(config.paymentLinkId)
      setReferenceId(config.referenceId)
      setReminderEnable(config.reminderEnable)
      setCallbackUrl(config.callbackUrl)
      setCallbackMethod(config.callbackMethod)
      setAccountNumber(config.accountNumber)
      setFundAccountId(config.fundAccountId)
      setPayoutMode(config.payoutMode)
      setPayoutPurpose(config.payoutPurpose)
      setNarration(config.narration)
      setQueueIfLowBalance(config.queueIfLowBalance)
      setPayoutId(config.payoutId)
      setSignature(config.signature)
      setThrowOnInvalid(config.throwOnInvalid)
      setCount(config.count)
      setSkip(config.skip)
      setFromDate(config.fromDate)
      setToDate(config.toDate)
      setAuthorized(config.authorized)
    }
  }, [config])

  // Reset when dialog opens with defaultValues
  useEffect(() => {
    if (open && !config) {
      setCredentialId(defaultValues.credentialId || "")
      setOperation((defaultValues.operation as RazorpayOp) || "ORDER_CREATE")
      setVariableName(defaultValues.variableName || "razorpay")
      setAmount(defaultValues.amount || "")
      setCurrency(defaultValues.currency || "INR")
      setDescription(defaultValues.description || "")
      setReceipt(defaultValues.receipt || "")
      setNotes(defaultValues.notes || "")
      setPartialPayment(defaultValues.partialPayment ?? false)
      setOrderId(defaultValues.orderId || "")
      setPaymentId(defaultValues.paymentId || "")
      setCaptureAmount(defaultValues.captureAmount || "")
      setRefundAmount(defaultValues.refundAmount || "")
      setRefundSpeed(defaultValues.refundSpeed || "normal")
      setRefundId(defaultValues.refundId || "")
      setCustomerId(defaultValues.customerId || "")
      setCustomerName(defaultValues.customerName || "")
      setCustomerEmail(defaultValues.customerEmail || "")
      setCustomerContact(defaultValues.customerContact || "")
      setFailExisting(defaultValues.failExisting ?? false)
      setPlanId(defaultValues.planId || "")
      setTotalCount(defaultValues.totalCount || "")
      setQuantity(defaultValues.quantity || "1")
      setStartAt(defaultValues.startAt || "")
      setSubscriptionId(defaultValues.subscriptionId || "")
      setCancelAtCycleEnd(defaultValues.cancelAtCycleEnd ?? false)
      setInvoiceType(defaultValues.invoiceType || "invoice")
      setLineItems(defaultValues.lineItems || "")
      setExpireBy(defaultValues.expireBy || "")
      setSmsNotify(defaultValues.smsNotify ?? true)
      setEmailNotify(defaultValues.emailNotify ?? true)
      setInvoiceId(defaultValues.invoiceId || "")
      setPaymentLinkId(defaultValues.paymentLinkId || "")
      setReferenceId(defaultValues.referenceId || "")
      setReminderEnable(defaultValues.reminderEnable ?? true)
      setCallbackUrl(defaultValues.callbackUrl || "")
      setCallbackMethod(defaultValues.callbackMethod || "")
      setAccountNumber(defaultValues.accountNumber || "")
      setFundAccountId(defaultValues.fundAccountId || "")
      setPayoutMode(defaultValues.payoutMode || "")
      setPayoutPurpose(defaultValues.payoutPurpose || "payout")
      setNarration(defaultValues.narration || "")
      setQueueIfLowBalance(defaultValues.queueIfLowBalance ?? false)
      setPayoutId(defaultValues.payoutId || "")
      setSignature(defaultValues.signature || "")
      setThrowOnInvalid(defaultValues.throwOnInvalid ?? true)
      setCount(defaultValues.count || "")
      setSkip(defaultValues.skip || "")
      setFromDate(defaultValues.fromDate || "")
      setToDate(defaultValues.toDate || "")
      setAuthorized(defaultValues.authorized || "")
    }
  }, [open, defaultValues, config])

  const upsertMutation = { isPending: false, mutate: (args?: any) => {}, mutateAsync: async (args?: any) => {} } as any;

const isValid = !!credentialId.trim()

  const handleSave = () => {
    if (!isValid) return

    const values: RazorpayFormValues = {
      credentialId, operation, variableName, amount, currency, description, receipt, notes,
      partialPayment, orderId, paymentId, captureAmount, refundAmount, refundSpeed, refundId,
      customerId, customerName, customerEmail, customerContact, failExisting, planId, totalCount,
      quantity, startAt, subscriptionId, cancelAtCycleEnd, invoiceType, lineItems, expireBy,
      smsNotify, emailNotify, invoiceId, paymentLinkId, referenceId, reminderEnable, callbackUrl,
      callbackMethod, accountNumber, fundAccountId, payoutMode, payoutPurpose, narration,
      queueIfLowBalance, payoutId, signature, throwOnInvalid, count, skip, fromDate, toDate,
      authorized,
    }

    onSubmit(values)

    if (workflowId && nodeId) {
      upsertMutation.mutate({
        workflowId,
        nodeId,
        credentialId: credentialId || undefined,
        operation,
        variableName, amount, currency, description, receipt, notes,
        partialPayment, orderId, paymentId, captureAmount, refundAmount, refundSpeed, refundId,
        customerId, customerName, customerEmail, customerContact, failExisting, planId, totalCount,
        quantity, startAt, subscriptionId, cancelAtCycleEnd, invoiceType, lineItems, expireBy,
        smsNotify, emailNotify, invoiceId, paymentLinkId, referenceId, reminderEnable, callbackUrl,
        callbackMethod, accountNumber, fundAccountId, payoutMode, payoutPurpose, narration,
        queueIfLowBalance, payoutId, signature, throwOnInvalid, count, skip, fromDate, toDate,
        authorized,
      })
    }
  }

  const v = variableName || "razorpay"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Razorpay — Payment Gateway</DialogTitle>
          <DialogDescription>
            Orders, payments, refunds, subscriptions, invoices, and more
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
                placeholder="razorpay"
                value={variableName}
                onChange={(e) => setVariableName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {`Reference as {{${v}.orderId}}, {{${v}.shortUrl}}`}
              </p>
            </div>

            <Separator />

            {/* 2. Credential Selector */}
            <div className="space-y-2">
              <Label>Razorpay Credential</Label>
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
                  No Razorpay credentials found.
                </p>
              )}
              <Link
                href="/credentials/new"
                className="text-xs text-primary hover:underline"
              >
                + Add new Razorpay credential
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
                onValueChange={(val) => setOperation(val as RazorpayOp)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Orders</SelectLabel>
                    <SelectItem value="ORDER_CREATE">Create Order</SelectItem>
                    <SelectItem value="ORDER_FETCH">Fetch Order</SelectItem>
                    <SelectItem value="ORDER_FETCH_PAYMENTS">Fetch Order Payments</SelectItem>
                    <SelectItem value="ORDER_LIST">List Orders</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Payments</SelectLabel>
                    <SelectItem value="PAYMENT_FETCH">Fetch Payment</SelectItem>
                    <SelectItem value="PAYMENT_CAPTURE">Capture Payment</SelectItem>
                    <SelectItem value="PAYMENT_LIST">List Payments</SelectItem>
                    <SelectItem value="PAYMENT_UPDATE">Update Payment</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Refunds</SelectLabel>
                    <SelectItem value="REFUND_CREATE">Create Refund</SelectItem>
                    <SelectItem value="REFUND_FETCH">Fetch Refund</SelectItem>
                    <SelectItem value="REFUND_LIST">List Refunds</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Customers</SelectLabel>
                    <SelectItem value="CUSTOMER_CREATE">Create Customer</SelectItem>
                    <SelectItem value="CUSTOMER_FETCH">Fetch Customer</SelectItem>
                    <SelectItem value="CUSTOMER_UPDATE">Update Customer</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Subscriptions</SelectLabel>
                    <SelectItem value="SUBSCRIPTION_CREATE">Create Subscription</SelectItem>
                    <SelectItem value="SUBSCRIPTION_FETCH">Fetch Subscription</SelectItem>
                    <SelectItem value="SUBSCRIPTION_CANCEL">Cancel Subscription</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Invoices</SelectLabel>
                    <SelectItem value="INVOICE_CREATE">Create Invoice</SelectItem>
                    <SelectItem value="INVOICE_FETCH">Fetch Invoice</SelectItem>
                    <SelectItem value="INVOICE_SEND">Send Invoice</SelectItem>
                    <SelectItem value="INVOICE_CANCEL">Cancel Invoice</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Payment Links</SelectLabel>
                    <SelectItem value="PAYMENT_LINK_CREATE">Create Payment Link</SelectItem>
                    <SelectItem value="PAYMENT_LINK_FETCH">Fetch Payment Link</SelectItem>
                    <SelectItem value="PAYMENT_LINK_UPDATE">Update Payment Link</SelectItem>
                    <SelectItem value="PAYMENT_LINK_CANCEL">Cancel Payment Link</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Payouts</SelectLabel>
                    <SelectItem value="PAYOUT_CREATE">Create Payout</SelectItem>
                    <SelectItem value="PAYOUT_FETCH">Fetch Payout</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Verification</SelectLabel>
                    <SelectItem value="VERIFY_PAYMENT_SIGNATURE">Verify Payment Signature</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* 4. Dynamic fields based on operation */}

            {/* Amount */}
            {needsAmount(operation) && (
              <div className="space-y-2">
                <Label>Amount (in paise)</Label>
                <Input
                  placeholder="50000 (for ₹500)"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  in paise — ₹500 = 50000
                </p>
              </div>
            )}

            {/* Capture Amount */}
            {operation === "PAYMENT_CAPTURE" && (
              <div className="space-y-2">
                <Label>Capture Amount (in paise)</Label>
                <Input
                  placeholder="50000"
                  value={captureAmount}
                  onChange={(e) => setCaptureAmount(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  in paise — ₹500 = 50000
                </p>
              </div>
            )}

            {/* Currency */}
            {needsCurrency(operation) && (
              <div className="space-y-2">
                <Label>Currency</Label>
                <Input
                  placeholder="INR"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                />
              </div>
            )}

            {/* Receipt */}
            {operation === "ORDER_CREATE" && (
              <>
                <div className="space-y-2">
                  <Label>Receipt (optional)</Label>
                  <Input
                    placeholder="receipt_001"
                    value={receipt}
                    onChange={(e) => setReceipt(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={partialPayment} onCheckedChange={setPartialPayment} />
                  <Label>Allow Partial Payment</Label>
                </div>
              </>
            )}

            {/* Description */}
            {needsDescription(operation) && (
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  placeholder="Payment for order #123"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            )}

            {/* Order ID */}
            {needsOrderId(operation) && (
              <div className="space-y-2">
                <Label>Order ID</Label>
                <Input
                  placeholder="order_xxxxxxxxxxxxx"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                />
              </div>
            )}

            {/* Payment ID */}
            {needsPaymentId(operation) && (
              <div className="space-y-2">
                <Label>Payment ID</Label>
                <Input
                  placeholder="pay_xxxxxxxxxxxxx"
                  value={paymentId}
                  onChange={(e) => setPaymentId(e.target.value)}
                />
              </div>
            )}

            {/* Refund fields */}
            {operation === "REFUND_CREATE" && (
              <>
                <div className="space-y-2">
                  <Label>Refund Amount (optional, in paise)</Label>
                  <Input
                    placeholder="Leave empty for full refund"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    in paise — ₹500 = 50000. If empty, full payment is refunded
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Refund Speed</Label>
                  <Select value={refundSpeed} onValueChange={setRefundSpeed}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="optimum">Optimum</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Refund ID */}
            {needsRefundId(operation) && (
              <div className="space-y-2">
                <Label>Refund ID</Label>
                <Input
                  placeholder="rfnd_xxxxxxxxxxxxx"
                  value={refundId}
                  onChange={(e) => setRefundId(e.target.value)}
                />
              </div>
            )}

            {/* Customer ID */}
            {needsCustomerId(operation) && (
              <div className="space-y-2">
                <Label>Customer ID</Label>
                <Input
                  placeholder="cust_xxxxxxxxxxxxx"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                />
              </div>
            )}

            {/* Customer fields */}
            {needsCustomerFields(operation) && (
              <>
                <div className="space-y-2">
                  <Label>Customer Name</Label>
                  <Input
                    placeholder="John Doe"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Customer Email</Label>
                  <Input
                    placeholder="john@example.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Customer Contact</Label>
                  <Input
                    placeholder="+919876543210"
                    value={customerContact}
                    onChange={(e) => setCustomerContact(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Fail Existing (Customer) */}
            {operation === "CUSTOMER_CREATE" && (
              <div className="flex items-center gap-3">
                <Switch checked={failExisting} onCheckedChange={setFailExisting} />
                <Label>Fail if Customer Exists</Label>
              </div>
            )}

            {/* Subscription fields */}
            {operation === "SUBSCRIPTION_CREATE" && (
              <>
                <div className="space-y-2">
                  <Label>Plan ID</Label>
                  <Input
                    placeholder="plan_xxxxxxxxxxxxx"
                    value={planId}
                    onChange={(e) => setPlanId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Count</Label>
                  <Input
                    placeholder="12"
                    value={totalCount}
                    onChange={(e) => setTotalCount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quantity (optional)</Label>
                  <Input
                    placeholder="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Start At (optional, Unix timestamp)</Label>
                  <Input
                    placeholder="1735689600"
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Subscription ID */}
            {needsSubscriptionId(operation) && (
              <div className="space-y-2">
                <Label>Subscription ID</Label>
                <Input
                  placeholder="sub_xxxxxxxxxxxxx"
                  value={subscriptionId}
                  onChange={(e) => setSubscriptionId(e.target.value)}
                />
              </div>
            )}

            {/* Cancel at cycle end */}
            {operation === "SUBSCRIPTION_CANCEL" && (
              <div className="flex items-center gap-3">
                <Switch checked={cancelAtCycleEnd} onCheckedChange={setCancelAtCycleEnd} />
                <Label>Cancel at Cycle End</Label>
              </div>
            )}

            {/* Invoice fields */}
            {operation === "INVOICE_CREATE" && (
              <>
                <div className="space-y-2">
                  <Label>Invoice Type</Label>
                  <Select value={invoiceType} onValueChange={setInvoiceType}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="invoice">Invoice</SelectItem>
                      <SelectItem value="link">Link</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Line Items (JSON array)</Label>
                  <Textarea
                    className="min-h-[100px] font-mono text-sm"
                    placeholder={'[{"name": "Product", "amount": 50000, "quantity": 1}]'}
                    value={lineItems}
                    onChange={(e) => setLineItems(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expire By (optional, Unix timestamp)</Label>
                  <Input
                    placeholder="1735689600"
                    value={expireBy}
                    onChange={(e) => setExpireBy(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={smsNotify} onCheckedChange={setSmsNotify} />
                  <Label>SMS Notify</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={emailNotify} onCheckedChange={setEmailNotify} />
                  <Label>Email Notify</Label>
                </div>
              </>
            )}

            {/* Invoice ID */}
            {needsInvoiceId(operation) && (
              <div className="space-y-2">
                <Label>Invoice ID</Label>
                <Input
                  placeholder="inv_xxxxxxxxxxxxx"
                  value={invoiceId}
                  onChange={(e) => setInvoiceId(e.target.value)}
                />
              </div>
            )}

            {/* Payment Link fields */}
            {operation === "PAYMENT_LINK_CREATE" && (
              <>
                <div className="space-y-2">
                  <Label>Expire By (optional, Unix timestamp)</Label>
                  <Input
                    placeholder="1735689600"
                    value={expireBy}
                    onChange={(e) => setExpireBy(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reference ID (optional)</Label>
                  <Input
                    placeholder="ref_001"
                    value={referenceId}
                    onChange={(e) => setReferenceId(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={reminderEnable} onCheckedChange={setReminderEnable} />
                  <Label>Enable Reminders</Label>
                </div>
                <div className="space-y-2">
                  <Label>Callback URL (optional)</Label>
                  <Input
                    placeholder="https://example.com/callback"
                    value={callbackUrl}
                    onChange={(e) => setCallbackUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Callback Method (optional)</Label>
                  <Input
                    placeholder="get"
                    value={callbackMethod}
                    onChange={(e) => setCallbackMethod(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Payment Link Update fields */}
            {operation === "PAYMENT_LINK_UPDATE" && (
              <>
                <div className="space-y-2">
                  <Label>Amount (optional, in paise)</Label>
                  <Input
                    placeholder="50000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    in paise — ₹500 = 50000
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Input
                    placeholder="Updated description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expire By (optional, Unix timestamp)</Label>
                  <Input
                    placeholder="1735689600"
                    value={expireBy}
                    onChange={(e) => setExpireBy(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reference ID (optional)</Label>
                  <Input
                    placeholder="ref_001"
                    value={referenceId}
                    onChange={(e) => setReferenceId(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Payment Link ID */}
            {needsPaymentLinkId(operation) && (
              <div className="space-y-2">
                <Label>Payment Link ID</Label>
                <Input
                  placeholder="plink_xxxxxxxxxxxxx"
                  value={paymentLinkId}
                  onChange={(e) => setPaymentLinkId(e.target.value)}
                />
              </div>
            )}

            {/* Payout fields */}
            {operation === "PAYOUT_CREATE" && (
              <>
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input
                    placeholder="RazorpayX account number"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fund Account ID</Label>
                  <Input
                    placeholder="fa_xxxxxxxxxxxxx"
                    value={fundAccountId}
                    onChange={(e) => setFundAccountId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payout Mode</Label>
                  <Select value={payoutMode} onValueChange={setPayoutMode}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select mode..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NEFT">NEFT</SelectItem>
                      <SelectItem value="RTGS">RTGS</SelectItem>
                      <SelectItem value="IMPS">IMPS</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Purpose</Label>
                  <Input
                    placeholder="payout"
                    value={payoutPurpose}
                    onChange={(e) => setPayoutPurpose(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Narration (optional)</Label>
                  <Input
                    placeholder="Acme Corp Fund Transfer"
                    value={narration}
                    onChange={(e) => setNarration(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={queueIfLowBalance} onCheckedChange={setQueueIfLowBalance} />
                  <Label>Queue if Low Balance</Label>
                </div>
              </>
            )}

            {/* Payout ID */}
            {operation === "PAYOUT_FETCH" && (
              <div className="space-y-2">
                <Label>Payout ID</Label>
                <Input
                  placeholder="pout_xxxxxxxxxxxxx"
                  value={payoutId}
                  onChange={(e) => setPayoutId(e.target.value)}
                />
              </div>
            )}

            {/* Verify Signature fields */}
            {needsSignature(operation) && (
              <>
                <div className="space-y-2">
                  <Label>Razorpay Signature</Label>
                  <Input
                    placeholder="signature from payment response"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={throwOnInvalid} onCheckedChange={setThrowOnInvalid} />
                  <Label>Throw Error on Invalid Signature</Label>
                </div>
              </>
            )}

            {/* Notes (JSON) */}
            {needsNotes(operation) && (
              <div className="space-y-2">
                <Label>Notes (optional, JSON)</Label>
                <Textarea
                  className="min-h-[60px] font-mono text-sm"
                  placeholder='{"key": "value"}'
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  JSON key-value pairs
                </p>
              </div>
            )}

            {/* List params */}
            {needsListParams(operation) && (
              <>
                <div className="space-y-2">
                  <Label>Count (optional)</Label>
                  <Input
                    placeholder="10"
                    value={count}
                    onChange={(e) => setCount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Skip (optional)</Label>
                  <Input
                    placeholder="0"
                    value={skip}
                    onChange={(e) => setSkip(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>From (optional, Unix timestamp)</Label>
                  <Input
                    placeholder="1735689600"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>To (optional, Unix timestamp)</Label>
                  <Input
                    placeholder="1735776000"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Authorized filter for ORDER_LIST */}
            {operation === "ORDER_LIST" && (
              <div className="space-y-2">
                <Label>Authorized (optional)</Label>
                <Select value={authorized} onValueChange={setAuthorized}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="1">Authorized Only</SelectItem>
                    <SelectItem value="0">Unauthorized Only</SelectItem>
                  </SelectContent>
                </Select>
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
