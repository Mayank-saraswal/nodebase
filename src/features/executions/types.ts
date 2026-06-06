import type { Realtime } from "@inngest/realtime";
import { GetStepTools , Inngest } from "inngest";


export type WorkflowContext = Record<string, unknown>;

export type StepTools = GetStepTools<Inngest.Any>;

export interface WorkflowNode {
    id: string;
    type: string;
    data?: Record<string, unknown>;
}

export interface WorkflowConnection {
    id: string;
    fromNodeId: string;
    toNodeId: string;
    fromOutput?: string;
    toInput?: string;
}

export interface NodeExecutorParams <TData = Record<string, unknown>>{
    data: TData;
    nodeId : string;
    credentialId: string | null;
    context: WorkflowContext;   
    step:StepTools;
    publish:Realtime.PublishFn
    userId:string;
    workflowNodes?: WorkflowNode[];
    workflowConnections?: WorkflowConnection[];

};

export type NodeExecutor<TData = Record<string, unknown>> = (params: NodeExecutorParams<TData>) => Promise<WorkflowContext>;