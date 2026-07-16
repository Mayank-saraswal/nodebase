/**
 * Stripe Corsair operations — full @corsair-dev/stripe surface.
 */

import { NonRetriableError } from "inngest"
import { stripeIntegrationDefinition } from "@/features/integrations/registry/integrations/stripe"
import { resolveOperation } from "@/features/integrations/registry/resolve"

type ApiFn = (args?: Record<string, unknown>) => Promise<unknown>

export type StripeApiClient = {
  stripe: {
    api: {
      balance: { get: ApiFn }
      charges: { create: ApiFn; get: ApiFn; list: ApiFn; update: ApiFn }
      coupons: { create: ApiFn; list: ApiFn }
      customers: { create: ApiFn; delete: ApiFn; get: ApiFn; list: ApiFn }
      paymentIntents: {
        create: ApiFn
        get: ApiFn
        list: ApiFn
        update: ApiFn
      }
      prices: { create: ApiFn; list: ApiFn }
      sources: { create: ApiFn; get: ApiFn }
      tokens: { create: ApiFn }
    }
  }
}

export type ResolvedStripeFields = {
  operation: string
  amount: string
  currency: string
  description: string
  customerId: string
  email: string
  name: string
  phone: string
  chargeId: string
  paymentIntentId: string
  sourceId: string
  source: string
  paymentMethod: string
  productId: string
  productName: string
  unitAmount: string
  couponId: string
  percentOff: string
  amountOff: string
  duration: string
  limit: string
  startingAfter: string
  endingBefore: string
  metadataJson: string
  paramsJson: string
  confirm: boolean
  cardNumber: string
  expMonth: string
  expYear: string
  cvc: string
}

function asRecord(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {}
}

function wrap(operation: string, data: unknown): Record<string, unknown> {
  return { operation, ...asRecord(data), data }
}

function normalizeOp(raw: string): string {
  const { operation, requestedKey } = resolveOperation(
    stripeIntegrationDefinition,
    raw,
  )
  if (operation.aliases?.includes(requestedKey)) return requestedKey
  return operation.aliases?.[0] ?? operation.key
}

export function isStripeCorsairOp(operation: string): boolean {
  try {
    resolveOperation(stripeIntegrationDefinition, operation)
    return true
  } catch {
    return false
  }
}

function requireField(value: string, field: string, op: string) {
  if (!value.trim()) {
    throw new NonRetriableError(`Stripe ${op}: ${field} is required.`)
  }
}

function parseAmount(value: string, field: string, op: string): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) {
    throw new NonRetriableError(
      `Stripe ${op}: ${field} must be a positive integer (cents).`,
    )
  }
  return Math.trunc(n)
}

function optInt(value: string): number | undefined {
  if (!value.trim()) return undefined
  const n = Number(value)
  return Number.isFinite(n) ? Math.trunc(n) : undefined
}

function parseMeta(raw: string): Record<string, string> | undefined {
  if (!raw.trim()) return undefined
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string>
    }
    throw new NonRetriableError("Stripe metadataJson must be a JSON object.")
  } catch (e) {
    if (e instanceof NonRetriableError) throw e
    throw new NonRetriableError("Stripe metadataJson is invalid JSON.")
  }
}

function parseParams(raw: string): Record<string, unknown> {
  if (!raw.trim()) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
    throw new NonRetriableError("Stripe paramsJson must be a JSON object.")
  } catch (e) {
    if (e instanceof NonRetriableError) throw e
    throw new NonRetriableError("Stripe paramsJson is invalid JSON.")
  }
}

function listOpts(fields: ResolvedStripeFields) {
  return {
    limit: optInt(fields.limit),
    starting_after: fields.startingAfter || undefined,
    ending_before: fields.endingBefore || undefined,
  }
}

