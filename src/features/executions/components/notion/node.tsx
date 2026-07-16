"use client"
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react"
import { memo, useState } from "react"
import { BaseExecutionNode } from "../base-execution-node"

import { NotionFormValues, NotionDialog } from "./dialog"
import { useNodeStatus } from "@/features/triggers/components/shared/hooks/use-node-status"
import { fetchNotionRealtimeToken } from "./actions"
import { NOTION_CHANNEL_NAME } from "@/inngest/channels/notion"
import { useParams } from "next/navigation"

type NotionNodeData = {
  credentialId?: string
  operation?: string
  databaseId?: string
  pageId?: string
  blockContent?: string
  searchQuery?: string
  filterJson?: string
  sortsJson?: string
  propertiesJson?: string
  notionUserId?: string
  pageSize?: number
  startCursor?: string
}

type NotionNodeType = Node<NotionNodeData>

const operationLabels: Record<string, string> = {
  QUERY_DATABASE: "Query Database",
  CREATE_DATABASE_PAGE: "Create Page in DB",
  UPDATE_DATABASE_PAGE: "Update Page in DB",
  GET_PAGE: "Get Page",
  ARCHIVE_PAGE: "Archive Page",
  APPEND_BLOCK: "Append Block",
  GET_BLOCK_CHILDREN: "Get Block Children",
  SEARCH: "Search Pages",
  GET_DATABASE: "Get Database",
  LIST_DATABASES: "List Databases",
  SEARCH_DATABASE: "Search Database",
  CREATE_PAGE: "Create Page",
  GET_USER: "Get User",
  GET_USERS: "List Users",
}

export const NotionNode = memo((props: NodeProps<NotionNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false)
  const { setNodes } = useReactFlow()
  const params = useParams()
  const workflowId = params.workflowId as string

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: NOTION_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchNotionRealtimeToken,
  })

  const handleOpenSettings = () => setDialogOpen(true)
  const handleSubmit = (values: NotionFormValues) => {
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
  const opLabel = nodeData?.operation
    ? operationLabels[nodeData.operation] ?? nodeData.operation
    : ""
  const dbSuffix = nodeData?.databaseId
    ? ` (${nodeData.databaseId.slice(0, 8)}…)`
    : ""
  const pageSuffix = nodeData?.pageId
    ? ` (${nodeData.pageId.slice(0, 8)}…)`
    : ""
  const description =
    opLabel
      ? `${opLabel}${dbSuffix}${pageSuffix}`
      : "Click to configure"

  return (
    <>
      <NotionDialog
        onSubmit={handleSubmit}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultValues={nodeData}
        nodeId={props.id}
        workflowId={workflowId}
      />
      <BaseExecutionNode
        {...props}
        name="Notion"
        id={props.id}
        status={nodeStatus}
        icon="/logos/notion.svg"
        description={description}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  )
})

NotionNode.displayName = "NotionNode"
