"use client"

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react"
import { memo, useState } from "react"
import { BaseExecutionNode } from "../base-execution-node"
import { FreshdeskDialog, type FreshdeskFormValues } from "./dialog"
import { useNodeStatus } from "@/features/triggers/components/shared/hooks/use-node-status"
import { FRESHDESK_CHANNEL_NAME } from "@/inngest/channels/freshdesk"
import { fetchFreshdeskRealtimeToken } from "./actions"
import { FreshdeskOperation } from "@/features/executions/enums"
import { useParams } from "next/navigation"

type FreshdeskNodeData = {
  credentialId?: string
  operation?: FreshdeskOperation
  variableName?: string
  ticketId?: string
  [key: string]: unknown
}

type FreshdeskNodeType = Node<FreshdeskNodeData>

const OPERATION_LABELS: Partial<Record<FreshdeskOperation, string>> = {
  // Tickets
  [FreshdeskOperation.CREATE_TICKET]: "Create Ticket",
  [FreshdeskOperation.GET_TICKET]: "Get Ticket",
  [FreshdeskOperation.UPDATE_TICKET]: "Update Ticket",
  [FreshdeskOperation.DELETE_TICKET]: "Delete Ticket",
  [FreshdeskOperation.LIST_TICKETS]: "List Tickets",
  [FreshdeskOperation.SEARCH_TICKETS]: "Search Tickets",
  [FreshdeskOperation.GET_TICKET_FIELDS]: "Get Ticket Fields",
  [FreshdeskOperation.RESTORE_TICKET]: "Restore Ticket",
  // Notes
  [FreshdeskOperation.ADD_NOTE]: "Add Note",
  [FreshdeskOperation.LIST_NOTES]: "List Notes",
  [FreshdeskOperation.UPDATE_NOTE]: "Update Note",
  [FreshdeskOperation.DELETE_NOTE]: "Delete Note",
  // Contacts
  [FreshdeskOperation.CREATE_CONTACT]: "Create Contact",
  [FreshdeskOperation.GET_CONTACT]: "Get Contact",
  [FreshdeskOperation.UPDATE_CONTACT]: "Update Contact",
  [FreshdeskOperation.DELETE_CONTACT]: "Delete Contact",
  [FreshdeskOperation.LIST_CONTACTS]: "List Contacts",
  [FreshdeskOperation.SEARCH_CONTACTS]: "Search Contacts",
  [FreshdeskOperation.MERGE_CONTACT]: "Merge Contact",
  // Companies
  [FreshdeskOperation.CREATE_COMPANY]: "Create Company",
  [FreshdeskOperation.GET_COMPANY]: "Get Company",
  [FreshdeskOperation.UPDATE_COMPANY]: "Update Company",
  [FreshdeskOperation.DELETE_COMPANY]: "Delete Company",
  [FreshdeskOperation.LIST_COMPANIES]: "List Companies",
  // Agents
  [FreshdeskOperation.LIST_AGENTS]: "List Agents",
  [FreshdeskOperation.GET_AGENT]: "Get Agent",
  [FreshdeskOperation.UPDATE_AGENT]: "Update Agent",
  // Conversations
  [FreshdeskOperation.LIST_CONVERSATIONS]: "List Conversations",
  [FreshdeskOperation.SEND_REPLY]: "Send Reply",
  [FreshdeskOperation.CREATE_OUTBOUND_EMAIL]: "Create Outbound Email",
  // Generic
  [FreshdeskOperation.GET_TICKET_STATS]: "Get Ticket Stats",
}

function formatOperation(op: FreshdeskOperation) {
  if (OPERATION_LABELS[op]) return OPERATION_LABELS[op] as string
  return op.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function getDescription(data: FreshdeskNodeData) {
  const op = data.operation
  if (!op) return "Click to configure"
  return formatOperation(op)
}

export const FreshdeskNode = memo((props: NodeProps<FreshdeskNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false)
  const { setNodes } = useReactFlow()
  const params = useParams()
  const workflowId = params.workflowId as string

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: `${FRESHDESK_CHANNEL_NAME}:${props.id}`,
    topic: "status",
    refreshToken: () => fetchFreshdeskRealtimeToken(props.id),
  })

  const handleOpenSettings = () => setDialogOpen(true)

  const handleSubmit = (values: FreshdeskFormValues) => {
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

  const nodeData = props.data
  const description = getDescription(nodeData)

  return (
    <>
      <FreshdeskDialog
        onSubmit={handleSubmit}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultValues={nodeData}
        nodeId={props.id}
        workflowId={workflowId}
      />
      <BaseExecutionNode
        {...props}
        name="Freshdesk"
        id={props.id}
        status={nodeStatus}
        icon="/logos/freshdesk.svg"
        description={description}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  )
})

FreshdeskNode.displayName = "FreshdeskNode"