export async function runStripeOperation(
  client: StripeApiClient,
  fields: ResolvedStripeFields,
): Promise<Record<string, unknown>> {
  const api = client.stripe.api
  const op = normalizeOp(fields.operation)
  const currency = (fields.currency || "usd").toLowerCase()
  const metadata = parseMeta(fields.metadataJson)
  const extra = parseParams(fields.paramsJson)

  switch (op) {
    case "BALANCE_GET":
    case "GET_BALANCE":
    case "balance.get": {
      const data = await api.balance.get({ ...extra })
      return wrap("BALANCE_GET", data)
    }
    case "CHARGE_CREATE":
    case "CREATE_CHARGE":
    case "charges.create": {
      const amount = parseAmount(fields.amount, "amount", "CHARGE_CREATE")
      if (!fields.source.trim() && !fields.customerId.trim()) {
        throw new NonRetriableError(
          "Stripe CHARGE_CREATE: source or customerId is required.",
        )
      }
      const data = await api.charges.create({
        amount,
        currency,
        source: fields.source || undefined,
        customer: fields.customerId || undefined,
        description: fields.description || undefined,
        metadata,
        ...extra,
      })
      return wrap("CHARGE_CREATE", data)
    }
    case "CHARGE_GET":
    case "GET_CHARGE":
    case "charges.get": {
      requireField(fields.chargeId, "chargeId", "CHARGE_GET")
      const data = await api.charges.get({ id: fields.chargeId, ...extra })
      return wrap("CHARGE_GET", data)
    }
    case "CHARGE_LIST":
    case "LIST_CHARGES":
    case "charges.list": {
      const data = await api.charges.list({
        customer: fields.customerId || undefined,
        ...listOpts(fields),
        ...extra,
      })
      return wrap("CHARGE_LIST", data)
    }
    case "CHARGE_UPDATE":
    case "UPDATE_CHARGE":
    case "charges.update": {
      requireField(fields.chargeId, "chargeId", "CHARGE_UPDATE")
      const data = await api.charges.update({
        id: fields.chargeId,
        description: fields.description || undefined,
        metadata,
        ...extra,
      })
      return wrap("CHARGE_UPDATE", data)
    }
    case "COUPON_CREATE":
    case "CREATE_COUPON":
    case "coupons.create": {
      if (!fields.percentOff.trim() && !fields.amountOff.trim()) {
        throw new NonRetriableError(
          "Stripe COUPON_CREATE: percentOff or amountOff is required.",
        )
      }
      const data = await api.coupons.create({
        percent_off: fields.percentOff.trim()
          ? Number(fields.percentOff)
          : undefined,
        amount_off: fields.amountOff.trim()
          ? parseAmount(fields.amountOff, "amountOff", "COUPON_CREATE")
          : undefined,
        currency: fields.amountOff.trim() ? currency : undefined,
        duration: fields.duration || "once",
        id: fields.couponId || undefined,
        ...extra,
      })
      return wrap("COUPON_CREATE", data)
    }
    case "COUPON_LIST":
    case "LIST_COUPONS":
    case "coupons.list": {
      const data = await api.coupons.list({ ...listOpts(fields), ...extra })
      return wrap("COUPON_LIST", data)
    }
    case "CUSTOMER_CREATE":
    case "CREATE_CUSTOMER":
    case "customers.create": {
      const data = await api.customers.create({
        email: fields.email || undefined,
        name: fields.name || undefined,
        phone: fields.phone || undefined,
        description: fields.description || undefined,
        metadata,
        ...extra,
      })
      return wrap("CUSTOMER_CREATE", data)
    }
    case "CUSTOMER_DELETE":
    case "DELETE_CUSTOMER":
    case "customers.delete": {
      requireField(fields.customerId, "customerId", "CUSTOMER_DELETE")
      const data = await api.customers.delete({
        id: fields.customerId,
        ...extra,
      })
      return wrap("CUSTOMER_DELETE", data)
    }
    case "CUSTOMER_GET":
    case "GET_CUSTOMER":
    case "customers.get": {
      requireField(fields.customerId, "customerId", "CUSTOMER_GET")
      const data = await api.customers.get({
        id: fields.customerId,
        ...extra,
      })
      return wrap("CUSTOMER_GET", data)
    }
    case "CUSTOMER_LIST":
    case "LIST_CUSTOMERS":
    case "customers.list": {
      const data = await api.customers.list({
        email: fields.email || undefined,
        ...listOpts(fields),
        ...extra,
      })
      return wrap("CUSTOMER_LIST", data)
    }
    case "PAYMENT_INTENT_CREATE":
    case "CREATE_PAYMENT_INTENT":
    case "paymentIntents.create": {
      const amount = parseAmount(
        fields.amount,
        "amount",
        "PAYMENT_INTENT_CREATE",
      )
      const data = await api.paymentIntents.create({
        amount,
        currency,
        customer: fields.customerId || undefined,
        description: fields.description || undefined,
        payment_method: fields.paymentMethod || undefined,
        confirm: fields.confirm || undefined,
        metadata,
        ...extra,
      })
      return wrap("PAYMENT_INTENT_CREATE", data)
    }
    case "PAYMENT_INTENT_GET":
    case "GET_PAYMENT_INTENT":
    case "paymentIntents.get": {
      requireField(
        fields.paymentIntentId,
        "paymentIntentId",
        "PAYMENT_INTENT_GET",
      )
      const data = await api.paymentIntents.get({
        id: fields.paymentIntentId,
        ...extra,
      })
      return wrap("PAYMENT_INTENT_GET", data)
    }
    case "PAYMENT_INTENT_LIST":
    case "LIST_PAYMENT_INTENTS":
    case "paymentIntents.list": {
      const data = await api.paymentIntents.list({
        customer: fields.customerId || undefined,
        ...listOpts(fields),
        ...extra,
      })
      return wrap("PAYMENT_INTENT_LIST", data)
    }
    case "PAYMENT_INTENT_UPDATE":
    case "UPDATE_PAYMENT_INTENT":
    case "paymentIntents.update": {
      requireField(
        fields.paymentIntentId,
        "paymentIntentId",
        "PAYMENT_INTENT_UPDATE",
      )
      const data = await api.paymentIntents.update({
        id: fields.paymentIntentId,
        amount: fields.amount.trim()
          ? parseAmount(fields.amount, "amount", "PAYMENT_INTENT_UPDATE")
          : undefined,
        currency: fields.currency.trim() ? currency : undefined,
        description: fields.description || undefined,
        payment_method: fields.paymentMethod || undefined,
        metadata,
        ...extra,
      })
      return wrap("PAYMENT_INTENT_UPDATE", data)
    }
    case "PRICE_CREATE":
    case "CREATE_PRICE":
    case "prices.create": {
      if (!fields.productId.trim() && !fields.productName.trim()) {
        throw new NonRetriableError(
          "Stripe PRICE_CREATE: productId or productName is required.",
        )
      }
      const unit_amount = fields.unitAmount.trim()
        ? parseAmount(fields.unitAmount, "unitAmount", "PRICE_CREATE")
        : fields.amount.trim()
          ? parseAmount(fields.amount, "amount", "PRICE_CREATE")
          : undefined
      const data = await api.prices.create({
        currency,
        unit_amount,
        product: fields.productId || undefined,
        product_data: fields.productName.trim()
          ? { name: fields.productName }
          : undefined,
        ...extra,
      })
      return wrap("PRICE_CREATE", data)
    }
    case "PRICE_LIST":
    case "LIST_PRICES":
    case "prices.list": {
      const data = await api.prices.list({
        product: fields.productId || undefined,
        ...listOpts(fields),
        ...extra,
      })
      return wrap("PRICE_LIST", data)
    }
    case "SOURCE_CREATE":
    case "CREATE_SOURCE":
    case "sources.create": {
      const data = await api.sources.create({
        type: (extra.type as string) || "card",
        amount: fields.amount.trim()
          ? parseAmount(fields.amount, "amount", "SOURCE_CREATE")
          : undefined,
        currency: fields.currency.trim() ? currency : undefined,
        ...extra,
      })
      return wrap("SOURCE_CREATE", data)
    }
    case "SOURCE_GET":
    case "GET_SOURCE":
    case "sources.get": {
      requireField(fields.sourceId, "sourceId", "SOURCE_GET")
      const data = await api.sources.get({ id: fields.sourceId, ...extra })
      return wrap("SOURCE_GET", data)
    }
    case "TOKEN_CREATE":
    case "CREATE_TOKEN":
    case "tokens.create": {
      if (!fields.cardNumber.trim() && !Object.keys(extra).length) {
        throw new NonRetriableError(
          "Stripe TOKEN_CREATE: card fields or paramsJson is required.",
        )
      }
      const data = await api.tokens.create({
        card: fields.cardNumber.trim()
          ? {
              number: fields.cardNumber,
              exp_month: fields.expMonth,
              exp_year: fields.expYear,
              cvc: fields.cvc || undefined,
            }
          : undefined,
        ...extra,
      })
      return wrap("TOKEN_CREATE", data)
    }
    default:
      throw new NonRetriableError(
        `Stripe ${op}: not available on Corsair path. Disable CORSAIR_PLUGIN_STRIPE or use a supported operation.`,
      )
  }
}
