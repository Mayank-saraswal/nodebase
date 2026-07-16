"use client"

import { memo, useState } from "react"
import { type Node, type NodeProps, useReactFlow } from "@xyflow/react"
import { TrendingUp } from "lucide-react"
import { BaseExecutionNode } from "../base-execution-node"
import { useNodeStatus } from "@/features/triggers/components/shared/hooks/use-node-status"
import { aggregateChannelName } from "@/inngest/channels/aggregate"
import { fetchAggregateRealtimeToken } from "./actions"
import { AggregateDialog } from "./dialog"
import type { AggregateNodeData } from "./types"
import { OPERATION_LABELS } from "./types"
import { useParams } from "next/navigation"
import { useTRPC } from "@/trpc/client"
import { useQuery } from "@tanstack/react-query"

type AggregateNodeType = Node<AggregateNodeData>

function getDescription(data: AggregateNodeData | null | undefined): string {
  if (!data) return "Click to configure"
  const op = (data.operation as string) || ""
  if (!op) return "Click to configure"

  switch (op) {
    case "COUNT":
      return `Count ${data.field ? data.field : "items"}`
    case "SUM":
    case "AVERAGE":
    case "MIN":
    case "MAX":
    case "MEDIAN":
    case "MODE":
    case "STANDARD_DEVIATION":
    case "PERCENTILE":
    case "DISTINCT":
    case "CONCATENATE":
    case "FREQUENCY_DISTRIBUTION":
      return `${OPERATION_LABELS[op as keyof typeof OPERATION_LABELS] ?? op}${data.field ? `: ${String(data.field)}` : ""}`
    case "FIRST":
      return "First item"
    case "LAST":
      return "Last item"
    case "GROUP_BY":
      return data.groupByField ? `Group by ${String(data.groupByField)}` : "Group by field"
    case "PIVOT": {
      const row = data.pivotRowField
      const col = data.pivotColField
      return row && col ? `Pivot ${String(row)} × ${String(col)}` : "Pivot table"
    }
    case "MULTI": {
      try {
        const ops = JSON.parse(data.multiOps as string || "[]") as unknown[]
        return `${ops.length} operation${ops.length !== 1 ? "s" : ""}`
      } catch {
        return "Multiple operations"
      }
    }
    default:
      return "Click to configure"
  }
}

export const AggregateNode = memo((props: NodeProps<AggregateNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false)
  const { setNodes } = useReactFlow()
  const params = useParams()
  const workflowId = params.workflowId as string
  const trpc = useTRPC()

  const dbConfig = undefined as any;
const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: aggregateChannelName(props.id),
    topic: "status",
    refreshToken: () => fetchAggregateRealtimeToken(props.id),
  })

  const handleOpenSettings = () => setDialogOpen(true)

  const handleSubmit = (values: AggregateNodeData) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === props.id) {
          return { ...node, data: { ...node.data, ...values } }
        }
        return node
      })
    )
  }

  const description = getDescription((dbConfig as unknown as AggregateNodeData) ?? props.data)

  return (
    <>
      <AggregateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={props.data}
        nodeId={props.id}
        workflowId={workflowId}
      />
      <BaseExecutionNode
        {...props}
        name="Aggregate"
        id={props.id}
        status={nodeStatus}
        icon={TrendingUp}
        description={description}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  )
})

AggregateNode.displayName = "AggregateNode"
