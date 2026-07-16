/**
 * Google Drive Corsair operations — full @corsair-dev/googledrive surface.
 * Client shape: tenant.googledrive.api.files|folders|sharedDrives|search
 */

import { NonRetriableError } from "inngest"
import { GoogleDriveOperation } from "@/features/executions/enums"
import { googleDriveIntegrationDefinition } from "@/features/integrations/registry/integrations/google-drive"
import { resolveOperation } from "@/features/integrations/registry/resolve"

/** Minimal Corsair Drive tenant client surface */
export type DriveApiClient = {
  googledrive: {
    api: {
      files: {
        list: (args?: Record<string, unknown>) => Promise<Record<string, unknown>>
        get: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        createFromText: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        upload: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        update: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        delete: (args: Record<string, unknown>) => Promise<void>
        copy: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        move: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        // unknown: package types download as any — we normalize to a record
        download: (args: Record<string, unknown>) => Promise<unknown>
        share: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
      }
      folders: {
        create: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        get: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        list: (args?: Record<string, unknown>) => Promise<Record<string, unknown>>
        delete: (args: Record<string, unknown>) => Promise<void>
        share: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
      }
      sharedDrives: {
        create: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        get: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        list: (args?: Record<string, unknown>) => Promise<Record<string, unknown>>
        update: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
        delete: (args: Record<string, unknown>) => Promise<void>
      }
      search: {
        filesAndFolders: (
          args?: Record<string, unknown>,
        ) => Promise<Record<string, unknown>>
      }
    }
  }
}

export type ResolvedDriveFields = {
  operation: string
  fileId: string
  folderId: string
  driveId: string
  fileName: string
  mimeType: string
  content: string
  description: string
  parents: string
  query: string
  pageSize: number
  pageToken: string
  orderBy: string
  /** Share: user | group | domain | anyone */
  shareType: string
  shareRole: string
  shareEmail: string
  shareDomain: string
  /** Move: destination parent folder id */
  addParents: string
  removeParents: string
  supportsAllDrives: boolean
}

function asRecord(v: unknown): Record<string, unknown> {
  // unknown: provider responses are untyped JSON
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {}
}

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

function fileSummary(file: Record<string, unknown>) {
  return {
    fileId: file.id,
    name: file.name,
    mimeType: file.mimeType,
    parents: file.parents,
    webViewLink: file.webViewLink ?? null,
    webContentLink: file.webContentLink ?? null,
    size: file.size ?? null,
    modifiedTime: file.modifiedTime ?? null,
    trashed: file.trashed ?? false,
  }
}

function normalizeDriveOp(raw: string): string {
  const { operation, requestedKey } = resolveOperation(
    googleDriveIntegrationDefinition,
    raw,
  )
  if (operation.aliases?.includes(requestedKey)) {
    return requestedKey
  }
  return operation.aliases?.[0] ?? operation.key
}

