/**
 * HubSpot Corsair operations — full @corsair-dev/hubspot public surface.
 */

import { NonRetriableError } from "inngest"
import { hubspotIntegrationDefinition } from "@/features/integrations/registry/integrations/hubspot"
import { resolveOperation } from "@/features/integrations/registry/resolve"

type ApiFn = (args?: Record<string, unknown>) => Promise<unknown>

export type HubspotApiClient = {
  hubspot: {
    api: {
      contacts: {
        get: ApiFn
        getMany: ApiFn
        create: ApiFn
        update: ApiFn
        delete: ApiFn
        getRecentlyCreated: ApiFn
        getRecentlyUpdated: ApiFn
        search: ApiFn
      }
      companies: {
        get: ApiFn
        getMany: ApiFn
        create: ApiFn
        update: ApiFn
        delete: ApiFn
        getRecentlyCreated: ApiFn
        getRecentlyUpdated: ApiFn
        searchByDomain: ApiFn
      }
      deals: {
        get: ApiFn
        getMany: ApiFn
        create: ApiFn
        update: ApiFn
        delete: ApiFn
        getRecentlyCreated: ApiFn
        getRecentlyUpdated: ApiFn
        search: ApiFn
      }
      tickets: {
        get: ApiFn
        getMany: ApiFn
        create: ApiFn
        update: ApiFn
        delete: ApiFn
      }
      engagements: {
        get: ApiFn
        getMany: ApiFn
        create: ApiFn
        delete: ApiFn
      }
      contactLists: {
        addContact: ApiFn
        removeContact: ApiFn
      }
    }
  }
}

export type ResolvedHubspotFields = {
  operation: string
  objectId: string
  contactId: string
  companyId: string
  dealId: string
  ticketId: string
  engagementId: string
  listId: string
  email: string
  firstName: string
  lastName: string
  phone: string
  companyName: string
  domain: string
  dealName: string
  amount: string
  dealStage: string
  pipeline: string
  ticketSubject: string
  ticketContent: string
  ticketPriority: string
  noteBody: string
  taskSubject: string
  callBody: string
  propertiesJson: string
  searchQuery: string
  engagementType: string
  limit: number
  after: string
}

function asRecord(v: unknown): Record<string, unknown> {
  // unknown: HubSpot API JSON
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {}
}

function parseProps(raw: string): Record<string, string> {
  if (!raw.trim() || raw.trim() === "{}") return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new NonRetriableError("HubSpot propertiesJson must be a JSON object.")
    }
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      out[k] = v == null ? "" : String(v)
    }
    return out
  } catch (e) {
    if (e instanceof NonRetriableError) throw e
    throw new NonRetriableError(
      `HubSpot propertiesJson: invalid JSON — ${e instanceof Error ? e.message : String(e)}`,
    )
  }
}

function wrap(operation: string, data: unknown): Record<string, unknown> {
  if (Array.isArray(data)) {
    return { operation, results: data, count: data.length, data }
  }
  return { operation, ...asRecord(data), data }
}

function normalizeOp(raw: string): string {
  const { operation, requestedKey } = resolveOperation(
    hubspotIntegrationDefinition,
    raw,
  )
  if (operation.aliases?.includes(requestedKey)) return requestedKey
  return operation.aliases?.[0] ?? operation.key
}

export function isHubspotCorsairOp(operation: string): boolean {
  try {
    resolveOperation(hubspotIntegrationDefinition, operation)
    return true
  } catch {
    return false
  }
}

function requireId(id: string, label: string, op: string) {
  if (!id.trim()) {
    throw new NonRetriableError(`HubSpot ${op}: ${label} is required.`)
  }
}

function contactProperties(fields: ResolvedHubspotFields): Record<string, string> {
  const props = parseProps(fields.propertiesJson)
  if (fields.email.trim()) props.email = fields.email
  if (fields.firstName.trim()) props.firstname = fields.firstName
  if (fields.lastName.trim()) props.lastname = fields.lastName
  if (fields.phone.trim()) props.phone = fields.phone
  if (fields.companyName.trim()) props.company = fields.companyName
  return props
}

function companyProperties(fields: ResolvedHubspotFields): Record<string, string> {
  const props = parseProps(fields.propertiesJson)
  if (fields.companyName.trim()) props.name = fields.companyName
  if (fields.domain.trim()) props.domain = fields.domain
  if (fields.phone.trim()) props.phone = fields.phone
  return props
}

function dealProperties(fields: ResolvedHubspotFields): Record<string, string> {
  const props = parseProps(fields.propertiesJson)
  if (fields.dealName.trim()) props.dealname = fields.dealName
  if (fields.amount.trim()) props.amount = fields.amount
  if (fields.dealStage.trim()) props.dealstage = fields.dealStage
  if (fields.pipeline.trim()) props.pipeline = fields.pipeline
  return props
}

