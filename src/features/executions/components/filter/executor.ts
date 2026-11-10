import { NonRetriableError } from "inngest"
import type { NodeExecutor } from "@/features/executions/types"
import prisma from "@/lib/db"
import { resolveTemplate } from "@/features/executions/lib/template-resolver"
import { filterChannel } from "@/inngest/channels/filter"
import { filterArray, filterObjectKeys } from "./filter-engine"
import type { ConditionGroup } from "./types"

export const filterExecutor: NodeExecutor = async ({ data, nodeId,
  context,
  step,
  publish,
  userId,
}) => {
  // ── Step 1: Load config ────────────────────────────────────────────────────
  const config = data as any;

await step.run(`filter-${nodeId}-validate`, async () => {
    if (!config) throw new NonRetriableError("Filter node not configured. Open settings to configure.")
    if (config.workflow.userId !== userId) throw new NonRetriableError("Unauthorized")
    return { valid: true }
  })

  if (!config) {
    throw new NonRetriableError("Filter node not configured. Open settings to configure.")
  }

  const variableName = config.variableName || "filter"

  // ── Publish loading OUTSIDE step.run ────────────────────────────────────────
  await publish(filterChannel(nodeId).status({ nodeId, status: "loading" }))

  // ── Step 2: Execute filter ─────────────────────────────────────────────────
  let result: Record<string, unknown>

 

  try {
    result = await step.run(`filter-${nodeId}-execute`, async () => {

      // Parse condition groups from JSON
      let conditionGroups: ConditionGroup[]
      try {
        conditionGroups = JSON.parse(config.conditionGroups) as ConditionGroup[]
      } catch {
        throw new NonRetriableError(
          "Filter condition groups are invalid JSON. Re-save the node configuration."
        )
      }

      const rootLogic = (config.rootLogic as "AND" | "OR") || "AND"
      const outputMode = config.outputMode || "filtered"
      const options = {
        includeMetadata: config.includeMetadata,
        caseSensitive: false,
        trimWhitespace: true,
        typeCoerce: true,
      }

      // ── FILTER_OBJECT_KEYS operation ───────────────────────────────────────
      if (config.operation === "FILTER_OBJECT_KEYS") {
        let inputObject: Record<string, unknown>

        try {
          const resolved = resolveTemplate(config.inputObject, context)
          if (typeof resolved === "string" && resolved.trim().startsWith("{")) {
            inputObject = JSON.parse(resolved) as Record<string, unknown>
          } else {
            try {
              const parsed = JSON.parse(String(resolved))
              if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
                inputObject = parsed as Record<string, unknown>
              } else {
                throw new NonRetriableError(
                  "Input Object must resolve to a JSON object. Check your template expression."
                )
              }
            } catch (e) {
              if (e instanceof NonRetriableError) throw e
              throw new NonRetriableError(
                `Failed to parse Input Object: ${e instanceof Error ? e.message : String(e)}`
              )
            }
          }
        } catch (e) {
          if (e instanceof NonRetriableError) throw e
          throw new NonRetriableError(
            `Failed to resolve Input Object: ${e instanceof Error ? e.message : String(e)}`
          )
        }

        const filterResult = filterObjectKeys(
          inputObject,
          conditionGroups,
          rootLogic,
          config.keepMatching,
          config.keyFilterMode as "key_name" | "key_value" | "both"
        )

        return {
          result: filterResult.result,
          removedKeys: filterResult.removedKeys,
          keptCount: Object.keys(filterResult.result).length,
          removedCount: filterResult.removedKeys.length,
          operation: "FILTER_OBJECT_KEYS",
          timestamp: new Date().toISOString(),
        }
      }

      // ── FILTER_ARRAY operation ─────────────────────────────────────────────
      let inputArray: unknown[]

      try {
        const resolved = resolveTemplate(config.inputArray, context)
        if (typeof resolved === "string") {
          if (resolved.trim().startsWith("[")) {
            try {
              const parsed = JSON.parse(resolved)
              if (!Array.isArray(parsed)) {
                throw new NonRetriableError(
                  "Input Array must resolve to a JSON array. " +
                  `Got: ${typeof parsed}. Check your template expression.`
                )
              }
              inputArray = parsed as unknown[]
            } catch (e) {
              if (e instanceof NonRetriableError) throw e
              throw new NonRetriableError(
                `Failed to parse Input Array JSON: ${e instanceof Error ? e.message : String(e)}`
              )
            }
          } else if (resolved === "") {
            throw new NonRetriableError(
              "Input Array is empty after template resolution. " +
              "Use {{variableName.fieldName}} where fieldName is an array."
            )
          } else {
            throw new NonRetriableError(
              `Input Array resolved to a non-array value: "${resolved.slice(0, 100)}". ` +
              "Use {{variableName.fieldName}} where fieldName is an array."
            )
          }
        } else {
          throw new NonRetriableError(
            `Input Array must resolve to an array. Got: ${typeof resolved}`
          )
        }
      } catch (e) {
        if (e instanceof NonRetriableError) throw e
        throw new NonRetriableError(
          `Failed to resolve Input Array: ${e instanceof Error ? e.message : String(e)}`
        )
      }

      // If no condition groups configured, return all items (passthrough)
      if (!conditionGroups || conditionGroups.length === 0) {
        const output: Record<string, unknown> = {
          items: inputArray,
          count: inputArray.length,
          totalInput: inputArray.length,
          rejectedCount: 0,
          passRate: "100%",
          hasResults: inputArray.length > 0,
          operation: "FILTER_ARRAY",
          timestamp: new Date().toISOString(),
        }
        if (outputMode === "both") output.rejected = []
        if (outputMode === "rejected") {
          output.items = []
          output.count = 0
          output.rejectedCount = inputArray.length
        }
        return output
      }

      const filterResult = filterArray(inputArray, conditionGroups, rootLogic, options)

      // stopOnEmpty check
      if (config.stopOnEmpty && filterResult.passed.length === 0) {
        throw new NonRetriableError(
          `Filter returned 0 results from ${inputArray.length} items. ` +
          "Workflow stopped because 'Stop on Empty' is enabled."
        )
      }

      const passRate = inputArray.length > 0
        ? `${Math.round((filterResult.passed.length / inputArray.length) * 100)}%`
        : "0%"

      const base: Record<string, unknown> = {
        totalInput: inputArray.length,
        count: filterResult.passed.length,
        rejectedCount: filterResult.rejected.length,
        passRate,
        hasResults: filterResult.passed.length > 0,
        operation: "FILTER_ARRAY",
        timestamp: new Date().toISOString(),
      }

      let stepResult: Record<string, unknown>
      switch (outputMode) {
        case "rejected":
          stepResult = { ...base, items: filterResult.rejected, count: filterResult.rejected.length }
          break
        case "both":
          stepResult = { ...base, items: filterResult.passed, rejected: filterResult.rejected }
          break
        case "stats_only":
          stepResult = base
          break
        case "filtered":
        default:
          stepResult = { ...base, items: filterResult.passed }
      }
      return stepResult
    })
  } catch (err) {
    await publish(filterChannel(nodeId).status({ nodeId, status: "error" }))

    if (err instanceof NonRetriableError) throw err

    if (config.continueOnFail) {
      result = {
        items: [],
        count: 0,
        totalInput: 0,
        rejectedCount: 0,
        hasResults: false,
        success: false,
        error: err instanceof Error ? err.message : String(err),
        operation: config.operation,
        timestamp: new Date().toISOString(),
      }
    } else {
      throw new NonRetriableError(
        `Filter error: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  await publish(filterChannel(nodeId).status({ nodeId, status: "success" }))

  return { ...context, [variableName]: result! }
}
