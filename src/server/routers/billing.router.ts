import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "@/trpc/init"
import { TRPCError } from "@trpc/server"
import {
  createSubscription,
  cancelSubscription,
  checkRunQuota,
} from "@/lib/billing"
import prisma from "@/lib/db"

export const billingRouter = createTRPCRouter({
  // Get current user's billing status
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { id: ctx.auth.user.id },
      select: {
        plan: true,
        planStatus: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
        workflowRunsUsed: true,
        workflowRunsReset: true,
        razorpaySubId: true,
      },
    })

    if (!user) throw new TRPCError({ code: "NOT_FOUND" })

    const { allowed, used, limit } = await checkRunQuota(ctx.auth.user.id)

    return {
      plan: user.plan,
      planStatus: user.planStatus,
      currentPeriodEnd: user.currentPeriodEnd,
      cancelAtPeriodEnd: user.cancelAtPeriodEnd,
      hasActiveSubscription: !!user.razorpaySubId,
      quota: { used, limit, allowed },
    }
  }),

  // Create subscription and return subscription ID for checkout
  createSubscription: protectedProcedure
    .input(
      z.object({
        plan: z.enum(["STARTER", "PRO", "TEAM"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.auth.user.id

      // Check if already subscribed
      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (user?.razorpaySubId && user?.planStatus === "active") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "You already have an active subscription. Cancel it first to change plans.",
        })
      }

      const result = await createSubscription(userId, input.plan)

      return {
        subscriptionId: result.subscriptionId,
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      }
    }),

  // Cancel subscription
  cancelSubscription: protectedProcedure
    .input(
      z.object({
        immediately: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await cancelSubscription(ctx.auth.user.id, !input.immediately)
      return { success: true }
    }),

  // Get billing history
  getHistory: protectedProcedure.query(async ({ ctx }) => {
    const events = await prisma.billingEvent.findMany({
      where: {
        userId: ctx.auth.user.id,
        status: "success",
        type: {
          in: [
            "subscription.charged",
            "payment.captured",
            "subscription.activated",
          ],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 24,
      select: {
        id: true,
        type: true,
        amount: true,
        currency: true,
        plan: true,
        createdAt: true,
      },
    })

    return events
  }),

  // Check run quota
  checkQuota: protectedProcedure.query(async ({ ctx }) => {
    return checkRunQuota(ctx.auth.user.id)
  }),
})
