"use client"

import { memo, useState } from "react"
import { type Node, type NodeProps, useReactFlow } from "@xyflow/react"
import { Database } from "lucide-react"
import { BaseExecutionNode } from "../base-execution-node"
import { useNodeStatus } from "@/features/triggers/components/shared/hooks/use-node-status"
import { postgresChannelName } from "@/inngest/channels/postgres"
import { fetchPostgresRealtimeToken } from "./actions"
import { PostgresDialog } from "./dialog"
import { useParams } from "next/navigation"
import { useTRPC } from "@/trpc/client"
import { useQuery } from "@tanstack/react-query"
import type { PostgresOperation } from "./types"

type PostgresNodeData = {
  operation?: PostgresOperation
  credentialId?: string
  variableName?: string
  schemaName?: string
  tableName?: string
  query?: string
  queryParams?: string
  selectColumns?: string
  whereConditions?: string
  insertData?: string
  updateData?: string
  continueOnFail?: boolean
  returnData?: boolean
  limitRows?: number
  offsetRows?: number
}

type PostgresNodeType = Node<PostgresNodeData>

function getDescription(data: PostgresNodeData | null | undefined): string {
  if (!data) return "Click to configure"
  const op = data.operation
  if (!op) return "Click to configure"

  switch (op) {
    case "EXECUTE_QUERY":
      return "Execute raw query"
    case "SELECT":
    case "SELECT_ONE":
    case "COUNT":
    case "EXISTS":
    case "LIST_TABLES":
    case "GET_TABLE_SCHEMA":
    case "EXECUTE_EXPLAIN":
      return `Read ${data.tableName || data.schemaName || "database"}`
    case "INSERT":
    case "INSERT_MANY":
      return `Insert into ${data.tableName || "table"}`
    case "UPDATE":
      return `Update ${data.tableName || "table"}`
    case "DELETE":
      return `Delete from ${data.tableName || "table"}`
    case "UPSERT":
      return `Upsert into ${data.tableName || "table"}`
    case "EXECUTE_TRANSACTION":
      return "Run transaction"
    case "EXECUTE_FUNCTION":
      return "Execute DB function"
    default:
      return "PostgreSQL query"
  }
}

export const PostgresNode = memo((props: NodeProps<PostgresNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false)
  const { setNodes } = useReactFlow()
  const params = useParams()
  const workflowId = params.workflowId as string
  const trpc = useTRPC()

  const dbConfig = undefined as any;
const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: postgresChannelName(props.id),
    topic: "status",
    refreshToken: () => fetchPostgresRealtimeToken(props.id),
  })

  const handleOpenSettings = () => setDialogOpen(true)

  const handleSubmit = (values: Record<string, unknown>) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === props.id) {
          return { ...node, data: { ...node.data, ...values } }
        }
        return node
      })
    )
  }

  const description = getDescription((dbConfig as unknown as PostgresNodeData) ?? props.data)

  return (
    <>
      <PostgresDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={props.data as Record<string, unknown>}
        nodeId={props.id}
        workflowId={workflowId}
      />
      <BaseExecutionNode
        {...props}
        name="Postgres"
        id={props.id}
        status={nodeStatus}
        icon={Database}
        description={description}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  )
})

PostgresNode.displayName = "PostgresNode"
