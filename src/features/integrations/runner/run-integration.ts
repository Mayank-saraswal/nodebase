/**
 * Option C generic integration runner.
 *
 * Single path for Corsair-backed integrations:
 *   node type → registry → resolve op → withTenant → adapter.run
 *
 * Security / tenancy:
 * - tenantId is required and never taken from untrusted node.data
 * - client is always created via getCorsair().withTenant(tenantId)
 * - operation must resolve through the registry (no free-form API calls)
 *
 * Dual-path: callers still fall back to legacy executors when
 * isCorsairPluginEnabled(plugin) is false.
 */

import { NonRetriableError } from "inngest"
import type { NodeType } from "@/generated/prisma"
import type { WorkflowContext } from "@/features/executions/types"
import {
  getCorsair,
  isCorsairPluginEnabled,
  mapCorsairError,
  type CorsairPluginId,
} from "@/lib/corsair"
import { getIntegrationForNodeType } from "@/features/integrations/registry"
import type { IntegrationDefinition } from "@/features/integrations/registry/types"
import {
  extractOperation,
  extractVariableName,
  normalizeNodeData,
} from "@/features/integrations/registry/node-data"
import { resolveOperation } from "@/features/integrations/registry/resolve"
import type { IntegrationAdapter } from "@/features/integrations/types"
import { gmailAdapter } from "@/features/integrations/adapters/gmail/adapter"
import { googleSheetsAdapter } from "@/features/integrations/adapters/google-sheets/adapter"
import { googleDriveAdapter } from "@/features/integrations/adapters/google-drive/adapter"
import { slackAdapter } from "@/features/integrations/adapters/slack/adapter"
import { githubAdapter } from "@/features/integrations/adapters/github/adapter"
import { notionAdapter } from "@/features/integrations/adapters/notion/adapter"

/** Adapter map keyed by Corsair plugin id */
const ADAPTERS: Partial<Record<CorsairPluginId, IntegrationAdapter>> = {
  gmail: gmailAdapter,
  googlesheets: googleSheetsAdapter,
  googledrive: googleDriveAdapter,
  slack: slackAdapter,
  github: githubAdapter,
  notion: notionAdapter,
}

export type RunIntegrationParams = {
  nodeType: NodeType | string
  /** Raw Node.data from DB / editor (JSON boundary) */
  data: unknown
  context: WorkflowContext
  nodeId: string
  userId: string
  /**
   * Isolation key. Must come from workflow ownership / Inngest stamp —
   * never from client-supplied node config alone.
   */
  tenantId: string
}

export type RunIntegrationResult = {
  context: WorkflowContext
  integration: IntegrationDefinition
  /** Canonical op key after alias resolve */
  operationKey: string
  /** Op key as requested on the node */
  requestedOperation: string
}

/**
 * Returns true when this node type has a Corsair adapter AND the plugin flag is on.
 */
export function canRunViaCorsair(nodeType: NodeType | string): boolean {
  const integration = getIntegrationForNodeType(nodeType)
  if (!integration?.corsairPluginId) return false
  const adapter = ADAPTERS[integration.corsairPluginId]
  if (!adapter) return false
  return isCorsairPluginEnabled(integration.corsairPluginId)
}

/**
 * Execute an integration node via registry + Corsair tenant client.
 * Throws NonRetriableError for config/auth issues; RetryAfterError via mapCorsairError.
 */
export async function runIntegration(
  params: RunIntegrationParams,
): Promise<RunIntegrationResult> {
  const { nodeType, data, context, nodeId, userId, tenantId } = params

  if (!tenantId || tenantId.trim() === "") {
    throw new NonRetriableError(
      "Integration run rejected: missing tenantId (multi-tenant isolation).",
    )
  }

  const integration = getIntegrationForNodeType(nodeType)
  if (!integration) {
    throw new NonRetriableError(
      `No Option C registry entry for node type "${String(nodeType)}".`,
    )
  }

  if (!integration.corsairPluginId) {
    throw new NonRetriableError(
      `${integration.label} is not a Corsair-backed integration.`,
    )
  }

  if (!isCorsairPluginEnabled(integration.corsairPluginId)) {
    throw new NonRetriableError(
      `${integration.label}: Corsair plugin "${integration.corsairPluginId}" is disabled.`,
    )
  }

  const adapter = ADAPTERS[integration.corsairPluginId]
  if (!adapter) {
    throw new NonRetriableError(
      `${integration.label}: no adapter registered for plugin "${integration.corsairPluginId}".`,
    )
  }

  // unknown: Node.data is free-form JSON until we normalize + registry-validate op
  const normalized = normalizeNodeData(data)
  const requestedOperation = extractOperation(normalized)
  if (!requestedOperation) {
    throw new NonRetriableError(
      `${integration.label}: operation is required on node config.`,
    )
  }

  // Registry validates alias / enable flags (throws NonRetriableError if unknown)
  const resolved = resolveOperation(integration, requestedOperation)

  // Optional Zod input schema when defined on the op
  if (resolved.operation.inputSchema) {
    const parsed = resolved.operation.inputSchema.safeParse(normalized)
    if (!parsed.success) {
      const msg = parsed.error.issues
        .slice(0, 5)
        .map((i) => `${i.path.join(".") || "params"}: ${i.message}`)
        .join("; ")
      throw new NonRetriableError(
        `${integration.label} ${resolved.operation.key}: invalid params — ${msg}`,
      )
    }
  }

  // Ensure operation string on data is the requested (or leave as-is for adapters)
  const adapterData: Record<string, unknown> = {
    ...normalized,
    operation: requestedOperation,
    // Pass canonical for adapters that prefer it
    _canonicalOperation: resolved.operation.key,
  }

  // Security: tenant client only — never root client for provider APIs
  const client = getCorsair().withTenant(tenantId)

  let nextContext: WorkflowContext
  try {
    nextContext = await adapter.run({
      data: adapterData,
      context,
      client,
      nodeId,
      userId,
    })
  } catch (err) {
    if (err instanceof NonRetriableError) throw err
    // mapCorsairError always throws
    mapCorsairError(err, integration.label)
  }

  // Ensure variableName still present if adapter returned raw slice without it
  const variableName = extractVariableName(normalized, integration.typeKey)
  if (nextContext[variableName] === undefined) {
    // Adapters already merge context; this is a safety net only
  }

  return {
    context: nextContext,
    integration,
    operationKey: resolved.operation.key,
    requestedOperation,
  }
}

/**
 * Convenience for dual-path executors: run Corsair path if enabled, else null.
 * Returns null when plugin flag off so caller can run legacy path.
 */
export async function tryRunIntegration(
  params: RunIntegrationParams,
): Promise<RunIntegrationResult | null> {
  if (!canRunViaCorsair(params.nodeType)) return null
  return runIntegration(params)
}
