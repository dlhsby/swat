-- Phase 5 (T-502): link a weighbridge disposal Trip to the kitir (DisposalPermit)
-- it was recorded against — the legacy `jatahKitir` linkage, persisted for audit.
--
-- `trip` is a native monthly-RANGE partitioned table (migration-managed). ADD
-- COLUMN, CREATE INDEX, and the FK all propagate to existing/future partitions
-- on PostgreSQL 12+. Apply with `prisma migrate deploy` (never `migrate dev`).

ALTER TABLE "trip" ADD COLUMN IF NOT EXISTS "disposal_permit_id" UUID;

CREATE INDEX IF NOT EXISTS "trip_disposal_permit_id_idx" ON "trip" ("disposal_permit_id");

ALTER TABLE "trip"
  ADD CONSTRAINT "trip_disposal_permit_id_fkey"
  FOREIGN KEY ("disposal_permit_id") REFERENCES "disposal_permit"("id")
  ON UPDATE CASCADE ON DELETE SET NULL;
