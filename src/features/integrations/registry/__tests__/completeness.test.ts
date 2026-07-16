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
  slackIntegrationDefinition,
  githubIntegrationDefinition,
  notionIntegrationDefinition,
  hubspotIntegrationDefinition,
  telegramIntegrationDefinition,
  discordIntegrationDefinition,
  twitterIntegrationDefinition,
  razorpayIntegrationDefinition,
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

/** Core Corsair Slack nested endpoints we ship (admin optional) */
const SLACK_CORSAIR_ENDPOINTS = [
  "messages.post",
  "messages.update",
  "messages.delete",
  "messages.getPermalink",
  "messages.search",
  "channels.get",
  "channels.list",
  "channels.create",
  "channels.archive",
  "channels.unarchive",
  "channels.invite",
  "channels.kick",
  "channels.setTopic",
  "channels.setPurpose",
  "channels.getHistory",
  "channels.rename",
  "channels.open",
  "channels.close",
  "channels.join",
  "channels.leave",
  "channels.getMembers",
  "channels.getReplies",
  "users.get",
  "users.list",
  "users.getProfile",
  "users.getPresence",
  "users.updateProfile",
  "reactions.add",
  "reactions.get",
  "reactions.remove",
  "files.get",
  "files.list",
  "files.upload",
  "stars.add",
  "stars.remove",
  "stars.list",
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

  it("Slack registry covers core Corsair endpoints", () => {
    const keys = listOperationKeys(slackIntegrationDefinition)
    expect(corsairKeysCovered(keys, SLACK_CORSAIR_ENDPOINTS)).toEqual([])
  })

  it("Slack aliases resolve MESSAGE_SEND → messages.post", () => {
    const map = buildAliasMap(slackIntegrationDefinition)
    expect(map.get("MESSAGE_SEND")).toBe("messages.post")
    expect(map.get("CHANNEL_LIST")).toBe("channels.list")
  })

  it("GitHub registry covers core Corsair endpoints", () => {
    const keys = listOperationKeys(githubIntegrationDefinition)
    const required = [
      "issues.list",
      "issues.get",
      "issues.create",
      "issues.update",
      "issues.createComment",
      "pullRequests.list",
      "pullRequests.get",
      "pullRequests.listReviews",
      "pullRequests.createReview",
      "repositories.list",
      "repositories.get",
      "repositories.listBranches",
      "repositories.listCommits",
      "repositories.getContent",
      "repositories.star",
      "repositories.unstar",
      "repositories.checkStarred",
      "repositories.listStarred",
      "releases.list",
      "releases.get",
      "releases.create",
      "releases.update",
      "workflows.list",
      "workflows.get",
      "workflows.listRuns",
      "discussions.list",
      "discussions.get",
      "forks.list",
      "comments.list",
      "comments.listForIssue",
      "comments.get",
      "comments.update",
      "comments.delete",
      "events.list",
      "events.listForRepository",
      "users.get",
      "users.getAuthenticated",
    ]
    expect(corsairKeysCovered(keys, required)).toEqual([])
  })

  it("GitHub aliases resolve ISSUE_LIST → issues.list", () => {
    const map = buildAliasMap(githubIntegrationDefinition)
    expect(map.get("ISSUE_LIST")).toBe("issues.list")
    expect(map.get("USER_GET_CURRENT")).toBe("users.getAuthenticated")
  })

  it("Notion registry covers all Corsair endpoints", () => {
    const keys = listOperationKeys(notionIntegrationDefinition)
    const required = [
      "databases.getDatabase",
      "databases.getManyDatabases",
      "databases.searchDatabase",
      "databasePages.createDatabasePage",
      "databasePages.getDatabasePage",
      "databasePages.getManyDatabasePages",
      "databasePages.updateDatabasePage",
      "pages.archivePage",
      "pages.createPage",
      "pages.searchPage",
      "blocks.appendBlock",
      "blocks.getManyChildBlocks",
      "users.getUser",
      "users.getManyUsers",
    ]
    expect(corsairKeysCovered(keys, required)).toEqual([])
  })

  it("Notion aliases resolve QUERY_DATABASE", () => {
    const map = buildAliasMap(notionIntegrationDefinition)
    expect(map.get("QUERY_DATABASE")).toBe(
      "databasePages.getManyDatabasePages",
    )
  })

  it("Telegram registry covers all Corsair endpoints", () => {
    const keys = listOperationKeys(telegramIntegrationDefinition)
    const required = [
      "messages.sendMessage",
      "messages.editMessageText",
      "messages.deleteMessage",
      "messages.pinChatMessage",
      "messages.unpinChatMessage",
      "messages.sendPhoto",
      "messages.sendVideo",
      "messages.sendAudio",
      "messages.sendDocument",
      "messages.sendSticker",
      "messages.sendAnimation",
      "messages.sendLocation",
      "messages.sendMediaGroup",
      "messages.sendChatAction",
      "chat.getChat",
      "chat.getChatAdministrators",
      "chat.getChatMember",
      "callback.answerCallbackQuery",
      "callback.answerInlineQuery",
      "file.getFile",
      "me.getMe",
      "updates.getUpdates",
      "webhook.setWebhook",
      "webhook.deleteWebhook",
    ]
    expect(corsairKeysCovered(keys, required)).toEqual([])
  })

  it("HubSpot registry covers all Corsair endpoints", () => {
    const keys = listOperationKeys(hubspotIntegrationDefinition)
    const required = [
      "contacts.get",
      "contacts.getMany",
      "contacts.create",
      "contacts.update",
      "contacts.delete",
      "contacts.getRecentlyCreated",
      "contacts.getRecentlyUpdated",
      "contacts.search",
      "companies.get",
      "companies.getMany",
      "companies.create",
      "companies.update",
      "companies.delete",
      "companies.getRecentlyCreated",
      "companies.getRecentlyUpdated",
      "companies.searchByDomain",
      "deals.get",
      "deals.getMany",
      "deals.create",
      "deals.update",
      "deals.delete",
      "deals.getRecentlyCreated",
      "deals.getRecentlyUpdated",
      "deals.search",
      "tickets.get",
      "tickets.getMany",
      "tickets.create",
      "tickets.update",
      "tickets.delete",
      "engagements.get",
      "engagements.getMany",
      "engagements.create",
      "engagements.delete",
      "contactLists.addContact",
      "contactLists.removeContact",
    ]
    expect(corsairKeysCovered(keys, required)).toEqual([])
  })

  it("Discord registry covers all Corsair endpoints", () => {
    const keys = listOperationKeys(discordIntegrationDefinition)
    const required = [
      "messages.send",
      "messages.reply",
      "messages.get",
      "messages.list",
      "messages.edit",
      "messages.delete",
      "threads.create",
      "threads.createFromMessage",
      "reactions.add",
      "reactions.remove",
      "reactions.list",
      "guilds.list",
      "guilds.get",
      "channels.list",
      "members.list",
      "members.get",
    ]
    expect(corsairKeysCovered(keys, required)).toEqual([])
  })

  it("Discord aliases resolve SEND_MESSAGE", () => {
    const map = buildAliasMap(discordIntegrationDefinition)
    expect(map.get("SEND_MESSAGE")).toBe("messages.send")
    expect(map.get("LIST_GUILDS")).toBe("guilds.list")
  })

  it("Twitter registry covers all Corsair endpoints", () => {
    const keys = listOperationKeys(twitterIntegrationDefinition)
    const required = ["tweets.create", "tweets.createReply"]
    expect(corsairKeysCovered(keys, required)).toEqual([])
  })

  it("Twitter aliases resolve POST_TWEET", () => {
    const map = buildAliasMap(twitterIntegrationDefinition)
    expect(map.get("POST_TWEET")).toBe("tweets.create")
    expect(map.get("REPLY_TWEET")).toBe("tweets.createReply")
  })

  it("Razorpay registry covers all Corsair endpoints", () => {
    const keys = listOperationKeys(razorpayIntegrationDefinition)
    const required = [
      "orders.create",
      "orders.get",
      "orders.list",
      "payments.get",
      "payments.list",
      "payments.capture",
      "payouts.get",
      "payouts.list",
      "payouts.create",
      "refunds.create",
      "refunds.get",
      "refunds.list",
      "customers.create",
      "customers.get",
      "customers.list",
      "customers.update",
      "settlements.list",
      "settlements.get",
      "subscriptions.list",
      "subscriptions.get",
      "subscriptions.create",
      "subscriptions.update",
      "subscriptions.cancel",
      "subscriptions.pause",
      "subscriptions.resume",
    ]
    expect(corsairKeysCovered(keys, required)).toEqual([])
  })

  it("Razorpay aliases resolve ORDER_CREATE", () => {
    const map = buildAliasMap(razorpayIntegrationDefinition)
    expect(map.get("ORDER_CREATE")).toBe("orders.create")
    expect(map.get("SUBSCRIPTION_PAUSE")).toBe("subscriptions.pause")
  })
})
