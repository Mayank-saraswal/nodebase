"use client"
import { LoadingView } from "@/components/entity-components";
import { useSuspennseWorkflow, useUpdateWorkflow } from "@/features/workflows/hooks/use-workflows";
import { useState , useCallback, useMemo, useEffect } from "react";
import {ReactFlow , applyNodeChanges , applyEdgeChanges , addEdge ,  type NodeChange , type EdgeChange , type Connection ,type Node , type Edge, Background, Controls, MiniMap} from '@xyflow/react'
import '@xyflow/react/dist/style.css';
import { nodeComponents } from "@/config/node-components";
import { Panel } from "@xyflow/react";
import { AddNodeButton } from "./add-node-button";
import { useSetAtom } from "jotai";
import { editorAtom } from "../store/atoms";
import { NodeType } from "@/generated/prisma";
import { ExecuteWorkflowButton } from "./execute-workflow-button";
import { useTRPC } from "@/trpc/client"
import { useMutation } from "@tanstack/react-query"
import { FloatingChatPanel } from "@/features/ai-agent/components/floating-chat-panel"
import { GeneratedWorkflow } from "@/features/ai-agent/schemas/workflow-generation"

const EXECUTABLE_TRIGGER_TYPES = [
    NodeType.INITIAL,
    NodeType.MANUAL_TRIGGER,
    NodeType.WEBHOOK_TRIGGER,
    NodeType.SCHEDULE_TRIGGER,
] as const




export const EditorLoading = ()=>{
    return(
        <LoadingView message="Loading Editor" />
    )
}

export const EditorError = ()=>{
    return(
        <LoadingView message=" Error Loading editor" />
    )
}


