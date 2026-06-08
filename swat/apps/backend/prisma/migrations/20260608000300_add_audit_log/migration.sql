-- ===========================================================================
-- Generic audit trail for sensitive non-auth mutations (specs/10-nonfunctional §1).
-- Authentication events stay in "AuthAuditLog"; this captures user/role CRUD,
-- trip verification, fuel over-approval, and maintenance approval. Append-only.
-- ===========================================================================

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" BIGSERIAL NOT NULL,
    "actorId" INTEGER,
    "actorName" VARCHAR(100) NOT NULL,
    "action" VARCHAR(64) NOT NULL,
    "entityType" VARCHAR(48) NOT NULL,
    "entityId" VARCHAR(64) NOT NULL,
    "details" VARCHAR(512),
    "timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");
