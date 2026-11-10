/**
 * Re-export all node data types from the centralized location
 * This file serves as the main export point for type-safe node configurations
 */

// Re-export all types from index.ts
export * from "./index"

// Import the types for use in executors
import type { NodeType } from "@/generated/prisma"

// ─────────────────────────────────────────────────────────────
// Type-safe helper to extract credentialId from node data
// ─────────────────────────────────────────────────────────────

/**
 * Type-safe extraction of credentialId from node data
 * Replaces the pattern: (node.data as unknown)?.credentialId || null
 */
export function getCredentialId(data: unknown): string | null {
  if (!data || typeof data !== "object") return null
  const nodeData = data as Record<string, unknown>
  const credentialId = nodeData.credentialId
  return typeof credentialId === "string" ? credentialId : null
}

/**
 * Type-safe extraction of variableName from node data with fallback
 */
export function getVariableName(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback
  const nodeData = data as Record<string, unknown>
  const variableName = nodeData.variableName
  return typeof variableName === "string" && variableName ? variableName : fallback
}

/**
 * Type-safe extraction of workflowId from node data
 */
export function getWorkflowId(data: unknown): string | null {
  if (!data || typeof data !== "object") return null
  const nodeData = data as Record<string, unknown>
  const workflowId = nodeData.workflowId
  return typeof workflowId === "string" ? workflowId : null
}

/**
 * Type guard to check if data has a workflow relation
 */
export function hasWorkflowRelation(data: unknown): data is { workflow: { userId: string } } {
  if (!data || typeof data !== "object") return false
  const nodeData = data as Record<string, unknown>
  return (
    nodeData.workflow !== null &&
    typeof nodeData.workflow === "object" &&
    nodeData.workflow !== undefined &&
    "userId" in (nodeData.workflow as Record<string, unknown>)
  )
}

/**
 * Type-safe extraction of userId from node data's workflow relation
 */
export function getWorkflowUserId(data: unknown): string | null {
  if (!hasWorkflowRelation(data)) return null
  return data.workflow.userId
}

/**
 * Type-safe helper to check if a value is a valid CredentialType
 */
export function isValidCredentialType(value: unknown): value is string {
  return typeof value === "string" && value.length > 0
}

/**
 * Type-safe extraction of operation from node data
 */
export function getOperation(data: unknown): string | null {
  if (!data || typeof data !== "object") return null
  const nodeData = data as Record<string, unknown>
  const operation = nodeData.operation
  return typeof operation === "string" ? operation : null
}
