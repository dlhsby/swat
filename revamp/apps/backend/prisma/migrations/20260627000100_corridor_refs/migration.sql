-- Phase 7.8 / T-726: reference the first-class Corridor from the templates and the
-- day's trips. TripTemplate.corridorId is the leg/vehicle default; Trip.corridorId
-- is the day's chosen corridor (copied from the template at daily-init, switchable).
-- Additive — Route.routeId / route_geometry stay until T-728. `trip` is a
-- range-partitioned table: ALTER / CREATE INDEX / ADD CONSTRAINT on the parent
-- cascade to every partition (PG15 supports FKs from a partitioned table).

ALTER TABLE "trip_template" ADD COLUMN "corridor_id" UUID;
CREATE INDEX "trip_template_corridor_id_idx" ON "trip_template" ("corridor_id");
ALTER TABLE "trip_template"
  ADD CONSTRAINT "trip_template_corridor_id_fkey"
    FOREIGN KEY ("corridor_id") REFERENCES "corridor" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "trip" ADD COLUMN "corridor_id" UUID;
CREATE INDEX "trip_corridor_id_idx" ON "trip" ("corridor_id");
ALTER TABLE "trip"
  ADD CONSTRAINT "trip_corridor_id_fkey"
    FOREIGN KEY ("corridor_id") REFERENCES "corridor" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
