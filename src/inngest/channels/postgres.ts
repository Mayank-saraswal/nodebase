import { channel, topic } from "@inngest/realtime"

export const POSTGRES_CHANNEL = "postgres-execution"

export const postgresChannelName = (nodeId?: string): string =>
  `${POSTGRES_CHANNEL}${nodeId ? "-" + nodeId : ""}`

export const postgresChannel = (nodeId?: string) =>
  channel(postgresChannelName(nodeId)).addTopic(
    topic("status").type<{
      nodeId: string
      status: "loading" | "success" | "error"
    }>()
  )()
