/**
 * Gmail Corsair adapter — templates → runGmailOperation → context slice.
 */

import { NonRetriableError } from "inngest"
import type { IntegrationAdapter } from "../../types"
import { t } from "../_shared/resolve-fields"
import {
  runGmailOperation,
  type GmailApiClient,
  type ResolvedGmailFields,
} from "./operations"
import { mapCorsairError } from "@/lib/corsair/errors"

function num(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return fallback
}

export const gmailAdapter: IntegrationAdapter = {
  pluginId: "gmail",
  async run({ data, context, client, userId }) {
    const config = (data ?? {}) as Record<string, unknown>
    const operation = String(config.operation ?? "SEND")
    const variableName = String(config.variableName || "gmail")

    if (!client || typeof client !== "object") {
      throw new NonRetriableError(
        "Gmail Corsair: missing tenant client. Ensure multi-tenant Corsair is configured.",
      )
    }

    const gmailClient = client as GmailApiClient
    if (!gmailClient.gmail?.api) {
      throw new NonRetriableError(
        "Gmail Corsair: client.gmail.api missing. Is @corsair-dev/gmail registered?",
      )
    }

    const fields: ResolvedGmailFields = {
      operation,
      to: t(config.to as string, context),
      subject: t(config.subject as string, context),
      body: t(config.body as string, context),
      cc: t(config.cc as string, context),
      bcc: t(config.bcc as string, context),
      replyTo: t(config.replyTo as string, context),
      messageId: t(config.messageId as string, context),
      threadId: t(config.threadId as string, context),
      searchQuery: t(config.searchQuery as string, context),
      labelIds: t(config.labelIds as string, context),
      pageToken: t(config.pageToken as string, context),
      attachmentData: t(config.attachmentData as string, context),
      attachmentName: t(config.attachmentName as string, context),
      attachmentMime: t(config.attachmentMime as string, context),
      attachmentId: t(config.attachmentId as string, context),
      draftId: t(config.draftId as string, context),
      labelName: t(config.labelName as string, context),
      isHtml: Boolean(config.isHtml),
      includeBody: Boolean(config.includeBody),
      includeHeaders: Boolean(config.includeHeaders),
      maxResults: num(config.maxResults, 10),
      attachmentOutputFormat: String(config.attachmentOutputFormat || "base64"),
      userId,
      workflowId: config.workflowId as string | undefined,
      executionId: (context.__executionId as string) ?? undefined,
    }

    let apiResult: Record<string, unknown>
    try {
      apiResult = await runGmailOperation(gmailClient, fields)
    } catch (err) {
      if (err instanceof NonRetriableError) throw err
      mapCorsairError(err, "Gmail")
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
