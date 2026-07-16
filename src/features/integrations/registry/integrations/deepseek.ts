/**
 * DeepSeek registry — full @corsair-dev/deepseek surface (4 endpoints).
 * Source: https://github.com/corsairdev/corsair/tree/main/packages/deepseek
 */

import type { IntegrationDefinition } from "../types"

export const DEEPSEEK_CORSAIR_ENDPOINTS = [
  "chat.createCompletion",
  "anthropic.createMessage",
  "user.getBalance",
  "models.list",
] as const

export const deepseekIntegrationDefinition: IntegrationDefinition = {
  typeKey: "deepseek",
  kind: "integration",
  corsairPluginId: "deepseek",
  label: "DeepSeek",
  operations: [
    {
      key: "chat.createCompletion",
      aliases: ["CHAT", "CHAT_COMPLETION", "CREATE_COMPLETION", "GENERATE_TEXT"],
      label: "Chat Completion",
      group: "Chat",
      risk: "write",
    },
    {
      key: "anthropic.createMessage",
      aliases: ["ANTHROPIC_MESSAGE", "CREATE_MESSAGE"],
      label: "Anthropic-compatible Message",
      group: "Anthropic",
      risk: "write",
    },
    {
      key: "user.getBalance",
      aliases: ["GET_BALANCE", "BALANCE"],
      label: "Get Balance",
      group: "User",
      risk: "read",
    },
    {
      key: "models.list",
      aliases: ["LIST_MODELS"],
      label: "List Models",
      group: "Models",
      risk: "read",
    },
  ],
}
