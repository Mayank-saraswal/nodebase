"use server"

import { aggregateChannelName } from "@/inngest/channels/aggregate"
import { inngest } from "@/inngest/client"
import { getSubscriptionToken } from "@inngest/realtime"
import { requireAuth } from "@/lib/auth-utils"
import prisma from "@/lib/db"

export async function fetchAggregateRealtimeToken(nodeId: string) {
  try {
    const session = await requireAuth()
    const node = await prisma.node.findUnique({
      where: { id: nodeId },
      include: { workflow: { select: { userId: true } } },
    })

    if (!node || node.workflow.userId !== session.user.id) {
      throw new Error("Unauthorized")
    }

    const token = await getSubscriptionToken(inngest, {
      channel: aggregateChannelName(nodeId),
      topics: ["status"],
    })
    return token
  } catch (error) {
    console.error("Failed to fetch Aggregate realtime token:", error)
    throw error
  }
}
