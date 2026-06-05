"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { formatDistanceToNow } from "date-fns";

interface ConversationListProps {
  activeConversationId?: string;
  onSelect: (id: string) => void;
}

export function ConversationList({ activeConversationId, onSelect }: ConversationListProps) {
  const trpc  = useTRPC();

  const { data: conversations, isLoading, refetch } = useQuery(
    trpc.aiAgent.getConversations.queryOptions({ limit: 30 }),
  );

  const deleteMutation = useMutation(
    trpc.aiAgent.deleteConversation.mutationOptions({
      onSuccess: () => refetch(),
    }),
  );

  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 rounded-md bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!conversations?.length) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        No conversations yet. Start by generating a workflow!
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border">
        <p className="text-sm font-semibold">Conversation History</p>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {conversations.map((conv) => {
          const lastMessage = conv.messages[0];
          const isActive    = conv.id === activeConversationId;

          return (
            <div
              key={conv.id}
              className={`group flex items-start justify-between gap-2 rounded-md px-3 py-2 cursor-pointer transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted text-foreground"
              }`}
              onClick={() => onSelect(conv.id)}
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">
                  {conv.title ?? "Untitled workflow"}
                </p>
                {lastMessage && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {lastMessage.content.slice(0, 60)}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
                </p>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Delete this conversation?")) {
                    deleteMutation.mutate({ conversationId: conv.id });
                  }
                }}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all text-xs p-0.5 flex-shrink-0"
                aria-label="Delete conversation"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
