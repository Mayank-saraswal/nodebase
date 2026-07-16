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

  // ── Edge cases ──

  it("rejects invalid filter JSON", async () => {
    await expect(
      runNotionOperation(
        client,
        fields({ operation: "QUERY_DATABASE", filterJson: "{not-json" }),
      ),
    ).rejects.toThrow(/invalid JSON|filterJson/i)
  })

  it("rejects filter JSON that is an array", async () => {
    await expect(
      runNotionOperation(
        client,
        fields({ operation: "QUERY_DATABASE", filterJson: "[]" }),
      ),
    ).rejects.toThrow(/JSON object/)
  })

  it("rejects invalid properties JSON", async () => {
    await expect(
      runNotionOperation(
        client,
        fields({
          operation: "CREATE_DATABASE_PAGE",
          propertiesJson: "not-json",
        }),
      ),
    ).rejects.toThrow(/invalid JSON|propertiesJson/i)
  })

  it("GET_PAGE requires pageId", async () => {
    await expect(
      runNotionOperation(
        client,
        fields({ operation: "GET_PAGE", pageId: "  " }),
      ),
    ).rejects.toThrow(/pageId/)
  })

  it("ARCHIVE_PAGE requires pageId", async () => {
    await expect(
      runNotionOperation(
        client,
        fields({ operation: "ARCHIVE_PAGE", pageId: "" }),
      ),
    ).rejects.toThrow(/pageId/)
  })

  it("APPEND_BLOCK requires content", async () => {
    await expect(
      runNotionOperation(
        client,
        fields({
          operation: "APPEND_BLOCK",
          pageId: "p1",
          blockContent: "",
        }),
      ),
    ).rejects.toThrow(/blockContent/)
  })

  it("APPEND_BLOCK accepts JSON children array", async () => {
    const children = [
      {
        object: "block",
        type: "heading_1",
        heading_1: {
          rich_text: [{ type: "text", text: { content: "Hi" } }],
        },
      },
    ]
    await runNotionOperation(
      client,
      fields({
        operation: "APPEND_BLOCK",
        pageId: "p1",
        blockContent: JSON.stringify(children),
      }),
    )
    expect(client.notion.api.blocks.appendBlock).toHaveBeenCalledWith(
      expect.objectContaining({
        children: expect.arrayContaining([
          expect.objectContaining({ type: "heading_1" }),
        ]),
      }),
    )
  })

  it("GET_USER requires notionUserId", async () => {
    await expect(
      runNotionOperation(
        client,
        fields({ operation: "GET_USER", notionUserId: "" }),
      ),
    ).rejects.toThrow(/notionUserId/)
  })

  it("CREATE_PAGE requires parent", async () => {
    await expect(
      runNotionOperation(
        client,
        fields({
          operation: "CREATE_PAGE",
          pageId: "",
          databaseId: "",
          parentPageId: "",
        }),
      ),
    ).rejects.toThrow(/parent|databaseId|pageId/i)
  })

  it("SEARCH_DATABASE requires searchQuery", async () => {
    await expect(
      runNotionOperation(
        client,
        fields({ operation: "SEARCH_DATABASE", searchQuery: "" }),
      ),
    ).rejects.toThrow(/searchQuery/)
  })

  it("UPDATE_DATABASE_PAGE with empty properties still calls API", async () => {
    await runNotionOperation(
      client,
      fields({
        operation: "UPDATE_DATABASE_PAGE",
        pageId: "p1",
        propertiesJson: "{}",
      }),
    )
    expect(client.notion.api.databasePages.updateDatabasePage).toHaveBeenCalled()
  })

  it("QUERY_DATABASE with filter and sorts", async () => {
    await runNotionOperation(
      client,
      fields({
        operation: "QUERY_DATABASE",
        filterJson: '{"property":"Status","select":{"equals":"Done"}}',
        sortsJson: '[{"property":"Name","direction":"ascending"}]',
      }),
    )
    expect(
      client.notion.api.databasePages.getManyDatabasePages,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        database_id: "db1",
        filter: expect.any(Object),
        sorts: expect.any(Array),
      }),
    )
  })

  it("GET_BLOCK_CHILDREN falls back to pageId", async () => {
    await runNotionOperation(
      client,
      fields({
        operation: "GET_BLOCK_CHILDREN",
        pageId: "page-1",
        blockId: "",
      }),
    )
    expect(client.notion.api.blocks.getManyChildBlocks).toHaveBeenCalledWith(
      expect.objectContaining({ block_id: "page-1" }),
    )
  })
})
