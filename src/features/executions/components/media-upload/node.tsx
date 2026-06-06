"use client"
import { useReactFlow, type Node, type NodeProps } from "@xyflow/react"
import { memo, useState } from "react"
import { BaseExecutionNode } from "../base-execution-node"
import { MediaUploadDialog, MediaUploadFormValues } from "./dialog"
import { useNodeStatus } from "@/features/triggers/components/shared/hooks/use-node-status"
import { fetchMediaUploadRealtimeToken } from "./actions"
import { mediaUploadChannelName } from "@/inngest/channels/media-upload"
import { MediaUploadSource } from "@/features/executions/enums"
import { useParams } from "next/navigation"

export type MediaUploadNodeData = {
    source?: MediaUploadSource
    inputField?: string
    mimeTypeHint?: string
    filename?: string
    credentialId?: string | null
    variableName?: string
    continueOnFail?: boolean
}

type MediaUploadNodeType = Node<MediaUploadNodeData>;

export const MediaUploadNode = memo((props: NodeProps<MediaUploadNodeType>) => {
    const [dialogOpen, setDialogOpen] = useState(false)
    const { setNodes } = useReactFlow()
    const params = useParams()
    const workflowId = params.workflowId as string

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: mediaUploadChannelName(props.id),
        topic: "status",
        refreshToken: () => fetchMediaUploadRealtimeToken(props.id)
    })

    const handleOpenSettings = () => setDialogOpen(true)

    const handleSubmit = (values: MediaUploadFormValues) => {
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

    const nodeData = props.data
    const description = nodeData?.inputField
        ? `Source: ${nodeData.source || 'URL'} - ${nodeData.inputField.slice(0, 30)}...`
        : "Not configured"

    return (
        <>
            <MediaUploadDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                defaultValues={nodeData}
                onSubmit={handleSubmit}
                nodeId={props.id}
                workflowId={workflowId}
            />
            <BaseExecutionNode
                {...props}
                name="Media Upload"
                id={props.id}
                status={nodeStatus}
                icon="/logos/folder.svg"
                description={description}
                onSettings={handleOpenSettings}
                onDoubleClick={handleOpenSettings}
            />
        </>
    )
})

MediaUploadNode.displayName = "MediaUploadNode"
