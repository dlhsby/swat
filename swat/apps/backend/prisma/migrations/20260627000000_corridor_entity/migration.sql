-- Phase 7.8 / T-725: first-class, reusable Corridor. A named drawn path that
-- templates/trips will reference many-to-one (T-726). Endpoint columns are
-- metadata for filtering — deliberately NOT unique, so a leg can have several
-- alternate corridors (road class, day situation). Additive: route_geometry stays
-- until T-728. Mirrors route_geometry's maintained geography(LineString,4326)
-- GENERATED column + GiST index. Applied via `prisma migrate deploy`.

CREATE TABLE "corridor" (
    "id" UUID NOT NULL,
    "legacy_id" INTEGER,
    "name" VARCHAR(120) NOT NULL,
    "category" "RouteCategory",
    "origin_site_id" UUID,
    "destination_site_id" UUID,
    "path_geojson" JSONB NOT NULL,
    "waypoints" JSONB,
    "tolerance_meters" INTEGER NOT NULL DEFAULT 150,
    "length_meters" INTEGER NOT NULL DEFAULT 0,
    "source" VARCHAR(20) NOT NULL DEFAULT 'google-maps',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    "created_by_id" UUID,
    "updated_by_id" UUID,
    "deleted_by_id" UUID,

    CONSTRAINT "corridor_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "corridor_origin_site_id_destination_site_id_category_idx"
    ON "corridor" ("origin_site_id", "destination_site_id", "category");
CREATE INDEX "corridor_deleted_at_idx" ON "corridor" ("deleted_at");

ALTER TABLE "corridor"
    ADD CONSTRAINT "corridor_origin_site_id_fkey"
        FOREIGN KEY ("origin_site_id") REFERENCES "site" ("id")
        ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "corridor_destination_site_id_fkey"
        FOREIGN KEY ("destination_site_id") REFERENCES "site" ("id")
        ON DELETE SET NULL ON UPDATE CASCADE;

-- Maintained geography(LineString,4326) from the GeoJSON path + GiST index for
-- ST_DWithin / ST_Length corridor queries (Prisma 7 cannot model geography).
ALTER TABLE "corridor"
  ADD COLUMN "geog" geography(LineString, 4326)
    GENERATED ALWAYS AS (
      ST_SetSRID(ST_GeomFromGeoJSON("path_geojson"::text), 4326)::geography
    ) STORED;

CREATE INDEX "corridor_geog_gist" ON "corridor" USING GIST ("geog");
