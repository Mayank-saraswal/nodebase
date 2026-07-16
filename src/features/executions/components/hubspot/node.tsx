"use client"

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react"
import { memo, useState } from "react"
import { BaseExecutionNode } from "../base-execution-node"
import { HubspotDialog, HubspotFormValues } from "./dialog"
import { useNodeStatus } from "@/features/triggers/components/shared/hooks/use-node-status"
import { HUBSPOT_CHANNEL_NAME } from "@/inngest/channels/hubspot"
import { fetchHubspotRealtimeToken } from "./actions"
import { HubspotOperation } from "@/features/executions/enums"
import { useParams } from "next/navigation"

type HubspotNodeData = {
  credentialId?: string
  operation?: HubspotOperation
  variableName?: string
  recordId?: string
  objectType?: string
  searchQuery?: string
  [key: string]: unknown
}

type HubspotNodeType = Node<HubspotNodeData>

const OPERATION_LABELS: Partial<Record<HubspotOperation, string>> = {
  [HubspotOperation.CREATE_CONTACT]: "Create Contact",
  [HubspotOperation.GET_CONTACT]: "Get Contact",
  [HubspotOperation.UPDATE_CONTACT]: "Update Contact",
  [HubspotOperation.DELETE_CONTACT]: "Delete Contact",
  [HubspotOperation.SEARCH_CONTACTS]: "Search Contacts",
  [HubspotOperation.UPSERT_CONTACT]: "Upsert Contact",
  [HubspotOperation.GET_CONTACT_ASSOCIATIONS]: "Get Contact Associations",
  [HubspotOperation.CREATE_COMPANY]: "Create Company",
  [HubspotOperation.GET_COMPANY]: "Get Company",
  [HubspotOperation.UPDATE_COMPANY]: "Update Company",
  [HubspotOperation.DELETE_COMPANY]: "Delete Company",
  [HubspotOperation.SEARCH_COMPANIES]: "Search Companies",
  [HubspotOperation.CREATE_DEAL]: "Create Deal",
  [HubspotOperation.GET_DEAL]: "Get Deal",
  [HubspotOperation.UPDATE_DEAL]: "Update Deal",
  [HubspotOperation.DELETE_DEAL]: "Delete Deal",
  [HubspotOperation.SEARCH_DEALS]: "Search Deals",
  [HubspotOperation.UPDATE_DEAL_STAGE]: "Update Deal Stage",
  [HubspotOperation.CREATE_TICKET]: "Create Ticket",
  [HubspotOperation.GET_TICKET]: "Get Ticket",
  [HubspotOperation.UPDATE_TICKET]: "Update Ticket",
  [HubspotOperation.DELETE_TICKET]: "Delete Ticket",
  [HubspotOperation.SEARCH_TICKETS]: "Search Tickets",
  [HubspotOperation.CREATE_NOTE]: "Create Note",
  [HubspotOperation.CREATE_TASK]: "Create Task",
  [HubspotOperation.CREATE_CALL]: "Create Call",
  [HubspotOperation.CREATE_EMAIL_LOG]: "Create Email Log",
  [HubspotOperation.CREATE_ASSOCIATION]: "Create Association",
  [HubspotOperation.DELETE_ASSOCIATION]: "Delete Association",
  [HubspotOperation.ADD_CONTACT_TO_LIST]: "Add Contact To List",
  [HubspotOperation.REMOVE_CONTACT_FROM_LIST]: "Remove Contact From List",
  [HubspotOperation.GET_LIST_CONTACTS]: "Get List Contacts",
  [HubspotOperation.SEARCH_OBJECTS]: "Search Objects",
  [HubspotOperation.GET_PROPERTIES]: "Get Properties",
}

function formatOperation(op: HubspotOperation) {
  if (OPERATION_LABELS[op]) return OPERATION_LABELS[op] as string
  return op.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function getDescription(data: HubspotNodeData) {
  const op = data.operation
  if (!op) return "Click to configure"
  return formatOperation(op)
}

export const HubspotNode = memo((props: NodeProps<HubspotNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false)
  const { setNodes } = useReactFlow()
  const params = useParams()
  const workflowId = params.workflowId as string

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: `${HUBSPOT_CHANNEL_NAME}:${props.id}`,
    topic: "status",
    refreshToken: () => fetchHubspotRealtimeToken(props.id),
  })

  const handleOpenSettings = () => setDialogOpen(true)

  const handleSubmit = (values: HubspotFormValues) => {
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
      <HubspotDialog
        onSubmit={handleSubmit}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultValues={nodeData}
        nodeId={props.id}
        workflowId={workflowId}
      />
      <BaseExecutionNode
        {...props}
        name="HubSpot"
        id={props.id}
        status={nodeStatus}
        icon="/logos/hubspot.svg"
        description={description}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  )
})

HubspotNode.displayName = "HubspotNode"
