import { NonRetriableError } from "inngest"
import type { NodeExecutor } from "@/features/executions/types"
import prisma from "@/lib/db"
import {
  evaluateConditions,
  parseConditionsJson,
} from "@/features/triggers/components/if-else/evaluate-conditions"
import { switchChannel } from "@/inngest/channels/switch"

interface SwitchCase {
  id: string
  name: string
  conditionsJson: string
}

export const switchExecutor: NodeExecutor = async ({ data, nodeId,
  context,
  step,
  publish,
}) => {
  if (!nodeId) throw new NonRetriableError("Switch: nodeId missing")

  await publish(switchChannel().status({ nodeId, status: "loading" }))

  // Step 1: Load config
  const config = data as any;

if (!config) {
    await publish(switchChannel().status({ nodeId, status: "error" }))
    throw new NonRetriableError(
      "Switch node not configured. Open settings and add at least one case."
    )
  }

  // Step 2: Validate casesJson before execution
  // This step preserves the 3-step idempotency pattern.
  // If step-3-execute fails and retries, steps 1 and 2 are not re-run.
  await step.run(`switch-${nodeId}-validate`, async () => {
    let cases: unknown[]
    try {
      cases = JSON.parse(config.casesJson || "[]")
    } catch {
      throw new NonRetriableError(
        "Switch node: casesJson is corrupted. Re-open and re-save the node."
      )
    }
    if (!Array.isArray(cases)) {
      throw new NonRetriableError("Switch node: casesJson must be an array.")
    }
    if (cases.length === 0) {
      throw new NonRetriableError(
        "Switch node has no cases configured. Open settings and add at least one case."
      )
    }
    if (cases.length > 20) {
      throw new NonRetriableError(
        `Switch node has ${cases.length} cases. Maximum is 20.`
      )
    }
    return { casesCount: cases.length }
  })

  // Step 3: Evaluate cases in order, return first match
  let result: Record<string, unknown>
  try {
    result = await step.run(`switch-${nodeId}-execute`, async () => {
      let cases: SwitchCase[] = []
      try {
        cases = JSON.parse(config.casesJson || "[]")
      } catch {
        throw new NonRetriableError(
          "Switch node: casesJson is invalid JSON. Re-save the node."
        )
      }

      const ctx = (typeof context === "object" && context !== null ? context : {}) as Record<string, unknown>

      // Evaluate each case in order — first match wins
      for (const switchCase of cases) {
        const conditionsConfig = parseConditionsJson(switchCase.conditionsJson)

        if (conditionsConfig) {
          const matched = evaluateConditions(conditionsConfig, ctx)
          if (matched) {
            return {
              ...context,
              branch: switchCase.id,
              [config.variableName || "switch"]: {
                branch: switchCase.id,
                matchedCase: switchCase.id,
                matchedName: switchCase.name,
                totalCases: cases.length,
                evaluatedAt: new Date().toISOString(),
              },
            }
          }
        }
      }

      // No case matched — use fallback
      return {
        ...context,
        branch: "fallback",
        [config.variableName || "switch"]: {
          branch: "fallback",
          matchedCase: "fallback",
          matchedName: "Fallback",
          totalCases: cases.length,
          evaluatedAt: new Date().toISOString(),
        },
      }
    })
  } catch (error) {
    await publish(switchChannel().status({ nodeId, status: "error" }))
    throw error
  }

  await publish(switchChannel().status({ nodeId, status: "success" }))
  return result as Record<string, unknown>
}
