import { NonRetriableError, RetryAfterError } from "inngest"
import type { NodeExecutor } from "@/features/executions/types"
import { resolveTemplate } from "@/features/executions/lib/template-resolver"
import prisma from "@/lib/db"
import { decrypt } from "@/lib/encryption"
import { zohoCrmChannel } from "./channels"

const ZOHO_API_BASE: Record<string, string> = {
  in: "https://www.zohoapis.in/crm/v6",
  com: "https://www.zohoapis.com/crm/v6",
  eu: "https://www.zohoapis.eu/crm/v6",
  au: "https://www.zohoapis.com.au/crm/v6",
  jp: "https://www.zohoapis.jp/crm/v6",
  uk: "https://www.zohoapis.uk/crm/v6",
}

const ZOHO_ACCOUNTS_BASE: Record<string, string> = {
  in: "https://accounts.zoho.in",
  com: "https://accounts.zoho.com",
  eu: "https://accounts.zoho.eu",
  au: "https://accounts.zoho.com.au",
  jp: "https://accounts.zoho.jp",
  uk: "https://accounts.zoho.uk",
}

const DEFAULT_ZOHO_VARIABLE_NAME = "zoho"
// Zoho's lead conversion API accepts a default deal stage when createDeal is enabled.
const DEFAULT_CONVERT_LEAD_STAGE = "Qualification"

function parseCustomFields(
  raw: string,
  context: Record<string, unknown>,
  operationName: string
): Record<string, unknown> {
  const resolved = resolveTemplate(raw, context) as string
  if (!resolved || resolved.trim() === "{}") return {}
  try {
    const parsed = JSON.parse(resolved)
    if (typeof parsed !== "object" || Array.isArray(parsed) || parsed === null) {
      throw new Error("not an object")
    }
    return parsed as Record<string, unknown>
  } catch {
    throw new NonRetriableError(
      `Zoho CRM ${operationName}: Custom Fields contains invalid JSON. ` +
      `Expected format: {"Field_Name": "value"}. Got: ${resolved.substring(0, 100)}`
    )
  }
}

function parseAmount(
  raw: string,
  context: Record<string, unknown>,
  fieldLabel: string,
  operationName: string
): number | undefined {
  const resolved = resolveTemplate(raw, context) as string
  if (!resolved) return undefined
  const num = parseFloat(resolved)
  if (isNaN(num)) {
    throw new NonRetriableError(
      `Zoho CRM ${operationName}: ${fieldLabel} "${resolved}" is not a valid number. ` +
      `Use a number or a template variable that resolves to a number (e.g. {{razorpayTrigger.payload.payment.entity.amount}}).`
    )
  }
  return num
}

