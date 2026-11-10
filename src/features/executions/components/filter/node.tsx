"use client"

import { memo, useState } from "react"
import { type Node, type NodeProps, useReactFlow } from "@xyflow/react"
import { Filter } from "lucide-react"
import { BaseExecutionNode } from "../base-execution-node"
import { useNodeStatus } from "@/features/triggers/components/shared/hooks/use-node-status"
import { filterChannelName } from "@/inngest/channels/filter"
import { fetchFilterRealtimeToken } from "./actions"
import { FilterDialog } from "./dialog"
import type { FilterNodeData, ConditionGroup } from "./types"
import { isConditionGroup } from "./types"
import { useParams } from "next/navigation"
import { useTRPC } from "@/trpc/client"
import { useQuery } from "@tanstack/react-query"

type FilterNodeType = Node<FilterNodeData>

function countConditions(groups: ConditionGroup[]): number {
  return groups.reduce((total, group) => {
    return total + group.conditions.reduce((sum, c) => {
      if (isConditionGroup(c)) return sum + countConditions([c])
      return sum + 1
    }, 0)
  }, 0)
}

function getDescription(data: FilterNodeData | null | undefined): string {
  if (!data) return "Click to configure"

  const op = data.operation
  const varName = data.variableName || "filter"

  if (!data.conditionGroups || data.conditionGroups === "[]") {
    return "Click to configure conditions"
  }

  try {
    const groups = JSON.parse(data.conditionGroups as string) as ConditionGroup[]
    const totalConditions = countConditions(groups)

    if (op === "FILTER_OBJECT_KEYS") {
      const mode = data.keepMatching !== false ? "Keep" : "Remove"
      return `${mode} matching keys`
    }

    const outputLabel: Record<string, string> = {
      filtered: "→ filtered items",
      rejected: "→ rejected items",
      both: "→ pass + fail",
      stats_only: "→ stats only",
    }
    const label = outputLabel[data.outputMode as string] ?? "→ filtered items"

    return `${totalConditions} condition${totalConditions !== 1 ? "s" : ""} ${label}`
  } catch {
    return `Filter — ${varName}`
  }
}

export const FilterNode = memo((props: NodeProps<FilterNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false)
  const { setNodes } = useReactFlow()
  const params = useParams()
  const workflowId = params.workflowId as string
  const trpc = useTRPC()

  const dbConfig = undefined as any;
const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: filterChannelName(props.id),
    topic: "status",
    refreshToken: () => fetchFilterRealtimeToken(props.id),
  })

  const handleOpenSettings = () => setDialogOpen(true)

  const handleSubmit = (values: FilterNodeData) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === props.id) {
          return { ...node, data: { ...node.data, ...values } }
        }
        return node
      })
    )
  }

  const description = getDescription((dbConfig as unknown as FilterNodeData) ?? props.data)

  return (
    <>
      <FilterDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={props.data}
        nodeId={props.id}
        workflowId={workflowId}
      />
      <BaseExecutionNode
        {...props}
        name="Filter"
        id={props.id}
        status={nodeStatus}
        icon={Filter}
        description={description}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  )
})

FilterNode.displayName = "FilterNode"
