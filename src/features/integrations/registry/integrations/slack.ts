/**
 * Slack registry metadata (Option C).
 * Canonical keys prefer Corsair paths; product aliases keep existing workflows running.
 */

import type { IntegrationDefinition } from "../types"

export const slackIntegrationDefinition: IntegrationDefinition = {
  typeKey: "slack",
  kind: "integration",
  corsairPluginId: "slack",
  label: "Slack",
  operations: [
    // messages
    { key: "messages.post", aliases: ["MESSAGE_SEND"], label: "Send Message", group: "Messages", risk: "write" },
    { key: "messages.update", aliases: ["MESSAGE_UPDATE"], label: "Update Message", group: "Messages", risk: "write" },
    { key: "messages.delete", aliases: ["MESSAGE_DELETE"], label: "Delete Message", group: "Messages", risk: "destructive" },
    { key: "messages.getPermalink", aliases: ["MESSAGE_GET_PERMALINK"], label: "Get Permalink", group: "Messages", risk: "read" },
    { key: "messages.search", aliases: ["MESSAGE_SEARCH"], label: "Search Messages", group: "Messages", risk: "read" },
    // channels
    { key: "channels.get", aliases: ["CHANNEL_GET", "CHANNEL_INFO"], label: "Get Channel", group: "Channels", risk: "read" },
    { key: "channels.list", aliases: ["CHANNEL_LIST"], label: "List Channels", group: "Channels", risk: "read" },
    { key: "channels.create", aliases: ["CHANNEL_CREATE"], label: "Create Channel", group: "Channels", risk: "write" },
    { key: "channels.archive", aliases: ["CHANNEL_ARCHIVE"], label: "Archive Channel", group: "Channels", risk: "destructive" },
    { key: "channels.unarchive", aliases: ["CHANNEL_UNARCHIVE"], label: "Unarchive Channel", group: "Channels", risk: "write" },
    { key: "channels.invite", aliases: ["CHANNEL_INVITE"], label: "Invite to Channel", group: "Channels", risk: "write" },
    { key: "channels.kick", aliases: ["CHANNEL_KICK"], label: "Kick from Channel", group: "Channels", risk: "destructive" },
    { key: "channels.setTopic", aliases: ["CHANNEL_SET_TOPIC"], label: "Set Topic", group: "Channels", risk: "write" },
    { key: "channels.setPurpose", aliases: ["CHANNEL_SET_PURPOSE"], label: "Set Purpose", group: "Channels", risk: "write" },
    { key: "channels.getHistory", aliases: ["CHANNEL_HISTORY"], label: "Channel History", group: "Channels", risk: "read" },
    { key: "channels.rename", aliases: ["CHANNEL_RENAME"], label: "Rename Channel", group: "Channels", risk: "write" },
    { key: "channels.open", aliases: ["CONVERSATION_OPEN"], label: "Open Conversation", group: "Channels", risk: "write" },
    { key: "channels.close", aliases: ["CHANNEL_CLOSE"], label: "Close Conversation", group: "Channels", risk: "write" },
    { key: "channels.join", aliases: ["CHANNEL_JOIN"], label: "Join Channel", group: "Channels", risk: "write" },
    { key: "channels.leave", aliases: ["CHANNEL_LEAVE"], label: "Leave Channel", group: "Channels", risk: "write" },
    { key: "channels.getMembers", aliases: ["CHANNEL_GET_MEMBERS"], label: "Get Members", group: "Channels", risk: "read" },
    { key: "channels.getReplies", aliases: ["CHANNEL_GET_REPLIES"], label: "Get Replies", group: "Channels", risk: "read" },
    // users
    { key: "users.get", aliases: ["USER_GET", "USER_INFO"], label: "Get User", group: "Users", risk: "read" },
    { key: "users.list", aliases: ["USER_LIST"], label: "List Users", group: "Users", risk: "read" },
    { key: "users.getProfile", aliases: ["USER_GET_PROFILE"], label: "Get Profile", group: "Users", risk: "read" },
    { key: "users.getPresence", aliases: ["USER_GET_PRESENCE"], label: "Get Presence", group: "Users", risk: "read" },
    { key: "users.updateProfile", aliases: ["USER_SET_STATUS"], label: "Update Profile / Status", group: "Users", risk: "write" },
    // reactions
    { key: "reactions.add", aliases: ["REACTION_ADD"], label: "Add Reaction", group: "Reactions", risk: "write" },
    { key: "reactions.remove", aliases: ["REACTION_REMOVE"], label: "Remove Reaction", group: "Reactions", risk: "write" },
    { key: "reactions.get", aliases: ["REACTION_GET"], label: "Get Reactions", group: "Reactions", risk: "read" },
    // files
    { key: "files.get", aliases: ["FILE_GET", "FILE_INFO"], label: "Get File", group: "Files", risk: "read" },
    { key: "files.list", aliases: ["FILE_LIST"], label: "List Files", group: "Files", risk: "read" },
    { key: "files.upload", aliases: ["FILE_UPLOAD"], label: "Upload File", group: "Files", risk: "write" },
    // stars
    { key: "stars.add", aliases: ["STAR_ADD"], label: "Add Star", group: "Stars", risk: "write" },
    { key: "stars.remove", aliases: ["STAR_REMOVE"], label: "Remove Star", group: "Stars", risk: "write" },
    { key: "stars.list", aliases: ["STAR_LIST"], label: "List Stars", group: "Stars", risk: "read" },
    // product-only (not in Corsair package) — kept for dual-path legacy
    {
      key: "messages.sendWebhook",
      aliases: ["MESSAGE_SEND_WEBHOOK"],
      label: "Send Incoming Webhook",
      group: "Messages",
      risk: "write",
      description:
        "Uses Incoming Webhook URL (legacy Cryptr credential). Corsair path rejects; executor falls through to legacy when enabled.",
    },
    {
      key: "messages.schedule",
      aliases: ["MESSAGE_SCHEDULE"],
      label: "Schedule Message",
      group: "Messages",
      risk: "write",
      description: "chat.scheduleMessage — not in @corsair-dev/slack; legacy path only.",
    },
    {
      key: "users.getByEmail",
      aliases: ["USER_GET_BY_EMAIL"],
      label: "Get User By Email",
      group: "Users",
      risk: "read",
      description: "users.lookupByEmail — not in @corsair-dev/slack; legacy path only.",
    },
  ],
}
