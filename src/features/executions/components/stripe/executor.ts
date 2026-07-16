/**
 * Stripe action executor — Corsair multi-tenant path for full package surface.
 * (Canvas currently ships STRIPE_TRIGGER only; this executor is registered for
 * typeKey "stripe" / future STRIPE node and can be invoked via tryRunIntegration.)
 */

import { NonRetriableError, RetryAfterError } from "inngest"
import type { NodeExecutor, WorkflowContext } from "@/features/executions/types"
import { asString } from "@/features/executions/types"
import { stripeChannel } from "@/inngest/channels/stripe"
import {
  mapCorsairError,
  resolveTenantId,
} from "@/lib/corsair"
import { tryRunIntegration } from "@/features/integrations/runner"
import { isStripeCorsairOp } from "@/features/integrations/adapters/stripe/operations"

type StripeData = {
  operation?: string
  variableName?: string
  nodeId?: string
}

export const stripeExecutor: NodeExecutor<StripeData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
  userId,
  tenantId: tenantIdParam,
}): Promise<WorkflowContext> => {
  await publish(
    stripeChannel().status({
      nodeId,
      status: "loading",
    }),
  )

  // unknown: Node.data JSON boundary
  const config = (data ?? {}) as Record<string, unknown>
  const operation = asString(config.operation, "CUSTOMER_LIST")

  if (Object.keys(config).length === 0) {
    await publish(stripeChannel().status({ nodeId, status: "error" }))
    throw new NonRetriableError(
      "Stripe node not configured. Open settings to configure.",
    )
  }

  if (!isStripeCorsairOp(operation)) {
    await publish(stripeChannel().status({ nodeId, status: "error" }))
    throw new NonRetriableError(
      `Stripe: unsupported operation '${operation}'.`,
    )
  }

  if (!userId) {
    await publish(stripeChannel().status({ nodeId, status: "error" }))
    throw new NonRetriableError("Stripe: missing userId for tenant scope.")
  }

  const tenantId =
    tenantIdParam && tenantIdParam.trim() !== ""
      ? tenantIdParam
      : resolveTenantId({ userId })

  try {
    const corsairResult = await step.run(
      `stripe-${nodeId}-corsair`,
      async () => {
        return tryRunIntegration({
          nodeType: "stripe",
          data: config,
          context,
          nodeId,
          userId,
          tenantId,
        })
      },
    )
    if (corsairResult) {
      await publish(stripeChannel().status({ nodeId, status: "success" }))
      return corsairResult.context
    }
    await publish(stripeChannel().status({ nodeId, status: "error" }))
    throw new NonRetriableError(
      "Stripe Corsair path unavailable. Enable CORSAIR_ENABLED and CORSAIR_PLUGIN_STRIPE.",
    )
  } catch (error) {
    await publish(stripeChannel().status({ nodeId, status: "error" }))
    if (
      error instanceof NonRetriableError ||
      error instanceof RetryAfterError
    ) {
      throw error
    }
    mapCorsairError(error, "Stripe")
  }
}