export async function runGoogleDriveOperation(
  client: DriveApiClient,
  fields: ResolvedDriveFields,
): Promise<Record<string, unknown>> {
  const api = client.googledrive.api
  const op = normalizeDriveOp(fields.operation)
  const parents = fields.parents.trim()
    ? splitCsv(fields.parents)
    : fields.folderId.trim()
      ? [fields.folderId.trim()]
      : undefined

  switch (op) {
    case GoogleDriveOperation.LIST_FILES:
    case "LIST_FILES": {
      const listed = await api.files.list({
        q: fields.query.trim() || undefined,
        pageSize: fields.pageSize || 50,
        pageToken: fields.pageToken.trim() || undefined,
        orderBy: fields.orderBy.trim() || undefined,
        supportsAllDrives: fields.supportsAllDrives,
        includeItemsFromAllDrives: fields.supportsAllDrives,
      })
      const files =
        (listed.files as Array<Record<string, unknown>> | undefined) ?? []
      return {
        operation: "LIST_FILES",
        files: files.map(fileSummary),
        count: files.length,
        nextPageToken: (listed.nextPageToken as string) ?? null,
      }
    }

    case GoogleDriveOperation.GET_FILE:
    case "GET_FILE": {
      if (!fields.fileId.trim()) {
        throw new NonRetriableError("Google Drive GET_FILE: fileId is required.")
      }
      const file = await api.files.get({
        fileId: fields.fileId,
        supportsAllDrives: fields.supportsAllDrives,
      })
      return {
        operation: "GET_FILE",
        ...fileSummary(file),
      }
    }

    case GoogleDriveOperation.CREATE_FROM_TEXT:
    case "CREATE_FROM_TEXT": {
      if (!fields.fileName.trim()) {
        throw new NonRetriableError(
          "Google Drive CREATE_FROM_TEXT: fileName is required.",
        )
      }
      const file = await api.files.createFromText({
        name: fields.fileName,
        content: fields.content,
        mimeType: fields.mimeType.trim() || "text/plain",
        parents,
        description: fields.description.trim() || undefined,
      })
      return {
        operation: "CREATE_FROM_TEXT",
        ...fileSummary(file),
      }
    }

    case GoogleDriveOperation.UPLOAD_FILE:
    case "UPLOAD_FILE": {
      if (!fields.fileName.trim()) {
        throw new NonRetriableError(
          "Google Drive UPLOAD_FILE: fileName is required.",
        )
      }
      // Corsair upload creates metadata; binary body handling depends on package.
      // Prefer CREATE_FROM_TEXT when content is available as string.
      if (fields.content.trim()) {
        const file = await api.files.createFromText({
          name: fields.fileName,
          content: fields.content,
          mimeType: fields.mimeType.trim() || "text/plain",
          parents,
          description: fields.description.trim() || undefined,
        })
        return {
          operation: "UPLOAD_FILE",
          mode: "createFromText",
          ...fileSummary(file),
        }
      }
      const file = await api.files.upload({
        name: fields.fileName,
        mimeType: fields.mimeType.trim() || "application/octet-stream",
        parents,
        description: fields.description.trim() || undefined,
      })
      return {
        operation: "UPLOAD_FILE",
        mode: "upload",
        ...fileSummary(file),
      }
    }

    case GoogleDriveOperation.UPDATE_FILE:
    case "UPDATE_FILE": {
      if (!fields.fileId.trim()) {
        throw new NonRetriableError(
          "Google Drive UPDATE_FILE: fileId is required.",
        )
      }
      const file = await api.files.update({
        fileId: fields.fileId,
        name: fields.fileName.trim() || undefined,
        description: fields.description.trim() || undefined,
        addParents: fields.addParents.trim() || undefined,
        removeParents: fields.removeParents.trim() || undefined,
        supportsAllDrives: fields.supportsAllDrives,
      })
      return {
        operation: "UPDATE_FILE",
        ...fileSummary(file),
        updated: true,
      }
    }

    case GoogleDriveOperation.DELETE_FILE:
    case "DELETE_FILE": {
      if (!fields.fileId.trim()) {
        throw new NonRetriableError(
          "Google Drive DELETE_FILE: fileId is required.",
        )
      }
      await api.files.delete({
        fileId: fields.fileId,
        supportsAllDrives: fields.supportsAllDrives,
      })
      return {
        operation: "DELETE_FILE",
        fileId: fields.fileId,
        deleted: true,
      }
    }

    case GoogleDriveOperation.COPY_FILE:
    case "COPY_FILE": {
      if (!fields.fileId.trim()) {
        throw new NonRetriableError(
          "Google Drive COPY_FILE: fileId is required.",
        )
      }
      const file = await api.files.copy({
        fileId: fields.fileId,
        name: fields.fileName.trim() || undefined,
        parents,
        supportsAllDrives: fields.supportsAllDrives,
      })
      return {
        operation: "COPY_FILE",
        sourceFileId: fields.fileId,
        ...fileSummary(file),
      }
    }

    case GoogleDriveOperation.MOVE_FILE:
    case "MOVE_FILE": {
      if (!fields.fileId.trim()) {
        throw new NonRetriableError("Google Drive MOVE_FILE: fileId is required.")
      }
      if (!fields.addParents.trim() && !fields.folderId.trim()) {
        throw new NonRetriableError(
          "Google Drive MOVE_FILE: addParents or folderId (destination) is required.",
        )
      }
      const file = await api.files.move({
        fileId: fields.fileId,
        addParents: fields.addParents.trim() || fields.folderId.trim(),
        removeParents: fields.removeParents.trim() || undefined,
        supportsAllDrives: fields.supportsAllDrives,
      })
      return {
        operation: "MOVE_FILE",
        ...fileSummary(file),
        moved: true,
      }
    }

    case GoogleDriveOperation.DOWNLOAD_FILE:
    case "DOWNLOAD_FILE": {
      if (!fields.fileId.trim()) {
        throw new NonRetriableError(
          "Google Drive DOWNLOAD_FILE: fileId is required.",
        )
      }
      const meta = await api.files.get({
        fileId: fields.fileId,
        supportsAllDrives: fields.supportsAllDrives,
      })
      // unknown: download payload shape varies (buffer / stream / base64)
      const raw = await api.files.download({
        fileId: fields.fileId,
      })
      let contentBase64: string | null = null
      let contentText: string | null = null
      if (typeof raw === "string") {
        contentText = raw
      } else if (raw instanceof ArrayBuffer) {
        contentBase64 = Buffer.from(raw).toString("base64")
      } else if (Buffer.isBuffer(raw)) {
        contentBase64 = raw.toString("base64")
      } else if (raw && typeof raw === "object") {
        const rec = asRecord(raw)
        if (typeof rec.data === "string") contentBase64 = rec.data
        else if (typeof rec.content === "string") contentText = rec.content
      }
      return {
        operation: "DOWNLOAD_FILE",
        ...fileSummary(meta),
        contentBase64,
        contentText,
        downloaded: true,
      }
    }

    case GoogleDriveOperation.SHARE_FILE:
    case "SHARE_FILE": {
      if (!fields.fileId.trim()) {
        throw new NonRetriableError(
          "Google Drive SHARE_FILE: fileId is required.",
        )
      }
      const permission = await api.files.share({
        fileId: fields.fileId,
        type: (fields.shareType.trim() || "user") as
          | "user"
          | "group"
          | "domain"
          | "anyone",
        role: (fields.shareRole.trim() || "reader") as
          | "owner"
          | "organizer"
          | "fileOrganizer"
          | "writer"
          | "commenter"
          | "reader",
        emailAddress: fields.shareEmail.trim() || undefined,
        domain: fields.shareDomain.trim() || undefined,
        supportsAllDrives: fields.supportsAllDrives,
      })
      return {
        operation: "SHARE_FILE",
        fileId: fields.fileId,
        permissionId: permission.id,
        role: permission.role,
        type: permission.type,
        shared: true,
      }
    }

    case GoogleDriveOperation.CREATE_FOLDER:
    case "CREATE_FOLDER": {
      if (!fields.fileName.trim()) {
        throw new NonRetriableError(
          "Google Drive CREATE_FOLDER: fileName (folder name) is required.",
        )
      }
      const folder = await api.folders.create({
        name: fields.fileName,
        parents,
        description: fields.description.trim() || undefined,
      })
      return {
        operation: "CREATE_FOLDER",
        folderId: folder.id,
        ...fileSummary(folder),
      }
    }

    case GoogleDriveOperation.GET_FOLDER:
    case "GET_FOLDER": {
      const folderId = fields.folderId.trim() || fields.fileId.trim()
      if (!folderId) {
        throw new NonRetriableError(
          "Google Drive GET_FOLDER: folderId is required.",
        )
      }
      const folder = await api.folders.get({
        folderId,
        supportsAllDrives: fields.supportsAllDrives,
      })
      return {
        operation: "GET_FOLDER",
        folderId: folder.id,
        ...fileSummary(folder),
      }
    }

    case GoogleDriveOperation.LIST_FOLDERS:
    case "LIST_FOLDERS": {
      const listed = await api.folders.list({
        q: fields.query.trim() || undefined,
        pageSize: fields.pageSize || 50,
        pageToken: fields.pageToken.trim() || undefined,
        orderBy: fields.orderBy.trim() || undefined,
        supportsAllDrives: fields.supportsAllDrives,
        includeItemsFromAllDrives: fields.supportsAllDrives,
      })
      const files =
        (listed.files as Array<Record<string, unknown>> | undefined) ?? []
      return {
        operation: "LIST_FOLDERS",
        folders: files.map(fileSummary),
        count: files.length,
        nextPageToken: (listed.nextPageToken as string) ?? null,
      }
    }

    case GoogleDriveOperation.DELETE_FOLDER:
    case "DELETE_FOLDER": {
      const folderId = fields.folderId.trim() || fields.fileId.trim()
      if (!folderId) {
        throw new NonRetriableError(
          "Google Drive DELETE_FOLDER: folderId is required.",
        )
      }
      await api.folders.delete({
        folderId,
        supportsAllDrives: fields.supportsAllDrives,
      })
      return {
        operation: "DELETE_FOLDER",
        folderId,
        deleted: true,
      }
    }

    case GoogleDriveOperation.SHARE_FOLDER:
    case "SHARE_FOLDER": {
      const folderId = fields.folderId.trim() || fields.fileId.trim()
      if (!folderId) {
        throw new NonRetriableError(
          "Google Drive SHARE_FOLDER: folderId is required.",
        )
      }
      const permission = await api.folders.share({
        folderId,
        type: (fields.shareType.trim() || "user") as
          | "user"
          | "group"
          | "domain"
          | "anyone",
        role: (fields.shareRole.trim() || "reader") as
          | "owner"
          | "organizer"
          | "fileOrganizer"
          | "writer"
          | "commenter"
          | "reader",
        emailAddress: fields.shareEmail.trim() || undefined,
        domain: fields.shareDomain.trim() || undefined,
        supportsAllDrives: fields.supportsAllDrives,
      })
      return {
        operation: "SHARE_FOLDER",
        folderId,
        permissionId: permission.id,
        shared: true,
      }
    }

    case GoogleDriveOperation.CREATE_SHARED_DRIVE:
    case "CREATE_SHARED_DRIVE": {
      if (!fields.fileName.trim()) {
        throw new NonRetriableError(
          "Google Drive CREATE_SHARED_DRIVE: fileName (drive name) is required.",
        )
      }
      const drive = await api.sharedDrives.create({
        name: fields.fileName,
      })
      return {
        operation: "CREATE_SHARED_DRIVE",
        driveId: drive.id,
        name: drive.name,
      }
    }

    case GoogleDriveOperation.GET_SHARED_DRIVE:
    case "GET_SHARED_DRIVE": {
      if (!fields.driveId.trim()) {
        throw new NonRetriableError(
          "Google Drive GET_SHARED_DRIVE: driveId is required.",
        )
      }
      const drive = await api.sharedDrives.get({ driveId: fields.driveId })
      return {
        operation: "GET_SHARED_DRIVE",
        driveId: drive.id,
        name: drive.name,
      }
    }

    case GoogleDriveOperation.LIST_SHARED_DRIVES:
    case "LIST_SHARED_DRIVES": {
      const listed = await api.sharedDrives.list({
        pageSize: fields.pageSize || 50,
        pageToken: fields.pageToken.trim() || undefined,
      })
      const drives =
        (listed.drives as Array<Record<string, unknown>> | undefined) ?? []
      return {
        operation: "LIST_SHARED_DRIVES",
        drives: drives.map((d) => ({
          driveId: d.id,
          name: d.name,
        })),
        count: drives.length,
        nextPageToken: (listed.nextPageToken as string) ?? null,
      }
    }

    case GoogleDriveOperation.UPDATE_SHARED_DRIVE:
    case "UPDATE_SHARED_DRIVE": {
      if (!fields.driveId.trim()) {
        throw new NonRetriableError(
          "Google Drive UPDATE_SHARED_DRIVE: driveId is required.",
        )
      }
      if (!fields.fileName.trim()) {
        throw new NonRetriableError(
          "Google Drive UPDATE_SHARED_DRIVE: fileName (new name) is required.",
        )
      }
      const drive = await api.sharedDrives.update({
        driveId: fields.driveId,
        name: fields.fileName,
      })
      return {
        operation: "UPDATE_SHARED_DRIVE",
        driveId: drive.id,
        name: drive.name,
        updated: true,
      }
    }

    case GoogleDriveOperation.DELETE_SHARED_DRIVE:
    case "DELETE_SHARED_DRIVE": {
      if (!fields.driveId.trim()) {
        throw new NonRetriableError(
          "Google Drive DELETE_SHARED_DRIVE: driveId is required.",
        )
      }
      await api.sharedDrives.delete({ driveId: fields.driveId })
      return {
        operation: "DELETE_SHARED_DRIVE",
        driveId: fields.driveId,
        deleted: true,
      }
    }

    case GoogleDriveOperation.SEARCH_FILES_AND_FOLDERS:
    case "SEARCH_FILES_AND_FOLDERS": {
      if (!fields.query.trim()) {
        throw new NonRetriableError(
          "Google Drive SEARCH_FILES_AND_FOLDERS: query is required.",
        )
      }
      const listed = await api.search.filesAndFolders({
        q: fields.query,
        pageSize: fields.pageSize || 50,
        pageToken: fields.pageToken.trim() || undefined,
        orderBy: fields.orderBy.trim() || undefined,
        supportsAllDrives: fields.supportsAllDrives,
        includeItemsFromAllDrives: fields.supportsAllDrives,
      })
      const files =
        (listed.files as Array<Record<string, unknown>> | undefined) ?? []
      return {
        operation: "SEARCH_FILES_AND_FOLDERS",
        query: fields.query,
        results: files.map(fileSummary),
        count: files.length,
        nextPageToken: (listed.nextPageToken as string) ?? null,
      }
    }

    default:
      throw new NonRetriableError(
        `Unknown Google Drive operation: ${fields.operation} (normalized: ${op})`,
      )
  }
}
