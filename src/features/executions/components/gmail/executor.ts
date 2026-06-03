import { NonRetriableError, RetryAfterError } from "inngest"
import type { NodeExecutor } from "@/features/executions/types"
import prisma from "@/lib/db"
import { resolveTemplate } from "@/features/executions/lib/template-resolver"
import { gmailChannel } from "@/inngest/channels/gmail"
import { GmailOperation } from "@/generated/prisma"
import { refreshGmailAccessToken } from "@/lib/gmail-auth"
import { uploadFromBase64 } from "@/lib/media-service"

/* ── Types ── */

type GmailData = { nodeId?: string }

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me"

/* ── Helper 1: Token refresh (shared) ── */

const getAccessToken = refreshGmailAccessToken

/* ── Helper 2: Gmail API request ── */

async function gmailRequest(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  accessToken: string,
  body?: unknown
): Promise<Record<string, unknown>> {
  const url = path.startsWith("http") ? path : `${GMAIL_API}${path}`
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as Record<string, Record<string, string>>
    const errMsg = err?.error?.message ?? `${response.status} ${response.statusText}`

    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After") ?? "60"
      throw new RetryAfterError("Gmail API rate limit exceeded", `${retryAfter}s`)
    }
    if (response.status >= 500) {
      throw new RetryAfterError(`Gmail server error ${response.status}`, "60s")
    }
    if (response.status === 401) {
      throw new NonRetriableError("Gmail: Authorization expired. Reconnect credential.")
    }
    if (response.status === 403) {
      const msg = errMsg ?? ""
      if (msg.includes("insufficientPermissions")) {
        throw new NonRetriableError("Gmail: Insufficient permissions. Reconnect and approve all scopes.")
      }
      if (msg.includes("quotaExceeded")) {
        throw new RetryAfterError("Gmail: Daily quota exceeded.", "3600s")
      }
    }
    throw new NonRetriableError(`Gmail API error ${response.status}: ${errMsg}`)
  }

  const text = await response.text()
  if (!text) return {}
  return JSON.parse(text) as Record<string, unknown>
}

/* ── Helper: Extract body from payload (recursive MIME walk) ── */

function extractBodyFromPayload(
  payload: Record<string, unknown> | undefined,
  preferHtml = false
): { text: string; html: string } {
  let text = ""
  let html = ""

  function walk(part: Record<string, unknown>) {
    const mime = part.mimeType as string | undefined
    const bodyData = (part.body as Record<string, unknown>)?.data as string | undefined

    if (mime === "text/plain" && !text && bodyData) {
      text = Buffer.from(bodyData, "base64url").toString("utf-8")
    }
    if (mime === "text/html" && !html && bodyData) {
      html = Buffer.from(bodyData, "base64url").toString("utf-8")
    }

    const subParts = part.parts as Array<Record<string, unknown>> | undefined
    if (subParts) {
      for (const sub of subParts) walk(sub)
    }
  }

  if (payload) {
    walk(payload)
  }

  return { text, html }
}

/* ── Helper: Escape HTML special characters ── */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/* ── Helper: Count attachments recursively ── */

function countAttachments(payload: Record<string, unknown> | undefined): number {
  let count = 0
  function walk(part: Record<string, unknown>) {
    if ((part.body as Record<string, unknown>)?.attachmentId) count++
    const subParts = part.parts as Array<Record<string, unknown>> | undefined
    if (subParts) {
      for (const sub of subParts) walk(sub)
    }
  }
  if (payload) walk(payload)
  return count
}

/* ── Helper 3: Fetch message metadata ── */

