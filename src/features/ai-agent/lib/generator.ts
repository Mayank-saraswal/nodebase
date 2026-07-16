/**
 * Main Workflow Generator
 *
 * The core pipeline that converts a natural language prompt into a
 * production-ready workflow definition:
 *
 *   1. Run guardrails on input
 *   2. Get AI provider (with automatic fallback)
 *   3. Inject user's existing credentials as context
 *   4. Generate structured workflow via generateObject()
 *   5. Validate output (DAG, node types, credential completeness)
 *   6. Persist generation record to the database
 *   7. Mark credential requirements as configured/unconfigured
 *   8. Record usage
 */

import "server-only";

import { generateObject } from "ai";
import prisma from "@/lib/db";
import { AgentAIProviderType, PROVIDER_CONFIGS } from "../config/providers";
import { GeneratedWorkflowSchema, AgentResponseLLMSchema, type GeneratedWorkflow } from "../schemas/workflow-generation";
import { validateGeneratedWorkflow } from "./workflow-validator";
import { GuardrailsEngine, type GuardrailResult } from "./guardrails";
import { aiProviderGateway } from "./provider-gateway";
import { rateLimiter } from "./rate-limiter";
import { getRegistryForPrompt } from "../registry/node-capabilities";

// ─── System Prompt ─────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `You are Nodebase AI, an expert workflow automation assistant optimised for the Indian market.

You help users create workflows by understanding their business requirements and generating valid JSON configurations.

## AVAILABLE NODES

${getRegistryForPrompt()}

## RULES

1. **Triggers**: Every workflow MUST have exactly ONE trigger node (RAZORPAY_TRIGGER, WHATSAPP_TRIGGER, SCHEDULE_TRIGGER, WEBHOOK_TRIGGER, GITHUB_TRIGGER, CASHFREE_TRIGGER, ERROR_TRIGGER, or MANUAL_TRIGGER).

2. **Connections**: Nodes must be connected in a valid DAG (directed acyclic graph). Data flows trigger → action nodes. Never create cycles.

3. **Template Variables**: Use \`{{nodeName.field}}\` to reference data from previous nodes:
   - \`{{razorpayTrigger.payload.payment.entity.email}}\` — customer email
   - \`{{whatsappTrigger.message.text.body}}\` — WhatsApp message text
   - \`{{openai.text}}\` — AI-generated text

4. **Node IDs**: Use simple sequential IDs: "node-1", "node-2", "node-3". Connection IDs: "conn-1", "conn-2".

5. **Credentials**: Add every required credential to the credentialRequirements array. Never expose credential values.

6. **Canvas Layout**: Trigger at x=250, y=100. Each subsequent node: y += 150.

7. **India First**: Prefer Razorpay over Stripe, WhatsApp over Telegram for business messaging, Zoho CRM, MSG91, Shiprocket.

8. **Common Patterns**:
   - Payment → CRM → WhatsApp/Email notification
   - WhatsApp trigger → OpenAI reply → WhatsApp send
   - Schedule → HTTP Request → Google Sheets → Slack alert

9. **Missing Information & Clarification**: If the user's prompt is missing ANY critical configuration parameters (such as a target URL, an email address, a schedule interval, a channel name, a specific search query, etc.), YOU MUST NOT GUESS OR LEAVE IT UNCONFIGURED. You MUST return status: "needs_clarification" and ask the user for the exact missing parameter.

10. **Node Configuration (data payload)**:
   You MUST provide accurate configuration inside the \`data\` object for each node so they work out-of-the-box. ALWAYS provide a \`variableName\` for action nodes so their output can be referenced.
   - HTTP_REQUEST: { "endpoint": "https://api.example.com", "method": "GET", "variableName": "httpData", "contentType": "json" }
   - GMAIL: { "operation": "SEND_EMAIL", "variableName": "gmailResult", "toEmail": "user@example.com", "subject": "Update", "body": "Hello" }
   - OPENAI: { "operation": "CHAT", "variableName": "openaiResult", "systemPrompt": "Be helpful", "userMessage": "Summarize this: {{httpData.data}}" }
   - SLACK: { "operation": "SEND_MESSAGE", "variableName": "slack", "channel": "#general", "text": "Hello" }
   - IF_ELSE: { "field": "httpData.status", "operator": "EQUALS", "value": "success" }

Always include reasoning to help users understand your choices.`;
}

// ─── Types ─────────────────────────────────────────────────────────────────

