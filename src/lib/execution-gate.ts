import prisma from "@/lib/db"
import { PLAN_LIMITS, type PlanKey } from "@/lib/plan-limits"
import { TRPCError } from "@trpc/server"

/**
 * Checks if a user can execute a workflow.
 * - Paid subscribers: allowed if under their plan's monthly limit
 * - FREE users: allowed if under 100 executions this month
 * Throws TRPCError if not allowed.
 */
export async function checkExecutionLimit(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      plan: true,
      planStatus: true,
      workflowRunsUsed: true,
      workflowRunsReset: true,
    },
  })

  if (!user) throw new TRPCError({ code: "UNAUTHORIZED" })

  const plan = (user.plan || "FREE") as PlanKey
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.FREE

  // Reset counter if it's a new month
  const now = new Date()
  const resetAt = new Date(user.workflowRunsReset)
  const isNewMonth =
    now.getMonth() !== resetAt.getMonth() ||
    now.getFullYear() !== resetAt.getFullYear()

  if (isNewMonth) {
    await prisma.user.update({
      where: { id: userId },
      data: { workflowRunsUsed: 0, workflowRunsReset: now },
    })
    return // Fresh month — allow execution
  }

  if (user.workflowRunsUsed >= limits.runs) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `You have used ${user.workflowRunsUsed}/${limits.runs} workflow runs this month on the ${limits.name} plan. Upgrade at https://nodebase.tech/pricing`,
    })
  }
}

/**
 * Increments the execution count for a user.
 * Call this AFTER a workflow execution starts successfully.
 */
export async function incrementExecutionCount(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      workflowRunsUsed: { increment: 1 },
      executionCount: { increment: 1 },
    },
  })
}
