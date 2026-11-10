"use client"
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react"
import { memo, useState } from "react"
import { BaseExecutionNode } from "../base-execution-node"
import { Mail } from "lucide-react"
import { GmailFormValues, GmailDialog } from "./dialog"
import { useNodeStatus } from "@/features/triggers/components/shared/hooks/use-node-status"
import { fetchGmailRealtimeToken } from "./actions"
import { GMAIL_CHANNEL_NAME } from "@/inngest/channels/gmail"
import { useParams } from "next/navigation"
import { useTRPC } from "@/trpc/client"
import { useQuery } from "@tanstack/react-query"

type GmailNodeData = {
    credentialId?: string
    operation?: string
    variableName?: string
    to?: string
    cc?: string
    bcc?: string
    subject?: string
    body?: string
    isHtml?: boolean
    messageId?: string
    searchQuery?: string
    maxResults?: number
    labelIds?: string
    [key: string]: unknown
}

type GmailNodeConfig = {
    operation?: string
    to?: string
    messageId?: string
    searchQuery?: string
    maxResults?: number
    labelIds?: string
}

function getDescription(config: GmailNodeConfig | null | undefined): string {
    if (!config) return "Click to configure"
    switch (config.operation) {
        case "SEND":
            return config.to
                ? `To: ${config.to.slice(0, 28)}`
                : "Send Email"
        case "REPLY":
            return config.messageId
                ? `Reply to ${config.messageId.slice(0, 15)}`
                : "Reply to Email"
        case "FORWARD":
            return config.to
                ? `Forward to ${config.to.slice(0, 22)}`
                : "Forward Email"
        case "GET_MESSAGE":
            return "Read email"
        case "LIST_MESSAGES":
            return `List ${config.maxResults || 10} emails`
        case "SEARCH_MESSAGES":
            return config.searchQuery
                ? `Search: ${config.searchQuery.slice(0, 25)}`
                : "Search Emails"
        case "ADD_LABEL":
            return config.labelIds
                ? `Add: ${config.labelIds.slice(0, 20)}`
                : "Add Label"
        case "REMOVE_LABEL":
            return config.labelIds
                ? `Remove: ${config.labelIds.slice(0, 18)}`
                : "Remove Label"
        case "MARK_READ":    return "Mark as read"
        case "MARK_UNREAD":  return "Mark as unread"
        case "MOVE_TO_TRASH": return "Move to trash"
        case "CREATE_DRAFT":
            return config.to
                ? `Draft to ${config.to.slice(0, 22)}`
                : "Create Draft"
        case "GET_ATTACHMENT":
            return "Download attachment"
        case "GET_THREAD":
            return "Get thread"
        case "LIST_LABELS":
            return "List labels"
        case "CREATE_LABEL":
            return "Create label"
        case "LIST_DRAFTS":
            return "List drafts"
        case "SEND_DRAFT":
            return "Send draft"
        default:
            return "Click to configure"
    }
}

type GmailNodeType = Node<GmailNodeData>;
export const GmailNode = memo((props: NodeProps<GmailNodeType>) => {
    const [dialogOpen, setDialogOpen] = useState(false)
    const { setNodes } = useReactFlow()
    const params = useParams()
    const workflowId = params.workflowId as string
    const trpc = useTRPC()

    const dbConfig = undefined as any;
const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: GMAIL_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchGmailRealtimeToken
    })
    const handleOpenSettings = () => setDialogOpen(true)
    const handleSubmit = (values: GmailFormValues) => {
        setNodes((nodes) => nodes.map((node) => {
            if (node.id === props.id) {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        ...values
                    }
                }
            }
            return node
        }))
    }

    const description = getDescription(dbConfig ?? props.data)

    return (
        <>
            <GmailDialog
                onSubmit={handleSubmit}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                defaultValues={props.data}
                nodeId={props.id}
                workflowId={workflowId}
            />
            <BaseExecutionNode
                {...props}
                name="Gmail"
                id={props.id}
                status={nodeStatus}
                icon={Mail}
                description={description}
                onSettings={handleOpenSettings}
                onDoubleClick={handleOpenSettings}
            />
        </>
    )
})

GmailNode.displayName = "GmailNode"