export interface GenerationParams {
  prompt:            string;
  userId:            string;
  conversationId:    string;
  preferredProvider?: AgentAIProviderType;
  userTier?:         "free" | "starter" | "pro" | "enterprise";
  currentNodes?:     any[];
  currentEdges?:     any[];
}

export interface GenerationResult {
  success:        boolean;
  workflow?:      GeneratedWorkflow;
  needsClarification?: boolean;
  clarification?: string;
  generationId:   string;
  provider:       AgentAIProviderType;
  inputTokens:    number;
  outputTokens:   number;
  latencyMs:      number;
  guardrailResult: GuardrailResult;
  warnings?:      string[];
  error?:         string;
}

// ─── Generator ─────────────────────────────────────────────────────────────

export async function generateWorkflow(params: GenerationParams): Promise<GenerationResult> {
  const startTime    = Date.now();
  let inputTokens    = 0;
  let outputTokens   = 0;
  let usedProvider   = params.preferredProvider ?? AgentAIProviderType.OPENAI;

  // 1. Guardrails
  const guardrails      = new GuardrailsEngine();
  const guardrailResult = await guardrails.validateInput(params.prompt, params.userId);

  if (!guardrailResult.passed) {
    await persistGuardrailLog(params, guardrailResult);
    return {
      success:         false,
      generationId:    "",
      provider:        usedProvider,
      inputTokens:     0,
      outputTokens:    0,
      latencyMs:       Date.now() - startTime,
      guardrailResult,
      error:           guardrailResult.reason,
    };
  }

  // 2. Get AI model (with automatic fallback)
  let modelInfo: Awaited<ReturnType<typeof aiProviderGateway.getModel>>;
  try {
    modelInfo = await aiProviderGateway.getModel(params.preferredProvider);
    usedProvider = modelInfo.provider;
  } catch (err) {
    return {
      success:         false,
      generationId:    "",
      provider:        usedProvider,
      inputTokens:     0,
      outputTokens:    0,
      latencyMs:       Date.now() - startTime,
      guardrailResult,
      error:           "No AI provider available. Please configure OPENAI_API_KEY in your environment.",
    };
  }

  // 3. Fetch user's existing credentials for context injection
  const existingCredentials = await prisma.credential.findMany({
    where:  { userId: params.userId },
    select: { type: true, name: true, id: true },
  });

  const credentialContext = existingCredentials.length > 0
    ? existingCredentials.map((c) => `- ${c.type}: "${c.name}" (ID: ${c.id})`).join("\n")
    : "No credentials configured yet.";

  // Fetch conversation history
  const history = await prisma.agentMessage.findMany({
    where: { conversationId: params.conversationId },
    orderBy: { createdAt: "asc" },
  });

  const messageHistory = history.map((m) => ({
    role: m.role.toLowerCase() as "user" | "assistant" | "system",
    content: m.content,
  }));

  const canvasContext = params.currentNodes && params.currentNodes.length > 0
    ? `\n\n## Current Canvas State\nNodes:\n${JSON.stringify(params.currentNodes, null, 2)}\nEdges:\n${JSON.stringify(params.currentEdges, null, 2)}\n\nIMPORTANT: When modifying or adding to the workflow, YOU MUST include these existing nodes in your response with their EXACT IDs unchanged, unless the user explicitly requested to delete them.`
    : "\n\n## Current Canvas State\nThe canvas is currently empty.";

  const enhancedPrompt = `${params.prompt}

## User's Existing Credentials (already configured — reference these IDs if applicable)
${credentialContext}${canvasContext}`;

  const finalMessages = [
    { role: "system" as const, content: buildSystemPrompt() },
    ...messageHistory,
    { role: "user" as const, content: enhancedPrompt },
  ];

  // 4. Generate structured workflow
  let generationId = "";
  try {
    const { object, usage } = await generateObject({
      model:  modelInfo.model,
      schema: AgentResponseLLMSchema,
      messages: finalMessages,
      experimental_telemetry: { isEnabled: true, functionId: "nodebase-ai-generate" },
    });

    inputTokens  = usage.inputTokens  ?? 0;
    outputTokens = usage.outputTokens ?? 0;

    if (object.status === "needs_clarification") {
      return {
        success:            true,
        needsClarification: true,
        clarification:      object.clarificationQuestion,
        generationId:       "",
        provider:           usedProvider,
        inputTokens,
        outputTokens,
        latencyMs:          Date.now() - startTime,
        guardrailResult,
      };
    }

    if (!object.workflow || object.workflow.length === 0) {
      throw new Error("Missing workflow payload in success response.");
    }

    const generatedWorkflow = object.workflow[0];

    // Transform nodes data from KV array to Record
    const transformedNodes = generatedWorkflow.nodes.map(node => ({
      ...node,
      data: node.data.reduce((acc, { key, value }) => {
        try { acc[key] = JSON.parse(value); } 
        catch { acc[key] = value; }
        return acc;
      }, {} as Record<string, unknown>)
    }));

    const finalObject = { ...generatedWorkflow, nodes: transformedNodes };

    // 5. Validate output
    const validation = validateGeneratedWorkflow(finalObject);
    if (!validation.valid) {
      const gen = await prisma.agentGeneration.create({
        data: {
          conversationId:  params.conversationId,
          userId:          params.userId,
          prompt:          params.prompt,
          status:          "FAILED",
          provider:        usedProvider as any,
          model:           PROVIDER_CONFIGS[usedProvider].defaultModel,
          inputTokens,
          outputTokens,
          latencyMs:       Date.now() - startTime,
          guardrailPassed: true,
          errorMessage:    `Validation failed: ${validation.errors.join("; ")}`,
        },
      });
      return {
        success:         false,
        generationId:    gen.id,
        provider:        usedProvider,
        inputTokens,
        outputTokens,
        latencyMs:       Date.now() - startTime,
        guardrailResult,
        error:           `Generated workflow failed validation: ${validation.errors.join(", ")}`,
      };
    }

    // 6. Persist successful generation record
    const gen = await prisma.agentGeneration.create({
      data: {
        conversationId:          params.conversationId,
        userId:                  params.userId,
        prompt:                  params.prompt,
        status:                  "COMPLETED",
        provider:                usedProvider as any,
        model:                   PROVIDER_CONFIGS[usedProvider].defaultModel,
        inputTokens,
        outputTokens,
        latencyMs:               Date.now() - startTime,
        guardrailPassed:         true,
        generatedNodes:          finalObject.nodes as any,
        generatedConnections:    finalObject.connections as any,
        credentialRequirements:  finalObject.credentialRequirements as any,
      },
    });
    generationId = gen.id;

    // 7. Mark credentials as configured if user already has them
    const existingCredTypeSet = new Set(existingCredentials.map((c) => c.type));
    const enrichedWorkflow: GeneratedWorkflow = {
      ...finalObject,
      credentialRequirements: finalObject.credentialRequirements.map((req) => ({
        ...req,
        isConfigured: existingCredTypeSet.has(req.type as any),
      })),
    };

    // 8. Record usage (non-blocking)
    rateLimiter.recordUsage(
      params.userId,
      usedProvider,
      { input: inputTokens, output: outputTokens },
      true,
    ).catch(console.error);

    return {
      success:         true,
      workflow:        enrichedWorkflow,
      generationId,
      provider:        usedProvider,
      inputTokens,
      outputTokens,
      latencyMs:       Date.now() - startTime,
      guardrailResult,
      warnings:        validation.warnings,
    };

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown generation error";

    // Persist failed record (best-effort)
    try {
      const gen = await prisma.agentGeneration.create({
        data: {
          conversationId:  params.conversationId,
          userId:          params.userId,
          prompt:          params.prompt,
          status:          "FAILED",
          provider:        usedProvider as any,
          model:           PROVIDER_CONFIGS[usedProvider].defaultModel,
          inputTokens,
          outputTokens,
          latencyMs:       Date.now() - startTime,
          guardrailPassed: true,
          errorMessage,
        },
      });
      generationId = gen.id;
    } catch { /* ignore persistence errors */ }

    rateLimiter.recordUsage(
      params.userId,
      usedProvider,
      { input: inputTokens, output: outputTokens },
      false,
    ).catch(console.error);

    return {
      success:         false,
      generationId,
      provider:        usedProvider,
      inputTokens,
      outputTokens,
      latencyMs:       Date.now() - startTime,
      guardrailResult,
      error:           errorMessage,
    };
  }
}

// ─── Helper ────────────────────────────────────────────────────────────────

async function persistGuardrailLog(
  params:          GenerationParams,
  result:          GuardrailResult,
) {
  try {
    await prisma.aIGuardrailLog.create({
      data: {
        userId:         params.userId,
        conversationId: params.conversationId,
        violationType:  result.violationType!,
        severity:       result.severity,
        input:          params.prompt.slice(0, 1000),
        reason:         result.reason ?? "Guardrail violation",
        detectedBy:     result.detectedBy,
        confidence:     result.confidence,
      },
    });
  } catch { /* non-fatal */ }
}
