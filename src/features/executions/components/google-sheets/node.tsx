"use client"
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react"
import { memo, useState } from "react"
import { BaseExecutionNode } from "../base-execution-node"
import { GoogleSheetsFormValues, GoogleSheetsDialog } from "./dialog"
import { useNodeStatus } from "@/features/triggers/components/shared/hooks/use-node-status"
import { fetchGoogleSheetsRealtimeToken } from "./actions"
import { GOOGLE_SHEETS_CHANNEL_NAME } from "@/inngest/channels/google-sheets"
import { useParams } from "next/navigation"
import { useTRPC } from "@/trpc/client"
import { useQuery } from "@tanstack/react-query"

type GoogleSheetsNodeData = {
  credentialId?: string
  operation?: string
  variableName?: string
  spreadsheetId?: string
  sheetName?: string
  [key: string]: unknown
}

type GoogleSheetsNodeType = Node<GoogleSheetsNodeData>

const operationLabels: Record<string, string> = {
  READ_ROWS: "Read Rows",
  GET_ROW_BY_NUMBER: "Get Row by Number",
  SEARCH_ROWS: "Search Rows",
  GET_SHEET_INFO: "Get Sheet Info",
  APPEND_ROW: "Append Row",
  UPDATE_ROW: "Update Row",
  UPDATE_ROWS_BY_QUERY: "Update Rows by Query",
  DELETE_ROW: "Delete Row",
  CLEAR_RANGE: "Clear Range",
  CREATE_SHEET: "Create Sheet",
}

function getDescription(config: unknown): string {
  const c = config as Record<string, unknown> | null | undefined
  if (!c?.operation) return "Click to configure"
  const op = String(c.operation)
  const label = operationLabels[op] ?? op.replace(/_/g, " ")
  switch (op) {
    case "READ_ROWS":
      return c.sheetName ? `${label}: ${c.sheetName}` : label
    case "APPEND_ROW":
      return label
    case "UPDATE_ROW":
      return c.rowNumber ? `${label} #${c.rowNumber}` : label
    case "DELETE_ROW":
      return c.rowNumber ? `${label} #${c.rowNumber}` : label
    case "GET_ROW_BY_NUMBER":
      return c.rowNumber ? `${label} #${c.rowNumber}` : label
    case "SEARCH_ROWS":
      return c.searchColumn ? `${label}: ${c.searchColumn}` : label
    case "CLEAR_RANGE":
      return c.clearRange ? `${label}: ${c.clearRange}` : label
    case "CREATE_SHEET":
      return c.newSheetName ? `${label}: ${c.newSheetName}` : label
    default:
      return label
  }
}

export const GoogleSheetsNode = memo(
  (props: NodeProps<GoogleSheetsNodeType>) => {
    const [dialogOpen, setDialogOpen] = useState(false)
    const { setNodes } = useReactFlow()
    const params = useParams()
    const workflowId = params.workflowId as string
    const trpc = useTRPC()

    const dbConfig = undefined as any;
const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: GOOGLE_SHEETS_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchGoogleSheetsRealtimeToken,
    })

    const handleOpenSettings = () => setDialogOpen(true)
    const handleSubmit = (values: GoogleSheetsFormValues) => {
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

    const description = getDescription(dbConfig ?? props.data)

    return (
      <>
        <GoogleSheetsDialog
          onSubmit={handleSubmit}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          defaultValues={props.data}
          nodeId={props.id}
          workflowId={workflowId}
        />
        <BaseExecutionNode
          {...props}
          name="Google Sheets"
          id={props.id}
          status={nodeStatus}
          icon="/logos/googlesheets.svg"
          description={description}
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    )
  }
)

GoogleSheetsNode.displayName = "GoogleSheetsNode"