export const Editor = ({workflowId}:{workflowId:string}) => {
    const {data:workflow} = useSuspennseWorkflow(workflowId)
     const setEditor = useSetAtom(editorAtom) 
    const trpc = useTRPC()

     const [nodes, setNodes] = useState<Node[]>(workflow.nodes);
     const [edges, setEdges] = useState<Edge[]>(workflow.edges);

    // DB cleanup mutations — fire-and-forget when nodes are deleted from canvas
    const deleteCode = useMutation(trpc.code.delete.mutationOptions())
    const deleteGmail = useMutation(trpc.gmail.delete.mutationOptions())
    const deleteGoogleDrive = useMutation(trpc.googleDrive.delete.mutationOptions())
    const deleteGoogleSheets = useMutation(trpc.googleSheets.delete.mutationOptions())
    const deleteIfElse = useMutation(trpc.ifElse.delete.mutationOptions())
    const deleteLoop = useMutation(trpc.loop.delete.mutationOptions())
    const deleteNotion = useMutation(trpc.notion.delete.mutationOptions())
    const deleteRazorpay = useMutation(trpc.razorpay.delete.mutationOptions())
    const deleteSetVariable = useMutation(trpc.setVariable.delete.mutationOptions())
    const deleteSlack = useMutation(trpc.slack.delete.mutationOptions())
    const deleteSwitch = useMutation(trpc.switch.delete.mutationOptions())
    const deleteWhatsapp = useMutation(trpc.whatsapp.delete.mutationOptions())
    const deleteWait = useMutation(trpc.wait.delete.mutationOptions())
    const deleteMerge = useMutation(trpc.merge.delete.mutationOptions())
    const deleteErrorTrigger = useMutation(trpc.errorTrigger.delete.mutationOptions())
    const deleteRazorpayTrigger = useMutation(trpc.razorpayTrigger.delete.mutationOptions())
    const deleteWhatsappTrigger = useMutation(trpc.whatsappTrigger.delete.mutationOptions())
    const deleteMsg91 = useMutation(trpc.msg91.delete.mutationOptions())
    const deleteShiprocket = useMutation(trpc.shiprocket.delete.mutationOptions())
    const deleteZohoCrm = useMutation(trpc.zohoCrm.delete.mutationOptions())
    const deleteHubspot = useMutation(trpc.hubspot.delete.mutationOptions())
    const deleteFreshdesk = useMutation(trpc.freshdesk.delete.mutationOptions())
    const deleteFilter = useMutation(trpc.filter.delete.mutationOptions())
    const deleteCashfree = useMutation(trpc.cashfree.delete.mutationOptions())


    const onNodesDelete = useCallback((deletedNodes: Node[]) => {
      for (const node of deletedNodes) {
        const nodeId = node.id
        switch (node.type) {
          case NodeType.CODE: deleteCode.mutate({ nodeId }); break
          case NodeType.GMAIL: deleteGmail.mutate({ nodeId }); break
          case NodeType.GOOGLE_DRIVE: deleteGoogleDrive.mutate({ nodeId }); break
          case NodeType.GOOGLE_SHEETS: deleteGoogleSheets.mutate({ nodeId }); break
          case NodeType.IF_ELSE: deleteIfElse.mutate({ nodeId }); break
          case NodeType.LOOP: deleteLoop.mutate({ nodeId }); break
          case NodeType.NOTION: deleteNotion.mutate({ nodeId }); break
          case NodeType.RAZORPAY: deleteRazorpay.mutate({ nodeId }); break
          case NodeType.SET_VARIABLE: deleteSetVariable.mutate({ nodeId }); break
          case NodeType.SLACK: deleteSlack.mutate({ nodeId }); break
          case NodeType.SWITCH: deleteSwitch.mutate({ nodeId }); break
          case NodeType.WHATSAPP: deleteWhatsapp.mutate({ nodeId }); break
          case NodeType.WAIT: deleteWait.mutate({ nodeId }); break
          case NodeType.MERGE: deleteMerge.mutate({ nodeId }); break
          case NodeType.ERROR_TRIGGER: deleteErrorTrigger.mutate({ nodeId }); break
          case NodeType.RAZORPAY_TRIGGER: deleteRazorpayTrigger.mutate({ nodeId }); break
          case NodeType.WHATSAPP_TRIGGER: deleteWhatsappTrigger.mutate({ nodeId }); break
          case NodeType.MSG91: deleteMsg91.mutate({ nodeId }); break
          case NodeType.SHIPROCKET: deleteShiprocket.mutate({ nodeId }); break
          case NodeType.ZOHO_CRM: deleteZohoCrm.mutate({ nodeId }); break
          case NodeType.HUBSPOT: deleteHubspot.mutate({ nodeId }); break
          case NodeType.FRESHDESK: deleteFreshdesk.mutate({ nodeId }); break
          case NodeType.FILTER: deleteFilter.mutate({ nodeId }); break
          case NodeType.CASHFREE: deleteCashfree.mutate({ nodeId }); break
          case NodeType.CASHFREE_TRIGGER: deleteCashfree.mutate({ nodeId }); break
        }
      }
    }, [deleteCode, deleteGmail, deleteGoogleDrive, deleteGoogleSheets, deleteIfElse, deleteLoop, deleteNotion, deleteRazorpay, deleteSetVariable, deleteSlack, deleteSwitch, deleteWhatsapp, deleteWait, deleteMerge, deleteErrorTrigger, deleteRazorpayTrigger, deleteWhatsappTrigger, deleteMsg91, deleteShiprocket, deleteZohoCrm, deleteHubspot, deleteFreshdesk, deleteFilter, deleteCashfree])

       const onNodesChange = useCallback(
    (changes:NodeChange[]) => setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes:EdgeChange[]) => setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
    [],
  );
  const onConnect = useCallback(
    (params : Connection) => setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot)),
    [],
  );

  const executableTriggerType = useMemo(()=>{
    const triggerNode = nodes.find((node)=>
      EXECUTABLE_TRIGGER_TYPES.includes(node.type as typeof EXECUTABLE_TRIGGER_TYPES[number])
    )
    return triggerNode?.type as typeof EXECUTABLE_TRIGGER_TYPES[number] | undefined
  },[nodes])
 
  const handleWorkflowGenerated = useCallback((generatedWorkflow: GeneratedWorkflow) => {
    const existingNodeIds = new Set(nodes.map(n => n.id));

    // Scramble ONLY new nodes to prevent DB constraint collisions.
    // Preserve exact IDs for nodes that already existed on the canvas.
    const idMap = new Map<string, string>();
    generatedWorkflow.nodes.forEach(n => {
      if (existingNodeIds.has(n.id)) {
        idMap.set(n.id, n.id);
      } else {
        idMap.set(n.id, crypto.randomUUID());
      }
    });

    // We do NOT call onNodesDelete. The AI returns the FULL updated workflow.
    // By replacing setNodes, we naturally drop deleted nodes and add new ones.
    setNodes(
      generatedWorkflow.nodes.map((n) => ({
        id: idMap.get(n.id)!,
        type: n.type,
        position: n.position,
        data: n.data,
      })) as Node[]
    );

    setEdges(
      generatedWorkflow.connections.map((c) => ({
        id: crypto.randomUUID(),
        source: idMap.get(c.fromNodeId)!,
        sourceHandle: "source-1",
        target: idMap.get(c.toNodeId)!,
        targetHandle: "target-1",
      })) as Edge[]
    );
  }, [nodes]);
 
  const updateWorkflow = useUpdateWorkflow();

  // Auto-save debounced by 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      const cleanNodes = nodes.map(n => ({ id: n.id, type: n.type, position: n.position, data: n.data || {} }));
      const cleanEdges = edges.map(e => ({ source: e.source, target: e.target, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle }));
      
      updateWorkflow.mutate({
        id: workflowId,
        nodes: cleanNodes,
        edges: cleanEdges,
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [nodes, edges, workflowId]);

  return ( 
     <div className="size-full">
        <ReactFlow 
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodesDelete={onNodesDelete}
        fitView
        proOptions={{hideAttribution:true}}
        nodeTypes={nodeComponents}
        onInit={setEditor}
        snapGrid={[10 , 10]}
        snapToGrid
        panOnScroll
        panOnDrag = {false}
        selectionOnDrag
        >
         <Background/>  
         <Controls/>

         <MiniMap/> 
         {executableTriggerType && (
            <Panel position="bottom-center">
            <ExecuteWorkflowButton workflowId={workflowId} triggerType={executableTriggerType}/>
            </Panel>
         )}
         <Panel position="top-right">
          <AddNodeButton/>
         
         </Panel>
        </ReactFlow>       

        <FloatingChatPanel 
          workflowId={workflowId}
          currentNodes={nodes}
          currentEdges={edges}
          onWorkflowGenerated={handleWorkflowGenerated} 
        />
       </div>
    )
        
    
}
