import { NodeType } from "@/generated/prisma"
import type { CorsairPluginId } from "@/lib/corsair"

/**
 * NodeType → Corsair plugin id for migrations.
 * Only nodes listed here are candidates for Corsair adapters.
 */
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
