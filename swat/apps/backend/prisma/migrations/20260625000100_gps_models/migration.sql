-- CreateEnum
CREATE TYPE "DeviationType" AS ENUM ('off_corridor', 'off_sequence', 'dwell_too_long', 'late_to_schedule');

-- CreateEnum
CREATE TYPE "DeviationSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- AlterTable
ALTER TABLE "site" ADD COLUMN     "geofence_radius_m" INTEGER;

-- AlterTable
ALTER TABLE "trip" ADD COLUMN     "geometry_override" JSONB,
ADD COLUMN     "geometry_tolerance_m" INTEGER;

-- CreateTable
CREATE TABLE "gps_device" (
    "id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "device_type" VARCHAR(20) NOT NULL DEFAULT 'gps-hardware',
    "device_id" VARCHAR(64) NOT NULL,
    "imei" VARCHAR(20),
    "provider" VARCHAR(20) NOT NULL DEFAULT 'gpsid',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "status" VARCHAR(12) NOT NULL DEFAULT 'offline',
    "last_ping_at" TIMESTAMPTZ(6),
    "last_lat" DECIMAL(11,6),
    "last_lng" DECIMAL(11,6),
    "last_speed_kmh" DECIMAL(5,2),
    "last_heading" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,

    CONSTRAINT "gps_device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gps_ping" (
    "id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "imei" VARCHAR(20) NOT NULL,
    "latitude" DECIMAL(11,6) NOT NULL,
    "longitude" DECIMAL(11,6) NOT NULL,
    "speed_kmh" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "heading" INTEGER,
    "engine_on" BOOLEAN NOT NULL DEFAULT false,
    "odometer_m" BIGINT NOT NULL DEFAULT 0,
    "source" VARCHAR(20) NOT NULL DEFAULT 'gpsid',
    "accuracy_m" INTEGER,
    "recorded_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gps_ping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gps_unmatched_ping" (
    "id" UUID NOT NULL,
    "imei" VARCHAR(20) NOT NULL,
    "payload" JSONB NOT NULL,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gps_unmatched_ping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_geometry" (
    "id" UUID NOT NULL,
    "route_id" UUID NOT NULL,
    "path_geojson" JSONB NOT NULL,
    "tolerance_meters" INTEGER NOT NULL DEFAULT 150,
    "length_meters" INTEGER NOT NULL DEFAULT 0,
    "source" VARCHAR(20) NOT NULL DEFAULT 'google-maps',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,

    CONSTRAINT "route_geometry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deviation_rule" (
    "id" UUID NOT NULL,
    "deviation_type" "DeviationType" NOT NULL,
    "threshold" INTEGER,
    "hysteresis_sec" INTEGER NOT NULL DEFAULT 30,
    "severity" "DeviationSeverity" NOT NULL DEFAULT 'WARNING',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "deviation_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deviation_alert" (
    "id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "trip_id" UUID,
    "alert_type" "DeviationType" NOT NULL,
    "severity" "DeviationSeverity" NOT NULL DEFAULT 'WARNING',
    "latitude" DECIMAL(11,6) NOT NULL,
    "longitude" DECIMAL(11,6) NOT NULL,
    "distance_m" INTEGER,
    "ping_count" INTEGER NOT NULL DEFAULT 1,
    "is_acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledged_at" TIMESTAMPTZ(6),
    "acknowledged_by_id" UUID,
    "resolved_at" TIMESTAMPTZ(6),
    "notes" VARCHAR(512),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deviation_alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_vehicle_efficiency" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "position_source" VARCHAR(12) NOT NULL,
    "planned_meters" INTEGER NOT NULL DEFAULT 0,
    "actual_meters" INTEGER NOT NULL DEFAULT 0,
    "adherence_pct" DECIMAL(5,2),
    "dwell_minutes" DECIMAL(8,2),
    "late_minutes" INTEGER NOT NULL DEFAULT 0,
    "wasted_fuel_liters" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "gpsid_fuel_liters" DECIMAL(8,2),
    "deviation_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "daily_vehicle_efficiency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gps_device_device_id_key" ON "gps_device"("device_id");

-- CreateIndex
CREATE INDEX "gps_device_vehicle_id_idx" ON "gps_device"("vehicle_id");

-- CreateIndex
CREATE INDEX "gps_device_imei_idx" ON "gps_device"("imei");

-- CreateIndex
CREATE INDEX "gps_ping_vehicle_id_recorded_at_idx" ON "gps_ping"("vehicle_id", "recorded_at");

-- CreateIndex
CREATE UNIQUE INDEX "gps_ping_recorded_at_imei_key" ON "gps_ping"("recorded_at", "imei");

-- CreateIndex
CREATE INDEX "gps_unmatched_ping_imei_idx" ON "gps_unmatched_ping"("imei");

-- CreateIndex
CREATE INDEX "gps_unmatched_ping_received_at_idx" ON "gps_unmatched_ping"("received_at");

-- CreateIndex
CREATE UNIQUE INDEX "route_geometry_route_id_key" ON "route_geometry"("route_id");

-- CreateIndex
CREATE UNIQUE INDEX "deviation_rule_deviation_type_key" ON "deviation_rule"("deviation_type");

-- CreateIndex
CREATE INDEX "deviation_alert_vehicle_id_created_at_idx" ON "deviation_alert"("vehicle_id", "created_at");

-- CreateIndex
CREATE INDEX "deviation_alert_trip_id_idx" ON "deviation_alert"("trip_id");

-- CreateIndex
CREATE INDEX "deviation_alert_is_acknowledged_idx" ON "deviation_alert"("is_acknowledged");

-- CreateIndex
CREATE INDEX "daily_vehicle_efficiency_vehicle_id_idx" ON "daily_vehicle_efficiency"("vehicle_id");

-- CreateIndex
CREATE UNIQUE INDEX "daily_vehicle_efficiency_date_vehicle_key" ON "daily_vehicle_efficiency"("date", "vehicle_id");

-- AddForeignKey
ALTER TABLE "gps_device" ADD CONSTRAINT "gps_device_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gps_ping" ADD CONSTRAINT "gps_ping_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_geometry" ADD CONSTRAINT "route_geometry_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "route"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deviation_alert" ADD CONSTRAINT "deviation_alert_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
