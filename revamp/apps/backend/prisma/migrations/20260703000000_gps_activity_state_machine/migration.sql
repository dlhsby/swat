-- Phase 7 GPS activity state machine.
-- Trip is a partitioned table (migration-managed): add the ARRIVED status + the
-- arrived_at column on the parent (propagates to all monthly partitions).

-- TripStatus: IN_PROGRESS -> ARRIVED -> DONE -> VERIFIED.
ALTER TYPE "TripStatus" ADD VALUE IF NOT EXISTS 'ARRIVED' AFTER 'IN_PROGRESS';

-- Geofence arrival timestamp for a leg's destination site.
ALTER TABLE "trip" ADD COLUMN IF NOT EXISTS "arrived_at" TIMESTAMPTZ(6);

-- Activity milestone enums.
CREATE TYPE "GpsActivitySource" AS ENUM ('GPS', 'WEIGHBRIDGE', 'MANUAL');
CREATE TYPE "GpsActivityKind" AS ENUM ('DEPART', 'ARRIVE', 'WEIGH', 'COMPLETE', 'RETURN');

-- Append-only activity feed (FK-free: haul/trip live on partitioned tables).
CREATE TABLE "gps_activity_event" (
    "id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "haul_id" UUID,
    "haul_assignment_id" UUID,
    "trip_id" UUID,
    "site_id" UUID,
    "site_type" "SiteType",
    "kind" "GpsActivityKind" NOT NULL,
    "source" "GpsActivitySource" NOT NULL DEFAULT 'GPS',
    "latitude" DECIMAL(11,6),
    "longitude" DECIMAL(11,6),
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "gps_activity_event_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "gps_activity_event_vehicle_id_occurred_at_idx" ON "gps_activity_event"("vehicle_id", "occurred_at");
CREATE INDEX "gps_activity_event_haul_id_idx" ON "gps_activity_event"("haul_id");
