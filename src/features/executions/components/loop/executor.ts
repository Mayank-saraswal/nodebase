import { NonRetriableError } from "inngest"
import type { NodeExecutor } from "@/features/executions/types"
import prisma from "@/lib/db"
import { loopChannel } from "@/inngest/channels/loop"
import { getDownstreamNodeIds } from "@/features/executions/lib/graph-utils"
import { NodeType } from "@/generated/prisma"

// Utility: resolve dot-notation path from object
// e.g. resolvePath("googleSheets.rows", context)
//   → context.googleSheets.rows
function resolvePath(path: string, obj: Record<string, any>): any {
  return path.split(".").reduce((current, key) => {
    return current?.[key]
  }, obj)
}

// Lazy import to avoid circular dependency (loop executor → registry → loop executor)
async function getExecutorRegistry() {
  const { executorRegistry } = await import("@/features/executions/lib/executor-registry")
  return executorRegistry
}

export const loopExecutor: NodeExecutor = async ({ data, nodeId,
  context,
  step,
  publish,
  userId,
  workflowNodes,
  workflowConnections,
}) => {
  await publish(loopChannel().status({ nodeId, status: "loading" }))

  // Load Loop config
  const config = data as any;

if (!config) {
    await publish(loopChannel().status({ nodeId, status: "error" }))
    throw new NonRetriableError("Loop node configuration not found")
  }

  // Resolve the input array
  const inputArray = resolvePath(config.inputPath, context)

  if (!inputArray) {
    await publish(loopChannel().status({ nodeId, status: "error" }))
    throw new NonRetriableError(
      `Loop: could not find array at path "${config.inputPath}". ` +
      `Available keys: ${Object.keys(context).join(", ")}`
    )
  }

  if (!Array.isArray(inputArray)) {
    await publish(loopChannel().status({ nodeId, status: "error" }))
    throw new NonRetriableError(
      `Loop: "${config.inputPath}" is not an array. Got: ${typeof inputArray}`
    )
  }

  // Find downstream nodes from the workflow graph
  const downstreamNodeIds = getDownstreamNodeIds(
    nodeId,
    workflowConnections ?? []
  )

  if (downstreamNodeIds.length === 0 || inputArray.length === 0) {
    // No downstream nodes or empty array — return loop metadata only
    await publish(loopChannel().status({ nodeId, status: "success" }))
    return {
      ...context,
      loop: {
        results: [],
        count: inputArray.length,
        successCount: 0,
        errorCount: 0,
        errors: [],
        inputPath: config.inputPath,
        skipped: 0,
      },
      _executedByLoop: downstreamNodeIds,
    }
  }

  // Get executor registry (lazy to avoid circular import)
  const nodeMap = new Map(
    (workflowNodes ?? []).map((n) => [n.id, n])
  )
  const downstreamNodes = downstreamNodeIds
    .map((id) => nodeMap.get(id))
    .filter(Boolean)

  const iterations = Math.min(inputArray.length, config.maxIterations)
  const results: any[] = []
  const errors: Array<{ index: number; error: string }> = []

  const executorReg = await getExecutorRegistry()

  // For each item, run ALL downstream nodes in order
  for (let i = 0; i < iterations; i++) {
    const item = inputArray[i]

    const loopStep = new Proxy(step, {
      get(target, prop, receiver) {
        if (prop === 'run') {
          return (id: string, fn: () => unknown) =>
            target.run(`loop-i${i}-${id}`, fn)
        }
        return Reflect.get(target, prop, receiver)
      },
    }) as typeof step

    let itemContext: Record<string, unknown> = {
      ...context,
      [config.itemVariable]: item,
      itemIndex: i,
      itemTotal: iterations,
      // If item is an object, also spread its keys for convenience
      ...(item && typeof item === "object" && !Array.isArray(item) ? item : {}),
    }

    let iterationFailed = false
    for (const downstreamNode of downstreamNodes) {
      if (!downstreamNode) continue

      try {
        const executor = executorReg[downstreamNode.type as NodeType]
        if (!executor) continue

        const output = await executor({
          nodeId: downstreamNode.id,
          data: (downstreamNode.data ?? {}) as Record<string, unknown>,
          credentialId: ((downstreamNode.data ?? {}) as any).credentialId || null,
          context: itemContext,
          step: loopStep,
          publish,
          userId,
          workflowNodes,
          workflowConnections,
        })

        // Merge output into itemContext for the next downstream node
        itemContext = { ...itemContext, ...(output as object) }
      } catch (error) {
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : String(error),
        })
        iterationFailed = true
        break // stop processing this item's remaining nodes
      }
    }

    results.push({
      index: i,
      item,
      context: itemContext,
      success: !iterationFailed,
    })
  }

  await publish(loopChannel().status({ nodeId, status: "success" }))

  return {
    ...context,
    loop: {
      results,
      count: iterations,
      successCount: results.filter((r) => r.success).length,
      errorCount: errors.length,
      errors,
      inputPath: config.inputPath,
      skipped: inputArray.length - iterations,
    },
    // Signal to executeWorkflow to skip these nodes in the main loop
    _executedByLoop: downstreamNodeIds,
  }
}