function ticketProperties(fields: ResolvedHubspotFields): Record<string, string> {
  const props = parseProps(fields.propertiesJson)
  if (fields.ticketSubject.trim()) props.subject = fields.ticketSubject
  if (fields.ticketContent.trim()) props.content = fields.ticketContent
  if (fields.ticketPriority.trim()) props.hs_ticket_priority = fields.ticketPriority
  return props
}

export async function runHubspotOperation(
  client: HubspotApiClient,
  fields: ResolvedHubspotFields,
): Promise<Record<string, unknown>> {
  const api = client.hubspot.api
  const op = normalizeOp(fields.operation)
  const limit = fields.limit || 100
  const after = fields.after.trim() || undefined
  const id =
    fields.objectId ||
    fields.contactId ||
    fields.companyId ||
    fields.dealId ||
    fields.ticketId ||
    fields.engagementId

  switch (op) {
    case "GET_CONTACT":
    case "contacts.get": {
      requireId(fields.contactId || fields.objectId, "contactId", "GET_CONTACT")
      const data = await api.contacts.get({
        contactId: fields.contactId || fields.objectId,
      })
      return wrap("GET_CONTACT", data)
    }
    case "LIST_CONTACTS":
    case "contacts.getMany": {
      const data = await api.contacts.getMany({ limit, after })
      return wrap("LIST_CONTACTS", data)
    }
    case "CREATE_CONTACT":
    case "contacts.create": {
      const properties = contactProperties(fields)
      if (!properties.email) {
        throw new NonRetriableError(
          "HubSpot CREATE_CONTACT: email (or propertiesJson.email) is required.",
        )
      }
      const data = await api.contacts.create({ properties })
      return wrap("CREATE_CONTACT", data)
    }
    case "UPDATE_CONTACT":
    case "UPSERT_CONTACT":
    case "contacts.update": {
      requireId(fields.contactId || fields.objectId, "contactId", "UPDATE_CONTACT")
      const properties = contactProperties(fields)
      if (Object.keys(properties).length === 0) {
        throw new NonRetriableError(
          "HubSpot UPDATE_CONTACT: provide at least one property.",
        )
      }
      const data = await api.contacts.update({
        contactId: fields.contactId || fields.objectId,
        properties,
      })
      return wrap("UPDATE_CONTACT", data)
    }
    case "DELETE_CONTACT":
    case "contacts.delete": {
      requireId(fields.contactId || fields.objectId, "contactId", "DELETE_CONTACT")
      await api.contacts.delete({
        contactId: fields.contactId || fields.objectId,
      })
      return {
        operation: "DELETE_CONTACT",
        deleted: true,
        contactId: fields.contactId || fields.objectId,
      }
    }
    case "LIST_RECENT_CONTACTS":
    case "contacts.getRecentlyCreated": {
      const data = await api.contacts.getRecentlyCreated({ limit })
      return wrap("LIST_RECENT_CONTACTS", data)
    }
    case "LIST_UPDATED_CONTACTS":
    case "contacts.getRecentlyUpdated": {
      const data = await api.contacts.getRecentlyUpdated({ limit })
      return wrap("LIST_UPDATED_CONTACTS", data)
    }
    case "SEARCH_CONTACTS":
    case "contacts.search": {
      if (!fields.searchQuery.trim() && !fields.email.trim()) {
        throw new NonRetriableError(
          "HubSpot SEARCH_CONTACTS: searchQuery or email is required.",
        )
      }
      const data = await api.contacts.search({
        query: fields.searchQuery || fields.email,
        limit,
        after,
      })
      return wrap("SEARCH_CONTACTS", data)
    }

    case "GET_COMPANY":
    case "companies.get": {
      requireId(fields.companyId || fields.objectId, "companyId", "GET_COMPANY")
      const data = await api.companies.get({
        companyId: fields.companyId || fields.objectId,
      })
      return wrap("GET_COMPANY", data)
    }
    case "LIST_COMPANIES":
    case "companies.getMany": {
      const data = await api.companies.getMany({ limit, after })
      return wrap("LIST_COMPANIES", data)
    }
    case "CREATE_COMPANY":
    case "companies.create": {
      const properties = companyProperties(fields)
      if (!properties.name && !properties.domain) {
        throw new NonRetriableError(
          "HubSpot CREATE_COMPANY: companyName or domain is required.",
        )
      }
      const data = await api.companies.create({ properties })
      return wrap("CREATE_COMPANY", data)
    }
    case "UPDATE_COMPANY":
    case "companies.update": {
      requireId(fields.companyId || fields.objectId, "companyId", "UPDATE_COMPANY")
      const properties = companyProperties(fields)
      const data = await api.companies.update({
        companyId: fields.companyId || fields.objectId,
        properties,
      })
      return wrap("UPDATE_COMPANY", data)
    }
    case "DELETE_COMPANY":
    case "companies.delete": {
      requireId(fields.companyId || fields.objectId, "companyId", "DELETE_COMPANY")
      await api.companies.delete({
        companyId: fields.companyId || fields.objectId,
      })
      return {
        operation: "DELETE_COMPANY",
        deleted: true,
        companyId: fields.companyId || fields.objectId,
      }
    }
    case "LIST_RECENT_COMPANIES":
    case "companies.getRecentlyCreated": {
      const data = await api.companies.getRecentlyCreated({ limit })
      return wrap("LIST_RECENT_COMPANIES", data)
    }
    case "LIST_UPDATED_COMPANIES":
    case "companies.getRecentlyUpdated": {
      const data = await api.companies.getRecentlyUpdated({ limit })
      return wrap("LIST_UPDATED_COMPANIES", data)
    }
    case "SEARCH_COMPANIES":
    case "SEARCH_COMPANIES_BY_DOMAIN":
    case "companies.searchByDomain": {
      if (!fields.domain.trim() && !fields.searchQuery.trim()) {
        throw new NonRetriableError(
          "HubSpot SEARCH_COMPANIES: domain (or searchQuery) is required.",
        )
      }
      const data = await api.companies.searchByDomain({
        domain: fields.domain || fields.searchQuery,
        limit,
      })
      return wrap("SEARCH_COMPANIES", data)
    }

    case "GET_DEAL":
    case "deals.get": {
      requireId(fields.dealId || fields.objectId, "dealId", "GET_DEAL")
      const data = await api.deals.get({
        dealId: fields.dealId || fields.objectId,
      })
      return wrap("GET_DEAL", data)
    }
    case "LIST_DEALS":
    case "deals.getMany": {
      const data = await api.deals.getMany({ limit, after })
      return wrap("LIST_DEALS", data)
    }
    case "CREATE_DEAL":
    case "deals.create": {
      const properties = dealProperties(fields)
      if (!properties.dealname) {
        throw new NonRetriableError(
          "HubSpot CREATE_DEAL: dealName is required.",
        )
      }
      const data = await api.deals.create({ properties })
      return wrap("CREATE_DEAL", data)
    }
    case "UPDATE_DEAL":
    case "UPDATE_DEAL_STAGE":
    case "deals.update": {
      requireId(fields.dealId || fields.objectId, "dealId", "UPDATE_DEAL")
      const properties = dealProperties(fields)
      const data = await api.deals.update({
        dealId: fields.dealId || fields.objectId,
        properties,
      })
      return wrap(op === "UPDATE_DEAL_STAGE" ? "UPDATE_DEAL_STAGE" : "UPDATE_DEAL", data)
    }
    case "DELETE_DEAL":
    case "deals.delete": {
      requireId(fields.dealId || fields.objectId, "dealId", "DELETE_DEAL")
      await api.deals.delete({ dealId: fields.dealId || fields.objectId })
      return {
        operation: "DELETE_DEAL",
        deleted: true,
        dealId: fields.dealId || fields.objectId,
      }
    }
    case "LIST_RECENT_DEALS":
    case "deals.getRecentlyCreated": {
      const data = await api.deals.getRecentlyCreated({ limit })
      return wrap("LIST_RECENT_DEALS", data)
    }
    case "LIST_UPDATED_DEALS":
    case "deals.getRecentlyUpdated": {
      const data = await api.deals.getRecentlyUpdated({ limit })
      return wrap("LIST_UPDATED_DEALS", data)
    }
    case "SEARCH_DEALS":
    case "deals.search": {
      if (!fields.searchQuery.trim() && !fields.dealName.trim()) {
        throw new NonRetriableError(
          "HubSpot SEARCH_DEALS: searchQuery or dealName is required.",
        )
      }
      const data = await api.deals.search({
        query: fields.searchQuery || fields.dealName,
        limit,
        after,
      })
      return wrap("SEARCH_DEALS", data)
    }

    case "GET_TICKET":
    case "tickets.get": {
      requireId(fields.ticketId || fields.objectId, "ticketId", "GET_TICKET")
      const data = await api.tickets.get({
        ticketId: fields.ticketId || fields.objectId,
      })
      return wrap("GET_TICKET", data)
    }
    case "LIST_TICKETS":
    case "SEARCH_TICKETS":
    case "tickets.getMany": {
      const data = await api.tickets.getMany({ limit, after })
      return wrap("LIST_TICKETS", data)
    }
    case "CREATE_TICKET":
    case "tickets.create": {
      const properties = ticketProperties(fields)
      if (!properties.subject) {
        throw new NonRetriableError(
          "HubSpot CREATE_TICKET: ticketSubject is required.",
        )
      }
      const data = await api.tickets.create({ properties })
      return wrap("CREATE_TICKET", data)
    }
    case "UPDATE_TICKET":
    case "tickets.update": {
      requireId(fields.ticketId || fields.objectId, "ticketId", "UPDATE_TICKET")
      const properties = ticketProperties(fields)
      const data = await api.tickets.update({
        ticketId: fields.ticketId || fields.objectId,
        properties,
      })
      return wrap("UPDATE_TICKET", data)
    }
    case "DELETE_TICKET":
    case "tickets.delete": {
      requireId(fields.ticketId || fields.objectId, "ticketId", "DELETE_TICKET")
      await api.tickets.delete({
        ticketId: fields.ticketId || fields.objectId,
      })
      return {
        operation: "DELETE_TICKET",
        deleted: true,
        ticketId: fields.ticketId || fields.objectId,
      }
    }

    case "GET_ENGAGEMENT":
    case "engagements.get": {
      requireId(
        fields.engagementId || fields.objectId,
        "engagementId",
        "GET_ENGAGEMENT",
      )
      const data = await api.engagements.get({
        engagementId: fields.engagementId || fields.objectId,
      })
      return wrap("GET_ENGAGEMENT", data)
    }
    case "LIST_ENGAGEMENTS":
    case "engagements.getMany": {
      const data = await api.engagements.getMany({ limit, after })
      return wrap("LIST_ENGAGEMENTS", data)
    }
    case "CREATE_NOTE":
    case "CREATE_TASK":
    case "CREATE_CALL":
    case "CREATE_EMAIL_LOG":
    case "CREATE_ENGAGEMENT":
    case "engagements.create": {
      let type = fields.engagementType || "NOTE"
      if (op === "CREATE_NOTE") type = "NOTE"
      if (op === "CREATE_TASK") type = "TASK"
      if (op === "CREATE_CALL") type = "CALL"
      if (op === "CREATE_EMAIL_LOG") type = "EMAIL"
      const body =
        fields.noteBody ||
        fields.taskSubject ||
        fields.callBody ||
        fields.ticketContent ||
        fields.searchQuery
      if (!body.trim()) {
        throw new NonRetriableError(
          "HubSpot CREATE_ENGAGEMENT: body/note/task subject is required.",
        )
      }
      const data = await api.engagements.create({
        engagement: { type, active: true },
        metadata: {
          body,
          subject: fields.taskSubject || fields.ticketSubject || undefined,
        },
        associations: {
          contactIds: fields.contactId
            ? [fields.contactId]
            : undefined,
          companyIds: fields.companyId
            ? [fields.companyId]
            : undefined,
          dealIds: fields.dealId ? [fields.dealId] : undefined,
        },
      })
      return wrap("CREATE_ENGAGEMENT", data)
    }
    case "DELETE_ENGAGEMENT":
    case "engagements.delete": {
      requireId(
        fields.engagementId || fields.objectId,
        "engagementId",
        "DELETE_ENGAGEMENT",
      )
      await api.engagements.delete({
        engagementId: fields.engagementId || fields.objectId,
      })
      return {
        operation: "DELETE_ENGAGEMENT",
        deleted: true,
        engagementId: fields.engagementId || fields.objectId,
      }
    }

    case "ADD_CONTACT_TO_LIST":
    case "contactLists.addContact": {
      requireId(fields.listId, "listId", "ADD_CONTACT_TO_LIST")
      requireId(fields.contactId || fields.objectId, "contactId", "ADD_CONTACT_TO_LIST")
      await api.contactLists.addContact({
        listId: fields.listId,
        contactId: fields.contactId || fields.objectId,
      })
      return {
        operation: "ADD_CONTACT_TO_LIST",
        ok: true,
        listId: fields.listId,
        contactId: fields.contactId || fields.objectId,
      }
    }
    case "REMOVE_CONTACT_FROM_LIST":
    case "contactLists.removeContact": {
      requireId(fields.listId, "listId", "REMOVE_CONTACT_FROM_LIST")
      requireId(
        fields.contactId || fields.objectId,
        "contactId",
        "REMOVE_CONTACT_FROM_LIST",
      )
      await api.contactLists.removeContact({
        listId: fields.listId,
        contactId: fields.contactId || fields.objectId,
      })
      return {
        operation: "REMOVE_CONTACT_FROM_LIST",
        ok: true,
        listId: fields.listId,
        contactId: fields.contactId || fields.objectId,
      }
    }

    default:
      throw new NonRetriableError(
        `Unknown HubSpot Corsair operation: ${fields.operation} (normalized: ${op}). ` +
          (id ? "" : ""),
      )
  }
}
