-- Persist the corridor editor's sparse control points (waypoints) so a
-- snap-to-road corridor re-opens with its handles, not the dense snapped line.
-- Plain nullable JSONB — independent of the geography(LineString) generated
-- column, so it does not interact with the raw-SQL spatial migration. Applied
-- via `prisma migrate deploy` (route_geometry is a regular, non-partitioned table).
ALTER TABLE "route_geometry" ADD COLUMN IF NOT EXISTS "waypoints" jsonb;
