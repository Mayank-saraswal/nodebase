/**
 * Option C Node.data helpers.
 * Supports legacy flat shapes and schemaVersion 1 { operation, params }.
 */

export type NodeDataV1 = {
  schemaVersion: 1
  operation: string
  variableName?: string
  connectionRef?: string
  credentialId?: string
  params: Record<string, unknown>
}

/**
 * Prisma Json / React Flow node.data arrives as unknown JSON.
 * We narrow without `any` and document each unknown boundary.
 */
export function asRecord(
  value: unknown,
): Record<string, unknown> {
  // unknown: JSON boundary from DB/client — not a trusted typed object
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

/**
 * Extract operation string from node data (legacy top-level or v1).
 */
export function extractOperation(data: unknown): string {
  const rec = asRecord(data)
  if (typeof rec.operation === "string" && rec.operation.trim() !== "") {
    return rec.operation.trim()
  }
  return ""
}

/**
 * Extract variableName with safe default.
 */
export function extractVariableName(
  data: unknown,
  fallback: string,
): string {
  const rec = asRecord(data)
  if (typeof rec.variableName === "string" && rec.variableName.trim() !== "") {
    return rec.variableName.trim()
  }
  return fallback
}

/**
 * Extract credential / connection refs for dual-run migration.
 */
export function extractConnectionRefs(data: unknown): {
  credentialId: string | null
  connectionRef: string | null
} {
  const rec = asRecord(data)
  const credentialId =
    typeof rec.credentialId === "string" && rec.credentialId.trim() !== ""
      ? rec.credentialId
      : null
  const connectionRef =
    typeof rec.connectionRef === "string" && rec.connectionRef.trim() !== ""
      ? rec.connectionRef
      : null
  return { credentialId, connectionRef }
}

/**
 * Normalize any stored node data into a flat view for adapters.
 * Legacy: fields at top level. V1: fields under params.
 * Returns a merged record (params win over top-level for conflicts).
 */
export function normalizeNodeData(data: unknown): Record<string, unknown> {
  const rec = asRecord(data)
  const schemaVersion = rec.schemaVersion
  if (schemaVersion === 1) {
    // unknown: params bag is free-form JSON until Zod validates per op
    const params = asRecord(rec.params)
    return {
      ...params,
      operation: rec.operation,
      variableName: rec.variableName,
      credentialId: rec.credentialId,
      connectionRef: rec.connectionRef,
      schemaVersion: 1,
    }
  }
  return { ...rec }
}

/**
 * Build schemaVersion 1 document for new writes (optional progressive migrate).
 */
export function toNodeDataV1(
  operation: string,
  params: Record<string, unknown>,
  meta?: {
    variableName?: string
    credentialId?: string
    connectionRef?: string
  },
): NodeDataV1 {
  return {
    schemaVersion: 1,
    operation,
    params,
    variableName: meta?.variableName,
    credentialId: meta?.credentialId,
    connectionRef: meta?.connectionRef,
  }
}
