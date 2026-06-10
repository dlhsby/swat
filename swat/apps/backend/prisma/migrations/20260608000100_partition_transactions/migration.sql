-- ===========================================================================
-- Monthly RANGE partitioning for the high-volume transactional tables.
-- Runs AFTER the Prisma-generated init migration, which created these tables
-- as ordinary tables. PostgreSQL cannot convert an ordinary table into a
-- partitioned one in place, so we drop the (empty, greenfield) tables and
-- recreate them as partitioned by `operation_date`.
--
-- Design notes:
--  * PKs are UUID. The partition key `operation_date` must be part of every
--    PK/UNIQUE → PKs become (operation_date, id). `id` stays globally unique in
--    practice (UUID). The app/loader mint UUID v7 (Prisma `@default(uuid(7))`);
--    `DEFAULT gen_random_uuid()` here is a safety net for any raw/COPY insert.
--  * `legacy_id` cannot be globally UNIQUE on a partitioned table (would need the
--    key) → plain index. No legacy data exists yet in Phase 0.
--  * Cross-partition FKs include the key: haul_assignment(operation_date, haul_id)
--    → haul(operation_date, id); trip(operation_date, haul_assignment_id) →
--    haul_assignment(operation_date, id). The app sets the denormalized
--    operation_date consistently down the chain.
--  * tpa_inbound_log has no `operation_date` in the Prisma model; we add a physical
--    `operation_date DATE NOT NULL DEFAULT CURRENT_DATE` for partition routing.
--    Prisma is unaware of it (harmless: Prisma selects explicit columns).
--  * Child partitions inherit parent indexes as LOCAL indexes (PG11+).
-- ===========================================================================

-- Nothing references these tables via FK (photo is polymorphic; tpa_inbound_log.trip_id
-- has no FK). Safe to drop and recreate. CASCADE clears their own constraints/indexes.
DROP TABLE IF EXISTS "trip" CASCADE;
DROP TABLE IF EXISTS "haul_assignment" CASCADE;
DROP TABLE IF EXISTS "haul" CASCADE;
DROP TABLE IF EXISTS "tpa_inbound_log" CASCADE;

-- ---------------------------------------------------------------------------
-- haul
-- ---------------------------------------------------------------------------
CREATE TABLE "haul" (
  "id"                 UUID         NOT NULL DEFAULT gen_random_uuid(),
  "legacy_id"          BIGINT,
  "transaction_day_id" UUID         NOT NULL,
  "vehicle_id"         UUID         NOT NULL,
  "operation_date"     DATE         NOT NULL DEFAULT CURRENT_DATE,
  "status"             "DayStatus"  NOT NULL DEFAULT 'IN_PROGRESS',
  "notes"              VARCHAR(256),
  "created_at"         TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at"         TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "haul_pkey" PRIMARY KEY ("operation_date", "id"),
  CONSTRAINT "haul_operation_date_transaction_day_id_vehicle_id_key"
    UNIQUE ("operation_date", "transaction_day_id", "vehicle_id"),
  CONSTRAINT "haul_transaction_day_id_fkey"
    FOREIGN KEY ("transaction_day_id") REFERENCES "transaction_day"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "haul_vehicle_id_fkey"
    FOREIGN KEY ("vehicle_id") REFERENCES "vehicle"("id") ON UPDATE CASCADE ON DELETE RESTRICT
) PARTITION BY RANGE ("operation_date");

CREATE INDEX "haul_operation_date_idx" ON "haul" ("operation_date");
CREATE INDEX "haul_legacy_id_idx" ON "haul" ("legacy_id");

