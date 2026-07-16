/**
 * Option C completeness law:
 * For every shipped Corsair plugin, registry ops must cover Corsair public endpoints
 * (plus allowed product-only aliases like REPLY/FORWARD).
 */

import { describe, expect, it } from "vitest"
import {
  gmailIntegrationDefinition,
  googleSheetsIntegrationDefinition,
  googleDriveIntegrationDefinition,
  buildAliasMap,
  listOperationKeys,
} from "../index"

/** Public Corsair Gmail endpoint paths (from @corsair-dev/gmail dist endpoints) */
const GMAIL_CORSAIR_ENDPOINTS = [
  "messages.list",
  "messages.get",
  "messages.send",
  "messages.delete",
  "messages.modify",
  "messages.batchModify",
  "messages.trash",
  "messages.untrash",
  "labels.list",
  "labels.get",
  "labels.create",
  "labels.update",
  "labels.delete",
  "drafts.list",
  "drafts.get",
  "drafts.create",
  "drafts.update",
  "drafts.delete",
  "drafts.send",
  "threads.list",
  "threads.get",
  "threads.modify",
  "threads.delete",
  "threads.trash",
  "threads.untrash",
] as const

/**
 * Product keys that map onto modify/send/get rather than unique Corsair paths.
 * These are intentional Nodebase conveniences, not missing endpoints.
 */
const GMAIL_PRODUCT_ONLY = [
  "messages.send.reply",
  "messages.send.forward",
  "messages.modify.addLabel",
  "messages.modify.removeLabel",
  "messages.modify.markRead",
  "messages.modify.markUnread",
  "messages.getAttachment",
] as const

const SHEETS_CORSAIR_ENDPOINTS = [
  "spreadsheets.create",
  "spreadsheets.delete",
  "spreadsheets.list",
  "sheets.appendRow",
  "sheets.appendOrUpdateRow",
  "sheets.getRows",
  "sheets.updateRow",
  "sheets.clearSheet",
  "sheets.createSheet",
  "sheets.deleteSheet",
  "sheets.deleteRowsOrColumns",
  "sheets.listSheetsInSpreadsheet",
] as const

const DRIVE_CORSAIR_ENDPOINTS = [
  "files.list",
  "files.get",
  "files.createFromText",
  "files.upload",
  "files.update",
  "files.delete",
  "files.copy",
  "files.move",
  "files.download",
  "files.share",
  "folders.create",
  "folders.get",
  "folders.list",
  "folders.delete",
  "folders.share",
  "sharedDrives.create",
  "sharedDrives.get",
  "sharedDrives.list",
  "sharedDrives.update",
  "sharedDrives.delete",
  "search.filesAndFolders",
] as const

function corsairKeysCovered(registryKeys: string[], required: readonly string[]) {
  const set = new Set(registryKeys)
  return required.filter((k) => !set.has(k))
}

describe("Option C registry completeness", () => {
  it("Gmail registry covers all Corsair public endpoints", () => {
    const keys = listOperationKeys(gmailIntegrationDefinition)
    const missing = corsairKeysCovered(keys, GMAIL_CORSAIR_ENDPOINTS)
    // messages.modify is covered via product modify.* keys; allow either form
    const missingAfterModifyAlias = missing.filter((k) => {
      if (k === "messages.modify") {
        return !keys.some((x) => x.startsWith("messages.modify"))
      }
      return true
    })
    expect(missingAfterModifyAlias).toEqual([])
  })

  it("Gmail product-only keys are registered", () => {
    const keys = new Set(listOperationKeys(gmailIntegrationDefinition))
    for (const k of GMAIL_PRODUCT_ONLY) {
      expect(keys.has(k)).toBe(true)
    }
  })

  it("Gmail aliases resolve SEND → messages.send", () => {
    const map = buildAliasMap(gmailIntegrationDefinition)
    expect(map.get("SEND")).toBe("messages.send")
    expect(map.get("DELETE_MESSAGE")).toBe("messages.delete")
    expect(map.get("LIST_THREADS")).toBe("threads.list")
  })

  it("Google Sheets registry covers all Corsair endpoints", () => {
    const keys = listOperationKeys(googleSheetsIntegrationDefinition)
    expect(corsairKeysCovered(keys, SHEETS_CORSAIR_ENDPOINTS)).toEqual([])
  })

  it("Google Drive registry covers all Corsair endpoints", () => {
    const keys = listOperationKeys(googleDriveIntegrationDefinition)
    expect(corsairKeysCovered(keys, DRIVE_CORSAIR_ENDPOINTS)).toEqual([])
  })
})
