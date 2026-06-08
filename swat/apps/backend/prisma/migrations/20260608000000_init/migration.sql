-- CreateEnum
CREATE TYPE "SiteType" AS ENUM ('POOL', 'SPBU', 'TPS', 'TPA');

-- CreateEnum
CREATE TYPE "RouteCategory" AS ENUM ('DEPART_POOL', 'REFUEL', 'PICKUP', 'DISPOSAL', 'RETURN_POOL');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('IN_PROGRESS', 'DONE', 'VERIFIED');

-- CreateEnum
CREATE TYPE "DayStatus" AS ENUM ('IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "FuelQuotaStatus" AS ENUM ('ACTIVE', 'INACTIVE');

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
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "legacyId" INTEGER,
    "roleId" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "deletedAt" TIMESTAMPTZ(6),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" SERIAL NOT NULL,
    "legacyId" INTEGER,
    "name" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" SERIAL NOT NULL,
    "key" VARCHAR(64) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" INTEGER NOT NULL,
    "permissionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "AuthAuditLog" (
    "id" BIGSERIAL NOT NULL,
    "userId" INTEGER,
    "username" VARCHAR(100) NOT NULL,
    "action" "AuthAction" NOT NULL,
    "ip" VARCHAR(45) NOT NULL,
    "userAgent" VARCHAR(512) NOT NULL,
    "timestamp" TIMESTAMPTZ(6) NOT NULL,
    "details" VARCHAR(512),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AuthAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleApplication" (
    "id" SERIAL NOT NULL,
    "legacyId" INTEGER,
    "name" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "VehicleApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelCategory" (
    "id" SERIAL NOT NULL,
    "legacyId" INTEGER,
    "name" VARCHAR(20) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "FuelCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fuel" (
    "id" SERIAL NOT NULL,
    "legacyId" INTEGER,
    "fuelCategoryId" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "pricePerLiter" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Fuel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleModel" (
    "id" SERIAL NOT NULL,
    "legacyId" INTEGER,
    "applicationId" INTEGER NOT NULL,
    "fuelId" INTEGER NOT NULL,
    "brand" VARCHAR(100) NOT NULL,
    "fuelTankCapacity" INTEGER NOT NULL,
    "normalFuelRatio" INTEGER NOT NULL DEFAULT 1,
    "normalTareWeight" INTEGER NOT NULL,
    "maxNetLoad" INTEGER DEFAULT 0,
    "maxNetVolume" INTEGER DEFAULT 0,
    "wheelCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "VehicleModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" SERIAL NOT NULL,
    "legacyId" INTEGER,
    "poolSiteId" INTEGER NOT NULL,
    "modelId" INTEGER NOT NULL,
    "status" "VehicleStatus" NOT NULL DEFAULT 'GOOD',
    "plateNumber" VARCHAR(10) NOT NULL,
    "chassisNumber" VARCHAR(100) NOT NULL,
    "engineNumber" VARCHAR(100) NOT NULL,
    "manufactureYear" INTEGER,
    "currentFuelRatio" INTEGER NOT NULL DEFAULT 1,
    "currentTareWeight" INTEGER NOT NULL,
    "currentOdometer" INTEGER NOT NULL,
    "registrationExpiry" DATE NOT NULL,
    "taxExpiry" DATE NOT NULL,
    "notes" VARCHAR(512),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "deletedAt" TIMESTAMPTZ(6),

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LicenseClass" (
    "id" SERIAL NOT NULL,
    "legacyId" INTEGER,
    "name" VARCHAR(10) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "LicenseClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" SERIAL NOT NULL,
    "legacyId" INTEGER,
    "poolSiteId" INTEGER NOT NULL,
    "employmentStatus" "EmploymentStatus" NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "idCardNumber" VARCHAR(16) NOT NULL,
    "originAddress" VARCHAR(256) NOT NULL,
    "currentAddress" VARCHAR(256) NOT NULL,
    "birthDate" DATE NOT NULL,
    "contact" VARCHAR(100) NOT NULL,
    "safetyTraining" VARCHAR(100) DEFAULT 'BELUM',
    "notes" VARCHAR(256),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "deletedAt" TIMESTAMPTZ(6),

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverLicense" (
    "id" SERIAL NOT NULL,
    "legacyId" INTEGER,
    "driverId" INTEGER NOT NULL,
    "licenseClassId" INTEGER NOT NULL,
    "licenseNumber" VARCHAR(12) NOT NULL,
    "expiry" DATE NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "DriverLicense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" SERIAL NOT NULL,
    "legacyId" INTEGER,
    "type" "SiteType" NOT NULL,
    "name" VARCHAR(256) NOT NULL,
    "address" VARCHAR(512) NOT NULL,
    "latitude" DECIMAL(11,6),
    "longitude" DECIMAL(11,6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "deletedAt" TIMESTAMPTZ(6),

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Route" (
    "id" SERIAL NOT NULL,
    "legacyId" INTEGER,
    "category" "RouteCategory" NOT NULL,
    "originSiteId" INTEGER NOT NULL,
    "destinationSiteId" INTEGER NOT NULL,
    "distanceKm" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "deletedAt" TIMESTAMPTZ(6),

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WasteSource" (
    "id" SERIAL NOT NULL,
    "legacyId" INTEGER,
    "code" VARCHAR(5) NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "notes" VARCHAR(1024),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "WasteSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleWasteSource" (
    "id" SERIAL NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "wasteSourceId" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "VehicleWasteSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrewSchedule" (
    "id" SERIAL NOT NULL,
    "legacyId" INTEGER,
    "vehicleId" INTEGER NOT NULL,
    "driverId" INTEGER NOT NULL,
    "departTime" TIME NOT NULL,
    "returnTime" TIME NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CrewSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripTemplate" (
    "id" SERIAL NOT NULL,
    "legacyId" INTEGER,
    "crewScheduleId" INTEGER NOT NULL,
    "routeId" INTEGER NOT NULL,
    "targetTime" TIME NOT NULL,
    "fuelRequestedLiters" DECIMAL(8,2),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TripTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelQuota" (
    "id" BIGSERIAL NOT NULL,
    "legacyId" INTEGER,
    "code" VARCHAR(50),
    "vehicleId" INTEGER NOT NULL,
    "siteId" INTEGER NOT NULL,
    "status" "FuelQuotaStatus" NOT NULL DEFAULT 'ACTIVE',
    "issuedAt" TIMESTAMPTZ(6) NOT NULL,
    "validFrom" DATE NOT NULL,
    "validTo" DATE NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "FuelQuota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionDay" (
    "id" SERIAL NOT NULL,
    "legacyId" INTEGER,
    "date" DATE NOT NULL,
    "status" "DayStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TransactionDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Haul" (
    "id" BIGSERIAL NOT NULL,
    "legacyId" BIGINT,
    "transactionDayId" INTEGER NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "operationDate" DATE NOT NULL,
    "status" "DayStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "notes" VARCHAR(256),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Haul_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HaulAssignment" (
    "id" BIGSERIAL NOT NULL,
    "legacyId" BIGINT,
    "haulId" BIGINT NOT NULL,
    "driverId" INTEGER NOT NULL,
    "crewScheduleId" INTEGER,
    "operationDate" DATE NOT NULL,
    "status" "DayStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "departTargetOdometer" INTEGER NOT NULL DEFAULT 0,
    "departActualOdometer" INTEGER,
    "returnTargetOdometer" INTEGER NOT NULL DEFAULT 0,
    "returnActualOdometer" INTEGER,
    "departTargetTime" TIMESTAMPTZ(6),
    "departActualTime" TIMESTAMPTZ(6),
    "returnTargetTime" TIMESTAMPTZ(6),
    "returnActualTime" TIMESTAMPTZ(6),
    "notes" VARCHAR(256),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "HaulAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" BIGSERIAL NOT NULL,
    "legacyId" BIGINT,
    "haulAssignmentId" BIGINT NOT NULL,
    "routeId" INTEGER,
    "recordedById" INTEGER,
    "operationDate" DATE NOT NULL,
    "status" "TripStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "name" VARCHAR(256) NOT NULL,
    "targetTime" TIMESTAMPTZ(6),
    "actualTime" TIMESTAMPTZ(6),
    "targetOdometer" INTEGER NOT NULL DEFAULT 0,
    "actualOdometer" INTEGER NOT NULL DEFAULT 0,
    "tareWeight" INTEGER NOT NULL DEFAULT 0,
    "grossWeight" INTEGER,
    "netWeight" INTEGER,
    "wasteVolume" INTEGER,
    "fuelRequestedLiters" DECIMAL(8,2),
    "fuelApprovedLiters" DECIMAL(8,2),
    "scheduledEntryAt" TIMESTAMPTZ(6),
    "realizationEntryAt" TIMESTAMPTZ(6),
    "notes" VARCHAR(512),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,
    "verifiedById" INTEGER,
    "verifiedAt" TIMESTAMPTZ(6),

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" BIGSERIAL NOT NULL,
    "objectKey" VARCHAR(512) NOT NULL,
    "contentType" VARCHAR(100) NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "checksum" VARCHAR(64) NOT NULL,
    "ownerType" VARCHAR(40) NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceRecord" (
    "id" BIGSERIAL NOT NULL,
    "legacyId" BIGINT,
    "code" VARCHAR(30),
    "vehicleId" INTEGER NOT NULL,
    "type" "MaintenanceType" NOT NULL DEFAULT 'SERVICE',
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "date" DATE NOT NULL,
    "odometer" INTEGER,
    "workshop" VARCHAR(256),
    "description" VARCHAR(512),
    "totalCost" INTEGER NOT NULL DEFAULT 0,
    "notes" VARCHAR(512),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "MaintenanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceItem" (
    "id" BIGSERIAL NOT NULL,
    "legacyId" BIGINT,
    "recordId" BIGINT NOT NULL,
    "name" VARCHAR(256) NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 0,
    "unitPrice" INTEGER NOT NULL DEFAULT 0,
    "totalPrice" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "MaintenanceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleInspection" (
    "id" BIGSERIAL NOT NULL,
    "legacyId" BIGINT,
    "vehicleId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "inspectorId" INTEGER,
    "result" "InspectionResult" NOT NULL DEFAULT 'PASS',
    "passedCount" INTEGER NOT NULL DEFAULT 0,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "notes" VARCHAR(512),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdById" INTEGER,

    CONSTRAINT "VehicleInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionItem" (
    "id" BIGSERIAL NOT NULL,
    "inspectionId" BIGINT NOT NULL,
    "label" VARCHAR(128) NOT NULL,
    "status" "InspectionItemStatus" NOT NULL DEFAULT 'OK',
    "notes" VARCHAR(256),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "InspectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TpaInboundLog" (
    "id" SERIAL NOT NULL,
    "legacyId" INTEGER,
    "dateLabel" VARCHAR(50),
    "date" DATE,
    "plateNumber" VARCHAR(20),
    "depot" VARCHAR(200),
    "sourceTruck" VARCHAR(200),
    "grossWeight" INTEGER,
    "tareWeight" INTEGER,
    "netWeight" INTEGER,
    "cctvReference" VARCHAR(256),
    "tripId" BIGINT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TpaInboundLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyTonnage" (
    "id" SERIAL NOT NULL,
    "legacyId" INTEGER,
    "date" DATE NOT NULL,
    "amount" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "DailyTonnage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegacyNameMap" (
    "id" SERIAL NOT NULL,
    "si" VARCHAR(250),
    "swat" VARCHAR(250),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "LegacyNameMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Levy" (
    "id" BIGSERIAL NOT NULL,
    "legacyId" BIGINT,
    "categoryName" VARCHAR(100) NOT NULL,
    "date" DATE NOT NULL,
    "amount" BIGINT NOT NULL,
    "notes" VARCHAR(256),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdById" INTEGER,
    "updatedById" INTEGER,

    CONSTRAINT "Levy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_legacyId_key" ON "User"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Role_legacyId_key" ON "Role"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE INDEX "AuthAuditLog_userId_idx" ON "AuthAuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuthAuditLog_timestamp_idx" ON "AuthAuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "AuthAuditLog_action_idx" ON "AuthAuditLog"("action");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleApplication_legacyId_key" ON "VehicleApplication"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "FuelCategory_legacyId_key" ON "FuelCategory"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "Fuel_legacyId_key" ON "Fuel"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleModel_legacyId_key" ON "VehicleModel"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_legacyId_key" ON "Vehicle"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_plateNumber_key" ON "Vehicle"("plateNumber");

-- CreateIndex
CREATE INDEX "Vehicle_poolSiteId_idx" ON "Vehicle"("poolSiteId");

-- CreateIndex
CREATE INDEX "Vehicle_modelId_idx" ON "Vehicle"("modelId");

-- CreateIndex
CREATE UNIQUE INDEX "LicenseClass_legacyId_key" ON "LicenseClass"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_legacyId_key" ON "Driver"("legacyId");

-- CreateIndex
CREATE INDEX "Driver_poolSiteId_idx" ON "Driver"("poolSiteId");

-- CreateIndex
CREATE UNIQUE INDEX "DriverLicense_legacyId_key" ON "DriverLicense"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "Site_legacyId_key" ON "Site"("legacyId");

-- CreateIndex
CREATE INDEX "Site_type_idx" ON "Site"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Route_legacyId_key" ON "Route"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "Route_originSiteId_destinationSiteId_category_key" ON "Route"("originSiteId", "destinationSiteId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "WasteSource_legacyId_key" ON "WasteSource"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "WasteSource_code_key" ON "WasteSource"("code");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleWasteSource_vehicleId_wasteSourceId_key" ON "VehicleWasteSource"("vehicleId", "wasteSourceId");

-- CreateIndex
CREATE UNIQUE INDEX "CrewSchedule_legacyId_key" ON "CrewSchedule"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "CrewSchedule_vehicleId_driverId_key" ON "CrewSchedule"("vehicleId", "driverId");

-- CreateIndex
CREATE UNIQUE INDEX "TripTemplate_legacyId_key" ON "TripTemplate"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "FuelQuota_legacyId_key" ON "FuelQuota"("legacyId");

-- CreateIndex
CREATE INDEX "FuelQuota_code_idx" ON "FuelQuota"("code");

-- CreateIndex
CREATE INDEX "FuelQuota_vehicleId_status_validFrom_validTo_idx" ON "FuelQuota"("vehicleId", "status", "validFrom", "validTo");

-- CreateIndex
CREATE INDEX "FuelQuota_status_validFrom_validTo_idx" ON "FuelQuota"("status", "validFrom", "validTo");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionDay_legacyId_key" ON "TransactionDay"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionDay_date_key" ON "TransactionDay"("date");

-- CreateIndex
CREATE INDEX "Haul_operationDate_idx" ON "Haul"("operationDate");

-- CreateIndex
CREATE INDEX "Haul_legacyId_idx" ON "Haul"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "Haul_operationDate_transactionDayId_vehicleId_key" ON "Haul"("operationDate", "transactionDayId", "vehicleId");

-- CreateIndex
CREATE INDEX "HaulAssignment_haulId_idx" ON "HaulAssignment"("haulId");

-- CreateIndex
CREATE INDEX "HaulAssignment_operationDate_idx" ON "HaulAssignment"("operationDate");

-- CreateIndex
CREATE INDEX "HaulAssignment_legacyId_idx" ON "HaulAssignment"("legacyId");

-- CreateIndex
CREATE INDEX "Trip_haulAssignmentId_idx" ON "Trip"("haulAssignmentId");

-- CreateIndex
CREATE INDEX "Trip_routeId_idx" ON "Trip"("routeId");

-- CreateIndex
CREATE INDEX "Trip_status_idx" ON "Trip"("status");

-- CreateIndex
CREATE INDEX "Trip_operationDate_idx" ON "Trip"("operationDate");

-- CreateIndex
CREATE INDEX "Trip_legacyId_idx" ON "Trip"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "Photo_objectKey_key" ON "Photo"("objectKey");

-- CreateIndex
CREATE INDEX "Photo_ownerType_ownerId_idx" ON "Photo"("ownerType", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceRecord_legacyId_key" ON "MaintenanceRecord"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceRecord_code_key" ON "MaintenanceRecord"("code");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_vehicleId_idx" ON "MaintenanceRecord"("vehicleId");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_date_idx" ON "MaintenanceRecord"("date");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceItem_legacyId_key" ON "MaintenanceItem"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleInspection_legacyId_key" ON "VehicleInspection"("legacyId");

-- CreateIndex
CREATE INDEX "VehicleInspection_vehicleId_idx" ON "VehicleInspection"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleInspection_date_idx" ON "VehicleInspection"("date");

-- CreateIndex
CREATE INDEX "TpaInboundLog_date_idx" ON "TpaInboundLog"("date");

-- CreateIndex
CREATE INDEX "TpaInboundLog_plateNumber_idx" ON "TpaInboundLog"("plateNumber");

-- CreateIndex
CREATE INDEX "TpaInboundLog_tripId_idx" ON "TpaInboundLog"("tripId");

-- CreateIndex
CREATE INDEX "TpaInboundLog_legacyId_idx" ON "TpaInboundLog"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyTonnage_legacyId_key" ON "DailyTonnage"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyTonnage_date_key" ON "DailyTonnage"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Levy_legacyId_key" ON "Levy"("legacyId");

-- CreateIndex
CREATE INDEX "Levy_date_idx" ON "Levy"("date");

-- CreateIndex
CREATE INDEX "Levy_categoryName_date_idx" ON "Levy"("categoryName", "date");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fuel" ADD CONSTRAINT "Fuel_fuelCategoryId_fkey" FOREIGN KEY ("fuelCategoryId") REFERENCES "FuelCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleModel" ADD CONSTRAINT "VehicleModel_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "VehicleApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleModel" ADD CONSTRAINT "VehicleModel_fuelId_fkey" FOREIGN KEY ("fuelId") REFERENCES "Fuel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_poolSiteId_fkey" FOREIGN KEY ("poolSiteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "VehicleModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_poolSiteId_fkey" FOREIGN KEY ("poolSiteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverLicense" ADD CONSTRAINT "DriverLicense_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverLicense" ADD CONSTRAINT "DriverLicense_licenseClassId_fkey" FOREIGN KEY ("licenseClassId") REFERENCES "LicenseClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_originSiteId_fkey" FOREIGN KEY ("originSiteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_destinationSiteId_fkey" FOREIGN KEY ("destinationSiteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleWasteSource" ADD CONSTRAINT "VehicleWasteSource_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleWasteSource" ADD CONSTRAINT "VehicleWasteSource_wasteSourceId_fkey" FOREIGN KEY ("wasteSourceId") REFERENCES "WasteSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewSchedule" ADD CONSTRAINT "CrewSchedule_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewSchedule" ADD CONSTRAINT "CrewSchedule_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripTemplate" ADD CONSTRAINT "TripTemplate_crewScheduleId_fkey" FOREIGN KEY ("crewScheduleId") REFERENCES "CrewSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripTemplate" ADD CONSTRAINT "TripTemplate_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelQuota" ADD CONSTRAINT "FuelQuota_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelQuota" ADD CONSTRAINT "FuelQuota_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelQuota" ADD CONSTRAINT "FuelQuota_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelQuota" ADD CONSTRAINT "FuelQuota_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Haul" ADD CONSTRAINT "Haul_transactionDayId_fkey" FOREIGN KEY ("transactionDayId") REFERENCES "TransactionDay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Haul" ADD CONSTRAINT "Haul_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HaulAssignment" ADD CONSTRAINT "HaulAssignment_haulId_fkey" FOREIGN KEY ("haulId") REFERENCES "Haul"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HaulAssignment" ADD CONSTRAINT "HaulAssignment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HaulAssignment" ADD CONSTRAINT "HaulAssignment_crewScheduleId_fkey" FOREIGN KEY ("crewScheduleId") REFERENCES "CrewSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HaulAssignment" ADD CONSTRAINT "HaulAssignment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HaulAssignment" ADD CONSTRAINT "HaulAssignment_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_haulAssignmentId_fkey" FOREIGN KEY ("haulAssignmentId") REFERENCES "HaulAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceItem" ADD CONSTRAINT "MaintenanceItem_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "MaintenanceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleInspection" ADD CONSTRAINT "VehicleInspection_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleInspection" ADD CONSTRAINT "VehicleInspection_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleInspection" ADD CONSTRAINT "VehicleInspection_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionItem" ADD CONSTRAINT "InspectionItem_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "VehicleInspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Levy" ADD CONSTRAINT "Levy_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Levy" ADD CONSTRAINT "Levy_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

