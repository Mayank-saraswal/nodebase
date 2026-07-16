import { NodeType } from "@/generated/prisma"
import type { CorsairPluginId } from "@/lib/corsair/config"
import { gmailIntegrationDefinition } from "./integrations/gmail"
import { googleSheetsIntegrationDefinition } from "./integrations/google-sheets"
import { googleDriveIntegrationDefinition } from "./integrations/google-drive"
import { slackIntegrationDefinition } from "./integrations/slack"
import { githubIntegrationDefinition } from "./integrations/github"
import { notionIntegrationDefinition } from "./integrations/notion"
import { hubspotIntegrationDefinition } from "./integrations/hubspot"
import { telegramIntegrationDefinition } from "./integrations/telegram"
import { discordIntegrationDefinition } from "./integrations/discord"
import { twitterIntegrationDefinition } from "./integrations/twitter"
import { razorpayIntegrationDefinition } from "./integrations/razorpay"
import { stripeIntegrationDefinition } from "./integrations/stripe"
import { openaiIntegrationDefinition } from "./integrations/openai"
import { resolveOperation, buildAliasMap, listOperationKeys } from "./resolve"
import type { IntegrationDefinition } from "./types"

export type { IntegrationDefinition, OperationDefinition, RegistryExecuteContext, NodeKind } from "./types"
export { resolveOperation, buildAliasMap, listOperationKeys } from "./resolve"
export {
  extractOperation,
  extractVariableName,
  extractConnectionRefs,
  normalizeNodeData,
  toNodeDataV1,
  asRecord,
} from "./node-data"

const BY_TYPE_KEY: Record<string, IntegrationDefinition> = {
  gmail: gmailIntegrationDefinition,
  google_sheets: googleSheetsIntegrationDefinition,
  google_drive: googleDriveIntegrationDefinition,
  slack: slackIntegrationDefinition,
  github: githubIntegrationDefinition,
  notion: notionIntegrationDefinition,
  hubspot: hubspotIntegrationDefinition,
  telegram: telegramIntegrationDefinition,
  discord: discordIntegrationDefinition,
  twitter: twitterIntegrationDefinition,
  razorpay: razorpayIntegrationDefinition,
  stripe: stripeIntegrationDefinition,
  openai: openaiIntegrationDefinition,
}

/** Map Prisma NodeType → registry typeKey */
export const NODE_TYPE_TO_TYPE_KEY: Partial<Record<NodeType, string>> = {
  [NodeType.GMAIL]: "gmail",
  [NodeType.GOOGLE_SHEETS]: "google_sheets",
  [NodeType.GOOGLE_DRIVE]: "google_drive",
  [NodeType.SLACK]: "slack",
  [NodeType.GITHUB]: "github",
  [NodeType.GITHUB_TRIGGER]: "github",
  [NodeType.HUBSPOT]: "hubspot",
  [NodeType.NOTION]: "notion",
  [NodeType.TELEGRAM]: "telegram",
  [NodeType.DISCORD]: "discord",
  [NodeType.X]: "twitter",
  [NodeType.RAZORPAY]: "razorpay",
  [NodeType.RAZORPAY_TRIGGER]: "razorpay",
  [NodeType.STRIPE_TRIGGER]: "stripe",
  [NodeType.OPENAI]: "openai",
  [NodeType.DEEPSEEK]: "deepseek",
  [NodeType.GEMINI]: "gemini",
  [NodeType.PERPLEXITY]: "perplexity",
}

export function getIntegrationByTypeKey(
  typeKey: string,
): IntegrationDefinition | undefined {
  return BY_TYPE_KEY[typeKey]
}

export function getIntegrationForNodeType(
  type: NodeType | string,
): IntegrationDefinition | undefined {
  if (typeof type === "string" && BY_TYPE_KEY[type]) {
    return BY_TYPE_KEY[type]
  }
  const key = NODE_TYPE_TO_TYPE_KEY[type as NodeType]
  if (!key) return undefined
  return BY_TYPE_KEY[key]
}

/**
 * Resolve op for a node type; returns null if not an registered integration.
 * Throws NonRetriableError if integration exists but op is invalid.
 */
export function tryResolveNodeOperation(
  nodeType: NodeType | string,
  operation: string,
) {
  const integration = getIntegrationForNodeType(nodeType)
  if (!integration) return null
  return resolveOperation(integration, operation)
}

export function listRegisteredIntegrations(): IntegrationDefinition[] {
  return Object.values(BY_TYPE_KEY)
}

/** Corsair plugin map (legacy export path used by adapters) */
export const NODE_TYPE_TO_CORSAIR_PLUGIN: Partial<
  Record<NodeType, CorsairPluginId>
> = {
  [NodeType.GMAIL]: "gmail",
  [NodeType.GOOGLE_SHEETS]: "googlesheets",
  [NodeType.GOOGLE_DRIVE]: "googledrive",
  [NodeType.SLACK]: "slack",
  [NodeType.GITHUB]: "github",
  [NodeType.GITHUB_TRIGGER]: "github",
  [NodeType.HUBSPOT]: "hubspot",
  [NodeType.NOTION]: "notion",
  [NodeType.TELEGRAM]: "telegram",
  [NodeType.DISCORD]: "discord",
  [NodeType.X]: "twitter",
  [NodeType.RAZORPAY]: "razorpay",
  [NodeType.RAZORPAY_TRIGGER]: "razorpay",
  [NodeType.STRIPE_TRIGGER]: "stripe",
  [NodeType.OPENAI]: "openai",
  [NodeType.DEEPSEEK]: "deepseek",
  [NodeType.GEMINI]: "gemini",
  [NodeType.PERPLEXITY]: "perplexityai",
}

export function getCorsairPluginForNode(
  type: NodeType,
): CorsairPluginId | undefined {
  return NODE_TYPE_TO_CORSAIR_PLUGIN[type]
}

export {
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
  stripeIntegrationDefinition,
  openaiIntegrationDefinition,
}