async function refreshZohoToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
  region: string
): Promise<string> {
  const base = ZOHO_ACCOUNTS_BASE[region] ?? ZOHO_ACCOUNTS_BASE.com
  const params = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  })

  const res = await fetch(`${base}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  })

  if (!res.ok) {
    throw new NonRetriableError(
      `Zoho CRM: OAuth token refresh failed (${res.status}). Check clientId and clientSecret.`
    )
  }

  const data = (await res.json()) as { access_token?: string; error?: string }

  if (data.error === "invalid_client") {
    throw new NonRetriableError("Zoho CRM: Invalid client ID or secret.")
  }

  if (data.error === "invalid_code") {
    throw new NonRetriableError(
      "Zoho CRM: Refresh token is invalid or expired. Re-authorize in Zoho API Console."
    )
  }

  if (data.error) {
    throw new NonRetriableError(`Zoho CRM OAuth error: ${data.error}`)
  }

  if (!data.access_token) {
    throw new NonRetriableError("Zoho CRM: No access_token returned from OAuth.")
  }

  return data.access_token
}

async function zohoApi(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  accessToken: string,
  region: string,
  body?: unknown,
  queryParams?: Record<string, string | number>
): Promise<Record<string, unknown>> {
  const base = ZOHO_API_BASE[region] ?? ZOHO_API_BASE.com
  const url = new URL(`${base}${path}`)

  if (queryParams) {
    Object.entries(queryParams).forEach(([key, value]) => {
      url.searchParams.set(key, String(value))
    })
  }

  const res = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 429) {
    const retryAfter = res.headers.get("Retry-After")
    throw new RetryAfterError(
      "Zoho CRM: Rate limit exceeded",
      retryAfter ? parseInt(retryAfter, 10) * 1000 : 60_000
    )
  }

  if (res.status === 401) {
    throw new NonRetriableError("Zoho CRM: Access token rejected. Verify credentials and region.")
  }

  if (res.status === 204) {
    return { success: true }
  }

  const data = (await res.json()) as Record<string, unknown>

  if (
    data.status === "error" &&
    typeof data.code === "string" &&
    !["SUCCESS", "APPROVED"].includes(data.code)
  ) {
    const message = typeof data.message === "string" ? data.message : String(data.code)
    throw new NonRetriableError(`Zoho CRM API error: ${message}`)
  }

  return data
}

export const zohoCrmExecutor: NodeExecutor = async ({ data, nodeId, context, step, publish }) => {
  const config = data as any;

await step.run(`zoho-crm-${nodeId}-validate`, async () => {
    if (!config) {
      throw new NonRetriableError("Zoho CRM node not configured")
    }

    if (!config.credentialId || !config.credential) {
      throw new NonRetriableError(
        "Zoho CRM: No credential connected. Add a Zoho CRM credential from the credentials page."
      )
    }

    return { valid: true }
  })

  return await step.run(`zoho-crm-${nodeId}-execute`, async () => {
    await publish(await zohoCrmChannel(nodeId)().status({ status: "loading", nodeId }))

    try {
      const { clientId, clientSecret, refreshToken, region } = JSON.parse(decrypt(config!.credential!.value)) as {
        clientId: string
        clientSecret: string
        refreshToken: string
        region: string
      }

      const accessToken = await refreshZohoToken(clientId, clientSecret, refreshToken, region)

      const r = (field: string) => resolveTemplate(field, context) as string
      const variableName = config!.variableName || DEFAULT_ZOHO_VARIABLE_NAME
      let result: unknown

      switch (config!.operation) {
        case "CREATE_LEAD": {
          if (!r(config!.lastName)) {
            throw new NonRetriableError("Zoho CRM CREATE_LEAD: Last Name is required")
          }

          const customFields = parseCustomFields(config!.customFields, context, "CREATE_LEAD")

          const res = await zohoApi("POST", "/Leads", accessToken, region, {
            data: [{
              First_Name: r(config!.firstName) || undefined,
              Last_Name: r(config!.lastName),
              Email: r(config!.email) || undefined,
              Phone: r(config!.phone) || undefined,
              Mobile: r(config!.mobile) || undefined,
              Company: r(config!.company) || undefined,
              Title: r(config!.title) || undefined,
              Website: r(config!.website) || undefined,
              Lead_Source: r(config!.leadSource) || undefined,
              Lead_Status: r(config!.leadStatus) || undefined,
              Industry: r(config!.industry) || undefined,
              Annual_Revenue: parseAmount(config!.annualRevenue, context, "Annual Revenue", "CREATE_LEAD"),
              No_of_Employees: r(config!.noOfEmployees) ? parseInt(r(config!.noOfEmployees), 10) : undefined,
              Rating: r(config!.rating) || undefined,
              Description: r(config!.description) || undefined,
              Street: r(config!.street) || undefined,
              City: r(config!.city) || undefined,
              State: r(config!.state) || undefined,
              Country: r(config!.country) || undefined,
              Zip_Code: r(config!.zipCode) || undefined,
              ...customFields,
            }],
          })

          const item = (res.data as { code: string; details: { id: string }; message: string }[])?.[0]
          if (item?.code !== "SUCCESS") {
            throw new NonRetriableError(`Zoho CRM CREATE_LEAD failed: ${item?.message}`)
          }

          result = { success: true, leadId: item.details.id }
          break
        }

        case "GET_LEAD": {
          const id = r(config!.recordId)
          if (!id) {
            throw new NonRetriableError("Zoho CRM GET_LEAD: Record ID is required")
          }

          const res = await zohoApi("GET", `/Leads/${id}`, accessToken, region)
          result = { success: true, lead: (res.data as unknown[])?.[0] ?? null }
          break
        }

        case "UPDATE_LEAD": {
          const id = r(config!.recordId)
          if (!id) {
            throw new NonRetriableError("Zoho CRM UPDATE_LEAD: Record ID is required")
          }

          const customFields = parseCustomFields(config!.customFields, context, "UPDATE_LEAD")
          const updateData: Record<string, unknown> = { id, ...customFields }

          if (r(config!.firstName)) updateData.First_Name = r(config!.firstName)
          if (r(config!.lastName)) updateData.Last_Name = r(config!.lastName)
          if (r(config!.email)) updateData.Email = r(config!.email)
          if (r(config!.phone)) updateData.Phone = r(config!.phone)
          if (r(config!.mobile)) updateData.Mobile = r(config!.mobile)
          if (r(config!.company)) updateData.Company = r(config!.company)
          if (r(config!.leadSource)) updateData.Lead_Source = r(config!.leadSource)
          if (r(config!.leadStatus)) updateData.Lead_Status = r(config!.leadStatus)
          if (r(config!.description)) updateData.Description = r(config!.description)

          const res = await zohoApi("PUT", "/Leads", accessToken, region, { data: [updateData] })
          const item = (res.data as { code: string }[])?.[0]
          result = { success: item?.code === "SUCCESS", leadId: id }
          break
        }

        case "DELETE_LEAD": {
          const id = r(config!.recordId)
          if (!id) {
            throw new NonRetriableError("Zoho CRM DELETE_LEAD: Record ID is required")
          }

          await zohoApi("DELETE", `/Leads?ids=${id}`, accessToken, region)
          result = { success: true, deleted: true, leadId: id }
          break
        }

        case "SEARCH_LEADS": {
          const term = r(config!.searchTerm)
          const field = r(config!.searchField) || "Email"
          const criteria = r(config!.criteria)
          const queryParams: Record<string, string | number> = {
            page: config!.page ?? 1,
            per_page: config!.perPage ?? 10,
          }

          if (criteria) queryParams.criteria = criteria
          else if (term) queryParams[field.toLowerCase()] = term

          const res = await zohoApi("GET", "/Leads/search", accessToken, region, undefined, queryParams)
          const leads = (res.data as unknown[]) ?? []
          result = { success: true, leads, count: leads.length, info: res.info }
          break
        }

        case "CONVERT_LEAD": {
          const id = r(config!.recordId)
          if (!id) {
            throw new NonRetriableError("Zoho CRM CONVERT_LEAD: Lead Record ID is required")
          }

          const convertPayload: Record<string, unknown> = { overwrite: config!.overwrite }

          if (config!.createDeal) {
            convertPayload.Deals = {
              Deal_Name: r(config!.dealName) || undefined,
              Closing_Date: r(config!.closingDate) || undefined,
              Amount: parseAmount(config!.dealAmount, context, "Amount", "CONVERT_LEAD"),
              Stage: r(config!.dealStage) || DEFAULT_CONVERT_LEAD_STAGE,
            }
          }

          const res = await zohoApi(
            "POST",
            `/Leads/${id}/actions/convert`,
            accessToken,
            region,
            { data: [convertPayload] }
          )

          const item = (res.data as { Contacts: string; Accounts: string; Deals?: string }[])?.[0]
          result = {
            success: true,
            contactId: item?.Contacts,
            accountId: item?.Accounts,
            dealId: item?.Deals ?? null,
          }
          break
        }

        case "CREATE_CONTACT": {
          if (!r(config!.lastName)) {
            throw new NonRetriableError("Zoho CRM CREATE_CONTACT: Last Name is required")
          }

          const customFields = parseCustomFields(config!.customFields, context, "CREATE_CONTACT")

          const res = await zohoApi("POST", "/Contacts", accessToken, region, {
            data: [{
              First_Name: r(config!.firstName) || undefined,
              Last_Name: r(config!.lastName),
              Email: r(config!.email) || undefined,
              Phone: r(config!.phone) || undefined,
              Mobile: r(config!.mobile) || undefined,
              Title: r(config!.title) || undefined,
              Account_Name: r(config!.accountName) ? { name: r(config!.accountName) } : undefined,
              Lead_Source: r(config!.leadSource) || undefined,
              Description: r(config!.description) || undefined,
              Mailing_Street: r(config!.street) || undefined,
              Mailing_City: r(config!.city) || undefined,
              Mailing_State: r(config!.state) || undefined,
              Mailing_Country: r(config!.country) || undefined,
              Mailing_Zip: r(config!.zipCode) || undefined,
              ...customFields,
            }],
          })

          const item = (res.data as { code: string; details: { id: string }; message: string }[])?.[0]
          if (item?.code !== "SUCCESS") {
            throw new NonRetriableError(`Zoho CRM CREATE_CONTACT failed: ${item?.message}`)
          }

          result = { success: true, contactId: item.details.id }
          break
        }

        case "GET_CONTACT": {
          const id = r(config!.recordId)
          if (!id) {
            throw new NonRetriableError("Zoho CRM GET_CONTACT: Record ID is required")
          }

          const res = await zohoApi("GET", `/Contacts/${id}`, accessToken, region)
          result = { success: true, contact: (res.data as unknown[])?.[0] ?? null }
          break
        }

        case "UPDATE_CONTACT": {
          const id = r(config!.recordId)
          if (!id) {
            throw new NonRetriableError("Zoho CRM UPDATE_CONTACT: Record ID is required")
          }

          const customFields = parseCustomFields(config!.customFields, context, "UPDATE_CONTACT")
          const updateData: Record<string, unknown> = { id, ...customFields }

          if (r(config!.firstName)) updateData.First_Name = r(config!.firstName)
          if (r(config!.lastName)) updateData.Last_Name = r(config!.lastName)
          if (r(config!.email)) updateData.Email = r(config!.email)
          if (r(config!.phone)) updateData.Phone = r(config!.phone)
          if (r(config!.mobile)) updateData.Mobile = r(config!.mobile)
          if (r(config!.title)) updateData.Title = r(config!.title)
          if (r(config!.description)) updateData.Description = r(config!.description)

          const res = await zohoApi("PUT", "/Contacts", accessToken, region, { data: [updateData] })
          result = { success: (res.data as { code: string }[])?.[0]?.code === "SUCCESS", contactId: id }
          break
        }

        case "DELETE_CONTACT": {
          const id = r(config!.recordId)
          if (!id) {
            throw new NonRetriableError("Zoho CRM DELETE_CONTACT: Record ID is required")
          }

          await zohoApi("DELETE", `/Contacts?ids=${id}`, accessToken, region)
          result = { success: true, deleted: true, contactId: id }
          break
        }

        case "SEARCH_CONTACTS": {
          const term = r(config!.searchTerm)
          const field = r(config!.searchField) || "Email"
          const criteria = r(config!.criteria)
          const queryParams: Record<string, string | number> = {
            page: config!.page ?? 1,
            per_page: config!.perPage ?? 10,
          }

          if (criteria) queryParams.criteria = criteria
          else if (term) queryParams[field.toLowerCase()] = term

          const res = await zohoApi("GET", "/Contacts/search", accessToken, region, undefined, queryParams)
          const contacts = (res.data as unknown[]) ?? []
          result = { success: true, contacts, count: contacts.length }
          break
        }

        case "GET_CONTACT_DEALS": {
          const id = r(config!.recordId)
          if (!id) {
            throw new NonRetriableError("Zoho CRM GET_CONTACT_DEALS: Contact Record ID is required")
          }

          const res = await zohoApi("GET", `/Contacts/${id}/Deals`, accessToken, region, undefined, {
            page: config!.page ?? 1,
            per_page: config!.perPage ?? 10,
          })

          const deals = (res.data as unknown[]) ?? []
          result = { success: true, deals, count: deals.length }
          break
        }

        // ══════════════════════════════════════════════════════
        // DEALS (6 operations)
        // ══════════════════════════════════════════════════════

        case "CREATE_DEAL": {
          if (!r(config!.dealName)) throw new NonRetriableError("Zoho CRM CREATE_DEAL: Deal Name is required")
          if (!r(config!.dealStage)) throw new NonRetriableError("Zoho CRM CREATE_DEAL: Stage is required")
          const customFields = parseCustomFields(config!.customFields, context, "CREATE_DEAL")
          const res = await zohoApi("POST", "/Deals", accessToken, region, {
            data: [{
              Deal_Name: r(config!.dealName),
              Stage: r(config!.dealStage),
              Amount: parseAmount(config!.dealAmount, context, "Amount", "CREATE_DEAL"),
              Closing_Date: r(config!.closingDate) || undefined,
              Account_Name: r(config!.accountName) ? { name: r(config!.accountName) } : undefined,
              Contact_Name: r(config!.contactName) ? { name: r(config!.contactName) } : undefined,
              Probability: parseAmount(config!.probability, context, "Probability", "CREATE_DEAL"),
              Deal_Type: r(config!.dealType) || undefined,
              Lead_Source: r(config!.leadSource) || undefined,
              Description: r(config!.description) || undefined,
              ...customFields,
            }],
          })
          const item = (res.data as { code: string; details: { id: string }; message: string }[])?.[0]
          if (item?.code !== "SUCCESS") throw new NonRetriableError(`Zoho CRM CREATE_DEAL failed: ${item?.message}`)
          result = { success: true, dealId: item.details.id }
          break
        }

        case "GET_DEAL": {
          const id = r(config!.recordId)
          if (!id) throw new NonRetriableError("Zoho CRM GET_DEAL: Deal Record ID is required")
          const res = await zohoApi("GET", `/Deals/${id}`, accessToken, region)
          result = { success: true, deal: (res.data as unknown[])?.[0] ?? null }
          break
        }

        case "UPDATE_DEAL": {
          const id = r(config!.recordId)
          if (!id) throw new NonRetriableError("Zoho CRM UPDATE_DEAL: Deal Record ID is required")
          const customFields = parseCustomFields(config!.customFields, context, "UPDATE_DEAL")
          const updateData: Record<string, unknown> = { id, ...customFields }
          if (r(config!.dealName)) updateData.Deal_Name = r(config!.dealName)
          if (r(config!.dealStage)) updateData.Stage = r(config!.dealStage)
          const dealAmount = parseAmount(config!.dealAmount, context, "Amount", "UPDATE_DEAL")
          if (dealAmount !== undefined) updateData.Amount = dealAmount
          if (r(config!.closingDate)) updateData.Closing_Date = r(config!.closingDate)
          const probability = parseAmount(config!.probability, context, "Probability", "UPDATE_DEAL")
          if (probability !== undefined) updateData.Probability = probability
          if (r(config!.description)) updateData.Description = r(config!.description)
          const res = await zohoApi("PUT", "/Deals", accessToken, region, { data: [updateData] })
          result = { success: (res.data as { code: string }[])?.[0]?.code === "SUCCESS", dealId: id }
          break
        }

        case "DELETE_DEAL": {
          const id = r(config!.recordId)
          if (!id) throw new NonRetriableError("Zoho CRM DELETE_DEAL: Deal Record ID is required")
          await zohoApi("DELETE", `/Deals?ids=${id}`, accessToken, region)
          result = { success: true, deleted: true, dealId: id }
          break
        }

        case "SEARCH_DEALS": {
          const term = r(config!.searchTerm)
          const criteria = r(config!.criteria)
          const qp: Record<string, string | number> = { page: config!.page ?? 1, per_page: config!.perPage ?? 10 }
          if (criteria) qp.criteria = criteria
          else if (term) qp.word = term
          const res = await zohoApi("GET", "/Deals/search", accessToken, region, undefined, qp)
          const deals = (res.data as unknown[]) ?? []
          result = { success: true, deals, count: deals.length }
          break
        }

        case "UPDATE_DEAL_STAGE": {
          const id = r(config!.recordId)
          const stage = r(config!.dealStage)
          if (!id) throw new NonRetriableError("Zoho CRM UPDATE_DEAL_STAGE: Deal Record ID is required")
          if (!stage) throw new NonRetriableError("Zoho CRM UPDATE_DEAL_STAGE: Stage is required")
          const res = await zohoApi("PUT", "/Deals", accessToken, region, { data: [{ id, Stage: stage }] })
          result = { success: (res.data as { code: string }[])?.[0]?.code === "SUCCESS", dealId: id, newStage: stage }
          break
        }

        // ══════════════════════════════════════════════════════
        // ACCOUNTS (5 operations)
        // ══════════════════════════════════════════════════════

        case "CREATE_ACCOUNT": {
          if (!r(config!.accountName)) throw new NonRetriableError("Zoho CRM CREATE_ACCOUNT: Account Name is required")
          const customFields = parseCustomFields(config!.customFields, context, "CREATE_ACCOUNT")
          const res = await zohoApi("POST", "/Accounts", accessToken, region, {
            data: [{
              Account_Name: r(config!.accountName),
              Phone: r(config!.phone) || undefined,
              Website: r(config!.website) || undefined,
              Industry: r(config!.industry) || undefined,
              Description: r(config!.description) || undefined,
              Billing_City: r(config!.billingCity) || undefined,
              Billing_State: r(config!.billingState) || undefined,
              Billing_Country: r(config!.country) || undefined,
              Owner: r(config!.accountOwner) ? { name: r(config!.accountOwner) } : undefined,
              ...customFields,
            }],
          })
          const item = (res.data as { code: string; details: { id: string }; message: string }[])?.[0]
          if (item?.code !== "SUCCESS") throw new NonRetriableError(`Zoho CRM CREATE_ACCOUNT failed: ${item?.message}`)
          result = { success: true, accountId: item.details.id }
          break
        }

        case "GET_ACCOUNT": {
          const id = r(config!.recordId)
          if (!id) throw new NonRetriableError("Zoho CRM GET_ACCOUNT: Account Record ID is required")
          const res = await zohoApi("GET", `/Accounts/${id}`, accessToken, region)
          result = { success: true, account: (res.data as unknown[])?.[0] ?? null }
          break
        }

        case "UPDATE_ACCOUNT": {
          const id = r(config!.recordId)
          if (!id) throw new NonRetriableError("Zoho CRM UPDATE_ACCOUNT: Account Record ID is required")
          const customFields = parseCustomFields(config!.customFields, context, "UPDATE_ACCOUNT")
          const updateData: Record<string, unknown> = { id, ...customFields }
          if (r(config!.accountName)) updateData.Account_Name = r(config!.accountName)
          if (r(config!.phone)) updateData.Phone = r(config!.phone)
          if (r(config!.website)) updateData.Website = r(config!.website)
          if (r(config!.description)) updateData.Description = r(config!.description)
          if (r(config!.accountOwner)) updateData.Owner = { name: r(config!.accountOwner) }
          const res = await zohoApi("PUT", "/Accounts", accessToken, region, { data: [updateData] })
          result = { success: (res.data as { code: string }[])?.[0]?.code === "SUCCESS", accountId: id }
          break
        }

        case "DELETE_ACCOUNT": {
          const id = r(config!.recordId)
          if (!id) throw new NonRetriableError("Zoho CRM DELETE_ACCOUNT: Account Record ID is required")
          await zohoApi("DELETE", `/Accounts?ids=${id}`, accessToken, region)
          result = { success: true, deleted: true, accountId: id }
          break
        }

        case "SEARCH_ACCOUNTS": {
          const term = r(config!.searchTerm)
          const criteria = r(config!.criteria)
          const qp: Record<string, string | number> = { page: config!.page ?? 1, per_page: config!.perPage ?? 10 }
          if (criteria) qp.criteria = criteria
          else if (term) qp.word = term
          const res = await zohoApi("GET", "/Accounts/search", accessToken, region, undefined, qp)
          const accounts = (res.data as unknown[]) ?? []
          result = { success: true, accounts, count: accounts.length }
          break
        }

        // ══════════════════════════════════════════════════════
        // ACTIVITIES (4 operations)
        // ══════════════════════════════════════════════════════

        case "CREATE_TASK": {
          if (!r(config!.subject)) throw new NonRetriableError("Zoho CRM CREATE_TASK: Subject is required")
          const res = await zohoApi("POST", "/Tasks", accessToken, region, {
            data: [{
              Subject: r(config!.subject),
              Due_Date: r(config!.dueDate) || undefined,
              Status: r(config!.status) || "Not Started",
              Priority: r(config!.priority) || "High",
              Description: r(config!.description) || undefined,
              Who_Id: r(config!.whoId)
                ? { id: r(config!.whoId), module: { api_name: r(config!.whoModule) || "Contacts" } }
                : undefined,
              What_Id: r(config!.whatId)
                ? { id: r(config!.whatId), module: { api_name: r(config!.whatModule) || "Deals" } }
                : undefined,
            }],
          })
          const item = (res.data as { code: string; details: { id: string } }[])?.[0]
          result = { success: true, taskId: item?.details?.id }
          break
        }

        case "CREATE_CALL_LOG": {
          if (!r(config!.subject)) throw new NonRetriableError("Zoho CRM CREATE_CALL_LOG: Subject is required")
          const res = await zohoApi("POST", "/Calls", accessToken, region, {
            data: [{
              Subject: r(config!.subject),
              Call_Duration: r(config!.callDuration) || "0:01",
              Call_Type: r(config!.callDirection) || "Outbound",
              Call_Result: r(config!.callResult) || undefined,
              Call_Start_Time: r(config!.callStartTime) || new Date().toISOString(),
              Description: r(config!.callDescription) || undefined,
              Who_Id: r(config!.whoId)
                ? { id: r(config!.whoId), module: { api_name: r(config!.whoModule) || "Contacts" } }
                : undefined,
              What_Id: r(config!.whatId)
                ? { id: r(config!.whatId), module: { api_name: r(config!.whatModule) || "Deals" } }
                : undefined,
            }],
          })
          const item = (res.data as { code: string; details: { id: string } }[])?.[0]
          result = { success: true, callId: item?.details?.id }
          break
        }

        case "CREATE_MEETING": {
          if (!r(config!.subject)) throw new NonRetriableError("Zoho CRM CREATE_MEETING: Subject is required")
          if (!r(config!.meetingStart)) throw new NonRetriableError("Zoho CRM CREATE_MEETING: Start DateTime is required")
          const participantsRaw = r(config!.participants) || "[]"
          let participantEmails: string[] = []
          try {
            participantEmails = JSON.parse(participantsRaw) as string[]
          } catch {
            participantEmails = participantsRaw
              .split(",")
              .map((email) => email.trim())
              .filter(Boolean)
          }
          const res = await zohoApi("POST", "/Events", accessToken, region, {
            data: [{
              Event_Title: r(config!.subject),
              Start_DateTime: r(config!.meetingStart),
              End_DateTime: r(config!.meetingEnd) || new Date(Date.now() + 3_600_000).toISOString(),
              Agenda: r(config!.meetingAgenda) || undefined,
              Participants: participantEmails.map(email => ({ Email: email, type: "contact" })),
              What_Id: r(config!.whatId)
                ? { id: r(config!.whatId), module: { api_name: r(config!.whatModule) || "Deals" } }
                : undefined,
            }],
          })
          const item = (res.data as { code: string; details: { id: string } }[])?.[0]
          result = { success: true, meetingId: item?.details?.id }
          break
        }

        case "GET_ACTIVITIES": {
          const id = r(config!.recordId)
          const module = r(config!.module) || "Contacts"
          if (!id) throw new NonRetriableError("Zoho CRM GET_ACTIVITIES: Record ID is required")
          const res = await zohoApi("GET", `/${module}/${id}/Activities`, accessToken, region, undefined, {
            page: config!.page ?? 1, per_page: config!.perPage ?? 10,
          })
          const activities = (res.data as unknown[]) ?? []
          result = { success: true, activities, count: activities.length }
          break
        }

        // ══════════════════════════════════════════════════════
        // NOTES (2 operations)
        // ══════════════════════════════════════════════════════

        case "ADD_NOTE": {
          const parentId = r(config!.recordId)
          if (!parentId) throw new NonRetriableError("Zoho CRM ADD_NOTE: Parent Record ID is required")
          if (!r(config!.noteContent)) throw new NonRetriableError("Zoho CRM ADD_NOTE: Note Content is required")
          const res = await zohoApi("POST", "/Notes", accessToken, region, {
            data: [{
              Note_Title: r(config!.noteTitle) || undefined,
              Note_Content: r(config!.noteContent),
              Parent_Id: {
                id: parentId,
                module: { api_name: r(config!.parentModule) || "Leads" },
              },
            }],
          })
          const item = (res.data as { code: string; details: { id: string } }[])?.[0]
          result = { success: true, noteId: item?.details?.id }
          break
        }

        case "GET_NOTES": {
          const id = r(config!.recordId)
          const module = r(config!.parentModule) || "Leads"
          if (!id) throw new NonRetriableError("Zoho CRM GET_NOTES: Record ID is required")
          const res = await zohoApi("GET", `/${module}/${id}/Notes`, accessToken, region, undefined, {
            page: config!.page ?? 1, per_page: config!.perPage ?? 10,
          })
          const notes = (res.data as unknown[]) ?? []
          result = { success: true, notes, count: notes.length }
          break
        }

        // ══════════════════════════════════════════════════════
        // ADVANCED (3 operations)
        // ══════════════════════════════════════════════════════

        case "UPSERT_RECORD": {
          const module = r(config!.module) || "Leads"
          const dupField = r(config!.duplicateCheckField) || "Email"
          const customFields = parseCustomFields(config!.customFields, context, "UPSERT_RECORD")
          const res = await zohoApi("POST", `/${module}/upsert`, accessToken, region, {
            data: [{
              First_Name: r(config!.firstName) || undefined,
              Last_Name: r(config!.lastName) || undefined,
              Email: r(config!.email) || undefined,
              Phone: r(config!.phone) || undefined,
              ...customFields,
            }],
            duplicate_check_fields: [dupField],
          })
          const item = (res.data as { code: string; details: { id: string }; action: string }[])?.[0]
          result = { success: true, recordId: item?.details?.id, action: item?.action }
          break
        }

        case "SEARCH_RECORDS": {
          const module = r(config!.module) || "Leads"
          const term = r(config!.searchTerm)
          const criteria = r(config!.criteria)
          const qp: Record<string, string | number> = { page: config!.page ?? 1, per_page: config!.perPage ?? 10 }
          if (criteria) qp.criteria = criteria
          else if (term) qp.word = term
          const res = await zohoApi("GET", `/${module}/search`, accessToken, region, undefined, qp)
          const records = (res.data as unknown[]) ?? []
          result = { success: true, records, count: records.length, info: res.info }
          break
        }

        case "GET_FIELDS": {
          const module = r(config!.module) || "Leads"
          const res = await zohoApi("GET", `/settings/fields?module=${module}`, accessToken, region)
          result = { success: true, fields: (res.fields as unknown[]) ?? [] }
          break
        }

        default:
          throw new NonRetriableError(`Zoho CRM: Unknown operation "${config!.operation}"`)

      } // end switch

      await publish(await zohoCrmChannel(nodeId)().status({ status: "success", nodeId }))
      return { ...context, [variableName]: result }

    } catch (err) {
      await publish(await zohoCrmChannel(nodeId)().status({ status: "error", nodeId }))

      if (config?.continueOnFail) {
        return {
          ...context,
          [config.variableName || DEFAULT_ZOHO_VARIABLE_NAME]: {
            success: false,
            error: err instanceof Error ? err.message : String(err),
          },
        }
      }
      throw err
    }
  }) // end step.run execute
} // end zohoCrmExecutor
