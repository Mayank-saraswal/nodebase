/**
 * Razorpay Corsair adapter.
 */

import { NonRetriableError } from "inngest"
import type { IntegrationAdapter } from "../../types"
import { t } from "../_shared/resolve-fields"
import { mapCorsairError } from "@/lib/corsair/errors"
import {
  runRazorpayOperation,
  type RazorpayApiClient,
  type ResolvedRazorpayFields,
} from "./operations"

export const razorpayAdapter: IntegrationAdapter = {
  pluginId: "razorpay",
  async run({ data, context, client, userId: _userId }) {
    void _userId
    // unknown: Node.data JSON boundary
    const config = (data ?? {}) as Record<string, unknown>
    const operation = String(config.operation ?? "ORDER_CREATE")
    const variableName = String(config.variableName || "razorpay")

    if (!client || typeof client !== "object") {
      throw new NonRetriableError("Razorpay Corsair: missing tenant client.")
    }
    const rz = client as RazorpayApiClient
    if (!rz.razorpay?.api) {
      throw new NonRetriableError(
        "Razorpay Corsair: client.razorpay.api missing. Is @corsair-dev/razorpay registered?",
      )
    }

    const fields: ResolvedRazorpayFields = {
      operation,
      amount: t(config.amount as string, context),
      currency: t(
        (config.currency as string) || "INR",
        context,
      ),
      receipt: t(config.receipt as string, context),
      notesJson: t(
        (config.notes as string) ||
          (config.notesJson as string) ||
          "",
        context,
      ),
      orderId: t(config.orderId as string, context),
      paymentId: t(config.paymentId as string, context),
      refundId: t(config.refundId as string, context),
      customerId: t(config.customerId as string, context),
      customerName: t(config.customerName as string, context),
      customerEmail: t(config.customerEmail as string, context),
      customerContact: t(config.customerContact as string, context),
      gstin: t(config.gstin as string, context),
      captureAmount: t(config.captureAmount as string, context),
      refundAmount: t(config.refundAmount as string, context),
      refundSpeed: t(
        (config.refundSpeed as string) || "normal",
        context,
      ),
      planId: t(config.planId as string, context),
      totalCount: t(config.totalCount as string, context),
      quantity: t(config.quantity as string, context),
      startAt: t(config.startAt as string, context),
      subscriptionId: t(config.subscriptionId as string, context),
      cancelAtCycleEnd: Boolean(config.cancelAtCycleEnd),
      remainingCount: t(config.remainingCount as string, context),
      scheduleChangeAt: t(config.scheduleChangeAt as string, context),
      accountNumber: t(config.accountNumber as string, context),
      fundAccountId: t(config.fundAccountId as string, context),
      payoutMode: t(config.payoutMode as string, context),
      payoutPurpose: t(
        (config.payoutPurpose as string) || "payout",
        context,
      ),
      narration: t(config.narration as string, context),
      referenceId: t(config.referenceId as string, context),
      queueIfLowBalance: Boolean(config.queueIfLowBalance),
      payoutId: t(config.payoutId as string, context),
      settlementId: t(
        (config.settlementId as string) || (config.settlement_id as string) || "",
        context,
      ),
      count: t(config.count as string, context),
      skip: t(config.skip as string, context),
      fromDate: t(
        (config.fromDate as string) || (config.from as string) || "",
        context,
      ),
      toDate: t(
        (config.toDate as string) || (config.to as string) || "",
        context,
      ),
      authorized: t(config.authorized as string, context),
      offerId: t(config.offerId as string, context),
    }

    let apiResult: Record<string, unknown>
    try {
      apiResult = await runRazorpayOperation(rz, fields)
    } catch (err) {
      if (err instanceof NonRetriableError) throw err
      mapCorsairError(err, "Razorpay")
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
