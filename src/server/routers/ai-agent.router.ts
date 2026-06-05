/**
 * AI Agent tRPC Router
 *
 * Endpoints:
 *   generate          — Generate a workflow from natural language
 *   refine            — Refine an existing generated workflow
 *   debug             — Analyse a workflow for issues
 *   getConversations  — List user's AI conversations
 *   getConversation   — Get a conversation with messages
 *   deleteConversation — Delete a conversation
 *   getUsageStats     — Token usage stats (daily + monthly)
 *   getPreferences    — User's AI preferences
 *   updatePreferences — Update preferred provider / limits / flags
 *   getTemplates      — List pre-built workflow templates
 */

import { z }           from "zod";
import { TRPCError }   from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { generateWorkflow }    from "@/features/ai-agent/lib/generator";
import { refineWorkflow, debugWorkflow } from "@/features/ai-agent/lib/refinement";
import { conversationService } from "@/features/ai-agent/lib/conversation";
import { rateLimiter }         from "@/features/ai-agent/lib/rate-limiter";
import { getGuardrailResponse } from "@/features/ai-agent/lib/guardrail-responses";
import { AgentAIProviderType } from "@/features/ai-agent/config/providers";
import { WORKFLOW_TEMPLATES, getIndiaTemplates, getTemplatesByCategory } from "@/features/ai-agent/registry/templates";
import { GeneratedWorkflowSchema } from "@/features/ai-agent/schemas/workflow-generation";
import prisma from "@/lib/db";
import { inngest } from "@/inngest/client";

const ProviderSchema = z.nativeEnum(AgentAIProviderType);

