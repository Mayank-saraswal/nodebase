/*
  Warnings:

  - A unique constraint covering the columns `[emailVerifyToken]` on the table `user` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "user" ADD COLUMN     "emailVerifyAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "emailVerifyExpiry" TIMESTAMP(3),
ADD COLUMN     "emailVerifyToken" TEXT;

-- DropEnum
DROP TYPE "FilterOperation";

-- CreateIndex
CREATE INDEX "AggregateNode_nodeId_idx" ON "AggregateNode"("nodeId");

-- CreateIndex
CREATE INDEX "PostgresNode_nodeId_idx" ON "PostgresNode"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "user_emailVerifyToken_key" ON "user"("emailVerifyToken");
