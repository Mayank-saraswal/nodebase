import { describe, expect, it, vi, beforeEach } from "vitest"
import {
  isNotionCorsairOp,
  runNotionOperation,
  type NotionApiClient,
  type ResolvedNotionFields,
} from "../operations"

function fields(
  overrides: Partial<ResolvedNotionFields> = {},
): ResolvedNotionFields {
  return {
    operation: "QUERY_DATABASE",
    databaseId: "db1",
    pageId: "",
    blockId: "",
    blockContent: "",
    searchQuery: "",
    filterJson: "{}",
    sortsJson: "[]",
    propertiesJson: "{}",
    notionUserId: "",
    pageSize: 100,
    startCursor: "",
    parentPageId: "",
    ...overrides,
  }
}

function mockClient(): NotionApiClient {
  return {
    notion: {
      api: {
        databases: {
          getDatabase: vi.fn().mockResolvedValue({ id: "db1", object: "database" }),
          getManyDatabases: vi.fn().mockResolvedValue({ results: [] }),
          searchDatabase: vi.fn().mockResolvedValue({ results: [] }),
        },
        databasePages: {
          createDatabasePage: vi.fn().mockResolvedValue({ id: "p1", url: "https://notion.so/p1" }),
          getDatabasePage: vi.fn().mockResolvedValue({ id: "p1" }),
          getManyDatabasePages: vi.fn().mockResolvedValue({
            results: [{ id: "p1" }],
            has_more: false,
          }),
          updateDatabasePage: vi.fn().mockResolvedValue({ id: "p1" }),
        },
        pages: {
          archivePage: vi.fn().mockResolvedValue({ id: "p1", archived: true }),
          createPage: vi.fn().mockResolvedValue({ id: "p2" }),
          searchPage: vi.fn().mockResolvedValue({ results: [] }),
        },
        blocks: {
          appendBlock: vi.fn().mockResolvedValue({ results: [] }),
          getManyChildBlocks: vi.fn().mockResolvedValue({ results: [] }),
        },
        users: {
          getUser: vi.fn().mockResolvedValue({ id: "u1", name: "Ada" }),
          getManyUsers: vi.fn().mockResolvedValue({ results: [] }),
        },
      },
    },
  }
}

describe("runNotionOperation", () => {
  let client: NotionApiClient

  beforeEach(() => {
    client = mockClient()
  })

  it("QUERY_DATABASE", async () => {
    const out = await runNotionOperation(client, fields())
    expect(client.notion.api.databasePages.getManyDatabasePages).toHaveBeenCalled()
    expect(out.operation).toBe("QUERY_DATABASE")
  })

  it("CREATE_DATABASE_PAGE requires databaseId", async () => {
    await expect(
      runNotionOperation(
        client,
        fields({
          operation: "CREATE_DATABASE_PAGE",
          databaseId: "",
          propertiesJson: '{"Name":{"title":[{"text":{"content":"Hi"}}]}}',
        }),
      ),
    ).rejects.toThrow(/databaseId/)
  })

  it("APPEND_BLOCK from plain text", async () => {
    await runNotionOperation(
      client,
      fields({
        operation: "APPEND_BLOCK",
        pageId: "p1",
        blockContent: "Hello world",
      }),
    )
    expect(client.notion.api.blocks.appendBlock).toHaveBeenCalledWith(
      expect.objectContaining({
        block_id: "p1",
        children: expect.any(Array),
      }),
    )
  })

  it("GET_USER", async () => {
    const out = await runNotionOperation(
      client,
      fields({ operation: "GET_USER", notionUserId: "u1" }),
    )
    expect(out.operation).toBe("GET_USER")
  })

  it("accepts Corsair path keys", async () => {
    const out = await runNotionOperation(
      client,
      fields({ operation: "databases.getDatabase" }),
    )
    expect(out.operation).toBe("GET_DATABASE")
  })

  it("isNotionCorsairOp", () => {
    expect(isNotionCorsairOp("QUERY_DATABASE")).toBe(true)
    expect(isNotionCorsairOp("NOT_REAL")).toBe(false)
  })
})
