"use client"
import { createId} from "@paralleldrive/cuid2"
import { useReactFlow } from "@xyflow/react"
import {  GlobeIcon , MousePointerIcon , LinkIcon , ClockIcon, GitBranchIcon, GitForkIcon, SlidersHorizontalIcon, TableIcon, CodeIcon, RepeatIcon, TimerIcon, MergeIcon, AlertTriangleIcon, UploadIcon, ArrowUpDown, Filter, TrendingUp, Database} from "lucide-react"
import { useCallback } from "react"
import { toast } from "sonner"
import { 
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
  
 } from "@/components/ui/sheet"

 import { NodeType } from "@/generated/prisma"
import { Separator } from "./ui/separator"
 
export type NodeTypeOptions ={
    type:NodeType,
    label:string,
    description:string,
    icon:React.ComponentType<{className?:string}> | string

}
const triggerNodes: NodeTypeOptions[] = [
    {
        type:NodeType.MANUAL_TRIGGER,
        label:" Trigger Manually",
        description:" Runs the flow on clicking a button , Good for getting started quickly",
        icon:MousePointerIcon
    },

     {
        type:NodeType.GOOGLE_FORM_TRIGGER,
        label:" Google Form",
        description:" Runs the flow when a Google Form is submitted",
        icon:"/logos/googleform.svg"
    },
    
     {
        type:NodeType.STRIPE_TRIGGER,
        label:" Stripe",
        description:" when stripe event is captured",
        icon:"/logos/stripe.svg"
    },

     {
        type:NodeType.WEBHOOK_TRIGGER,
        label:"Webhook",
        description:"Trigger a workflow via HTTP request",
        icon:LinkIcon
    },

     {
        type:NodeType.SCHEDULE_TRIGGER,
        label:"Schedule",
        description:"Run a workflow on a time-based schedule",
        icon:ClockIcon
    },
    {
        type:NodeType.ERROR_TRIGGER,
        label:"Error Trigger",
        description:"Fires when any node in this workflow fails",
        icon:AlertTriangleIcon,
    },
    {
        type:NodeType.RAZORPAY_TRIGGER,
        label:"Razorpay Trigger",
        description:"When Razorpay event occurs (payment, refund, etc.)",
        icon:"/logos/razorpay.svg",
    },
    {
        type:NodeType.WHATSAPP_TRIGGER,
        label:"WhatsApp Trigger",
        description:"When WhatsApp message is received",
        icon:"/logos/whatsapp.svg",
    },
]

