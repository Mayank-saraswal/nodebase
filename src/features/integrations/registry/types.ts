/**
 * Option C operation registry types.
 * Ops are code-defined (and backed by Corsair packages), never Prisma enums.
 */

import type { ZodType } from "zod"
import type { CorsairPluginId } from "@/lib/corsair/config"
import type { WorkflowContext } from "@/features/executions/types"
import type { StepTools } from "@/features/executions/types"
import type { Realtime } from "@inngest/realtime"

/** Product node kind for routing platform vs integration handlers */
export type NodeKind = "platform" | "integration" | "trigger"

/**
 * Params bag for an operation after template resolution.
 * Values are unknown until validated by the operation's Zod schema.
 */
export type OperationParams = Record<string, unknown>

export type RegistryExecuteContext = {
  tenantId: string
  userId: string
  nodeId: string
  /** Canonical operation key after alias resolve */
  operation: string
  params: OperationParams
  context: WorkflowContext
  /**
   * Corsair tenant client or null for platform nodes.
   * Typed as unknown at this layer because each plugin has a different client shape;
   * adapters narrow with type guards.
   */
  client: unknown
  step: StepTools
  publish: Realtime.PublishFn
}

export type OperationDefinition = {
  /** Canonical key stored going forward (prefer Corsair path e.g. messages.send) */
  key: string
  /** Legacy Nodebase names still accepted from old workflows */
  aliases?: readonly string[]
  label: string
  group?: string
  description?: string
  risk?: "read" | "write" | "destructive"
  /** When false, op is rejected at runtime (product policy) */
  enabled?: boolean
  /**
   * Zod schema for params. Input is OperationParams (unknown values)
   * because Node.data comes from JSON.
   */
  inputSchema?: ZodType<OperationParams>
  execute?: (ctx: RegistryExecuteContext) => Promise<Record<string, unknown>>
}

export type IntegrationDefinition = {
  /** Product type key e.g. gmail, google_sheets */
  typeKey: string
  kind: NodeKind
  /** Corsair plugin id when kind is integration */
  corsairPluginId?: CorsairPluginId
  label: string
  operations: readonly OperationDefinition[]
}
