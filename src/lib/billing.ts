import { razorpayBilling } from "./razorpay-billing"
import {
  RAZORPAY_PLAN_IDS,
  PLAN_LIMITS,
  type PlanKey,
} from "./plan-limits"
import prisma from "./db"

// ── Create or get Razorpay customer ──────────────────────────────────────────

export async function getOrCreateRazorpayCustomer(
  userId: string
): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error("User not found")

  if (user.razorpayCustomerId) return user.razorpayCustomerId

  const customer = (await razorpayBilling.customers.create({
    name: user.name || user.email,
    email: user.email,
    contact: "",
    notes: {
      userId: user.id,
      source: "nodebase",
    },
  })) as { id: string }

  await prisma.user.update({
    where: { id: userId },
    data: { razorpayCustomerId: customer.id },
  })

  return customer.id
}

// ── Create subscription ───────────────────────────────────────────────────────

export async function createSubscription(
  userId: string,
  plan: Exclude<PlanKey, "FREE">
): Promise<{
  subscriptionId: string
  shortUrl: string
}> {
  const customerId = await getOrCreateRazorpayCustomer(userId)
  const planId = RAZORPAY_PLAN_IDS[plan]

  if (!planId) {
    throw new Error(
      `Plan ID for ${plan} not configured. ` +
        "Run the setup script and add IDs to .env"
    )
  }

  const subscription = (await razorpayBilling.subscriptions.create({
    plan_id: planId,
    customer_notify: 1,
    quantity: 1,
    total_count: 120, // 10 years max — effectively perpetual
    notes: {
      userId,
      plan,
    },
  })) as { id: string; short_url?: string }

  // Store pending subscription
  await prisma.user.update({
    where: { id: userId },
    data: {
      razorpaySubId: subscription.id,
      // plan stays as current until payment confirmed via webhook
    },
  })

  return {
    subscriptionId: subscription.id,
    shortUrl: subscription.short_url || "",
  }
}

// ── Cancel subscription ───────────────────────────────────────────────────────

export async function cancelSubscription(
  userId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user?.razorpaySubId) throw new Error("No active subscription found")

  await razorpayBilling.subscriptions.cancel(
    user.razorpaySubId,
    cancelAtPeriodEnd
  )

  await prisma.user.update({
    where: { id: userId },
    data: { cancelAtPeriodEnd },
  })
}

// ── Check if user has run quota ───────────────────────────────────────────────

export async function checkRunQuota(
  userId: string
): Promise<{ allowed: boolean; used: number; limit: number; plan: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error("User not found")

  const plan = (user.plan || "FREE") as PlanKey
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.FREE

  // Reset monthly counter if a new month has started
  const now = new Date()
  const resetDate = user.workflowRunsReset
  const monthsPassed =
    (now.getFullYear() - resetDate.getFullYear()) * 12 +
    (now.getMonth() - resetDate.getMonth())

  if (monthsPassed >= 1) {
    await prisma.user.update({
      where: { id: userId },
      data: { workflowRunsUsed: 0, workflowRunsReset: now },
    })
    return { allowed: true, used: 0, limit: limits.runs, plan }
  }

  const allowed = user.workflowRunsUsed < limits.runs

  return {
    allowed,
    used: user.workflowRunsUsed,
    limit: limits.runs,
    plan,
  }
}

// ── Increment run counter ─────────────────────────────────────────────────────

export async function incrementRunCount(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { workflowRunsUsed: { increment: 1 } },
  })
}
