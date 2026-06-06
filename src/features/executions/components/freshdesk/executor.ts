import { resolveTemplate } from "@/features/executions/lib/template-resolver"
import { freshdeskChannel } from "@/inngest/channels/freshdesk"
import prisma from "@/lib/db"
import { decrypt } from "@/lib/encryption"
import type { NodeExecutorParams } from "@/features/executions/types"
import { NonRetriableError } from "inngest"

// ── Helpers ──────────────────────────────────────────────────────

function getAuthHeader(apiKey: string): string {
  return `Basic ${Buffer.from(`${apiKey}:X`).toString("base64")}`
}

function freshdeskBase(domain: string): string {
  return `https://${domain}.freshdesk.com/api/v2`
}

function filterEmpty(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(
      ([, v]) => v !== undefined && v !== null && v !== ""
    )
  )
}

function parseCustomFields(
  raw: string | undefined
): Record<string, unknown> | undefined {
  if (!raw || raw === "{}") return undefined
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed === "object" && parsed !== null) return parsed
    return undefined
  } catch {
    return undefined
  }
}

function parseTags(tags: string | undefined): string[] | undefined {
  if (!tags) return undefined
  return tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
}

async function freshdeskApi(
  url: string,
  options: RequestInit,
  authHeader: string
): Promise<unknown> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
      ...((options.headers as Record<string, string>) ?? {}),
    },
  })

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("Retry-After") || "60")
    throw Object.assign(new Error("Freshdesk rate limit hit"), {
      retryAfter: `${retryAfter}s`,
    })
  }

  if (res.status === 401) {
    throw new NonRetriableError("Freshdesk: Invalid API key (401 Unauthorized)")
  }

  if (res.status === 403) {
    throw new NonRetriableError(
      "Freshdesk: Insufficient permissions (403 Forbidden)"
    )
  }

  if (res.status === 404) {
    return { notFound: true }
  }

  if (res.status === 204 || res.status === 200 && res.headers.get("content-length") === "0") {
    return { success: true }
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Freshdesk API error ${res.status}: ${text}`)
  }

  return res.json()
}

// ── Main Executor ────────────────────────────────────────────────

export async function freshdeskExecutor({
  nodeId,
  userId,
  context,
  step,
  publish,
  data,
}: NodeExecutorParams): Promise<Record<string, unknown>> {
  // ─ Step 1: Load config ─
  const config = data as any;
  // ─ Step 2: Validate ─
  const { operation, variableName, continueOnFail } = config
  if (!config.credentialId || !config.credential) {
    throw new NonRetriableError("Freshdesk credential not linked")
  }

  let apiKey: string
  let domain: string
  try {
    const decrypted = decrypt(config.credential.value)
    const parsed = JSON.parse(decrypted)
    apiKey = parsed.apiKey
    domain = parsed.domain
    if (!apiKey || !domain) throw new Error("missing fields")
  } catch {
    throw new NonRetriableError(
      "Freshdesk: could not decrypt credential — check apiKey and domain"
    )
  }

  const auth = getAuthHeader(apiKey)
  const BASE = freshdeskBase(domain)

  // Resolve template values
  const r = (val: string | null | undefined): string => {
    if (!val) return ""
    return resolveTemplate(val, context)
  }

  // ─ Step 3: Execute ─
  let result: unknown
  try {
    await publish(
      freshdeskChannel(nodeId)().status({ status: "loading", nodeId })
    )

    result = await step.run(`freshdesk-exec-${nodeId}`, async () => {
      switch (operation) {
        // ── TICKETS ──────────────────────────────────────────────

        case "CREATE_TICKET": {
          const body = filterEmpty({
            subject: r(config.subject),
            description: r(config.description),
            description_html: r(config.descriptionHtml) || undefined,
            email: r(config.email) || undefined,
            name: r(config.name) || undefined,
            phone: r(config.phone) || undefined,
            priority: config.priority,
            status: config.status,
            source: config.source,
            type: r(config.ticketType) || undefined,
            responder_id: r(config.responderId)
              ? Number(r(config.responderId))
              : undefined,
            group_id: r(config.groupId)
              ? Number(r(config.groupId))
              : undefined,
            product_id: r(config.productId)
              ? Number(r(config.productId))
              : undefined,
            company_id: r(config.companyId)
              ? Number(r(config.companyId))
              : undefined,
            tags: parseTags(r(config.tags)),
            custom_fields: parseCustomFields(r(config.customFields)),
          })
          return freshdeskApi(`${BASE}/tickets`, { method: "POST", body: JSON.stringify(body) }, auth)
        }

        case "GET_TICKET": {
          const id = r(config.ticketId)
          if (!id) throw new NonRetriableError("Ticket ID is required")
          const qs = config.includeStats ? "?include=stats" : ""
          return freshdeskApi(`${BASE}/tickets/${id}${qs}`, { method: "GET" }, auth)
        }

        case "UPDATE_TICKET": {
          const id = r(config.ticketId)
          if (!id) throw new NonRetriableError("Ticket ID is required")
          const body = filterEmpty({
            subject: r(config.subject) || undefined,
            description: r(config.description) || undefined,
            priority: config.priority,
            status: config.status,
            source: config.source,
            type: r(config.ticketType) || undefined,
            responder_id: r(config.responderId)
              ? Number(r(config.responderId))
              : undefined,
            group_id: r(config.groupId)
              ? Number(r(config.groupId))
              : undefined,
            tags: parseTags(r(config.tags)),
            custom_fields: parseCustomFields(r(config.customFields)),
          })
          return freshdeskApi(`${BASE}/tickets/${id}`, { method: "PUT", body: JSON.stringify(body) }, auth)
        }

        case "DELETE_TICKET": {
          const id = r(config.ticketId)
          if (!id) throw new NonRetriableError("Ticket ID is required")
          return freshdeskApi(`${BASE}/tickets/${id}`, { method: "DELETE" }, auth)
        }

        case "LIST_TICKETS": {
          const params = new URLSearchParams()
          if (r(config.filterBy)) params.set("filter", r(config.filterBy))
          if (r(config.orderBy)) params.set("order_by", r(config.orderBy))
          if (r(config.orderType)) params.set("order_type", r(config.orderType))
          params.set("page", String(config.page))
          params.set("per_page", String(config.perPage))
          if (r(config.updatedSince))
            params.set("updated_since", r(config.updatedSince))
          if (config.includeStats) params.set("include", "stats")
          return freshdeskApi(
            `${BASE}/tickets?${params.toString()}`,
            { method: "GET" },
            auth
          )
        }

        case "SEARCH_TICKETS": {
          const q = r(config.searchQuery)
          if (!q) throw new NonRetriableError("Search query is required")
          return freshdeskApi(
            `${BASE}/search/tickets?query="${encodeURIComponent(q)}"&page=${config.page}`,
            { method: "GET" },
            auth
          )
        }

        case "GET_TICKET_FIELDS":
          return freshdeskApi(`${BASE}/ticket_fields`, { method: "GET" }, auth)

        case "RESTORE_TICKET": {
          const id = r(config.ticketId)
          if (!id) throw new NonRetriableError("Ticket ID is required")
          return freshdeskApi(`${BASE}/tickets/${id}/restore`, { method: "PUT" }, auth)
        }

        // ── TICKET NOTES ─────────────────────────────────────────

        case "ADD_NOTE": {
          const tid = r(config.ticketId)
          if (!tid) throw new NonRetriableError("Ticket ID is required")
          const body = filterEmpty({
            body: r(config.noteBody),
            private: config.notePrivate,
            user_id: r(config.noteUserId)
              ? Number(r(config.noteUserId))
              : undefined,
          })
          return freshdeskApi(
            `${BASE}/tickets/${tid}/notes`,
            { method: "POST", body: JSON.stringify(body) },
            auth
          )
        }

        case "LIST_NOTES": {
          const tid = r(config.ticketId)
          if (!tid) throw new NonRetriableError("Ticket ID is required")
          return freshdeskApi(
            `${BASE}/tickets/${tid}/notes?page=${config.page}&per_page=${config.perPage}`,
            { method: "GET" },
            auth
          )
        }

        case "UPDATE_NOTE": {
          const tid = r(config.ticketId)
          const nid = r(config.noteId)
          if (!tid || !nid)
            throw new NonRetriableError("Ticket ID and Note ID are required")
          const body = filterEmpty({
            body: r(config.noteBody),
          })
          return freshdeskApi(
            `${BASE}/tickets/${tid}/notes/${nid}`,
            { method: "PUT", body: JSON.stringify(body) },
            auth
          )
        }

        case "DELETE_NOTE": {
          const tid = r(config.ticketId)
          const nid = r(config.noteId)
          if (!tid || !nid)
            throw new NonRetriableError("Ticket ID and Note ID are required")
          return freshdeskApi(
            `${BASE}/tickets/${tid}/notes/${nid}`,
            { method: "DELETE" },
            auth
          )
        }

        // ── CONTACTS ─────────────────────────────────────────────

        case "CREATE_CONTACT": {
          const body = filterEmpty({
            email: r(config.contactEmail) || undefined,
            name: r(config.contactName),
            phone: r(config.contactPhone) || undefined,
            mobile: r(config.contactMobile) || undefined,
            job_title: r(config.contactJobTitle) || undefined,
            time_zone: r(config.contactTimeZone) || undefined,
            language: r(config.contactLanguage) || undefined,
            tags: parseTags(r(config.contactTags)),
            company_id: r(config.contactCompanyId)
              ? Number(r(config.contactCompanyId))
              : undefined,
          })
          return freshdeskApi(`${BASE}/contacts`, { method: "POST", body: JSON.stringify(body) }, auth)
        }

        case "GET_CONTACT": {
          const cid = r(config.contactId)
          if (!cid) throw new NonRetriableError("Contact ID is required")
          return freshdeskApi(`${BASE}/contacts/${cid}`, { method: "GET" }, auth)
        }

        case "UPDATE_CONTACT": {
          const cid = r(config.contactId)
          if (!cid) throw new NonRetriableError("Contact ID is required")
          const body = filterEmpty({
            email: r(config.contactEmail) || undefined,
            name: r(config.contactName) || undefined,
            phone: r(config.contactPhone) || undefined,
            mobile: r(config.contactMobile) || undefined,
            job_title: r(config.contactJobTitle) || undefined,
            time_zone: r(config.contactTimeZone) || undefined,
            language: r(config.contactLanguage) || undefined,
            tags: parseTags(r(config.contactTags)),
            company_id: r(config.contactCompanyId)
              ? Number(r(config.contactCompanyId))
              : undefined,
          })
          return freshdeskApi(`${BASE}/contacts/${cid}`, { method: "PUT", body: JSON.stringify(body) }, auth)
        }

        case "DELETE_CONTACT": {
          const cid = r(config.contactId)
          if (!cid) throw new NonRetriableError("Contact ID is required")
          return freshdeskApi(`${BASE}/contacts/${cid}`, { method: "DELETE" }, auth)
        }

        case "LIST_CONTACTS": {
          const params = new URLSearchParams()
          params.set("page", String(config.page))
          params.set("per_page", String(config.perPage))
          if (r(config.orderBy)) params.set("order_by", r(config.orderBy))
          if (r(config.orderType))
            params.set("order_type", r(config.orderType))
          if (r(config.updatedSince))
            params.set("updated_since", r(config.updatedSince))
          return freshdeskApi(
            `${BASE}/contacts?${params.toString()}`,
            { method: "GET" },
            auth
          )
        }

        case "SEARCH_CONTACTS": {
          const q = r(config.searchQuery)
          if (!q) throw new NonRetriableError("Search query is required")
          return freshdeskApi(
            `${BASE}/search/contacts?query="${encodeURIComponent(q)}"&page=${config.page}`,
            { method: "GET" },
            auth
          )
        }

        case "MERGE_CONTACT": {
          const primaryId = r(config.contactId)
          const targetId = r(config.mergeTargetId)
          if (!primaryId || !targetId)
            throw new NonRetriableError(
              "Primary Contact ID and Merge Target ID are required"
            )
          return freshdeskApi(
            `${BASE}/contacts/${primaryId}/merge`,
            {
              method: "PUT",
              body: JSON.stringify({
                secondary_contact_ids: [Number(targetId)],
              }),
            },
            auth
          )
        }

        // ── COMPANIES ────────────────────────────────────────────

        case "CREATE_COMPANY": {
          const body = filterEmpty({
            name: r(config.companyName),
            domains: r(config.companyDomain)
              ? [r(config.companyDomain)]
              : undefined,
            description: r(config.companyDescription) || undefined,
            note: r(config.companyNote) || undefined,
          })
          return freshdeskApi(`${BASE}/companies`, { method: "POST", body: JSON.stringify(body) }, auth)
        }

        case "GET_COMPANY": {
          const cid = r(config.companyId)
          if (!cid) throw new NonRetriableError("Company ID is required")
          return freshdeskApi(`${BASE}/companies/${cid}`, { method: "GET" }, auth)
        }

        case "UPDATE_COMPANY": {
          const cid = r(config.companyId)
          if (!cid) throw new NonRetriableError("Company ID is required")
          const body = filterEmpty({
            name: r(config.companyName) || undefined,
            domains: r(config.companyDomain)
              ? [r(config.companyDomain)]
              : undefined,
            description: r(config.companyDescription) || undefined,
            note: r(config.companyNote) || undefined,
          })
          return freshdeskApi(`${BASE}/companies/${cid}`, { method: "PUT", body: JSON.stringify(body) }, auth)
        }

        case "DELETE_COMPANY": {
          const cid = r(config.companyId)
          if (!cid) throw new NonRetriableError("Company ID is required")
          return freshdeskApi(`${BASE}/companies/${cid}`, { method: "DELETE" }, auth)
        }

        case "LIST_COMPANIES": {
          const params = new URLSearchParams()
          params.set("page", String(config.page))
          params.set("per_page", String(config.perPage))
          return freshdeskApi(
            `${BASE}/companies?${params.toString()}`,
            { method: "GET" },
            auth
          )
        }

        // ── AGENTS ───────────────────────────────────────────────

        case "LIST_AGENTS": {
          const params = new URLSearchParams()
          params.set("page", String(config.page))
          params.set("per_page", String(config.perPage))
          return freshdeskApi(
            `${BASE}/agents?${params.toString()}`,
            { method: "GET" },
            auth
          )
        }

        case "GET_AGENT": {
          const aid = r(config.agentId)
          if (!aid) throw new NonRetriableError("Agent ID is required")
          return freshdeskApi(`${BASE}/agents/${aid}`, { method: "GET" }, auth)
        }

        case "UPDATE_AGENT": {
          const aid = r(config.agentId)
          if (!aid) throw new NonRetriableError("Agent ID is required")
          // Agent update is limited — just forward custom_fields or similar
          const cf = parseCustomFields(r(config.customFields))
          const body = cf ? { custom_fields: cf } : {}
          return freshdeskApi(
            `${BASE}/agents/${aid}`,
            { method: "PUT", body: JSON.stringify(body) },
            auth
          )
        }

        // ── CONVERSATIONS ────────────────────────────────────────

        case "LIST_CONVERSATIONS": {
          const tid = r(config.ticketId)
          if (!tid) throw new NonRetriableError("Ticket ID is required")
          return freshdeskApi(
            `${BASE}/tickets/${tid}/conversations?page=${config.page}&per_page=${config.perPage}`,
            { method: "GET" },
            auth
          )
        }

        case "SEND_REPLY": {
          const tid = r(config.ticketId)
          if (!tid) throw new NonRetriableError("Ticket ID is required")
          const body = filterEmpty({
            body: r(config.replyBody),
            from_email: r(config.replyFrom) || undefined,
            to: r(config.replyTo)
              ? r(config.replyTo)
                  .split(",")
                  .map((e) => e.trim())
                  .filter(Boolean)
              : undefined,
            cc_emails: r(config.replyCc)
              ? r(config.replyCc)
                  .split(",")
                  .map((e) => e.trim())
                  .filter(Boolean)
              : undefined,
            bcc_emails: r(config.replyBcc)
              ? r(config.replyBcc)
                  .split(",")
                  .map((e) => e.trim())
                  .filter(Boolean)
              : undefined,
          })
          return freshdeskApi(
            `${BASE}/tickets/${tid}/reply`,
            { method: "POST", body: JSON.stringify(body) },
            auth
          )
        }

        case "CREATE_OUTBOUND_EMAIL": {
          const body = filterEmpty({
            subject: r(config.subject),
            description: r(config.description),
            email: r(config.email),
            type: "outbound_email",
            priority: config.priority,
            status: config.status,
            tags: parseTags(r(config.tags)),
          })
          return freshdeskApi(`${BASE}/tickets/outbound_email`, { method: "POST", body: JSON.stringify(body) }, auth)
        }

        // ── GENERIC ──────────────────────────────────────────────

        case "GET_TICKET_STATS":
          return freshdeskApi(`${BASE}/tickets?include=stats&per_page=1`, { method: "GET" }, auth)

        default:
          throw new NonRetriableError(
            `Unsupported Freshdesk operation: ${operation}`
          )
      }
    })

    await publish(
      freshdeskChannel(nodeId)().status({ status: "success", nodeId })
    )
  } catch (err) {
    await publish(
      freshdeskChannel(nodeId)().status({ status: "error", nodeId })
    )
    if (continueOnFail) {
      return {
        ...context,
        [variableName]: {
          error: err instanceof Error ? err.message : String(err),
          success: false,
        },
      }
    }
    throw err
  }

  return { ...context, [variableName]: result }
}
