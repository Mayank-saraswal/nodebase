"use client"
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react"
import { memo, useState } from "react"
import { BaseExecutionNode } from "../base-execution-node"
import { GitHubDialog, type GitHubFormValues } from "./dialog"
import { useNodeStatus } from "@/features/triggers/components/shared/hooks/use-node-status"
import { fetchGitHubRealtimeToken } from "./actions"
import { GITHUB_CHANNEL_NAME } from "@/inngest/channels/github"
import { useParams } from "next/navigation"
import { GitHubConfig } from "./types"
import { OPERATION_LABELS } from "./components/operation-groups"
import { GitHubOperation } from "@/features/executions/enums"

type GitHubNodeData = GitHubConfig & {
  credentialId?: string
  [key: string]: unknown
}

type GitHubNodeType = Node<GitHubNodeData>

function getDescription(data: GitHubNodeData): string {
  if (!data?.operation) return "Click to configure"
  const key = data.operation as keyof typeof OPERATION_LABELS
  const label =
    OPERATION_LABELS[key] ||
    data.operation
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/^\w/, (c) => c.toUpperCase())
  if (data.owner && data.repo) {
    return `${label} · ${data.owner}/${data.repo}`
  }
  if (data.username) return `${label} · @${data.username}`
  return label
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

  const handleSubmit = (values: GitHubFormValues) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id !== props.id) return node
        return {
          ...node,
          data: {
            ...node.data,
            ...values,
            operation:
              (values.operation as GitHubOperation) ||
              GitHubOperation.USER_GET_CURRENT,
          },
        }
      }),
    )
  }

  const description = getDescription(props.data)

  return (
    <>
      <GitHubDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={props.data}
        nodeId={props.id}
        workflowId={workflowId}
      />
      <BaseExecutionNode
        {...props}
        name="GitHub"
        id={props.id}
        status={nodeStatus}
        icon="/logos/github.svg"
        description={description}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  )
})

GitHubNode.displayName = "GitHubNode"
