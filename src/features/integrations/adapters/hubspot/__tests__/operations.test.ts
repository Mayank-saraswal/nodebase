import { describe, expect, it, vi, beforeEach } from "vitest"
import {
  isHubspotCorsairOp,
  runHubspotOperation,
  type HubspotApiClient,
  type ResolvedHubspotFields,
} from "../operations"

function fields(
  overrides: Partial<ResolvedHubspotFields> = {},
): ResolvedHubspotFields {
  return {
    operation: "GET_CONTACT",
    objectId: "",
    contactId: "c1",
    companyId: "",
    dealId: "",
    ticketId: "",
    engagementId: "",
    listId: "",
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    companyName: "",
    domain: "",
    dealName: "",
    amount: "",
    dealStage: "",
    pipeline: "",
    ticketSubject: "",
    ticketContent: "",
    ticketPriority: "",
    noteBody: "",
    taskSubject: "",
    callBody: "",
    propertiesJson: "{}",
    searchQuery: "",
    engagementType: "",
    limit: 100,
    after: "",
    ...overrides,
  }
}

function mockClient(): HubspotApiClient {
  const fn = () => vi.fn().mockResolvedValue({ id: "1", properties: {} })
  return {
    hubspot: {
      api: {
        contacts: {
          get: fn(),
          getMany: vi.fn().mockResolvedValue({ results: [] }),
          create: fn(),
          update: fn(),
          delete: vi.fn().mockResolvedValue(undefined),
          getRecentlyCreated: vi.fn().mockResolvedValue({ results: [] }),
          getRecentlyUpdated: vi.fn().mockResolvedValue({ results: [] }),
          search: vi.fn().mockResolvedValue({ results: [] }),
        },
        companies: {
          get: fn(),
          getMany: vi.fn().mockResolvedValue({ results: [] }),
          create: fn(),
          update: fn(),
          delete: vi.fn().mockResolvedValue(undefined),
          getRecentlyCreated: vi.fn().mockResolvedValue({ results: [] }),
          getRecentlyUpdated: vi.fn().mockResolvedValue({ results: [] }),
          searchByDomain: vi.fn().mockResolvedValue({ results: [] }),
        },
        deals: {
          get: fn(),
          getMany: vi.fn().mockResolvedValue({ results: [] }),
          create: fn(),
          update: fn(),
          delete: vi.fn().mockResolvedValue(undefined),
          getRecentlyCreated: vi.fn().mockResolvedValue({ results: [] }),
          getRecentlyUpdated: vi.fn().mockResolvedValue({ results: [] }),
          search: vi.fn().mockResolvedValue({ results: [] }),
        },
        tickets: {
          get: fn(),
          getMany: vi.fn().mockResolvedValue({ results: [] }),
          create: fn(),
          update: fn(),
          delete: vi.fn().mockResolvedValue(undefined),
        },
        engagements: {
          get: fn(),
          getMany: vi.fn().mockResolvedValue({ results: [] }),
          create: fn(),
          delete: vi.fn().mockResolvedValue(undefined),
        },
        contactLists: {
          addContact: vi.fn().mockResolvedValue(undefined),
          removeContact: vi.fn().mockResolvedValue(undefined),
        },
      },
    },
  }
}

