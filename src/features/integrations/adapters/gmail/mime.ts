/**
 * Gmail MIME helpers shared by Corsair adapter (ported from legacy executor).
 */

export function extractBodyFromPayload(
  payload: Record<string, unknown> | undefined,
  preferHtml = false,
): { text: string; html: string } {
  let text = ""
  let html = ""

  function walk(part: Record<string, unknown>) {
    const mime = part.mimeType as string | undefined
    const bodyData = (part.body as Record<string, unknown>)?.data as
      | string
      | undefined

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

  if (payload) walk(payload)

  if (preferHtml && html) return { text, html }
  return { text, html }
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function countAttachments(
  payload: Record<string, unknown> | undefined,
): number {
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

export function headerValue(
  headers: Array<{ name?: string; value?: string }> | undefined,
  name: string,
): string {
  if (!headers) return ""
  return (
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ??
    ""
  )
}

export function buildRawMessage(opts: {
  to: string
  subject: string
  body: string
  isHtml?: boolean
  from?: string
  cc?: string
  bcc?: string
  replyTo?: string
  inReplyTo?: string
  references?: string
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
        : "Content-Type: text/plain; charset=UTF-8",
    )
    lines.push("")
    lines.push(opts.body)
    lines.push(`--${boundary}`)
    lines.push(
      `Content-Type: ${opts.attachmentMime ?? "application/octet-stream"}; name="${opts.attachmentName ?? "attachment"}"`,
    )
    lines.push("Content-Transfer-Encoding: base64")
    lines.push(
      `Content-Disposition: attachment; filename="${opts.attachmentName ?? "attachment"}"`,
    )
    lines.push("")
    const wrappedAttachment =
      opts.attachmentData?.match(/.{1,76}/g)?.join("\r\n") || ""
    lines.push(wrappedAttachment)
    lines.push(`--${boundary}--`)
  } else {
    lines.push(
      opts.isHtml
        ? "Content-Type: text/html; charset=UTF-8"
        : "Content-Type: text/plain; charset=UTF-8",
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

export function formatMessageSummary(
  msg: Record<string, unknown>,
  includeBody: boolean,
): Record<string, unknown> {
  const payload = msg.payload as Record<string, unknown> | undefined
  const headers = (payload?.headers ?? []) as Array<{
    name: string
    value: string
  }>
  const { text: bodyText } = includeBody
    ? extractBodyFromPayload(payload)
    : { text: "" }

  return {
    messageId: msg.id,
    threadId: msg.threadId,
    labelIds: msg.labelIds,
    snippet: msg.snippet,
    from: headerValue(headers, "From"),
    to: headerValue(headers, "To"),
    subject: headerValue(headers, "Subject"),
    date: headerValue(headers, "Date"),
    isUnread: ((msg.labelIds as string[]) ?? []).includes("UNREAD"),
    isStarred: ((msg.labelIds as string[]) ?? []).includes("STARRED"),
    attachmentCount: countAttachments(payload),
    ...(includeBody ? { bodyText } : {}),
  }
}
