-- Phase 7.8 (revised): a Corridor now BELONGS to a Route (1..N), replacing the
-- standalone library. Endpoints come from the route's two Sites; the first corridor
-- per route is the auto-generated straight-line default. The `corridor` table is
-- brand-new (this unmerged branch, demo data only), so we clear it + drop the
-- standalone leg metadata rather than backfill.

-- Clear test corridors + their references first (demo only; no production data).
UPDATE "trip" SET "corridor_id" = NULL WHERE "corridor_id" IS NOT NULL;
UPDATE "trip_template" SET "corridor_id" = NULL WHERE "corridor_id" IS NOT NULL;
DELETE FROM "corridor";

-- Drop the standalone leg metadata (now derived from the owning route).
ALTER TABLE "corridor" DROP CONSTRAINT IF EXISTS "corridor_origin_site_id_fkey";
ALTER TABLE "corridor" DROP CONSTRAINT IF EXISTS "corridor_destination_site_id_fkey";
DROP INDEX IF EXISTS "corridor_origin_site_id_destination_site_id_category_idx";
ALTER TABLE "corridor" DROP COLUMN IF EXISTS "origin_site_id";
ALTER TABLE "corridor" DROP COLUMN IF EXISTS "destination_site_id";
ALTER TABLE "corridor" DROP COLUMN IF EXISTS "category";

-- Belong to a route + mark the auto-created default.
ALTER TABLE "corridor" ADD COLUMN "route_id" UUID NOT NULL;
ALTER TABLE "corridor" ADD COLUMN "is_default" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "corridor_route_id_idx" ON "corridor" ("route_id");
ALTER TABLE "corridor"
  ADD CONSTRAINT "corridor_route_id_fkey"
    FOREIGN KEY ("route_id") REFERENCES "route" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
