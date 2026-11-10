/**
 * HubSpot Corsair adapter.
 */

import { NonRetriableError } from "inngest"
import type { IntegrationAdapter } from "../../types"
import { t, tNumber } from "../_shared/resolve-fields"
import { mapCorsairError } from "@/lib/corsair/errors"
import {
  runHubspotOperation,
  type HubspotApiClient,
  type ResolvedHubspotFields,
} from "./operations"

function num(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

export const hubspotAdapter: IntegrationAdapter = {
  pluginId: "hubspot",
  async run({ data, context, client, userId: _userId }) {
    void _userId
    // unknown: Node.data JSON boundary
    const config = (data ?? {}) as Record<string, unknown>
    const operation = String(config.operation ?? "GET_CONTACT")
    const variableName = String(config.variableName || "hubspot")

    if (!client || typeof client !== "object") {
      throw new NonRetriableError(
        "HubSpot Corsair: missing tenant client.",
      )
    }
    const hs = client as HubspotApiClient
    if (!hs.hubspot?.api) {
      throw new NonRetriableError(
        "HubSpot Corsair: client.hubspot.api missing. Is @corsair-dev/hubspot registered?",
      )
    }

    const fields: ResolvedHubspotFields = {
      operation,
      objectId: t(
        (config.objectId as string) || (config.recordId as string) || "",
        context,
      ),
      contactId: t(config.contactId as string, context),
      companyId: t(config.companyId as string, context),
      dealId: t(config.dealId as string, context),
      ticketId: t(config.ticketId as string, context),
      engagementId: t(config.engagementId as string, context),
      listId: t(config.listId as string, context),
      email: t(config.email as string, context),
      firstName: t(config.firstName as string, context),
      lastName: t(config.lastName as string, context),
      phone: t(config.phone as string, context),
      companyName: t(
        (config.companyName as string) || (config.company as string) || "",
        context,
      ),
      domain: t(config.domain as string, context),
      dealName: t(config.dealName as string, context),
      amount: t(
        (config.amount as string) || (config.dealAmount as string) || "",
        context,
      ),
      dealStage: t(config.dealStage as string, context),
      pipeline: t(
        (config.pipeline as string) || (config.dealPipeline as string) || "",
        context,
      ),
      ticketSubject: t(
        (config.ticketSubject as string) || (config.subject as string) || "",
        context,
      ),
      ticketContent: t(
        (config.ticketContent as string) ||
          (config.ticketDescription as string) ||
          "",
        context,
      ),
      ticketPriority: t(config.ticketPriority as string, context),
      noteBody: t(config.noteBody as string, context),
      taskSubject: t(config.taskSubject as string, context),
      callBody: t(config.callBody as string, context),
      propertiesJson: t(
        (config.propertiesJson as string) ||
          (config.properties as string) ||
          "{}",
        context,
      ),
      searchQuery: t(
        (config.searchQuery as string) || (config.query as string) || "",
        context,
      ),
      engagementType: t(config.engagementType as string, context),
      limit:
        tNumber(config.limit as string | number | undefined, context) ??
        num(config.limit, 100),
      after: t(config.after as string, context),
    }

    let apiResult: Record<string, unknown>
    try {
      apiResult = await runHubspotOperation(hs, fields)
    } catch (err) {
      if (err instanceof NonRetriableError) throw err
      mapCorsairError(err, "HubSpot")
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
