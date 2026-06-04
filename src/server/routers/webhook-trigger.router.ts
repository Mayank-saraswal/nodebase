import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import prisma from "@/lib/db";
import { randomUUID } from "crypto";
import { z } from "zod";
import { encryptWebhookSecret } from "@/lib/webhook-secret";

export const webhookTriggerRouter = createTRPCRouter({
    getByWorkflowId: protectedProcedure
        .input(z.object({ workflowId: z.string() }))
        .query(async ({ input }) => {
            return prisma.webhookTrigger.findUnique({
                where: { workflowId: input.workflowId },
            });
        }),

    createWebhookTrigger: protectedProcedure
        .input(z.object({ workflowId: z.string() }))
        .mutation(async ({ input }) => {
            return prisma.webhookTrigger.create({
                data: {
                    workflowId: input.workflowId,
                    secretTokenEncrypted: encryptWebhookSecret(randomUUID()),
                },
            });
        }),
});
