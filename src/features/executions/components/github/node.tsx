"use client"
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react"
import { memo, useState } from "react"
import { BaseExecutionNode } from "../base-execution-node"
import { GitHubDialog } from "./dialog"
import { useNodeStatus } from "@/features/triggers/components/shared/hooks/use-node-status"
import { fetchGitHubRealtimeToken } from "./actions"
import { GITHUB_CHANNEL_NAME } from "@/inngest/channels/github"
import { useParams } from "next/navigation"
import { GitHubConfig } from "./types"
import { Github } from "lucide-react"

type GitHubNodeData = GitHubConfig & {
  [key: string]: unknown
}

type GitHubNodeType = Node<GitHubNodeData>

function getDescription(data: GitHubNodeData): string {
  if (!data?.operation) return "Click to configure"
  return data.operation.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())
}

export const GitHubNode = memo((props: NodeProps<GitHubNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false)
  const { setNodes } = useReactFlow()
  const params = useParams()
  const workflowId = params.workflowId as string

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: GITHUB_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchGitHubRealtimeToken,
  })

  const handleOpenSettings = () => setDialogOpen(true)

  const description = getDescription(props.data)

  return (
    <>
      <GitHubDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        nodeId={props.id}
        workflowId={workflowId}
      />
      <BaseExecutionNode
        {...props}
        name="GitHub"
        id={props.id}
        status={nodeStatus}
        icon={Github}
        description={description}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  )
})

GitHubNode.displayName = "GitHubNode"
