
import prisma from '@/lib/db';
import {  createTRPCRouter, protectedProcedure } from '../init';
import { inngest } from '@/inngest/client';
import { workflowsRouter } from '@/features/workflows/server/routers';

import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { credentialsRouter } from '@/features/credentials/server/routers';
import { executionRouter } from '@/features/executions/server/routers';
import { webhookTriggerRouter } from '@/server/routers/webhook-trigger.router';
import { scheduleTriggerRouter } from '@/server/routers/schedule-trigger.router';
import { billingRouter } from '@/server/routers/billing.router';
import { errorTriggerRouter } from '@/server/routers/error-trigger.router';
import { razorpayTriggerRouter } from '@/server/routers/razorpay-trigger.router';
import { whatsappTriggerRouter } from '@/server/routers/whatsapp-trigger.router';
import { githubTriggerRouter } from '@/server/routers/github-trigger.router';
import { aiAgentRouter } from '@/server/routers/ai-agent.router';



export const appRouter = createTRPCRouter({
  workflows: workflowsRouter,
  credentials:credentialsRouter,
  executions:executionRouter,
  webhookTrigger: webhookTriggerRouter,
  scheduleTrigger: scheduleTriggerRouter,
  billing: billingRouter,
  errorTrigger: errorTriggerRouter,
  razorpayTrigger: razorpayTriggerRouter,
  whatsappTrigger: whatsappTriggerRouter,
  githubTrigger: githubTriggerRouter,
  aiAgent: aiAgentRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;
