/**
 * Conversation Service
 *
 * Manages multi-turn AI agent conversations including message storage,
 * context retrieval, title generation, and lifecycle management.
 */

import prisma from "@/lib/db";
import type { AgentAIProvider } from "@/generated/prisma";
import {
  MAX_MESSAGES_PER_CONVERSATION,
  MAX_CONTEXT_MESSAGES,
  MAX_TITLE_LENGTH,
} from "../config/constants";

export interface CreateConversationParams {
  userId: string;
  title?: string;
}

export interface AddMessageParams {
  conversationId: string;
  role:           "USER" | "ASSISTANT" | "SYSTEM";
  content:        string;
  provider?:      AgentAIProvider;
  model?:         string;
  inputTokens?:   number;
  outputTokens?:  number;
  latencyMs?:     number;
}

export class ConversationService {

  async create(params: CreateConversationParams) {
    return prisma.agentConversation.create({
      data: {
        userId:       params.userId,
        title:        params.title,
        messageCount: 0,
      },
    });
  }

  /**
   * Returns the most recent active conversation for the user,
   * or creates a new one if none exists or all are full / completed.
   */
  async getOrCreateActive(userId: string) {
    const recent = await prisma.agentConversation.findFirst({
      where: {
        userId,
        messageCount:    { lt: MAX_MESSAGES_PER_CONVERSATION },
        workflowCreated: false,
      },
      orderBy: { updatedAt: "desc" },
    });

    return recent ?? this.create({ userId });
  }

  /**
   * Returns or creates a conversation tied to a specific workflowId.
   */
  async getOrCreateActiveForWorkflow(userId: string, workflowId: string) {
    const existing = await prisma.agentConversation.findFirst({
      where: { userId, workflowId },
      orderBy: { updatedAt: "desc" },
    });

    if (existing) return existing;

    return prisma.agentConversation.create({
      data: {
        userId,
        workflowId,
        messageCount: 0,
      },
    });
  }

  /**
   * Adds a message to a conversation and increments the message counter
   * atomically via a Prisma transaction.
   */
  async addMessage(params: AddMessageParams) {
    const [message] = await prisma.$transaction([
      prisma.agentMessage.create({
        data: {
          conversationId: params.conversationId,
          role:           params.role as any, // AgentMessageRole enum
          content:        params.content,
          provider:       params.provider,
          model:          params.model,
          inputTokens:    params.inputTokens,
          outputTokens:   params.outputTokens,
          latencyMs:      params.latencyMs,
        },
      }),
      prisma.agentConversation.update({
        where: { id: params.conversationId },
        data:  {
          messageCount: { increment: 1 },
          updatedAt:    new Date(),
        },
      }),
    ]);

    return message;
  }

  /** Fetch recent messages for LLM context, oldest first. */
  async getHistory(conversationId: string, limit = MAX_CONTEXT_MESSAGES) {
    return prisma.agentMessage.findMany({
      where:   { conversationId },
      orderBy: { createdAt: "asc" },
      take:    limit,
    });
  }

  /**
   * Returns the conversation history formatted for direct use as
   * Vercel AI SDK messages array.
   */
  async getConversationContext(conversationId: string) {
    const messages = await this.getHistory(conversationId);
    return messages.map((m) => ({
      role:    m.role.toLowerCase() as "user" | "assistant" | "system",
      content: m.content,
    }));
  }

  /** Auto-generate a short title from the first user message. */
  async generateTitle(conversationId: string, firstMessage: string) {
    const title = firstMessage.length > MAX_TITLE_LENGTH
      ? `${firstMessage.slice(0, MAX_TITLE_LENGTH)}…`
      : firstMessage;

    await prisma.agentConversation.update({
      where: { id: conversationId },
      data:  { title },
    });

    return title;
  }

  /** Mark conversation as having produced a workflow. */
  async markWorkflowCreated(conversationId: string) {
    await prisma.agentConversation.update({
      where: { id: conversationId },
      data:  { workflowCreated: true },
    });
  }

  /** List user's conversations ordered by most recently updated. */
  async getUserConversations(userId: string, limit = 20) {
    return prisma.agentConversation.findMany({
      where:   { userId },
      orderBy: { updatedAt: "desc" },
      take:    limit,
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take:    1,
          select:  { content: true, role: true, createdAt: true },
        },
        _count: { select: { generations: true } },
      },
    });
  }

  /** Get a single conversation with all its messages. */
  async getConversation(conversationId: string, userId: string) {
    return prisma.agentConversation.findFirst({
      where:   { id: conversationId, userId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
        generations: {
          orderBy: { createdAt: "desc" },
          take:    5,
          select:  {
            id:     true,
            status: true,
            prompt: true,
            provider: true,
            inputTokens:  true,
            outputTokens: true,
            latencyMs:    true,
            createdAt:    true,
          },
        },
      },
    });
  }

  /** Delete a conversation — verifies ownership before deleting. */
  async deleteConversation(conversationId: string, userId: string) {
    const conversation = await prisma.agentConversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      throw new Error("Conversation not found or you don't have permission to delete it.");
    }

    await prisma.agentConversation.delete({ where: { id: conversationId } });
  }
}

export const conversationService = new ConversationService();
