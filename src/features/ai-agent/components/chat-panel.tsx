"use client";

/**
 * ChatPanel — Main AI Agent chat interface.
 *
 * This is a stub component. Full implementation comes in Phase 2.
 * The component is exported and wired to the tRPC aiAgent router.
 */

import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { MessageBubble } from "./message-bubble";
import { ProviderSelector } from "./provider-selector";
import { ConversationList } from "./conversation-list";
import { AgentAIProviderType } from "../config/providers";

interface Message {
  id:        string;
  role:      "user" | "assistant";
  content:   string;
  createdAt: Date;
}

import { GeneratedWorkflow } from "../schemas/workflow-generation";

interface ChatPanelProps {
  workflowId?: string;
  currentNodes?: any[];
  currentEdges?: any[];
  onWorkflowGenerated?: (workflow: GeneratedWorkflow, generationId: string) => void;
  className?: string;
}

export function ChatPanel({ workflowId, currentNodes, currentEdges, onWorkflowGenerated, className }: ChatPanelProps) {
  const trpc = useTRPC();
  const [messages, setMessages]           = useState<Message[]>([]);
  const [input, setInput]                 = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [provider, setProvider]           = useState<AgentAIProviderType>(AgentAIProviderType.OPENAI);
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const messagesEndRef                    = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const [isGenerating, setIsGenerating] = useState(false);

  const generateAsyncMutation = useMutation(
    trpc.aiAgent.generateAsync.mutationOptions({
      onSuccess(data) {
        setConversationId(data.conversationId);
        setIsGenerating(true);
      },
      onError(err) {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: `Error: ${err.message}`, createdAt: new Date() },
        ]);
        setIsGenerating(false);
      },
    }),
  );

  const { data: conversationData } = useQuery({
    ...trpc.aiAgent.getConversation.queryOptions({ conversationId: conversationId ?? "" }),
    enabled: isGenerating && !!conversationId,
    refetchInterval: 2000, // Poll every 2 seconds while generating
  });

  // Watch for the async background job to complete
  useEffect(() => {
    if (isGenerating && conversationData) {
      const lastMessage = conversationData.messages[conversationData.messages.length - 1];
      if (lastMessage?.role === "ASSISTANT") {
        setIsGenerating(false);
        // Sync local state
        setMessages(
          conversationData.messages.map((m: any) => ({
            id: m.id,
            role: m.role.toLowerCase() as "user" | "assistant",
            content: m.content,
            createdAt: m.createdAt,
          }))
        );

        try {
          const content = JSON.parse(lastMessage.content);
          if (content.type === "workflow" && content.workflow) {
            onWorkflowGenerated?.(content.workflow, conversationData.id);
          }
        } catch {
          // not json
        }
      }
    }
  }, [conversationData, isGenerating, onWorkflowGenerated]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || generateAsyncMutation.isPending || isGenerating) return;

    const userMessage: Message = {
      id:        crypto.randomUUID(),
      role:      "user",
      content:   trimmed,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    generateAsyncMutation.mutate({
      prompt: trimmed,
      conversationId: conversationId,
      workflowId: workflowId,
      preferredProvider: provider,
      currentNodes: currentNodes,
      currentEdges: currentEdges,
    });
  }

  return (
    <div className={`flex h-full ${className ?? ""}`}>
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-72 border-r border-border flex-shrink-0">
          <ConversationList
            activeConversationId={conversationId}
            onSelect={(id) => setConversationId(id)}
          />
        </div>
      )}

      {/* Main chat */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {sidebarOpen ? "← Hide history" : "☰ History"}
          </button>

          <span className="font-semibold text-sm">Nodebase AI</span>

          <ProviderSelector value={provider} onChange={setProvider} />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4 text-muted-foreground">
              <div className="text-4xl">✨</div>
              <p className="text-lg font-medium">Describe a workflow to get started</p>
              <p className="text-sm max-w-sm">
                Try: &ldquo;When a Razorpay payment is captured, send a WhatsApp confirmation to the customer&rdquo;
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {(generateAsyncMutation.isPending || isGenerating) && (
            <div className="flex gap-2 items-center text-muted-foreground text-sm p-4">
              <div className="flex gap-1">
                <span className="animate-bounce">●</span>
                <span className="animate-bounce" style={{ animationDelay: "150ms" }}>●</span>
                <span className="animate-bounce" style={{ animationDelay: "300ms" }}>●</span>
              </div>
              Generating workflow...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="p-4 border-t border-border flex gap-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e as any); }
            }}
            placeholder="Describe the workflow you want to build…"
            rows={2}
            disabled={generateAsyncMutation.isPending || isGenerating}
            className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || generateAsyncMutation.isPending || isGenerating}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            Generate
          </button>
        </form>
      </div>
    </div>
  );
}
