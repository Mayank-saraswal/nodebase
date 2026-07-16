/**
 * Google Drive registry metadata (Option C).
 * Canonical keys prefer Corsair paths; aliases keep product workflow ops working.
 */

import type { IntegrationDefinition } from "../types"

export const googleDriveIntegrationDefinition: IntegrationDefinition = {
  typeKey: "google_drive",
  kind: "integration",
  corsairPluginId: "googledrive",
  label: "Google Drive",
  operations: [
    // files
    { key: "files.list", aliases: ["LIST_FILES"], label: "List Files", group: "Files", risk: "read" },
    { key: "files.get", aliases: ["GET_FILE"], label: "Get File", group: "Files", risk: "read" },
    { key: "files.createFromText", aliases: ["CREATE_FROM_TEXT"], label: "Create From Text", group: "Files", risk: "write" },
    { key: "files.upload", aliases: ["UPLOAD_FILE"], label: "Upload File", group: "Files", risk: "write" },
    { key: "files.update", aliases: ["UPDATE_FILE"], label: "Update File", group: "Files", risk: "write" },
    { key: "files.delete", aliases: ["DELETE_FILE"], label: "Delete File", group: "Files", risk: "destructive" },
    { key: "files.copy", aliases: ["COPY_FILE"], label: "Copy File", group: "Files", risk: "write" },
    { key: "files.move", aliases: ["MOVE_FILE"], label: "Move File", group: "Files", risk: "write" },
    { key: "files.download", aliases: ["DOWNLOAD_FILE"], label: "Download File", group: "Files", risk: "read" },
    { key: "files.share", aliases: ["SHARE_FILE"], label: "Share File", group: "Files", risk: "write" },
    // folders
    { key: "folders.create", aliases: ["CREATE_FOLDER"], label: "Create Folder", group: "Folders", risk: "write" },
    { key: "folders.get", aliases: ["GET_FOLDER"], label: "Get Folder", group: "Folders", risk: "read" },
    { key: "folders.list", aliases: ["LIST_FOLDERS"], label: "List Folders", group: "Folders", risk: "read" },
    { key: "folders.delete", aliases: ["DELETE_FOLDER"], label: "Delete Folder", group: "Folders", risk: "destructive" },
    { key: "folders.share", aliases: ["SHARE_FOLDER"], label: "Share Folder", group: "Folders", risk: "write" },
    // shared drives
    { key: "sharedDrives.create", aliases: ["CREATE_SHARED_DRIVE"], label: "Create Shared Drive", group: "Shared Drives", risk: "write" },
    { key: "sharedDrives.get", aliases: ["GET_SHARED_DRIVE"], label: "Get Shared Drive", group: "Shared Drives", risk: "read" },
    { key: "sharedDrives.list", aliases: ["LIST_SHARED_DRIVES"], label: "List Shared Drives", group: "Shared Drives", risk: "read" },
    { key: "sharedDrives.update", aliases: ["UPDATE_SHARED_DRIVE"], label: "Update Shared Drive", group: "Shared Drives", risk: "write" },
    { key: "sharedDrives.delete", aliases: ["DELETE_SHARED_DRIVE"], label: "Delete Shared Drive", group: "Shared Drives", risk: "destructive" },
    // search
    { key: "search.filesAndFolders", aliases: ["SEARCH_FILES_AND_FOLDERS"], label: "Search Files & Folders", group: "Search", risk: "read" },
  ],
}
