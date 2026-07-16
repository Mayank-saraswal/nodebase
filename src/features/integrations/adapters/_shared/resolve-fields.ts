import { resolveTemplate } from "@/features/executions/lib/template-resolver"
import type { WorkflowContext } from "@/features/executions/types"

/** Resolve a string field with Handlebars templates; empty → "". */
export function t(
  value: string | undefined | null,
  context: WorkflowContext,
): string {
  if (value == null) return ""
  return resolveTemplate(String(value), context)
}

/** Resolve optional number-like fields. */
export function tNumber(
  value: string | number | undefined | null,
  context: WorkflowContext,
): number | undefined {
  if (value == null || value === "") return undefined
  if (typeof value === "number") return value
  const resolved = resolveTemplate(String(value), context)
  const n = Number(resolved)
  return Number.isFinite(n) ? n : undefined
}
