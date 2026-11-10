"use client";

import { ChatPanel } from "@/features/ai-agent/components/chat-panel";
import type { GeneratedWorkflow } from "@/features/ai-agent/schemas/workflow-generation";

export default function AIAgentPage() {
  function handleWorkflowGenerated(workflow: GeneratedWorkflow, generationId: string) {
    console.log("AI generated a workflow:", workflow);
    // In the future, we can wire this up to navigate to the editor with this workflow payload
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">AI Agent</h1>
        <p className="text-muted-foreground text-sm">
          Describe the workflow you want to build, and the AI will generate it for you.
        </p>
      </div>
      
      <div className="flex-1 bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <ChatPanel 
          onWorkflowGenerated={handleWorkflowGenerated} 
          className="h-full"
        />
      </div>
    </div>
  );
}
