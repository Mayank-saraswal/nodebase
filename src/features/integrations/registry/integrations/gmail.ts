/**
 * Gmail registry metadata (Option C).
 * Canonical keys prefer Corsair paths; aliases keep old Nodebase workflows running.
 * Full execute still lives in adapters/gmail until generic runner lands.
 */

import type { IntegrationDefinition } from "../types"

/** Product-facing op keys we currently execute (adapter switch) + Corsair path aliases */
export const gmailIntegrationDefinition: IntegrationDefinition = {
  typeKey: "gmail",
  kind: "integration",
  corsairPluginId: "gmail",
  label: "Gmail",
  operations: [
    { key: "messages.send", aliases: ["SEND"], label: "Send Email", group: "Send", risk: "write" },
    { key: "messages.send.reply", aliases: ["REPLY"], label: "Reply", group: "Send", risk: "write" },
    { key: "messages.send.forward", aliases: ["FORWARD"], label: "Forward", group: "Send", risk: "write" },
    { key: "messages.get", aliases: ["GET_MESSAGE"], label: "Get Message", group: "Read", risk: "read" },
    { key: "messages.list", aliases: ["LIST_MESSAGES", "SEARCH_MESSAGES"], label: "List/Search Messages", group: "Read", risk: "read" },
    { key: "messages.delete", aliases: ["DELETE_MESSAGE"], label: "Delete Message", group: "Organize", risk: "destructive" },
    { key: "messages.batchModify", aliases: ["BATCH_MODIFY"], label: "Batch Modify", group: "Organize", risk: "write" },
    { key: "messages.modify.addLabel", aliases: ["ADD_LABEL"], label: "Add Label", group: "Organize", risk: "write" },
    { key: "messages.modify.removeLabel", aliases: ["REMOVE_LABEL"], label: "Remove Label", group: "Organize", risk: "write" },
    { key: "messages.modify.markRead", aliases: ["MARK_READ"], label: "Mark Read", group: "Organize", risk: "write" },
    { key: "messages.modify.markUnread", aliases: ["MARK_UNREAD"], label: "Mark Unread", group: "Organize", risk: "write" },
    { key: "messages.trash", aliases: ["MOVE_TO_TRASH"], label: "Trash Message", group: "Organize", risk: "write" },
    { key: "messages.untrash", aliases: ["UNTRASH_MESSAGE"], label: "Untrash Message", group: "Organize", risk: "write" },
    { key: "drafts.create", aliases: ["CREATE_DRAFT"], label: "Create Draft", group: "Drafts", risk: "write" },
    { key: "drafts.get", aliases: ["GET_DRAFT"], label: "Get Draft", group: "Drafts", risk: "read" },
    { key: "drafts.update", aliases: ["UPDATE_DRAFT"], label: "Update Draft", group: "Drafts", risk: "write" },
    { key: "drafts.delete", aliases: ["DELETE_DRAFT"], label: "Delete Draft", group: "Drafts", risk: "destructive" },
    { key: "drafts.list", aliases: ["LIST_DRAFTS"], label: "List Drafts", group: "Drafts", risk: "read" },
    { key: "drafts.send", aliases: ["SEND_DRAFT"], label: "Send Draft", group: "Drafts", risk: "write" },
    { key: "threads.list", aliases: ["LIST_THREADS"], label: "List Threads", group: "Threads", risk: "read" },
    { key: "threads.get", aliases: ["GET_THREAD"], label: "Get Thread", group: "Threads", risk: "read" },
    { key: "threads.modify", aliases: ["MODIFY_THREAD"], label: "Modify Thread", group: "Threads", risk: "write" },
    { key: "threads.delete", aliases: ["DELETE_THREAD"], label: "Delete Thread", group: "Threads", risk: "destructive" },
    { key: "threads.trash", aliases: ["TRASH_THREAD"], label: "Trash Thread", group: "Threads", risk: "write" },
    { key: "threads.untrash", aliases: ["UNTRASH_THREAD"], label: "Untrash Thread", group: "Threads", risk: "write" },
    { key: "labels.list", aliases: ["LIST_LABELS"], label: "List Labels", group: "Labels", risk: "read" },
    { key: "labels.get", aliases: ["GET_LABEL"], label: "Get Label", group: "Labels", risk: "read" },
    { key: "labels.create", aliases: ["CREATE_LABEL"], label: "Create Label", group: "Labels", risk: "write" },
    { key: "labels.update", aliases: ["UPDATE_LABEL"], label: "Update Label", group: "Labels", risk: "write" },
    { key: "labels.delete", aliases: ["DELETE_LABEL"], label: "Delete Label", group: "Labels", risk: "destructive" },
    // Product-only (not a direct Corsair endpoint path)
    { key: "messages.getAttachment", aliases: ["GET_ATTACHMENT"], label: "Get Attachment", group: "Read", risk: "read" },
  ],
}
