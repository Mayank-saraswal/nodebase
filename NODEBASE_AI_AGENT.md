# NODEBASE AI — Intelligent Workflow Generation Agent

## Complete Technical Specification

**Version:** 1.0.0  
**Last Updated:** June 5, 2026  
**Status:** Production-Ready Architecture Design  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Multi-Provider AI Gateway](#3-multi-provider-ai-gateway)
4. [Database Schema Design](#4-database-schema-design)
5. [Node Capability Registry](#5-node-capability-registry)
6. [Structured Output Schema](#6-structured-output-schema)
7. [AI Agent Executor System](#7-ai-agent-executor-system)
8. [Guardrails & Safety System](#8-guardrails--safety-system)
9. [Conversation Management](#9-conversation-management)
10. [Rate Limiting & Quota System](#10-rate-limiting--quota-system)
11. [Implementation Roadmap](#11-implementation-roadmap)

---

## 1. Executive Summary

### What is Nodebase AI?

Nodebase AI is an industry-grade, multi-provider AI agent that transforms natural language descriptions into production-ready workflows. It understands user intent, selects appropriate nodes, generates valid connections, and guides users through credential setup.

### Key Capabilities

- **Natural Language → Workflow**: Users describe what they want, AI generates complete workflows
- **Multi-Provider Support**: OpenAI, Claude, DigitalOcean GLM-5 (default), with automatic fallback
- **Conversational Refinement**: Iterate on generated workflows through natural dialogue
- **Smart Credential Detection**: Automatically identifies required credentials and guides setup
- **Guardrails**: Prevents prompt injection, validates outputs, enforces safety constraints
- **Template Library**: Pre-built India-specific workflow templates

### Competitive Advantages

| Feature | Nodebase AI | n8n | Zapier | Make |
|---------|-------------|-----|--------|------|
| Natural Language Workflow Generation | ✅ | ❌ | ❌ | ❌ |
| Multi-Provider AI with Fallback | ✅ | ❌ | ❌ | ❌ |
| India-Specific Templates | ✅ | ❌ | ❌ | ❌ |
| Conversational Debug | ✅ | ❌ | ❌ | ❌ |

---

## 2. System Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                               │
│  Chat Interface → Workflow Preview → Credential Wizard              │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           API LAYER                                  │
│  tRPC Router: generate, refine, debug, getMissingCredentials        │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    AI ORCHESTRATION LAYER                            │
│  Guardrails → Provider Gateway → Structured Output → Validator      │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      PERSISTENCE LAYER                               │
│  PostgreSQL: Conversations, Messages, Generations, Usage, Templates │
│  Redis: Rate limiting, Quota tracking, Context cache                │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    BACKGROUND PROCESSING                             │
│  Inngest: generate-workflow, refine-workflow, analyze-usage         │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Prompt
    ↓
Input Guardrails (injection detection, length limits, off-topic filter)
    ↓
Provider Router (select based on preference + health + cost)
    ↓
AI Generation (LLM generates structured JSON)
    ↓
Output Validator (Zod schema + DAG integrity + node compatibility)
    ↓
Workflow Creator (create nodes, connections in DB)
    ↓
Credential Check (detect missing, generate wizard)
    ↓
Response (workflow preview + credential requirements)
```

---

## 3. Multi-Provider AI Gateway

### Provider Configuration

```typescript
// src/features/ai-agent/config/providers.ts

export enum AIProviderType {
  OPENAI = "OPENAI",
  CLAUDE = "CLAUDE", 
  DIGITALOCEAN_GLM5 = "DIGITALOCEAN_GLM5"
}

export interface AIProviderConfig {
  id: AIProviderType;
  name: string;
  displayName: string;
  defaultModel: string;
  maxTokens: number;
  costPer1kInputTokens: number;
  costPer1kOutputTokens: number;
  endpoint: string;
  apiKeyEnvVar: string;
  isDefault: boolean;
  capabilities: {
    structuredOutput: boolean;
    vision: boolean;
    multiTurn: boolean;
  };
}

export const PROVIDER_CONFIGS: Record<AIProviderType, AIProviderConfig> = {
  [AIProviderType.DIGITALOCEAN_GLM5]: {
    id: AIProviderType.DIGITALOCEAN_GLM5,
    name: "digitalocean-glm5",
    displayName: "GLM-5 (DigitalOcean)",
    defaultModel: "glm-5",
    maxTokens: 128000,
    costPer1kInputTokens: 0.0001,
    costPer1kOutputTokens: 0.0001,
    endpoint: "https://inference.do-ai.run/v1/chat/completions",
    apiKeyEnvVar: "DIGITALOCEAN_AI_API_KEY",
    isDefault: true,
    capabilities: { structuredOutput: true, vision: false, multiTurn: true }
  },
  [AIProviderType.OPENAI]: {
    id: AIProviderType.OPENAI,
    name: "openai",
    displayName: "OpenAI GPT-4o",
    defaultModel: "gpt-4o",
    maxTokens: 128000,
    costPer1kInputTokens: 0.0025,
    costPer1kOutputTokens: 0.01,
    endpoint: "https://api.openai.com/v1/chat/completions",
    apiKeyEnvVar: "OPENAI_API_KEY",
    isDefault: false,
    capabilities: { structuredOutput: true, vision: true, multiTurn: true }
  },
  [AIProviderType.CLAUDE]: {
    id: AIProviderType.CLAUDE,
    name: "claude",
    displayName: "Claude Sonnet 4",
    defaultModel: "claude-sonnet-4-0",
    maxTokens: 200000,
    costPer1kInputTokens: 0.003,
    costPer1kOutputTokens: 0.015,
    endpoint: "https://api.anthropic.com/v1/messages",
    apiKeyEnvVar: "ANTHROPIC_API_KEY",
    isDefault: false,
    capabilities: { structuredOutput: true, vision: true, multiTurn: true }
  }
};
```

### Provider Gateway Implementation

```typescript
// src/features/ai-agent/lib/provider-gateway.ts

import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { type LanguageModel } from "ai";
import { PROVIDER_CONFIGS, AIProviderType } from "../config/providers";

export class AIProviderGateway {
  async getProvider(userPreference?: AIProviderType): Promise<LanguageModel> {
    const preferredOrder = this.getProviderPriority(userPreference);
    
    for (const providerType of preferredOrder) {
      const health = await this.checkProviderHealth(providerType);
      if (health.status !== "down") {
        return this.createModel(providerType);
      }
    }
    
    throw new Error("All AI providers are currently unavailable");
  }

  private getProviderPriority(userPreference?: AIProviderType): AIProviderType[] {
    if (userPreference) {
      return [userPreference, ...Object.values(AIProviderType).filter(p => p !== userPreference)];
    }
    // Default: DO GLM-5 → OpenAI → Claude
    return [AIProviderType.DIGITALOCEAN_GLM5, AIProviderType.OPENAI, AIProviderType.CLAUDE];
  }

  private createModel(providerType: AIProviderType): LanguageModel {
    const config = PROVIDER_CONFIGS[providerType];
    
    switch (providerType) {
      case AIProviderType.DIGITALOCEAN_GLM5:
        return createOpenAI({
          apiKey: process.env.DIGITALOCEAN_AI_API_KEY,
          baseURL: "https://inference.do-ai.run/v1"
        })(config.defaultModel);
      
      case AIProviderType.OPENAI:
        return createOpenAI({ apiKey: process.env.OPENAI_API_KEY })(config.defaultModel);
      
      case AIProviderType.CLAUDE:
        return createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })(config.defaultModel);
      
      default:
        throw new Error(`Unknown provider: ${providerType}`);
    }
  }
}

export const aiProviderGateway = new AIProviderGateway();
```


---

## 4. Database Schema Design

### Prisma Schema Extensions

```prisma
// prisma/schema/ai-agent.prisma

enum AIProvider {
  OPENAI
  CLAUDE
  DIGITALOCEAN_GLM5
}

enum GenerationStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  REJECTED
}

enum MessageRole {
  USER
  ASSISTANT
  SYSTEM
}

enum GuardrailViolationType {
  PROMPT_INJECTION
  OFF_TOPIC
  EXCESSIVE_LENGTH
  RATE_LIMITED
  QUOTA_EXCEEDED
  HARMFUL_CONTENT
  PII_DETECTED
}

/// A conversation thread between user and AI agent
model AgentConversation {
  id          String         @id @default(cuid())
  userId      String
  title       String?
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  
  user        User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages    AgentMessage[]
  generations AgentGeneration[]
  
  messageCount Int           @default(0)
  workflowCreated Boolean    @default(false)
  
  @@index([userId, updatedAt(sort: Desc)])
  @@map("agent_conversation")
}

/// Individual message in a conversation
model AgentMessage {
  id             String            @id @default(cuid())
  conversationId String
  role           MessageRole
  content        String            @db.Text
  
  inputTokens    Int?
  outputTokens   Int?
  provider       AIProvider?
  model          String?
  latencyMs      Int?
  
  createdAt      DateTime          @default(now())
  
  conversation   AgentConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  
  @@index([conversationId, createdAt(sort: Asc)])
  @@map("agent_message")
}

/// Record of a workflow generation attempt
model AgentGeneration {
  id              String            @id @default(cuid())
  conversationId  String
  userId          String
  
  prompt          String            @db.Text
  refinedFromId   String?
  
  status          GenerationStatus  @default(PENDING)
  generatedWorkflowId String?
  errorMessage    String?           @db.Text
  
  provider        AIProvider?
  model           String?
  inputTokens     Int?
  outputTokens    Int?
  latencyMs       Int?
  
  guardrailPassed Boolean           @default(true)
  guardrailReason String?
  
  generatedNodes      Json?
  generatedConnections Json?
  credentialRequirements Json?
  
  createdAt       DateTime          @default(now())
  
  conversation    AgentConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  refinedFrom     AgentGeneration?  @relation("RefinementChain", fields: [refinedFromId], references: [id])
  refinements     AgentGeneration[] @relation("RefinementChain")
  
  @@index([userId, createdAt(sort: Desc)])
  @@index([status])
  @@map("agent_generation")
}

/// Daily usage tracking per user
model AgentUsage {
  id          String    @id @default(cuid())
  userId      String
  date        DateTime  @db.Date
  
  openaiInputTokens      Int @default(0)
  openaiOutputTokens     Int @default(0)
  claudeInputTokens      Int @default(0)
  claudeOutputTokens     Int @default(0)
  digitaloceanInputTokens  Int @default(0)
  digitaloceanOutputTokens Int @default(0)
  
  generationsRequested   Int @default(0)
  generationsCompleted   Int @default(0)
  generationsFailed      Int @default(0)
  generationsRejected    Int @default(0)
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  @@unique([userId, date])
  @@map("agent_usage")
}

/// Pre-built workflow templates
model AITemplate {
  id              String    @id @default(cuid())
  name            String
  description     String    @db.Text
  category        String
  
  nodes           Json
  connections     Json
  requiredCredentials Json
  
  tags            Json?
  isIndiaSpecific Boolean   @default(false)
  popularity      Int       @default(0)
  
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@unique([name])
  @@index([category])
  @@map("ai_template")
}

/// Guardrail violation logs
model AIGuardrailLog {
  id              String               @id @default(cuid())
  userId          String
  conversationId  String?
  
  violationType   GuardrailViolationType
  severity        String
  input           String               @db.Text
  reason          String               @db.Text
  
  detectedBy      String
  confidence      Float?
  
  createdAt       DateTime             @default(now())
  
  @@index([userId, createdAt(sort: Desc)])
  @@map("ai_guardrail_log")
}

/// User preferences
model AIPreference {
  id              String      @id @default(cuid())
  userId          String      @unique
  
  preferredProvider AIProvider @default(DIGITALOCEAN_GLM5)
  
  dailyGenerationLimit Int?
  monthlyGenerationLimit Int?
  
  enableMultiTurn   Boolean   @default(true)
  enableTemplates   Boolean   @default(true)
  enableDebug       Boolean   @default(true)
  
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  
  @@map("ai_preference")
}
```

### Database Diagram

```
┌─────────────────────┐       ┌─────────────────────┐
│   User              │       │ AgentConversation   │
├─────────────────────┤       ├─────────────────────┤
│ id                  │←──────│ userId              │
│ email               │       │ id                  │
│ name                │       │ title               │
└─────────────────────┘       │ messageCount        │
                              │ workflowCreated     │
                              └─────────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
          ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
          │ AgentMessage    │  │ AgentGeneration │  │ AIPreference    │
          ├─────────────────┤  ├─────────────────┤  ├─────────────────┤
          │ conversationId  │  │ conversationId  │  │ userId          │
          │ role            │  │ prompt          │  │ preferredProvider│
          │ content         │  │ status          │  │ dailyLimit      │
          │ provider        │  │ provider        │  └─────────────────┘
          │ inputTokens     │  │ inputTokens     │
          │ outputTokens    │  │ outputTokens    │
          └─────────────────┘  │ generatedNodes  │
                               └─────────────────┘
```


---

## 5. Node Capability Registry

### Purpose

The Node Capability Registry provides a machine-readable description of all nodes for the AI agent. This enables the LLM to:
- Select appropriate nodes based on user intent
- Configure nodes correctly with valid parameters
- Generate proper template variable references
- Detect credential requirements

### Registry Structure

```typescript
// src/features/ai-agent/registry/node-capabilities.ts

import { NodeType, CredentialType } from "@/generated/prisma";

export interface NodeCapability {
  type: NodeType;
  category: "trigger" | "execution" | "logic" | "ai" | "communication" | "integration";
  label: string;
  description: string;
  operations?: string[];
  requiredCredential?: CredentialType;
  credentialPurpose?: string;
  outputVariables: Array<{ name: string; description: string; example: string }>;
  maxInputs: number;
  maxOutputs: number;
  isIndiaSpecific?: boolean;
  useCases: string[];
}

// ═══════════════════════════════════════════════════════════════════
// TRIGGER NODES
// ═══════════════════════════════════════════════════════════════════

export const TRIGGER_NODES: NodeCapability[] = [
  {
    type: NodeType.MANUAL_TRIGGER,
    category: "trigger",
    label: "Manual Trigger",
    description: "Runs the workflow when user clicks execute button",
    outputVariables: [
      { name: "manualTrigger", description: "Empty starter object", example: "{}" }
    ],
    maxInputs: 0,
    maxOutputs: 1,
    useCases: ["testing", "on-demand workflows"]
  },
  
  {
    type: NodeType.RAZORPAY_TRIGGER,
    category: "trigger",
    label: "Razorpay Trigger",
    description: "Fires on Razorpay payment events (payment.captured, order.paid, etc.)",
    requiredCredential: CredentialType.RAZORPAY,
    credentialPurpose: "Razorpay Key ID and Secret",
    operations: [
      "payment.captured", "payment.failed", "payment.authorized",
      "order.paid", "order.created", "refund.created",
      "subscription.created", "subscription.cancelled"
    ],
    outputVariables: [
      { name: "razorpayTrigger.payload.payment.entity.id", description: "Payment ID", example: "pay_xxx" },
      { name: "razorpayTrigger.payload.payment.entity.amount", description: "Amount in paise", example: "50000" },
      { name: "razorpayTrigger.payload.payment.entity.email", description: "Customer email", example: "user@example.com" },
      { name: "razorpayTrigger.payload.payment.entity.contact", description: "Customer phone", example: "+919876543210" }
    ],
    maxInputs: 0,
    maxOutputs: 1,
    isIndiaSpecific: true,
    useCases: ["payment confirmation", "order fulfillment", "subscription management"]
  },
  
  {
    type: NodeType.WHATSAPP_TRIGGER,
    category: "trigger",
    label: "WhatsApp Trigger",
    description: "Fires when WhatsApp message is received",
    requiredCredential: CredentialType.WHATSAPP,
    credentialPurpose: "WhatsApp Business API token and Phone Number ID",
    outputVariables: [
      { name: "whatsappTrigger.message.from", description: "Sender phone", example: "919876543210" },
      { name: "whatsappTrigger.message.text.body", description: "Message text", example: "Hello" }
    ],
    maxInputs: 0,
    maxOutputs: 1,
    isIndiaSpecific: true,
    useCases: ["customer support", "chatbot", "lead capture"]
  },
  
  {
    type: NodeType.WEBHOOK_TRIGGER,
    category: "trigger",
    label: "Webhook Trigger",
    description: "Trigger via HTTP POST request",
    outputVariables: [
      { name: "webhookTrigger.body", description: "Request body", example: "{...}" },
      { name: "webhookTrigger.headers", description: "Request headers", example: "{...}" }
    ],
    maxInputs: 0,
    maxOutputs: 1,
    useCases: ["external integrations", "API callbacks"]
  },
  
  {
    type: NodeType.SCHEDULE_TRIGGER,
    category: "trigger",
    label: "Schedule Trigger",
    description: "Run workflow on time-based schedule (cron)",
    outputVariables: [
      { name: "scheduleTrigger.timestamp", description: "Execution timestamp", example: "2026-06-05T10:00:00Z" }
    ],
    maxInputs: 0,
    maxOutputs: 1,
    useCases: ["daily reports", "scheduled tasks", "periodic sync"]
  },
  
  {
    type: NodeType.GITHUB_TRIGGER,
    category: "trigger",
    label: "GitHub Trigger",
    description: "Fires on GitHub events (push, pull_request, issues)",
    requiredCredential: CredentialType.GITHUB_APP,
    credentialPurpose: "GitHub App or Personal Access Token",
    outputVariables: [
      { name: "githubTrigger.event", description: "Event type", example: "push" },
      { name: "githubTrigger.repository", description: "Repository name", example: "owner/repo" }
    ],
    maxInputs: 0,
    maxOutputs: 1,
    useCases: ["CI/CD", "issue automation", "PR workflows"]
  }
];

// ═══════════════════════════════════════════════════════════════════
// EXECUTION NODES
// ═══════════════════════════════════════════════════════════════════

export const EXECUTION_NODES: NodeCapability[] = [
  {
    type: NodeType.HTTP_REQUEST,
    category: "execution",
    label: "HTTP Request",
    description: "Make HTTP requests to any API endpoint",
    operations: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    outputVariables: [
      { name: "httpRequest.response", description: "Response body", example: "{...}" },
      { name: "httpRequest.status", description: "HTTP status code", example: "200" }
    ],
    maxInputs: 1,
    maxOutputs: 1,
    useCases: ["API calls", "webhook responses", "data fetching"]
  },
  
  {
    type: NodeType.WHATSAPP,
    category: "communication",
    label: "WhatsApp",
    description: "Send WhatsApp messages via Meta Business API",
    requiredCredential: CredentialType.WHATSAPP,
    credentialPurpose: "WhatsApp Business API token",
    operations: ["SEND_TEXT", "SEND_IMAGE", "SEND_DOCUMENT", "SEND_TEMPLATE"],
    outputVariables: [
      { name: "whatsapp.messageId", description: "Sent message ID", example: "wamid.xxx" }
    ],
    maxInputs: 1,
    maxOutputs: 1,
    isIndiaSpecific: true,
    useCases: ["notifications", "confirmations", "alerts"]
  },
  
  {
    type: NodeType.GMAIL,
    category: "communication",
    label: "Gmail",
    description: "Send and manage emails via Gmail API",
    requiredCredential: CredentialType.GMAIL_OAUTH,
    credentialPurpose: "Google OAuth2 for Gmail access",
    operations: ["SEND", "REPLY", "FORWARD", "GET_MESSAGE", "SEARCH_MESSAGES"],
    outputVariables: [
      { name: "gmail.messageId", description: "Email message ID", example: "msgxxx" }
    ],
    maxInputs: 1,
    maxOutputs: 1,
    useCases: ["email automation", "notifications", "follow-ups"]
  },
  
  {
    type: NodeType.TELEGRAM,
    category: "communication",
    label: "Telegram",
    description: "Send messages to Telegram chats and channels",
    operations: ["SEND_MESSAGE", "SEND_PHOTO", "SEND_DOCUMENT"],
    outputVariables: [
      { name: "telegram.messageId", description: "Message ID", example: "123" }
    ],
    maxInputs: 1,
    maxOutputs: 1,
    useCases: ["team notifications", "alerts", "bot messages"]
  },
  
  {
    type: NodeType.SLACK,
    category: "communication",
    label: "Slack",
    description: "Send messages, manage channels, interact with Slack",
    requiredCredential: CredentialType.SLACK,
    operations: ["MESSAGE_SEND", "CHANNEL_LIST", "USER_LIST"],
    outputVariables: [
      { name: "slack.ts", description: "Message timestamp", example: "1234567890.123456" }
    ],
    maxInputs: 1,
    maxOutputs: 1,
    useCases: ["team notifications", "incident alerts", "status updates"]
  }
];


// ═══════════════════════════════════════════════════════════════════
// AI NODES
// ═══════════════════════════════════════════════════════════════════

export const AI_NODES: NodeCapability[] = [
  {
    type: NodeType.OPENAI,
    category: "ai",
    label: "OpenAI",
    description: "GPT-4 for text generation, embeddings, and image generation",
    requiredCredential: CredentialType.OPENAI,
    credentialPurpose: "OpenAI API key",
    operations: ["CHAT", "STRUCTURED_OUTPUT", "GENERATE_IMAGE", "EMBED"],
    outputVariables: [
      { name: "openai.text", description: "Generated text", example: "AI response..." }
    ],
    maxInputs: 1,
    maxOutputs: 1,
    useCases: ["content generation", "summarization", "AI chat"]
  },
  
  {
    type: NodeType.ANTHROPIC,
    category: "ai",
    label: "Claude (Anthropic)",
    description: "Claude for advanced reasoning and analysis",
    requiredCredential: CredentialType.ANTHROPIC,
    credentialPurpose: "Anthropic API key",
    operations: ["CHAT"],
    outputVariables: [
      { name: "anthropic.text", description: "Generated text", example: "AI response..." }
    ],
    maxInputs: 1,
    maxOutputs: 1,
    useCases: ["analysis", "writing", "reasoning tasks"]
  },
  
  {
    type: NodeType.GEMINI,
    category: "ai",
    label: "Google Gemini",
    description: "Google Gemini for multimodal AI tasks",
    requiredCredential: CredentialType.GEMINI,
    credentialPurpose: "Google AI API key",
    operations: ["CHAT", "GENERATE_IMAGE"],
    outputVariables: [
      { name: "gemini.text", description: "Generated text", example: "AI response..." }
    ],
    maxInputs: 1,
    maxOutputs: 1,
    useCases: ["multimodal tasks", "vision + text"]
  }
];

// ═══════════════════════════════════════════════════════════════════
// LOGIC NODES
// ═══════════════════════════════════════════════════════════════════

export const LOGIC_NODES: NodeCapability[] = [
  {
    type: NodeType.IF_ELSE,
    category: "logic",
    label: "If/Else",
    description: "Branch workflow based on a condition",
    operations: ["EQUALS", "NOT_EQUALS", "CONTAINS", "GREATER_THAN", "LESS_THAN", "IS_EMPTY"],
    outputVariables: [
      { name: "ifElse.result", description: "Branch taken", example: "true" }
    ],
    maxInputs: 1,
    maxOutputs: 2, // true and false branches
    useCases: ["conditional routing", "data filtering", "branching logic"]
  },
  
  {
    type: NodeType.SWITCH,
    category: "logic",
    label: "Switch",
    description: "Route to one of N branches based on value matching",
    outputVariables: [
      { name: "switch.branch", description: "Selected branch", example: "branch_1" }
    ],
    maxInputs: 1,
    maxOutputs: -1, // unlimited branches
    useCases: ["multi-way routing", "category handling"]
  },
  
  {
    type: NodeType.LOOP,
    category: "logic",
    label: "Loop",
    description: "Iterate over an array of items",
    outputVariables: [
      { name: "loop.item", description: "Current item", example: "{...}" },
      { name: "loop.index", description: "Current index", example: "0" }
    ],
    maxInputs: 1,
    maxOutputs: 1,
    useCases: ["batch processing", "bulk operations"]
  },
  
  {
    type: NodeType.FILTER,
    category: "logic",
    label: "Filter",
    description: "Filter array based on conditions",
    outputVariables: [
      { name: "filter.items", description: "Filtered items", example: "[...]" },
      { name: "filter.count", description: "Item count", example: "5" }
    ],
    maxInputs: 1,
    maxOutputs: 1,
    useCases: ["data filtering", "array processing"]
  },
  
  {
    type: NodeType.SORT,
    category: "logic",
    label: "Sort",
    description: "Sort arrays by one or more keys",
    outputVariables: [
      { name: "sort.items", description: "Sorted items", example: "[...]" },
      { name: "sort.count", description: "Item count", example: "10" }
    ],
    maxInputs: 1,
    maxOutputs: 1,
    useCases: ["ordering data", "rankings"]
  },
  
  {
    type: NodeType.AGGREGATE,
    category: "logic",
    label: "Aggregate",
    description: "Sum, count, average, group arrays",
    outputVariables: [
      { name: "aggregate.result", description: "Aggregation result", example: "1500" }
    ],
    maxInputs: 1,
    maxOutputs: 1,
    useCases: ["summaries", "statistics", "grouping"]
  }
];

// ═══════════════════════════════════════════════════════════════════
// INTEGRATION NODES (India-Specific)
// ═══════════════════════════════════════════════════════════════════

export const INTEGRATION_NODES: NodeCapability[] = [
  {
    type: NodeType.RAZORPAY,
    category: "integration",
    label: "Razorpay",
    description: "28 operations: orders, payments, refunds, subscriptions, payouts",
    requiredCredential: CredentialType.RAZORPAY,
    credentialPurpose: "Razorpay Key ID and Secret",
    operations: ["ORDER_CREATE", "PAYMENT_FETCH", "REFUND_CREATE", "SUBSCRIPTION_CREATE"],
    outputVariables: [
      { name: "razorpay.order", description: "Order object", example: "{ id: 'order_xxx' }" }
    ],
    maxInputs: 1,
    maxOutputs: 1,
    isIndiaSpecific: true,
    useCases: ["payment processing", "refunds", "subscriptions"]
  },
  
  {
    type: NodeType.ZOHO_CRM,
    category: "integration",
    label: "Zoho CRM",
    description: "32 operations: leads, contacts, deals, tasks",
    requiredCredential: CredentialType.ZOHO_CRM,
    credentialPurpose: "Zoho CRM OAuth2 tokens",
    operations: ["CREATE_LEAD", "CREATE_CONTACT", "CREATE_DEAL", "SEARCH_LEADS"],
    outputVariables: [
      { name: "zohoCrm.record", description: "Created record", example: "{ id: 'xxx' }" }
    ],
    maxInputs: 1,
    maxOutputs: 1,
    isIndiaSpecific: true,
    useCases: ["CRM automation", "lead management", "deal tracking"]
  },
  
  {
    type: NodeType.SHIPROCKET,
    category: "integration",
    label: "Shiprocket",
    description: "23 operations: orders, tracking, returns, labels",
    requiredCredential: CredentialType.SHIPROCKET,
    credentialPurpose: "Shiprocket API token",
    operations: ["CREATE_ORDER", "TRACK_SHIPMENT", "GENERATE_LABEL"],
    outputVariables: [
      { name: "shiprocket.order", description: "Shipping order", example: "{ id: 'xxx' }" }
    ],
    maxInputs: 1,
    maxOutputs: 1,
    isIndiaSpecific: true,
    useCases: ["shipping automation", "order fulfillment", "tracking"]
  },
  
  {
    type: NodeType.MSG91,
    category: "integration",
    label: "MSG91",
    description: "SMS, OTP, WhatsApp, Voice — India's #1 communication platform",
    requiredCredential: CredentialType.MSG91,
    credentialPurpose: "MSG91 API key",
    operations: ["SEND_SMS", "SEND_OTP", "VERIFY_OTP", "SEND_WHATSAPP"],
    outputVariables: [
      { name: "msg91.requestId", description: "Request ID", example: "xxx" }
    ],
    maxInputs: 1,
    maxOutputs: 1,
    isIndiaSpecific: true,
    useCases: ["SMS notifications", "OTP verification", "bulk messaging"]
  },
  
  {
    type: NodeType.HUBSPOT,
    category: "integration",
    label: "HubSpot",
    description: "35 operations: contacts, companies, deals, tickets",
    requiredCredential: CredentialType.HUBSPOT,
    credentialPurpose: "HubSpot Private App token",
    operations: ["CREATE_CONTACT", "UPDATE_DEAL", "CREATE_TICKET"],
    outputVariables: [
      { name: "hubspot.record", description: "Created record", example: "{ id: 'xxx' }" }
    ],
    maxInputs: 1,
    maxOutputs: 1,
    useCases: ["CRM automation", "ticketing", "marketing"]
  },
  
  {
    type: NodeType.GITHUB,
    category: "integration",
    label: "GitHub",
    description: "Repository, issues, PRs, workflows, and more",
    requiredCredential: CredentialType.GITHUB,
    credentialPurpose: "GitHub Personal Access Token",
    operations: ["ISSUE_CREATE", "PULL_REQUEST_CREATE", "REPOSITORY_LIST", "WORKFLOW_DISPATCH"],
    outputVariables: [
      { name: "github.result", description: "Operation result", example: "{...}" }
    ],
    maxInputs: 1,
    maxOutputs: 1,
    useCases: ["CI/CD", "issue tracking", "automation"]
  }
];

// ═══════════════════════════════════════════════════════════════════
// PRODUCTIVITY NODES
// ═══════════════════════════════════════════════════════════════════

export const PRODUCTIVITY_NODES: NodeCapability[] = [
  {
    type: NodeType.GOOGLE_SHEETS,
    category: "productivity",
    label: "Google Sheets",
    description: "Read, append, update rows in Google Sheets",
    requiredCredential: CredentialType.GOOGLE_SHEETS,
    credentialPurpose: "Google OAuth2 for Sheets access",
    operations: ["APPEND_ROW", "READ_ROWS", "UPDATE_ROW", "SEARCH_ROWS"],
    outputVariables: [
      { name: "googleSheets.rows", description: "Row data", example: "[{...}]" }
    ],
    maxInputs: 1,
    maxOutputs: 1,
    useCases: ["data storage", "reporting", "databases"]
  },
  
  {
    type: NodeType.NOTION,
    category: "productivity",
    label: "Notion",
    description: "Interact with Notion databases, pages, and blocks",
    requiredCredential: CredentialType.NOTION,
    credentialPurpose: "Notion integration token",
    operations: ["QUERY_DATABASE", "CREATE_PAGE", "UPDATE_PAGE", "SEARCH"],
    outputVariables: [
      { name: "notion.page", description: "Page object", example: "{ id: 'xxx' }" }
    ],
    maxInputs: 1,
    maxOutputs: 1,
    useCases: ["documentation", "project management", "knowledge base"]
  }
];

// ═══════════════════════════════════════════════════════════════════
// COMBINED REGISTRY
// ═══════════════════════════════════════════════════════════════════

export const ALL_NODE_CAPABILITIES: NodeCapability[] = [
  ...TRIGGER_NODES,
  ...EXECUTION_NODES,
  ...AI_NODES,
  ...LOGIC_NODES,
  ...INTEGRATION_NODES,
  ...PRODUCTIVITY_NODES
];

// Helper to get node by type
export function getNodeCapability(type: NodeType): NodeCapability | undefined {
  return ALL_NODE_CAPABILITIES.find(n => n.type === type);
}

// Helper to get all nodes requiring credentials
export function getNodesRequiringCredential(credentialType: CredentialType): NodeCapability[] {
  return ALL_NODE_CAPABILITIES.filter(n => n.requiredCredential === credentialType);
}
```


---

## 6. Structured Output Schema

### Purpose

The structured output schema defines the exact JSON format the AI must generate. Using Zod for validation ensures type safety and provides clear error messages.

### Schema Definition

```typescript
// src/features/ai-agent/schemas/workflow-generation.ts

import { z } from "zod";

// Node position on canvas
const PositionSchema = z.object({
  x: z.number().describe("X coordinate on canvas"),
  y: z.number().describe("Y coordinate on canvas")
});

// Node configuration data
const NodeDataSchema = z.record(z.string(), z.any()).describe("Node-specific configuration");

// Single node definition
const WorkflowNodeSchema = z.object({
  id: z.string().describe("Unique node ID (cuid format)"),
  type: z.string().describe("NodeType enum value (e.g., RAZORPAY_TRIGGER, WHATSAPP)"),
  name: z.string().describe("Human-readable node name"),
  position: PositionSchema,
  data: NodeDataSchema.default({}),
  credentialId: z.string().optional().describe("Reference to credential if needed")
});

// Connection between nodes
const WorkflowConnectionSchema = z.object({
  id: z.string().describe("Unique connection ID"),
  fromNodeId: z.string().describe("Source node ID"),
  toNodeId: z.string().describe("Target node ID"),
  fromOutput: z.string().default("main").describe("Output handle name"),
  toInput: z.string().default("main").describe("Input handle name")
});

// Credential requirement detected by AI
const CredentialRequirementSchema = z.object({
  type: z.string().describe("CredentialType enum value"),
  nodeName: z.string().describe("Which node needs this credential"),
  purpose: z.string().describe("Human-readable explanation"),
  setupUrl: z.string().optional().describe("Link to credential setup guide"),
  isConfigured: z.boolean().optional().describe("Whether user already has this credential")
});

// Suggested template variable
const SuggestedVariableSchema = z.object({
  name: z.string().describe("Variable name (e.g., razorpayTrigger.payload.payment.entity.email)"),
  description: z.string().describe("What this variable contains"),
  exampleValue: z.string().describe("Example value")
});

// Main workflow generation output
export const GeneratedWorkflowSchema = z.object({
  // Workflow metadata
  name: z.string().describe("Suggested workflow name"),
  description: z.string().describe("Brief description of what this workflow does"),
  
  // Nodes and connections
  nodes: z.array(WorkflowNodeSchema).min(1).describe("All nodes in the workflow"),
  connections: z.array(WorkflowConnectionSchema).describe("Connections between nodes"),
  
  // Requirements
  credentialRequirements: z.array(CredentialRequirementSchema)
    .describe("Credentials the user needs to configure"),
  
  // Helpful context
  suggestedVariables: z.array(SuggestedVariableSchema)
    .describe("Key template variables available in this workflow"),
  
  // AI reasoning (for debugging)
  reasoning: z.object({
    triggerChoice: z.string().describe("Why this trigger was selected"),
    nodeChoices: z.array(z.object({
      node: z.string(),
      reason: z.string()
    })).describe("Why each node was selected"),
    connectionOrder: z.string().describe("Why nodes are connected in this order")
  }).optional()
});

// Refinement schema (for modifying existing workflows)
export const WorkflowRefinementSchema = z.object({
  action: z.enum(["ADD_NODES", "REMOVE_NODES", "MODIFY_NODES", "ADD_CONNECTIONS", "REMOVE_CONNECTIONS", "REORDER"])
    .describe("Type of modification"),
  
  nodesToAdd: z.array(WorkflowNodeSchema).optional(),
  nodesToRemove: z.array(z.string()).optional().describe("Node IDs to remove"),
  nodesToModify: z.array(z.object({
    id: z.string(),
    data: NodeDataSchema
  })).optional(),
  
  connectionsToAdd: z.array(WorkflowConnectionSchema).optional(),
  connectionsToRemove: z.array(z.string()).optional().describe("Connection IDs to remove"),
  
  newCredentialRequirements: z.array(CredentialRequirementSchema).optional(),
  
  explanation: z.string().describe("Human-readable explanation of changes")
});

// Debug analysis schema
export const WorkflowDebugSchema = z.object({
  issues: z.array(z.object({
    severity: z.enum(["error", "warning", "info"]),
    nodeId: z.string().optional(),
    message: z.string(),
    suggestion: z.string()
  })),
  
  credentialIssues: z.array(z.object({
    credentialType: z.string(),
    issue: z.string(),
    fix: z.string()
  })),
  
  suggestions: z.array(z.string()).describe("General improvement suggestions")
});

// Type exports
export type GeneratedWorkflow = z.infer<typeof GeneratedWorkflowSchema>;
export type WorkflowRefinement = z.infer<typeof WorkflowRefinementSchema>;
export type WorkflowDebug = z.infer<typeof WorkflowDebugSchema>;
export type CredentialRequirement = z.infer<typeof CredentialRequirementSchema>;
```

### Validation Function

```typescript
// src/features/ai-agent/lib/workflow-validator.ts

import { GeneratedWorkflow, GeneratedWorkflowSchema } from "../schemas/workflow-generation";
import { NodeType } from "@/generated/prisma";
import { ALL_NODE_CAPABILITIES } from "../registry/node-capabilities";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateGeneratedWorkflow(workflow: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // 1. Schema validation
  const parseResult = GeneratedWorkflowSchema.safeParse(workflow);
  if (!parseResult.success) {
    return {
      valid: false,
      errors: parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
      warnings: []
    };
  }
  
  const data = parseResult.data;
  
  // 2. Validate node types
  const validNodeTypes = new Set(Object.values(NodeType));
  for (const node of data.nodes) {
    if (!validNodeTypes.has(node.type as NodeType)) {
      errors.push(`Invalid node type: ${node.type}`);
    }
  }
  
  // 3. Validate exactly one trigger
  const triggerNodes = data.nodes.filter(n => 
    ALL_NODE_CAPABILITIES.find(c => c.type === n.type)?.category === "trigger"
  );
  if (triggerNodes.length === 0) {
    errors.push("Workflow must have at least one trigger node");
  }
  if (triggerNodes.length > 1) {
    warnings.push("Multiple trigger nodes detected. Only one will activate at a time.");
  }
  
  // 4. Validate connections
  const nodeIds = new Set(data.nodes.map(n => n.id));
  for (const conn of data.connections) {
    if (!nodeIds.has(conn.fromNodeId)) {
      errors.push(`Connection references non-existent source node: ${conn.fromNodeId}`);
    }
    if (!nodeIds.has(conn.toNodeId)) {
      errors.push(`Connection references non-existent target node: ${conn.toNodeId}`);
    }
  }
  
  // 5. Check for cycles (DAG validation)
  const cycle = detectCycle(data);
  if (cycle) {
    errors.push(`Workflow contains a cycle: ${cycle.join(' → ')}`);
  }
  
  // 6. Validate credential requirements match nodes
  const nodesNeedingCredentials = data.nodes.filter(n => {
    const capability = ALL_NODE_CAPABILITIES.find(c => c.type === n.type);
    return capability?.requiredCredential;
  });
  
  const requiredCreds = new Set(nodesNeedingCredentials.map(n => {
    const capability = ALL_NODE_CAPABILITIES.find(c => c.type === n.type);
    return capability?.requiredCredential;
  }));
  
  const providedCreds = new Set(data.credentialRequirements.map(c => c.type));
  
  for (const cred of requiredCreds) {
    if (!providedCreds.has(cred!)) {
      warnings.push(`Missing credential requirement for: ${cred}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

function detectCycle(workflow: GeneratedWorkflow): string[] | null {
  const adjacency = new Map<string, string[]>();
  
  for (const node of workflow.nodes) {
    adjacency.set(node.id, []);
  }
  
  for (const conn of workflow.connections) {
    adjacency.get(conn.fromNodeId)?.push(conn.toNodeId);
  }
  
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];
  
  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);
    
    const neighbors = adjacency.get(nodeId) || [];
    for (const neighbor of neighbors) {
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
```


---

## 7. AI Agent Executor System

### Purpose

The executor system handles the complete workflow generation pipeline: receiving prompts, calling AI providers, validating outputs, and persisting workflows.

### Main Generator

```typescript
// src/features/ai-agent/lib/generator.ts

import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { NonRetriableError } from "inngest";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { AIProviderType, PROVIDER_CONFIGS } from "../config/providers";
import { GeneratedWorkflowSchema, type GeneratedWorkflow } from "../schemas/workflow-generation";
import { validateGeneratedWorkflow } from "./workflow-validator";
import { ALL_NODE_CAPABILITIES } from "../registry/node-capabilities";
import { GuardrailsEngine, type GuardrailResult } from "./guardrails";

const SYSTEM_PROMPT = `You are Nodebase AI, an expert workflow automation assistant for the Indian market.

You help users create workflows by understanding their requirements and generating valid JSON configurations.

## AVAILABLE NODES

${JSON.stringify(ALL_NODE_CAPABILITIES, null, 2)}

## RULES

1. **Triggers**: Every workflow must have exactly ONE trigger node (e.g., RAZORPAY_TRIGGER, WHATSAPP_TRIGGER, SCHEDULE_TRIGGER, WEBHOOK_TRIGGER, MANUAL_TRIGGER)

2. **Connections**: Nodes must be connected in a valid DAG (directed acyclic graph). Data flows from trigger → execution nodes.

3. **Template Variables**: Use the format \`{{nodeName.field}}\` to reference data from previous nodes. For example:
   - \`{{razorpayTrigger.payload.payment.entity.email}}\` - customer email from Razorpay
   - \`{{whatsappTrigger.message.text.body}}\` - message text from WhatsApp
   - \`{{openai.text}}\` - AI-generated text

4. **Credentials**: When a node requires a credential, add it to credentialRequirements array.

5. **Node Positions**: Place trigger at (250, 100). Position subsequent nodes vertically with 150px spacing.

6. **India Focus**: Prefer Indian services: Razorpay over Stripe, WhatsApp over Telegram for business, Zoho CRM, MSG91, Shiprocket.

7. **Common Patterns**:
   - Payment → CRM → Notification (email/SMS/WhatsApp)
   - Form submission → AI processing → Database → Notification
   - Schedule → Read data → Process → Write data → Alert

## OUTPUT FORMAT

Generate a valid JSON object matching this structure:
{
  "name": "Workflow name",
  "description": "What this workflow does",
  "nodes": [...],
  "connections": [...],
  "credentialRequirements": [...],
  "suggestedVariables": [...]
}

Always explain your reasoning for node selection and connection order.`;

export interface GenerationParams {
  prompt: string;
  userId: string;
  conversationId: string;
  preferredProvider?: AIProviderType;
  existingWorkflowId?: string;
}

export interface GenerationResult {
  success: boolean;
  workflow?: GeneratedWorkflow;
  workflowId?: string;
  generationId: string;
  provider: AIProviderType;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  guardrailResult: GuardrailResult;
  error?: string;
}

export async function generateWorkflow(params: GenerationParams): Promise<GenerationResult> {
  const startTime = Date.now();
  let provider = params.preferredProvider || AIProviderType.DIGITALOCEAN_GLM5;
  let inputTokens = 0;
  let outputTokens = 0;
  
  // 1. Run guardrails on input
  const guardrails = new GuardrailsEngine();
  const guardrailResult = await guardrails.validateInput(params.prompt, params.userId);
  
  if (!guardrailResult.passed) {
    // Log the violation
    await prisma.aIGuardrailLog.create({
      data: {
        userId: params.userId,
        conversationId: params.conversationId,
        violationType: guardrailResult.violationType || "PROMPT_INJECTION",
        severity: guardrailResult.severity,
        input: params.prompt.slice(0, 1000),
        reason: guardrailResult.reason || "Guardrail violation",
        detectedBy: guardrailResult.detectedBy
      }
    });
    
    return {
      success: false,
      generationId: "",
      provider,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: Date.now() - startTime,
      guardrailResult,
      error: guardrailResult.reason
    };
  }
  
  // 2. Get AI provider
  let model;
  try {
    model = await getModelForProvider(provider);
  } catch (error) {
    // Fallback to next provider
    provider = AIProviderType.OPENAI;
    try {
      model = await getModelForProvider(provider);
    } catch {
      provider = AIProviderType.CLAUDE;
      model = await getModelForProvider(provider);
    }
  }
  
  // 3. Get user's existing credentials for context
  const existingCredentials = await prisma.credential.findMany({
    where: { userId: params.userId },
    select: { type: true, name: true, id: true }
  });
  
  const enhancedPrompt = `${params.prompt}

## User's Existing Credentials
${existingCredentials.length > 0 
  ? existingCredentials.map(c => `- ${c.type}: ${c.name} (ID: ${c.id})`).join('\n')
  : 'No credentials configured yet.'}`;

  // 4. Generate workflow
  try {
    const { object, usage } = await generateObject({
      model,
      schema: GeneratedWorkflowSchema,
      system: SYSTEM_PROMPT,
      prompt: enhancedPrompt,
      experimental_telemetry: { isEnabled: true }
    });
    
    inputTokens = usage.promptTokens;
    outputTokens = usage.completionTokens;
    
    // 5. Validate output
    const validation = validateGeneratedWorkflow(object);
    if (!validation.valid) {
      return {
        success: false,
        generationId: "",
        provider,
        inputTokens,
        outputTokens,
        latencyMs: Date.now() - startTime,
        guardrailResult,
        error: `Validation failed: ${validation.errors.join(', ')}`
      };
    }
    
    // 6. Create generation record
    const generation = await prisma.agentGeneration.create({
      data: {
        conversationId: params.conversationId,
        userId: params.userId,
        prompt: params.prompt,
        status: "COMPLETED",
        provider,
        model: PROVIDER_CONFIGS[provider].defaultModel,
        inputTokens,
        outputTokens,
        latencyMs: Date.now() - startTime,
        guardrailPassed: true,
        generatedNodes: object.nodes,
        generatedConnections: object.connections,
        credentialRequirements: object.credentialRequirements
      }
    });
    
    // 7. Mark credentials as configured if user has them
    const workflow = {
      ...object,
      credentialRequirements: object.credentialRequirements.map(req => ({
        ...req,
        isConfigured: existingCredentials.some(c => c.type === req.type)
      }))
    };
    
    return {
      success: true,
      workflow,
      generationId: generation.id,
      provider,
      inputTokens,
      outputTokens,
      latencyMs: Date.now() - startTime,
      guardrailResult
    };
    
  } catch (error) {
    // Log failed generation
    await prisma.agentGeneration.create({
      data: {
        conversationId: params.conversationId,
        userId: params.userId,
        prompt: params.prompt,
        status: "FAILED",
        provider,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        guardrailPassed: true
      }
    });
    
    return {
      success: false,
      generationId: "",
      provider,
      inputTokens,
      outputTokens,
      latencyMs: Date.now() - startTime,
      guardrailResult,
      error: error instanceof Error ? error.message : "Generation failed"
    };
  }
}

async function getModelForProvider(provider: AIProviderType) {
  switch (provider) {
    case AIProviderType.DIGITALOCEAN_GLM5:
      return createOpenAI({
        apiKey: process.env.DIGITALOCEAN_AI_API_KEY,
        baseURL: "https://inference.do-ai.run/v1"
      })(PROVIDER_CONFIGS[provider].defaultModel);
    
    case AIProviderType.OPENAI:
      return createOpenAI({
        apiKey: process.env.OPENAI_API_KEY
      })(PROVIDER_CONFIGS[provider].defaultModel);
    
    case AIProviderType.CLAUDE:
      return createAnthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      })(PROVIDER_CONFIGS[provider].defaultModel);
    
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
```


---

## 8. Guardrails & Safety System

### Purpose

The guardrails system protects against:
- Prompt injection attacks
- Off-topic requests
- Excessive usage
- Harmful content generation
- PII exposure

### Guardrails Engine

```typescript
// src/features/ai-agent/lib/guardrails.ts

import { GuardrailViolationType } from "@/generated/prisma";
import { redis } from "@/lib/redis";

export interface GuardrailResult {
  passed: boolean;
  violationType?: GuardrailViolationType;
  severity: "low" | "medium" | "high" | "critical";
  reason?: string;
  detectedBy: string;
  confidence?: number;
}

// Prompt injection patterns (common attack vectors)
const INJECTION_PATTERNS = [
  /ignore (all )?previous instructions/i,
  /ignore (all )?prior instructions/i,
  /disregard (all )?(previous|prior) instructions/i,
  /you are now\s+\w+/i,
  /act as if you are/i,
  /pretend you are/i,
  /roleplay as/i,
  /simulate being/i,
  /jailbreak/i,
  /DAN mode/i,
  /developer mode/i,
  /system override/i,
  /<\|im_start\|>/i,
  /<\|im_end\|>/i,
  /\[SYSTEM\]/i,
  /\[INST\]/i,
  /```system/i,
  /###\s*system/i,
  /override (your )?programming/i,
  /bypass (your )?(safety|security)/i,
  /disable (your )?(safety|security)/i,
  /forget (your )?(training|instructions)/i,
  /you are a (different|new)/i
];

// Off-topic patterns (non-workflow requests)
const OFF_TOPIC_PATTERNS = [
  /^(what is|how to|explain|teach me|write|help me write|can you write)/i,
  /recipe/i,
  /essay/i,
  /story/i,
  /poem/i,
  /song lyrics/i,
  /translate/i,
  /summarize (this|the)/i,
  /translate this/i,
  /homework/i,
  /code (challenge|problem)/i,
  /debug (this|my) code/i,
  /fix (this|my) code/i,
  /^(what|who|when|where|why|how) (is|are|was|were|do|does|did)/i
];

// Maximum prompt length
const MAX_PROMPT_LENGTH = 4000;

export class GuardrailsEngine {
  
  async validateInput(input: string, userId: string): Promise<GuardrailResult> {
    // 1. Length check
    if (input.length > MAX_PROMPT_LENGTH) {
      return {
        passed: false,
        violationType: GuardrailViolationType.EXCESSIVE_LENGTH,
        severity: "low",
        reason: `Prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters`,
        detectedBy: "length_check"
      };
    }
    
    // 2. Prompt injection detection
    const injectionResult = this.detectPromptInjection(input);
    if (!injectionResult.passed) {
      return injectionResult;
    }
    
    // 3. Off-topic detection
    const offTopicResult = this.detectOffTopic(input);
    if (!offTopicResult.passed) {
      return offTopicResult;
    }
    
    // 4. Rate limit check
    const rateLimitResult = await this.checkRateLimit(userId);
    if (!rateLimitResult.passed) {
      return rateLimitResult;
    }
    
    // 5. Quota check
    const quotaResult = await this.checkQuota(userId);
    if (!quotaResult.passed) {
      return quotaResult;
    }
    
    // All checks passed
    return {
      passed: true,
      severity: "low",
      detectedBy: "none"
    };
  }
  
  private detectPromptInjection(input: string): GuardrailResult {
    // Check against known patterns
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(input)) {
        return {
          passed: false,
          violationType: GuardrailViolationType.PROMPT_INJECTION,
          severity: "critical",
          reason: "Potential prompt injection detected. Please rephrase your request.",
          detectedBy: "regex",
          confidence: 0.85
        };
      }
    }
    
    // Additional heuristics
    const suspiciousPhrases = [
      "instead of creating a workflow",
      "don't create a workflow",
      "skip the workflow",
      "just answer",
      "just tell me",
      "not a workflow"
    ];
    
    const lowerInput = input.toLowerCase();
    for (const phrase of suspiciousPhrases) {
      if (lowerInput.includes(phrase)) {
        return {
          passed: false,
          violationType: GuardrailViolationType.PROMPT_INJECTION,
          severity: "high",
          reason: "Request appears to bypass workflow generation purpose.",
          detectedBy: "heuristic",
          confidence: 0.7
        };
      }
    }
    
    return { passed: true, severity: "low", detectedBy: "regex" };
  }
  
  private detectOffTopic(input: string): GuardrailResult {
    // Allow short prompts that might be workflow-related
    if (input.length < 50) {
      return { passed: true, severity: "low", detectedBy: "heuristic" };
    }
    
    // Check workflow-related keywords
    const workflowKeywords = [
      "workflow", "automation", "trigger", "payment", "order", "email", "sms",
      "whatsapp", "notification", "crm", "customer", "lead", "contact", "deal",
      "razorpay", "stripe", "webhook", "schedule", "sheet", "notion", "slack",
      "telegram", "message", "send", "create", "update", "sync", "process",
      "when", "every", "after", "before", "if", "then", "data"
    ];
    
    const lowerInput = input.toLowerCase();
    const hasWorkflowKeyword = workflowKeywords.some(kw => lowerInput.includes(kw));
    
    if (!hasWorkflowKeyword) {
      // Check against off-topic patterns
      for (const pattern of OFF_TOPIC_PATTERNS) {
        if (pattern.test(input)) {
          return {
            passed: false,
            violationType: GuardrailViolationType.OFF_TOPIC,
            severity: "medium",
            reason: "Request appears unrelated to workflow automation. Please describe a workflow you'd like to create.",
            detectedBy: "heuristic",
            confidence: 0.6
          };
        }
      }
    }
    
    return { passed: true, severity: "low", detectedBy: "heuristic" };
  }
  
  private async checkRateLimit(userId: string): Promise<GuardrailResult> {
    if (!redis) {
      return { passed: true, severity: "low", detectedBy: "rate_limit" };
    }
    
    const key = `ai-agent:rate:${userId}`;
    const count = await redis.incr(key);
    
    if (count === 1) {
      await redis.expire(key, 60); // 1 minute window
    }
    
    const limit = 10; // 10 requests per minute
    
    if (count > limit) {
      return {
        passed: false,
        violationType: GuardrailViolationType.RATE_LIMITED,
        severity: "medium",
        reason: `Rate limit exceeded. Please wait before making more requests.`,
        detectedBy: "rate_limit",
        confidence: 1
      };
    }
    
    return { passed: true, severity: "low", detectedBy: "rate_limit" };
  }
  
  private async checkQuota(userId: string): Promise<GuardrailResult> {
    // Check daily quota
    const today = new Date().toISOString().slice(0, 10);
    const key = `ai-agent:quota:daily:${userId}:${today}`;
    
    if (redis) {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, 86400); // 24 hours
      }
      
      const dailyLimit = 50; // 50 generations per day for free tier
      
      if (count > dailyLimit) {
        return {
          passed: false,
          violationType: GuardrailViolationType.QUOTA_EXCEEDED,
          severity: "high",
          reason: `Daily generation quota exceeded (${dailyLimit} per day). Upgrade for higher limits.`,
          detectedBy: "quota_check",
          confidence: 1
        };
      }
    }
    
    return { passed: true, severity: "low", detectedBy: "quota_check" };
  }
  
  // Validate output before returning to user
  validateOutput(output: unknown): GuardrailResult {
    // Check for PII in output
    // Check for harmful content
    // These could use additional LLM calls or rule-based checks
    
    return { passed: true, severity: "low", detectedBy: "output_validation" };
  }
}
```

### Guardrail Response Template

When a guardrail blocks a request, return a helpful message:

```typescript
// src/features/ai-agent/lib/guardrail-responses.ts

export function getGuardrailResponse(result: GuardrailResult): string {
  switch (result.violationType) {
    case "PROMPT_INJECTION":
      return `🛡️ I'm designed specifically to help create workflows. Your request appears to contain instructions that don't relate to workflow creation.

To get started, try:
- "Create a workflow that sends a WhatsApp message when a Razorpay payment is received"
- "Build an automation that adds new Google Form submissions to a Google Sheet"
- "Make a workflow that creates a Zoho CRM contact when someone fills a form"`;
    
    case "OFF_TOPIC":
      return `🤖 I'm Nodebase AI, your workflow creation assistant. I help you build automations for your business.

Your request doesn't seem to be about creating a workflow. Here's what I can help with:
- Payment processing workflows (Razorpay, Stripe)
- Customer communication (WhatsApp, Email, SMS)
- CRM automation (Zoho, HubSpot)
- Data synchronization (Google Sheets, Notion)
- AI-powered workflows (OpenAI, Claude, Gemini)`;
    
    case "RATE_LIMITED":
      return `⏳ You're sending requests too quickly. Please wait a moment and try again.`;
    
    case "QUOTA_EXCEEDED":
      return `📊 You've reached your daily workflow generation limit. 

Upgrade to Nodebase Pro for:
- Unlimited AI workflow generations
- Priority processing
- Advanced workflow templates`;
    
    case "EXCESSIVE_LENGTH":
      return `📝 Your request is too long. Please describe your workflow in under ${MAX_PROMPT_LENGTH} characters.`;
    
    default:
      return `❌ Your request couldn't be processed. Please try rephrasing it.`;
  }
}
```


---

## 9. Conversation Management

### Purpose

Manage multi-turn conversations for workflow refinement, debugging, and iterative improvements.

### Conversation Service

```typescript
// src/features/ai-agent/lib/conversation.ts

import prisma from "@/lib/db";
import { AIProvider } from "@/generated/prisma";
import { createId } from "@paralleldrive/cuid2";

interface CreateConversationParams {
  userId: string;
  title?: string;
}

interface AddMessageParams {
  conversationId: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  provider?: AIProvider;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
}

export class ConversationService {
  
  async create(params: CreateConversationParams) {
    return prisma.agentConversation.create({
      data: {
        userId: params.userId,
        title: params.title,
        messageCount: 0
      }
    });
  }
  
  async getOrCreateActive(userId: string) {
    // Get most recent conversation with < 50 messages
    const recent = await prisma.agentConversation.findFirst({
      where: {
        userId,
        messageCount: { lt: 50 },
        workflowCreated: false
      },
      orderBy: { updatedAt: "desc" }
    });
    
    if (recent) {
      return recent;
    }
    
    return this.create({ userId });
  }
  
  async addMessage(params: AddMessageParams) {
    const [message] = await prisma.$transaction([
      prisma.agentMessage.create({
        data: {
          conversationId: params.conversationId,
          role: params.role,
          content: params.content,
          provider: params.provider,
          model: params.model,
          inputTokens: params.inputTokens,
          outputTokens: params.outputTokens,
          latencyMs: params.latencyMs
        }
      }),
      prisma.agentConversation.update({
        where: { id: params.conversationId },
        data: { 
          messageCount: { increment: 1 },
          updatedAt: new Date()
        }
      })
    ]);
    
    return message;
  }
  
  async getHistory(conversationId: string, limit = 20) {
    return prisma.agentMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: limit
    });
  }
  
  async getConversationContext(conversationId: string) {
    const messages = await this.getHistory(conversationId);
    
    // Build context for LLM
    return messages.map(m => ({
      role: m.role.toLowerCase() as "user" | "assistant" | "system",
      content: m.content
    }));
  }
  
  async generateTitle(conversationId: string, firstMessage: string) {
    // Auto-generate title from first message
    const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? "..." : "");
    
    await prisma.agentConversation.update({
      where: { id: conversationId },
      data: { title }
    });
    
    return title;
  }
  
  async markWorkflowCreated(conversationId: string, workflowId: string) {
    await prisma.agentConversation.update({
      where: { id: conversationId },
      data: { workflowCreated: true }
    });
  }
  
  async getUserConversations(userId: string, limit = 20) {
    return prisma.agentConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: limit,
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    });
  }
  
  async deleteConversation(conversationId: string, userId: string) {
    // Verify ownership
    const conversation = await prisma.agentConversation.findFirst({
      where: { id: conversationId, userId }
    });
    
    if (!conversation) {
      throw new Error("Conversation not found or unauthorized");
    }
    
    await prisma.agentConversation.delete({
      where: { id: conversationId }
    });
  }
}

export const conversationService = new ConversationService();
```

---

## 10. Rate Limiting & Quota System

### Multi-Tier Rate Limiting

```typescript
// src/features/ai-agent/lib/rate-limiter.ts

import { redis } from "@/lib/redis";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

const RATE_LIMITS = {
  // Per-minute limit (burst protection)
  perMinute: {
    windowMs: 60 * 1000,
    maxRequests: 10,
    keyPrefix: "ai-agent:min"
  },
  
  // Per-hour limit
  perHour: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 50,
    keyPrefix: "ai-agent:hour"
  },
  
  // Per-day limit (quota)
  perDay: {
    windowMs: 24 * 60 * 60 * 1000,
    maxRequests: 100,
    keyPrefix: "ai-agent:day"
  }
};

export class RateLimiter {
  
  async checkLimit(userId: string, tier: "free" | "pro" | "enterprise" = "free"): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: Date;
  }> {
    if (!redis) {
      return { allowed: true, remaining: Infinity, resetAt: new Date() };
    }
    
    const limits = this.getLimitsForTier(tier);
    
    for (const [name, config] of Object.entries(RATE_LIMITS)) {
      const key = `${config.keyPrefix}:${userId}`;
      const limit = limits[name as keyof typeof limits];
      
      const count = await redis.incr(key);
      
      if (count === 1) {
        await redis.pexpire(key, config.windowMs);
      }
      
      if (count > limit) {
        const ttl = await redis.pttl(key);
        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(Date.now() + ttl)
        };
      }
    }
    
    // All checks passed
    const dayKey = `${RATE_LIMITS.perDay.keyPrefix}:${userId}`;
    const currentCount = await redis.get(dayKey);
    const dailyLimit = limits.perDay;
    
    return {
      allowed: true,
      remaining: dailyLimit - (parseInt(currentCount || "0")),
      resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    };
  }
  
  private getLimitsForTier(tier: "free" | "pro" | "enterprise") {
    switch (tier) {
      case "free":
        return { perMinute: 10, perHour: 50, perDay: 100 };
      case "pro":
        return { perMinute: 30, perHour: 200, perDay: 1000 };
      case "enterprise":
        return { perMinute: 100, perHour: 1000, perDay: 10000 };
    }
  }
  
  async recordUsage(userId: string, tokens: { input: number; output: number }, provider: string) {
    const today = new Date().toISOString().slice(0, 10);
    const month = new Date().toISOString().slice(0, 7);
    
    // Update daily usage
    await prisma.agentUsage.upsert({
      where: {
        userId_date: { userId, date: new Date(today) }
      },
      create: {
        userId,
        date: new Date(today),
        [`${provider}InputTokens`]: tokens.input,
        [`${provider}OutputTokens`]: tokens.output,
        generationsCompleted: 1
      },
      update: {
        [`${provider}InputTokens`]: { increment: tokens.input },
        [`${provider}OutputTokens`]: { increment: tokens.output },
        generationsCompleted: { increment: 1 }
      }
    });
  }
  
  async getUsageStats(userId: string) {
    const today = new Date().toISOString().slice(0, 10);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    
    const dailyUsage = await prisma.agentUsage.findUnique({
      where: { userId_date: { userId, date: new Date(today) } }
    });
    
    const monthlyUsage = await prisma.agentUsage.aggregate({
      where: {
        userId,
        date: { gte: monthStart }
      },
      _sum: {
        openaiInputTokens: true,
        openaiOutputTokens: true,
        claudeInputTokens: true,
        claudeOutputTokens: true,
        digitaloceanInputTokens: true,
        digitaloceanOutputTokens: true,
        generationsCompleted: true
      }
    });
    
    return {
      daily: dailyUsage,
      monthly: monthlyUsage._sum
    };
  }
}

export const rateLimiter = new RateLimiter();
```


---

## 11. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

**Goal:** Core generation capability

**Tasks:**
1. ✅ Create database schema migrations
2. ✅ Build node capability registry
3. ✅ Implement structured output schema
4. ✅ Create provider gateway
5. ✅ Build guardrails engine
6. ✅ Implement conversation service
7. ⬜ Create tRPC router
8. ⬜ Build basic chat UI component

**Files to Create:**
```
src/features/ai-agent/
├── config/
│   └── providers.ts
├── lib/
│   ├── provider-gateway.ts
│   ├── generator.ts
│   ├── guardrails.ts
│   ├── conversation.ts
│   ├── rate-limiter.ts
│   └── workflow-validator.ts
├── registry/
│   └── node-capabilities.ts
├── schemas/
│   └── workflow-generation.ts
├── server/
│   └── router.ts
└── components/
    └── chat-panel.tsx
```

### Phase 2: UI Integration (Week 3)

**Goal:** User-facing chat interface

**Tasks:**
1. ⬜ Create chat panel component
2. ⬜ Build workflow preview integration
3. ⬜ Implement credential wizard
4. ⬜ Add provider selector UI
5. ⬜ Build conversation history sidebar

**Components:**
```
src/features/ai-agent/components/
├── chat-panel.tsx        # Main chat interface
├── message-bubble.tsx    # Individual message
├── provider-selector.tsx # AI provider dropdown
├── workflow-preview.tsx  # Generated workflow display
├── credential-wizard.tsx # Step-by-step credential setup
└── conversation-list.tsx # Sidebar with history
```

### Phase 3: Advanced Features (Week 4)

**Goal:** Multi-turn refinement and debugging

**Tasks:**
1. ⬜ Implement workflow refinement
2. ⬜ Build conversational debug
3. ⬜ Add template library
4. ⬜ Create natural language modifications

### Phase 4: Polish & Scale (Week 5-6)

**Goal:** Production readiness

**Tasks:**
1. ⬜ Add comprehensive error handling
2. ⬜ Implement analytics dashboard
3. ⬜ Add usage tracking UI
4. ⬜ Optimize token usage
5. ⬜ Add workflow templates (10 India-specific)
6. ⬜ Load testing and optimization

---

## Environment Variables Required

```env
# AI Provider API Keys
DIGITALOCEAN_AI_API_KEY=your_do_ai_key
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key

# Already existing
DATABASE_URL=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

---

## File Structure Summary

```
src/features/ai-agent/
├── config/
│   ├── providers.ts              # AI provider configurations
│   └── constants.ts              # Limits, timeouts, etc.
├── lib/
│   ├── provider-gateway.ts       # Multi-provider routing
│   ├── generator.ts              # Main generation logic
│   ├── guardrails.ts             # Safety & validation
│   ├── conversation.ts           # Chat history management
│   ├── rate-limiter.ts           # Quota enforcement
│   ├── workflow-validator.ts     # DAG validation
│   ├── refinement.ts             # Workflow modification
│   └── debug.ts                  # Conversational debug
├── registry/
│   ├── node-capabilities.ts      # All nodes for AI context
│   └── templates.ts              # Workflow templates
├── schemas/
│   ├── workflow-generation.ts    # Zod schemas
│   └── refinement.ts             # Modification schemas
├── server/
│   └── router.ts                 # tRPC endpoints
├── inngest/
│   ├── generate-workflow.ts      # Background generation
│   └── channels.ts               # Realtime updates
└── components/
    ├── chat-panel.tsx            # Main UI
    ├── message-bubble.tsx        # Message display
    ├── provider-selector.tsx     # AI provider choice
    ├── workflow-preview.tsx      # Canvas preview
    ├── credential-wizard.tsx     # Credential setup
    └── conversation-list.tsx     # History sidebar

prisma/
└── schema/
    └── ai-agent.prisma           # DB schema

prisma/migrations/
└── 20260605120000_add_ai_agent_schema/
    └── migration.sql
```

---

## Summary

This document provides a complete technical specification for building Nodebase AI - an industry-grade workflow generation agent. Key features:

1. **Multi-Provider Support**: OpenAI, Claude, DigitalOcean GLM-5 with automatic fallback
2. **Comprehensive Guardrails**: Prompt injection detection, rate limiting, quota management
3. **Full Context Awareness**: Node capability registry enables accurate workflow generation
4. **Conversational Interface**: Multi-turn refinement, debugging, and modifications
5. **Scalable Architecture**: Inngest for background processing, Redis for rate limiting
6. **India-Focused**: Templates and nodes optimized for Indian businesses

**Next Step**: Begin implementation with Phase 1 (Foundation) tasks.
