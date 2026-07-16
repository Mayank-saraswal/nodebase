import { describe, expect, it, vi, beforeEach } from "vitest"
import { GoogleDriveOperation } from "@/features/executions/enums"
import {
  runGoogleDriveOperation,
  type DriveApiClient,
  type ResolvedDriveFields,
} from "../operations"

function baseFields(
  overrides: Partial<ResolvedDriveFields> = {},
): ResolvedDriveFields {
  return {
    operation: GoogleDriveOperation.LIST_FILES,
    fileId: "",
    folderId: "",
    driveId: "",
    fileName: "",
    mimeType: "",
    content: "",
    description: "",
    parents: "",
    query: "",
    pageSize: 50,
    pageToken: "",
    orderBy: "",
    shareType: "",
    shareRole: "",
    shareEmail: "",
    shareDomain: "",
    addParents: "",
    removeParents: "",
    supportsAllDrives: false,
    ...overrides,
  }
}

function mockClient(): DriveApiClient {
  return {
    googledrive: {
      api: {
        files: {
          list: vi.fn().mockResolvedValue({
            files: [{ id: "f1", name: "a.txt", mimeType: "text/plain" }],
          }),
          get: vi.fn().mockResolvedValue({
            id: "f1",
            name: "a.txt",
            mimeType: "text/plain",
          }),
          createFromText: vi.fn().mockResolvedValue({
            id: "f2",
            name: "new.txt",
            mimeType: "text/plain",
          }),
          upload: vi.fn().mockResolvedValue({
            id: "f3",
            name: "up.bin",
            mimeType: "application/octet-stream",
          }),
          update: vi.fn().mockResolvedValue({
            id: "f1",
            name: "renamed.txt",
          }),
          delete: vi.fn().mockResolvedValue(undefined),
          copy: vi.fn().mockResolvedValue({ id: "f4", name: "copy.txt" }),
          move: vi.fn().mockResolvedValue({
            id: "f1",
            name: "a.txt",
            parents: ["folder2"],
          }),
          download: vi.fn().mockResolvedValue("hello world"),
          share: vi.fn().mockResolvedValue({
            id: "perm1",
            role: "reader",
            type: "user",
          }),
        },
        folders: {
          create: vi.fn().mockResolvedValue({
            id: "fold1",
            name: "Docs",
            mimeType: "application/vnd.google-apps.folder",
          }),
          get: vi.fn().mockResolvedValue({
            id: "fold1",
            name: "Docs",
          }),
          list: vi.fn().mockResolvedValue({
            files: [{ id: "fold1", name: "Docs" }],
          }),
          delete: vi.fn().mockResolvedValue(undefined),
          share: vi.fn().mockResolvedValue({ id: "perm2", role: "writer" }),
        },
        sharedDrives: {
          create: vi.fn().mockResolvedValue({ id: "d1", name: "Team" }),
          get: vi.fn().mockResolvedValue({ id: "d1", name: "Team" }),
          list: vi.fn().mockResolvedValue({
            drives: [{ id: "d1", name: "Team" }],
          }),
          update: vi.fn().mockResolvedValue({ id: "d1", name: "Team2" }),
          delete: vi.fn().mockResolvedValue(undefined),
        },
        search: {
          filesAndFolders: vi.fn().mockResolvedValue({
            files: [{ id: "f1", name: "hit" }],
          }),
        },
      },
    },
  }
}

describe("runGoogleDriveOperation (Corsair surface)", () => {
  let client: DriveApiClient

  beforeEach(() => {
    client = mockClient()
  })

  it("LIST_FILES", async () => {
    const out = await runGoogleDriveOperation(
      client,
      baseFields({ operation: GoogleDriveOperation.LIST_FILES }),
    )
    expect(client.googledrive.api.files.list).toHaveBeenCalled()
    expect(out.count).toBe(1)
  })

  it("CREATE_FROM_TEXT requires name", async () => {
    await expect(
      runGoogleDriveOperation(
        client,
        baseFields({
          operation: GoogleDriveOperation.CREATE_FROM_TEXT,
          content: "hi",
        }),
      ),
    ).rejects.toThrow(/fileName/)
  })

  it("CREATE_FROM_TEXT", async () => {
    const out = await runGoogleDriveOperation(
      client,
      baseFields({
        operation: GoogleDriveOperation.CREATE_FROM_TEXT,
        fileName: "n.txt",
        content: "body",
      }),
    )
    expect(client.googledrive.api.files.createFromText).toHaveBeenCalled()
    expect(out.fileId).toBe("f2")
  })

  it("DELETE_FILE", async () => {
    const out = await runGoogleDriveOperation(
      client,
      baseFields({
        operation: GoogleDriveOperation.DELETE_FILE,
        fileId: "f1",
      }),
    )
    expect(client.googledrive.api.files.delete).toHaveBeenCalledWith(
      expect.objectContaining({ fileId: "f1" }),
    )
    expect(out.deleted).toBe(true)
  })

  it("CREATE_FOLDER", async () => {
    const out = await runGoogleDriveOperation(
      client,
      baseFields({
        operation: GoogleDriveOperation.CREATE_FOLDER,
        fileName: "Docs",
      }),
    )
    expect(out.folderId).toBe("fold1")
  })

  it("SHARE_FILE", async () => {
    const out = await runGoogleDriveOperation(
      client,
      baseFields({
        operation: GoogleDriveOperation.SHARE_FILE,
        fileId: "f1",
        shareEmail: "a@x.com",
        shareRole: "reader",
        shareType: "user",
      }),
    )
    expect(out.shared).toBe(true)
    expect(out.permissionId).toBe("perm1")
  })

  it("SEARCH requires query", async () => {
    await expect(
      runGoogleDriveOperation(
        client,
        baseFields({
          operation: GoogleDriveOperation.SEARCH_FILES_AND_FOLDERS,
        }),
      ),
    ).rejects.toThrow(/query/)
  })

  it("SEARCH_FILES_AND_FOLDERS", async () => {
    const out = await runGoogleDriveOperation(
      client,
      baseFields({
        operation: GoogleDriveOperation.SEARCH_FILES_AND_FOLDERS,
        query: "name contains 'x'",
      }),
    )
    expect(client.googledrive.api.search.filesAndFolders).toHaveBeenCalled()
    expect(out.count).toBe(1)
  })

  it("accepts Corsair path keys via registry", async () => {
    const out = await runGoogleDriveOperation(
      client,
      baseFields({ operation: "files.list" }),
    )
    expect(out.operation).toBe("LIST_FILES")
  })

  it("rejects unknown ops", async () => {
    await expect(
      runGoogleDriveOperation(
        client,
        baseFields({ operation: "NOT_A_REAL_OP" }),
      ),
    ).rejects.toThrow(/unknown operation/i)
  })
})
