-- ===========================================================================
-- Aggregation / rollup tables (specs/12-scalability-archiving.md §4).
-- Small, always-hot, NEVER archived — they back reporting/monitoring at scale
-- so dashboards never scan the partitioned history. Populated incrementally by
-- the RollupService (stubbed in Phase 0, implemented in Phase 2).
--
-- DailyTonnage is owned by Prisma (see schema.prisma); the four cross-tab
-- rollups below are raw tables (no Prisma model) created here.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS "MonthlyTonnageBySource" (
  "id"             SERIAL PRIMARY KEY,
  "month"          DATE   NOT NULL,            -- first day of the month
  "wasteSourceId"  INTEGER NOT NULL REFERENCES "WasteSource"("id"),
  "totalNetWeight" BIGINT NOT NULL DEFAULT 0,  -- kg
  "createdAt"      TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updatedAt"      TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "MonthlyTonnageBySource_month_source_key" UNIQUE ("month", "wasteSourceId")
);
CREATE INDEX IF NOT EXISTS "MonthlyTonnageBySource_month_idx" ON "MonthlyTonnageBySource" ("month");

CREATE TABLE IF NOT EXISTS "MonthlyTonnageBySite" (
  "id"             SERIAL PRIMARY KEY,
  "month"          DATE   NOT NULL,
  "siteId"         INTEGER NOT NULL REFERENCES "Site"("id"),
  "totalNetWeight" BIGINT NOT NULL DEFAULT 0,  -- kg
  "createdAt"      TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updatedAt"      TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "MonthlyTonnageBySite_month_site_key" UNIQUE ("month", "siteId")
);
CREATE INDEX IF NOT EXISTS "MonthlyTonnageBySite_month_idx" ON "MonthlyTonnageBySite" ("month");

CREATE TABLE IF NOT EXISTS "DailyFuelByVehicle" (
  "id"               SERIAL PRIMARY KEY,
  "date"             DATE    NOT NULL,
  "vehicleId"        INTEGER NOT NULL REFERENCES "Vehicle"("id"),
  "totalFuelLiters"  DECIMAL(12,2) NOT NULL DEFAULT 0,
  "createdAt"        TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updatedAt"        TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "DailyFuelByVehicle_date_vehicle_key" UNIQUE ("date", "vehicleId")
);
CREATE INDEX IF NOT EXISTS "DailyFuelByVehicle_date_idx" ON "DailyFuelByVehicle" ("date");

CREATE TABLE IF NOT EXISTS "MonthlyRouteActivity" (
  "id"        SERIAL PRIMARY KEY,
  "month"     DATE    NOT NULL,
  "routeId"   INTEGER NOT NULL REFERENCES "Route"("id"),
  "tripCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "MonthlyRouteActivity_month_route_key" UNIQUE ("month", "routeId")
);
CREATE INDEX IF NOT EXISTS "MonthlyRouteActivity_month_idx" ON "MonthlyRouteActivity" ("month");
