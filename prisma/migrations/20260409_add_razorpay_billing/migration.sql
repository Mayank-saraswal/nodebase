-- Add Razorpay billing fields to User table
ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "plan"               TEXT NOT NULL DEFAULT 'FREE',
  ADD COLUMN IF NOT EXISTS "planStatus"         TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS "razorpayCustomerId" TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS "razorpaySubId"      TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS "currentPeriodEnd"   TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancelAtPeriodEnd"  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "workflowRunsUsed"   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "workflowRunsReset"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Create BillingEvent table for audit trail
CREATE TABLE IF NOT EXISTS "BillingEvent" (
  "id"              TEXT         NOT NULL,
  "userId"          TEXT         NOT NULL,
  "type"            TEXT         NOT NULL,
  "razorpayEventId" TEXT         UNIQUE,
  "amount"          INTEGER,
  "currency"        TEXT         NOT NULL DEFAULT 'INR',
  "plan"            TEXT,
  "status"          TEXT         NOT NULL,
  "rawPayload"      TEXT         NOT NULL,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillingEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BillingEvent_userId_idx" ON "BillingEvent"("userId");
CREATE INDEX IF NOT EXISTS "BillingEvent_type_idx"   ON "BillingEvent"("type");

ALTER TABLE "BillingEvent"
  ADD CONSTRAINT "BillingEvent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing users stay on FREE plan
UPDATE "user" SET "plan" = 'FREE' WHERE "plan" IS NULL OR "plan" = '';
