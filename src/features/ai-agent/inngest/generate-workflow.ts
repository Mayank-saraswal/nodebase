/**
 * Inngest Background Function — AI Workflow Generation
 *
 * Handles long-running AI generation jobs asynchronously via Inngest.
 * This is used for:
 *   1. Background workflow generation (when UI wants non-blocking)
 *   2. Retry-safe generation with automatic failure handling
 *   3. Realtime progress updates via Inngest channels
 *
 * The synchronous tRPC endpoint calls generateWorkflow() directly.
 * This Inngest function provides an async alternative for heavier jobs
 * or when the user wants to queue multiple generations.
 */

import { inngest } from "@/inngest/client";
import { generateWorkflow } from "@/features/ai-agent/lib/generator";
import { refineWorkflow, debugWorkflow } from "@/features/ai-agent/lib/refinement";
import { conversationService } from "@/features/ai-agent/lib/conversation";
import { getGuardrailResponse } from "@/features/ai-agent/lib/guardrail-responses";
import { AgentAIProviderType } from "@/features/ai-agent/config/providers";
import type { GeneratedWorkflow } from "@/features/ai-agent/schemas/workflow-generation";

// ─── Event Types ───────────────────────────────────────────────────────────

interface GenerateWorkflowEvent {
  name: "ai-agent/generate.workflow";
  data: {
    prompt: string;
    userId: string;
    conversationId: string;
    preferredProvider?: AgentAIProviderType;
    currentNodes?: any[];
    currentEdges?: any[];
  };
}

interface RefineWorkflowEvent {
  name: "ai-agent/refine.workflow";
  data: {
    userRequest: string;
    userId: string;
    conversationId: string;
    generationId: string;
    currentWorkflow: GeneratedWorkflow;
    preferredProvider?: AgentAIProviderType;
  };
}

interface DebugWorkflowEvent {
  name: "ai-agent/debug.workflow";
  data: {
    userId: string;
    conversationId: string;
    workflow: GeneratedWorkflow;
    preferredProvider?: AgentAIProviderType;
  };
}

// ─── Background Generation ─────────────────────────────────────────────────

export const backgroundGenerateWorkflow = inngest.createFunction(
  {
    id: "ai-agent-generate-workflow",
    retries: 2,
    concurrency: {
      limit: 5,
      key: "event.data.userId",
    },
  },
  { event: "ai-agent/generate.workflow" },
  async ({ event, step }) => {
    const { prompt, userId, conversationId, preferredProvider, currentNodes, currentEdges } =
      event.data as GenerateWorkflowEvent["data"];

    // Step 2: Generate workflow
    const result = await step.run("generate-workflow", async () => {
      return generateWorkflow({
        prompt,
        userId,
        conversationId,
        preferredProvider,
        currentNodes,
        currentEdges,
      });
    });

    // Step 3: Persist assistant response
    await step.run("persist-assistant-response", async () => {
      if (!result.success) {
        const userMessage =
          result.guardrailResult.passed === false
            ? getGuardrailResponse(result.guardrailResult)
            : result.error ?? "Generation failed. Please try again.";

        await conversationService.addMessage({
          conversationId,
          role: "ASSISTANT",
          content: userMessage,
        });
        return;
      }

      if (result.needsClarification && result.clarification) {
        await conversationService.addMessage({
          conversationId,
          role: "ASSISTANT",
          content: result.clarification,
        });
        return;
      }

      // Success payload
      await conversationService.addMessage({
        conversationId,
        role: "ASSISTANT",
        content: JSON.stringify({
          type: "workflow",
          workflow: result.workflow,
          warnings: result.warnings,
        }),
        provider: result.provider as any,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        latencyMs: result.latencyMs,
      });

      await conversationService.markWorkflowCreated(conversationId);
    });

    return {
      success: result.success,
      generationId: result.generationId,
      provider: result.provider,
      latencyMs: result.latencyMs,
    };
  },
);

// ─── Background Refinement ─────────────────────────────────────────────────

export const backgroundRefineWorkflow = inngest.createFunction(
  {
    id: "ai-agent-refine-workflow",
    retries: 1,
    concurrency: {
      limit: 3,
      key: "event.data.userId",
    },
  },
  { event: "ai-agent/refine.workflow" },
  async ({ event, step }) => {
    const {
      userRequest,
      userId,
      conversationId,
      generationId,
      currentWorkflow,
      preferredProvider,
    } = event.data as RefineWorkflowEvent["data"];

    await step.run("persist-user-message", async () => {
      await conversationService.addMessage({
        conversationId,
        role: "USER",
        content: userRequest,
      });
    });

    const result = await step.run("refine-workflow", async () => {
      return refineWorkflow({
        currentWorkflow,
        userRequest,
        userId,
        conversationId,
        generationId,
        preferredProvider,
      });
    });

    await step.run("persist-assistant-response", async () => {
      await conversationService.addMessage({
        conversationId,
        role: "ASSISTANT",
        content: JSON.stringify({
          type: "refinement",
          refinement: result.refinement,
        }),
        provider: result.provider as any,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      });
    });

    return { provider: result.provider };
  },
);

// ─── Background Debug ──────────────────────────────────────────────────────

export const backgroundDebugWorkflow = inngest.createFunction(
  {
    id: "ai-agent-debug-workflow",
    retries: 1,
    concurrency: {
      limit: 3,
      key: "event.data.userId",
    },
  },
  { event: "ai-agent/debug.workflow" },
  async ({ event, step }) => {
    const { userId, conversationId, workflow, preferredProvider } =
      event.data as DebugWorkflowEvent["data"];

    const result = await step.run("debug-workflow", async () => {
      return debugWorkflow({
        workflow,
        userId,
        conversationId,
        preferredProvider,
      });
    });

    await step.run("persist-debug-response", async () => {
      await conversationService.addMessage({
        conversationId,
        role: "ASSISTANT",
        content: JSON.stringify({ type: "debug", debug: result.debug }),
        provider: result.provider as any,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      });
    });

    return { provider: result.provider };
  },
);
