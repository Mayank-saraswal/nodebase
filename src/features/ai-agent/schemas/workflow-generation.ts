/**
 * Zod schemas for AI-generated workflow output.
 *
 * These are used with Vercel AI SDK's `generateObject()` to enforce
 * structured output from the LLM. The schemas are intentionally strict
 * to make downstream validation simpler.
 */

import { z } from "zod";
import { CredentialType } from "@/generated/prisma";

// ─── Sub-schemas ───────────────────────────────────────────────────────────

export const PositionSchema = z.object({
  x: z.number().describe("X coordinate on canvas (trigger starts at 250)"),
  y: z.number().describe("Y coordinate on canvas (trigger starts at 100, each subsequent node +150)"),
});

export const WorkflowNodeSchema = z.object({
  id:   z.string().describe("Unique node ID — generate a short unique string like 'node-1', 'node-2'"),
  type: z.string().describe("NodeType enum value e.g. RAZORPAY_TRIGGER, WHATSAPP, OPENAI, IF_ELSE"),
  name: z.string().describe("Human-readable node name displayed on the canvas"),
  position: PositionSchema,
  data: z.record(z.string(), z.unknown()).default({}).describe("Node-specific configuration parameters"),
  credentialId: z.string().optional().describe("Leave empty — credentials are assigned by the user after generation"),
});

export const WorkflowConnectionSchema = z.object({
  id:         z.string().describe("Unique connection ID e.g. 'conn-1'"),
  fromNodeId: z.string().describe("Source node ID (must match a node in the nodes array)"),
  toNodeId:   z.string().describe("Target node ID (must match a node in the nodes array)"),
  fromOutput: z.string().default("main").describe("Output handle — use 'main' unless connecting IF_ELSE branches"),
  toInput:    z.string().default("main").describe("Input handle — always 'main'"),
});

export const CredentialRequirementSchema = z.object({
  type:       z.string().describe("CredentialType enum value e.g. RAZORPAY, WHATSAPP, OPENAI"),
  nodeName:   z.string().describe("Human-readable name of the node that needs this credential"),
  purpose:    z.string().describe("Brief explanation of what the credential does"),
  setupUrl:   z.string().optional().describe("Link to credential setup documentation"),
  isConfigured: z.boolean().optional().describe("Will be filled in server-side — omit this field"),
});

export const SuggestedVariableSchema = z.object({
  name:         z.string().describe("Template variable path e.g. razorpayTrigger.payload.payment.entity.email"),
  description:  z.string().describe("What this variable contains"),
  exampleValue: z.string().describe("Realistic example value"),
});

export const NodeChoiceSchema = z.object({
  node:   z.string().describe("Node type or name"),
  reason: z.string().describe("Why this node was selected for the workflow"),
});

// ─── Main Generation Schema ────────────────────────────────────────────────

export const GeneratedWorkflowSchema = z.object({
  name:        z.string().describe("Short, descriptive workflow name (max 60 chars)"),
  description: z.string().describe("One-sentence description of what this workflow does"),

  nodes:       z.array(WorkflowNodeSchema).min(1).describe("All nodes in the workflow, starting with a trigger"),
  connections: z.array(WorkflowConnectionSchema).describe("Directed connections between nodes — no cycles allowed"),

  credentialRequirements: z.array(CredentialRequirementSchema)
    .describe("All credentials the user needs to configure before this workflow can run"),

  suggestedVariables: z.array(SuggestedVariableSchema)
    .describe("Key template variables available in this workflow for the user's reference"),

  reasoning: z.object({
    triggerChoice:   z.string().describe("Why this trigger was chosen"),
    nodeChoices:     z.array(NodeChoiceSchema).describe("Justification for each node selection"),
    connectionOrder: z.string().describe("Why nodes are connected in this order"),
  }).optional().describe("AI reasoning — helpful for debugging generated workflows"),
});

// ─── Refinement Schema ─────────────────────────────────────────────────────

export const WorkflowRefinementSchema = z.object({
  action: z.enum([
    "ADD_NODES",
    "REMOVE_NODES",
    "MODIFY_NODES",
    "ADD_CONNECTIONS",
    "REMOVE_CONNECTIONS",
    "REORDER",
  ]).describe("Type of modification to apply to the existing workflow"),

  nodesToAdd:    z.array(WorkflowNodeSchema).optional(),
  nodesToRemove: z.array(z.string()).optional().describe("IDs of nodes to remove"),
  nodesToModify: z.array(z.object({
    id:   z.string(),
    name: z.string().optional(),
    data: z.record(z.string(), z.unknown()),
  })).optional(),

  connectionsToAdd:    z.array(WorkflowConnectionSchema).optional(),
  connectionsToRemove: z.array(z.string()).optional().describe("IDs of connections to remove"),

  newCredentialRequirements: z.array(CredentialRequirementSchema).optional(),

  explanation: z.string().describe("Human-readable explanation of the changes made"),
});

export const WorkflowDebugSchema = z.object({
  issues: z.array(z.object({
    severity:   z.enum(["error", "warning", "info"]),
    nodeId:     z.string().optional(),
    message:    z.string(),
    suggestion: z.string(),
  })),

  credentialIssues: z.array(z.object({
    credentialType: z.string(),
    issue:          z.string(),
    fix:            z.string(),
  })),

  suggestions: z.array(z.string()).describe("General improvement suggestions for this workflow"),
});

