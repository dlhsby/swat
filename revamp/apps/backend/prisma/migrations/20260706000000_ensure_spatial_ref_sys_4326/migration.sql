-- Ensure SRID 4326 (WGS84) exists in PostGIS's `spatial_ref_sys`.
--
-- On some managed Postgres (observed on the staging RDS) the PostGIS extension is
-- enabled — its functions exist and ST_* runs — but the coordinate-system registry
-- table `spatial_ref_sys` was left unpopulated. Every `::geography` cast then fails
-- with `Cannot find SRID (4326) in spatial_ref_sys`, which broke corridor
-- length/geog computation (the default-corridor backfill) and, via the same
-- dependency, GPS `ST_DWithin` corridor matching.
--
-- Idempotent: no-ops where 4326 already exists (dev/CI/prod run on the
-- `postgis/postgis` image whose `spatial_ref_sys` ships fully populated).
--
-- NON-FATAL: `spatial_ref_sys` is owned by the PostGIS extension, so if the
-- migrating role lacks INSERT on it the block RAISEs a warning (run the INSERT
-- once as the database owner/superuser) rather than failing the whole
-- `prisma migrate deploy` and blocking every later migration.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM spatial_ref_sys WHERE srid = 4326) THEN
    INSERT INTO spatial_ref_sys (srid, auth_name, auth_srid, proj4text, srtext)
    VALUES (
      4326,
      'EPSG',
      4326,
      '+proj=longlat +datum=WGS84 +no_defs ',
      'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4326"]]'
    );
    RAISE NOTICE 'Inserted SRID 4326 into spatial_ref_sys.';
  END IF;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE WARNING 'Could not populate spatial_ref_sys SRID 4326 (insufficient privilege). Run once as the DB owner: INSERT INTO spatial_ref_sys (srid, auth_name, auth_srid, proj4text, srtext) VALUES (4326, ''EPSG'', 4326, ''+proj=longlat +datum=WGS84 +no_defs '', ''<srtext>'');';
END $$;
