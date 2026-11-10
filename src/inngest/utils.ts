import toposort from 'toposort';
import { Connection , Node } from '@/generated/prisma';
import { inngest } from './client';
import { createId } from '@paralleldrive/cuid2';
import { NonRetriableError } from "inngest";


export const topologicalSort = (
    nodes:Node[],
    connections:Connection[]
     ):Node[] =>{
        if (connections.length === 0) {
            return nodes;
        }

        //Create edged 

        const edges:[string , string ] []= connections.map((conn) => [conn.fromNodeId, conn.toNodeId]);
            
    
        let sortedNodesIds:string[];
        try {
            const allNodeIds = nodes.map(n => n.id);
            sortedNodesIds = toposort.array(allNodeIds, edges);

            sortedNodesIds = [...new Set(sortedNodesIds)];
        } catch (error) {
            if (error instanceof Error && error.message.includes('Cyclic')) {
                throw new NonRetriableError('Workflow contains a cycle');
            } 
             throw error
                
            }

            //Map sorted ids back to node objects 

            const nodeMap = new Map(nodes.map((n)=>[n.id , n]));
            return sortedNodesIds.map((id)=>nodeMap.get(id)!).filter(Boolean)

};

export const sendWorkflowExecution = async (data: {
    workflowId: string;
    inngestId?: string;
    [key: string]: any;
}) => {
    const { inngestId, ...eventData } = data;
    return await inngest.send({
        name: 'workflow/execute.workflow',
        data: eventData,
        id: inngestId || createId()
    });
}

