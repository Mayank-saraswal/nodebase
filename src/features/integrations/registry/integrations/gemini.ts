/**
 * Gemini registry — full @corsair-dev/gemini surface (8 endpoints).
 * Source: https://github.com/corsairdev/corsair/tree/main/packages/gemini
 */

import type { IntegrationDefinition } from "../types"

export const GEMINI_CORSAIR_ENDPOINTS = [
  "content.countTokens",
  "content.embedContent",
  "content.generateContent",
  "images.generateImage",
  "videos.generateVideos",
  "videos.getVideosOperation",
  "videos.waitForVideo",
  "models.listModels",
] as const

export const geminiIntegrationDefinition: IntegrationDefinition = {
  typeKey: "gemini",
  kind: "integration",
  corsairPluginId: "gemini",
  label: "Gemini",
  operations: [
    {
      key: "content.generateContent",
      aliases: ["CHAT", "GENERATE_CONTENT", "GENERATE_TEXT"],
      label: "Generate Content",
      group: "Content",
      risk: "write",
    },
    {
      key: "content.countTokens",
      aliases: ["COUNT_TOKENS"],
      label: "Count Tokens",
      group: "Content",
      risk: "read",
    },
    {
      key: "content.embedContent",
      aliases: ["EMBED", "EMBED_CONTENT"],
      label: "Embed Content",
      group: "Content",
      risk: "read",
    },
    {
      key: "images.generateImage",
      aliases: ["IMAGE", "GENERATE_IMAGE"],
      label: "Generate Image",
      group: "Images",
      risk: "write",
    },
    {
      key: "videos.generateVideos",
      aliases: ["GENERATE_VIDEO", "VIDEO"],
      label: "Generate Videos",
      group: "Videos",
      risk: "write",
    },
    {
      key: "videos.getVideosOperation",
      aliases: ["GET_VIDEO_OPERATION", "GET_VIDEO_OP"],
      label: "Get Video Operation",
      group: "Videos",
      risk: "read",
    },
    {
      key: "videos.waitForVideo",
      aliases: ["WAIT_VIDEO", "WAIT_FOR_VIDEO"],
      label: "Wait For Video",
      group: "Videos",
      risk: "read",
    },
    {
      key: "models.listModels",
      aliases: ["LIST_MODELS"],
      label: "List Models",
      group: "Models",
      risk: "read",
    },
  ],
}
