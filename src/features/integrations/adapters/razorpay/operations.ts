/**
 * Razorpay Corsair operations — full @corsair-dev/razorpay surface.
 */

import { NonRetriableError } from "inngest"
import { razorpayIntegrationDefinition } from "@/features/integrations/registry/integrations/razorpay"
import { resolveOperation } from "@/features/integrations/registry/resolve"

type ApiFn = (args?: Record<string, unknown>) => Promise<unknown>

export type RazorpayApiClient = {
  razorpay: {
    api: {
      orders: { create: ApiFn; get: ApiFn; list: ApiFn }
      payments: { get: ApiFn; list: ApiFn; capture: ApiFn }
      payouts: { get: ApiFn; list: ApiFn; create: ApiFn }
      refunds: { create: ApiFn; get: ApiFn; list: ApiFn }
      customers: { create: ApiFn; get: ApiFn; list: ApiFn; update: ApiFn }
      settlements: { list: ApiFn; get: ApiFn }
      subscriptions: {
        list: ApiFn
        get: ApiFn
        create: ApiFn
        update: ApiFn
        cancel: ApiFn
        pause: ApiFn
        resume: ApiFn
      }
    }
  }
}

export type ResolvedRazorpayFields = {
  operation: string
  amount: string
  currency: string
  receipt: string
  notesJson: string
  orderId: string
  paymentId: string
  refundId: string
  customerId: string
  customerName: string
  customerEmail: string
  customerContact: string
  gstin: string
  captureAmount: string
  refundAmount: string
  refundSpeed: string
  planId: string
  totalCount: string
  quantity: string
  startAt: string
  subscriptionId: string
  cancelAtCycleEnd: boolean
  remainingCount: string
  scheduleChangeAt: string
  accountNumber: string
  fundAccountId: string
  payoutMode: string
  payoutPurpose: string
  narration: string
  referenceId: string
  queueIfLowBalance: boolean
  payoutId: string
  settlementId: string
  count: string
  skip: string
  fromDate: string
  toDate: string
  authorized: string
  offerId: string
}

function asRecord(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {}
}

function wrap(operation: string, data: unknown): Record<string, unknown> {
  const rec = asRecord(data)
  const amount = typeof rec.amount === "number" ? rec.amount : undefined
  return {
    operation,
    ...rec,
    data,
    ...(amount !== undefined
      ? { amountInRupees: amount / 100 }
      : {}),
  }
}

function normalizeOp(raw: string): string {
  const { operation, requestedKey } = resolveOperation(
    razorpayIntegrationDefinition,
    raw,
  )
  if (operation.aliases?.includes(requestedKey)) return requestedKey
  return operation.aliases?.[0] ?? operation.key
}

export function isRazorpayCorsairOp(operation: string): boolean {
  try {
    resolveOperation(razorpayIntegrationDefinition, operation)
    return true
  } catch {
    return false
  }
}

function parseNotes(
  notesJson: string,
): Record<string, string> | undefined {
  const raw = notesJson.trim()
  if (!raw) return undefined
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string>
    }
    throw new NonRetriableError("Razorpay notes must be a JSON object.")
  } catch (e) {
    if (e instanceof NonRetriableError) throw e
    throw new NonRetriableError("Razorpay notes is invalid JSON.")
  }
}

function requireId(value: string, field: string, op: string) {
  if (!value.trim()) {
    throw new NonRetriableError(`Razorpay ${op}: ${field} is required.`)
  }
}

function parsePaise(value: string, field: string, op: string): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) {
    throw new NonRetriableError(
      `Razorpay ${op}: ${field} must be a positive number (paise).`,
    )
  }
  return Math.trunc(n)
}

function optInt(value: string): number | undefined {
  if (!value.trim()) return undefined
  const n = Number(value)
  return Number.isFinite(n) ? Math.trunc(n) : undefined
}

function listParams(fields: ResolvedRazorpayFields) {
  return {
    from: optInt(fields.fromDate),
    to: optInt(fields.toDate),
    count: optInt(fields.count),
    skip: optInt(fields.skip),
  }
}

