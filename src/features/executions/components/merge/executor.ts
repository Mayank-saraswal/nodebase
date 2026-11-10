import type { NodeExecutor } from "@/features/executions/types"
import prisma from "@/lib/db"
import { mergeChannel } from "@/inngest/channels/merge"
import { resolveTemplate } from "@/features/executions/lib/template-resolver"
import {
  mergeByPosition,
  crossJoin,
  keyMatch,
  keyDiff,
  combineAll,
} from "@/features/executions/lib/merge-strategies"

/**
 * Merge node executor.
 *
 * The Merge node collects data from the current workflow context
 * (which already contains outputs from all upstream branches)
 * and re-combines them using one of 5 strategies:
 *
 * - combine:   spread all branch outputs into one object (default)
 * - position:  zip arrays by index
 * - crossJoin: cartesian product of arrays
 * - keyMatch:  inner join by a key field
 * - keyDiff:   outer difference by a key field
 *
 * Since the workflow engine already merges parallel results via
 * mergeParallelResults(), the Merge node can focus on applying
 * the user's chosen strategy to re-structure the data.
 */
export const mergeExecutor: NodeExecutor = async ({ data, nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    mergeChannel().status({
      nodeId,
      status: "loading",
    })
  )

  const config = data as any;

if (!config) {
    await publish(
      mergeChannel().status({
        nodeId,
        status: "error",
      })
    )
    return {
      ...context,
      error: "Merge node not configured. Open settings to configure.",
    }
  }

  const variableName = config.variableName || "merge"
  const mode = config.mergeMode || "combine"

  await publish(
    mergeChannel().status({
      nodeId,
      status: "waiting",
      waitingFor: config.inputCount,
    })
  )

  // Gather branch data from context using configured variable names.
  // This ensures keyMatch/keyDiff/crossJoin operate on the correct branches,
  // not on all context values including trigger and sequential node outputs.
  const ctx = context as Record<string, unknown>

  let branchValues: unknown[]

  const rawBranchKeys = (config.branchKeys || "").trim()
  const key1 = (config.branchKey1 || "").trim()
  const key2 = (config.branchKey2 || "").trim()

  if (rawBranchKeys) {
    // User specified all branch keys explicitly (for 3+ branch modes)
    branchValues = rawBranchKeys
      .split(",")
      .map((k: string) => k.trim())
      .filter(Boolean)
      .map((k: string) => ctx[k])
      .filter((v: any) => v !== undefined)
  } else if (key1 || key2) {
    // User specified individual branch keys (for 2-branch modes)
    branchValues = [key1 ? ctx[key1] : undefined, key2 ? ctx[key2] : undefined]
      .filter((v: any) => v !== undefined)
  } else {
    // Fallback: collect all non-internal context values.
    // Less precise but maintains backward compatibility.
    branchValues = Object.entries(ctx)
      .filter(([k]) => k !== "branch" && k !== "error" && k !== variableName)
      .map(([, v]) => v)
  }

  let mergeResult: unknown

  const result = await step.run(`merge-${nodeId}-execute`, async () => {
    switch (mode) {
      case "position": {
        const fill = config.positionFill === "longest" ? "longest" : "shortest"
        return mergeByPosition(branchValues, fill)
      }

      case "crossJoin": {
        return crossJoin(branchValues)
      }

      case "keyMatch": {
        let k1 = config.matchKey1 || ""
        let k2 = config.matchKey2 || ""

        // Resolve templates in key paths
        if (k1.includes("{{")) {
          k1 = resolveTemplate(k1, context) as string
        }
        if (k2.includes("{{")) {
          k2 = resolveTemplate(k2, context) as string
        }

        // Use configured branch keys when available
        const b1 = key1 ? ctx[key1] : branchValues[0]
        const b2 = key2 ? ctx[key2] : branchValues[1]
        return keyMatch(b1, b2, k1, k2)
      }

      case "keyDiff": {
        let k1 = config.matchKey1 || ""
        let k2 = config.matchKey2 || ""

        if (k1.includes("{{")) {
          k1 = resolveTemplate(k1, context) as string
        }
        if (k2.includes("{{")) {
          k2 = resolveTemplate(k2, context) as string
        }

        // Use configured branch keys when available
        const b1 = key1 ? ctx[key1] : branchValues[0]
        const b2 = key2 ? ctx[key2] : branchValues[1]
        return keyDiff(b1, b2, k1, k2)
      }

      case "combine":
      default: {
        return combineAll(branchValues)
      }
    }
  })

  mergeResult = result

  await publish(
    mergeChannel().status({
      nodeId,
      status: "success",
      received: branchValues.length,
    })
  )

  return {
    ...context,
    [variableName]: mergeResult,
  }
}
