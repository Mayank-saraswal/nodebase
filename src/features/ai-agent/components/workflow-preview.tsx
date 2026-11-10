"use client";

import type { GeneratedWorkflow } from "../schemas/workflow-generation";

interface WorkflowPreviewProps {
  workflow:        GeneratedWorkflow;
  generationId?:  string;
  onApply?:       (workflow: GeneratedWorkflow) => void;
  className?:     string;
}

export function WorkflowPreview({ workflow, onApply, className }: WorkflowPreviewProps) {
  const triggerNodes = workflow.nodes.filter((n) =>
    ["MANUAL_TRIGGER", "WEBHOOK_TRIGGER", "SCHEDULE_TRIGGER", "RAZORPAY_TRIGGER",
     "WHATSAPP_TRIGGER", "GITHUB_TRIGGER", "CASHFREE_TRIGGER", "ERROR_TRIGGER"].includes(n.type),
  );
  const actionNodes = workflow.nodes.filter((n) => !triggerNodes.includes(n));

  return (
    <div className={`rounded-xl border border-border bg-card p-5 space-y-4 ${className ?? ""}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-foreground">{workflow.name}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{workflow.description}</p>
        </div>
        {onApply && (
          <button
            type="button"
            onClick={() => onApply(workflow)}
            className="flex-shrink-0 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Apply to Canvas
          </button>
        )}
      </div>

      {/* Node flow diagram */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Workflow</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {workflow.nodes.map((node, idx) => (
            <div key={node.id} className="flex items-center gap-1.5">
              <div className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium">
                {node.name}
              </div>
              {idx < workflow.nodes.length - 1 && (
                <span className="text-muted-foreground text-xs">→</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Credentials */}
      {workflow.credentialRequirements.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Required Credentials
          </p>
          <div className="space-y-1.5">
            {workflow.credentialRequirements.map((cred, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs ${
                  cred.isConfigured
                    ? "bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400"
                    : "bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400"
                }`}
              >
                <span>{cred.isConfigured ? "✓" : "○"}</span>
                <span className="font-medium">{cred.type}</span>
                <span className="text-muted-foreground">— {cred.purpose}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Template variables */}
      {workflow.suggestedVariables.length > 0 && (
        <details className="group">
          <summary className="text-xs font-medium text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground transition-colors">
            Template Variables ({workflow.suggestedVariables.length})
          </summary>
          <div className="mt-2 space-y-1.5">
            {workflow.suggestedVariables.map((v, i) => (
              <div key={i} className="text-xs">
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">
                  {"{{" + v.name + "}}"}
                </code>
                <span className="text-muted-foreground ml-2">{v.description}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