const executionNodes: NodeTypeOptions[] = [
    {
        type:NodeType.HTTP_REQUEST,
        label:"HTTP Request",
        description:"Runs the flow on receiving a HTTP request",
        icon:GlobeIcon
    },

     {
        type:NodeType.GEMINI,
        label:"Gemini",
        description:"Use google gemini to generate text",
        icon:"/logos/gemini.svg"
    },
    
     {
        type:NodeType.OPENAI,
        label:"OpenAi",
        description:"Use OpenAi to generate text",
        icon:"/logos/openai.svg"
    }
    ,
    
     {
        type:NodeType.ANTHROPIC,
        label:"Anthropic",
        description:"Use Anthropic to generate text",
        icon:"/logos/anthropic.svg"
    },
    {
        type:NodeType.XAI,
        label:"xAi",
        description:"Use xAi to generate text",
        icon:"/logos/xai.svg"
    },
    {
        type:NodeType.DISCORD,
        label:"Discord",
        description:"Send message to discord",
        icon:"/logos/discord.svg"
    },
    {
        type:NodeType.SLACK,
        label:"Slack",
        description:"Send messages, manage channels, users & more",
        icon:"/logos/slack.svg"
    },
    {
        type:NodeType.PERPLEXITY,
        label:"Perplexity",
        description:"Use Perplexity to generate text",
        icon:"/logos/perplexity.svg"
    },
    {
        type:NodeType.DEEPSEEK,
        label:"DeepSeek",
        description:"Use DeepSeek to generate text",
        icon:"/logos/deepseek.svg"
    },
    {
        type:NodeType.GROQ,
        label:"Groq",
        description:"Use Groq to generate text",
        icon:"/logos/groq.svg"
    },
     {
        type:NodeType.TELEGRAM,
        label:"Telegram",
        description:"Use Telegram to send messages",
        icon:"/logos/telegram.svg"
    },
    {
        type:NodeType.X,
        label:"X",
        description:"Use X to send messages",
        icon:"/logos/x.svg"
    },
    {
        type:NodeType.WORKDAY,
        label:"Workday",
        description:"Use Workday to send messages",
        icon:"/logos/workday.svg"
    },
    {
        type:NodeType.IF_ELSE,
        label:"If / Else",
        description:"Branch workflow based on a condition",
        icon:GitBranchIcon
    },
    {
        type:NodeType.SWITCH,
        label:"Switch",
        description:"Route to one of N branches based on conditions",
        icon:GitForkIcon
    },
    {
        type:NodeType.GMAIL,
        label:"Gmail",
        description:"Send an email via Gmail",
        icon:"/logos/gmail.svg"
    },
    {
        type:NodeType.SET_VARIABLE,
        label:"Set Variable",
        description:"Extract and transform data",
        icon:SlidersHorizontalIcon
    },
    {
        type:NodeType.GOOGLE_SHEETS,
        label:"Google Sheets",
        description:"Append or read rows in a spreadsheet",
        icon:"/logos/googlesheets.svg"
    },
    {
        type:NodeType.GOOGLE_DRIVE,
        label:"Google Drive",
        description:"Upload, download, or list files",
        icon:"/logos/google-drive.svg"
    },
    {type:NodeType.CODE,
        label:"Code",
        description:"Run JavaScript to transform data",
        icon:CodeIcon
    },
    {
        type:NodeType.WHATSAPP,
        label:"WhatsApp",
        description:"Send WhatsApp messages via Meta API",
        icon:"/logos/whatsapp.svg",
    },
    {
        type:NodeType.LOOP,
        label:"Loop",
        description:"Iterate over an array of items",
        icon:RepeatIcon
    },
    {
        type:NodeType.NOTION,
        label:"Notion",
        description:"Interact with Notion databases, pages, and blocks",
        icon:"/logos/notion.svg"
    },
    {
        type:NodeType.RAZORPAY,
        label:"Razorpay",
        description:"Orders, payments, refunds, subscriptions",
        icon:"/logos/razorpay.svg"
    },
    {
        type:NodeType.WAIT,
        label:"Wait / Delay",
        description:"Pause execution for a duration, until a time, or until webhook",
        icon:TimerIcon
    },
    {
        type:NodeType.MERGE,
        label:"Merge",
        description:"Combine data from multiple branches",
        icon:MergeIcon
    },
    {
        type:NodeType.MSG91,
        label:"MSG91",
        description:"SMS, OTP, WhatsApp, Voice, Email — India's #1",
        icon:"/logos/msg91.svg"
    },
    {
        type:NodeType.SHIPROCKET,
        label:"Shiprocket",
        description:"Indian shipping — orders, tracking, returns, labels",
        icon:"/logos/shiprocket.svg"
    },
    {
        type:NodeType.ZOHO_CRM,
        label:"Zoho CRM",
        description:"Create leads, contacts, deals, tasks, and more in Zoho CRM",
        icon:"/logos/zoho.svg"
    },
    {
        type:NodeType.HUBSPOT,
        label:"HubSpot",
        description:"35 CRM operations across contacts, companies, deals, tickets",
        icon:"/logos/hubspot.svg"
    },
    {
        type:NodeType.FRESHDESK,
        label:"Freshdesk",
        description:"32 support ops — tickets, contacts, companies, agents",
        icon:"/logos/freshdesk.svg"
    },
    {
        type:NodeType.MEDIA_UPLOAD,
        label:"Media Upload",
        description:"Upload image/audio/video to cloud storage and get a permanent URL",
        icon:UploadIcon
    },
    {
        type:NodeType.SORT,
        label:"Sort",
        description:"Sort, reverse, or shuffle arrays and objects",
        icon:ArrowUpDown
    },
    {
        type:NodeType.FILTER,
        icon: Filter,
        label:"Filter",
        description:"Filter arrays or objects based on conditions"
    },
    {
        type:NodeType.CASHFREE,
        label:"Cashfree",
        description:"35 operations — orders, refunds, payouts, UPI, payment links",
        icon:"/logos/cashfree.svg"
    },
    {
        type:NodeType.AGGREGATE,
        label:"Aggregate",
        description:"Sum, count, average, group, pivot, and more on arrays",
        icon:TrendingUp
    },
    {
        type:NodeType.POSTGRES,
        label:"PostgreSQL",
        description:"Execute secure, parameterized database queries",
        icon:Database
    },

]

