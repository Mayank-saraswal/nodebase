import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { createTRPCRouter, protectedProcedure } from "@/trpc/init"
import {
  isCorsairEnabled,
  resolveTenantId,
  tryGetCorsair,
} from "@/lib/corsair"
import prisma from "@/lib/db"

const pluginSchema = z.enum([
  "gmail",
  "googlesheets",
  "googledrive",
  "slack",
  "github",
  "hubspot",
  "notion",
  "telegram",
  "discord",
  "twitter",
  "razorpay",
  "stripe",
  "openai",
  "deepseek",
  "gemini",
  "perplexityai",
])

function requireCorsair() {
  if (!isCorsairEnabled()) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Corsair is disabled. Set CORSAIR_ENABLED=true and CORSAIR_KEK.",
    })
  }
  const corsair = tryGetCorsair()
  if (!corsair) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Corsair failed to initialize. Check CORSAIR_KEK and DATABASE_URL.",
    })
  }
  return corsair
}

export const integrationsRouter = createTRPCRouter({
  /** Feature flags + config health for UI. */
  getStatus: protectedProcedure.query(async () => {
    return {
      enabled: isCorsairEnabled(),
      hasKek: Boolean(process.env.CORSAIR_KEK?.trim()),
    }
  }),

  /**
   * Create a multi-tenant OAuth connect link for a plugin.
   * tenantId is always the authenticated user (Phase A).
   */
  createConnectLink: protectedProcedure
    .input(
      z.object({
        plugin: pluginSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const corsair = requireCorsair()
      const tenantId = resolveTenantId({ userId: ctx.auth.user.id })

      try {
        const link = await corsair.manage.connect.createLink({
          plugin: input.plugin,
          tenantId,
        })
        return {
          connectUrl: link.connectUrl,
          expiresAt: link.expiresAt ?? null,
          tenantId,
          plugin: input.plugin,
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Failed to create connect link: ${message}`,
        })
      }
    }),

  /**
   * Connection status per plugin for the caller's tenant.
   */
  getConnectionStatus: protectedProcedure.query(async ({ ctx }) => {
    const corsair = requireCorsair()
    const tenantId = resolveTenantId({ userId: ctx.auth.user.id })

    try {
      const status = await corsair.manage.connectionStatus.get({ tenantId })
      return { tenantId, status }
    } catch (err) {
      // Fallback: query accounts table for this tenant (no secrets)
      try {
        const accounts = await prisma.corsairAccount.findMany({
          where: { tenantId },
          include: { integration: true },
        })
        const status: Record<string, string> = {}
        for (const acc of accounts) {
          status[acc.integration.name] = "connected"
        }
        return { tenantId, status }
      } catch {
        const message = err instanceof Error ? err.message : String(err)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to load connection status: ${message}`,
        })
      }
    }
  }),

  /**
   * List Corsair accounts for the caller's tenant only.
   */
  listConnections: protectedProcedure.query(async ({ ctx }) => {
    requireCorsair()
    const tenantId = resolveTenantId({ userId: ctx.auth.user.id })

    const accounts = await prisma.corsairAccount.findMany({
      where: { tenantId },
      include: { integration: true },
      orderBy: { createdAt: "desc" },
    })

    return accounts.map((a) => ({
      id: a.id,
      tenantId: a.tenantId,
      plugin: a.integration.name,
      integrationId: a.integrationId,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      // never return dek / encrypted secrets
    }))
  }),

  /**
   * Disconnect (delete) an account — tenant ownership enforced.
   */
  disconnect: protectedProcedure
    .input(z.object({ accountId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      requireCorsair()
      const tenantId = resolveTenantId({ userId: ctx.auth.user.id })

      const account = await prisma.corsairAccount.findUnique({
        where: { id: input.accountId },
      })

      if (!account || account.tenantId !== tenantId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Connection not found for this tenant",
        })
      }

      // Delete dependent rows then account (SDK may own cascade later)
      await prisma.corsairEntity.deleteMany({ where: { accountId: account.id } })
      await prisma.corsairEvent.deleteMany({ where: { accountId: account.id } })
      await prisma.corsairAccount.delete({ where: { id: account.id } })

      return { success: true as const, accountId: account.id }
    }),
})
