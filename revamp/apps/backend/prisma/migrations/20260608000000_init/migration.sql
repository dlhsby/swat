-- CreateEnum
CREATE TYPE "SiteType" AS ENUM ('POOL', 'SPBU', 'TPS', 'TPA');

-- CreateEnum
CREATE TYPE "RouteCategory" AS ENUM ('DEPART_POOL', 'REFUEL', 'PICKUP', 'DISPOSAL', 'RETURN_POOL');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('IN_PROGRESS', 'DONE', 'VERIFIED');

-- CreateEnum
CREATE TYPE "DayStatus" AS ENUM ('IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "DisposalPermitStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('GOOD', 'MINOR_DAMAGE', 'MAJOR_DAMAGE', 'LOST');

-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('SATGAS', 'PNS', 'HONORER');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('SERVICE', 'REPAIR');

-- CreateEnum
CREATE TYPE "InspectionResult" AS ENUM ('PASS', 'ATTENTION', 'FAIL');

-- CreateEnum
CREATE TYPE "InspectionItemStatus" AS ENUM ('OK', 'ATTENTION', 'FAIL');

-- CreateEnum
CREATE TYPE "AuthAction" AS ENUM ('LOGIN', 'LOGOUT', 'FAILED_LOGIN', 'PASSWORD_CHANGE', 'ACCOUNT_LOCK', 'FORCE_RESET', 'PERMISSION_DENIED');

-- CreateTable
CREATE TABLE "user" (
    "id" UUID NOT NULL,
    "legacy_id" INTEGER,
    "role_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "must_change_password" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role" (
    "id" UUID NOT NULL,
    "legacy_id" INTEGER,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission" (
    "id" UUID NOT NULL,
    "key" VARCHAR(64) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permission" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "role_permission_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "auth_audit_log" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "username" VARCHAR(100) NOT NULL,
    "action" "AuthAction" NOT NULL,
    "ip" VARCHAR(45) NOT NULL,
    "user_agent" VARCHAR(512) NOT NULL,
    "timestamp" TIMESTAMPTZ(6) NOT NULL,
    "details" VARCHAR(512),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "auth_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "actor_name" VARCHAR(100) NOT NULL,
    "action" VARCHAR(64) NOT NULL,
    "entity_type" VARCHAR(48) NOT NULL,
    "entity_id" VARCHAR(64) NOT NULL,
    "details" VARCHAR(512),
    "timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_application" (
    "id" UUID NOT NULL,
    "legacy_id" INTEGER,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "vehicle_application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fuel_category" (
    "id" UUID NOT NULL,
    "legacy_id" INTEGER,
    "name" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "fuel_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fuel" (
    "id" UUID NOT NULL,
    "legacy_id" INTEGER,
    "fuel_category_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "price_per_liter" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "fuel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_model" (
    "id" UUID NOT NULL,
    "legacy_id" INTEGER,
    "application_id" UUID NOT NULL,
    "fuel_id" UUID NOT NULL,
    "brand" VARCHAR(100) NOT NULL,
    "fuel_tank_capacity" INTEGER NOT NULL,
    "normal_fuel_ratio" INTEGER NOT NULL DEFAULT 1,
    "normal_tare_weight" INTEGER NOT NULL,
    "max_net_load" INTEGER DEFAULT 0,
    "max_net_volume" INTEGER DEFAULT 0,
    "wheel_count" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "vehicle_model_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle" (
    "id" UUID NOT NULL,
    "legacy_id" INTEGER,
    "pool_site_id" UUID NOT NULL,
    "model_id" UUID NOT NULL,
    "status" "VehicleStatus" NOT NULL DEFAULT 'GOOD',
    "plate_number" VARCHAR(10) NOT NULL,
    "chassis_number" VARCHAR(100) NOT NULL,
    "engine_number" VARCHAR(100) NOT NULL,
    "manufacture_year" INTEGER,
    "current_fuel_ratio" INTEGER NOT NULL DEFAULT 1,
    "current_tare_weight" INTEGER NOT NULL,
    "current_odometer" INTEGER NOT NULL,
    "registration_expiry" DATE NOT NULL,
    "tax_expiry" DATE NOT NULL,
    "notes" VARCHAR(512),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "license_class" (
    "id" UUID NOT NULL,
    "legacy_id" INTEGER,
    "name" VARCHAR(10) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "license_class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver" (
    "id" UUID NOT NULL,
    "legacy_id" INTEGER,
    "pool_site_id" UUID NOT NULL,
    "employment_status" "EmploymentStatus" NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "id_card_number" VARCHAR(16) NOT NULL,
    "origin_address" VARCHAR(256) NOT NULL,
    "current_address" VARCHAR(256) NOT NULL,
    "birth_date" DATE NOT NULL,
    "contact" VARCHAR(100) NOT NULL,
    "safety_training" VARCHAR(100) DEFAULT 'BELUM',
    "notes" VARCHAR(256),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_license" (
    "id" UUID NOT NULL,
    "legacy_id" INTEGER,
    "driver_id" UUID NOT NULL,
    "license_class_id" UUID NOT NULL,
    "license_number" VARCHAR(12) NOT NULL,
    "expiry" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "driver_license_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site" (
    "id" UUID NOT NULL,
    "legacy_id" INTEGER,
    "type" "SiteType" NOT NULL,
    "name" VARCHAR(256) NOT NULL,
    "address" VARCHAR(512) NOT NULL,
    "latitude" DECIMAL(11,6),
    "longitude" DECIMAL(11,6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route" (
    "id" UUID NOT NULL,
    "legacy_id" INTEGER,
    "category" "RouteCategory" NOT NULL,
    "origin_site_id" UUID NOT NULL,
    "destination_site_id" UUID NOT NULL,
    "distance_km" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waste_source" (
    "id" UUID NOT NULL,
    "legacy_id" INTEGER,
    "code" VARCHAR(5) NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "notes" VARCHAR(1024),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "waste_source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_waste_source" (
    "id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "waste_source_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "vehicle_waste_source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crew_schedule" (
    "id" UUID NOT NULL,
    "legacy_id" INTEGER,
    "vehicle_id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "depart_time" TIME NOT NULL,
    "return_time" TIME NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "crew_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_template" (
    "id" UUID NOT NULL,
    "legacy_id" INTEGER,
    "crew_schedule_id" UUID NOT NULL,
    "route_id" UUID NOT NULL,
    "target_time" TIME NOT NULL,
    "fuel_requested_liters" DECIMAL(8,2),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "trip_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disposal_permit" (
    "id" UUID NOT NULL,
    "legacy_id" INTEGER,
    "code" VARCHAR(50),
    "vehicle_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "status" "DisposalPermitStatus" NOT NULL DEFAULT 'ACTIVE',
    "issued_at" TIMESTAMPTZ(6) NOT NULL,
    "valid_from" DATE NOT NULL,
    "valid_to" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,

    CONSTRAINT "disposal_permit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_day" (
    "id" UUID NOT NULL,
    "legacy_id" INTEGER,
    "date" DATE NOT NULL,
    "status" "DayStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "transaction_day_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "haul" (
    "id" UUID NOT NULL,
    "legacy_id" BIGINT,
    "transaction_day_id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "operation_date" DATE NOT NULL,
    "status" "DayStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "notes" VARCHAR(256),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "haul_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "haul_assignment" (
    "id" UUID NOT NULL,
    "legacy_id" BIGINT,
    "haul_id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "crew_schedule_id" UUID,
    "operation_date" DATE NOT NULL,
    "status" "DayStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "depart_target_odometer" INTEGER NOT NULL DEFAULT 0,
    "depart_actual_odometer" INTEGER,
    "return_target_odometer" INTEGER NOT NULL DEFAULT 0,
    "return_actual_odometer" INTEGER,
    "depart_target_time" TIMESTAMPTZ(6),
    "depart_actual_time" TIMESTAMPTZ(6),
    "return_target_time" TIMESTAMPTZ(6),
    "return_actual_time" TIMESTAMPTZ(6),
    "notes" VARCHAR(256),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,

    CONSTRAINT "haul_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip" (
    "id" UUID NOT NULL,
    "legacy_id" BIGINT,
    "haul_assignment_id" UUID NOT NULL,
    "route_id" UUID,
    "recorded_by_id" UUID,
    "operation_date" DATE NOT NULL,
    "status" "TripStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "name" VARCHAR(256) NOT NULL,
    "target_time" TIMESTAMPTZ(6),
    "actual_time" TIMESTAMPTZ(6),
    "target_odometer" INTEGER NOT NULL DEFAULT 0,
    "actual_odometer" INTEGER NOT NULL DEFAULT 0,
    "tare_weight" INTEGER NOT NULL DEFAULT 0,
    "gross_weight" INTEGER,
    "net_weight" INTEGER,
    "waste_volume" INTEGER,
    "fuel_requested_liters" DECIMAL(8,2),
    "fuel_approved_liters" DECIMAL(8,2),
    "scheduled_entry_at" TIMESTAMPTZ(6),
    "realization_entry_at" TIMESTAMPTZ(6),
    "notes" VARCHAR(512),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "verified_by_id" UUID,
    "verified_at" TIMESTAMPTZ(6),

    CONSTRAINT "trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photo" (
    "id" UUID NOT NULL,
    "object_key" VARCHAR(512) NOT NULL,
    "content_type" VARCHAR(100) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "checksum" VARCHAR(64) NOT NULL,
    "owner_type" VARCHAR(40) NOT NULL,
    "owner_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_record" (
    "id" UUID NOT NULL,
    "legacy_id" BIGINT,
    "code" VARCHAR(30),
    "vehicle_id" UUID NOT NULL,
    "type" "MaintenanceType" NOT NULL DEFAULT 'SERVICE',
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "date" DATE NOT NULL,
    "odometer" INTEGER,
    "workshop" VARCHAR(256),
    "description" VARCHAR(512),
    "total_cost" INTEGER NOT NULL DEFAULT 0,
    "notes" VARCHAR(512),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,

    CONSTRAINT "maintenance_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_item" (
    "id" UUID NOT NULL,
    "legacy_id" BIGINT,
    "record_id" UUID NOT NULL,
    "name" VARCHAR(256) NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 0,
    "unit_price" INTEGER NOT NULL DEFAULT 0,
    "total_price" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "maintenance_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_inspection" (
    "id" UUID NOT NULL,
    "legacy_id" BIGINT,
    "vehicle_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "inspector_id" UUID,
    "result" "InspectionResult" NOT NULL DEFAULT 'PASS',
    "passed_count" INTEGER NOT NULL DEFAULT 0,
    "total_count" INTEGER NOT NULL DEFAULT 0,
    "notes" VARCHAR(512),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by_id" UUID,

    CONSTRAINT "vehicle_inspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_item" (
    "id" UUID NOT NULL,
    "inspection_id" UUID NOT NULL,
    "label" VARCHAR(128) NOT NULL,
    "status" "InspectionItemStatus" NOT NULL DEFAULT 'OK',
    "notes" VARCHAR(256),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "inspection_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tpa_inbound_log" (
    "id" UUID NOT NULL,
    "legacy_id" INTEGER,
    "date_label" VARCHAR(50),
    "date" DATE,
    "plate_number" VARCHAR(20),
    "depot" VARCHAR(200),
    "source_truck" VARCHAR(200),
    "gross_weight" INTEGER,
    "tare_weight" INTEGER,
    "net_weight" INTEGER,
    "cctv_reference" VARCHAR(256),
    "trip_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tpa_inbound_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_tonnage" (
    "id" UUID NOT NULL,
    "legacy_id" INTEGER,
    "date" DATE NOT NULL,
    "amount" BIGINT NOT NULL DEFAULT 0,
    "haul_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "daily_tonnage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_tonnage_by_source" (
    "id" UUID NOT NULL,
    "month" DATE NOT NULL,
    "waste_source_id" UUID NOT NULL,
    "total_net_weight" BIGINT NOT NULL DEFAULT 0,
    "haul_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "monthly_tonnage_by_source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_tonnage_by_site" (
    "id" UUID NOT NULL,
    "month" DATE NOT NULL,
    "site_id" UUID NOT NULL,
    "total_net_weight" BIGINT NOT NULL DEFAULT 0,
    "haul_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "monthly_tonnage_by_site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_fuel_by_vehicle" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "fuel_approved_liters" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "fuel_requested_liters" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "daily_fuel_by_vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_route_activity" (
    "id" UUID NOT NULL,
    "month" DATE NOT NULL,
    "route_id" UUID NOT NULL,
    "trip_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "monthly_route_activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legacy_name_map" (
    "id" UUID NOT NULL,
    "si" VARCHAR(250),
    "swat" VARCHAR(250),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "legacy_name_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archive_catalog" (
    "id" UUID NOT NULL,
    "table_name" VARCHAR(64) NOT NULL,
    "period" VARCHAR(7) NOT NULL,
    "archive_type" VARCHAR(32) NOT NULL,
    "location" VARCHAR(512) NOT NULL,
    "row_count" BIGINT NOT NULL DEFAULT 0,
    "size_bytes" BIGINT,
    "checksum" VARCHAR(128),
    "detached_at" TIMESTAMPTZ(6) NOT NULL,
    "reattached_at" TIMESTAMPTZ(6),
    "notes" VARCHAR(512),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" UUID,

    CONSTRAINT "archive_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "levy" (
    "id" UUID NOT NULL,
    "legacy_id" BIGINT,
    "category_name" VARCHAR(100) NOT NULL,
    "date" DATE NOT NULL,
    "amount" BIGINT NOT NULL,
    "notes" VARCHAR(256),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by_id" UUID,
    "updated_by_id" UUID,

    CONSTRAINT "levy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_legacy_id_key" ON "user"("legacy_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "role_legacy_id_key" ON "role"("legacy_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_name_key" ON "role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permission_key_key" ON "permission"("key");

-- CreateIndex
CREATE INDEX "auth_audit_log_user_id_idx" ON "auth_audit_log"("user_id");

-- CreateIndex
CREATE INDEX "auth_audit_log_timestamp_idx" ON "auth_audit_log"("timestamp");

-- CreateIndex
CREATE INDEX "auth_audit_log_action_idx" ON "auth_audit_log"("action");

-- CreateIndex
CREATE INDEX "audit_log_actor_id_idx" ON "audit_log"("actor_id");

-- CreateIndex
CREATE INDEX "audit_log_entity_type_entity_id_idx" ON "audit_log"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_log_timestamp_idx" ON "audit_log"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_application_legacy_id_key" ON "vehicle_application"("legacy_id");

-- CreateIndex
CREATE UNIQUE INDEX "fuel_category_legacy_id_key" ON "fuel_category"("legacy_id");

-- CreateIndex
CREATE UNIQUE INDEX "fuel_legacy_id_key" ON "fuel"("legacy_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_model_legacy_id_key" ON "vehicle_model"("legacy_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_legacy_id_key" ON "vehicle"("legacy_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_plate_number_key" ON "vehicle"("plate_number");

-- CreateIndex
CREATE INDEX "vehicle_pool_site_id_idx" ON "vehicle"("pool_site_id");

-- CreateIndex
CREATE INDEX "vehicle_model_id_idx" ON "vehicle"("model_id");

-- CreateIndex
CREATE UNIQUE INDEX "license_class_legacy_id_key" ON "license_class"("legacy_id");

-- CreateIndex
CREATE UNIQUE INDEX "driver_legacy_id_key" ON "driver"("legacy_id");

-- CreateIndex
CREATE INDEX "driver_pool_site_id_idx" ON "driver"("pool_site_id");

-- CreateIndex
CREATE UNIQUE INDEX "driver_license_legacy_id_key" ON "driver_license"("legacy_id");

-- CreateIndex
CREATE UNIQUE INDEX "site_legacy_id_key" ON "site"("legacy_id");

-- CreateIndex
CREATE INDEX "site_type_idx" ON "site"("type");

-- CreateIndex
CREATE UNIQUE INDEX "route_legacy_id_key" ON "route"("legacy_id");

-- CreateIndex
CREATE UNIQUE INDEX "route_origin_site_id_destination_site_id_category_key" ON "route"("origin_site_id", "destination_site_id", "category");

-- CreateIndex
CREATE UNIQUE INDEX "waste_source_legacy_id_key" ON "waste_source"("legacy_id");

-- CreateIndex
CREATE UNIQUE INDEX "waste_source_code_key" ON "waste_source"("code");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_waste_source_vehicle_id_waste_source_id_key" ON "vehicle_waste_source"("vehicle_id", "waste_source_id");

-- CreateIndex
CREATE UNIQUE INDEX "crew_schedule_legacy_id_key" ON "crew_schedule"("legacy_id");

-- CreateIndex
CREATE UNIQUE INDEX "crew_schedule_vehicle_id_driver_id_key" ON "crew_schedule"("vehicle_id", "driver_id");

-- CreateIndex
CREATE UNIQUE INDEX "trip_template_legacy_id_key" ON "trip_template"("legacy_id");

-- CreateIndex
CREATE UNIQUE INDEX "disposal_permit_legacy_id_key" ON "disposal_permit"("legacy_id");

-- CreateIndex
CREATE INDEX "disposal_permit_code_idx" ON "disposal_permit"("code");

-- CreateIndex
CREATE INDEX "disposal_permit_vehicle_id_status_valid_from_valid_to_idx" ON "disposal_permit"("vehicle_id", "status", "valid_from", "valid_to");

-- CreateIndex
CREATE INDEX "disposal_permit_status_valid_from_valid_to_idx" ON "disposal_permit"("status", "valid_from", "valid_to");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_day_legacy_id_key" ON "transaction_day"("legacy_id");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_day_date_key" ON "transaction_day"("date");

-- CreateIndex
CREATE INDEX "haul_operation_date_idx" ON "haul"("operation_date");

-- CreateIndex
CREATE INDEX "haul_legacy_id_idx" ON "haul"("legacy_id");

-- CreateIndex
CREATE UNIQUE INDEX "haul_operation_date_transaction_day_id_vehicle_id_key" ON "haul"("operation_date", "transaction_day_id", "vehicle_id");

-- CreateIndex
CREATE INDEX "haul_assignment_haul_id_idx" ON "haul_assignment"("haul_id");

-- CreateIndex
CREATE INDEX "haul_assignment_operation_date_idx" ON "haul_assignment"("operation_date");

-- CreateIndex
CREATE INDEX "haul_assignment_legacy_id_idx" ON "haul_assignment"("legacy_id");

-- CreateIndex
CREATE INDEX "trip_haul_assignment_id_idx" ON "trip"("haul_assignment_id");

-- CreateIndex
CREATE INDEX "trip_route_id_idx" ON "trip"("route_id");

-- CreateIndex
CREATE INDEX "trip_status_idx" ON "trip"("status");

-- CreateIndex
CREATE INDEX "trip_operation_date_idx" ON "trip"("operation_date");

-- CreateIndex
CREATE INDEX "trip_legacy_id_idx" ON "trip"("legacy_id");

-- CreateIndex
CREATE UNIQUE INDEX "photo_object_key_key" ON "photo"("object_key");

-- CreateIndex
CREATE INDEX "photo_owner_type_owner_id_idx" ON "photo"("owner_type", "owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_record_legacy_id_key" ON "maintenance_record"("legacy_id");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_record_code_key" ON "maintenance_record"("code");

-- CreateIndex
CREATE INDEX "maintenance_record_vehicle_id_idx" ON "maintenance_record"("vehicle_id");

-- CreateIndex
CREATE INDEX "maintenance_record_date_idx" ON "maintenance_record"("date");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_item_legacy_id_key" ON "maintenance_item"("legacy_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_inspection_legacy_id_key" ON "vehicle_inspection"("legacy_id");

-- CreateIndex
CREATE INDEX "vehicle_inspection_vehicle_id_idx" ON "vehicle_inspection"("vehicle_id");

-- CreateIndex
CREATE INDEX "vehicle_inspection_date_idx" ON "vehicle_inspection"("date");

-- CreateIndex
CREATE INDEX "tpa_inbound_log_date_idx" ON "tpa_inbound_log"("date");

-- CreateIndex
CREATE INDEX "tpa_inbound_log_plate_number_idx" ON "tpa_inbound_log"("plate_number");

-- CreateIndex
CREATE INDEX "tpa_inbound_log_trip_id_idx" ON "tpa_inbound_log"("trip_id");

-- CreateIndex
CREATE INDEX "tpa_inbound_log_legacy_id_idx" ON "tpa_inbound_log"("legacy_id");

-- CreateIndex
CREATE UNIQUE INDEX "daily_tonnage_legacy_id_key" ON "daily_tonnage"("legacy_id");

-- CreateIndex
CREATE UNIQUE INDEX "daily_tonnage_date_key" ON "daily_tonnage"("date");

-- CreateIndex
CREATE INDEX "monthly_tonnage_by_source_month_idx" ON "monthly_tonnage_by_source"("month");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_tonnage_by_source_month_source_key" ON "monthly_tonnage_by_source"("month", "waste_source_id");

-- CreateIndex
CREATE INDEX "monthly_tonnage_by_site_month_idx" ON "monthly_tonnage_by_site"("month");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_tonnage_by_site_month_site_key" ON "monthly_tonnage_by_site"("month", "site_id");

-- CreateIndex
CREATE INDEX "daily_fuel_by_vehicle_date_idx" ON "daily_fuel_by_vehicle"("date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_fuel_by_vehicle_date_vehicle_key" ON "daily_fuel_by_vehicle"("date", "vehicle_id");

-- CreateIndex
CREATE INDEX "monthly_route_activity_month_idx" ON "monthly_route_activity"("month");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_route_activity_month_route_key" ON "monthly_route_activity"("month", "route_id");

-- CreateIndex
CREATE INDEX "archive_catalog_period_idx" ON "archive_catalog"("period");

-- CreateIndex
CREATE UNIQUE INDEX "archive_catalog_table_period_key" ON "archive_catalog"("table_name", "period");

-- CreateIndex
CREATE UNIQUE INDEX "levy_legacy_id_key" ON "levy"("legacy_id");

-- CreateIndex
CREATE INDEX "levy_date_idx" ON "levy"("date");

-- CreateIndex
CREATE INDEX "levy_category_name_date_idx" ON "levy"("category_name", "date");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel" ADD CONSTRAINT "fuel_fuel_category_id_fkey" FOREIGN KEY ("fuel_category_id") REFERENCES "fuel_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_model" ADD CONSTRAINT "vehicle_model_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "vehicle_application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_model" ADD CONSTRAINT "vehicle_model_fuel_id_fkey" FOREIGN KEY ("fuel_id") REFERENCES "fuel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle" ADD CONSTRAINT "vehicle_pool_site_id_fkey" FOREIGN KEY ("pool_site_id") REFERENCES "site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle" ADD CONSTRAINT "vehicle_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "vehicle_model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver" ADD CONSTRAINT "driver_pool_site_id_fkey" FOREIGN KEY ("pool_site_id") REFERENCES "site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_license" ADD CONSTRAINT "driver_license_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_license" ADD CONSTRAINT "driver_license_license_class_id_fkey" FOREIGN KEY ("license_class_id") REFERENCES "license_class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route" ADD CONSTRAINT "route_origin_site_id_fkey" FOREIGN KEY ("origin_site_id") REFERENCES "site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route" ADD CONSTRAINT "route_destination_site_id_fkey" FOREIGN KEY ("destination_site_id") REFERENCES "site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_waste_source" ADD CONSTRAINT "vehicle_waste_source_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_waste_source" ADD CONSTRAINT "vehicle_waste_source_waste_source_id_fkey" FOREIGN KEY ("waste_source_id") REFERENCES "waste_source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crew_schedule" ADD CONSTRAINT "crew_schedule_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crew_schedule" ADD CONSTRAINT "crew_schedule_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_template" ADD CONSTRAINT "trip_template_crew_schedule_id_fkey" FOREIGN KEY ("crew_schedule_id") REFERENCES "crew_schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_template" ADD CONSTRAINT "trip_template_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "route"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disposal_permit" ADD CONSTRAINT "disposal_permit_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disposal_permit" ADD CONSTRAINT "disposal_permit_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disposal_permit" ADD CONSTRAINT "disposal_permit_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disposal_permit" ADD CONSTRAINT "disposal_permit_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "haul" ADD CONSTRAINT "haul_transaction_day_id_fkey" FOREIGN KEY ("transaction_day_id") REFERENCES "transaction_day"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "haul" ADD CONSTRAINT "haul_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "haul_assignment" ADD CONSTRAINT "haul_assignment_haul_id_fkey" FOREIGN KEY ("haul_id") REFERENCES "haul"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "haul_assignment" ADD CONSTRAINT "haul_assignment_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "haul_assignment" ADD CONSTRAINT "haul_assignment_crew_schedule_id_fkey" FOREIGN KEY ("crew_schedule_id") REFERENCES "crew_schedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "haul_assignment" ADD CONSTRAINT "haul_assignment_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "haul_assignment" ADD CONSTRAINT "haul_assignment_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip" ADD CONSTRAINT "trip_haul_assignment_id_fkey" FOREIGN KEY ("haul_assignment_id") REFERENCES "haul_assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip" ADD CONSTRAINT "trip_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "route"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip" ADD CONSTRAINT "trip_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip" ADD CONSTRAINT "trip_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip" ADD CONSTRAINT "trip_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip" ADD CONSTRAINT "trip_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_record" ADD CONSTRAINT "maintenance_record_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_record" ADD CONSTRAINT "maintenance_record_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_record" ADD CONSTRAINT "maintenance_record_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_item" ADD CONSTRAINT "maintenance_item_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "maintenance_record"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_inspection" ADD CONSTRAINT "vehicle_inspection_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_inspection" ADD CONSTRAINT "vehicle_inspection_inspector_id_fkey" FOREIGN KEY ("inspector_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_inspection" ADD CONSTRAINT "vehicle_inspection_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_item" ADD CONSTRAINT "inspection_item_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "vehicle_inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "levy" ADD CONSTRAINT "levy_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "levy" ADD CONSTRAINT "levy_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

