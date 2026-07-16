/**
 * Gmail Corsair operations — Nodebase GmailOperation → @corsair-dev/gmail API.
 * Client shape: tenant.gmail.api.messages|labels|drafts|threads
 */

import { NonRetriableError } from "inngest"
import { GmailOperation } from "@/features/executions/enums"
import { uploadFromBase64 } from "@/lib/media-service"
import {
  buildRawMessage,
  escapeHtml,
  extractBodyFromPayload,
  formatMessageSummary,
  headerValue,
} from "./mime"

/** Minimal Corsair Gmail tenant client surface used by this module */
export type GmailApiClient = {
  gmail: {
    api: {
      messages: {
        list: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        get: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        send: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        modify: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        trash: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
      }
      labels: {
        list: (args?: Record<string, unknown>) => Promise<Record<string, unknown>>
        create: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
      }
      drafts: {
        list: (args?: Record<string, unknown>) => Promise<Record<string, unknown>>
        create: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        send: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
      }
      threads: {
        get: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
      }
    }
  }
}

export type ResolvedGmailFields = {
  operation: string
  to: string
  subject: string
  body: string
  cc: string
  bcc: string
  replyTo: string
  messageId: string
  threadId: string
  searchQuery: string
  labelIds: string
  pageToken: string
  attachmentData: string
  attachmentName: string
  attachmentMime: string
  attachmentId: string
  draftId: string
  labelName: string
  isHtml: boolean
  includeBody: boolean
  includeHeaders: boolean
  maxResults: number
  attachmentOutputFormat: string
  userId: string
  workflowId?: string
  executionId?: string
}

function splitLabels(labelIds: string): string[] {
  return labelIds
    .split(",")
    .map((l) => l.trim())
    .filter(Boolean)
}

function asRecord(v: unknown): Record<string, unknown> {
  return (v && typeof v === "object" ? v : {}) as Record<string, unknown>
}

/**
 * Fetch attachment bytes via Gmail REST when Corsair has no dedicated endpoint.
 * Uses access token from OAuth client if present on the bound client (best-effort).
 * Prefer message payload inline data when available.
 */
async function getAttachmentData(
  client: GmailApiClient,
  messageId: string,
  attachmentId: string,
): Promise<{ data: string; size: number }> {
  // First try full message — small attachments may be inline
  const msg = await client.gmail.api.messages.get({
    id: messageId,
    format: "full",
  })
  const payload = asRecord(msg).payload as Record<string, unknown> | undefined

  let found: { data?: string; size?: number; attachmentId?: string } | null =
    null
  function walk(part: Record<string, unknown>) {
    const body = asRecord(part.body)
    if (body.attachmentId === attachmentId) {
      found = {
        data: body.data as string | undefined,
        size: body.size as number | undefined,
        attachmentId: body.attachmentId as string | undefined,
      }
    }
    const parts = part.parts as Array<Record<string, unknown>> | undefined
    if (parts) for (const p of parts) walk(p)
  }
  if (payload) walk(payload)

  if (found?.data) {
    const rawB64 = found.data
    const stdB64 = rawB64.replace(/-/g, "+").replace(/_/g, "/")
    return {
      data: stdB64,
      size: found.size ?? Buffer.from(stdB64, "base64").length,
    }
  }

  // Fall back: Gmail attachments API via raw fetch if client exposes no helper
  // Corsair gmail plugin does not ship attachments.get — use REST with token from env is wrong.
  // Surface clear error for large attachments requiring dedicated download.
  throw new NonRetriableError(
    "Gmail GET_ATTACHMENT: attachment body not inline on message. " +
      "Large attachments require a dedicated attachments API (not yet in @corsair-dev/gmail). " +
      "Use GET_MESSAGE with includeBody or keep legacy path for this op.",
  )
}

