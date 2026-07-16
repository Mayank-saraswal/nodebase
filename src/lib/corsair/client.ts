import "server-only"
import { createCorsair } from "corsair"
import { gmail } from "@corsair-dev/gmail"
import { googlesheets } from "@corsair-dev/googlesheets"
import { googledrive } from "@corsair-dev/googledrive"
import { slack } from "@corsair-dev/slack"
import { getCorsairPool } from "./pool"
import {
  getAppUrl,
  isCorsairEnabled,
  requireCorsairKek,
} from "./config"

/**
 * Lazy singleton Corsair instance (multi-tenant, self-hosted manual OAuth).
 * Plugins are registered here only — executors import adapters, not plugins.
 */
const globalForCorsair = globalThis as unknown as {
  nodebaseCorsair: ReturnType<typeof buildCorsair> | undefined
}

function buildCorsair() {
  const appUrl = getAppUrl()
  const pool = getCorsairPool()
  const kek = requireCorsairKek()

  return createCorsair({
    multiTenancy: true,
    database: pool,
    kek,
    // Global permission transport (not risk mode). Risk mode is per-plugin.
    permissions: {
      timeout: "30m",
      onTimeout: "deny",
      mode: "asynchronous",
    },
    manual: {
      baseUrl: `${appUrl}/integrations/connect`,
      redirectUri: `${appUrl}/api/integrations/oauth/callback`,
      approvalBaseUrl: `${appUrl}/integrations/approve`,
    },
    plugins: [
      // Register plugins as they are migrated. mode: "open" for automation.
      gmail({
        permissions: { mode: "open" },
      }),
      googlesheets({
        permissions: { mode: "open" },
      }),
      googledrive({
        permissions: { mode: "open" },
      }),
      slack({
        permissions: { mode: "open" },
      }),
    ],
  })
}

/**
 * Returns the multi-tenant Corsair wrapper.
 * Throws if Corsair is disabled or misconfigured.
 */
export function getCorsair() {
  if (!isCorsairEnabled()) {
    throw new Error(
      "Corsair is disabled. Set CORSAIR_ENABLED=true and CORSAIR_KEK to use the integration backbone.",
    )
  }

  if (!globalForCorsair.nodebaseCorsair) {
    globalForCorsair.nodebaseCorsair = buildCorsair()
  }
  return globalForCorsair.nodebaseCorsair
}

/**
 * Safe getter for routes that should degrade when Corsair is off.
 */
export function tryGetCorsair(): ReturnType<typeof buildCorsair> | null {
  if (!isCorsairEnabled()) return null
  try {
    return getCorsair()
  } catch {
    return null
  }
}

export type NodebaseCorsair = ReturnType<typeof getCorsair>
export type NodebaseCorsairTenant = ReturnType<NodebaseCorsair["withTenant"]>
