import { createTRPCRouter, premiumProcedure, protectedProcedure } from "@/trpc/init";
import prisma from "@/lib/db";
import { generateSlug } from "random-word-slugs"
import { z } from 'zod'
import { PAGINATION } from "@/config/constants";
import { NodeType, Prisma } from "@/generated/prisma"
import { Node, Edge } from "@xyflow/react"

import { inngest } from "@/inngest/client";
import { sendWorkflowExecution } from "@/inngest/utils";
import { checkExecutionLimit, incrementExecutionCount } from "@/lib/execution-gate";
import { tenantIdForUser } from "@/lib/tenant";




export const workflowsRouter = createTRPCRouter({

    execute: protectedProcedure
        .input(z.object({ id: z.string(), triggerData: z.record(z.string(), z.unknown()).optional() }))
        .mutation(async ({ input, ctx }) => {
            await checkExecutionLimit(ctx.auth.user.id)

            const workflow = await prisma.workflow.findUniqueOrThrow({
                where: {
                    id: input.id,
                    userId: ctx.auth.user.id
                },

            });


            await sendWorkflowExecution({
                workflowId: input.id,
                ...(input.triggerData ? { triggerData: input.triggerData } : {}),
            })

            await incrementExecutionCount(ctx.auth.user.id)

            return workflow
        }),
    create: protectedProcedure.mutation(({ ctx }) => {
        const tenantId = tenantIdForUser(ctx.auth.user.id)
        return prisma.workflow.create({
            data: {
                name: generateSlug(3),
                userId: ctx.auth.user.id,
                tenantId,
                nodes: {
                    create: {
                        type: NodeType.INITIAL,
                        position: {
                            x: 0,
                            y: 0
                        },
                        name: NodeType.INITIAL
                    }
                },
            },
        });
    }),
    remove: protectedProcedure
        .input(z.object({
            id: z.string()
        }))
        .mutation(async ({ ctx, input }) => {
            return prisma.workflow.delete({
                where: {
                    id: input.id,
                    userId: ctx.auth.user.id,
                },
            });
        }),

    updateName: protectedProcedure
        .input(z.object({
            id: z.string(),
            name: z.string().min(1)
        }))
        .mutation(async ({ ctx, input }) => {
            return prisma.workflow.update({
                where: {
                    id: input.id,
                    userId: ctx.auth.user.id,
                },
                data: {
                    name: input.name,
                },
            });
        }),


    update: protectedProcedure
        .input(z.object({
            id: z.string(),
            nodes: z.array(
                z.object({
                    id: z.string(),
                    type: z.string().nullish(),
                    position: z.object({
                        x: z.number(),
                        y: z.number(),
                    }),
                    // unknown: free-form node config JSON from the editor (validated per-node later)
                    data: z.record(z.string(), z.unknown().optional()),

                })
            ),
            edges: z.array(
                z.object({

                    source: z.string(),
                    target: z.string(),
                    sourceHandle: z.string().nullish(),
                    targetHandle: z.string().nullish(),
                })
            )

        }))
        .mutation(async ({ ctx, input }) => {
            const { nodes, edges, id } = input
            const workflow = await prisma.workflow.findUniqueOrThrow({
                where: {
                    id: id,
                    userId: ctx.auth.user.id,
                },
            });

            return await prisma.$transaction(async (tx) => {

                await tx.node.deleteMany({
                    where: {
                        workflowId: id
                    }
                })
                await tx.node.createMany({
                    data: nodes.map((node) => ({
                        id: node.id,
                        workflowId: id,
                        name: node.type || "unknown",
                        type: (node.type as NodeType) || NodeType.INITIAL,
                        position: node.position,
                        // Prisma InputJsonValue: free-form editor JSON
                        data: (node.data ?? {}) as Prisma.InputJsonValue,
                    })),
                });
                //create connections
                await tx.connection.createMany({
                    data: edges.map((edge) => ({

                        workflowId: id,
                        fromNodeId: edge.source,
                        toNodeId: edge.target,
                        fromOutput: edge.sourceHandle || "main",
                        toInput: edge.targetHandle || "main",
                    })),
                })

                // Touch updatedAt + ensure tenantId always set (self-heal pre-migration rows)
                await tx.workflow.update({
                    where: {
                        id,
                    },
                    data: {
                        updatedAt: new Date(),
                        tenantId:
                          workflow.tenantId && workflow.tenantId.trim() !== ""
                            ? workflow.tenantId
                            : tenantIdForUser(ctx.auth.user.id),
                    }
                })
                return workflow

            });
        }),



    getOne: protectedProcedure
        .input(z.object({
            id: z.string()
        }))

        .query(async ({ ctx, input }) => {
            const workflow = await prisma.workflow.findUniqueOrThrow({
                where: {
                    id: input.id,
                    userId: ctx.auth.user.id,
                },
                include: { nodes: true, connections: true }
            });

            // 
            const nodes: Node[] = workflow.nodes.map((node) => ({
                id: node.id,
                type: node.type,
                position: node.position as { x: number, y: number },
                data: (node.data as Record<string, unknown>) || {},
            }));

            const edges: Edge[] = workflow.connections.map((connection) => ({
                id: connection.id,
                source: connection.fromNodeId,
                target: connection.toNodeId,
                sourceHandle: connection.fromOutput,
                targetHandle: connection.toInput,
            }));
            return {
                nodes,
                edges,
                id: workflow.userId,
                name: workflow.name
            }

        }),




    getMany: protectedProcedure
        .input(z.object({
            page: z.number().default(PAGINATION.DEFAULT_PAGE),
            pageSize: z.number().max(PAGINATION.MAX_PAGE_SIZE).min(PAGINATION.MIN_PAGE_SIZE).default(PAGINATION.DEFAULT_PAGE_SIZE),
            search: z.string().default(''),

        }))
        .query(async ({ ctx, input }) => {
            const { page, pageSize, search } = input
            const [items, totalCount] = await Promise.all([
                prisma.workflow.findMany({
                    skip: (page - 1) * pageSize,
                    take: pageSize,
                    where: {
                        userId: ctx.auth.user.id,
                        name: {
                            contains: search,
                            mode: 'insensitive'
                        },
                    },
                    orderBy: {
                        updatedAt: 'desc'
                    },
                }),

                prisma.workflow.count({

                    where: {
                        userId: ctx.auth.user.id,
                        name: {
                            contains: search,
                            mode: 'insensitive'
                        },

                    },

                })
            ]);

            const totalPages = Math.ceil(totalCount / pageSize);
            const hasNextPage = page < totalPages;
            const hasPreviousPage = page > 1;

            return {
                items,
                page,
                pageSize,
                totalCount,
                totalPages,
                hasNextPage,
                hasPreviousPage,
            }

        })
});