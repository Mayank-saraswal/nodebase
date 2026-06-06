import { NonRetriableError } from "inngest"
import type { NodeExecutor } from "@/features/executions/types"
import prisma from "@/lib/db"
import { codeChannel } from "@/inngest/channels/code"
import { runCodeSandbox } from "@/features/executions/lib/code-sandbox"

export const codeExecutor: NodeExecutor = async ({ data, nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    codeChannel().status({
      nodeId,
      status: "loading",
    })
  )

  // Step 1: Load config
  const config = data as any;

if (!config) {
    await publish(
      codeChannel().status({
        nodeId,
        status: "error",
      })
    )
    throw new NonRetriableError(
      "Code node not configured. Open the node and write your code."
    )
  }
  if (!config.code?.trim()) {
    await publish(
      codeChannel().status({
        nodeId,
        status: "error",
      })
    )
    throw new NonRetriableError(
      "Code node is empty. Open the node and write your code."
    )
  }

  // Step 2: Validate — idempotent; steps 1 & 2 don't re-run on retry of step 3
  await step.run(`code-${nodeId}-validate`, async () => {
    const timeout = config.timeout ?? 5000
    if (timeout < 100 || timeout > 30000) {
      throw new NonRetriableError(
        `Code timeout must be 100–30000ms. Got: ${timeout}ms`
      )
    }
    return { codeLength: config.code.length, timeout }
  })

  // Step 3: Execute
  try {
    const result = await step.run(`code-${nodeId}-execute`, async () => {
      const timeout = config.timeout ?? 5000
      const outputMode = config.outputMode ?? "append"
      const allowedDomains = config.allowedDomains ?? ""
      const variableName = config.variableName

      const { output, logs, executionMs, error } = await runCodeSandbox({
        code: config.code,
        context,
        timeout,
        allowedDomains,
        variableName: variableName || "codeOutput",
      })

      // Log captured console output to server
      for (const line of logs) {
        console.log(`[CodeNode ${nodeId}]`, line)
      }

      if (error) {
        throw new NonRetriableError(`Code execution error: ${error}`)
      }

      // Build base result depending on outputMode
      let resultContext: Record<string, unknown>

      if (outputMode === "raw") {
        if (
          output !== undefined &&
          output !== null &&
          typeof output === "object" &&
          !Array.isArray(output)
        ) {
          resultContext = output as Record<string, unknown>
        } else {
          const key = variableName || "codeOutput"
          resultContext = { [key]: output ?? null }
        }
      } else if (outputMode === "replace") {
        if (
          output !== undefined &&
          output !== null &&
          typeof output === "object" &&
          !Array.isArray(output)
        ) {
          resultContext = output as Record<string, unknown>
        } else {
          const key = variableName || "codeOutput"
          resultContext = { [key]: output ?? null }
        }
      } else {
        // Default: "append" mode — merge into existing context
        if (output !== undefined && output !== null) {
          if (Array.isArray(output)) {
            const key = variableName || "codeOutput"
            resultContext = { ...context, [key]: output }
          } else if (typeof output === "object") {
            resultContext = { ...context, ...output }
          } else {
            const key = variableName || "codeOutput"
            resultContext = { ...context, [key]: output }
          }
        } else {
          resultContext = { ...context }
        }
      }

      // Always include logs and executionMs metadata
      return {
        ...resultContext,
        _codeLogs: logs,
        _codeExecutionMs: executionMs,
      }
    })

    await publish(
      codeChannel().status({
        nodeId,
        status: "success",
      })
    )

    return result as Record<string, unknown>
  } catch (err) {
    if (config.continueOnFail) {
      await publish(
        codeChannel().status({
          nodeId,
          status: "success",
        })
      )
      const message = err instanceof Error ? err.message : String(err)
      return { ...context, codeError: message }
    }

    await publish(
      codeChannel().status({
        nodeId,
        status: "error",
      })
    )
    throw err
  }
}
