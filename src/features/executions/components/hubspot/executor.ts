import { NonRetriableError, RetryAfterError } from "inngest"
import type { NodeExecutor } from "@/features/executions/types"
import prisma from "@/lib/db"
import { decrypt, encrypt } from "@/lib/encryption"
import { resolveTemplate } from "@/features/executions/lib/template-resolver"
import { hubspotChannel } from "@/inngest/channels/hubspot"
import { HubspotOperation } from "@/features/executions/enums"

const HUBSPOT_API_BASE = "https://api.hubapi.com"
const HUBSPOT_TOKEN_URL = "https://api.hubapi.com/oauth/v1/token"

type HubspotCredentialPayload = {
  accessToken: string
  refreshToken: string
  expiresAt?: number
  portalId?: string
  hubId?: string
}

async function getValidAccessToken(credentialId: string, credentialValue: string): Promise<string> {
  const creds = JSON.parse(decrypt(credentialValue)) as HubspotCredentialPayload

  if (creds.expiresAt && Date.now() < creds.expiresAt - 5 * 60 * 1000) {
    return creds.accessToken
  }

  const clientId = process.env.HUBSPOT_CLIENT_ID
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new NonRetriableError(
      "HubSpot: HUBSPOT_CLIENT_ID or HUBSPOT_CLIENT_SECRET not set in environment."
    )
  }

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: creds.refreshToken,
  })

  const res = await fetch(HUBSPOT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  })

  if (!res.ok) {
    let message: string | undefined
    try {
      const err = (await res.json()) as { message?: string }
      message = err.message
    } catch {
      // ignore
    }
    throw new NonRetriableError(
      `HubSpot: Token refresh failed. ${message ?? res.status}. Re-authorize in credentials.`
    )
  }

  const data = (await res.json()) as {
    access_token: string
    refresh_token: string
    expires_in: number
  }

  const newCreds = {
    ...creds,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }

  await prisma.credential.update({
    where: { id: credentialId },
    data: { value: encrypt(JSON.stringify(newCreds)) },
  })

  return data.access_token
}

function filterEmpty<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(
      ([, value]) => value !== undefined && value !== null && value !== "" && !(Array.isArray(value) && value.length === 0)
    )
  )
}

async function hubspotApi(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  accessToken: string,
  body?: unknown,
  queryParams?: Record<string, string | number | undefined>
): Promise<Record<string, unknown>> {
  const url = new URL(`${HUBSPOT_API_BASE}${path}`)
  Object.entries(queryParams ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value))
  })

  const res = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": body ? "application/json" : "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 429) {
    throw new RetryAfterError("HubSpot rate limit exceeded", 60_000)
  }

  if (!res.ok) {
    let errorMessage = res.statusText
    try {
      const err = (await res.json()) as { message?: string; status?: string }
      errorMessage = err.message || err.status || errorMessage
    } catch {
      // ignore parse errors
    }
    if (res.status >= 500) {
      throw new Error(`HubSpot: ${errorMessage}`)
    }
    throw new NonRetriableError(`HubSpot error: ${errorMessage}`)
  }

  if (res.status === 204) return {}
  return (await res.json()) as Record<string, unknown>
}