describe("runHubspotOperation (full Corsair surface)", () => {
  let client: HubspotApiClient

  beforeEach(() => {
    client = mockClient()
  })

  it("GET_CONTACT", async () => {
    const out = await runHubspotOperation(client, fields())
    expect(client.hubspot.api.contacts.get).toHaveBeenCalledWith(
      expect.objectContaining({ contactId: "c1" }),
    )
    expect(out.operation).toBe("GET_CONTACT")
  })

  it("CREATE_CONTACT requires email", async () => {
    await expect(
      runHubspotOperation(
        client,
        fields({ operation: "CREATE_CONTACT", email: "", contactId: "" }),
      ),
    ).rejects.toThrow(/email/)
  })

  it("CREATE_CONTACT", async () => {
    await runHubspotOperation(
      client,
      fields({
        operation: "CREATE_CONTACT",
        email: "a@x.com",
        firstName: "Ada",
      }),
    )
    expect(client.hubspot.api.contacts.create).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: expect.objectContaining({
          email: "a@x.com",
          firstname: "Ada",
        }),
      }),
    )
  })

  it("DELETE_CONTACT", async () => {
    const out = await runHubspotOperation(
      client,
      fields({ operation: "DELETE_CONTACT", contactId: "c9" }),
    )
    expect(out.deleted).toBe(true)
  })

  it("SEARCH_CONTACTS requires query", async () => {
    await expect(
      runHubspotOperation(
        client,
        fields({ operation: "SEARCH_CONTACTS", searchQuery: "", email: "" }),
      ),
    ).rejects.toThrow(/searchQuery|email/)
  })

  it("CREATE_COMPANY requires name or domain", async () => {
    await expect(
      runHubspotOperation(
        client,
        fields({ operation: "CREATE_COMPANY", companyName: "", domain: "" }),
      ),
    ).rejects.toThrow(/companyName|domain/)
  })

  it("CREATE_DEAL", async () => {
    await runHubspotOperation(
      client,
      fields({
        operation: "CREATE_DEAL",
        dealName: "Big deal",
        amount: "1000",
        dealStage: "appointmentscheduled",
      }),
    )
    expect(client.hubspot.api.deals.create).toHaveBeenCalled()
  })

  it("UPDATE_DEAL_STAGE maps to deals.update", async () => {
    await runHubspotOperation(
      client,
      fields({
        operation: "UPDATE_DEAL_STAGE",
        dealId: "d1",
        dealStage: "closedwon",
      }),
    )
    expect(client.hubspot.api.deals.update).toHaveBeenCalledWith(
      expect.objectContaining({
        dealId: "d1",
        properties: expect.objectContaining({ dealstage: "closedwon" }),
      }),
    )
  })

  it("CREATE_TICKET requires subject", async () => {
    await expect(
      runHubspotOperation(
        client,
        fields({ operation: "CREATE_TICKET", ticketSubject: "" }),
      ),
    ).rejects.toThrow(/ticketSubject/)
  })

  it("CREATE_NOTE engagement", async () => {
    await runHubspotOperation(
      client,
      fields({
        operation: "CREATE_NOTE",
        noteBody: "Called customer",
        contactId: "c1",
      }),
    )
    expect(client.hubspot.api.engagements.create).toHaveBeenCalled()
  })

  it("ADD_CONTACT_TO_LIST", async () => {
    await runHubspotOperation(
      client,
      fields({
        operation: "ADD_CONTACT_TO_LIST",
        listId: "L1",
        contactId: "c1",
      }),
    )
    expect(client.hubspot.api.contactLists.addContact).toHaveBeenCalledWith(
      expect.objectContaining({ listId: "L1", contactId: "c1" }),
    )
  })

  it("invalid propertiesJson", async () => {
    await expect(
      runHubspotOperation(
        client,
        fields({
          operation: "CREATE_CONTACT",
          email: "a@x.com",
          propertiesJson: "nope",
        }),
      ),
    ).rejects.toThrow(/JSON/)
  })

  it("accepts Corsair path keys", async () => {
    const out = await runHubspotOperation(
      client,
      fields({ operation: "contacts.get", contactId: "c2" }),
    )
    expect(out.operation).toBe("GET_CONTACT")
  })

  it("isHubspotCorsairOp", () => {
    expect(isHubspotCorsairOp("CREATE_CONTACT")).toBe(true)
    expect(isHubspotCorsairOp("GET_CONTACT_PROPERTIES")).toBe(false)
  })

  it("covers list endpoints", async () => {
    await runHubspotOperation(client, fields({ operation: "LIST_CONTACTS" }))
    await runHubspotOperation(client, fields({ operation: "LIST_COMPANIES" }))
    await runHubspotOperation(client, fields({ operation: "LIST_DEALS" }))
    await runHubspotOperation(client, fields({ operation: "LIST_TICKETS" }))
    await runHubspotOperation(client, fields({ operation: "LIST_ENGAGEMENTS" }))
    expect(client.hubspot.api.contacts.getMany).toHaveBeenCalled()
    expect(client.hubspot.api.companies.getMany).toHaveBeenCalled()
    expect(client.hubspot.api.deals.getMany).toHaveBeenCalled()
    expect(client.hubspot.api.tickets.getMany).toHaveBeenCalled()
    expect(client.hubspot.api.engagements.getMany).toHaveBeenCalled()
  })
})
