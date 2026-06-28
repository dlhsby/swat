-- Denormalize the planned route onto trip_template: a snapshot (category + origin +
-- destination sites) that stands on its own if the Route catalogue changes/disappears
-- or is later replaced by map-derived geometry. The route_id FK is kept alongside.

-- 1. Add the snapshot columns nullable so existing rows can be backfilled.
ALTER TABLE "trip_template"
  ADD COLUMN "route_category" "RouteCategory",
  ADD COLUMN "origin_site_id" UUID,
  ADD COLUMN "destination_site_id" UUID;

-- 2. Backfill from each template's current route.
UPDATE "trip_template" AS tt
SET "route_category" = r."category",
    "origin_site_id" = r."origin_site_id",
    "destination_site_id" = r."destination_site_id"
FROM "route" AS r
WHERE r."id" = tt."route_id";

-- 3. Enforce NOT NULL now that every row carries a snapshot.
ALTER TABLE "trip_template"
  ALTER COLUMN "route_category" SET NOT NULL,
  ALTER COLUMN "origin_site_id" SET NOT NULL,
  ALTER COLUMN "destination_site_id" SET NOT NULL;

-- 4. Referential integrity on the snapshot site ids.
ALTER TABLE "trip_template"
  ADD CONSTRAINT "trip_template_origin_site_id_fkey"
    FOREIGN KEY ("origin_site_id") REFERENCES "site"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "trip_template_destination_site_id_fkey"
    FOREIGN KEY ("destination_site_id") REFERENCES "site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "trip_template_origin_site_id_idx" ON "trip_template"("origin_site_id");
CREATE INDEX "trip_template_destination_site_id_idx" ON "trip_template"("destination_site_id");
