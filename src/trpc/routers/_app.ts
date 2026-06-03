
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
import { ifElseRouter } from '@/server/routers/if-else.router';
import { gmailRouter } from '@/server/routers/gmail.router';
import { setVariableRouter } from '@/server/routers/set-variable.router';
import { billingRouter } from '@/server/routers/billing.router';
import { googleSheetsRouter } from '@/server/routers/google-sheets.router';
import { googleDriveRouter } from '@/server/routers/google-drive.router';
import { whatsappRouter } from '@/server/routers/whatsapp.router';
import { codeRouter } from '@/server/routers/code.router';
import { loopRouter } from '@/server/routers/loop.router';
import { notionRouter } from '@/server/routers/notion.router';
import { razorpayRouter } from '@/server/routers/razorpay.router';
import { slackRouter } from '@/server/routers/slack.router';
import { switchRouter } from '@/server/routers/switch.router';
import { waitRouter } from '@/server/routers/wait.router';
import { mergeRouter } from '@/server/routers/merge.router';
import { errorTriggerRouter } from '@/server/routers/error-trigger.router';
import { razorpayTriggerRouter } from '@/server/routers/razorpay-trigger.router';
import { whatsappTriggerRouter } from '@/server/routers/whatsapp-trigger.router';
import { msg91Router } from '@/server/routers/msg91.router';
import { shiprocketRouter } from '@/server/routers/shiprocket.router';
import { zohoCrmRouter } from '@/server/routers/zoho-crm.router';
import { hubspotRouter } from '@/server/routers/hubspot.router';
import { freshdeskRouter } from '@/server/routers/freshdesk.router';
import { aiRouter } from '@/server/routers/ai.router';
import { mediaUploadRouter } from '@/server/routers/media-upload.router';
import { sortRouter } from '@/server/routers/sort.router';
import { filterRouter } from '@/server/routers/filter.router';
import { cashfreeRouter } from '@/server/routers/cashfree.router';
import { aggregateRouter } from '@/server/routers/aggregate.router';
import { postgresRouter } from '@/server/routers/postgres.router';


export const appRouter = createTRPCRouter({
  workflows: workflowsRouter,
  credentials:credentialsRouter,
  executions:executionRouter,
  webhookTrigger: webhookTriggerRouter,
  scheduleTrigger: scheduleTriggerRouter,
  ifElse: ifElseRouter,
  gmail: gmailRouter,
  setVariable: setVariableRouter,
  billing: billingRouter,
  googleSheets: googleSheetsRouter,
  googleDrive: googleDriveRouter,
  code: codeRouter,
  whatsapp: whatsappRouter,
  loop: loopRouter,
  notion: notionRouter,
  razorpay: razorpayRouter,
  slack: slackRouter,
  switch: switchRouter,
  wait: waitRouter,
  merge: mergeRouter,
  errorTrigger: errorTriggerRouter,
  razorpayTrigger: razorpayTriggerRouter,
  whatsappTrigger: whatsappTriggerRouter,
  msg91: msg91Router,
  shiprocket: shiprocketRouter,
  zohoCrm: zohoCrmRouter,
  hubspot: hubspotRouter,
  freshdesk: freshdeskRouter,
  ai: aiRouter,
  mediaUpload: mediaUploadRouter,
  sort: sortRouter,
  filter: filterRouter,
  cashfree: cashfreeRouter,
  aggregate: aggregateRouter,
  postgres: postgresRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;