async function fetchMessageMetadata(
  messageId: string,
  accessToken: string,
  includeBody: boolean
): Promise<Record<string, unknown>> {
  const format = includeBody ? "full" : "metadata"
  const msg = await gmailRequest(
    "GET",
    `/messages/${messageId}?format=${format}`,
    accessToken
  )

  const payload = msg.payload as Record<string, unknown> | undefined
  const headers = (payload?.headers ?? []) as Array<{ name: string; value: string }>

  const hdr = (name: string) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? ""

  // Extract body using shared helper
  const { text: bodyText } = includeBody
    ? extractBodyFromPayload(payload)
    : { text: "" }

  const attachmentCount = countAttachments(payload)

  return {
    messageId: msg.id,
    threadId: msg.threadId,
    labelIds: msg.labelIds,
    snippet: msg.snippet,
    from: hdr("From"),
    to: hdr("To"),
    subject: hdr("Subject"),
    date: hdr("Date"),
    isUnread: ((msg.labelIds as string[]) ?? []).includes("UNREAD"),
    isStarred: ((msg.labelIds as string[]) ?? []).includes("STARRED"),
    attachmentCount,
    ...(includeBody ? { bodyText } : {}),
  }
}

/* ── Helper 4: Build RFC 2822 message ── */

function buildRawMessage(opts: {
  to: string
  subject: string
  body: string
  isHtml: boolean
  from?: string
  cc?: string
  bcc?: string
  replyTo?: string
  inReplyTo?: string
  references?: string
  threadId?: string
  attachmentData?: string
  attachmentName?: string
  attachmentMime?: string
}): string {
  const hasAttachment = !!opts.attachmentData

  const boundary = `nodebase_${Date.now()}`
  const lines: string[] = []

  lines.push(`To: ${opts.to}`)
  lines.push(`Subject: ${opts.subject}`)
  if (opts.from) lines.push(`From: ${opts.from}`)
  if (opts.cc) lines.push(`Cc: ${opts.cc}`)
  if (opts.bcc) lines.push(`Bcc: ${opts.bcc}`)
  if (opts.replyTo) lines.push(`Reply-To: ${opts.replyTo}`)
  if (opts.inReplyTo) lines.push(`In-Reply-To: ${opts.inReplyTo}`)
  if (opts.references) lines.push(`References: ${opts.references}`)
  lines.push("MIME-Version: 1.0")

  if (hasAttachment) {
    lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`)
    lines.push("")
    lines.push(`--${boundary}`)
    lines.push(
      opts.isHtml
        ? "Content-Type: text/html; charset=UTF-8"
        : "Content-Type: text/plain; charset=UTF-8"
    )
    lines.push("")
    lines.push(opts.body)
    lines.push(`--${boundary}`)
    lines.push(
      `Content-Type: ${opts.attachmentMime ?? "application/octet-stream"}; name="${opts.attachmentName ?? "attachment"}"`
    )
    lines.push("Content-Transfer-Encoding: base64")
    lines.push(
      `Content-Disposition: attachment; filename="${opts.attachmentName ?? "attachment"}"`
    )
    lines.push("")
    const wrappedAttachment = opts.attachmentData?.match(/.{1,76}/g)?.join("\r\n") || ""
    lines.push(wrappedAttachment)
    lines.push(`--${boundary}--`)
  } else {
    lines.push(
      opts.isHtml
        ? "Content-Type: text/html; charset=UTF-8"
        : "Content-Type: text/plain; charset=UTF-8"
    )
    lines.push("")
    lines.push(opts.body)
  }

  const raw = lines.join("\r\n")
  return Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

/* ── Executor ── */

export const gmailExecutor: NodeExecutor<GmailData> = async ({
  nodeId,
  context,
  step,
  publish,
  userId,
}) => {
  await publish(gmailChannel().status({ nodeId, status: "loading" }))

  // Step 1: Load config
  const config = await step.run(`gmail-${nodeId}-load-config`, async () => {
    return prisma.gmailNode.findUnique({ where: { nodeId } })
  })

  if (!config) {
    await publish(gmailChannel().status({ nodeId, status: "error" }))
    throw new NonRetriableError(
      "Gmail node not configured. Open settings to configure."
    )
  }

  // Step 2: Get tokens
  const tokenResult = await step.run(
    `gmail-${nodeId}-get-tokens`,
    async () => {
      if (!config.credentialId) {
        throw new NonRetriableError(
          "Gmail: No credential selected in node config."
        )
      }
      return getAccessToken(config.credentialId, userId)
    }
  )

  const accessToken = tokenResult.token

  // Step 3: Execute operation
  let result: Record<string, unknown>
  try {
    result = await step.run(`gmail-${nodeId}-execute`, async () => {
      // Resolve all template fields
      const to = resolveTemplate(config.to, context)
      const subject = resolveTemplate(config.subject, context)
      const body = resolveTemplate(config.body, context)
      const cc = resolveTemplate(config.cc, context)
      const bcc = resolveTemplate(config.bcc, context)
      const replyTo = resolveTemplate(config.replyTo, context)
      const messageId = resolveTemplate(config.messageId, context)
      const threadId = resolveTemplate(config.threadId, context)
      const searchQuery = resolveTemplate(config.searchQuery, context)
      const labelIds = resolveTemplate(config.labelIds, context)
      const pageToken = resolveTemplate(config.pageToken, context)
      const attachmentData = resolveTemplate(config.attachmentData, context)
      const attachmentName = resolveTemplate(config.attachmentName, context)
      const attachmentMime = resolveTemplate(config.attachmentMime, context)

      let apiResult: Record<string, unknown> = {}

      switch (config.operation) {
        /* ── SEND ── */
        case GmailOperation.SEND: {
          if (!to.trim()) {
            throw new NonRetriableError(
              `Gmail: 'To' field resolved to empty string. Template: "${config.to}"`
            )
          }

          // Large attachment handling: offload to DigitalOcean Spaces to avoid DB bloat
          let finalAttachmentData = attachmentData
          let finalAttachmentName = attachmentName
          let finalBody = body
          if (attachmentData && attachmentData.length > 500_000) {
            try {
              const uploadResult = await uploadFromBase64(
                attachmentData,
                config.attachmentMime || "application/octet-stream",
                {
                  userId,
                  workflowId: config.workflowId,
                  executionId: (context.__executionId as string) ?? undefined,
                  filename: attachmentName || "attachment",
                }
              )
              const sizeKb = (uploadResult.sizeBytes / 1024).toFixed(0)
              const displayName = attachmentName || "attachment"
              const downloadLink = config.isHtml
                ? `<p><a href="${uploadResult.url}" download="${displayName}">` +
                  `\uD83D\uDCCE Download ${displayName} (${sizeKb}KB)</a></p>`
                : `\n\nDownload ${displayName} (${sizeKb}KB): ${uploadResult.url}`
              finalBody = finalBody + downloadLink
              finalAttachmentData = "" // clear attachment from email
              finalAttachmentName = ""
            } catch {
              // Failed to upload — send as attachment anyway (best effort)
            }
          }

          const raw = buildRawMessage({
            to,
            subject,
            body: finalBody,
            isHtml: config.isHtml,
            cc,
            bcc,
            replyTo,
            attachmentData: finalAttachmentData,
            attachmentName: finalAttachmentName,
            attachmentMime,
          })
          const sent = await gmailRequest("POST", "/messages/send", accessToken, {
            raw,
          })
          apiResult = {
            messageId: sent.id,
            threadId: sent.threadId,
            labelIds: sent.labelIds,
            to,
            subject,
            sentAt: new Date().toISOString(),
          }
          break
        }

        /* ── REPLY ── */
        case GmailOperation.REPLY: {
          if (!messageId.trim()) {
            throw new NonRetriableError(
              "Gmail REPLY: messageId is required. " +
              "Use {{gmail.messageId}} from a GET_MESSAGE or SEARCH_MESSAGES operation."
            )
          }
          if (!body.trim()) {
            throw new NonRetriableError(
              "Gmail REPLY: reply body is required."
            )
          }

          // Fetch original message to get threading headers + sender
          const original = await gmailRequest(
            "GET",
            `/messages/${messageId}?format=metadata` +
            `&metadataHeaders=From&metadataHeaders=Subject` +
            `&metadataHeaders=Message-ID&metadataHeaders=References`,
            accessToken
          )
          const origPayload = original.payload as Record<string, unknown> | undefined
          const origHeaders = origPayload?.headers as
            | Array<{ name: string; value: string }>
            | undefined
          const origFrom =
            origHeaders?.find((h) => h.name.toLowerCase() === "from")?.value ?? ""
          const origSubject =
            origHeaders?.find((h) => h.name.toLowerCase() === "subject")?.value ?? ""
          const origMessageId =
            origHeaders?.find((h) => h.name.toLowerCase() === "message-id")?.value ?? messageId
          const origReferences =
            origHeaders?.find((h) => h.name.toLowerCase() === "references")?.value ?? ""

          // Determine reply recipient: explicit replyTo override → original From
          const replyRecipient = replyTo.trim() || origFrom
          if (!replyRecipient) {
            throw new NonRetriableError(
              "Gmail REPLY: Could not determine reply recipient from original message."
            )
          }

          const replySubject = subject || (origSubject.toLowerCase().startsWith("re:") ? origSubject : `Re: ${origSubject}`)
          const refChain = origReferences ? `${origReferences} ${origMessageId}` : origMessageId

          const raw = buildRawMessage({
            to: replyRecipient,
            subject: replySubject,
            body,
            isHtml: config.isHtml,
            cc,
            bcc,
            inReplyTo: origMessageId,
            references: refChain,
          })
          const replyPayload: Record<string, unknown> = {
            raw,
            threadId: (original.threadId as string) || threadId || undefined,
          }
          const sent = await gmailRequest(
            "POST",
            "/messages/send",
            accessToken,
            replyPayload
          )
          apiResult = {
            messageId: sent.id,
            threadId: sent.threadId,
            labelIds: sent.labelIds,
            to: replyRecipient,
            subject: replySubject,
            repliedTo: messageId,
            sentAt: new Date().toISOString(),
          }
          break
        }

        /* ── FORWARD ── */
        case GmailOperation.FORWARD: {
          if (!messageId.trim()) {
            throw new NonRetriableError(
              "Gmail FORWARD: messageId is required."
            )
          }
          if (!to.trim()) {
            throw new NonRetriableError(
              "Gmail FORWARD: 'To' field is required."
            )
          }
          // Fetch original message
          const original = await gmailRequest(
            "GET",
            `/messages/${messageId}?format=full`,
            accessToken
          )
          const payload = original.payload as Record<string, unknown> | undefined
          const msgHeaders = payload?.headers as
            | Array<{ name: string; value: string }>
            | undefined
          const origFrom =
            msgHeaders?.find((h) => h.name.toLowerCase() === "from")?.value ?? ""
          const origDate =
            msgHeaders?.find((h) => h.name.toLowerCase() === "date")?.value ?? ""
          const origSubject =
            msgHeaders?.find((h) => h.name.toLowerCase() === "subject")?.value ??
            ""
          const fwdSubject = subject || `Fwd: ${origSubject}`

          // Extract full body from original message
          const { text: origText, html: origHtml } = extractBodyFromPayload(payload)

          let fwdBody: string
          if (config.isHtml) {
            const noteHtml = body ? `<div>${escapeHtml(body)}</div>` : ""
            const contentHtml = origHtml || escapeHtml(origText).replace(/\n/g, "<br>")
            fwdBody = `${noteHtml}<div style="border-left:2px solid #ccc;padding-left:12px"><p><b>From:</b> ${escapeHtml(origFrom)}<br><b>Date:</b> ${escapeHtml(origDate)}<br><b>Subject:</b> ${escapeHtml(origSubject)}</p><div>${contentHtml}</div></div>`
          } else {
            const note = body ? `${body}\n\n` : ""
            const origContent = origText || origHtml || ""
            fwdBody = `${note}---------- Forwarded message ----------\nFrom: ${origFrom}\nDate: ${origDate}\nSubject: ${origSubject}\n\n${origContent}`
          }

          const raw = buildRawMessage({
            to,
            subject: fwdSubject,
            body: fwdBody,
            isHtml: config.isHtml,
            cc,
            bcc,
            replyTo,
            attachmentData,
            attachmentName,
            attachmentMime,
          })
          const sent = await gmailRequest("POST", "/messages/send", accessToken, {
            raw,
          })
          apiResult = {
            messageId: sent.id,
            threadId: sent.threadId,
            forwardedFrom: messageId,
            to,
            subject: fwdSubject,
            sentAt: new Date().toISOString(),
          }
          break
        }

        /* ── GET_MESSAGE ── */
        case GmailOperation.GET_MESSAGE: {
          if (!messageId.trim()) {
            throw new NonRetriableError(
              "Gmail GET_MESSAGE: messageId is required."
            )
          }

          let url: string
          if (config.includeBody) {
            url = `/messages/${messageId}?format=full`
          } else if (config.includeHeaders) {
            const metaHeaders = ["From", "To", "Subject", "Date", "Message-ID", "Reply-To", "Cc"]
            const params = new URLSearchParams({ format: "metadata" })
            for (const h of metaHeaders) params.append("metadataHeaders", h)
            url = `/messages/${messageId}?${params.toString()}`
          } else {
            url = `/messages/${messageId}?format=minimal`
          }

          const msg = await gmailRequest("GET", url, accessToken)
          const getMsgPayload = msg.payload as Record<string, unknown> | undefined
          const getMsgHeaders = (getMsgPayload?.headers ?? []) as Array<{ name: string; value: string }>
          const getMsgHdr = (name: string) =>
            getMsgHeaders.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? ""

          const { text: getMsgBodyText } = config.includeBody
            ? extractBodyFromPayload(getMsgPayload)
            : { text: "" }

          const getMsgAttachmentCount = countAttachments(getMsgPayload)

          apiResult = {
            messageId: msg.id,
            threadId: msg.threadId,
            labelIds: msg.labelIds,
            snippet: msg.snippet,
            from: getMsgHdr("From"),
            to: getMsgHdr("To"),
            subject: getMsgHdr("Subject"),
            date: getMsgHdr("Date"),
            isUnread: ((msg.labelIds as string[]) ?? []).includes("UNREAD"),
            isStarred: ((msg.labelIds as string[]) ?? []).includes("STARRED"),
            attachmentCount: getMsgAttachmentCount,
            ...(config.includeBody ? { bodyText: getMsgBodyText } : {}),
          }
          break
        }

        /* ── LIST_MESSAGES ── */
        case GmailOperation.LIST_MESSAGES: {
          const params = new URLSearchParams({
            maxResults: String(config.maxResults),
          })
          if (labelIds.trim()) {
            for (const label of labelIds.split(",")) {
              if (label.trim()) params.append("labelIds", label.trim())
            }
          }
          if (searchQuery.trim()) params.set("q", searchQuery)
          if (pageToken.trim()) params.set("pageToken", pageToken)

          const list = await gmailRequest(
            "GET",
            `/messages?${params.toString()}`,
            accessToken
          )
          const rawMessages = (list.messages as Array<Record<string, unknown>>) ?? []

          // Fetch metadata for each message
          const messages = await Promise.all(
            rawMessages.map((m) =>
              fetchMessageMetadata(m.id as string, accessToken, config.includeBody)
            )
          )

          apiResult = {
            messages,
            resultSizeEstimate: list.resultSizeEstimate,
            nextPageToken: list.nextPageToken ?? null,
            count: messages.length,
          }
          break
        }

        /* ── SEARCH_MESSAGES ── */
        case GmailOperation.SEARCH_MESSAGES: {
          if (!searchQuery.trim()) {
            throw new NonRetriableError(
              "Gmail SEARCH_MESSAGES: searchQuery is required."
            )
          }
          const params = new URLSearchParams({
            q: searchQuery,
            maxResults: String(config.maxResults),
          })
          if (pageToken.trim()) params.set("pageToken", pageToken)

          const list = await gmailRequest(
            "GET",
            `/messages?${params.toString()}`,
            accessToken
          )
          const rawMessages = (list.messages as Array<Record<string, unknown>>) ?? []

          // Fetch metadata for each message
          const messages = await Promise.all(
            rawMessages.map((m) =>
              fetchMessageMetadata(m.id as string, accessToken, config.includeBody)
            )
          )

          apiResult = {
            messages,
            resultSizeEstimate: list.resultSizeEstimate,
            nextPageToken: list.nextPageToken ?? null,
            query: searchQuery,
            count: messages.length,
          }
          break
        }

        /* ── ADD_LABEL ── */
        case GmailOperation.ADD_LABEL: {
          if (!messageId.trim()) {
            throw new NonRetriableError(
              "Gmail ADD_LABEL: messageId is required."
            )
          }
          if (!labelIds.trim()) {
            throw new NonRetriableError(
              "Gmail ADD_LABEL: labelIds is required."
            )
          }
          const addIds = labelIds
            .split(",")
            .map((label) => label.trim())
            .filter(Boolean)
          const modified = await gmailRequest(
            "POST",
            `/messages/${messageId}/modify`,
            accessToken,
            { addLabelIds: addIds }
          )
          apiResult = {
            messageId: modified.id,
            threadId: modified.threadId,
            labelIds: modified.labelIds,
            addedLabels: addIds,
          }
          break
        }

        /* ── REMOVE_LABEL ── */
        case GmailOperation.REMOVE_LABEL: {
          if (!messageId.trim()) {
            throw new NonRetriableError(
              "Gmail REMOVE_LABEL: messageId is required."
            )
          }
          if (!labelIds.trim()) {
            throw new NonRetriableError(
              "Gmail REMOVE_LABEL: labelIds is required."
            )
          }
          const removeIds = labelIds
            .split(",")
            .map((label) => label.trim())
            .filter(Boolean)
          const modified = await gmailRequest(
            "POST",
            `/messages/${messageId}/modify`,
            accessToken,
            { removeLabelIds: removeIds }
          )
          apiResult = {
            messageId: modified.id,
            threadId: modified.threadId,
            labelIds: modified.labelIds,
            removedLabels: removeIds,
          }
          break
        }

        /* ── MARK_READ ── */
        case GmailOperation.MARK_READ: {
          if (!messageId.trim()) {
            throw new NonRetriableError(
              "Gmail MARK_READ: messageId is required."
            )
          }
          const modified = await gmailRequest(
            "POST",
            `/messages/${messageId}/modify`,
            accessToken,
            { removeLabelIds: ["UNREAD"] }
          )
          apiResult = {
            messageId: modified.id,
            threadId: modified.threadId,
            labelIds: modified.labelIds,
            markedRead: true,
          }
          break
        }

        /* ── MARK_UNREAD ── */
        case GmailOperation.MARK_UNREAD: {
          if (!messageId.trim()) {
            throw new NonRetriableError(
              "Gmail MARK_UNREAD: messageId is required."
            )
          }
          const modified = await gmailRequest(
            "POST",
            `/messages/${messageId}/modify`,
            accessToken,
            { addLabelIds: ["UNREAD"] }
          )
          apiResult = {
            messageId: modified.id,
            threadId: modified.threadId,
            labelIds: modified.labelIds,
            markedUnread: true,
          }
          break
        }

        /* ── MOVE_TO_TRASH ── */
        case GmailOperation.MOVE_TO_TRASH: {
          if (!messageId.trim()) {
            throw new NonRetriableError(
              "Gmail MOVE_TO_TRASH: messageId is required."
            )
          }
          const trashed = await gmailRequest(
            "POST",
            `/messages/${messageId}/trash`,
            accessToken
          )
          apiResult = {
            messageId: trashed.id,
            threadId: trashed.threadId,
            labelIds: trashed.labelIds,
            trashed: true,
          }
          break
        }

        /* ── CREATE_DRAFT ── */
        case GmailOperation.CREATE_DRAFT: {
          if (!to.trim()) {
            throw new NonRetriableError(
              "Gmail CREATE_DRAFT: 'To' field is required."
            )
          }
          const raw = buildRawMessage({
            to,
            subject,
            body,
            isHtml: config.isHtml,
            cc,
            bcc,
            replyTo,
            attachmentData,
            attachmentName,
            attachmentMime,
          })
          const draftPayload: Record<string, unknown> = {
            message: { raw, threadId: threadId || undefined },
          }
          const draft = await gmailRequest(
            "POST",
            "/drafts",
            accessToken,
            draftPayload
          )
          const draftMessage = draft.message as Record<string, unknown> | undefined
          apiResult = {
            draftId: draft.id,
            messageId: draftMessage?.id,
            threadId: draftMessage?.threadId,
            to,
            subject,
            createdAt: new Date().toISOString(),
          }
          break
        }

        /* ── GET_ATTACHMENT ── */
        case GmailOperation.GET_ATTACHMENT: {
          const attMsgId = resolveTemplate(config.messageId, context)
          const attId = resolveTemplate(config.attachmentId, context)
          if (!attMsgId.trim()) {
            throw new NonRetriableError("Gmail GET_ATTACHMENT: messageId is required.")
          }
          if (!attId.trim()) {
            throw new NonRetriableError("Gmail GET_ATTACHMENT: attachmentId is required.")
          }
          const attResp = await gmailRequest(
            "GET",
            `/messages/${attMsgId}/attachments/${attId}`,
            accessToken
          )
          const rawB64 = (attResp.data as string) ?? ""
          const attSize = (attResp.size as number) ?? 0
          // Normalize base64url → standard base64
          const stdB64 = rawB64.replace(/-/g, "+").replace(/_/g, "/")
          const outputFormat = config.attachmentOutputFormat || "base64"
          let outputData: string
          if (outputFormat === "text") {
            outputData = Buffer.from(stdB64, "base64").toString("utf-8")
          } else if (outputFormat === "dataUrl") {
            outputData = `data:application/octet-stream;base64,${stdB64}`
          } else {
            outputData = stdB64
          }
          apiResult = {
            data: outputData,
            size: attSize,
            sizeKb: Math.round(attSize / 1024),
            attachmentId: attId,
            messageId: attMsgId,
          }
          break
        }

        /* ── GET_THREAD ── */
        case GmailOperation.GET_THREAD: {
          if (!threadId.trim()) {
            throw new NonRetriableError("Gmail GET_THREAD: threadId is required.")
          }
          const threadFormat = config.includeBody ? "full" : "metadata"
          const thread = await gmailRequest(
            "GET",
            `/threads/${threadId}?format=${threadFormat}`,
            accessToken
          )
          const threadMessages = (thread.messages as Array<Record<string, unknown>>) ?? []
          const formattedMessages = threadMessages.map((tmsg) => {
            const tPayload = tmsg.payload as Record<string, unknown> | undefined
            const tHeaders = (tPayload?.headers ?? []) as Array<{ name: string; value: string }>
            const tHdr = (name: string) =>
              tHeaders.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? ""
            const { text: tBodyText } = config.includeBody
              ? extractBodyFromPayload(tPayload)
              : { text: "" }
            return {
              messageId: tmsg.id,
              threadId: tmsg.threadId,
              from: tHdr("From"),
              to: tHdr("To"),
              subject: tHdr("Subject"),
              date: tHdr("Date"),
              snippet: tmsg.snippet,
              isUnread: ((tmsg.labelIds as string[]) ?? []).includes("UNREAD"),
              ...(config.includeBody ? { bodyText: tBodyText } : {}),
            }
          })
          apiResult = {
            threadId: thread.id,
            snippet: thread.snippet,
            messageCount: formattedMessages.length,
            messages: formattedMessages,
            firstMessage: formattedMessages[0] ?? null,
            lastMessage: formattedMessages[formattedMessages.length - 1] ?? null,
            conversationText: formattedMessages
              .map((m) => `[${m.date}] ${m.from}:\n${m.bodyText ?? m.snippet ?? ""}`)
              .join("\n\n---\n\n"),
          }
          break
        }

        /* ── LIST_LABELS ── */
        case GmailOperation.LIST_LABELS: {
          const labelsResp = await gmailRequest("GET", "/labels", accessToken)
          const rawLabels = (labelsResp.labels as Array<Record<string, unknown>>) ?? []
          const mappedLabels = rawLabels.map((l) => ({
            id: l.id,
            name: l.name,
            type: l.type,
            messagesTotal: l.messagesTotal,
            messagesUnread: l.messagesUnread,
          }))
          apiResult = {
            labels: mappedLabels,
            count: mappedLabels.length,
            userLabels: mappedLabels.filter((l) => l.type === "user"),
            systemLabels: mappedLabels.filter((l) => l.type === "system"),
          }
          break
        }

        /* ── CREATE_LABEL ── */
        case GmailOperation.CREATE_LABEL: {
          const labelName = resolveTemplate(config.labelName, context)
          if (!labelName.trim()) {
            throw new NonRetriableError("Gmail CREATE_LABEL: labelName is required.")
          }
          const newLabel = await gmailRequest("POST", "/labels", accessToken, {
            name: labelName,
            labelListVisibility: "labelShow",
            messageListVisibility: "show",
          })
          apiResult = {
            labelId: newLabel.id,
            name: newLabel.name,
            type: newLabel.type,
          }
          break
        }

        /* ── LIST_DRAFTS ── */
        case GmailOperation.LIST_DRAFTS: {
          const draftParams = new URLSearchParams({
            maxResults: String(config.maxResults),
          })
          if (pageToken.trim()) draftParams.set("pageToken", pageToken)
          const draftsResp = await gmailRequest(
            "GET",
            `/drafts?${draftParams.toString()}`,
            accessToken
          )
          const rawDrafts = (draftsResp.drafts as Array<Record<string, unknown>>) ?? []
          const mappedDrafts = rawDrafts.map((d) => {
            const dMsg = d.message as Record<string, unknown> | undefined
            return {
              draftId: d.id,
              messageId: dMsg?.id,
              threadId: dMsg?.threadId,
            }
          })
          apiResult = {
            drafts: mappedDrafts,
            count: mappedDrafts.length,
            nextPageToken: (draftsResp.nextPageToken as string) ?? null,
          }
          break
        }

        /* ── SEND_DRAFT ── */
        case GmailOperation.SEND_DRAFT: {
          const sendDraftId = resolveTemplate(config.draftId, context)
          if (!sendDraftId.trim()) {
            throw new NonRetriableError("Gmail SEND_DRAFT: draftId is required.")
          }
          const sentDraft = await gmailRequest(
            "POST",
            "/drafts/send",
            accessToken,
            { id: sendDraftId }
          )
          apiResult = {
            messageId: sentDraft.id,
            threadId: sentDraft.threadId,
            draftId: sendDraftId,
            sentAt: new Date().toISOString(),
          }
          break
        }

        default:
          throw new NonRetriableError(
            `Unknown Gmail operation: ${config.operation}`
          )
      }

      return {
        ...context,
        [config.variableName || "gmail"]: {
          operation: config.operation,
          ...apiResult,
          timestamp: new Date().toISOString(),
        },
      }
    })
  } catch (error) {
    await publish(gmailChannel().status({ nodeId, status: "error" }))
    throw error
  }

  await publish(gmailChannel().status({ nodeId, status: "success" }))
  return result as Record<string, unknown>
}
