import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import prisma from "@/lib/db";
import { TRPCError } from "@trpc/server";
import { GitHubOperation } from "@/generated/prisma";

const upsertInput = z.object({
  nodeId: z.string(),
  workflowId: z.string(),
  credentialId: z.string().optional(),
  operation: z.nativeEnum(GitHubOperation).default("USER_GET_CURRENT"),

  // Common Fields
  owner: z.string().default(""),
  repo: z.string().default(""),
  branch: z.string().default(""),
  filePath: z.string().default(""),
  fileContent: z.string().default(""),
  commitMessage: z.string().default(""),

  // Issue / PR Fields
  issueNumber: z.string().default(""),
  pullNumber: z.string().default(""),
  title: z.string().default(""),
  body: z.string().default(""),
  state: z.string().default(""),
  labels: z.string().default(""),
  assignees: z.string().default(""),
  headBranch: z.string().default(""),
  baseBranch: z.string().default(""),

  // Workflow / Event Fields
  workflowId_github: z.string().default(""),
  eventType: z.string().default(""),
  clientPayload: z.string().default(""),

  // Search / Filter Fields
  searchQuery: z.string().default(""),
  perPage: z.number().default(30),
  
  // Releases / Codespaces / etc
  tagName: z.string().default(""),
  releaseName: z.string().default(""),
  draft: z.boolean().default(false),
  prerelease: z.boolean().default(false),
  
  // Generic JSON options
  options: z.any().optional(),
});

export const githubRouter = createTRPCRouter({
  getByNodeId: protectedProcedure
    .input(z.object({ nodeId: z.string() }))
    .query(async ({ input, ctx }) => {
      const node = await prisma.gitHubNode.findUnique({
        where: { nodeId: input.nodeId },
        include: { workflow: { select: { userId: true } } },
      });
      if (!node) return null;
      if (node.workflow.userId !== ctx.auth.user.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      return node;
    }),

  upsert: protectedProcedure.input(upsertInput).mutation(async ({ input, ctx }) => {
    const authUserId = ctx.auth.user.id;
    const workflow = await prisma.workflow.findUnique({
      where: { id: input.workflowId },
      select: { userId: true },
    });
    if (!workflow || workflow.userId !== authUserId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const data = {
      credentialId: input.credentialId,
      operation: input.operation,
      owner: input.owner,
      repo: input.repo,
      branch: input.branch,
      filePath: input.filePath,
      fileContent: input.fileContent,
      commitMessage: input.commitMessage,
      issueNumber: input.issueNumber,
      pullNumber: input.pullNumber,
      title: input.title,
      body: input.body,
      state: input.state,
      labels: input.labels,
      assignees: input.assignees,
      headBranch: input.headBranch,
      baseBranch: input.baseBranch,
      workflowId_github: input.workflowId_github,
      eventType: input.eventType,
      clientPayload: input.clientPayload,
      searchQuery: input.searchQuery,
      perPage: input.perPage,
      tagName: input.tagName,
      releaseName: input.releaseName,
      draft: input.draft,
      prerelease: input.prerelease,
      options: input.options || {},
    };

    return prisma.gitHubNode.upsert({
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
      const node = await prisma.gitHubNode.findUnique({
        where: { nodeId: input.nodeId },
        include: { workflow: { select: { userId: true } } },
      });
      if (!node || node.workflow.userId !== ctx.auth.user.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      return prisma.gitHubNode.delete({
        where: { nodeId: input.nodeId },
      });
    }),
});