export const aiAgentRouter = createTRPCRouter({

  // ─── Generate ─────────────────────────────────────────────────────────────

  generateAsync: protectedProcedure
    .input(z.object({
      prompt:            z.string().min(1).max(4000),
      conversationId:    z.string().optional(),
      workflowId:        z.string().optional(),
      preferredProvider: ProviderSchema.optional(),
      currentNodes:      z.array(z.any()).optional(),
      currentEdges:      z.array(z.any()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.auth.user.id;

      // Get or create conversation
      let conversationId = input.conversationId;
      
      if (conversationId) {
        const exists = await prisma.agentConversation.findUnique({ where: { id: conversationId } });
        if (!exists) {
          conversationId = undefined; // Force recreation
        }
      }

      if (!conversationId) {
        if (input.workflowId) {
          const conversation = await conversationService.getOrCreateActiveForWorkflow(userId, input.workflowId);
          conversationId = conversation.id;
        } else {
          const conversation = await conversationService.getOrCreateActive(userId);
          conversationId = conversation.id;
        }
      }

      // Persist user message
      await conversationService.addMessage({
        conversationId,
        role:    "USER",
        content: input.prompt,
      });

      // Auto-generate conversation title from first prompt
      const conv = await prisma.agentConversation.findUnique({
        where:  { id: conversationId },
        select: { messageCount: true, title: true },
      });
      if (conv && conv.messageCount <= 1 && !conv.title) {
        await conversationService.generateTitle(conversationId, input.prompt);
      }

      // Dispatch to Inngest
      await inngest.send({
        name: "ai-agent/generate.workflow",
        data: {
          prompt: input.prompt,
          userId,
          conversationId,
          preferredProvider: input.preferredProvider,
          currentNodes: input.currentNodes,
          currentEdges: input.currentEdges,
        },
      });

      return {
        success: true,
        queued: true,
        conversationId,
      };
    }),

  generate: protectedProcedure
    .input(z.object({
      prompt:            z.string().min(1).max(4000),
      conversationId:    z.string().optional(),
      workflowId:        z.string().optional(),
      preferredProvider: ProviderSchema.optional(),
      currentNodes:      z.array(z.any()).optional(),
      currentEdges:      z.array(z.any()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.auth.user.id;

      // Get or create conversation
      let conversationId = input.conversationId;
      
      if (conversationId) {
        const exists = await prisma.agentConversation.findUnique({ where: { id: conversationId } });
        if (!exists) {
          conversationId = undefined; // Force recreation
        }
      }

      if (!conversationId) {
        if (input.workflowId) {
          const conversation = await conversationService.getOrCreateActiveForWorkflow(userId, input.workflowId);
          conversationId = conversation.id;
        } else {
          const conversation = await conversationService.getOrCreateActive(userId);
          conversationId = conversation.id;
        }
      }

      // Persist user message
      await conversationService.addMessage({
        conversationId,
        role:    "USER",
        content: input.prompt,
      });

      // Auto-generate conversation title from first prompt
      const conv = await prisma.agentConversation.findUnique({
        where:  { id: conversationId },
        select: { messageCount: true, title: true },
      });
      if (conv && conv.messageCount <= 1 && !conv.title) {
        await conversationService.generateTitle(conversationId, input.prompt);
      }

      // Run the generation pipeline
      const result = await generateWorkflow({
        prompt:            input.prompt,
        userId,
        conversationId,
        preferredProvider: input.preferredProvider,
      });

      if (!result.success) {
        const userMessage = result.guardrailResult.passed === false
          ? getGuardrailResponse(result.guardrailResult)
          : result.error ?? "Generation failed. Please try again.";

        // Persist assistant error response
        await conversationService.addMessage({
          conversationId,
          role:    "ASSISTANT",
          content: userMessage,
        });

        return {
          success:        false,
          conversationId,
          message:        userMessage,
          generationId:   result.generationId,
          provider:       result.provider,
        };
      }

      // Persist successful assistant response
      const assistantContent = JSON.stringify({
        type:     "workflow",
        workflow: result.workflow,
        warnings: result.warnings,
      });
      await conversationService.addMessage({
        conversationId,
        role:         "ASSISTANT",
        content:      assistantContent,
        provider:     result.provider as any,
        inputTokens:  result.inputTokens,
        outputTokens: result.outputTokens,
        latencyMs:    result.latencyMs,
      });

      await conversationService.markWorkflowCreated(conversationId);

      return {
        success:        true,
        conversationId,
        generationId:   result.generationId,
        workflow:       result.workflow,
        provider:       result.provider,
        inputTokens:    result.inputTokens,
        outputTokens:   result.outputTokens,
        latencyMs:      result.latencyMs,
        warnings:       result.warnings ?? [],
      };
    }),

  // ─── Refine ───────────────────────────────────────────────────────────────

  refine: protectedProcedure
    .input(z.object({
      conversationId:    z.string(),
      generationId:      z.string(),
      currentWorkflow:   GeneratedWorkflowSchema,
      userRequest:       z.string().min(5).max(4000),
      preferredProvider: ProviderSchema.optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.auth.user.id;

      // Verify conversation ownership
      const conv = await prisma.agentConversation.findFirst({
        where: { id: input.conversationId, userId },
      });
      if (!conv) throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found." });

      await conversationService.addMessage({
        conversationId: input.conversationId,
        role:           "USER",
        content:        input.userRequest,
      });

      const result = await refineWorkflow({
        currentWorkflow:   input.currentWorkflow,
        userRequest:       input.userRequest,
        userId,
        conversationId:    input.conversationId,
        generationId:      input.generationId,
        preferredProvider: input.preferredProvider,
      });

      await conversationService.addMessage({
        conversationId: input.conversationId,
        role:           "ASSISTANT",
        content:        JSON.stringify({ type: "refinement", refinement: result.refinement }),
        provider:       result.provider as any,
        inputTokens:    result.inputTokens,
        outputTokens:   result.outputTokens,
      });

      return result;
    }),

  // ─── Debug ────────────────────────────────────────────────────────────────

  debug: protectedProcedure
    .input(z.object({
      conversationId:    z.string(),
      workflow:          GeneratedWorkflowSchema,
      preferredProvider: ProviderSchema.optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.auth.user.id;

      const conv = await prisma.agentConversation.findFirst({
        where: { id: input.conversationId, userId },
      });
      if (!conv) throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found." });

      const result = await debugWorkflow({
        workflow:          input.workflow,
        userId,
        conversationId:    input.conversationId,
        preferredProvider: input.preferredProvider,
      });

      await conversationService.addMessage({
        conversationId: input.conversationId,
        role:           "ASSISTANT",
        content:        JSON.stringify({ type: "debug", debug: result.debug }),
        provider:       result.provider as any,
        inputTokens:    result.inputTokens,
        outputTokens:   result.outputTokens,
      });

      return result;
    }),

  // ─── Conversation Management ──────────────────────────────────────────────

  getConversations: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }).optional())
    .query(async ({ ctx, input }) => {
      return conversationService.getUserConversations(ctx.auth.user.id, input?.limit);
    }),

  getConversation: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ input, ctx }) => {
      const conversation = await conversationService.getConversation(
        input.conversationId,
        ctx.auth.user.id,
      );
      if (!conversation) throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found." });
      return conversation;
    }),

  deleteConversation: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await conversationService.deleteConversation(input.conversationId, ctx.auth.user.id);
      return { success: true };
    }),

  // ─── Usage Stats ──────────────────────────────────────────────────────────

  getUsageStats: protectedProcedure
    .query(async ({ ctx }) => {
      return rateLimiter.getUsageStats(ctx.auth.user.id);
    }),

  // ─── Preferences ──────────────────────────────────────────────────────────

  getPreferences: protectedProcedure
    .query(async ({ ctx }) => {
      const prefs = await prisma.aIPreference.findUnique({
        where: { userId: ctx.auth.user.id },
      });
      // Return defaults if not yet configured
      return prefs ?? {
        preferredProvider:     AgentAIProviderType.OPENAI,
        enableMultiTurn:       true,
        enableTemplates:       true,
        enableDebug:           true,
        dailyGenerationLimit:  null,
        monthlyGenerationLimit: null,
      };
    }),

  updatePreferences: protectedProcedure
    .input(z.object({
      preferredProvider:      ProviderSchema.optional(),
      enableMultiTurn:        z.boolean().optional(),
      enableTemplates:        z.boolean().optional(),
      enableDebug:            z.boolean().optional(),
      dailyGenerationLimit:   z.number().min(1).max(10000).nullish(),
      monthlyGenerationLimit: z.number().min(1).max(100000).nullish(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.auth.user.id;
      return prisma.aIPreference.upsert({
        where:  { userId },
        create: { userId, ...input },
        update: input,
      });
    }),

  // ─── Templates ────────────────────────────────────────────────────────────

  getTemplates: protectedProcedure
    .input(z.object({
      category:       z.string().optional(),
      indiaOnly:      z.boolean().optional(),
    }).optional())
    .query(async ({ input }) => {
      if (input?.indiaOnly) return getIndiaTemplates();
      if (input?.category)  return getTemplatesByCategory(input.category);
      return WORKFLOW_TEMPLATES;
    }),

  // ─── Missing Credentials Check ────────────────────────────────────────────

  getMissingCredentials: protectedProcedure
    .input(z.object({
      requiredCredentialTypes: z.array(z.string()),
    }))
    .query(async ({ input, ctx }) => {
      const userId = ctx.auth.user.id;

      const existingCredentials = await prisma.credential.findMany({
        where:  { userId },
        select: { type: true, name: true, id: true },
      });

      const existingTypes = new Set(existingCredentials.map((c) => c.type));

      return input.requiredCredentialTypes.map((credType) => ({
        type:         credType,
        isConfigured: existingTypes.has(credType as any),
        credential:   existingCredentials.find((c) => c.type === credType) ?? null,
      }));
    }),
});
