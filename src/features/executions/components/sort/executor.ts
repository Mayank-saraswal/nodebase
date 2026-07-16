import { NonRetriableError } from "inngest"
import type { NodeExecutor } from "@/features/executions/types"
import { resolveTemplate } from "@/features/executions/lib/template-resolver"
import { sortChannel } from "@/inngest/channels/sort"
import prisma from "@/lib/db"
import {
  sortArray,
  sortObjectKeys,
  shuffleArray,
  reverseArray,
  getNestedValue,
} from "./sort-engine"
import type { SortKey } from "./types"

export const sortExecutor: NodeExecutor = async ({ data, nodeId,
  context,
  step,
  publish,
  userId,
}) => {
  // Load config
  const config = data as any;

// Validate
  await step.run(`sort-${nodeId}-validate`, async () => {
    if (!config) {
      throw new NonRetriableError(
        "Sort node: configuration not found. Please re-save the node."
      )
    }
    if (config.workflow.userId !== userId) throw new NonRetriableError("Unauthorized")
    return { valid: true }
  })

  if (!config) throw new NonRetriableError("Node not configured")
  
  // Parse sortKeys from JSON string
  const sortKeys: SortKey[] = JSON.parse(config.sortKeys)

  // Publish OUTSIDE step.run
  await publish(sortChannel(nodeId).status({ nodeId, status: "loading" }))

  let executionResult: unknown

  try {
    executionResult = await step.run(`sort-${nodeId}-execute`, async () => {
      // ── Resolve input ──────────────────────────────────────────────────
      let inputData: unknown

      if (config.inputPath && config.inputPath.trim()) {
        const resolvedPath = resolveTemplate(config.inputPath, context)
        inputData = getNestedValue(context, resolvedPath as string)
      } else {
        const COMMON_ARRAY_KEYS = [
          "rows", "items", "results", "data", "messages",
          "records", "entries", "list", "array", "output",
        ]

        const contextValues = Object.values(context)
        for (const val of contextValues.reverse()) {
          if (Array.isArray(val)) {
            inputData = val
            break
          }
          if (val && typeof val === "object") {
            for (const key of COMMON_ARRAY_KEYS) {
              const nested = (val as Record<string, unknown>)[key]
              if (Array.isArray(nested)) {
                inputData = nested
                break
              }
            }
            if (Array.isArray(inputData)) break
          }
        }
      }

      if (inputData === undefined || inputData === null) {
        throw new NonRetriableError(
          "Sort node: No input data found. " +
            "Set 'Input Path' to the dot-notation path of the array to sort, " +
            "e.g. 'googleSheets.rows' or 'razorpayTrigger.payload.items'."
        )
      }

      const operation = config.operation ?? "SORT_ARRAY"
      
      switch (operation) {
        case "SORT_ARRAY": {
          if (!Array.isArray(inputData)) {
            throw new NonRetriableError(
              `Sort node: Input at path '${config.inputPath}' is not an array. ` +
                `Got: ${typeof inputData}. ` +
                `Make sure the previous node outputs an array.`
            )
          }

          if (sortKeys.length === 0) {
            throw new NonRetriableError(
              "Sort node: No sort keys configured. " +
                "Add at least one sort key in the node settings."
            )
          }

          const resolvedKeys: SortKey[] = sortKeys.map((key) => ({
            ...key,
            field: resolveTemplate(key.field, context) as string,
          }))

          const sorted = sortArray(inputData, resolvedKeys)

          return {
            items: sorted,
            count: sorted.length,
            operation: "SORT_ARRAY",
            sortedBy: resolvedKeys.map((k) => `${k.field} ${k.direction}`),
          }
        }

        case "REVERSE": {
          if (!Array.isArray(inputData)) {
            throw new NonRetriableError(
              `Sort node: REVERSE requires an array. Got: ${typeof inputData}`
            )
          }
          const reversed = reverseArray(inputData)
          return {
            items: reversed,
            count: reversed.length,
            operation: "REVERSE",
          }
        }

        case "SHUFFLE": {
          if (!Array.isArray(inputData)) {
            throw new NonRetriableError(
              `Sort node: SHUFFLE requires an array. Got: ${typeof inputData}`
            )
          }
          const shuffled = shuffleArray(inputData)
          return {
            items: shuffled,
            count: shuffled.length,
            operation: "SHUFFLE",
          }
        }

        case "SORT_KEYS": {
          if (typeof inputData !== "object" || Array.isArray(inputData) || inputData === null) {
            throw new NonRetriableError(
              `Sort node: SORT_KEYS requires a plain object. Got: ${
                Array.isArray(inputData) ? "array" : typeof inputData
              }`
            )
          }

          const primaryKey = sortKeys?.[0]
          const direction = primaryKey?.direction ?? "asc"
          const locale = primaryKey?.locale ?? ""

          const sorted = sortObjectKeys(
            inputData as Record<string, unknown>,
            direction,
            locale
          )
          return {
            items: sorted,
            count: Object.keys(sorted).length,
            operation: "SORT_KEYS",
          }
        }

        default:
          throw new NonRetriableError(
            `Sort node: Unknown operation '${operation}'. ` +
              `Valid operations: SORT_ARRAY, REVERSE, SHUFFLE, SORT_KEYS`
          )
      }
    })
  } catch (err) {
    await publish(sortChannel(nodeId).status({ nodeId, status: "error" }))
    throw err
  }

  await publish(sortChannel(nodeId).status({ nodeId, status: "success" }))

  // Return ONLY the new variable, not ...context spread
  return { [config.variableName]: executionResult }
}
