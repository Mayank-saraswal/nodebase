import { NonRetriableError, RetryAfterError } from "inngest"
import type { NodeExecutor } from "@/features/executions/types"
import prisma from "@/lib/db"
import { decrypt } from "@/lib/encryption"
import { resolveTemplate } from "@/features/executions/lib/template-resolver"
import { cashfreeChannel } from "@/inngest/channels/cashfree"
import { CashfreeOperation } from "@/features/executions/enums"

type CashfreeCredential = {
  clientId: string
  clientSecret: string
  environment: "production" | "sandbox"
  payoutClientId?: string
  payoutClientSecret?: string
}

const CASHFREE_BASE = (env: string) =>
  env === "production"
    ? "https://api.cashfree.com"
    : "https://sandbox.cashfree.com"

const CF_VERSION = "2023-08-01"

async function cashfreeApi(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  creds: CashfreeCredential,
  body?: unknown,
  queryParams?: Record<string, string | number | undefined>
): Promise<Record<string, unknown>> {
  const url = new URL(`${CASHFREE_BASE(creds.environment)}${path}`)
  if (queryParams) {
    Object.entries(queryParams).forEach(([k, v]) => {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v))
    })
  }

  const res = await fetch(url.toString(), {
    method,
    headers: {
      "x-client-id": creds.clientId,
      "x-client-secret": creds.clientSecret,
      "x-api-version": CF_VERSION,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 429) {
    throw new RetryAfterError("Cashfree rate limit exceeded", 60_000)
  }

  if (res.status === 401) {
    throw new NonRetriableError(
      "Cashfree: Authentication failed. Check your Client ID and Client Secret in credentials."
    )
  }

  if (res.status === 404) {
    return { notFound: true }
  }

  if (res.status === 204) {
    return { success: true }
  }

  if (!res.ok) {
    let errorMessage = res.statusText
    let errorCode = ""
    try {
      const err = await res.json() as { message?: string; code?: string; type?: string }
      errorMessage = err.message || errorMessage
      errorCode = err.code || err.type || ""
    } catch { /* ignore */ }
    if (res.status >= 500) {
      throw new Error(`Cashfree server error: ${errorMessage}`)
    }
    throw new NonRetriableError(
      `Cashfree error [${errorCode || res.status}]: ${errorMessage}`
    )
  }

  return await res.json() as Record<string, unknown>
}

async function getPayoutToken(creds: CashfreeCredential): Promise<string> {
  if (!creds.payoutClientId || !creds.payoutClientSecret) {
    throw new NonRetriableError(
      "Cashfree Payouts: payoutClientId and payoutClientSecret are required. " +
      "Add them to your Cashfree credential."
    )
  }

  const url = `${CASHFREE_BASE(creds.environment)}/payout/v1/authorize`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "X-Client-Id": creds.payoutClientId,
      "X-Client-Secret": creds.payoutClientSecret,
      "Content-Type": "application/json",
    },
  })

  if (!res.ok) {
    throw new NonRetriableError(
      "Cashfree Payouts: Authorization failed. Check payoutClientId and payoutClientSecret."
    )
  }

  const data = await res.json() as { data?: { token?: string } }
  const token = data?.data?.token
  if (!token) {
    throw new NonRetriableError("Cashfree Payouts: No token received from authorization endpoint.")
  }
  return token
}

