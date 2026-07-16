import type { NodeExecutor } from "@/features/executions/types"
import prisma from "@/lib/db"
import { resolveTemplate } from "@/features/executions/lib/template-resolver"
import { setVariableChannel } from "@/inngest/channels/set-variable"

export const setVariableExecutor: NodeExecutor = async ({ data, nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    setVariableChannel().status({
      nodeId,
      status: "loading",
    })
  )

  const config = data as any;

if (!config) {
    await publish(
      setVariableChannel().status({
        nodeId,
        status: "error",
      })
    )
    return {
      ...context,
      error: "Set Variable node not configured. Open settings to configure.",
    }
  }

  const pairs = config.pairs as Array<{ key: string; value: string }>

  const output: Record<string, unknown> = {}
  for (const pair of pairs) {
    if (!pair.key.trim()) continue
    output[pair.key] = resolveTemplate(pair.value, context)
  }

  await publish(
    setVariableChannel().status({
      nodeId,
      status: "success",
    })
  )

  return {
    ...context,
    ...output,
  }
}
