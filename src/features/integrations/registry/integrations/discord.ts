/**
 * Discord registry — full @corsair-dev/discord surface.
 */

import type { IntegrationDefinition } from "../types"

export const discordIntegrationDefinition: IntegrationDefinition = {
  typeKey: "discord",
  kind: "integration",
  corsairPluginId: "discord",
  label: "Discord",
  operations: [
    // messages
    {
      key: "messages.send",
      aliases: ["SEND_MESSAGE", "POST_MESSAGE"],
      label: "Send Message",
      group: "Messages",
      risk: "write",
    },
    {
      key: "messages.reply",
      aliases: ["REPLY_MESSAGE"],
      label: "Reply to Message",
      group: "Messages",
      risk: "write",
    },
    {
      key: "messages.get",
      aliases: ["GET_MESSAGE"],
      label: "Get Message",
      group: "Messages",
      risk: "read",
    },
    {
      key: "messages.list",
      aliases: ["LIST_MESSAGES"],
      label: "List Messages",
      group: "Messages",
      risk: "read",
    },
    {
      key: "messages.edit",
      aliases: ["EDIT_MESSAGE"],
      label: "Edit Message",
      group: "Messages",
      risk: "write",
    },
    {
      key: "messages.delete",
      aliases: ["DELETE_MESSAGE"],
      label: "Delete Message",
      group: "Messages",
      risk: "destructive",
    },
    // threads
    {
      key: "threads.create",
      aliases: ["CREATE_THREAD"],
      label: "Create Thread",
      group: "Threads",
      risk: "write",
    },
    {
      key: "threads.createFromMessage",
      aliases: ["CREATE_THREAD_FROM_MESSAGE"],
      label: "Create Thread From Message",
      group: "Threads",
      risk: "write",
    },
    // reactions
    {
      key: "reactions.add",
      aliases: ["ADD_REACTION"],
      label: "Add Reaction",
      group: "Reactions",
      risk: "write",
    },
    {
      key: "reactions.remove",
      aliases: ["REMOVE_REACTION"],
      label: "Remove Reaction",
      group: "Reactions",
      risk: "write",
    },
    {
      key: "reactions.list",
      aliases: ["LIST_REACTIONS"],
      label: "List Reactions",
      group: "Reactions",
      risk: "read",
    },
    // guilds
    {
      key: "guilds.list",
      aliases: ["LIST_GUILDS"],
      label: "List Guilds",
      group: "Guilds",
      risk: "read",
    },
    {
      key: "guilds.get",
      aliases: ["GET_GUILD"],
      label: "Get Guild",
      group: "Guilds",
      risk: "read",
    },
    // channels
    {
      key: "channels.list",
      aliases: ["LIST_CHANNELS"],
      label: "List Channels",
      group: "Channels",
      risk: "read",
    },
    // members
    {
      key: "members.list",
      aliases: ["LIST_MEMBERS"],
      label: "List Members",
      group: "Members",
      risk: "read",
    },
    {
      key: "members.get",
      aliases: ["GET_MEMBER"],
      label: "Get Member",
      group: "Members",
      risk: "read",
    },
  ],
}
