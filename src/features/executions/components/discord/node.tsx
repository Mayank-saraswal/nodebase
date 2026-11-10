"use client"
import{useReactFlow, type Node , type NodeProps } from "@xyflow/react"
import { memo , useState } from "react"
import { BaseExecutionNode } from "../base-execution-node"  
import { GlobeIcon } from "lucide-react"
import { DiscordFormValues , DiscordDialog } from "./dialog"
import { useNodeStatus } from "@/features/triggers/components/shared/hooks/use-node-status"
import { fetchDiscordRealtimeToken} from "./actions"
import { DISCORD_CHANNEL_NAME } from "@/inngest/channels/discord"

type DiscordNodeData = {
    webhookUrl?: string
    content?: string
    username?: string
    operation?: string
    channelId?: string
    variableName?: string
}


type DiscordNodeType = Node<DiscordNodeData>;
export const DiscordNode = memo((props:NodeProps<DiscordNodeType>)=>{
    const [dialogOpen , setDialogOpen] = useState(false)
    const {setNodes} = useReactFlow()

    

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel:DISCORD_CHANNEL_NAME,
        topic:"status",
        refreshToken : fetchDiscordRealtimeToken
    })
    const handleOpenSettings = ()=>setDialogOpen(true)
    const handleSubmit =(values:DiscordFormValues) =>{
    setNodes((nodes)=>nodes.map((node)=>{
        if(node.id === props.id) {
            return {
                ...node,
                data:{
                    ...node.data,
                    ...values
                }
            }
        }
        return node
    }))
            
    }
    const nodeData = props.data
    const op = nodeData?.operation || "SEND_MESSAGE"
    const description = nodeData?.content
      ? `${op}: ${nodeData.content.slice(0, 40)}…`
      : nodeData?.channelId
        ? `${op} · #${nodeData.channelId.slice(0, 12)}`
        : nodeData?.webhookUrl
          ? "Webhook configured"
          : "Not configured"
    
    return(
        <>
        <DiscordDialog
        onSubmit={handleSubmit}
        
        open =  {dialogOpen}
        onOpenChange={setDialogOpen} 
        defaultValues={nodeData}   
        />
        <BaseExecutionNode
        {...props}
        name="Discord"
        id={props.id}
        status={nodeStatus}
        icon= "/logos/discord.svg"
        description={description}
        onSettings={handleOpenSettings}
        onDoubleClick = {handleOpenSettings}
        
        />
        </>
    )
})

DiscordNode.displayName = "DiscordNode"