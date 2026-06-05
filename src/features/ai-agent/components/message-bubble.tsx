"use client";

import type { GeneratedWorkflow } from "../schemas/workflow-generation";

interface RawMessage {
  id:        string;
  role:      "user" | "assistant";
  content:   string;
  createdAt: Date;
}

interface ParsedAssistantContent {
  type:      "workflow" | "refinement" | "debug" | "text";
  workflow?: GeneratedWorkflow;
  warnings?: string[];
  message?:  string;
}

function parseContent(content: string): ParsedAssistantContent {
  try {
    const parsed = JSON.parse(content) as ParsedAssistantContent;
    if (parsed.type) return parsed;
  } catch { /* not JSON */ }
  return { type: "text", message: content };
}

interface MessageBubbleProps {
  message: RawMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2.5 text-sm">
          {message.content}
        </div>
      </div>
    );
  }

  const parsed = parseContent(message.content);

  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] space-y-2">
        {/* AI avatar */}
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
            AI
          </div>
          <span className="text-xs text-muted-foreground">Nodebase AI</span>
        </div>

        <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5 text-sm">
          {parsed.type === "workflow" && parsed.workflow ? (
            <WorkflowPreviewInline workflow={parsed.workflow} warnings={parsed.warnings} />
          ) : parsed.type === "text" || !parsed.type ? (
            <p className="whitespace-pre-wrap">{parsed.message ?? message.content}</p>
          ) : (
            <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(parsed, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

function WorkflowPreviewInline({
  workflow,
  warnings,
}: {
  workflow: GeneratedWorkflow;
  warnings?: string[];
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="font-semibold text-foreground">✅ {workflow.name}</p>
        <p className="text-muted-foreground text-xs mt-0.5">{workflow.description}</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {workflow.nodes.map((node) => (
          <span
            key={node.id}
            className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 text-xs font-medium"
          >
            {node.name}
          </span>
        ))}
      </div>

      {workflow.credentialRequirements.length > 0 && (
        <div className="rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-2">
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">
            🔑 Credentials needed:
          </p>
          <ul className="text-xs text-muted-foreground space-y-0.5">
            {workflow.credentialRequirements.map((cred, i) => (
              <li key={i} className="flex items-center gap-1.5">
                <span>{cred.isConfigured ? "✓" : "○"}</span>
                <span className={cred.isConfigured ? "line-through opacity-50" : ""}>
                  {cred.nodeName} — {cred.purpose}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {warnings && warnings.length > 0 && (
        <div className="text-xs text-amber-600 dark:text-amber-400">
          ⚠️ {warnings.join(" • ")}
        </div>
      )}
    </div>
  );
}
