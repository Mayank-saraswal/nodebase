-- Option C M1: first-class multi-tenant columns + operation string on node runs
-- Does NOT add integration operation enums (ops live in registry + Corsair packages)

-- workflow.tenant_id (Phase A: backfill from userId)
ALTER TABLE "workflow" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT NOT NULL DEFAULT '';

UPDATE "workflow" SET "tenant_id" = "userId" WHERE "tenant_id" = '' OR "tenant_id" IS NULL;

CREATE INDEX IF NOT EXISTS "workflow_tenant_id_updatedAt_idx" ON "workflow"("tenant_id", "updatedAt");
CREATE INDEX IF NOT EXISTS "workflow_userId_idx" ON "workflow"("userId");

-- Execution.tenant_id
ALTER TABLE "Execution" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT NOT NULL DEFAULT '';

UPDATE "Execution" e
SET "tenant_id" = w."tenant_id"
FROM "workflow" w
WHERE e."workflowId" = w."id" AND (e."tenant_id" = '' OR e."tenant_id" IS NULL);

CREATE INDEX IF NOT EXISTS "Execution_tenant_id_startedAt_idx" ON "Execution"("tenant_id", "startedAt");
CREATE INDEX IF NOT EXISTS "Execution_workflowId_startedAt_idx" ON "Execution"("workflowId", "startedAt");

-- NodeExecution.tenant_id + operation
ALTER TABLE "NodeExecution" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT NOT NULL DEFAULT '';
ALTER TABLE "NodeExecution" ADD COLUMN IF NOT EXISTS "operation" TEXT NOT NULL DEFAULT '';

UPDATE "NodeExecution" ne
SET "tenant_id" = e."tenant_id"
FROM "Execution" e
WHERE ne."executionId" = e."id" AND (ne."tenant_id" = '' OR ne."tenant_id" IS NULL);

CREATE INDEX IF NOT EXISTS "NodeExecution_tenant_id_createdAt_idx" ON "NodeExecution"("tenant_id", "createdAt");
CREATE INDEX IF NOT EXISTS "NodeExecution_nodeType_operation_idx" ON "NodeExecution"("nodeType", "operation");
