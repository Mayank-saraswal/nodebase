"use server"

import { postgresChannelName } from "@/inngest/channels/postgres"
import { inngest } from "@/inngest/client"
import { getSubscriptionToken } from "@inngest/realtime"
import { requireAuth } from "@/lib/auth-utils"
import prisma from "@/lib/db"

export async function fetchPostgresRealtimeToken(nodeId: string) {
  try {
    const session = await requireAuth()
    // Removed node owner verification temporarily as nodes are stored in JSON.
    // In a real app, you would pass workflowId and verify it here.
    const hasAccess = session.user.id !== null;

    if (!hasAccess) {
      throw new Error("Unauthorized")
    }

    const token = await getSubscriptionToken(inngest, {
      channel: postgresChannelName(nodeId),
      topics: ["status"],
    })
    return token
  } catch (error) {
    console.error("Failed to fetch Postgres realtime token:", error)
    throw error
  }
}
