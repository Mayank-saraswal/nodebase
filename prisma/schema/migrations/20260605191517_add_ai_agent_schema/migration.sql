-- CreateEnum
CREATE TYPE "AgentAIProvider" AS ENUM ('OPENAI', 'CLAUDE', 'DIGITALOCEAN_GLM5');

-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AgentMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "GuardrailViolationType" AS ENUM ('PROMPT_INJECTION', 'OFF_TOPIC', 'EXCESSIVE_LENGTH', 'RATE_LIMITED', 'QUOTA_EXCEEDED', 'HARMFUL_CONTENT', 'PII_DETECTED');

-- AlterTable
ALTER TABLE "GitHubNode" ADD COLUMN     "continueOnFail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "variableName" TEXT NOT NULL DEFAULT 'github';

-- CreateTable
CREATE TABLE "agent_conversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "workflowCreated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "AgentMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "provider" "AgentAIProvider",
    "model" TEXT,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_generation" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "refinedFromId" TEXT,
    "status" "GenerationStatus" NOT NULL DEFAULT 'PENDING',
    "generatedWorkflowId" TEXT,
    "errorMessage" TEXT,
    "provider" "AgentAIProvider",
    "model" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "latencyMs" INTEGER,
    "guardrailPassed" BOOLEAN NOT NULL DEFAULT true,
    "guardrailReason" TEXT,
    "generatedNodes" JSONB,
    "generatedConnections" JSONB,
    "credentialRequirements" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_generation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_usage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "openaiInputTokens" INTEGER NOT NULL DEFAULT 0,
    "openaiOutputTokens" INTEGER NOT NULL DEFAULT 0,
    "claudeInputTokens" INTEGER NOT NULL DEFAULT 0,
    "claudeOutputTokens" INTEGER NOT NULL DEFAULT 0,
    "digitaloceanInputTokens" INTEGER NOT NULL DEFAULT 0,
    "digitaloceanOutputTokens" INTEGER NOT NULL DEFAULT 0,
    "generationsRequested" INTEGER NOT NULL DEFAULT 0,
    "generationsCompleted" INTEGER NOT NULL DEFAULT 0,
    "generationsFailed" INTEGER NOT NULL DEFAULT 0,
    "generationsRejected" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_template" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "nodes" JSONB NOT NULL,
    "connections" JSONB NOT NULL,
    "requiredCredentials" JSONB NOT NULL,
    "tags" JSONB,
    "isIndiaSpecific" BOOLEAN NOT NULL DEFAULT false,
    "popularity" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_guardrail_log" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT,
    "violationType" "GuardrailViolationType" NOT NULL,
    "severity" TEXT NOT NULL,
    "input" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "detectedBy" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_guardrail_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_preference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "preferredProvider" "AgentAIProvider" NOT NULL DEFAULT 'OPENAI',
    "dailyGenerationLimit" INTEGER,
    "monthlyGenerationLimit" INTEGER,
    "enableMultiTurn" BOOLEAN NOT NULL DEFAULT true,
    "enableTemplates" BOOLEAN NOT NULL DEFAULT true,
    "enableDebug" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_preference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_conversation_userId_updatedAt_idx" ON "agent_conversation"("userId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "agent_message_conversationId_createdAt_idx" ON "agent_message"("conversationId", "createdAt" ASC);

-- CreateIndex
CREATE INDEX "agent_generation_userId_createdAt_idx" ON "agent_generation"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "agent_generation_status_idx" ON "agent_generation"("status");

-- CreateIndex
CREATE INDEX "agent_usage_userId_date_idx" ON "agent_usage"("userId", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "agent_usage_userId_date_key" ON "agent_usage"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ai_template_name_key" ON "ai_template"("name");

-- CreateIndex
CREATE INDEX "ai_template_category_idx" ON "ai_template"("category");

-- CreateIndex
CREATE INDEX "ai_template_popularity_idx" ON "ai_template"("popularity" DESC);

-- CreateIndex
CREATE INDEX "ai_guardrail_log_userId_createdAt_idx" ON "ai_guardrail_log"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ai_guardrail_log_violationType_idx" ON "ai_guardrail_log"("violationType");

-- CreateIndex
CREATE UNIQUE INDEX "ai_preference_userId_key" ON "ai_preference"("userId");

-- CreateIndex
CREATE INDEX "GmailWatcher_workflowId_idx" ON "GmailWatcher"("workflowId");

-- CreateIndex
CREATE INDEX "GmailWatcher_nodeId_idx" ON "GmailWatcher"("nodeId");

-- CreateIndex
CREATE INDEX "GoogleDriveNode_workflowId_idx" ON "GoogleDriveNode"("workflowId");

-- CreateIndex
CREATE INDEX "GoogleDriveNode_nodeId_idx" ON "GoogleDriveNode"("nodeId");

-- CreateIndex
CREATE INDEX "SortNode_workflowId_idx" ON "SortNode"("workflowId");

-- CreateIndex
CREATE INDEX "SortNode_nodeId_idx" ON "SortNode"("nodeId");

-- CreateIndex
CREATE INDEX "SwitchNode_workflowId_idx" ON "SwitchNode"("workflowId");

-- CreateIndex
CREATE INDEX "WhatsAppNode_workflowId_idx" ON "WhatsAppNode"("workflowId");

-- CreateIndex
CREATE INDEX "WhatsAppNode_nodeId_idx" ON "WhatsAppNode"("nodeId");

-- AddForeignKey
ALTER TABLE "agent_conversation" ADD CONSTRAINT "agent_conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_message" ADD CONSTRAINT "agent_message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "agent_conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_generation" ADD CONSTRAINT "agent_generation_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "agent_conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_generation" ADD CONSTRAINT "agent_generation_refinedFromId_fkey" FOREIGN KEY ("refinedFromId") REFERENCES "agent_generation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_usage" ADD CONSTRAINT "agent_usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_guardrail_log" ADD CONSTRAINT "ai_guardrail_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_preference" ADD CONSTRAINT "ai_preference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
