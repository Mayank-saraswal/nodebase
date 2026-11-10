/**
 * Stripe Corsair adapter.
 */

import { NonRetriableError } from "inngest"
import type { IntegrationAdapter } from "../../types"
import { t } from "../_shared/resolve-fields"
import { mapCorsairError } from "@/lib/corsair/errors"
import {
  runStripeOperation,
  type ResolvedStripeFields,
  type StripeApiClient,
} from "./operations"

export const stripeAdapter: IntegrationAdapter = {
  pluginId: "stripe",
  async run({ data, context, client, userId: _userId }) {
    void _userId
    // unknown: Node.data JSON boundary
    const config = (data ?? {}) as Record<string, unknown>
    const operation = String(config.operation ?? "CUSTOMER_LIST")
    const variableName = String(config.variableName || "stripe")

    if (!client || typeof client !== "object") {
      throw new NonRetriableError("Stripe Corsair: missing tenant client.")
    }
    const st = client as StripeApiClient
    if (!st.stripe?.api) {
      throw new NonRetriableError(
        "Stripe Corsair: client.stripe.api missing. Is @corsair-dev/stripe registered?",
      )
    }

    const fields: ResolvedStripeFields = {
      operation,
      amount: t(config.amount as string, context),
      currency: t((config.currency as string) || "usd", context),
      description: t(config.description as string, context),
      customerId: t(
        (config.customerId as string) ||
          (config.customer as string) ||
          "",
        context,
      ),
      email: t(config.email as string, context),
      name: t(config.name as string, context),
      phone: t(config.phone as string, context),
      chargeId: t(
        (config.chargeId as string) || (config.charge_id as string) || "",
        context,
      ),
      paymentIntentId: t(
        (config.paymentIntentId as string) ||
          (config.payment_intent_id as string) ||
          "",
        context,
      ),
      sourceId: t(
        (config.sourceId as string) || (config.source_id as string) || "",
        context,
      ),
      source: t(config.source as string, context),
      paymentMethod: t(
        (config.paymentMethod as string) ||
          (config.payment_method as string) ||
          "",
        context,
      ),
      productId: t(
        (config.productId as string) || (config.product as string) || "",
        context,
      ),
      productName: t(config.productName as string, context),
      unitAmount: t(
        (config.unitAmount as string) ||
          (config.unit_amount as string) ||
          "",
        context,
      ),
      couponId: t(config.couponId as string, context),
      percentOff: t(
        (config.percentOff as string) ||
          (config.percent_off as string) ||
          "",
        context,
      ),
      amountOff: t(
        (config.amountOff as string) ||
          (config.amount_off as string) ||
          "",
        context,
      ),
      duration: t(config.duration as string, context),
      limit: t(config.limit as string, context),
      startingAfter: t(
        (config.startingAfter as string) ||
          (config.starting_after as string) ||
          "",
        context,
      ),
      endingBefore: t(
        (config.endingBefore as string) ||
          (config.ending_before as string) ||
          "",
        context,
      ),
      metadataJson: t(
        (config.metadataJson as string) ||
          (config.metadata as string) ||
          "",
        context,
      ),
      paramsJson: t(
        (config.paramsJson as string) || (config.params as string) || "",
        context,
      ),
      confirm: Boolean(config.confirm),
      cardNumber: t(config.cardNumber as string, context),
      expMonth: t(
        (config.expMonth as string) || (config.exp_month as string) || "",
        context,
      ),
      expYear: t(
        (config.expYear as string) || (config.exp_year as string) || "",
        context,
      ),
      cvc: t(config.cvc as string, context),
    }

    let apiResult: Record<string, unknown>
    try {
      apiResult = await runStripeOperation(st, fields)
    } catch (err) {
      if (err instanceof NonRetriableError) throw err
      mapCorsairError(err, "Stripe")
    }

    return {
      ...context,
      [variableName]: {
        operation,
        ...apiResult,
        timestamp: new Date().toISOString(),
      },
    }
  },
}
