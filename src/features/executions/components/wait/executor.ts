import type { NodeExecutor } from "@/features/executions/types"
import prisma from "@/lib/db"
import { waitChannel } from "@/inngest/channels/wait"
import { resolveTemplate } from "@/features/executions/lib/template-resolver"
import { NonRetriableError } from "inngest"

/**
 * Convert a duration + unit to an Inngest-compatible sleep string.
 * Inngest step.sleep accepts: "30s", "5m", "2h", "1d", etc.
 */
function toSleepDuration(duration: number, unit: string): string {
  switch (unit) {
    case "seconds":
      return `${duration}s`
    case "minutes":
      return `${duration}m`
    case "hours":
      return `${duration}h`
    case "days":
      return `${duration}d`
    case "weeks":
      return `${duration * 7}d`
    default:
      return `${duration}m`
  }
}

export const waitExecutor: NodeExecutor = async ({ data, nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    waitChannel().status({
      nodeId,
      status: "loading",
    })
  )

  const config = data as any;

if (!config) {
    await publish(
      waitChannel().status({
        nodeId,
        status: "error",
      })
    )
    return {
      ...context,
      error: "Wait node not configured. Open settings to configure.",
    }
  }

  const variableName = config.variableName || "wait"
  const startTime = Date.now()

  if (config.waitMode === "duration") {
    const sleepStr = toSleepDuration(config.duration, config.durationUnit)

    await publish(
      waitChannel().status({
        nodeId,
        status: "waiting",
      })
    )

    await step.sleep(`wait-${nodeId}-sleep`, sleepStr)

    const endTime = Date.now()
    await publish(
      waitChannel().status({
        nodeId,
        status: "success",
      })
    )

    return {
      ...context,
      [variableName]: {
        waitedMs: endTime - startTime,
        resumedBy: "duration",
        resumedAt: new Date(endTime).toISOString(),
      },
    }
  }

  if (config.waitMode === "until") {
    let targetDatetime = config.untilDatetime

    // Resolve handlebars templates like {{trigger.body.scheduledAt}}
    if (targetDatetime.includes("{{")) {
      targetDatetime = resolveTemplate(targetDatetime, context) as string
    }

    const timezone = config.timezone || "UTC"
    let targetDate: Date

    // If string already has explicit timezone info (Z or +HH:MM), parse directly
    if (/[Z]$|[+-]\d{2}:?\d{2}$/.test(targetDatetime.trim())) {
      targetDate = new Date(targetDatetime)
    } else {
      // No timezone in the string — interpret it in the configured timezone
      try {
        const naive = new Date(targetDatetime)
        if (Number.isNaN(naive.getTime())) {
          throw new NonRetriableError(
            `Wait node: "${targetDatetime}" is not a valid datetime. ` +
            `Use ISO format: 2025-06-15T09:00:00 or 2025-06-15T09:00:00Z`
          )
        }

        // Get what UTC time corresponds to this "local" time in the target timezone
        const utcString = naive.toLocaleString("en-US", { timeZone: "UTC" })
        const tzString = naive.toLocaleString("en-US", { timeZone: timezone })
        const utcMs = new Date(utcString).getTime()
        const tzMs = new Date(tzString).getTime()
        const offsetMs = utcMs - tzMs
        targetDate = new Date(naive.getTime() + offsetMs)
      } catch (err) {
        if (err instanceof NonRetriableError) throw err
        throw new NonRetriableError(
          `Wait node: invalid timezone "${timezone}". ` +
          `Use IANA format: Asia/Kolkata, UTC, America/New_York, Europe/London`
        )
      }
    }

    if (Number.isNaN(targetDate.getTime())) {
      await publish(
        waitChannel().status({
          nodeId,
          status: "error",
        })
      )
      throw new NonRetriableError(
        `Wait node: "${targetDatetime}" is not a valid datetime.`
      )
    }

    await publish(
      waitChannel().status({
        nodeId,
        status: "waiting",
      })
    )

    await step.sleepUntil(`wait-${nodeId}-sleep-until`, targetDate)

    const endTime = Date.now()
    await publish(
      waitChannel().status({
        nodeId,
        status: "success",
      })
    )

    return {
      ...context,
      [variableName]: {
        waitedMs: endTime - startTime,
        resumedBy: "until",
        resumedAt: new Date(endTime).toISOString(),
      },
    }
  }

  if (config.waitMode === "webhook") {
    const eventName = `wait/resume-${nodeId}`
    const timeoutStr = toSleepDuration(
      config.timeoutDuration,
      config.timeoutUnit
    )
    const resumeUrl = `/api/webhooks/wait/${encodeURIComponent(eventName)}`

    await publish(
      waitChannel().status({
        nodeId,
        status: "waiting",
        resumeUrl,
      })
    )

    const result = await step.waitForEvent(`wait-${nodeId}-webhook`, {
      event: eventName,
      timeout: timeoutStr,
    })

    const endTime = Date.now()
    const resumedBy = result ? "webhook" : "timeout"

    if (!result && !config.continueOnTimeout) {
      await publish(
        waitChannel().status({
          nodeId,
          status: "error",
        })
      )
      throw new NonRetriableError(
        `Wait node timed out after ${config.timeoutDuration} ${config.timeoutUnit} and continueOnTimeout is disabled`
      )
    }

    await publish(
      waitChannel().status({
        nodeId,
        status: "success",
      })
    )

    return {
      ...context,
      [variableName]: {
        waitedMs: endTime - startTime,
        resumedBy,
        resumedAt: new Date(endTime).toISOString(),
        resumeUrl,
        webhookData: result?.data ?? null,
      },
    }
  }

  // Unknown wait mode — treat as error
  await publish(
    waitChannel().status({
      nodeId,
      status: "error",
    })
  )
  return {
    ...context,
    error: `Wait node: unknown waitMode "${config.waitMode}"`,
  }
}
