import { channel, topic } from "@inngest/realtime"

export const GITHUB_CHANNEL_NAME = "github-execution"

/**
 * Creates a scoped GitHub channel for a specific tenant and workflow.
 * This ensures status events are isolated per tenant/workflow context.
 */
export function getGithubChannel(tenantId: string, workflowId: string) {
  const scopedChannelName = `${GITHUB_CHANNEL_NAME}:${tenantId}:${workflowId}`
  return channel(scopedChannelName)
    .addTopic(
      topic("status").type<{
        status: "loading" | "success" | "error"
        nodeId: string
      }>()
    )
}

/**
 * @deprecated Use getGithubChannel(tenantId, workflowId) instead for scoped channels
 */
export const githubChannel = channel(GITHUB_CHANNEL_NAME)
  .addTopic(
    topic("status").type<{
      status: "loading" | "success" | "error"
      nodeId: string
    }>()
  )
