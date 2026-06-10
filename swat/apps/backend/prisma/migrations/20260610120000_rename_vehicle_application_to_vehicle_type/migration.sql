-- Full rename: VehicleApplication -> VehicleType.
-- Renames the table and the FK column on vehicle_model. Constraint/index names
-- are left as-is (cosmetic; Prisma matches on table/column names, not constraint
-- names). Data is preserved by the rename.

ALTER TABLE "vehicle_application" RENAME TO "vehicle_type";
ALTER TABLE "vehicle_model" RENAME COLUMN "application_id" TO "vehicle_type_id";
