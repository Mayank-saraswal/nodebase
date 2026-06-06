import crypto from "crypto"
import { NonRetriableError } from "inngest"
import type { NodeExecutor } from "@/features/executions/types"
import prisma from "@/lib/db"
import { decrypt } from "@/lib/encryption"
import { resolveTemplate } from "@/features/executions/lib/template-resolver"
import { razorpayChannel } from "@/inngest/channels/razorpay"
import { RazorpayOperation } from "@/features/executions/enums"

interface RazorpayCredential {
  keyId: string
  keySecret: string
}

type RazorpayData = {
  nodeId?: string
}

async function razorpayRequest(
  method: string,
  path: string,
  keyId: string,
  keySecret: string,
  body?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64")
  const url = `https://api.razorpay.com/v1${path}`

  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
  }

  if (body && (method === "POST" || method === "PATCH" || method === "PUT")) {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(url, options)

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    const errorDesc =
      (error as Record<string, Record<string, string>>)?.error?.description ??
      `HTTP ${response.status}`
    throw new NonRetriableError(`Razorpay API error: ${errorDesc}`)
  }

  return (await response.json()) as Record<string, unknown>
}

function parseNotes(notesStr: string): Record<string, string> | undefined {
  if (!notesStr.trim()) return undefined
  try {
    return JSON.parse(notesStr)
  } catch {
    return undefined
  }
}