-- ---------------------------------------------------------------------------
-- haul_assignment
-- ---------------------------------------------------------------------------
CREATE TABLE "haul_assignment" (
  "id"                     UUID         NOT NULL DEFAULT gen_random_uuid(),
  "legacy_id"              BIGINT,
  "haul_id"                UUID         NOT NULL,
  "driver_id"              UUID         NOT NULL,
  "crew_schedule_id"       UUID,
  "operation_date"         DATE         NOT NULL DEFAULT CURRENT_DATE,
  "status"                 "DayStatus"  NOT NULL DEFAULT 'IN_PROGRESS',
  "depart_target_odometer" INTEGER      NOT NULL DEFAULT 0,
  "depart_actual_odometer" INTEGER,
  "return_target_odometer" INTEGER      NOT NULL DEFAULT 0,
  "return_actual_odometer" INTEGER,
  "depart_target_time"     TIMESTAMPTZ(6),
  "depart_actual_time"     TIMESTAMPTZ(6),
  "return_target_time"     TIMESTAMPTZ(6),
  "return_actual_time"     TIMESTAMPTZ(6),
  "notes"                  VARCHAR(256),
  "created_at"             TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at"             TIMESTAMPTZ(6) NOT NULL,
  "created_by_id"          UUID,
  "updated_by_id"          UUID,
  CONSTRAINT "haul_assignment_pkey" PRIMARY KEY ("operation_date", "id"),
  CONSTRAINT "haul_assignment_operation_date_haul_id_fkey"
    FOREIGN KEY ("operation_date", "haul_id") REFERENCES "haul"("operation_date", "id") ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "haul_assignment_driver_id_fkey"
    FOREIGN KEY ("driver_id") REFERENCES "driver"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "haul_assignment_crew_schedule_id_fkey"
    FOREIGN KEY ("crew_schedule_id") REFERENCES "crew_schedule"("id") ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT "haul_assignment_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT "haul_assignment_updated_by_id_fkey"
    FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON UPDATE CASCADE ON DELETE SET NULL
) PARTITION BY RANGE ("operation_date");

CREATE INDEX "haul_assignment_haul_id_idx" ON "haul_assignment" ("haul_id");
CREATE INDEX "haul_assignment_operation_date_idx" ON "haul_assignment" ("operation_date");
CREATE INDEX "haul_assignment_legacy_id_idx" ON "haul_assignment" ("legacy_id");

-- ---------------------------------------------------------------------------
-- trip
-- ---------------------------------------------------------------------------
CREATE TABLE "trip" (
  "id"                    UUID         NOT NULL DEFAULT gen_random_uuid(),
  "legacy_id"             BIGINT,
  "haul_assignment_id"    UUID         NOT NULL,
  "route_id"              UUID,
  "recorded_by_id"        UUID,
  "operation_date"        DATE         NOT NULL DEFAULT CURRENT_DATE,
  "status"                "TripStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "name"                  VARCHAR(256) NOT NULL,
  "target_time"           TIMESTAMPTZ(6),
  "actual_time"           TIMESTAMPTZ(6),
  "target_odometer"       INTEGER      NOT NULL DEFAULT 0,
  "actual_odometer"       INTEGER      NOT NULL DEFAULT 0,
  "tare_weight"           INTEGER      NOT NULL DEFAULT 0,
  "gross_weight"          INTEGER,
  "net_weight"            INTEGER,
  "waste_volume"          INTEGER,
  "fuel_requested_liters" DECIMAL(8,2),
  "fuel_approved_liters"  DECIMAL(8,2),
  "scheduled_entry_at"    TIMESTAMPTZ(6),
  "realization_entry_at"  TIMESTAMPTZ(6),
  "notes"                 VARCHAR(512),
  "created_at"            TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at"            TIMESTAMPTZ(6) NOT NULL,
  "created_by_id"         UUID,
  "updated_by_id"         UUID,
  "verified_by_id"        UUID,
  "verified_at"           TIMESTAMPTZ(6),
  CONSTRAINT "trip_pkey" PRIMARY KEY ("operation_date", "id"),
  CONSTRAINT "trip_operation_date_haul_assignment_id_fkey"
    FOREIGN KEY ("operation_date", "haul_assignment_id") REFERENCES "haul_assignment"("operation_date", "id") ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "trip_route_id_fkey"
    FOREIGN KEY ("route_id") REFERENCES "route"("id") ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT "trip_recorded_by_id_fkey"
    FOREIGN KEY ("recorded_by_id") REFERENCES "user"("id") ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT "trip_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT "trip_updated_by_id_fkey"
    FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT "trip_verified_by_id_fkey"
    FOREIGN KEY ("verified_by_id") REFERENCES "user"("id") ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT "trip_gross_weight_gte_tare_weight"
    CHECK ("gross_weight" IS NULL OR "gross_weight" >= "tare_weight"),
  CONSTRAINT "trip_fuel_approved_lte_requested"
    CHECK ("fuel_approved_liters" IS NULL OR "fuel_requested_liters" IS NULL OR "fuel_approved_liters" <= "fuel_requested_liters")
) PARTITION BY RANGE ("operation_date");

