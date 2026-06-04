import { z } from "zod"
import { createTRPCRouter, protectedProcedure } from "@/trpc/init"
import prisma from "@/lib/db"
import { TRPCError } from "@trpc/server"

const slackOperationEnum = z.enum([
  "MESSAGE_SEND_WEBHOOK",
  "MESSAGE_SEND",
  "MESSAGE_UPDATE",
  "MESSAGE_DELETE",
  "MESSAGE_GET_PERMALINK",
  "MESSAGE_SCHEDULE",
  "CHANNEL_GET",
  "CHANNEL_LIST",
  "CHANNEL_CREATE",
  "CHANNEL_ARCHIVE",
  "CHANNEL_UNARCHIVE",
  "CHANNEL_INVITE",
  "CHANNEL_KICK",
  "CHANNEL_SET_TOPIC",
  "CHANNEL_SET_PURPOSE",
  "USER_GET",
  "USER_GET_BY_EMAIL",
  "USER_LIST",
  "USER_SET_STATUS",
  "FILE_UPLOAD",
  "FILE_GET",
  "FILE_DELETE",
  "REACTION_ADD",
  "REACTION_REMOVE",
  "REACTION_GET",
])

const upsertInput = z.object({
  nodeId: z.string(),
  workflowId: z.string(),
  credentialId: z.string().optional(),
  operation: slackOperationEnum,
  variableName: z.string().default("slack"),
  channel: z.string().default(""),
  message: z.string().default(""),
  threadTs: z.string().default(""),
  messageTs: z.string().default(""),
  channelName: z.string().default(""),
  channelTopic: z.string().default(""),
  channelPurpose: z.string().default(""),
  userId: z.string().default(""),
  emoji: z.string().default(""),
  blockKit: z.string().default(""),
  botName: z.string().default(""),
  iconEmoji: z.string().default(""),
  unfurlLinks: z.boolean().default(true),
  channelTypes: z.string().default("public_channel,private_channel"),
  limit: z.number().default(100),
  excludeArchived: z.boolean().default(true),
  isPrivate: z.boolean().default(false),
  filename: z.string().default(""),
  fileType: z.string().default(""),
  title: z.string().default(""),
  initialComment: z.string().default(""),
  email: z.string().default(""),
  statusText: z.string().default(""),
  statusEmoji: z.string().default(""),
  statusExpiration: z.string().default(""),
  sendAt: z.string().default(""),
  content: z.string().default(""),
  fileId: z.string().default(""),
})

export const slackRouter = createTRPCRouter({
  getByNodeId: protectedProcedure
    .input(z.object({ nodeId: z.string() }))
    .query(async ({ input, ctx }) => {
      const node = await prisma.slackNode.findUnique({
        where: { nodeId: input.nodeId },
        include: { workflow: { select: { userId: true } } },
      })
      if (!node) return null
      if (node.workflow.userId !== ctx.auth.user.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" })
      }
      return node
    }),

  upsert: protectedProcedure.input(upsertInput).mutation(async ({ input, ctx }) => {
    const authUserId = ctx.auth.user.id
    const workflow = await prisma.workflow.findUnique({
      where: { id: input.workflowId },
      select: { userId: true },
    })
    if (!workflow || workflow.userId !== authUserId) {
      throw new TRPCError({ code: "UNAUTHORIZED" })
    }

    const data = {
      credentialId: input.credentialId,
      operation: input.operation,
      variableName: input.variableName,
      channel: input.channel,
      message: input.message,
      threadTs: input.threadTs,
      messageTs: input.messageTs,
      channelName: input.channelName,
      channelTopic: input.channelTopic,
      channelPurpose: input.channelPurpose,
      userId: input.userId,
      emoji: input.emoji,
      blockKit: input.blockKit,
      botName: input.botName,
      iconEmoji: input.iconEmoji,
      unfurlLinks: input.unfurlLinks,
      channelTypes: input.channelTypes,
      limit: input.limit,
      excludeArchived: input.excludeArchived,
      isPrivate: input.isPrivate,
      filename: input.filename,
      fileType: input.fileType,
      title: input.title,
      initialComment: input.initialComment,
      email: input.email,
      statusText: input.statusText,
      statusEmoji: input.statusEmoji,
      statusExpiration: input.statusExpiration,
      sendAt: input.sendAt,
      content: input.content,
      fileId: input.fileId,
    }

    return prisma.slackNode.upsert({
      where: { nodeId: input.nodeId },
      create: {
        nodeId: input.nodeId,
        workflowId: input.workflowId,
        ...data,
      },
      update: data,
    })
  }),

  delete: protectedProcedure
    .input(z.object({ nodeId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const node = await prisma.slackNode.findUnique({
        where: { nodeId: input.nodeId },
        include: { workflow: { select: { userId: true } } },
      })
      if (!node || node.workflow.userId !== ctx.auth.user.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" })
      }
      return prisma.slackNode.delete({
        where: { nodeId: input.nodeId },
      })
    }),
})
