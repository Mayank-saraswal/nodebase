import type { Realtime } from "@inngest/realtime";
import { GetStepTools , Inngest } from "inngest";
import type { BaseNodeData } from "./types/index";

export type WorkflowContext = Record<string, unknown>;

export type StepTools = GetStepTools<Inngest.Any>;

export interface WorkflowNode<TData = BaseNodeData> {
    id: string;
    type: string;
    data?: TData;
}

export interface WorkflowConnection {
    id: string;
    fromNodeId: string;
    toNodeId: string;
    fromOutput?: string;
    toInput?: string;
}

export interface NodeExecutorParams<TData = BaseNodeData> {
    data: TData;
    nodeId: string;
    credentialId: string | null;
    context: WorkflowContext;
    step: StepTools;
    publish: Realtime.PublishFn;
    userId: string;
    /** Option C multi-tenant isolation key (Phase A: equals userId) */
    tenantId?: string;
    workflowNodes?: WorkflowNode[];
    workflowConnections?: WorkflowConnection[];
}

export type NodeExecutor<TData = BaseNodeData> = (params: NodeExecutorParams<TData>) => Promise<WorkflowContext>;