interface NodeSelectorProps{
    children:React.ReactNode
    open:boolean,
    onOpenChange:(open:boolean)=>void
}

export function NodeSelector ({
    open,
    onOpenChange,
    children
}:NodeSelectorProps){
    const {setNodes , getNodes, screenToFlowPosition} = useReactFlow()
const handleNodeSelect = useCallback((selection:NodeTypeOptions)=>{
    if (selection.type=== NodeType.MANUAL_TRIGGER){
        const nodes = getNodes()
        const hasManualTrigger = nodes.some((node)=>node.type===NodeType.MANUAL_TRIGGER)
        if (hasManualTrigger){
            toast.error("Only one Manual trigger is allowed per workflow")
            return
        }
    }
        
    setNodes((nodes)=>{
        const hasInitialTrigger = nodes.some((node)=>node.type===NodeType.INITIAL);
        const centreX = window.innerWidth / 2;
        const centreY = window.innerHeight / 2;
        const flowPosition = screenToFlowPosition({x:centreX +(Math.random()-0.5)*200, y:centreY+(Math.random()-0.5)*200})
         const newNode = {
        id:createId(),
        data:{},
        position:flowPosition,
        type:selection.type
        
    };
    if (hasInitialTrigger) {
        return[newNode]
    }
    return[...nodes,newNode]
    });
    onOpenChange(false)
   
    

} ,[setNodes , getNodes , onOpenChange , screenToFlowPosition] )
    return(
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetTrigger asChild>
                {children}
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md overflow-auto">
                <SheetHeader>
                    <SheetTitle>What triggers this Workflow?</SheetTitle>
                    <SheetDescription>
                      A trigger is a step that start your workflow.
                    </SheetDescription>
                </SheetHeader>
                <div>
                    {triggerNodes.map((nodeType)=>{
                        const Icon = nodeType.icon;
                        return(
                            <div key={nodeType.type}
                            className="w-full justify-start h-auto py-5 px-4 rounded-none cursor-pointer border-l-2 border-transparent hover:border-l-primary"
                            onClick={()=>handleNodeSelect(nodeType)}
                            >
                                <div className="flex items-center gap-6 w-full overrflow-hidden">
                                {typeof Icon ==="string"?(
                                    <img
                                    src={Icon}
                                    alt={nodeType.label}
                                    className="size-5 object-contain rounded-sm"
                                    />
                                ):(
                                    <Icon className="size-5" />
                                )}
                                <div className="flex flex-col items-start text-left">
                                    <span className="font-medium text-sm">
                                        {nodeType.label}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {nodeType.description}
                                    

                                    </span>
                                </div>
                                </div>

                            </div>
                        )
                    })}
                </div>
                <Separator />
                

                 <div>
                    {executionNodes.map((nodeType)=>{
                        const Icon = nodeType.icon;
                        return(
                            <div key={nodeType.type}
                            className="w-full justify-start h-auto py-5 px-4 rounded-none cursor-pointer border-l-2 border-transparent hover:border-l-primary"
                            onClick={()=>handleNodeSelect(nodeType)}
                            >
                                <div className="flex items-center gap-6 w-full overrflow-hidden">
                                {typeof Icon ==="string"?(
                                    <img
                                    src={Icon}
                                    alt={nodeType.label}
                                    className="size-5 object-contain rounded-sm"
                                    />
                                ):(
                                    <Icon className="size-5" />
                                )}
                                <div className="flex flex-col items-start text-left">
                                    <span className="font-medium text-sm">
                                        {nodeType.label}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {nodeType.description}
                                    

                                    </span>
                                </div>
                                </div>

                            </div>
                        )
                    })}
                </div>
            </SheetContent>
        </Sheet>
    )
    
}
