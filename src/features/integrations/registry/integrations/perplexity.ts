/**
 * Perplexity AI registry — full @corsair-dev/perplexityai surface.
 * Source: https://github.com/corsairdev/corsair/tree/main/packages/perplexityai
 *
 * Package plugin id: perplexityai
 * Product node typeKey: perplexity (NodeType.PERPLEXITY)
 */

import type { IntegrationDefinition } from "../types"

export const PERPLEXITY_CORSAIR_ENDPOINTS = ["chat.completions"] as const

export const perplexityIntegrationDefinition: IntegrationDefinition = {
  typeKey: "perplexity",
  kind: "integration",
  corsairPluginId: "perplexityai",
  label: "Perplexity AI",
  operations: [
    {
      key: "chat.completions",
      aliases: [
        "CHAT",
        "CHAT_COMPLETION",
        "CREATE_COMPLETION",
        "GENERATE_TEXT",
        "SEARCH_CHAT",
      ],
      label: "Chat Completions",
      group: "Chat",
      risk: "write",
    },
  ],
}
