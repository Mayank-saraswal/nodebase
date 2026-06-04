import { channel, topic } from "@inngest/realtime"

export const GITHUB_CHANNEL_NAME = "github-execution"
export const githubChannel = channel(GITHUB_CHANNEL_NAME)
  .addTopic(
    topic("status").type<{
      status: "loading" | "success" | "error"
      nodeId: string
    }>()
  )
