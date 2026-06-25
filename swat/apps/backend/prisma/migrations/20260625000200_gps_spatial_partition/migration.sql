-- ===========================================================================
-- GPS spatial + partitioning (Phase 7, T-703). Runs AFTER 20260625000100_gps_models,
-- which created gps_ping / route_geometry / gps_device as ordinary tables.
-- PostgreSQL can't convert an ordinary table into a partitioned one in place, so
-- (exactly like 20260608000100_partition_transactions) we DROP the empty gps_ping
-- and recreate it partitioned. We also add the PostGIS `geography` columns —
-- which Prisma 7 cannot model — as GENERATED columns with GiST indexes, and the
-- partial unique index that Prisma cannot express.
--
-- Manage with `prisma migrate deploy` — NEVER `migrate dev` (the geography columns
-- + composite PK are invisible to schema.prisma and would be reported as drift).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- gps_ping: monthly RANGE partition on recorded_at (device event time) with
-- PK (recorded_at, id) + DEFAULT partition, dedup unique (recorded_at, imei),
-- and a maintained geography(Point,4326) column + GiST index.
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS "gps_ping" CASCADE;

CREATE TABLE "gps_ping" (
  "id"          UUID           NOT NULL DEFAULT gen_random_uuid(),
  "vehicle_id"  UUID           NOT NULL,
  "imei"        VARCHAR(20)    NOT NULL,
  "latitude"    DECIMAL(11,6)  NOT NULL,
  "longitude"   DECIMAL(11,6)  NOT NULL,
  "speed_kmh"   DECIMAL(5,2)   NOT NULL DEFAULT 0,
  "heading"     INTEGER,
  "engine_on"   BOOLEAN        NOT NULL DEFAULT false,
  "odometer_m"  BIGINT         NOT NULL DEFAULT 0,
  "source"      VARCHAR(20)    NOT NULL DEFAULT 'gpsid',
  "accuracy_m"  INTEGER,
  "recorded_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  -- PostGIS point maintained from lat/lng; STORED + GiST for ST_DWithin corridor
  -- checks. Built from the (immutable) ST_MakePoint(lon, lat) → 4326 → geography.
  "geog" geography(Point, 4326)
    GENERATED ALWAYS AS (
      ST_SetSRID(ST_MakePoint("longitude"::double precision, "latitude"::double precision), 4326)::geography
    ) STORED,
  CONSTRAINT "gps_ping_pkey" PRIMARY KEY ("recorded_at", "id"),
  -- Dedup key (valid on a partitioned table because it includes the partition
  -- key) → INSERT … ON CONFLICT (recorded_at, imei) DO NOTHING in the worker.
  CONSTRAINT "gps_ping_recorded_at_imei_key" UNIQUE ("recorded_at", "imei"),
  CONSTRAINT "gps_ping_vehicle_id_fkey"
    FOREIGN KEY ("vehicle_id") REFERENCES "vehicle"("id") ON UPDATE CASCADE ON DELETE RESTRICT
) PARTITION BY RANGE ("recorded_at");

CREATE INDEX "gps_ping_vehicle_id_recorded_at_idx" ON "gps_ping" ("vehicle_id", "recorded_at");
CREATE INDEX "gps_ping_geog_gist" ON "gps_ping" USING GIST ("geog");

-- Monthly partitions 2025-01 .. 2027-12 + a DEFAULT catch-all (so out-of-range /
-- late pings never fail to insert). A future ops job extends the explicit range;
-- until then the DEFAULT partition absorbs anything beyond it.
DO $$
DECLARE
  month_start DATE;
  month_end   DATE;
  part_name   TEXT;
  range_start CONSTANT DATE := DATE '2025-01-01';
  range_end   CONSTANT DATE := DATE '2028-01-01';
BEGIN
  EXECUTE 'CREATE TABLE IF NOT EXISTS "gps_ping_default" PARTITION OF "gps_ping" DEFAULT';

  month_start := range_start;
  WHILE month_start < range_end LOOP
    month_end := (month_start + INTERVAL '1 month')::DATE;
    part_name := format('gps_ping_y%sm%s', to_char(month_start, 'YYYY'), to_char(month_start, 'MM'));
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS %I PARTITION OF "gps_ping" FOR VALUES FROM (%L) TO (%L)',
      part_name, month_start, month_end
    );
    month_start := month_end;
  END LOOP;
END
$$;

-- ---------------------------------------------------------------------------
-- route_geometry: maintained geography(LineString,4326) from the GeoJSON path,
-- + GiST index for ST_DWithin / ST_Length corridor queries.
-- ---------------------------------------------------------------------------
ALTER TABLE "route_geometry"
  ADD COLUMN "geog" geography(LineString, 4326)
    GENERATED ALWAYS AS (
      ST_SetSRID(ST_GeomFromGeoJSON("path_geojson"::text), 4326)::geography
    ) STORED;

CREATE INDEX "route_geometry_geog_gist" ON "route_geometry" USING GIST ("geog");

-- ---------------------------------------------------------------------------
-- gps_device: one ACTIVE hardware tracker per vehicle. A partial unique index
-- (which Prisma cannot express) — leaves room for a future mobile-app source on
-- the same vehicle (different device_type), per the forward-compatibility design.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX "gps_device_one_active_hardware_per_vehicle"
  ON "gps_device" ("vehicle_id")
  WHERE "device_type" = 'gps-hardware' AND "active";