async function cashfreePayoutApi(
  method: "GET" | "POST" | "DELETE",
  path: string,
  token: string,
  creds: CashfreeCredential,
  body?: unknown,
  queryParams?: Record<string, string | undefined>
): Promise<Record<string, unknown>> {
  const url = new URL(`${CASHFREE_BASE(creds.environment)}${path}`)
  if (queryParams) {
    Object.entries(queryParams).forEach(([k, v]) => {
      if (v !== undefined && v !== "") url.searchParams.set(k, v)
    })
  }

  const res = await fetch(url.toString(), {
    method,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    let errorMessage = res.statusText
    try {
      const err = await res.json() as { message?: string; status?: string }
      errorMessage = err.message || err.status || errorMessage
    } catch { /* ignore */ }
    if (res.status >= 500) throw new Error(`Cashfree Payouts error: ${errorMessage}`)
    throw new NonRetriableError(`Cashfree Payouts error [${res.status}]: ${errorMessage}`)
  }

  return await res.json() as Record<string, unknown>
}

export const cashfreeExecutor: NodeExecutor = async ({ data, nodeId, context, step, publish }) => {
  // STEP 1 — Load
  const config = data as any;

  // STEP 2 — Validate
  await step.run(`cashfree-${nodeId}-validate`, async () => {
    if (!config) throw new NonRetriableError("Cashfree node not configured.")
    if (!config.credentialId || !config.credential)
      throw new NonRetriableError("Cashfree: No credential connected.")
    return { valid: true }
  })

  // STEP 3 — Execute
  return await step.run(`cashfree-${nodeId}-execute`, async () => {
    await publish(cashfreeChannel(nodeId).status({ nodeId, status: "loading" }))

    try {
      const creds = JSON.parse(decrypt(config!.credential!.value)) as CashfreeCredential
      if (!creds.clientId || !creds.clientSecret)
        throw new NonRetriableError("Cashfree: clientId and clientSecret missing from credential.")

      const r = (field: string) => resolveTemplate(field, context) as string
      const variableName = config!.variableName || "cashfree"
      let result: Record<string, unknown>

      switch (config!.operation) {
        // ══════════════════════════════════════════════════════════════
        // ORDERS
        // ══════════════════════════════════════════════════════════════

        case CashfreeOperation.CREATE_ORDER: {
          const body: Record<string, unknown> = {
            order_amount: parseFloat(r(config!.orderAmount)),
            order_currency: r(config!.orderCurrency) || "INR",
            customer_details: {
              customer_id: r(config!.customerId),
              customer_phone: r(config!.customerPhone),
              customer_email: r(config!.customerEmail) || undefined,
              customer_name: r(config!.customerName) || undefined,
            },
          }
          const orderId = r(config!.orderId)
          if (orderId) body.order_id = orderId
          const orderNote = r(config!.orderNote)
          if (orderNote) body.order_note = orderNote
          try {
            const meta = JSON.parse(r(config!.orderMeta) || "{}")
            if (Object.keys(meta).length > 0) body.order_meta = meta
          } catch { /* invalid JSON, skip */ }
          const data = await cashfreeApi("POST", "/pg/orders", creds, body)
          result = {
            success: true,
            orderId: data.order_id,
            cfOrderId: data.cf_order_id,
            paymentSessionId: data.payment_session_id,
            paymentLink: `https://payments.cashfree.com/order/#${data.payment_session_id}`,
            orderStatus: data.order_status,
            orderToken: data.order_token,
            order: data,
          }
          break
        }

        case CashfreeOperation.GET_ORDER: {
          const orderId = r(config!.orderId)
          if (!orderId) throw new NonRetriableError("Cashfree GET_ORDER: orderId is required")
          const data = await cashfreeApi("GET", `/pg/orders/${orderId}`, creds)
          if (data.notFound) {
            result = { success: true, order: null, notFound: true }
          } else {
            result = {
              success: true,
              order: data,
              orderId: data.order_id,
              orderStatus: data.order_status,
              orderAmount: data.order_amount,
              cfOrderId: data.cf_order_id,
            }
          }
          break
        }

        case CashfreeOperation.TERMINATE_ORDER: {
          const orderId = r(config!.orderId)
          if (!orderId) throw new NonRetriableError("Cashfree TERMINATE_ORDER: orderId is required")
          const data = await cashfreeApi("PATCH", `/pg/orders/${orderId}`, creds, { order_status: "TERMINATED" })
          result = { success: true, orderId, orderStatus: "TERMINATED", data }
          break
        }

        case CashfreeOperation.PAY_ORDER: {
          const paymentSessionId = r(config!.cfOrderId) // cfOrderId field stores paymentSessionId
          const paymentMethod = r(config!.paymentMethod)
          if (!paymentSessionId) throw new NonRetriableError("Cashfree PAY_ORDER: paymentSessionId (cfOrderId field) is required")
          const body: Record<string, unknown> = {
            payment_session_id: paymentSessionId,
            payment_method: paymentMethod ? JSON.parse(paymentMethod) : {},
          }
          const data = await cashfreeApi("POST", "/pg/orders/sessions", creds, body)
          result = { success: true, paymentMethod, data }
          break
        }

        // ══════════════════════════════════════════════════════════════
        // PAYMENTS
        // ══════════════════════════════════════════════════════════════

        case CashfreeOperation.GET_PAYMENTS_FOR_ORDER: {
          const orderId = r(config!.orderId)
          if (!orderId) throw new NonRetriableError("Cashfree GET_PAYMENTS_FOR_ORDER: orderId is required")
          const data = await cashfreeApi("GET", `/pg/orders/${orderId}/payments`, creds)
          const payments = Array.isArray(data) ? data : []
          result = { success: true, payments, count: payments.length }
          break
        }

        case CashfreeOperation.GET_PAYMENT_BY_ID: {
          const orderId = r(config!.orderId)
          const cfPaymentId = r(config!.cfPaymentId)
          if (!orderId || !cfPaymentId) throw new NonRetriableError("Cashfree GET_PAYMENT_BY_ID: orderId and cfPaymentId are required")
          const data = await cashfreeApi("GET", `/pg/orders/${orderId}/payments/${cfPaymentId}`, creds)
          result = { success: true, payment: data, paymentStatus: data.payment_status }
          break
        }

        // ══════════════════════════════════════════════════════════════
        // REFUNDS
        // ══════════════════════════════════════════════════════════════

        case CashfreeOperation.CREATE_REFUND: {
          const orderId = r(config!.orderId)
          const refundId = r(config!.refundId)
          const refundAmount = r(config!.refundAmount)
          if (!orderId || !refundId || !refundAmount) throw new NonRetriableError("Cashfree CREATE_REFUND: orderId, refundId, and refundAmount are required")
          const body: Record<string, unknown> = {
            refund_amount: parseFloat(refundAmount),
            refund_id: refundId,
            refund_speed: r(config!.refundSpeed) || "STANDARD",
          }
          const refundNote = r(config!.refundNote)
          if (refundNote) body.refund_note = refundNote
          try {
            const splits = JSON.parse(r(config!.refundSplits) || "[]")
            if (splits.length > 0) body.refund_splits = splits
          } catch { /* invalid JSON */ }
          const data = await cashfreeApi("POST", `/pg/orders/${orderId}/refunds`, creds, body)
          result = { success: true, refundId, cfRefundId: data.cf_refund_id, refundStatus: data.refund_status, data }
          break
        }

        case CashfreeOperation.GET_REFUND: {
          const orderId = r(config!.orderId)
          const refundId = r(config!.refundId)
          if (!orderId || !refundId) throw new NonRetriableError("Cashfree GET_REFUND: orderId and refundId are required")
          const data = await cashfreeApi("GET", `/pg/orders/${orderId}/refunds/${refundId}`, creds)
          result = { success: true, refund: data, refundStatus: data.refund_status }
          break
        }

        case CashfreeOperation.GET_ALL_REFUNDS_FOR_ORDER: {
          const orderId = r(config!.orderId)
          if (!orderId) throw new NonRetriableError("Cashfree GET_ALL_REFUNDS_FOR_ORDER: orderId is required")
          const data = await cashfreeApi("GET", `/pg/orders/${orderId}/refunds`, creds)
          const refunds = Array.isArray(data) ? data : []
          result = { success: true, refunds, count: refunds.length }
          break
        }

        // ══════════════════════════════════════════════════════════════
        // SETTLEMENTS
        // ══════════════════════════════════════════════════════════════

        case CashfreeOperation.GET_SETTLEMENTS_FOR_ORDER: {
          const orderId = r(config!.orderId)
          if (!orderId) throw new NonRetriableError("Cashfree GET_SETTLEMENTS_FOR_ORDER: orderId is required")
          const data = await cashfreeApi("GET", `/pg/orders/${orderId}/settlements`, creds)
          result = { success: true, settlement: data }
          break
        }

        case CashfreeOperation.GET_ALL_SETTLEMENTS: {
          const data = await cashfreeApi("GET", "/pg/settlements", creds, undefined, {
            cursor: r(config!.cursor) || undefined,
            limit: config!.limit || 10,
          })
          result = { success: true, settlements: (data as Record<string, unknown>).data ?? data, cursor: (data as Record<string, unknown>).cursor, limit: config!.limit }
          break
        }

        case CashfreeOperation.GET_SETTLEMENT_RECON: {
          const data = await cashfreeApi("GET", "/pg/settlements/recon", creds, undefined, {
            cursor: r(config!.cursor) || undefined,
            limit: config!.limit || 10,
            from_date: r(config!.startDate) || undefined,
            end_date: r(config!.endDate) || undefined,
          })
          result = { success: true, reconData: (data as Record<string, unknown>).data ?? data, cursor: (data as Record<string, unknown>).cursor }
          break
        }

        // ══════════════════════════════════════════════════════════════
        // PAYMENT LINKS
        // ══════════════════════════════════════════════════════════════

        case CashfreeOperation.CREATE_PAYMENT_LINK: {
          const linkAmount = r(config!.linkAmount)
          const linkPurpose = r(config!.linkPurpose)
          if (!linkAmount || !linkPurpose) throw new NonRetriableError("Cashfree CREATE_PAYMENT_LINK: linkAmount and linkPurpose are required")
          const body: Record<string, unknown> = {
            link_amount: parseFloat(linkAmount),
            link_currency: r(config!.linkCurrency) || "INR",
            link_purpose: linkPurpose,
            customer_details: {
              customer_phone: r(config!.customerPhone),
              customer_name: r(config!.customerName) || undefined,
              customer_email: r(config!.customerEmail) || undefined,
            },
            link_notify: {
              send_sms: config!.linkNotifyPhone,
              send_email: config!.linkNotifyEmail,
            },
            link_auto_reminders: config!.linkAutoReminders,
          }
          const linkId = r(config!.linkId)
          if (linkId) body.link_id = linkId
          const linkDesc = r(config!.linkDescription)
          if (linkDesc) body.link_description = linkDesc
          const linkExpiry = r(config!.linkExpiryTime)
          if (linkExpiry) body.link_expiry_time = linkExpiry
          const minPartial = r(config!.linkMinPartialAmount)
          if (minPartial) body.link_minimum_partial_amount = parseFloat(minPartial)
          const data = await cashfreeApi("POST", "/pg/links", creds, body)
          result = { success: true, linkId: data.link_id, linkUrl: data.link_url, linkStatus: data.link_status, linkQrcode: data.link_qrcode, data }
          break
        }

        case CashfreeOperation.GET_PAYMENT_LINK: {
          const linkId = r(config!.linkId)
          if (!linkId) throw new NonRetriableError("Cashfree GET_PAYMENT_LINK: linkId is required")
          const data = await cashfreeApi("GET", `/pg/links/${linkId}`, creds)
          result = { success: true, link: data, linkStatus: data.link_status, linkUrl: data.link_url }
          break
        }

        case CashfreeOperation.CANCEL_PAYMENT_LINK: {
          const linkId = r(config!.linkId)
          if (!linkId) throw new NonRetriableError("Cashfree CANCEL_PAYMENT_LINK: linkId is required")
          const data = await cashfreeApi("PATCH", `/pg/links/${linkId}/cancel`, creds)
          result = { success: true, linkId, cancelled: true, data }
          break
        }

        case CashfreeOperation.GET_ORDERS_FOR_LINK: {
          const linkId = r(config!.linkId)
          if (!linkId) throw new NonRetriableError("Cashfree GET_ORDERS_FOR_LINK: linkId is required")
          const data = await cashfreeApi("GET", `/pg/links/${linkId}/orders`, creds)
          const orders = Array.isArray(data) ? data : []
          result = { success: true, orders, count: orders.length }
          break
        }

        // ══════════════════════════════════════════════════════════════
        // SUBSCRIPTIONS
        // ══════════════════════════════════════════════════════════════

        case CashfreeOperation.CREATE_SUBSCRIPTION_PLAN: {
          const planId = r(config!.planId)
          const planName = r(config!.planName)
          const orderAmount = r(config!.orderAmount)
          if (!planId || !planName || !orderAmount) throw new NonRetriableError("Cashfree CREATE_SUBSCRIPTION_PLAN: planId, planName, and orderAmount are required")
          const body: Record<string, unknown> = {
            plan_id: planId,
            plan_name: planName,
            plan_type: r(config!.planType) || "PERIODIC",
            plan_currency: r(config!.orderCurrency) || "INR",
            plan_recurring_amount: parseFloat(orderAmount),
            plan_intervals: config!.planIntervals || 1,
            plan_interval_type: r(config!.planIntervalType) || "MONTH",
          }
          const planMaxAmount = r(config!.planMaxAmount)
          if (planMaxAmount) body.plan_max_amount = parseFloat(planMaxAmount)
          if (config!.planMaxCycles) body.plan_max_cycles = config!.planMaxCycles
          const data = await cashfreeApi("POST", "/pg/plans", creds, body)
          result = { success: true, planId: data.plan_id, planStatus: data.plan_status, data }
          break
        }

        case CashfreeOperation.GET_SUBSCRIPTION_PLAN: {
          const planId = r(config!.planId)
          if (!planId) throw new NonRetriableError("Cashfree GET_SUBSCRIPTION_PLAN: planId is required")
          const data = await cashfreeApi("GET", `/pg/plans/${planId}`, creds)
          result = { success: true, plan: data, planStatus: data.plan_status }
          break
        }

        case CashfreeOperation.CREATE_SUBSCRIPTION: {
          const subscriptionId = r(config!.subscriptionId)
          const planId = r(config!.planId)
          const customerId = r(config!.customerId)
          const customerPhone = r(config!.customerPhone)
          if (!subscriptionId || !planId || !customerId || !customerPhone) throw new NonRetriableError("Cashfree CREATE_SUBSCRIPTION: subscriptionId, planId, customerId, and customerPhone are required")
          const body: Record<string, unknown> = {
            subscription_id: subscriptionId,
            plan_id: planId,
            customer_details: {
              customer_id: customerId,
              customer_phone: customerPhone,
              customer_email: r(config!.customerEmail) || undefined,
              customer_name: r(config!.customerName) || undefined,
            },
          }
          const returnUrl = r(config!.subscriptionReturnUrl)
          if (returnUrl) body.return_url = returnUrl
          const notifyUrl = r(config!.subscriptionNotifyUrl)
          if (notifyUrl) body.subscription_notify_url = notifyUrl
          const firstCharge = r(config!.subscriptionFirstChargeTime)
          if (firstCharge) body.subscription_first_charge_time = firstCharge
          const expiry = r(config!.subscriptionExpiryTime)
          if (expiry) body.subscription_expiry_time = expiry
          const data = await cashfreeApi("POST", "/pg/subscriptions", creds, body)
          result = { success: true, subscriptionId, cfSubscriptionId: data.cf_subscription_id, subReferenceId: data.sub_reference_id, paymentLink: data.subscription_session_id, data }
          break
        }

        case CashfreeOperation.GET_SUBSCRIPTION: {
          const subscriptionId = r(config!.subscriptionId)
          if (!subscriptionId) throw new NonRetriableError("Cashfree GET_SUBSCRIPTION: subscriptionId is required")
          const data = await cashfreeApi("GET", `/pg/subscriptions/${subscriptionId}`, creds)
          result = { success: true, subscription: data, subscriptionStatus: data.subscription_status }
          break
        }

        case CashfreeOperation.MANAGE_SUBSCRIPTION: {
          const subscriptionId = r(config!.subscriptionId)
          const action = r(config!.subscriptionAction) || "PAUSE"
          if (!subscriptionId) throw new NonRetriableError("Cashfree MANAGE_SUBSCRIPTION: subscriptionId is required")
          const data = await cashfreeApi("PATCH", `/pg/subscriptions/${subscriptionId}`, creds, { action })
          result = { success: true, subscriptionId, action, data }
          break
        }

        case CashfreeOperation.GET_SUBSCRIPTION_PAYMENTS: {
          const subscriptionId = r(config!.subscriptionId)
          if (!subscriptionId) throw new NonRetriableError("Cashfree GET_SUBSCRIPTION_PAYMENTS: subscriptionId is required")
          const data = await cashfreeApi("GET", `/pg/subscriptions/${subscriptionId}/payments`, creds)
          const payments = Array.isArray(data) ? data : []
          result = { success: true, payments, count: payments.length }
          break
        }

        // ══════════════════════════════════════════════════════════════
        // PAYOUTS
        // ══════════════════════════════════════════════════════════════

        case CashfreeOperation.GET_PAYOUT_BALANCE: {
          const token = await getPayoutToken(creds)
          const data = await cashfreePayoutApi("GET", "/payout/v1/getBalance", token, creds)
          result = { success: true, balance: (data?.data as Record<string, unknown>)?.balance, availableBalance: (data?.data as Record<string, unknown>)?.balance, data: data?.data }
          break
        }

        case CashfreeOperation.ADD_BENEFICIARY: {
          const token = await getPayoutToken(creds)
          const body: Record<string, unknown> = {
            beneId: r(config!.beneId),
            name: r(config!.beneName),
            phone: r(config!.benePhone),
          }
          const beneEmail = r(config!.beneEmail)
          if (beneEmail) body.email = beneEmail
          const beneBankAccount = r(config!.beneBankAccount)
          if (beneBankAccount) body.bankAccount = beneBankAccount
          const beneBankIfsc = r(config!.beneBankIfsc)
          if (beneBankIfsc) body.ifsc = beneBankIfsc
          const beneVpa = r(config!.beneVpa)
          if (beneVpa) body.vpa = beneVpa
          body.address1 = r(config!.beneAddress) || "India"
          const beneCity = r(config!.beneCity)
          if (beneCity) body.city = beneCity
          body.state = r(config!.beneState) || "India"
          const benePincode = r(config!.benePincode)
          if (benePincode) body.pincode = benePincode
          const data = await cashfreePayoutApi("POST", "/payout/v1/addBeneficiary", token, creds, body)
          result = { success: true, beneId: r(config!.beneId), data }
          break
        }

        case CashfreeOperation.GET_BENEFICIARY: {
          const token = await getPayoutToken(creds)
          const beneId = r(config!.beneId)
          if (!beneId) throw new NonRetriableError("Cashfree GET_BENEFICIARY: beneId is required")
          const data = await cashfreePayoutApi("GET", "/payout/v1/getBeneficiary", token, creds, undefined, { beneId })
          result = { success: true, beneficiary: data?.data, beneId }
          break
        }

        case CashfreeOperation.REMOVE_BENEFICIARY: {
          const token = await getPayoutToken(creds)
          const beneId = r(config!.beneId)
          if (!beneId) throw new NonRetriableError("Cashfree REMOVE_BENEFICIARY: beneId is required")
          await cashfreePayoutApi("DELETE", "/payout/v1/removeBeneficiary", token, creds, undefined, { beneId })
          result = { success: true, removed: true, beneId }
          break
        }

        case CashfreeOperation.TRANSFER_TO_BENEFICIARY: {
          const token = await getPayoutToken(creds)
          const beneId = r(config!.beneId)
          const transferAmount = r(config!.transferAmount)
          const transferId = r(config!.transferId)
          if (!beneId || !transferAmount || !transferId) throw new NonRetriableError("Cashfree TRANSFER_TO_BENEFICIARY: beneId, transferAmount, and transferId are required")
          const body: Record<string, unknown> = {
            beneId,
            amount: transferAmount,
            transferId,
            transferMode: r(config!.transferMode) || "banktransfer",
          }
          const transferRemarks = r(config!.transferRemarks)
          if (transferRemarks) body.remarks = transferRemarks
          const data = await cashfreePayoutApi("POST", "/payout/v1/requestTransfer", token, creds, body)
          const d = data?.data as Record<string, unknown>
          result = { success: true, transferId, referenceId: d?.referenceId, utr: d?.utr, status: d?.transfer_status, data }
          break
        }

        case CashfreeOperation.GET_TRANSFER_STATUS: {
          const token = await getPayoutToken(creds)
          const transferId = r(config!.transferId)
          if (!transferId) throw new NonRetriableError("Cashfree GET_TRANSFER_STATUS: transferId is required")
          const data = await cashfreePayoutApi("GET", "/payout/v1/getTransferStatus", token, creds, undefined, { transferId })
          const d = data?.data as Record<string, unknown>
          result = { success: true, transferId, status: d?.transfer_status, utr: d?.utr, data }
          break
        }

        case CashfreeOperation.BULK_TRANSFER: {
          const token = await getPayoutToken(creds)
          const batchTransferId = r(config!.batchTransferId)
          if (!batchTransferId) throw new NonRetriableError("Cashfree BULK_TRANSFER: batchTransferId is required")
          let parsedEntries: unknown[] = []
          try {
            parsedEntries = JSON.parse(r(config!.batchEntries) || "[]")
          } catch {
            throw new NonRetriableError("Cashfree BULK_TRANSFER: batchEntries must be a valid JSON array")
          }
          const data = await cashfreePayoutApi("POST", "/payout/v1/requestBatchTransfer", token, creds, { batchTransferId, batch: parsedEntries })
          const d = data?.data as Record<string, unknown>
          result = { success: true, batchTransferId, referenceId: d?.referenceId, totalTransfers: parsedEntries.length, data }
          break
        }

        case CashfreeOperation.GET_BATCH_TRANSFER_STATUS: {
          const token = await getPayoutToken(creds)
          const batchTransferId = r(config!.batchTransferId)
          if (!batchTransferId) throw new NonRetriableError("Cashfree GET_BATCH_TRANSFER_STATUS: batchTransferId is required")
          const data = await cashfreePayoutApi("GET", "/payout/v1/getBatchTransferStatus", token, creds, undefined, { batchTransferId })
          const d = data?.data as Record<string, unknown>
          result = { success: true, batchTransferId, batchStatus: d?.batchStatus, entries: d?.data, data }
          break
        }

        // ══════════════════════════════════════════════════════════════
        // UPI
        // ══════════════════════════════════════════════════════════════

        case CashfreeOperation.VALIDATE_UPI_ID: {
          const upiVpa = r(config!.upiVpa)
          if (!upiVpa) throw new NonRetriableError("Cashfree VALIDATE_UPI_ID: upiVpa is required")
          const data = await cashfreeApi("GET", "/pg/upi/validate", creds, undefined, { vpa: upiVpa })
          result = {
            success: true,
            vpa: upiVpa,
            isValid: (data?.is_valid ?? data?.vpa_valid) as boolean,
            name: data?.name,
            data,
          }
          break
        }

        case CashfreeOperation.CREATE_UPI_PAYMENT_LINK: {
          const linkAmount = r(config!.linkAmount)
          const linkPurpose = r(config!.linkPurpose)
          if (!linkAmount || !linkPurpose) throw new NonRetriableError("Cashfree CREATE_UPI_PAYMENT_LINK: linkAmount and linkPurpose are required")
          const body: Record<string, unknown> = {
            link_amount: parseFloat(linkAmount),
            link_currency: r(config!.linkCurrency) || "INR",
            link_purpose: linkPurpose,
            customer_details: {
              customer_phone: r(config!.customerPhone),
              customer_name: r(config!.customerName) || undefined,
              customer_email: r(config!.customerEmail) || undefined,
            },
            link_notify: {
              send_sms: config!.linkNotifyPhone,
              send_email: config!.linkNotifyEmail,
            },
            link_auto_reminders: config!.linkAutoReminders,
            link_meta: { upi_intent: true },
          }
          const linkId = r(config!.linkId)
          if (linkId) body.link_id = linkId
          const data = await cashfreeApi("POST", "/pg/links", creds, body)
          result = { success: true, linkId: data.link_id, linkUrl: data.link_url, linkStatus: data.link_status, linkQrcode: data.link_qrcode, upiLink: true, data }
          break
        }

        // ══════════════════════════════════════════════════════════════
        // OFFERS
        // ══════════════════════════════════════════════════════════════

        case CashfreeOperation.CREATE_OFFER: {
          let offerMeta: unknown, offerValidations: unknown, offerDetails: unknown
          try { offerMeta = JSON.parse(r(config!.offerMeta) || "{}") } catch { throw new NonRetriableError("Cashfree CREATE_OFFER: offerMeta must be valid JSON") }
          try { offerValidations = JSON.parse(r(config!.offerValidations) || "{}") } catch { throw new NonRetriableError("Cashfree CREATE_OFFER: offerValidations must be valid JSON") }
          try { offerDetails = JSON.parse(r(config!.offerDetails) || "{}") } catch { throw new NonRetriableError("Cashfree CREATE_OFFER: offerDetails must be valid JSON") }
          const data = await cashfreeApi("POST", "/pg/offers", creds, { offer_meta: offerMeta, offer_validations: offerValidations, offer_details: offerDetails })
          result = { success: true, offerId: data.offer_id, offerStatus: data.offer_status, data }
          break
        }

        case CashfreeOperation.GET_OFFER: {
          const offerId = r(config!.offerId)
          if (!offerId) throw new NonRetriableError("Cashfree GET_OFFER: offerId is required")
          const data = await cashfreeApi("GET", `/pg/offers/${offerId}`, creds)
          result = { success: true, offer: data, offerId, offerStatus: data.offer_status }
          break
        }

        // ══════════════════════════════════════════════════════════════
        // WEBHOOKS
        // ══════════════════════════════════════════════════════════════

        case CashfreeOperation.VERIFY_WEBHOOK_SIGNATURE: {
          const signature = r(config!.webhookSignature)
          const timestamp = r(config!.webhookTimestamp)
          const rawBody = r(config!.webhookRawBody)
          if (!signature || !timestamp || !rawBody) {
            throw new NonRetriableError("Cashfree webhook verification requires signature, timestamp, and rawBody.")
          }
          const crypto = await import("crypto")
          const signedPayload = timestamp + rawBody
          const expectedSignature = crypto
            .createHmac("sha256", creds.clientSecret)
            .update(signedPayload)
            .digest("base64")
          const isValid = expectedSignature === signature
          if (!isValid && config!.webhookThrowOnFail) {
            throw new NonRetriableError(
              "Cashfree webhook signature verification failed. " +
              "Possible replay attack or wrong clientSecret."
            )
          }
          result = { success: true, isValid, verified: isValid, message: isValid ? "Signature verified" : "Signature mismatch" }
          break
        }

        default:
          throw new NonRetriableError(`Cashfree: Unknown operation ${String(config!.operation)}`)
      }

      await publish(cashfreeChannel(nodeId).status({ nodeId, status: "success" }))
      return { ...context, [variableName]: result }

    } catch (err) {
      await publish(cashfreeChannel(nodeId).status({ nodeId, status: "error" }))
      const cfg = config!
      if (cfg?.continueOnFail) {
        return {
          ...context,
          [cfg.variableName || "cashfree"]: {
            success: false,
            error: err instanceof Error ? err.message : String(err),
          },
        }
      }
      throw err
    }
  })
}
