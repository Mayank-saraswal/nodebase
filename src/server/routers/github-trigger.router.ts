import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import prisma from "@/lib/db";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";
import { encryptWebhookSecret } from "@/lib/webhook-secret";

const upsertTriggerInput = z.object({
  nodeId: z.string(),
  workflowId: z.string(),
  owner: z.string().default(""),
  repo: z.string().default(""),
  events: z.string().default("[\"push\"]"),
});

export const githubTriggerRouter = createTRPCRouter({
  getByNodeId: protectedProcedure
    .input(z.object({ nodeId: z.string() }))
    .query(async ({ input, ctx }) => {
      const node = await prisma.gitHubTriggerNode.findUnique({
        where: { nodeId: input.nodeId },
        include: { workflow: { select: { userId: true } } },
      });
      if (!node) return null;
      if (node.workflow.userId !== ctx.auth.user.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      return node;
    }),

  upsert: protectedProcedure.input(upsertTriggerInput).mutation(async ({ input, ctx }) => {
    const authUserId = ctx.auth.user.id;
    const workflow = await prisma.workflow.findUnique({
      where: { id: input.workflowId },
      select: { userId: true },
    });
    if (!workflow || workflow.userId !== authUserId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    // Generate webhook ID and Secret if they don't exist
    const existingNode = await prisma.gitHubTriggerNode.findUnique({
      where: { nodeId: input.nodeId }
    });

    const webhookId = existingNode?.webhookId || crypto.randomUUID();

    // Generate and encrypt new secret if none exists
    let webhookSecretEncrypted = existingNode?.webhookSecretEncrypted;
    if (!webhookSecretEncrypted) {
      const plainSecret = crypto.randomBytes(32).toString("hex");
      webhookSecretEncrypted = encryptWebhookSecret(plainSecret);
    }

    const data = {
      owner: input.owner,
      repo: input.repo,
      events: input.events,
      webhookId,
      webhookSecretEncrypted,
    };

    return prisma.gitHubTriggerNode.upsert({
      where: { nodeId: input.nodeId },
      create: {
        nodeId: input.nodeId,
        workflowId: input.workflowId,
        ...data,
      },
      update: data,
    });
  }),

  delete: protectedProcedure
    .input(z.object({ nodeId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const node = await prisma.gitHubTriggerNode.findUnique({
        where: { nodeId: input.nodeId },
        include: { workflow: { select: { userId: true } } },
      });
      if (!node || node.workflow.userId !== ctx.auth.user.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      return prisma.gitHubTriggerNode.delete({
        where: { nodeId: input.nodeId },
      });
    }),
});
