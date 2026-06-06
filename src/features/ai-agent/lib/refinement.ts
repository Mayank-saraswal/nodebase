/**
 * Workflow Refinement
 *
 * Handles the "refine" and "debug" AI actions, which modify or analyse
 * an existing generated workflow through multi-turn conversation.
 */

import "server-only";

import { generateObject } from "ai";
import prisma from "@/lib/db";
import { AgentAIProviderType, PROVIDER_CONFIGS } from "../config/providers";
import { WorkflowRefinementSchema, WorkflowRefinementLLMSchema, WorkflowDebugSchema, WorkflowDebugLLMSchema } from "../schemas/workflow-generation";
import { aiProviderGateway } from "./provider-gateway";
import type { GeneratedWorkflow, WorkflowRefinement, WorkflowNode } from "../schemas/workflow-generation";

const REFINE_SYSTEM = `You are Nodebase AI. The user wants to modify an existing workflow.
Analyse the current workflow and the user's requested changes, then output a structured modification plan.
Only change what the user asks. Preserve all other nodes and connections.

When adding or modifying nodes, you MUST provide accurate configuration inside the \`data\` object:
- HTTP_REQUEST: { "endpoint": "https://api.example.com", "method": "GET", "variableName": "httpData", "contentType": "json" }
- GMAIL: { "operation": "SEND_EMAIL", "variableName": "gmailResult", "toEmail": "user@example.com", "subject": "Update", "body": "Hello" }
- IF_ELSE: { "field": "httpData.status", "operator": "EQUALS", "value": "success" }
ALWAYS provide a \`variableName\` for action nodes so their output can be referenced.`;

const DEBUG_SYSTEM = `You are Nodebase AI. Analyse the provided workflow for issues, missing credentials,
potential failures, and improvement opportunities. Be specific and actionable in your suggestions.`;

export async function refineWorkflow(params: {
  currentWorkflow: GeneratedWorkflow;
  userRequest:     string;
  userId:          string;
  conversationId:  string;
  generationId:    string;
  preferredProvider?: AgentAIProviderType;
}) {
  const { model, provider } = await aiProviderGateway.getModel(params.preferredProvider);

  const prompt = `Current workflow:
${JSON.stringify(params.currentWorkflow, null, 2)}

User's requested change:
${params.userRequest}`;

  const { object, usage } = await generateObject({
    model,
    schema: WorkflowRefinementLLMSchema,
    system: REFINE_SYSTEM,
    prompt,
    experimental_telemetry: { isEnabled: true, functionId: "nodebase-ai-refine" },
  });

  // Transform data KV arrays back to Record<string, unknown>
  const finalRefinement: WorkflowRefinement = {
    ...object,
    nodesToAdd: object.nodesToAdd?.map(node => ({
      ...node,
      data: node.data.reduce((acc, { key, value }) => {
        try { acc[key] = JSON.parse(value); } catch { acc[key] = value; }
        return acc;
      }, {} as Record<string, unknown>)
    })),
    nodesToModify: object.nodesToModify?.map(node => ({
      ...node,
      data: node.data.reduce((acc, { key, value }) => {
        try { acc[key] = JSON.parse(value); } catch { acc[key] = value; }
        return acc;
      }, {} as Record<string, unknown>)
    }))
  };

  // Persist refinement generation record
  await prisma.agentGeneration.create({
    data: {
      conversationId:  params.conversationId,
      userId:          params.userId,
      prompt:          params.userRequest,
      status:          "COMPLETED",
      refinedFromId:   params.generationId,
      provider:        provider as any,
      model:           PROVIDER_CONFIGS[provider].defaultModel,
      inputTokens:     usage.inputTokens,
      outputTokens:    usage.outputTokens,
      guardrailPassed: true,
    },
  });

  return { refinement: finalRefinement, provider, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens };
}

export async function debugWorkflow(params: {
  workflow:        GeneratedWorkflow;
  userId:          string;
  conversationId:  string;
  preferredProvider?: AgentAIProviderType;
}) {
  const { model, provider } = await aiProviderGateway.getModel(params.preferredProvider);

  const { object, usage } = await generateObject({
    model,
    schema: WorkflowDebugLLMSchema,
    system: DEBUG_SYSTEM,
    prompt: `Analyse this workflow:\n${JSON.stringify(params.workflow, null, 2)}`,
    experimental_telemetry: { isEnabled: true, functionId: "nodebase-ai-debug" },
  });

  return { debug: object, provider, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens };
}
