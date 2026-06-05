import { createTRPCRouter, premiumProcedure, protectedProcedure } from "@/trpc/init";
import prisma from "@/lib/db";
import { z } from 'zod'
import { PAGINATION } from "@/config/constants";
import { CredentialType } from "@/generated/prisma";
import { encrypt, decrypt } from "@/lib/encryption";
import { TRPCError } from "@trpc/server";




export const credentialsRouter = createTRPCRouter({



    create: protectedProcedure
        .input(z.object({
            name: z.string().min(1, "Name is Required"),
            value: z.string().min(1, "Value is Required"),
            type: z.enum(CredentialType)
        }))
        .mutation(({ ctx, input }) => {
            const { name, value, type } = input;

            return prisma.credential.create({
                data: {
                    name,
                    userId: ctx.auth.user.id,
                    value: encrypt(value),
                    type,
                },
            });
        }),
    remove: protectedProcedure
        .input(z.object({
            id: z.string()
        }))
        .mutation(async ({ ctx, input }) => {
            return prisma.credential.delete({
                where: {
                    id: input.id,
                    userId: ctx.auth.user.id,
                },
            });
        }),




    updateName: protectedProcedure
        .input(z.object({ id: z.string(), name: z.string().min(1) }))
        .mutation(async ({ input, ctx }) => {
            const credential = await prisma.credential.findUnique({
                where: { id: input.id },
            })
            if (!credential || credential.userId !== ctx.auth.user.id) {
                throw new TRPCError({ code: "UNAUTHORIZED" })
            }
            return prisma.credential.update({
                where: { id: input.id },
                data: { name: input.name },
            })
        }),

    update: protectedProcedure
        .input(z.object({
            id: z.string(),
            name: z.string().min(1, "Name is Required"),
            value: z.string().min(1, "Value is Required"),
            type: z.enum(CredentialType)


        }))
        .mutation(async ({ ctx, input }) => {
            const { name, id, type, value } = input
            const credential = await prisma.credential.findUniqueOrThrow({
                where: {
                    id,
                    userId: ctx.auth.user.id,
                },
            });
            return prisma.credential.update({
                where: {
                    id,
                    userId: ctx.auth.user.id,
                },
                data: {
                    name,
                    value: encrypt(value),
                    type,
                },
            });
        }),



    getOne: protectedProcedure
        .input(z.object({
            id: z.string()
        }))
        .query(async ({ ctx, input }) => {
            const credential = await prisma.credential.findUniqueOrThrow({
                where: {
                    id: input.id,
                    userId: ctx.auth.user.id,
                },
            });

            // Decrypt display info for Google OAuth credentials — never return raw value
            const googleTypes: CredentialType[] = [
                CredentialType.GMAIL,
                CredentialType.GMAIL_OAUTH,
                CredentialType.GOOGLE_SHEETS,
                CredentialType.GOOGLE_DRIVE,
            ]
            
            let connectedEmail: string | undefined
            let isGoogleOAuth = false
            let connectedGithubUsername: string | undefined
            let isGithubOAuth = false

            if (googleTypes.includes(credential.type)) {
                try {
                    const parsed = JSON.parse(decrypt(credential.value)) as {
                        email?: string
                        refreshToken?: string
                    }
                    connectedEmail = parsed.email
                    isGoogleOAuth = !!parsed.refreshToken
                } catch { /* not an OAuth credential — ignore */ }

                // Strip value for Google — UI uses connectedEmail/isGoogleOAuth instead
                const { value: _v, ...googleFields } = credential
                return { ...googleFields, connectedEmail, isGoogleOAuth, connectedGithubUsername: undefined, isGithubOAuth: false }
            }

            if (credential.type === CredentialType.GITHUB_APP) {
                try {
                    const parsed = JSON.parse(decrypt(credential.value)) as {
                        username?: string
                        accessToken?: string
                    }
                    connectedGithubUsername = parsed.username
                    isGithubOAuth = !!parsed.accessToken
                } catch { /* ignore */ }

                const { value: _v, ...githubFields } = credential
                return { ...githubFields, connectedEmail: undefined, isGoogleOAuth: false, connectedGithubUsername, isGithubOAuth }
            }

            // Non-Google and Non-GitHubApp: return value so form can pre-populate credential fields
            return { ...credential, connectedEmail: undefined, isGoogleOAuth: false, connectedGithubUsername: undefined, isGithubOAuth: false }
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
                prisma.credential.findMany({
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

                prisma.credential.count({

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

        }),
    getByType: protectedProcedure
        .input(
            z.object({
                type: z.enum(CredentialType)
            })
        )
        .query(({ ctx, input }) => {
            const { type } = input;
            return prisma.credential.findMany({
                where: {
                    userId: ctx.auth.user.id,
                    type,
                },
                orderBy: {
                    updatedAt: "desc"
                },
            })
        }),
    getByTypes: protectedProcedure
        .input(
            z.object({
                types: z.array(z.nativeEnum(CredentialType))
            })
        )
        .query(({ ctx, input }) => {
            const { types } = input;
            return prisma.credential.findMany({
                where: {
                    userId: ctx.auth.user.id,
                    type: {
                        in: types
                    }
                },
                orderBy: {
                    updatedAt: "desc"
                },
            })
        })
});