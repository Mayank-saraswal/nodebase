import { NonRetriableError } from "inngest"
import type { IntegrationDefinition, OperationDefinition } from "./types"

export type ResolvedOperation = {
  integration: IntegrationDefinition
  operation: OperationDefinition
  /** Key that was requested (may be an alias) */
  requestedKey: string
}

/**
 * Resolve operation by canonical key or any alias (case-sensitive first, then exact alias).
 */
export function resolveOperation(
  integration: IntegrationDefinition,
  requestedKey: string,
): ResolvedOperation {
  const key = requestedKey.trim()
  if (!key) {
    throw new NonRetriableError(
      `${integration.label}: operation is required on node config.`,
    )
  }

  for (const op of integration.operations) {
    if (op.key === key || op.aliases?.includes(key)) {
      if (op.enabled === false) {
        throw new NonRetriableError(
          `${integration.label}: operation "${key}" is disabled.`,
        )
      }
      return { integration, operation: op, requestedKey: key }
    }
  }

  const allowed = integration.operations
    .filter((o) => o.enabled !== false)
    .map((o) => o.key)
    .slice(0, 40)
    .join(", ")

  throw new NonRetriableError(
    `${integration.label}: unknown operation "${key}". ` +
      `Allowed (sample): ${allowed}${integration.operations.length > 40 ? ", …" : ""}`,
  )
}

/** Build alias → canonical key map for a plugin (for tests / UI) */
export function buildAliasMap(
  integration: IntegrationDefinition,
): Map<string, string> {
  const map = new Map<string, string>()
  for (const op of integration.operations) {
    map.set(op.key, op.key)
    for (const a of op.aliases ?? []) {
      map.set(a, op.key)
    }
  }
  return map
}

export function listOperationKeys(
  integration: IntegrationDefinition,
): string[] {
  return integration.operations.map((o) => o.key)
}
