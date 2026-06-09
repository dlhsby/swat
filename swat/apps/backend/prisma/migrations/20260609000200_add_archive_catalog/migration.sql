-- ===========================================================================
-- ArchiveCatalog — metadata for archived (detached + compressed) monthly
-- partitions (specs/12-scalability-archiving.md §3, Phase 2 Epic 2.5 / T-212).
-- One row per archived partition; `checksum` guards a later re-attach.
--
-- Hand-authored (never `prisma migrate dev`): the transactional tables are native
-- monthly partitions and `migrate dev` would reset them. Apply with
-- `prisma migrate deploy`. Mirrors the schema model `ArchiveCatalog`.
-- ===========================================================================

CREATE TABLE "ArchiveCatalog" (
    "id"           SERIAL NOT NULL,
    "tableName"    VARCHAR(64)  NOT NULL,
    "period"       VARCHAR(7)   NOT NULL,
    "archiveType"  VARCHAR(32)  NOT NULL,
    "location"     VARCHAR(512) NOT NULL,
    "rowCount"     BIGINT       NOT NULL DEFAULT 0,
    "sizeBytes"    BIGINT,
    "checksum"     VARCHAR(128),
    "detachedAt"   TIMESTAMPTZ(6) NOT NULL,
    "reattachedAt" TIMESTAMPTZ(6),
    "notes"        VARCHAR(512),
    "createdAt"    TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById"  INTEGER,

    CONSTRAINT "ArchiveCatalog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ArchiveCatalog_table_period_key" ON "ArchiveCatalog"("tableName", "period");
CREATE INDEX "ArchiveCatalog_period_idx" ON "ArchiveCatalog"("period");
