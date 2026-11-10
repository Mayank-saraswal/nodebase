import type { NodeExecutor } from "@/features/executions/types"
import prisma from "@/lib/db"
import { IfElseOperator } from "./types"
import {
  evaluateConditions,
  parseConditionsJson,
} from "./evaluate-conditions"

/**
 * Resolves a dot-notation path against a nested object.
 * Supports: "body.user.email", "headers.x-api-key", "output.score"
 * Returns undefined if path does not exist.
 */
function resolvePath(data: unknown, path: string): unknown {
  if (!path.trim()) return data
  return path.split(".").reduce((current: unknown, key: string) => {
    if (current === null || current === undefined) return undefined
    if (typeof current !== "object") return undefined
    return (current as Record<string, unknown>)[key]
  }, data)
}

/**
 * Coerces a value to number for numeric comparisons.
 * Returns NaN if not parseable.
 */
function toNumber(val: unknown): number {
  if (typeof val === "number") return val
  if (typeof val === "string") return parseFloat(val)
  return NaN
}

/**
 * Core condition evaluator for legacy single-condition mode.
 * Matches n8n's IF node behavior.
 */
export function evaluateCondition(
  inputData: unknown,
  field: string,
  operator: IfElseOperator,
  value: string
): boolean {
  const resolved = resolvePath(inputData, field)
  const resolvedStr =
    resolved === null || resolved === undefined ? "" : String(resolved)

  switch (operator) {
    case IfElseOperator.EQUALS:
      return resolvedStr === value
    case IfElseOperator.NOT_EQUALS:
      return resolvedStr !== value
    case IfElseOperator.CONTAINS:
      return resolvedStr.toLowerCase().includes(value.toLowerCase())
    case IfElseOperator.NOT_CONTAINS:
      return !resolvedStr.toLowerCase().includes(value.toLowerCase())
    case IfElseOperator.STARTS_WITH:
      return resolvedStr.toLowerCase().startsWith(value.toLowerCase())
    case IfElseOperator.ENDS_WITH:
      return resolvedStr.toLowerCase().endsWith(value.toLowerCase())
    case IfElseOperator.GREATER_THAN: {
      const a = toNumber(resolved),
        b = toNumber(value)
      return !isNaN(a) && !isNaN(b) && a > b
    }
    case IfElseOperator.LESS_THAN: {
      const a = toNumber(resolved),
        b = toNumber(value)
      return !isNaN(a) && !isNaN(b) && a < b
    }
    case IfElseOperator.GREATER_THAN_OR_EQUAL: {
      const a = toNumber(resolved),
        b = toNumber(value)
      return !isNaN(a) && !isNaN(b) && a >= b
    }
    case IfElseOperator.LESS_THAN_OR_EQUAL: {
      const a = toNumber(resolved),
        b = toNumber(value)
      return !isNaN(a) && !isNaN(b) && a <= b
    }
    case IfElseOperator.IS_EMPTY:
      return resolved === null || resolved === undefined || resolvedStr === ""
    case IfElseOperator.IS_NOT_EMPTY:
      return resolved !== null && resolved !== undefined && resolvedStr !== ""
    case IfElseOperator.IS_TRUE:
      return resolved === true || resolvedStr === "true" || resolvedStr === "1"
    case IfElseOperator.IS_FALSE:
      return (
        resolved === false || resolvedStr === "false" || resolvedStr === "0"
      )
    case IfElseOperator.REGEX_MATCH: {
      try {
        return new RegExp(value).test(resolvedStr)
      } catch {
        return false
      }
    }
    default:
      return false
  }
}

type IfElseData = {
  field?: string
  operator?: IfElseOperator
  value?: string
  conditionsJson?: string
}

export const ifElseExecutor: NodeExecutor<IfElseData> = async ({ data, context }) => {
  const config = data

  if (!config) {
    return {
      ...context,
      branch: "false",
    }
  }

  // Use compound conditions if conditionsJson is set, otherwise fall back to legacy single-condition
  const conditionsConfig = parseConditionsJson(config.conditionsJson ?? "")

  if (conditionsConfig) {
    const ctx = (typeof context === "object" && context !== null ? context : {}) as Record<string, unknown>
    const result = evaluateConditions(conditionsConfig, ctx)
    return {
      ...context,
      branch: result ? "true" : "false",
    }
  }

  // Legacy single-condition path
  const result = evaluateCondition(
    context,
    config.field ?? "",
    config.operator ?? IfElseOperator.EQUALS,
    config.value ?? ""
  )

  return {
    ...context,
    branch: result ? "true" : "false",
  }
}
