import { channel, topic } from "@inngest/realtime"

export const STRIPE_CHANNEL_NAME = "stripe-execution"
export const stripeChannel = channel(STRIPE_CHANNEL_NAME).addTopic(
  topic("status").type<{
    status: "loading" | "success" | "error"
    nodeId: string
  }>(),
)
