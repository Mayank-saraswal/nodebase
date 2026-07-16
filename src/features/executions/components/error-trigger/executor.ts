import type { NodeExecutor } from "@/features/executions/types"

/**
 * Error Trigger executor — pass-through only.
 * This node never runs in the normal execution flow.
 * It fires via the separate executeErrorTriggeredWorkflow
 * Inngest function when any node throws NonRetriableError.
 * No channel publishing needed here.
 */
export const errorTriggerExecutor: NodeExecutor = async ({ data, context }) => {
  return context
}