-- Rename CrewSchedule → ScheduleTemplate (the parent "Template Jadwal"). Table +
-- FK columns + the non-partitioned indexes/constraints. The haul_assignment FK
-- column rename cascades to all partitions; its constraint name is left as-is
-- (cosmetic; renaming a constraint across 150+ partitions is unnecessary).
ALTER TABLE "crew_schedule" RENAME TO "schedule_template";
ALTER TABLE "trip_template" RENAME COLUMN "crew_schedule_id" TO "schedule_template_id";
ALTER TABLE "haul_assignment" RENAME COLUMN "crew_schedule_id" TO "schedule_template_id";

ALTER INDEX "crew_schedule_pkey" RENAME TO "schedule_template_pkey";
ALTER INDEX "crew_schedule_legacy_id_key" RENAME TO "schedule_template_legacy_id_key";
ALTER INDEX "crew_schedule_vehicle_id_driver_id_key" RENAME TO "schedule_template_vehicle_id_driver_id_key";

ALTER TABLE "schedule_template" RENAME CONSTRAINT "crew_schedule_vehicle_id_fkey" TO "schedule_template_vehicle_id_fkey";
ALTER TABLE "schedule_template" RENAME CONSTRAINT "crew_schedule_driver_id_fkey" TO "schedule_template_driver_id_fkey";
ALTER TABLE "trip_template" RENAME CONSTRAINT "trip_template_crew_schedule_id_fkey" TO "trip_template_schedule_template_id_fkey";
