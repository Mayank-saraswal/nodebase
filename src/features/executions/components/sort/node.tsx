"use client"

import { memo, useState } from "react"
import { type Node, type NodeProps, useReactFlow } from "@xyflow/react"
import { ArrowUpDown } from "lucide-react"
import { BaseExecutionNode } from "../base-execution-node"
import { useNodeStatus } from "@/features/triggers/components/shared/hooks/use-node-status"
import { SORT_CHANNEL_NAME } from "@/inngest/channels/sort"
import { fetchSortRealtimeToken } from "./actions"
import { SortDialog } from "./dialog"
import type { SortNodeData } from "./types"
import { useParams } from "next/navigation"
import { useTRPC } from "@/trpc/client"
import { useQuery } from "@tanstack/react-query"

type SortNodeType = Node<SortNodeData>

function getDescription(data: SortNodeData | null | undefined): string {
  if (!data) return "Click to configure"
  const op = data.operation || "SORT_ARRAY"
  if (op === "REVERSE") return "Reverse Array"
  if (op === "SHUFFLE") return "Shuffle Array"
  if (op === "SORT_KEYS") return "Sort Object Keys"
  
  const keysCount = data.sortKeys?.length || 0
  if (keysCount === 1) {
    return `${data.sortKeys?.[0]?.field || "Items"} ${data.sortKeys?.[0]?.direction?.toUpperCase() || ""}`
  } else if (keysCount > 1) {
    return `${keysCount} keys`
  }
  return "Sort Array"
}

export const SortNode = memo((props: NodeProps<SortNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false)
  const { setNodes } = useReactFlow()
  const params = useParams()
  const workflowId = params.workflowId as string
  const trpc = useTRPC()

  const dbConfig = undefined as any;
const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: SORT_CHANNEL_NAME(props.id) as string,
    topic: "status",
    refreshToken: () => fetchSortRealtimeToken(props.id),
  })

  const handleOpenSettings = () => setDialogOpen(true)
  
  const handleSubmit = (values: SortNodeData) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === props.id) {
          return {
            ...node,
            data: {
              ...node.data,
              ...values,
            },
          }
        }
        return node
      })
    )
  }

  const description = getDescription((dbConfig as any) ?? props.data)

  return (
    <>
      <SortDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={props.data}
        nodeId={props.id}
        workflowId={workflowId}
      />
      <BaseExecutionNode
        {...props}
        name="Sort"
        id={props.id}
        status={nodeStatus}
        icon={ArrowUpDown}
        description={description}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  )
})

SortNode.displayName = "SortNode"
