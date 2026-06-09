-- ===========================================================================
-- Phase 2 rollup column delta (specs/11-development-plan/phase-2.md T-201).
-- The rollup tables shipped in `..._rollups` as empty Phase-0 stubs; the
-- monitoring dashboards need a few more columns:
--   * haulCount on the tonnage rollups (for the "avg tonnage per haul" KPI)
--   * fuel split (approved vs requested) instead of a single total, so the
--     fuel dashboard can flag under-approval variance.
--
-- Hand-authored (never `prisma migrate dev`): the transactional tables are native
-- monthly partitions and `migrate dev` would reset them. Apply with
-- `prisma migrate deploy`. The tables are empty stubs in every environment, so the
-- column drop/add below is non-destructive.
-- ===========================================================================

ALTER TABLE "DailyTonnage"            ADD COLUMN "haulCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MonthlyTonnageBySource"  ADD COLUMN "haulCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MonthlyTonnageBySite"    ADD COLUMN "haulCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "DailyFuelByVehicle"
  DROP COLUMN "totalFuelLiters",
  ADD COLUMN "fuelApprovedLiters"  DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "fuelRequestedLiters" DECIMAL(12, 2) NOT NULL DEFAULT 0;
