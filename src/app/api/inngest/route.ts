import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { executeWorkflow, executeErrorTriggeredWorkflow } from "@/inngest/functions";
import { schedulePoller } from "@/inngest/functions/schedule-poller";
import { gmailWatchRenewal } from "@/inngest/functions/gmail-watch-renewal";
import { gmailTriggerHandler } from "@/inngest/functions/gmail-trigger-handler";
import { backgroundGenerateWorkflow, backgroundRefineWorkflow, backgroundDebugWorkflow } from "@/features/ai-agent/inngest/generate-workflow";

export const runtime = "nodejs"
export const maxDuration = 800

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    executeWorkflow, 
    executeErrorTriggeredWorkflow, 
    schedulePoller, 
    gmailWatchRenewal, 
    gmailTriggerHandler,
    backgroundGenerateWorkflow,
    backgroundRefineWorkflow,
    backgroundDebugWorkflow
  ],
});
