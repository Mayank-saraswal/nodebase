"use client"
import {type NodeProps , Position, useReactFlow} from "@xyflow/react"
import type{LucideIcon} from "lucide-react"
import Image from "next/image"
import {memo , useCallback , type ReactNode} from "react"

import { BaseNode , BaseNodeContent } from "../../../components/react-flow/base-node"
import { BaseHandle} from "../../../components/react-flow/base-handle"
import { WrokflowNode } from "../../../components/workflow-node"
import { type NodeStatus, NodeStatusIndicator } from "@/components/react-flow/node-status-indicator"



interface BaseTriggerNodeProps extends NodeProps{
    icon:LucideIcon | string,
    id:string
    name:string,
    description?:string,
    status:NodeStatus,
    children?:ReactNode
    onSettings?() : void
    onDoubleClick?() :void

};

export const BaseTriggerNode = memo(function BaseTriggerNode({
    icon:Icon,
    id,
    name,
    description,
    children,
    onSettings,
    onDoubleClick,
    status = "initial"
    
}:BaseTriggerNodeProps) {
    const {setNodes , setEdges} = useReactFlow()
    const handleDelete = ()=>{
        setNodes((currentNodes)=>{
           const updatedNodes = currentNodes.filter((node)=>node.id !== id)
           return updatedNodes
        })
        setEdges((currentEdges)=>{
            const updatedEdges = currentEdges.filter((edge)=>edge.source !== id && edge.target !== id)
            return updatedEdges
        })

    }
   
    return (
        <WrokflowNode
            
            name={name}
            description={description}
           
            onSettings={onSettings}
            onDelete={handleDelete}
        >
            <NodeStatusIndicator
            status={status}
            variant="border"
            className="rounded-l-2xl"
            >
            <BaseNode
                status={status}
                onDoubleClick={onDoubleClick}
                className="rounded-l-2xl  relative group"
            >
                <BaseNodeContent>
                    {typeof Icon ==="string"?(
                        <img
                        src={Icon}
                        alt={name}
                        className="size-4 object-contain"
                        />
                    ):(
                        <Icon className="size-4 text-muted-foreground" />
                    )}
                    {children}
                 
                      <BaseHandle
                    id="source-1"
                    type="source"
                    position={Position.Right}
                    />
                </BaseNodeContent>
            </BaseNode>
            </NodeStatusIndicator>
           
        </WrokflowNode>
    )
})
BaseTriggerNode.displayName = "BaseTriggerNode";