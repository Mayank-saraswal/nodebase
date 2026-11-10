import { NonRetriableError } from "inngest"
import type { NodeExecutor } from "@/features/executions/types"
import prisma from "@/lib/db"
import { resolveTemplate } from "@/features/executions/lib/template-resolver"
import { aggregateChannel } from "@/inngest/channels/aggregate"
import {
  extractNumericValues,
  computeSum,
  computeAverage,
  computeMin,
  computeMax,
  computeMedian,
  computeMode,
  computeStdDev,
  computePercentile,
  computeDistinct,
  computeConcatenate,
  groupBy,
  runNestedAggregates,
  computePivot,
  computeFrequencyDistribution,
  runMultiOps,
  getNestedValue,
  roundTo,
} from "./aggregate-engine"
import type { AggregateOp, NullHandling } from "./types"

export const aggregateExecutor: NodeExecutor = async ({ data, nodeId,
  context,
  step,
  publish,
  userId,
}) => {
  // Step 1: Load config
  const config = data as any;

await step.run(`aggregate-${nodeId}-validate`, async () => {
    if (!config) throw new NonRetriableError("Aggregate node not configured.")
    if (config.workflow.userId !== userId) throw new NonRetriableError("Unauthorized")
    return { valid: true }
  })

  if (!config) throw new NonRetriableError("Aggregate node not configured.")

  const variableName = config.variableName || "aggregate"
  const nullHandling = (config.nullHandling || "exclude") as NullHandling
  const roundDecimals = config.roundDecimals ?? 2

  // publish OUTSIDE step.run
  await publish(aggregateChannel(nodeId).status({ nodeId, status: "loading" }))

  let result: Record<string, unknown>

  try {
    result = await step.run(`aggregate-${nodeId}-execute`, async () => {
      // ── Resolve input array ───────────────────────────────────────────────
      let inputData: unknown[]

      if (config.inputPath && config.inputPath.trim()) {
        const resolvedPath = resolveTemplate(config.inputPath, context)
        const resolved = getNestedValue(context, resolvedPath)
        if (!Array.isArray(resolved)) {
          throw new NonRetriableError(
            `Aggregate node: Input at path '${config.inputPath}' is not an array. ` +
            `Got: ${typeof resolved}. Use dot-notation: 'filter.items', 'googleSheets.rows'`
          )
        }
        inputData = resolved
      } else {
        // Auto-detect: find most recent array in context
        const COMMON_ARRAY_KEYS = [
          "items", "rows", "passed", "results", "data", "messages",
          "records", "entries", "list", "array", "output",
        ]
        inputData = []
        const contextValues = Object.values(context)
        for (const val of [...contextValues].reverse()) {
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
            if (inputData.length > 0) break
          }
        }
        if (inputData.length === 0 && Object.values(context).every(v => !Array.isArray(v))) {
          throw new NonRetriableError(
            "Aggregate node: No array found in previous node output. " +
            "Set 'Input Path' to the dot-notation path of the array."
          )
        }
      }

      const field = config.field ? resolveTemplate(config.field, context) : ""
      const operation = config.operation || "COUNT"

      // ── Operation dispatch ────────────────────────────────────────────────
      switch (operation) {

        case "COUNT": {
          let count = inputData.length

          if (config.countFilter && config.countFilter.trim()) {
            try {
              const { filterArray } = await import(
                "@/features/executions/components/filter/filter-engine"
              )
              const conditions = JSON.parse(config.countFilter) as Parameters<typeof filterArray>[1]
              const filterResult = filterArray(inputData, conditions, "AND", {
                includeMetadata: false, caseSensitive: false, trimWhitespace: true, typeCoerce: true
              })
              count = filterResult.passed.length
            } catch {
              // If filter parsing fails, count all
            }
          }

          return {
            value: count,
            operation: "COUNT",
            totalInput: inputData.length,
            timestamp: new Date().toISOString(),
          }
        }

        case "SUM": {
          if (!field) throw new NonRetriableError("Aggregate/SUM requires a Field.")
          const values = extractNumericValues(inputData, field, nullHandling)
          return {
            value: roundTo(computeSum(values), roundDecimals),
            count: values.length,
            operation: "SUM",
            field,
            totalInput: inputData.length,
            timestamp: new Date().toISOString(),
          }
        }

        case "AVERAGE": {
          if (!field) throw new NonRetriableError("Aggregate/AVERAGE requires a Field.")
          const values = extractNumericValues(inputData, field, nullHandling)
          const avg = computeAverage(values)
          return {
            value: avg !== null ? roundTo(avg, roundDecimals) : null,
            count: values.length,
            operation: "AVERAGE",
            field,
            totalInput: inputData.length,
            timestamp: new Date().toISOString(),
          }
        }

        case "MIN": {
          if (!field) throw new NonRetriableError("Aggregate/MIN requires a Field.")
          const values = extractNumericValues(inputData, field, nullHandling)
          return {
            value: computeMin(values),
            count: values.length,
            operation: "MIN",
            field,
            totalInput: inputData.length,
            timestamp: new Date().toISOString(),
          }
        }

        case "MAX": {
          if (!field) throw new NonRetriableError("Aggregate/MAX requires a Field.")
          const values = extractNumericValues(inputData, field, nullHandling)
          return {
            value: computeMax(values),
            count: values.length,
            operation: "MAX",
            field,
            totalInput: inputData.length,
            timestamp: new Date().toISOString(),
          }
        }

        case "MEDIAN": {
          if (!field) throw new NonRetriableError("Aggregate/MEDIAN requires a Field.")
          const values = extractNumericValues(inputData, field, nullHandling)
          return {
            value: computeMedian(values),
            count: values.length,
            operation: "MEDIAN",
            field,
            totalInput: inputData.length,
            timestamp: new Date().toISOString(),
          }
        }

        case "MODE": {
          if (!field) throw new NonRetriableError("Aggregate/MODE requires a Field.")
          const values = extractNumericValues(inputData, field, nullHandling)
          const mode = computeMode(values)
          return {
            value: mode.value,
            occurrences: mode.count,
            allModes: mode.allModes,
            count: values.length,
            operation: "MODE",
            field,
            totalInput: inputData.length,
            timestamp: new Date().toISOString(),
          }
        }

        case "STANDARD_DEVIATION": {
          if (!field) throw new NonRetriableError("Aggregate/STANDARD_DEVIATION requires a Field.")
          const values = extractNumericValues(inputData, field, nullHandling)
          return {
            value: roundTo(computeStdDev(values, true) ?? 0, roundDecimals),
            sampleStdDev: roundTo(computeStdDev(values, true) ?? 0, roundDecimals),
            populationStdDev: roundTo(computeStdDev(values, false) ?? 0, roundDecimals),
            count: values.length,
            operation: "STANDARD_DEVIATION",
            field,
            totalInput: inputData.length,
            timestamp: new Date().toISOString(),
          }
        }

        case "PERCENTILE": {
          if (!field) throw new NonRetriableError("Aggregate/PERCENTILE requires a Field.")
          const values = extractNumericValues(inputData, field, nullHandling)
          const p = config.percentile ?? 90
          return {
            value: roundTo(computePercentile(values, p) ?? 0, roundDecimals),
            percentile: p,
            label: `P${p}`,
            count: values.length,
            operation: "PERCENTILE",
            field,
            totalInput: inputData.length,
            timestamp: new Date().toISOString(),
          }
        }

        case "CONCATENATE": {
          if (!field) throw new NonRetriableError("Aggregate/CONCATENATE requires a Field.")
          const sep = config.separator ?? ", "
          return {
            value: computeConcatenate(inputData, field, sep),
            count: inputData.length,
            operation: "CONCATENATE",
            field,
            separator: sep,
            totalInput: inputData.length,
            timestamp: new Date().toISOString(),
          }
        }

        case "FIRST": {
          return {
            value: inputData[0] ?? null,
            isEmpty: inputData.length === 0,
            operation: "FIRST",
            totalInput: inputData.length,
            timestamp: new Date().toISOString(),
          }
        }

        case "LAST": {
          return {
            value: inputData[inputData.length - 1] ?? null,
            isEmpty: inputData.length === 0,
            operation: "LAST",
            totalInput: inputData.length,
            timestamp: new Date().toISOString(),
          }
        }

        case "DISTINCT": {
          if (!field) throw new NonRetriableError("Aggregate/DISTINCT requires a Field.")
          const distinct = computeDistinct(inputData, field)
          const topN = config.topN ?? 0
          const distinctResult = topN > 0 ? distinct.slice(0, topN) : distinct
          return {
            values: distinctResult,
            count: distinctResult.length,
            totalDistinct: distinct.length,
            operation: "DISTINCT",
            field,
            totalInput: inputData.length,
            timestamp: new Date().toISOString(),
          }
        }

        case "GROUP_BY": {
          const groupField = config.groupByField
          if (!groupField) throw new NonRetriableError("Aggregate/GROUP_BY requires a Group By Field.")

          const groups = groupBy(inputData, groupField)

          let groupAggOps: AggregateOp[] = []
          if (config.groupAggOps && config.groupAggOps !== "[]") {
            try {
              groupAggOps = JSON.parse(config.groupAggOps) as AggregateOp[]
            } catch {
              groupAggOps = []
            }
          }

          const groupResults = Object.entries(groups).map(([key, items]) => {
            const base: Record<string, unknown> = {
              group: key,
              count: items.length,
              items: items,
            }

            if (groupAggOps.length > 0) {
              const nested = runNestedAggregates(
                { [key]: items },
                groupAggOps,
                nullHandling,
                roundDecimals
              )
              Object.assign(base, nested[key] || {})
            }

            return base
          })

          if (config.sortOutput) {
            groupResults.sort((a, b) => (b.count as number) - (a.count as number))
          }

          const topN = config.topN ?? 0
          const finalGroupResults = topN > 0 ? groupResults.slice(0, topN) : groupResults

          return {
            groups: finalGroupResults,
            groupCount: finalGroupResults.length,
            totalGroups: groupResults.length,
            operation: "GROUP_BY",
            groupByField: groupField,
            totalInput: inputData.length,
            timestamp: new Date().toISOString(),
          }
        }

        case "PIVOT": {
          const pivotConfig = {
            rowField: config.pivotRowField || "",
            colField: config.pivotColField || "",
            valueField: config.pivotValueField || "",
            valueOp: (config.pivotValueOp || "SUM") as "SUM" | "COUNT" | "AVERAGE" | "MIN" | "MAX",
          }

          if (!pivotConfig.rowField || !pivotConfig.colField) {
            throw new NonRetriableError(
              "Aggregate/PIVOT requires Row Field and Column Field."
            )
          }

          const pivot = computePivot(inputData, pivotConfig, nullHandling, roundDecimals)

          return {
            rows: pivot.rows,
            columns: pivot.columns,
            data: pivot.data,
            rowCount: pivot.rows.length,
            columnCount: pivot.columns.length,
            operation: "PIVOT",
            totalInput: inputData.length,
            timestamp: new Date().toISOString(),
          }
        }

        case "FREQUENCY_DISTRIBUTION": {
          if (!field) throw new NonRetriableError("Aggregate/FREQUENCY_DISTRIBUTION requires a Field.")
          const topN = config.topN ?? 0
          const freq = computeFrequencyDistribution(
            inputData, field, config.sortOutput ?? true, topN
          )
          return {
            distribution: freq,
            uniqueValues: freq.length,
            operation: "FREQUENCY_DISTRIBUTION",
            field,
            totalInput: inputData.length,
            timestamp: new Date().toISOString(),
          }
        }

        case "MULTI": {
          let ops: AggregateOp[] = []
          if (config.multiOps && config.multiOps !== "[]") {
            try {
              ops = JSON.parse(config.multiOps) as AggregateOp[]
            } catch {
              throw new NonRetriableError(
                "Aggregate/MULTI: multiOps is invalid JSON. Re-save the node."
              )
            }
          }
          if (ops.length === 0) {
            throw new NonRetriableError(
              "Aggregate/MULTI requires at least one operation configured."
            )
          }

          const multiResults = runMultiOps(inputData, ops, nullHandling, roundDecimals)

          return {
            results: multiResults,
            operationCount: ops.length,
            operation: "MULTI",
            totalInput: inputData.length,
            timestamp: new Date().toISOString(),
          }
        }

        default:
          throw new NonRetriableError(
            `Aggregate node: Unknown operation '${operation}'.`
          )
      }
    })
  } catch (err) {
    await publish(aggregateChannel(nodeId).status({ nodeId, status: "error" }))

    if (err instanceof NonRetriableError) throw err

    if (config.continueOnFail) {
      result = {
        value: null,
        count: 0,
        operation: config.operation,
        success: false,
        error: err instanceof Error ? err.message : String(err),
        totalInput: 0,
        timestamp: new Date().toISOString(),
      }
    } else {
      throw new NonRetriableError(
        `Aggregate error: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  await publish(aggregateChannel(nodeId).status({ nodeId, status: "success" }))

  return { ...context, [variableName]: result! }
}
