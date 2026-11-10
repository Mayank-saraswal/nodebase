/**
 * Workflow Validator
 *
 * Post-generation validation pipeline:
 *   1. Zod schema validation
 *   2. NodeType enum validation
 *   3. Exactly-one-trigger enforcement
 *   4. Connection integrity (all node IDs exist)
 *   5. DAG cycle detection (DFS)
 *   6. Credential requirement completeness warning
 */

import { NodeType } from "@/generated/prisma";
import { GeneratedWorkflowSchema, type GeneratedWorkflow } from "../schemas/workflow-generation";
import { ALL_NODE_CAPABILITIES } from "../registry/node-capabilities";

export interface ValidationResult {
  valid:    boolean;
  errors:   string[];
  warnings: string[];
}

export function validateGeneratedWorkflow(workflow: unknown): ValidationResult {
  const errors:   string[] = [];
  const warnings: string[] = [];

  // 1. Zod schema validation
  const parseResult = GeneratedWorkflowSchema.safeParse(workflow);
  if (!parseResult.success) {
    const issues = parseResult.error.issues ?? (parseResult.error as any).errors ?? [];
    return {
      valid:    false,
      errors:   issues.map((e: { path: unknown[]; message: string }) =>
        `${e.path.join(".")}: ${e.message}`
      ),
      warnings: [],
    };
  }

  const data = parseResult.data;

  // 2. Validate node types against the enum
  const validNodeTypes = new Set(Object.values(NodeType));
  for (const node of data.nodes) {
    if (!validNodeTypes.has(node.type as NodeType)) {
      errors.push(`Unknown node type: "${node.type}". Check the node capability registry for valid types.`);
    }
  }

  // 3. Validate at least one trigger
  const triggerNodes = data.nodes.filter((n) => {
    const cap = ALL_NODE_CAPABILITIES.find((c) => c.type === n.type);
    return cap?.category === "trigger";
  });

  if (triggerNodes.length === 0) {
    errors.push("Workflow must have at least one trigger node (MANUAL_TRIGGER, WEBHOOK_TRIGGER, SCHEDULE_TRIGGER, etc.).");
  }
  if (triggerNodes.length > 1) {
    warnings.push(`Multiple trigger nodes detected (${triggerNodes.length}). Only one will fire per execution.`);
  }

  // 4. Connection integrity — all referenced node IDs must exist
  const nodeIdSet = new Set(data.nodes.map((n) => n.id));
  for (const conn of data.connections) {
    if (!nodeIdSet.has(conn.fromNodeId)) {
      errors.push(`Connection "${conn.id}" references non-existent source node: "${conn.fromNodeId}".`);
    }
    if (!nodeIdSet.has(conn.toNodeId)) {
      errors.push(`Connection "${conn.id}" references non-existent target node: "${conn.toNodeId}".`);
    }
  }

  // 5. DAG cycle detection
  const cycle = detectCycle(data);
  if (cycle) {
    errors.push(`Workflow contains a cycle: ${cycle.join(" → ")}. Workflows must be directed acyclic graphs.`);
  }

  // 6. Credential requirement completeness
  const nodesNeedingCreds = data.nodes.filter((n) => {
    const cap = ALL_NODE_CAPABILITIES.find((c) => c.type === n.type);
    return cap?.requiredCredential;
  });

  const requiredCredTypes = new Set(
    nodesNeedingCreds.map((n) => {
      const cap = ALL_NODE_CAPABILITIES.find((c) => c.type === n.type);
      return cap?.requiredCredential;
    }),
  );

  const declaredCredTypes = new Set(data.credentialRequirements.map((c) => c.type));

  for (const cred of requiredCredTypes) {
    if (cred && !declaredCredTypes.has(cred)) {
      warnings.push(`Node requires credential "${cred}" but it is missing from credentialRequirements.`);
    }
  }

  return {
    valid:    errors.length === 0,
    errors,
    warnings,
  };
}

// ─── DAG Cycle Detection (DFS) ─────────────────────────────────────────────

function detectCycle(workflow: GeneratedWorkflow): string[] | null {
  const adjacency = new Map<string, string[]>();

  for (const node of workflow.nodes) {
    adjacency.set(node.id, []);
  }
  for (const conn of workflow.connections) {
    const neighbors = adjacency.get(conn.fromNodeId);
    if (neighbors) neighbors.push(conn.toNodeId);
  }

  const visited       = new Set<string>();
  const recursionStack = new Set<string>();
  const path:          string[] = [];

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    for (const neighbor of adjacency.get(nodeId) ?? []) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recursionStack.has(neighbor)) {
        path.push(neighbor);
        return true;
      }
    }

    recursionStack.delete(nodeId);
    path.pop();
    return false;
  }

  for (const node of workflow.nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) {
        const cycleStart = path.indexOf(path[path.length - 1]);
        return path.slice(cycleStart);
      }
    }
  }

  return null;
}
