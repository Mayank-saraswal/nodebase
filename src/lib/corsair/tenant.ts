/**
 * Multi-tenant helpers for Corsair.
 *
 * Phase A: tenantId === Nodebase User.id
 * Phase B (future): tenantId === workspaceId when workspaces exist
 */

export type TenantContext = {
  userId: string
  /** Future: org/workspace isolation */
  workspaceId?: string | null
}

/**
 * Resolve the Corsair tenant id for the current request/run.
 * Prefer workspace when present; otherwise use the authenticated user.
 */
export function resolveTenantId(ctx: TenantContext): string {
  if (ctx.workspaceId && ctx.workspaceId.trim() !== "") {
    return ctx.workspaceId
  }
  if (!ctx.userId || ctx.userId.trim() === "") {
    throw new Error("resolveTenantId: userId is required")
  }
  return ctx.userId
}

/**
 * Assert that a resource's tenant matches the caller's tenant.
 * Use for disconnect / list-by-id guards.
 */
export function assertTenantAccess(
  resourceTenantId: string,
  caller: TenantContext,
  message = "Forbidden: resource belongs to another tenant",
): void {
  const expected = resolveTenantId(caller)
  if (resourceTenantId !== expected) {
    throw new Error(message)
  }
}
