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
    const deleteErrorTrigger = useMutation(trpc.errorTrigger.delete.mutationOptions())


    const onNodesDelete = useCallback((deletedNodes: Node[]) => {
      for (const node of deletedNodes) {
        const nodeId = node.id
        switch (node.type) {
          case NodeType.ERROR_TRIGGER: deleteErrorTrigger.mutate({ nodeId }); break
        }
      }
    }, [deleteErrorTrigger]);

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
