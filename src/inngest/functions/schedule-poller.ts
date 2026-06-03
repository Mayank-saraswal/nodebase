import { CronExpressionParser } from "cron-parser";
import { inngest } from "@/inngest/client";
import prisma from "@/lib/db";

export const schedulePoller = inngest.createFunction(
  {
    id: "schedule-poller",
    name: "Schedule Trigger Poller",
  },
  { cron: "* * * * *" },
  async ({ step }) => {
    return await step.run("check-scheduled-workflows", async () => {
      const activeTriggers = await prisma.scheduleTrigger.findMany({
        where: { isActive: true },
        include: { workflow: true },
      });

      const now = new Date();
      const fired: string[] = [];
      // Truncate to the current minute for deterministic deduplication
      const minuteKey = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}-${now.getUTCHours()}-${now.getUTCMinutes()}`;

      for (const trigger of activeTriggers) {
        try {
          const cronIterator = CronExpressionParser.parse(
            trigger.cronExpression,
            {
              currentDate: now,
              tz: trigger.timezone ?? "UTC",
            },
          );

          const prev = cronIterator.prev();
          const secondsSincePrev =
            (now.getTime() - prev.toDate().getTime()) / 1000;

          if (secondsSincePrev <= 60) {
            // Use a deterministic event ID to prevent duplicate executions
            // if the poller runs multiple times within the same minute
            const eventId = `sched-${trigger.workflowId}-${minuteKey}`;
            await inngest.send({
              name: "workflow/execute.workflow",
              id: eventId,
              data: {
                workflowId: trigger.workflowId,
                triggerData: {
                  schedule: {
                    firedAt: now.toISOString(),
                    workflowId: trigger.workflowId,
                    cronExpression: trigger.cronExpression,
                    timezone: trigger.timezone ?? "UTC",
                  },
                },
              },
            });
            fired.push(trigger.workflowId);
          }
        } catch (err) {
          console.error(
            `Failed to process schedule trigger for workflow ${trigger.workflowId}:`,
            err,
          );
        }
      }

      return {
        checked: activeTriggers.length,
        fired: fired.length,
        firedWorkflows: fired,
      };
    });
  },
);