export const razorpayExecutor: NodeExecutor<RazorpayData> = async ({ data, nodeId,
  context,
  step,
  publish,
  userId,
}) => {
  await publish(
    razorpayChannel().status({
      nodeId,
      status: "loading",
    })
  )

  // Step 1: Load config
  const config = data as any;

if (!config) {
    await publish(
      razorpayChannel().status({
        nodeId,
        status: "error",
      })
    )
    throw new NonRetriableError(
      "Razorpay node not configured. Open settings to configure."
    )
  }

  // Step 2: Load and decrypt credential
  const credential = await step.run(
    `razorpay-${nodeId}-load-credential`,
    async () => {
      if (!config.credentialId) return null
      return prisma.credential.findUnique({
        where: {
          id: config.credentialId,
          userId,
        },
      })
    }
  )

  if (!credential) {
    await publish(
      razorpayChannel().status({
        nodeId,
        status: "error",
      })
    )
    throw new NonRetriableError(
      "Razorpay credential not found. Please add a RAZORPAY credential first."
    )
  }

  const raw = decrypt(credential.value)
  let creds: RazorpayCredential
  try {
    creds = JSON.parse(raw)
  } catch {
    await publish(
      razorpayChannel().status({
        nodeId,
        status: "error",
      })
    )
    throw new NonRetriableError(
      'Invalid Razorpay credential format. Expected JSON: {"keyId": "rzp_...", "keySecret": "..."}'
    )
  }

  if (!creds.keyId || !creds.keySecret) {
    await publish(
      razorpayChannel().status({
        nodeId,
        status: "error",
      })
    )
    throw new NonRetriableError(
      "Razorpay credential missing keyId or keySecret"
    )
  }

  // Step 3: Execute the operation
  let result: Record<string, unknown>
  try {
    result = await step.run(`razorpay-${nodeId}-execute`, async () => {
      // Resolve all template variables
      const amount = resolveTemplate(config.amount, context)
      const currency = resolveTemplate(config.currency, context) || "INR"
      const description = resolveTemplate(config.description, context)
      const receipt = resolveTemplate(config.receipt, context)
      const notes = resolveTemplate(config.notes, context)
      const orderId = resolveTemplate(config.orderId, context)
      const paymentId = resolveTemplate(config.paymentId, context)
      const captureAmount = resolveTemplate(config.captureAmount, context)
      const refundAmount = resolveTemplate(config.refundAmount, context)
      const refundId = resolveTemplate(config.refundId, context)
      const customerId = resolveTemplate(config.customerId, context)
      const customerName = resolveTemplate(config.customerName, context)
      const customerEmail = resolveTemplate(config.customerEmail, context)
      const customerContact = resolveTemplate(config.customerContact, context)
      const planId = resolveTemplate(config.planId, context)
      const totalCount = resolveTemplate(config.totalCount, context)
      const quantity = resolveTemplate(config.quantity, context)
      const startAt = resolveTemplate(config.startAt, context)
      const subscriptionId = resolveTemplate(config.subscriptionId, context)
      const invoiceType = resolveTemplate(config.invoiceType, context) || "invoice"
      const lineItems = resolveTemplate(config.lineItems, context)
      const expireBy = resolveTemplate(config.expireBy, context)
      const invoiceId = resolveTemplate(config.invoiceId, context)
      const paymentLinkId = resolveTemplate(config.paymentLinkId, context)
      const referenceId = resolveTemplate(config.referenceId, context)
      const callbackUrl = resolveTemplate(config.callbackUrl, context)
      const callbackMethod = resolveTemplate(config.callbackMethod, context)
      const accountNumber = resolveTemplate(config.accountNumber, context)
      const fundAccountId = resolveTemplate(config.fundAccountId, context)
      const payoutMode = resolveTemplate(config.payoutMode, context)
      const payoutPurpose = resolveTemplate(config.payoutPurpose, context) || "payout"
      const narration = resolveTemplate(config.narration, context)
      const payoutId = resolveTemplate(config.payoutId, context)
      const signature = resolveTemplate(config.signature, context)
      const countParam = resolveTemplate(config.count, context)
      const skipParam = resolveTemplate(config.skip, context)
      const fromDate = resolveTemplate(config.fromDate, context)
      const toDate = resolveTemplate(config.toDate, context)
      const authorized = resolveTemplate(config.authorized, context)
      const refundSpeed = resolveTemplate(config.refundSpeed, context) || "normal"

      let outputObject: Record<string, unknown>

      switch (config.operation) {
        // ═══════════════════ ORDERS ═══════════════════

        case RazorpayOperation.ORDER_CREATE: {
          if (!amount) {
            throw new NonRetriableError(
              "Razorpay ORDER_CREATE: 'amount' is required (in paise, e.g. 50000 for ₹500)"
            )
          }
          const body: Record<string, unknown> = {
            amount: parseInt(amount),
            currency,
          }
          if (receipt) body.receipt = receipt
          if (notes) body.notes = parseNotes(notes)
          if (config.partialPayment) body.partial_payment = true
          const data = await razorpayRequest("POST", "/orders", creds.keyId, creds.keySecret, body)
          outputObject = {
            orderId: data.id,
            amount: data.amount,
            amountInRupees: (data.amount as number) / 100,
            currency: data.currency,
            status: data.status,
            receipt: data.receipt,
            raw: data,
          }
          break
        }

        case RazorpayOperation.ORDER_FETCH: {
          if (!orderId) {
            throw new NonRetriableError("Razorpay ORDER_FETCH: 'orderId' is required")
          }
          const data = await razorpayRequest("GET", `/orders/${orderId}`, creds.keyId, creds.keySecret)
          outputObject = {
            orderId: data.id,
            amount: data.amount,
            amountInRupees: (data.amount as number) / 100,
            currency: data.currency,
            status: data.status,
            receipt: data.receipt,
            raw: data,
          }
          break
        }

        case RazorpayOperation.ORDER_FETCH_PAYMENTS: {
          if (!orderId) {
            throw new NonRetriableError("Razorpay ORDER_FETCH_PAYMENTS: 'orderId' is required")
          }
          const data = await razorpayRequest("GET", `/orders/${orderId}/payments`, creds.keyId, creds.keySecret)
          outputObject = {
            orderId,
            payments: data.items,
            count: data.count,
            raw: data,
          }
          break
        }

        case RazorpayOperation.ORDER_LIST: {
          const params = new URLSearchParams()
          if (countParam) params.set("count", countParam)
          if (skipParam) params.set("skip", skipParam)
          if (fromDate) params.set("from", fromDate)
          if (toDate) params.set("to", toDate)
          if (authorized && authorized !== "all") params.set("authorized", authorized)
          const qs = params.toString()
          const data = await razorpayRequest("GET", `/orders${qs ? `?${qs}` : ""}`, creds.keyId, creds.keySecret)
          outputObject = {
            orders: data.items,
            count: data.count,
            raw: data,
          }
          break
        }

        // ═══════════════════ PAYMENTS ═══════════════════

        case RazorpayOperation.PAYMENT_FETCH: {
          if (!paymentId) {
            throw new NonRetriableError("Razorpay PAYMENT_FETCH: 'paymentId' is required")
          }
          const data = await razorpayRequest("GET", `/payments/${paymentId}`, creds.keyId, creds.keySecret)
          outputObject = {
            paymentId: data.id,
            orderId: data.order_id,
            amount: data.amount,
            amountInRupees: (data.amount as number) / 100,
            currency: data.currency,
            status: data.status,
            method: data.method,
            email: data.email,
            contact: data.contact,
            captured: data.captured,
            raw: data,
          }
          break
        }

        case RazorpayOperation.PAYMENT_CAPTURE: {
          if (!paymentId) {
            throw new NonRetriableError("Razorpay PAYMENT_CAPTURE: 'paymentId' is required")
          }
          if (!captureAmount) {
            throw new NonRetriableError("Razorpay PAYMENT_CAPTURE: 'captureAmount' is required")
          }
          const data = await razorpayRequest("POST", `/payments/${paymentId}/capture`, creds.keyId, creds.keySecret, {
            amount: parseInt(captureAmount),
            currency,
          })
          outputObject = {
            paymentId: data.id,
            orderId: data.order_id,
            amount: data.amount,
            amountInRupees: (data.amount as number) / 100,
            currency: data.currency,
            status: data.status,
            method: data.method,
            email: data.email,
            contact: data.contact,
            captured: data.captured,
            raw: data,
          }
          break
        }

        case RazorpayOperation.PAYMENT_LIST: {
          const params = new URLSearchParams()
          if (countParam) params.set("count", countParam)
          if (skipParam) params.set("skip", skipParam)
          if (fromDate) params.set("from", fromDate)
          if (toDate) params.set("to", toDate)
          const qs = params.toString()
          const data = await razorpayRequest("GET", `/payments${qs ? `?${qs}` : ""}`, creds.keyId, creds.keySecret)
          outputObject = {
            payments: data.items,
            count: data.count,
            raw: data,
          }
          break
        }

        case RazorpayOperation.PAYMENT_UPDATE: {
          if (!paymentId) {
            throw new NonRetriableError("Razorpay PAYMENT_UPDATE: 'paymentId' is required")
          }
          const data = await razorpayRequest("PATCH", `/payments/${paymentId}`, creds.keyId, creds.keySecret, {
            notes: parseNotes(notes) ?? {},
          })
          outputObject = {
            paymentId: data.id,
            orderId: data.order_id,
            amount: data.amount,
            amountInRupees: (data.amount as number) / 100,
            currency: data.currency,
            status: data.status,
            method: data.method,
            email: data.email,
            contact: data.contact,
            captured: data.captured,
            raw: data,
          }
          break
        }

        // ═══════════════════ REFUNDS ═══════════════════

        case RazorpayOperation.REFUND_CREATE: {
          if (!paymentId) {
            throw new NonRetriableError("Razorpay REFUND_CREATE: 'paymentId' is required")
          }
          const body: Record<string, unknown> = {
            speed: refundSpeed,
          }
          if (refundAmount) body.amount = parseInt(refundAmount)
          if (notes) body.notes = parseNotes(notes)
          const data = await razorpayRequest("POST", `/payments/${paymentId}/refund`, creds.keyId, creds.keySecret, body)
          outputObject = {
            refundId: data.id,
            paymentId: data.payment_id,
            amount: data.amount,
            amountInRupees: (data.amount as number) / 100,
            currency: data.currency,
            status: data.status,
            speed: data.speed,
            raw: data,
          }
          break
        }

        case RazorpayOperation.REFUND_FETCH: {
          if (!refundId) {
            throw new NonRetriableError("Razorpay REFUND_FETCH: 'refundId' is required")
          }
          const data = await razorpayRequest("GET", `/refunds/${refundId}`, creds.keyId, creds.keySecret)
          outputObject = {
            refundId: data.id,
            paymentId: data.payment_id,
            amount: data.amount,
            amountInRupees: (data.amount as number) / 100,
            currency: data.currency,
            status: data.status,
            speed: data.speed,
            raw: data,
          }
          break
        }

        case RazorpayOperation.REFUND_LIST: {
          const params = new URLSearchParams()
          if (countParam) params.set("count", countParam)
          if (skipParam) params.set("skip", skipParam)
          if (fromDate) params.set("from", fromDate)
          if (toDate) params.set("to", toDate)
          const qs = params.toString()
          const data = await razorpayRequest("GET", `/refunds${qs ? `?${qs}` : ""}`, creds.keyId, creds.keySecret)
          outputObject = {
            refunds: data.items,
            count: data.count,
            raw: data,
          }
          break
        }

        // ═══════════════════ CUSTOMERS ═══════════════════

        case RazorpayOperation.CUSTOMER_CREATE: {
          if (!customerName || !customerEmail || !customerContact) {
            throw new NonRetriableError(
              "Razorpay CUSTOMER_CREATE: 'customerName', 'customerEmail', and 'customerContact' are all required"
            )
          }
          const body: Record<string, unknown> = {
            name: customerName,
            email: customerEmail,
            contact: customerContact,
            fail_existing: config.failExisting ? "1" : "0",
          }
          if (notes) body.notes = parseNotes(notes)
          const data = await razorpayRequest("POST", "/customers", creds.keyId, creds.keySecret, body)
          outputObject = {
            customerId: data.id,
            name: data.name,
            email: data.email,
            contact: data.contact,
            raw: data,
          }
          break
        }

        case RazorpayOperation.CUSTOMER_FETCH: {
          if (!customerId) {
            throw new NonRetriableError("Razorpay CUSTOMER_FETCH: 'customerId' is required")
          }
          const data = await razorpayRequest("GET", `/customers/${customerId}`, creds.keyId, creds.keySecret)
          outputObject = {
            customerId: data.id,
            name: data.name,
            email: data.email,
            contact: data.contact,
            raw: data,
          }
          break
        }

        case RazorpayOperation.CUSTOMER_UPDATE: {
          if (!customerId) {
            throw new NonRetriableError("Razorpay CUSTOMER_UPDATE: 'customerId' is required")
          }
          const body: Record<string, unknown> = {}
          if (customerName) body.name = customerName
          if (customerEmail) body.email = customerEmail
          if (customerContact) body.contact = customerContact
          if (notes) body.notes = parseNotes(notes)
          const data = await razorpayRequest("PUT", `/customers/${customerId}`, creds.keyId, creds.keySecret, body)
          outputObject = {
            customerId: data.id,
            name: data.name,
            email: data.email,
            contact: data.contact,
            raw: data,
          }
          break
        }

        // ═══════════════════ SUBSCRIPTIONS ═══════════════════

        case RazorpayOperation.SUBSCRIPTION_CREATE: {
          if (!planId || !totalCount) {
            throw new NonRetriableError(
              "Razorpay SUBSCRIPTION_CREATE: 'planId' and 'totalCount' are required"
            )
          }
          const body: Record<string, unknown> = {
            plan_id: planId,
            total_count: parseInt(totalCount),
            quantity: parseInt(quantity) || 1,
          }
          if (startAt) body.start_at = parseInt(startAt)
          if (customerId) body.customer_id = customerId
          if (notes) body.notes = parseNotes(notes)
          const notifyInfo: Record<string, string> = {}
          if (config.smsNotify && customerContact) notifyInfo.notify_phone = customerContact
          if (config.emailNotify && customerEmail) notifyInfo.notify_email = customerEmail
          if (Object.keys(notifyInfo).length > 0) body.notify_info = notifyInfo
          const data = await razorpayRequest("POST", "/subscriptions", creds.keyId, creds.keySecret, body)
          outputObject = {
            subscriptionId: data.id,
            planId: data.plan_id,
            status: data.status,
            paidCount: data.paid_count,
            remainingCount: data.remaining_count,
            raw: data,
          }
          break
        }

        case RazorpayOperation.SUBSCRIPTION_FETCH: {
          if (!subscriptionId) {
            throw new NonRetriableError("Razorpay SUBSCRIPTION_FETCH: 'subscriptionId' is required")
          }
          const data = await razorpayRequest("GET", `/subscriptions/${subscriptionId}`, creds.keyId, creds.keySecret)
          outputObject = {
            subscriptionId: data.id,
            planId: data.plan_id,
            status: data.status,
            paidCount: data.paid_count,
            remainingCount: data.remaining_count,
            raw: data,
          }
          break
        }

        case RazorpayOperation.SUBSCRIPTION_CANCEL: {
          if (!subscriptionId) {
            throw new NonRetriableError("Razorpay SUBSCRIPTION_CANCEL: 'subscriptionId' is required")
          }
          const data = await razorpayRequest("POST", `/subscriptions/${subscriptionId}/cancel`, creds.keyId, creds.keySecret, {
            cancel_at_cycle_end: config.cancelAtCycleEnd ? 1 : 0,
          })
          outputObject = {
            subscriptionId: data.id,
            status: data.status,
            raw: data,
          }
          break
        }

        // ═══════════════════ INVOICES ═══════════════════

        case RazorpayOperation.INVOICE_CREATE: {
          if (!customerName || !customerEmail || !lineItems) {
            throw new NonRetriableError(
              "Razorpay INVOICE_CREATE: 'customerName', 'customerEmail', and 'lineItems' are required"
            )
          }
          let parsedLineItems: unknown[]
          try {
            parsedLineItems = JSON.parse(lineItems)
          } catch {
            throw new NonRetriableError("Razorpay INVOICE_CREATE: 'lineItems' must be valid JSON array")
          }
          const body: Record<string, unknown> = {
            type: invoiceType,
            customer: {
              name: customerName,
              email: customerEmail,
              contact: customerContact || undefined,
            },
            line_items: parsedLineItems,
            currency,
            sms_notify: config.smsNotify ? 1 : 0,
            email_notify: config.emailNotify ? 1 : 0,
          }
          if (description) body.description = description
          if (expireBy) body.expire_by = parseInt(expireBy)
          const data = await razorpayRequest("POST", "/invoices", creds.keyId, creds.keySecret, body)
          outputObject = {
            invoiceId: data.id,
            invoiceNumber: data.invoice_number,
            status: data.status,
            shortUrl: data.short_url,
            amount: data.amount,
            amountInRupees: (data.amount as number) / 100,
            raw: data,
          }
          break
        }

        case RazorpayOperation.INVOICE_FETCH: {
          if (!invoiceId) {
            throw new NonRetriableError("Razorpay INVOICE_FETCH: 'invoiceId' is required")
          }
          const data = await razorpayRequest("GET", `/invoices/${invoiceId}`, creds.keyId, creds.keySecret)
          outputObject = {
            invoiceId: data.id,
            invoiceNumber: data.invoice_number,
            status: data.status,
            shortUrl: data.short_url,
            amount: data.amount,
            amountInRupees: (data.amount as number) / 100,
            raw: data,
          }
          break
        }

        case RazorpayOperation.INVOICE_SEND: {
          if (!invoiceId) {
            throw new NonRetriableError("Razorpay INVOICE_SEND: 'invoiceId' is required")
          }
          let smsSent = false
          let emailSent = false
          try {
            await razorpayRequest("POST", `/invoices/${invoiceId}/notify/sms`, creds.keyId, creds.keySecret)
            smsSent = true
          } catch {
            // handle gracefully
          }
          try {
            await razorpayRequest("POST", `/invoices/${invoiceId}/notify/email`, creds.keyId, creds.keySecret)
            emailSent = true
          } catch {
            // handle gracefully
          }
          outputObject = {
            invoiceId,
            smsSent,
            emailSent,
          }
          break
        }

        case RazorpayOperation.INVOICE_CANCEL: {
          if (!invoiceId) {
            throw new NonRetriableError("Razorpay INVOICE_CANCEL: 'invoiceId' is required")
          }
          const data = await razorpayRequest("POST", `/invoices/${invoiceId}/cancel`, creds.keyId, creds.keySecret)
          outputObject = {
            invoiceId: data.id,
            invoiceNumber: data.invoice_number,
            status: data.status,
            shortUrl: data.short_url,
            amount: data.amount,
            amountInRupees: (data.amount as number) / 100,
            raw: data,
          }
          break
        }

        // ═══════════════════ PAYMENT LINKS ═══════════════════

        case RazorpayOperation.PAYMENT_LINK_CREATE: {
          if (!amount || !description || !customerName) {
            throw new NonRetriableError(
              "Razorpay PAYMENT_LINK_CREATE: 'amount', 'description', and 'customerName' are required"
            )
          }
          const body: Record<string, unknown> = {
            amount: parseInt(amount),
            currency,
            description,
            customer: {
              name: customerName,
              email: customerEmail || undefined,
              contact: customerContact || undefined,
            },
            reminder_enable: config.reminderEnable,
          }
          if (expireBy) body.expire_by = parseInt(expireBy)
          if (referenceId) body.reference_id = referenceId
          if (notes) body.notes = parseNotes(notes)
          if (callbackUrl) body.callback_url = callbackUrl
          if (callbackMethod) body.callback_method = callbackMethod
          const data = await razorpayRequest("POST", "/payment_links", creds.keyId, creds.keySecret, body)
          outputObject = {
            paymentLinkId: data.id,
            shortUrl: data.short_url,
            amount: data.amount,
            amountInRupees: (data.amount as number) / 100,
            status: data.status,
            raw: data,
          }
          break
        }

        case RazorpayOperation.PAYMENT_LINK_FETCH: {
          if (!paymentLinkId) {
            throw new NonRetriableError("Razorpay PAYMENT_LINK_FETCH: 'paymentLinkId' is required")
          }
          const data = await razorpayRequest("GET", `/payment_links/${paymentLinkId}`, creds.keyId, creds.keySecret)
          outputObject = {
            paymentLinkId: data.id,
            shortUrl: data.short_url,
            amount: data.amount,
            amountInRupees: (data.amount as number) / 100,
            status: data.status,
            raw: data,
          }
          break
        }

        case RazorpayOperation.PAYMENT_LINK_UPDATE: {
          if (!paymentLinkId) {
            throw new NonRetriableError("Razorpay PAYMENT_LINK_UPDATE: 'paymentLinkId' is required")
          }
          const body: Record<string, unknown> = {}
          if (amount) body.amount = parseInt(amount)
          if (description) body.description = description
          if (expireBy) body.expire_by = parseInt(expireBy)
          if (notes) body.notes = parseNotes(notes)
          if (referenceId) body.reference_id = referenceId
          const data = await razorpayRequest("PATCH", `/payment_links/${paymentLinkId}`, creds.keyId, creds.keySecret, body)
          outputObject = {
            paymentLinkId: data.id,
            shortUrl: data.short_url,
            amount: data.amount,
            amountInRupees: (data.amount as number) / 100,
            status: data.status,
            raw: data,
          }
          break
        }

        case RazorpayOperation.PAYMENT_LINK_CANCEL: {
          if (!paymentLinkId) {
            throw new NonRetriableError("Razorpay PAYMENT_LINK_CANCEL: 'paymentLinkId' is required")
          }
          const data = await razorpayRequest("POST", `/payment_links/${paymentLinkId}/cancel`, creds.keyId, creds.keySecret)
          outputObject = {
            paymentLinkId: data.id,
            shortUrl: data.short_url,
            amount: data.amount,
            amountInRupees: (data.amount as number) / 100,
            status: data.status,
            raw: data,
          }
          break
        }

        // ═══════════════════ PAYOUTS ═══════════════════

        case RazorpayOperation.PAYOUT_CREATE: {
          if (!accountNumber || !fundAccountId || !amount || !payoutMode) {
            throw new NonRetriableError(
              "Razorpay PAYOUT_CREATE: 'accountNumber', 'fundAccountId', 'amount', and 'payoutMode' are required"
            )
          }
          const body: Record<string, unknown> = {
            account_number: accountNumber,
            fund_account_id: fundAccountId,
            amount: parseInt(amount),
            currency,
            mode: payoutMode,
            purpose: payoutPurpose,
            queue_if_low_balance: config.queueIfLowBalance,
          }
          if (narration) body.narration = narration
          if (notes) body.notes = parseNotes(notes)
          const data = await razorpayRequest("POST", "/payouts", creds.keyId, creds.keySecret, body)
          outputObject = {
            payoutId: data.id,
            amount: data.amount,
            amountInRupees: (data.amount as number) / 100,
            mode: data.mode,
            status: data.status,
            utr: data.utr,
            raw: data,
          }
          break
        }

        case RazorpayOperation.PAYOUT_FETCH: {
          if (!payoutId) {
            throw new NonRetriableError("Razorpay PAYOUT_FETCH: 'payoutId' is required")
          }
          const data = await razorpayRequest("GET", `/payouts/${payoutId}`, creds.keyId, creds.keySecret)
          outputObject = {
            payoutId: data.id,
            amount: data.amount,
            amountInRupees: (data.amount as number) / 100,
            mode: data.mode,
            status: data.status,
            utr: data.utr,
            raw: data,
          }
          break
        }

        // ═══════════════════ VERIFICATION ═══════════════════

        case RazorpayOperation.VERIFY_PAYMENT_SIGNATURE: {
          if (!orderId || !paymentId || !signature) {
            throw new NonRetriableError(
              "Razorpay VERIFY_PAYMENT_SIGNATURE: 'orderId', 'paymentId', and 'signature' are required"
            )
          }
          const body = `${orderId}|${paymentId}`
          const expected = crypto
            .createHmac("sha256", creds.keySecret)
            .update(body)
            .digest("hex")
          const isValid = expected === signature
          if (!isValid && config.throwOnInvalid) {
            throw new NonRetriableError(
              "Razorpay: Payment signature INVALID. " +
              "This payment may be fraudulent. Do not fulfill the order."
            )
          }
          outputObject = {
            isValid,
            orderId,
            paymentId,
            message: isValid
              ? "Payment is authentic"
              : "Payment may be fraudulent",
          }
          break
        }

        default:
          throw new NonRetriableError(
            `Unknown Razorpay operation: ${config.operation}`
          )
      }

      return {
        ...context,
        [config.variableName || "razorpay"]: outputObject,
      }
    })
  } catch (error) {
    await publish(
      razorpayChannel().status({
        nodeId,
        status: "error",
      })
    )
    throw error
  }

  await publish(
    razorpayChannel().status({
      nodeId,
      status: "success",
    })
  )

  return result as Record<string, unknown>
}