function parseCustomProperties(customProps: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(customProps || "{}")
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

export const hubspotExecutor: NodeExecutor = async ({ data, nodeId, context, step, publish }) => {
  const config = data as any;

await step.run(`hubspot-${nodeId}-validate`, async () => {
    if (!config) throw new NonRetriableError("HubSpot node not configured")
    if (!config.credentialId || !config.credential) {
      throw new NonRetriableError("HubSpot: No credential connected.")
    }
    return { valid: true }
  })

  if (!config || !config.credentialId || !config.credential) {
    throw new NonRetriableError("HubSpot: Missing credential.")
  }

  const accessToken = await step.run(`hubspot-${nodeId}-token`, () =>
    getValidAccessToken(config.credentialId!, config.credential!.value)
  )

  const r = (field: string) => resolveTemplate(field, context) as string
  const customProps = parseCustomProperties(r(config.customProperties))

  const buildContactProps = () =>
    filterEmpty({
      email: r(config.email),
      firstname: r(config.firstName),
      lastname: r(config.lastName),
      phone: r(config.phone),
      website: r(config.website),
      company: r(config.company),
      jobtitle: r(config.jobTitle),
      lifecyclestage: r(config.lifecycleStage),
      hs_lead_status: r(config.leadStatus),
      ...customProps,
    })

  const buildCompanyProps = () =>
    filterEmpty({
      name: r(config.companyName),
      domain: r(config.domain),
      industry: r(config.industry),
      annualrevenue: r(config.annualRevenue),
      numberofemployees: r(config.numberOfEmployees),
      city: r(config.city),
      state: r(config.state),
      country: r(config.country),
      ...customProps,
    })

  const buildDealProps = () =>
    filterEmpty({
      dealname: r(config.dealName),
      dealstage: r(config.dealStage),
      pipeline: r(config.pipeline) || "default",
      amount: r(config.amount),
      closedate: r(config.closeDate),
      dealtype: r(config.dealType),
      hs_priority: r(config.priority),
      ...customProps,
    })

  const buildTicketProps = () =>
    filterEmpty({
      subject: r(config.ticketName),
      content: r(config.ticketDescription),
      hs_pipeline: r(config.ticketPipeline) || "0",
      hs_pipeline_stage: r(config.ticketStatus),
      hs_ticket_priority: r(config.ticketPriority),
      source_type: r(config.ticketSource),
      ...customProps,
    })

  let result: Record<string, unknown> = {}

  try {
    result = await step.run(`hubspot-${nodeId}-execute`, async () => {
      await publish(await hubspotChannel(nodeId)().status({ nodeId, status: "loading" }))
      switch (config.operation) {
        case HubspotOperation.CREATE_CONTACT: {
          const properties = buildContactProps()
          const data = await hubspotApi("POST", "/crm/v3/objects/contacts", accessToken, { properties })
          return { operation: "CREATE_CONTACT", ...data }
        }
        case HubspotOperation.GET_CONTACT: {
          const id = r(config.recordId)
          if (!id) throw new NonRetriableError("HubSpot: recordId required for GET_CONTACT")
          const data = await hubspotApi("GET", `/crm/v3/objects/contacts/${id}`, accessToken)
          return { operation: "GET_CONTACT", ...data }
        }
        case HubspotOperation.UPDATE_CONTACT: {
          const id = r(config.recordId)
          if (!id) throw new NonRetriableError("HubSpot: recordId required for UPDATE_CONTACT")
          const properties = buildContactProps()
          const data = await hubspotApi("PATCH", `/crm/v3/objects/contacts/${id}`, accessToken, { properties })
          return { operation: "UPDATE_CONTACT", ...data }
        }
        case HubspotOperation.DELETE_CONTACT: {
          const id = r(config.recordId)
          if (!id) throw new NonRetriableError("HubSpot: recordId required for DELETE_CONTACT")
          await hubspotApi("DELETE", `/crm/v3/objects/contacts/${id}`, accessToken)
          return { operation: "DELETE_CONTACT", recordId: id, success: true }
        }
        case HubspotOperation.SEARCH_CONTACTS: {
          const filters = []
          if (config.filterProperty && config.filterValue) {
            filters.push({
              propertyName: r(config.filterProperty),
              operator: r(config.filterOperator || "EQ"),
              value: r(config.filterValue),
            })
          }
          const body: Record<string, unknown> = {
            limit: config.limit ?? 10,
            after: r(config.after) || undefined,
            sorts: config.sortProperty ? [{ propertyName: r(config.sortProperty), direction: r(config.sortDirection) || "DESCENDING" }] : undefined,
          }
          if (filters.length) {
            body.filterGroups = [{ filters }]
          }
          if (config.searchQuery) {
            body.q = r(config.searchQuery)
          }
          const data = await hubspotApi("POST", "/crm/v3/objects/contacts/search", accessToken, body)
          return { operation: "SEARCH_CONTACTS", ...data }
        }
        case HubspotOperation.GET_CONTACT_PROPERTIES: {
          const data = await hubspotApi("GET", "/crm/v3/properties/contacts", accessToken)
          return { operation: "GET_CONTACT_PROPERTIES", ...data }
        }
        case HubspotOperation.UPSERT_CONTACT: {
          const identifier = r(config.recordId) || r(config.email)
          if (!identifier) throw new NonRetriableError("HubSpot: recordId or email required for UPSERT_CONTACT")
          const properties = buildContactProps()
          const query = identifier === r(config.email) ? { idProperty: "email" } : undefined
          const data = await hubspotApi(
            "PATCH",
            `/crm/v3/objects/contacts/${encodeURIComponent(identifier)}`,
            accessToken,
            { properties },
            query
          )
          return { operation: "UPSERT_CONTACT", ...data }
        }
        case HubspotOperation.GET_CONTACT_ASSOCIATIONS: {
          const id = r(config.recordId)
          if (!id) throw new NonRetriableError("HubSpot: recordId required for GET_CONTACT_ASSOCIATIONS")
          const toType = r(config.toObjectType || "deals") || "deals"
          const data = await hubspotApi("GET", `/crm/v4/objects/contacts/${id}/associations/${toType}`, accessToken)
          return { operation: "GET_CONTACT_ASSOCIATIONS", ...data }
        }
        case HubspotOperation.CREATE_COMPANY: {
          const properties = buildCompanyProps()
          const data = await hubspotApi("POST", "/crm/v3/objects/companies", accessToken, { properties })
          return { operation: "CREATE_COMPANY", ...data }
        }
        case HubspotOperation.GET_COMPANY: {
          const id = r(config.recordId)
          if (!id) throw new NonRetriableError("HubSpot: recordId required for GET_COMPANY")
          const data = await hubspotApi("GET", `/crm/v3/objects/companies/${id}`, accessToken)
          return { operation: "GET_COMPANY", ...data }
        }
        case HubspotOperation.UPDATE_COMPANY: {
          const id = r(config.recordId)
          if (!id) throw new NonRetriableError("HubSpot: recordId required for UPDATE_COMPANY")
          const properties = buildCompanyProps()
          const data = await hubspotApi("PATCH", `/crm/v3/objects/companies/${id}`, accessToken, { properties })
          return { operation: "UPDATE_COMPANY", ...data }
        }
        case HubspotOperation.DELETE_COMPANY: {
          const id = r(config.recordId)
          if (!id) throw new NonRetriableError("HubSpot: recordId required for DELETE_COMPANY")
          await hubspotApi("DELETE", `/crm/v3/objects/companies/${id}`, accessToken)
          return { operation: "DELETE_COMPANY", recordId: id, success: true }
        }
        case HubspotOperation.SEARCH_COMPANIES: {
          const filters = []
          if (config.filterProperty && config.filterValue) {
            filters.push({
              propertyName: r(config.filterProperty),
              operator: r(config.filterOperator || "EQ"),
              value: r(config.filterValue),
            })
          }
          const body: Record<string, unknown> = {
            limit: config.limit ?? 10,
            after: r(config.after) || undefined,
            sorts: config.sortProperty ? [{ propertyName: r(config.sortProperty), direction: r(config.sortDirection) || "DESCENDING" }] : undefined,
          }
          if (filters.length) body.filterGroups = [{ filters }]
          if (config.searchQuery) body.q = r(config.searchQuery)
          const data = await hubspotApi("POST", "/crm/v3/objects/companies/search", accessToken, body)
          return { operation: "SEARCH_COMPANIES", ...data }
        }
        case HubspotOperation.CREATE_DEAL: {
          const properties = buildDealProps()
          const data = await hubspotApi("POST", "/crm/v3/objects/deals", accessToken, { properties })
          return { operation: "CREATE_DEAL", ...data }
        }
        case HubspotOperation.GET_DEAL: {
          const id = r(config.recordId)
          if (!id) throw new NonRetriableError("HubSpot: recordId required for GET_DEAL")
          const data = await hubspotApi("GET", `/crm/v3/objects/deals/${id}`, accessToken)
          return { operation: "GET_DEAL", ...data }
        }
        case HubspotOperation.UPDATE_DEAL: {
          const id = r(config.recordId)
          if (!id) throw new NonRetriableError("HubSpot: recordId required for UPDATE_DEAL")
          const properties = buildDealProps()
          const data = await hubspotApi("PATCH", `/crm/v3/objects/deals/${id}`, accessToken, { properties })
          return { operation: "UPDATE_DEAL", ...data }
        }
        case HubspotOperation.DELETE_DEAL: {
          const id = r(config.recordId)
          if (!id) throw new NonRetriableError("HubSpot: recordId required for DELETE_DEAL")
          await hubspotApi("DELETE", `/crm/v3/objects/deals/${id}`, accessToken)
          return { operation: "DELETE_DEAL", recordId: id, success: true }
        }
        case HubspotOperation.SEARCH_DEALS: {
          const filters = []
          if (config.filterProperty && config.filterValue) {
            filters.push({
              propertyName: r(config.filterProperty),
              operator: r(config.filterOperator || "EQ"),
              value: r(config.filterValue),
            })
          }
          const body: Record<string, unknown> = {
            limit: config.limit ?? 10,
            after: r(config.after) || undefined,
            sorts: config.sortProperty ? [{ propertyName: r(config.sortProperty), direction: r(config.sortDirection) || "DESCENDING" }] : undefined,
          }
          if (filters.length) body.filterGroups = [{ filters }]
          if (config.searchQuery) body.q = r(config.searchQuery)
          const data = await hubspotApi("POST", "/crm/v3/objects/deals/search", accessToken, body)
          return { operation: "SEARCH_DEALS", ...data }
        }
        case HubspotOperation.UPDATE_DEAL_STAGE: {
          const id = r(config.recordId)
          if (!id) throw new NonRetriableError("HubSpot: recordId required for UPDATE_DEAL_STAGE")
          const properties = filterEmpty({
            dealstage: r(config.dealStage),
            pipeline: r(config.pipeline) || "default",
          })
          const data = await hubspotApi("PATCH", `/crm/v3/objects/deals/${id}`, accessToken, { properties })
          return { operation: "UPDATE_DEAL_STAGE", ...data }
        }
        case HubspotOperation.CREATE_TICKET: {
          const properties = buildTicketProps()
          const data = await hubspotApi("POST", "/crm/v3/objects/tickets", accessToken, { properties })
          return { operation: "CREATE_TICKET", ...data }
        }
        case HubspotOperation.GET_TICKET: {
          const id = r(config.recordId)
          if (!id) throw new NonRetriableError("HubSpot: recordId required for GET_TICKET")
          const data = await hubspotApi("GET", `/crm/v3/objects/tickets/${id}`, accessToken)
          return { operation: "GET_TICKET", ...data }
        }
        case HubspotOperation.UPDATE_TICKET: {
          const id = r(config.recordId)
          if (!id) throw new NonRetriableError("HubSpot: recordId required for UPDATE_TICKET")
          const properties = buildTicketProps()
          const data = await hubspotApi("PATCH", `/crm/v3/objects/tickets/${id}`, accessToken, { properties })
          return { operation: "UPDATE_TICKET", ...data }
        }
        case HubspotOperation.DELETE_TICKET: {
          const id = r(config.recordId)
          if (!id) throw new NonRetriableError("HubSpot: recordId required for DELETE_TICKET")
          await hubspotApi("DELETE", `/crm/v3/objects/tickets/${id}`, accessToken)
          return { operation: "DELETE_TICKET", recordId: id, success: true }
        }
        case HubspotOperation.SEARCH_TICKETS: {
          const filters = []
          if (config.filterProperty && config.filterValue) {
            filters.push({
              propertyName: r(config.filterProperty),
              operator: r(config.filterOperator || "EQ"),
              value: r(config.filterValue),
            })
          }
          const body: Record<string, unknown> = {
            limit: config.limit ?? 10,
            after: r(config.after) || undefined,
            sorts: config.sortProperty ? [{ propertyName: r(config.sortProperty), direction: r(config.sortDirection) || "DESCENDING" }] : undefined,
          }
          if (filters.length) body.filterGroups = [{ filters }]
          if (config.searchQuery) body.q = r(config.searchQuery)
          const data = await hubspotApi("POST", "/crm/v3/objects/tickets/search", accessToken, body)
          return { operation: "SEARCH_TICKETS", ...data }
        }
        case HubspotOperation.CREATE_NOTE: {
          const properties = filterEmpty({
            hs_note_body: r(config.noteBody),
            ...customProps,
          })
          const data = await hubspotApi("POST", "/crm/v3/objects/notes", accessToken, { properties })
          return { operation: "CREATE_NOTE", ...data }
        }
        case HubspotOperation.CREATE_TASK: {
          const properties = filterEmpty({
            hs_task_body: r(config.taskBody),
            hs_task_subject: r(config.taskSubject),
            hs_task_status: r(config.taskStatus) || "NOT_STARTED",
            hs_task_priority: r(config.taskPriority) || "NONE",
            hs_timestamp: r(config.taskDueDate),
            ...customProps,
          })
          const data = await hubspotApi("POST", "/crm/v3/objects/tasks", accessToken, { properties })
          return { operation: "CREATE_TASK", ...data }
        }
        case HubspotOperation.CREATE_CALL: {
          const properties = filterEmpty({
            hs_call_body: r(config.callBody),
            hs_call_duration: r(config.callDuration),
            hs_call_direction: r(config.callDirection) || "OUTBOUND",
            hs_call_disposition: r(config.callDisposition),
            hs_timestamp: r(config.taskDueDate) || r(config.callDuration),
            ...customProps,
          })
          const data = await hubspotApi("POST", "/crm/v3/objects/calls", accessToken, { properties })
          return { operation: "CREATE_CALL", ...data }
        }
        case HubspotOperation.CREATE_EMAIL_LOG: {
          const properties = filterEmpty({
            hs_email_subject: r(config.emailSubject),
            hs_email_text: r(config.emailBody),
            hs_email_from_email: r(config.emailFrom),
            hs_email_to_email: r(config.emailTo),
            ...customProps,
          })
          const data = await hubspotApi("POST", "/crm/v3/objects/emails", accessToken, { properties })
          return { operation: "CREATE_EMAIL_LOG", ...data }
        }
        case HubspotOperation.CREATE_ASSOCIATION: {
          const fromType = r(config.fromObjectType || "contacts") || "contacts"
          const toType = r(config.toObjectType || "deals") || "deals"
          const fromId = r(config.fromObjectId)
          const toId = r(config.toObjectId)
          if (!fromId || !toId) throw new NonRetriableError("HubSpot: fromObjectId and toObjectId required for CREATE_ASSOCIATION")
          const associationType = r(config.associationType) || "association"
          const data = await hubspotApi(
            "PUT",
            `/crm/v4/objects/${fromType}/${fromId}/associations/${toType}/${toId}`,
            accessToken,
            {
              associationType,
            }
          )
          return { operation: "CREATE_ASSOCIATION", ...data }
        }
        case HubspotOperation.DELETE_ASSOCIATION: {
          const fromType = r(config.fromObjectType || "contacts") || "contacts"
          const toType = r(config.toObjectType || "deals") || "deals"
          const fromId = r(config.fromObjectId)
          const toId = r(config.toObjectId)
          if (!fromId || !toId) throw new NonRetriableError("HubSpot: fromObjectId and toObjectId required for DELETE_ASSOCIATION")
          await hubspotApi(
            "DELETE",
            `/crm/v4/objects/${fromType}/${fromId}/associations/${toType}/${toId}`,
            accessToken
          )
          return { operation: "DELETE_ASSOCIATION", fromId, toId, success: true }
        }
        case HubspotOperation.ADD_CONTACT_TO_LIST: {
          const listId = r(config.listId)
          if (!listId) throw new NonRetriableError("HubSpot: listId required for ADD_CONTACT_TO_LIST")
          const email = r(config.email) || r(config.recordId)
          if (!email) throw new NonRetriableError("HubSpot: email required for ADD_CONTACT_TO_LIST")
          const data = await hubspotApi(
            "POST",
            `/contacts/v1/lists/${listId}/add`,
            accessToken,
            { emails: [email] }
          )
          return { operation: "ADD_CONTACT_TO_LIST", ...data }
        }
        case HubspotOperation.REMOVE_CONTACT_FROM_LIST: {
          const listId = r(config.listId)
          if (!listId) throw new NonRetriableError("HubSpot: listId required for REMOVE_CONTACT_FROM_LIST")
          const email = r(config.email) || r(config.recordId)
          if (!email) throw new NonRetriableError("HubSpot: email required for REMOVE_CONTACT_FROM_LIST")
          const data = await hubspotApi(
            "POST",
            `/contacts/v1/lists/${listId}/remove`,
            accessToken,
            { emails: [email] }
          )
          return { operation: "REMOVE_CONTACT_FROM_LIST", ...data }
        }
        case HubspotOperation.GET_LIST_CONTACTS: {
          const listId = r(config.listId)
          if (!listId) throw new NonRetriableError("HubSpot: listId required for GET_LIST_CONTACTS")
          const data = await hubspotApi(
            "GET",
            `/contacts/v1/lists/${listId}/contacts/all`,
            accessToken,
            undefined,
            { count: config.limit ?? 10, vidOffset: r(config.after) || undefined }
          )
          return { operation: "GET_LIST_CONTACTS", ...data }
        }
        case HubspotOperation.SEARCH_OBJECTS: {
          const objType = r(config.objectType || "contacts") || "contacts"
          const filters = []
          if (config.filterProperty && config.filterValue) {
            filters.push({
              propertyName: r(config.filterProperty),
              operator: r(config.filterOperator || "EQ"),
              value: r(config.filterValue),
            })
          }
          const body: Record<string, unknown> = {
            limit: config.limit ?? 10,
            after: r(config.after) || undefined,
            sorts: config.sortProperty ? [{ propertyName: r(config.sortProperty), direction: r(config.sortDirection) || "DESCENDING" }] : undefined,
          }
          if (filters.length) body.filterGroups = [{ filters }]
          if (config.searchQuery) body.q = r(config.searchQuery)
          const data = await hubspotApi("POST", `/crm/v3/objects/${objType}/search`, accessToken, body)
          return { operation: "SEARCH_OBJECTS", ...data }
        }
        case HubspotOperation.GET_PROPERTIES: {
          const objType = r(config.objectType || "contacts") || "contacts"
          const data = await hubspotApi("GET", `/crm/v3/properties/${objType}`, accessToken)
          return { operation: "GET_PROPERTIES", ...data }
        }
        default:
          throw new NonRetriableError(`HubSpot: Unsupported operation ${config.operation}`)
      }
    })
  } catch (err) {
    if (err instanceof NonRetriableError || err instanceof RetryAfterError) {
      if (config?.continueOnFail) {
        result = {
          operation: config.operation,
          success: false,
          error: err.message,
        }
      } else {
        throw err
      }
    } else {
      if (config?.continueOnFail) {
        result = {
          operation: config?.operation,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        }
      } else {
        throw err instanceof Error ? err : new Error(String(err))
      }
    }
  }

  await publish(await hubspotChannel(nodeId)().status({ nodeId, status: "success" }))

  return {
    ...context,
    [(config?.variableName || "hubspot") as string]: result,
  }
}