export async function runGmailOperation(
  client: GmailApiClient,
  fields: ResolvedGmailFields,
): Promise<Record<string, unknown>> {
  const api = client.gmail.api
  const op = fields.operation

  switch (op) {
    case GmailOperation.SEND:
    case "SEND": {
      if (!fields.to.trim()) {
        throw new NonRetriableError(
          `Gmail: 'To' field resolved to empty string.`,
        )
      }

      let finalAttachmentData = fields.attachmentData
      let finalAttachmentName = fields.attachmentName
      let finalBody = fields.body

      if (fields.attachmentData && fields.attachmentData.length > 500_000) {
        try {
          const uploadResult = await uploadFromBase64(
            fields.attachmentData,
            fields.attachmentMime || "application/octet-stream",
            {
              userId: fields.userId,
              workflowId: fields.workflowId,
              executionId: fields.executionId,
              filename: fields.attachmentName || "attachment",
            },
          )
          const sizeKb = (uploadResult.sizeBytes / 1024).toFixed(0)
          const displayName = fields.attachmentName || "attachment"
          const downloadLink = fields.isHtml
            ? `<p><a href="${uploadResult.publicUrl}" download="${displayName}">📎 Download ${displayName} (${sizeKb}KB)</a></p>`
            : `\n\nDownload ${displayName} (${sizeKb}KB): ${uploadResult.publicUrl}`
          finalBody = finalBody + downloadLink
          finalAttachmentData = ""
          finalAttachmentName = ""
        } catch {
          // keep attachment inline
        }
      }

      const raw = buildRawMessage({
        to: fields.to,
        subject: fields.subject,
        body: finalBody,
        isHtml: fields.isHtml,
        cc: fields.cc || undefined,
        bcc: fields.bcc || undefined,
        replyTo: fields.replyTo || undefined,
        attachmentData: finalAttachmentData || undefined,
        attachmentName: finalAttachmentName || undefined,
        attachmentMime: fields.attachmentMime || undefined,
      })
      const sent = await api.messages.send({ raw })
      return {
        messageId: sent.id,
        threadId: sent.threadId,
        labelIds: sent.labelIds,
        to: fields.to,
        subject: fields.subject,
        sentAt: new Date().toISOString(),
      }
    }

    case GmailOperation.REPLY:
    case "REPLY": {
      if (!fields.messageId.trim()) {
        throw new NonRetriableError(
          "Gmail REPLY: messageId is required. Use {{gmail.messageId}} from GET_MESSAGE or SEARCH.",
        )
      }
      if (!fields.body.trim()) {
        throw new NonRetriableError("Gmail REPLY: reply body is required.")
      }

      const original = await api.messages.get({
        id: fields.messageId,
        format: "metadata",
        metadataHeaders: ["From", "Subject", "Message-ID", "References"],
      })
      const payload = asRecord(original.payload)
      const headers = (payload.headers ?? []) as Array<{
        name: string
        value: string
      }>
      const origFrom = headerValue(headers, "From")
      const origSubject = headerValue(headers, "Subject")
      const origMessageId =
        headerValue(headers, "Message-ID") || fields.messageId
      const origReferences = headerValue(headers, "References")

      const replyRecipient = fields.replyTo.trim() || origFrom
      if (!replyRecipient) {
        throw new NonRetriableError(
          "Gmail REPLY: Could not determine reply recipient from original message.",
        )
      }

      const replySubject =
        fields.subject ||
        (origSubject.toLowerCase().startsWith("re:")
          ? origSubject
          : `Re: ${origSubject}`)
      const refChain = origReferences
        ? `${origReferences} ${origMessageId}`
        : origMessageId

      const raw = buildRawMessage({
        to: replyRecipient,
        subject: replySubject,
        body: fields.body,
        isHtml: fields.isHtml,
        cc: fields.cc || undefined,
        bcc: fields.bcc || undefined,
        inReplyTo: origMessageId,
        references: refChain,
      })
      const sent = await api.messages.send({
        raw,
        threadId:
          (original.threadId as string) || fields.threadId || undefined,
      })
      return {
        messageId: sent.id,
        threadId: sent.threadId,
        labelIds: sent.labelIds,
        to: replyRecipient,
        subject: replySubject,
        repliedTo: fields.messageId,
        sentAt: new Date().toISOString(),
      }
    }

    case GmailOperation.FORWARD:
    case "FORWARD": {
      if (!fields.messageId.trim()) {
        throw new NonRetriableError("Gmail FORWARD: messageId is required.")
      }
      if (!fields.to.trim()) {
        throw new NonRetriableError("Gmail FORWARD: 'To' field is required.")
      }

      const original = await api.messages.get({
        id: fields.messageId,
        format: "full",
      })
      const payload = asRecord(original.payload)
      const headers = (payload.headers ?? []) as Array<{
        name: string
        value: string
      }>
      const origFrom = headerValue(headers, "From")
      const origDate = headerValue(headers, "Date")
      const origSubject = headerValue(headers, "Subject")
      const fwdSubject = fields.subject || `Fwd: ${origSubject}`
      const { text: origText, html: origHtml } =
        extractBodyFromPayload(payload)

      let fwdBody: string
      if (fields.isHtml) {
        const noteHtml = fields.body
          ? `<div>${escapeHtml(fields.body)}</div>`
          : ""
        const contentHtml =
          origHtml || escapeHtml(origText).replace(/\n/g, "<br>")
        fwdBody = `${noteHtml}<div style="border-left:2px solid #ccc;padding-left:12px"><p><b>From:</b> ${escapeHtml(origFrom)}<br><b>Date:</b> ${escapeHtml(origDate)}<br><b>Subject:</b> ${escapeHtml(origSubject)}</p><div>${contentHtml}</div></div>`
      } else {
        const note = fields.body ? `${fields.body}\n\n` : ""
        const origContent = origText || origHtml || ""
        fwdBody = `${note}---------- Forwarded message ----------\nFrom: ${origFrom}\nDate: ${origDate}\nSubject: ${origSubject}\n\n${origContent}`
      }

      const raw = buildRawMessage({
        to: fields.to,
        subject: fwdSubject,
        body: fwdBody,
        isHtml: fields.isHtml,
        cc: fields.cc || undefined,
        bcc: fields.bcc || undefined,
        replyTo: fields.replyTo || undefined,
        attachmentData: fields.attachmentData || undefined,
        attachmentName: fields.attachmentName || undefined,
        attachmentMime: fields.attachmentMime || undefined,
      })
      const sent = await api.messages.send({ raw })
      return {
        messageId: sent.id,
        threadId: sent.threadId,
        forwardedFrom: fields.messageId,
        to: fields.to,
        subject: fwdSubject,
        sentAt: new Date().toISOString(),
      }
    }

    case GmailOperation.GET_MESSAGE:
    case "GET_MESSAGE": {
      if (!fields.messageId.trim()) {
        throw new NonRetriableError("Gmail GET_MESSAGE: messageId is required.")
      }
      let format: "full" | "metadata" | "minimal" = "minimal"
      let metadataHeaders: string[] | undefined
      if (fields.includeBody) {
        format = "full"
      } else if (fields.includeHeaders) {
        format = "metadata"
        metadataHeaders = [
          "From",
          "To",
          "Subject",
          "Date",
          "Message-ID",
          "Reply-To",
          "Cc",
        ]
      }
      const msg = await api.messages.get({
        id: fields.messageId,
        format,
        metadataHeaders,
      })
      return formatMessageSummary(msg, fields.includeBody)
    }

    case GmailOperation.LIST_MESSAGES:
    case "LIST_MESSAGES": {
      const listArgs: Record<string, unknown> = {
        maxResults: fields.maxResults || 10,
      }
      if (fields.labelIds.trim()) {
        listArgs.labelIds = splitLabels(fields.labelIds)
      }
      if (fields.searchQuery.trim()) listArgs.q = fields.searchQuery
      if (fields.pageToken.trim()) listArgs.pageToken = fields.pageToken

      const list = await api.messages.list(listArgs)
      const rawMessages =
        (list.messages as Array<Record<string, unknown>>) ?? []
      const messages = await Promise.all(
        rawMessages.map(async (m) => {
          const full = await api.messages.get({
            id: m.id as string,
            format: fields.includeBody ? "full" : "metadata",
            metadataHeaders: fields.includeBody
              ? undefined
              : ["From", "To", "Subject", "Date"],
          })
          return formatMessageSummary(full, fields.includeBody)
        }),
      )
      return {
        messages,
        resultSizeEstimate: list.resultSizeEstimate,
        nextPageToken: list.nextPageToken ?? null,
        count: messages.length,
      }
    }

    case GmailOperation.SEARCH_MESSAGES:
    case "SEARCH_MESSAGES": {
      if (!fields.searchQuery.trim()) {
        throw new NonRetriableError(
          "Gmail SEARCH_MESSAGES: searchQuery is required.",
        )
      }
      const listArgs: Record<string, unknown> = {
        q: fields.searchQuery,
        maxResults: fields.maxResults || 10,
      }
      if (fields.pageToken.trim()) listArgs.pageToken = fields.pageToken

      const list = await api.messages.list(listArgs)
      const rawMessages =
        (list.messages as Array<Record<string, unknown>>) ?? []
      const messages = await Promise.all(
        rawMessages.map(async (m) => {
          const full = await api.messages.get({
            id: m.id as string,
            format: fields.includeBody ? "full" : "metadata",
            metadataHeaders: fields.includeBody
              ? undefined
              : ["From", "To", "Subject", "Date"],
          })
          return formatMessageSummary(full, fields.includeBody)
        }),
      )
      return {
        messages,
        resultSizeEstimate: list.resultSizeEstimate,
        nextPageToken: list.nextPageToken ?? null,
        query: fields.searchQuery,
        count: messages.length,
      }
    }

    case GmailOperation.ADD_LABEL:
    case "ADD_LABEL": {
      if (!fields.messageId.trim()) {
        throw new NonRetriableError("Gmail ADD_LABEL: messageId is required.")
      }
      if (!fields.labelIds.trim()) {
        throw new NonRetriableError("Gmail ADD_LABEL: labelIds is required.")
      }
      const addIds = splitLabels(fields.labelIds)
      const modified = await api.messages.modify({
        id: fields.messageId,
        addLabelIds: addIds,
      })
      return {
        messageId: modified.id,
        threadId: modified.threadId,
        labelIds: modified.labelIds,
        addedLabels: addIds,
      }
    }

    case GmailOperation.REMOVE_LABEL:
    case "REMOVE_LABEL": {
      if (!fields.messageId.trim()) {
        throw new NonRetriableError(
          "Gmail REMOVE_LABEL: messageId is required.",
        )
      }
      if (!fields.labelIds.trim()) {
        throw new NonRetriableError(
          "Gmail REMOVE_LABEL: labelIds is required.",
        )
      }
      const removeIds = splitLabels(fields.labelIds)
      const modified = await api.messages.modify({
        id: fields.messageId,
        removeLabelIds: removeIds,
      })
      return {
        messageId: modified.id,
        threadId: modified.threadId,
        labelIds: modified.labelIds,
        removedLabels: removeIds,
      }
    }

    case GmailOperation.MARK_READ:
    case "MARK_READ": {
      if (!fields.messageId.trim()) {
        throw new NonRetriableError("Gmail MARK_READ: messageId is required.")
      }
      const modified = await api.messages.modify({
        id: fields.messageId,
        removeLabelIds: ["UNREAD"],
      })
      return {
        messageId: modified.id,
        threadId: modified.threadId,
        labelIds: modified.labelIds,
        markedRead: true,
      }
    }

    case GmailOperation.MARK_UNREAD:
    case "MARK_UNREAD": {
      if (!fields.messageId.trim()) {
        throw new NonRetriableError(
          "Gmail MARK_UNREAD: messageId is required.",
        )
      }
      const modified = await api.messages.modify({
        id: fields.messageId,
        addLabelIds: ["UNREAD"],
      })
      return {
        messageId: modified.id,
        threadId: modified.threadId,
        labelIds: modified.labelIds,
        markedUnread: true,
      }
    }

    case GmailOperation.MOVE_TO_TRASH:
    case "MOVE_TO_TRASH": {
      if (!fields.messageId.trim()) {
        throw new NonRetriableError(
          "Gmail MOVE_TO_TRASH: messageId is required.",
        )
      }
      const trashed = await api.messages.trash({ id: fields.messageId })
      return {
        messageId: trashed.id,
        threadId: trashed.threadId,
        labelIds: trashed.labelIds,
        trashed: true,
      }
    }

    case GmailOperation.CREATE_DRAFT:
    case "CREATE_DRAFT": {
      if (!fields.to.trim()) {
        throw new NonRetriableError(
          "Gmail CREATE_DRAFT: 'To' field is required.",
        )
      }
      const raw = buildRawMessage({
        to: fields.to,
        subject: fields.subject,
        body: fields.body,
        isHtml: fields.isHtml,
        cc: fields.cc || undefined,
        bcc: fields.bcc || undefined,
        replyTo: fields.replyTo || undefined,
        attachmentData: fields.attachmentData || undefined,
        attachmentName: fields.attachmentName || undefined,
        attachmentMime: fields.attachmentMime || undefined,
      })
      const draft = await api.drafts.create({
        draft: {
          message: {
            raw,
            threadId: fields.threadId || undefined,
          },
        },
      })
      const draftMessage = asRecord(draft.message)
      return {
        draftId: draft.id,
        messageId: draftMessage.id,
        threadId: draftMessage.threadId,
        to: fields.to,
        subject: fields.subject,
        createdAt: new Date().toISOString(),
      }
    }

    case GmailOperation.GET_ATTACHMENT:
    case "GET_ATTACHMENT": {
      if (!fields.messageId.trim()) {
        throw new NonRetriableError(
          "Gmail GET_ATTACHMENT: messageId is required.",
        )
      }
      if (!fields.attachmentId.trim()) {
        throw new NonRetriableError(
          "Gmail GET_ATTACHMENT: attachmentId is required.",
        )
      }
      const { data: stdB64, size: attSize } = await getAttachmentData(
        client,
        fields.messageId,
        fields.attachmentId,
      )
      const outputFormat = fields.attachmentOutputFormat || "base64"
      let outputData: string
      if (outputFormat === "text") {
        outputData = Buffer.from(stdB64, "base64").toString("utf-8")
      } else if (outputFormat === "dataUrl") {
        outputData = `data:application/octet-stream;base64,${stdB64}`
      } else {
        outputData = stdB64
      }
      return {
        data: outputData,
        size: attSize,
        sizeKb: Math.round(attSize / 1024),
        attachmentId: fields.attachmentId,
        messageId: fields.messageId,
      }
    }

    case GmailOperation.GET_THREAD:
    case "GET_THREAD": {
      if (!fields.threadId.trim()) {
        throw new NonRetriableError("Gmail GET_THREAD: threadId is required.")
      }
      const thread = await api.threads.get({
        id: fields.threadId,
        format: fields.includeBody ? "full" : "metadata",
      })
      const threadMessages =
        (thread.messages as Array<Record<string, unknown>>) ?? []
      const formattedMessages = threadMessages.map((tmsg) =>
        formatMessageSummary(tmsg, fields.includeBody),
      )
      return {
        threadId: thread.id,
        snippet: thread.snippet,
        messageCount: formattedMessages.length,
        messages: formattedMessages,
        firstMessage: formattedMessages[0] ?? null,
        lastMessage:
          formattedMessages[formattedMessages.length - 1] ?? null,
        conversationText: formattedMessages
          .map(
            (m) =>
              `[${m.date}] ${m.from}:\n${(m.bodyText as string) ?? (m.snippet as string) ?? ""}`,
          )
          .join("\n\n---\n\n"),
      }
    }

    case GmailOperation.LIST_LABELS:
    case "LIST_LABELS": {
      const labelsResp = await api.labels.list({})
      const rawLabels =
        (labelsResp.labels as Array<Record<string, unknown>>) ?? []
      const mappedLabels = rawLabels.map((l) => ({
        id: l.id,
        name: l.name,
        type: l.type,
        messagesTotal: l.messagesTotal,
        messagesUnread: l.messagesUnread,
      }))
      return {
        labels: mappedLabels,
        count: mappedLabels.length,
        userLabels: mappedLabels.filter((l) => l.type === "user"),
        systemLabels: mappedLabels.filter((l) => l.type === "system"),
      }
    }

    case GmailOperation.CREATE_LABEL:
    case "CREATE_LABEL": {
      if (!fields.labelName.trim()) {
        throw new NonRetriableError(
          "Gmail CREATE_LABEL: labelName is required.",
        )
      }
      const newLabel = await api.labels.create({
        label: {
          name: fields.labelName,
          labelListVisibility: "labelShow",
          messageListVisibility: "show",
        },
      })
      return {
        labelId: newLabel.id,
        name: newLabel.name,
        type: newLabel.type,
      }
    }

    case GmailOperation.LIST_DRAFTS:
    case "LIST_DRAFTS": {
      const listArgs: Record<string, unknown> = {
        maxResults: fields.maxResults || 10,
      }
      if (fields.pageToken.trim()) listArgs.pageToken = fields.pageToken
      const draftsResp = await api.drafts.list(listArgs)
      const rawDrafts =
        (draftsResp.drafts as Array<Record<string, unknown>>) ?? []
      const mappedDrafts = rawDrafts.map((d) => {
        const dMsg = asRecord(d.message)
        return {
          draftId: d.id,
          messageId: dMsg.id,
          threadId: dMsg.threadId,
        }
      })
      return {
        drafts: mappedDrafts,
        count: mappedDrafts.length,
        nextPageToken: (draftsResp.nextPageToken as string) ?? null,
      }
    }

    case GmailOperation.SEND_DRAFT:
    case "SEND_DRAFT": {
      if (!fields.draftId.trim()) {
        throw new NonRetriableError("Gmail SEND_DRAFT: draftId is required.")
      }
      const sentDraft = await api.drafts.send({ id: fields.draftId })
      return {
        messageId: sentDraft.id,
        threadId: sentDraft.threadId,
        draftId: fields.draftId,
        sentAt: new Date().toISOString(),
      }
    }

    default:
      throw new NonRetriableError(`Unknown Gmail operation: ${op}`)
  }
}
