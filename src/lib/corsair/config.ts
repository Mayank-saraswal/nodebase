/**
 * Corsair feature flags and env config.
 * Master switch + per-plugin flags for safe rollouts.
 */

export type CorsairPluginId =
  | "gmail"
  | "googlesheets"
  | "googledrive"
  | "slack"
  | "github"
  | "hubspot"
  | "notion"
  | "telegram"
  | "discord"
  | "twitter"
  | "razorpay"
  | "stripe"
  | "openai"
  | "deepseek"
  | "gemini"
  | "perplexityai"

function envFlag(name: string, defaultValue = false): boolean {
  const v = process.env[name]
  if (v === undefined || v === "") return defaultValue
  return v === "1" || v.toLowerCase() === "true" || v.toLowerCase() === "yes"
}

/** Master switch — when false, all executors use legacy paths. */
export function isCorsairEnabled(): boolean {
  return envFlag("CORSAIR_ENABLED", false)
}

const PLUGIN_ENV: Record<CorsairPluginId, string> = {
  gmail: "CORSAIR_PLUGIN_GMAIL",
  googlesheets: "CORSAIR_PLUGIN_GOOGLESHEETS",
  googledrive: "CORSAIR_PLUGIN_GOOGLEDRIVE",
  slack: "CORSAIR_PLUGIN_SLACK",
  github: "CORSAIR_PLUGIN_GITHUB",
  hubspot: "CORSAIR_PLUGIN_HUBSPOT",
  notion: "CORSAIR_PLUGIN_NOTION",
  telegram: "CORSAIR_PLUGIN_TELEGRAM",
  discord: "CORSAIR_PLUGIN_DISCORD",
  twitter: "CORSAIR_PLUGIN_TWITTER",
  razorpay: "CORSAIR_PLUGIN_RAZORPAY",
  stripe: "CORSAIR_PLUGIN_STRIPE",
  openai: "CORSAIR_PLUGIN_OPENAI",
  deepseek: "CORSAIR_PLUGIN_DEEPSEEK",
  gemini: "CORSAIR_PLUGIN_GEMINI",
  perplexityai: "CORSAIR_PLUGIN_PERPLEXITY",
}

/** Per-plugin switch. Requires CORSAIR_ENABLED=true as well. */
export function isCorsairPluginEnabled(plugin: CorsairPluginId): boolean {
  if (!isCorsairEnabled()) return false
  // Default: when master is on, gmail defaults to true for first cutover; others opt-in
  const defaultOn = plugin === "gmail"
  return envFlag(PLUGIN_ENV[plugin], defaultOn)
}

export function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  )
}

export function getCorsairKek(): string | undefined {
  const kek = process.env.CORSAIR_KEK?.trim()
  return kek || undefined
}

export function requireCorsairKek(): string {
  const kek = getCorsairKek()
  if (!kek) {
    throw new Error(
      "CORSAIR_KEK is required when Corsair is enabled. Generate with: openssl rand -base64 32",
    )
  }
  return kek
}
