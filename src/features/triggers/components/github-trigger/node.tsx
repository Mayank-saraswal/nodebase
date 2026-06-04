"use client"
import { BaseTriggerNode } from "../base-trigger-node"
import { memo, useState } from "react"
import { NodeProps } from "@xyflow/react"
import { GitHubTriggerDialog } from "./dialog"
import { useNodeStatus } from "../shared/hooks/use-node-status"
import { fetchWebhookTriggerRealtimeToken } from "../webhook-trigger/actions"
import { WEBHOOK_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/webhook-trigger"
import { Github } from "lucide-react"

export const GitHubTriggerNode = memo((props: NodeProps) => {
  // We can reuse the webhook-trigger channel since it's just a status update
  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: WEBHOOK_TRIGGER_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchWebhookTriggerRealtimeToken,
  })

  const [dialogOpen, setDialogOpen] = useState(false)
  
  const handleOpenSettings = () => {
    setDialogOpen(true)
  }

  return (
    <>
      <GitHubTriggerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        nodeId={props.id}
      />
      <BaseTriggerNode
        {...props}
        icon={Github}
        name="GitHub Trigger"
        status={nodeStatus}
        description="On GitHub event"
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  )
})

GitHubTriggerNode.displayName = "GitHubTriggerNode"