// ─── LLM Strict Generation Schemas ─────────────────────────────────────────
// To support OpenAI's strict structured outputs (which forbids optional fields and z.record),
// we use strictly required fields and map them back after generation.

export const WorkflowConnectionLLMSchema = z.object({
  id:         z.string().describe("Unique connection ID"),
  fromNodeId: z.string().describe("Source node ID"),
  toNodeId:   z.string().describe("Target node ID"),
  fromOutput: z.string().describe("Output handle — use 'main'"),
  toInput:    z.string().describe("Input handle — always 'main'"),
});

export const CredentialRequirementLLMSchema = z.object({
  type:       z.nativeEnum(CredentialType).describe("CredentialType enum value e.g. RAZORPAY"),
  nodeName:   z.string().describe("Human-readable name of the node"),
  purpose:    z.string().describe("Brief explanation of what the credential does"),
});

export const WorkflowNodeLLMSchema = z.object({
  id:   z.string().describe("Unique node ID"),
  type: z.string().describe("NodeType enum value"),
  name: z.string().describe("Human-readable node name"),
  position: PositionSchema,
  data: z.array(z.object({
    key:   z.string(),
    value: z.string().describe("Value for the key, serialized as a JSON string if it's an object/array"),
  })).describe("Node-specific configuration parameters"),
});

export const GeneratedWorkflowLLMSchema = z.object({
  name:        z.string().describe("Short, descriptive workflow name"),
  description: z.string().describe("One-sentence description"),
  nodes:       z.array(WorkflowNodeLLMSchema).describe("All nodes in the workflow"),
  connections: z.array(WorkflowConnectionLLMSchema).describe("Directed connections between nodes"),
  credentialRequirements: z.array(CredentialRequirementLLMSchema).describe("Credentials needed"),
  suggestedVariables: z.array(SuggestedVariableSchema).describe("Available template variables"),
  reasoning: z.object({
    triggerChoice:   z.string(),
    nodeChoices:     z.array(NodeChoiceSchema),
    connectionOrder: z.string(),
  }).describe("AI reasoning"),
});

export const AgentResponseLLMSchema = z.object({
  status: z.enum(["success", "needs_clarification"]).describe("Return success ONLY if you have ALL required configuration parameters (URLs, emails, intervals, channel names) provided by the user. If ANY parameter is missing, you MUST return needs_clarification and ask for it. DO NOT guess or leave parameters unconfigured."),
  clarificationQuestion: z.string().describe("If needs_clarification is true, the question to ask the user. Leave as empty string if success."),
  workflow: z.array(GeneratedWorkflowLLMSchema).describe("If success is true, an array containing exactly one generated workflow. If needs_clarification is true, return an empty array []."),
});

// ─── Conversational AI Schema ────────────────────────────────────────────────

export type AgentResponse        = z.infer<typeof AgentResponseLLMSchema>;

export const WorkflowRefinementLLMSchema = z.object({
  action: z.enum([
    "ADD_NODES", "REMOVE_NODES", "MODIFY_NODES", 
    "ADD_CONNECTIONS", "REMOVE_CONNECTIONS", "REORDER"
  ]).describe("Type of modification"),
  
  // In strict mode, we can't have optional arrays. We use empty arrays.
  nodesToAdd: z.array(WorkflowNodeLLMSchema).describe("Nodes to add (empty if none)"),
  nodesToRemove: z.array(z.string()).describe("IDs of nodes to remove (empty if none)"),
  nodesToModify: z.array(z.object({
    id:   z.string(),
    name: z.string().describe("New name (or same name)"),
    data: z.array(z.object({
      key:   z.string(),
      value: z.string(),
    })),
  })).describe("Nodes to modify (empty if none)"),
  
  connectionsToAdd: z.array(WorkflowConnectionLLMSchema).describe("Connections to add (empty if none)"),
  connectionsToRemove: z.array(z.string()).describe("IDs of connections to remove (empty if none)"),
  
  newCredentialRequirements: z.array(CredentialRequirementLLMSchema).describe("New credentials needed (empty if none)"),
  
  explanation: z.string().describe("Explanation of the changes"),
});

export const WorkflowDebugLLMSchema = z.object({
  issues: z.array(z.object({
    severity:   z.enum(["error", "warning", "info"]),
    nodeId:     z.string().describe("Node ID or empty string if not node-specific"),
    message:    z.string(),
    suggestion: z.string(),
  })),
  credentialIssues: z.array(z.object({
    credentialType: z.string(),
    issue:          z.string(),
    fix:            z.string(),
  })),
  suggestions: z.array(z.string()),
});

// ─── Type Exports ──────────────────────────────────────────────────────────

export type GeneratedWorkflow    = z.infer<typeof GeneratedWorkflowSchema>;
export type WorkflowRefinement   = z.infer<typeof WorkflowRefinementSchema>;
export type WorkflowDebug        = z.infer<typeof WorkflowDebugSchema>;
export type CredentialRequirement = z.infer<typeof CredentialRequirementSchema>;
export type WorkflowNode         = z.infer<typeof WorkflowNodeSchema>;
export type WorkflowConnection   = z.infer<typeof WorkflowConnectionSchema>;