export async function runRazorpayOperation(
  client: RazorpayApiClient,
  fields: ResolvedRazorpayFields,
): Promise<Record<string, unknown>> {
  const api = client.razorpay.api
  const op = normalizeOp(fields.operation)
  const notes = parseNotes(fields.notesJson)
  const currency = fields.currency.trim() || "INR"

  switch (op) {
    case "ORDER_CREATE":
    case "orders.create": {
      const amount = parsePaise(fields.amount, "amount", "ORDER_CREATE")
      const data = await api.orders.create({
        amount,
        currency,
        receipt: fields.receipt || undefined,
        notes,
      })
      return wrap("ORDER_CREATE", data)
    }
    case "ORDER_FETCH":
    case "orders.get": {
      requireId(fields.orderId, "orderId", "ORDER_FETCH")
      const data = await api.orders.get({ id: fields.orderId })
      return wrap("ORDER_FETCH", data)
    }
    case "ORDER_LIST":
    case "orders.list": {
      const data = await api.orders.list({
        ...listParams(fields),
        authorized:
          fields.authorized === "0" || fields.authorized === "1"
            ? fields.authorized
            : undefined,
        receipt: fields.receipt || undefined,
      })
      return wrap("ORDER_LIST", data)
    }
    case "PAYMENT_FETCH":
    case "payments.get": {
      requireId(fields.paymentId, "paymentId", "PAYMENT_FETCH")
      const data = await api.payments.get({ id: fields.paymentId })
      return wrap("PAYMENT_FETCH", data)
    }
    case "PAYMENT_LIST":
    case "payments.list": {
      const data = await api.payments.list(listParams(fields))
      return wrap("PAYMENT_LIST", data)
    }
    case "PAYMENT_CAPTURE":
    case "payments.capture": {
      requireId(fields.paymentId, "paymentId", "PAYMENT_CAPTURE")
      const amount = parsePaise(
        fields.captureAmount || fields.amount,
        "captureAmount",
        "PAYMENT_CAPTURE",
      )
      const data = await api.payments.capture({
        id: fields.paymentId,
        amount,
        currency,
      })
      return wrap("PAYMENT_CAPTURE", data)
    }
    case "REFUND_CREATE":
    case "refunds.create": {
      requireId(fields.paymentId, "paymentId", "REFUND_CREATE")
      const speed = fields.refundSpeed.trim()
      const data = await api.refunds.create({
        paymentId: fields.paymentId,
        amount: fields.refundAmount.trim()
          ? parsePaise(fields.refundAmount, "refundAmount", "REFUND_CREATE")
          : undefined,
        speed:
          speed === "normal" || speed === "optimum" ? speed : undefined,
        receipt: fields.receipt || undefined,
        notes,
      })
      return wrap("REFUND_CREATE", data)
    }
    case "REFUND_FETCH":
    case "refunds.get": {
      requireId(fields.paymentId, "paymentId", "REFUND_FETCH")
      requireId(fields.refundId, "refundId", "REFUND_FETCH")
      const data = await api.refunds.get({
        paymentId: fields.paymentId,
        refundId: fields.refundId,
      })
      return wrap("REFUND_FETCH", data)
    }
    case "REFUND_LIST":
    case "refunds.list": {
      requireId(fields.paymentId, "paymentId", "REFUND_LIST")
      const data = await api.refunds.list({
        paymentId: fields.paymentId,
        ...listParams(fields),
      })
      return wrap("REFUND_LIST", data)
    }
    case "CUSTOMER_CREATE":
    case "customers.create": {
      requireId(fields.customerName, "customerName", "CUSTOMER_CREATE")
      const data = await api.customers.create({
        name: fields.customerName,
        email: fields.customerEmail || undefined,
        contact: fields.customerContact || undefined,
        gstin: fields.gstin || undefined,
        notes,
      })
      return wrap("CUSTOMER_CREATE", data)
    }
    case "CUSTOMER_FETCH":
    case "customers.get": {
      requireId(fields.customerId, "customerId", "CUSTOMER_FETCH")
      const data = await api.customers.get({ id: fields.customerId })
      return wrap("CUSTOMER_FETCH", data)
    }
    case "CUSTOMER_LIST":
    case "customers.list": {
      const data = await api.customers.list(listParams(fields))
      return wrap("CUSTOMER_LIST", data)
    }
    case "CUSTOMER_UPDATE":
    case "customers.update": {
      requireId(fields.customerId, "customerId", "CUSTOMER_UPDATE")
      const data = await api.customers.update({
        id: fields.customerId,
        name: fields.customerName || undefined,
        email: fields.customerEmail || undefined,
        contact: fields.customerContact || undefined,
        gstin: fields.gstin || undefined,
        notes,
      })
      return wrap("CUSTOMER_UPDATE", data)
    }
    case "PAYOUT_CREATE":
    case "payouts.create": {
      requireId(fields.accountNumber, "accountNumber", "PAYOUT_CREATE")
      requireId(fields.fundAccountId, "fundAccountId", "PAYOUT_CREATE")
      requireId(fields.payoutMode, "payoutMode", "PAYOUT_CREATE")
      const amount = parsePaise(fields.amount, "amount", "PAYOUT_CREATE")
      const data = await api.payouts.create({
        account_number: fields.accountNumber,
        fund_account_id: fields.fundAccountId,
        amount,
        currency,
        mode: fields.payoutMode,
        purpose: fields.payoutPurpose || "payout",
        queue_if_low_balance: fields.queueIfLowBalance || undefined,
        reference_id: fields.referenceId || undefined,
        narration: fields.narration || undefined,
        notes,
      })
      return wrap("PAYOUT_CREATE", data)
    }
    case "PAYOUT_FETCH":
    case "payouts.get": {
      requireId(fields.payoutId, "payoutId", "PAYOUT_FETCH")
      const data = await api.payouts.get({ id: fields.payoutId })
      return wrap("PAYOUT_FETCH", data)
    }
    case "PAYOUT_LIST":
    case "payouts.list": {
      requireId(fields.accountNumber, "accountNumber", "PAYOUT_LIST")
      const data = await api.payouts.list({
        account_number: fields.accountNumber,
        fund_account_id: fields.fundAccountId || undefined,
        mode: fields.payoutMode || undefined,
        reference_id: fields.referenceId || undefined,
        ...listParams(fields),
      })
      return wrap("PAYOUT_LIST", data)
    }
    case "SETTLEMENT_LIST":
    case "settlements.list": {
      const data = await api.settlements.list(listParams(fields))
      return wrap("SETTLEMENT_LIST", data)
    }
    case "SETTLEMENT_FETCH":
    case "settlements.get": {
      requireId(fields.settlementId, "settlementId", "SETTLEMENT_FETCH")
      const data = await api.settlements.get({ id: fields.settlementId })
      return wrap("SETTLEMENT_FETCH", data)
    }
    case "SUBSCRIPTION_LIST":
    case "subscriptions.list": {
      const data = await api.subscriptions.list({
        ...listParams(fields),
        plan_id: fields.planId || undefined,
      })
      return wrap("SUBSCRIPTION_LIST", data)
    }
    case "SUBSCRIPTION_FETCH":
    case "subscriptions.get": {
      requireId(fields.subscriptionId, "subscriptionId", "SUBSCRIPTION_FETCH")
      const data = await api.subscriptions.get({ id: fields.subscriptionId })
      return wrap("SUBSCRIPTION_FETCH", data)
    }
    case "SUBSCRIPTION_CREATE":
    case "subscriptions.create": {
      requireId(fields.planId, "planId", "SUBSCRIPTION_CREATE")
      const total_count = optInt(fields.totalCount)
      if (!total_count || total_count <= 0) {
        throw new NonRetriableError(
          "Razorpay SUBSCRIPTION_CREATE: totalCount is required.",
        )
      }
      const data = await api.subscriptions.create({
        plan_id: fields.planId,
        total_count,
        quantity: optInt(fields.quantity),
        start_at: optInt(fields.startAt),
        customer_id: fields.customerId || undefined,
        offer_id: fields.offerId || undefined,
        notes,
      })
      return wrap("SUBSCRIPTION_CREATE", data)
    }
    case "SUBSCRIPTION_UPDATE":
    case "subscriptions.update": {
      requireId(fields.subscriptionId, "subscriptionId", "SUBSCRIPTION_UPDATE")
      const schedule = fields.scheduleChangeAt.trim()
      const data = await api.subscriptions.update({
        id: fields.subscriptionId,
        plan_id: fields.planId || undefined,
        quantity: optInt(fields.quantity),
        remaining_count: optInt(fields.remainingCount),
        offer_id: fields.offerId || undefined,
        schedule_change_at:
          schedule === "now" || schedule === "cycle_end"
            ? schedule
            : undefined,
      })
      return wrap("SUBSCRIPTION_UPDATE", data)
    }
    case "SUBSCRIPTION_CANCEL":
    case "subscriptions.cancel": {
      requireId(fields.subscriptionId, "subscriptionId", "SUBSCRIPTION_CANCEL")
      const data = await api.subscriptions.cancel({
        id: fields.subscriptionId,
        cancel_at_cycle_end: fields.cancelAtCycleEnd || undefined,
      })
      return wrap("SUBSCRIPTION_CANCEL", data)
    }
    case "SUBSCRIPTION_PAUSE":
    case "subscriptions.pause": {
      requireId(fields.subscriptionId, "subscriptionId", "SUBSCRIPTION_PAUSE")
      const data = await api.subscriptions.pause({
        id: fields.subscriptionId,
      })
      return wrap("SUBSCRIPTION_PAUSE", data)
    }
    case "SUBSCRIPTION_RESUME":
    case "subscriptions.resume": {
      requireId(fields.subscriptionId, "subscriptionId", "SUBSCRIPTION_RESUME")
      const data = await api.subscriptions.resume({
        id: fields.subscriptionId,
        resume_at: "now",
      })
      return wrap("SUBSCRIPTION_RESUME", data)
    }
    default:
      throw new NonRetriableError(
        `Razorpay ${op}: not available on Corsair path. Disable CORSAIR_PLUGIN_RAZORPAY for this op or use a supported API operation.`,
      )
  }
}
