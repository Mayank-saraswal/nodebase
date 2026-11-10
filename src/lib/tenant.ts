/**
 * App-level multi-tenant helpers (Option C).
 * Re-exports Corsair tenant helpers and adds workflow-facing utilities.
 */

export {
  resolveTenantId,
  assertTenantAccess,
  type TenantContext,
} from "@/lib/corsair/tenant"

/**
 * Phase A: tenant id for a logged-in user is their user id.
 * Phase B: pass workspaceId when workspaces exist.
 */
export function tenantIdForUser(
  userId: string,
  workspaceId?: string | null,
): string {
  if (workspaceId && workspaceId.trim() !== "") return workspaceId
  if (!userId.trim()) {
    throw new Error("tenantIdForUser: userId is required")
  }
  return userId
}
