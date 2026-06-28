-- Persist the per-day Trip-override editor's sparse control points (waypoints)
-- so a snap-to-road override re-opens with its handles, mirroring
-- route_geometry.waypoints. Plain nullable JSONB. `trip` is a partitioned table —
-- ALTER on the parent cascades to all partitions. Applied via `prisma migrate deploy`.
ALTER TABLE "trip" ADD COLUMN IF NOT EXISTS "geometry_waypoints" jsonb;