CREATE INDEX "trip_haul_assignment_id_idx" ON "trip" ("haul_assignment_id");
CREATE INDEX "trip_route_id_idx" ON "trip" ("route_id");
CREATE INDEX "trip_status_idx" ON "trip" ("status");
CREATE INDEX "trip_operation_date_idx" ON "trip" ("operation_date");
CREATE INDEX "trip_legacy_id_idx" ON "trip" ("legacy_id");

-- ---------------------------------------------------------------------------
-- tpa_inbound_log (weighbridge log) — partition by a physical operation_date.
-- ---------------------------------------------------------------------------
CREATE TABLE "tpa_inbound_log" (
  "id"             UUID         NOT NULL DEFAULT gen_random_uuid(),
  "legacy_id"      INTEGER,
  "date_label"     VARCHAR(50),
  "date"           DATE,
  "plate_number"   VARCHAR(20),
  "depot"          VARCHAR(200),
  "source_truck"   VARCHAR(200),
  "gross_weight"   INTEGER,
  "tare_weight"    INTEGER,
  "net_weight"     INTEGER,
  "cctv_reference" VARCHAR(256),
  "trip_id"        UUID,
  "created_at"     TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at"     TIMESTAMPTZ(6) NOT NULL,
  "operation_date" DATE         NOT NULL DEFAULT CURRENT_DATE,
  CONSTRAINT "tpa_inbound_log_pkey" PRIMARY KEY ("operation_date", "id")
) PARTITION BY RANGE ("operation_date");

CREATE INDEX "tpa_inbound_log_date_idx" ON "tpa_inbound_log" ("date");
CREATE INDEX "tpa_inbound_log_plate_number_idx" ON "tpa_inbound_log" ("plate_number");
CREATE INDEX "tpa_inbound_log_trip_id_idx" ON "tpa_inbound_log" ("trip_id");
CREATE INDEX "tpa_inbound_log_legacy_id_idx" ON "tpa_inbound_log" ("legacy_id");

-- ---------------------------------------------------------------------------
-- Generate monthly partitions for 2013-01 .. 2026-12 plus a DEFAULT catch-all
-- per table (so out-of-range inserts never fail). Child partitions inherit the
-- parent indexes as local indexes automatically.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  tbl          TEXT;
  month_start  DATE;
  month_end    DATE;
  part_name    TEXT;
  range_start  CONSTANT DATE := DATE '2013-01-01';
  range_end    CONSTANT DATE := DATE '2027-01-01';
BEGIN
  FOREACH tbl IN ARRAY ARRAY['trip', 'haul', 'haul_assignment', 'tpa_inbound_log'] LOOP
    -- DEFAULT partition first (catches anything outside the explicit ranges).
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I DEFAULT',
      tbl || '_default', tbl
    );

    month_start := range_start;
    WHILE month_start < range_end LOOP
      month_end := (month_start + INTERVAL '1 month')::DATE;
      part_name := format('%s_y%sm%s', tbl, to_char(month_start, 'YYYY'), to_char(month_start, 'MM'));
      EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
        part_name, tbl, month_start, month_end
      );
      month_start := month_end;
    END LOOP;
  END LOOP;
END
$$;
