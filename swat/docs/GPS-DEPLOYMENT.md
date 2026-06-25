# GPS Tracking Deployment & Ops (Phase 7)

## Infrastructure prerequisite — PostGIS

Phase 7 requires **PostGIS**. The Postgres image is `postgis/postgis:15-3.4`
(dev `swat/docker-compose.yml`, prod `swat/infra/docker-compose.prod.yml`). The
`enable_postgis` migration runs `CREATE EXTENSION postgis`. On **AWS RDS**, enable
PostGIS on the `swat_staging`/prod DB (`CREATE EXTENSION postgis;` — RDS ships the
library) before `migrate deploy`.

Swapping the image on an existing cluster may require recreating the data volume
(PostGIS shared libs differ from the alpine cluster) — reseed afterward in dev.

## Migrations

Use `prisma migrate deploy` — **never `migrate dev`**. `gps_ping` is monthly
RANGE-partitioned (PK `(recorded_at, id)`) with a maintained `geography(Point)`
GENERATED column + GiST index; `route_geometry` has a `geography(LineString)`
column. These are managed in raw SQL and are **invisible to `schema.prisma`** —
`migrate dev` would report drift.

```
pnpm db:generate && pnpm db:migrate        # = migrate deploy
SELECT postgis_version();                  # verify
prisma migrate status                      # no drift
```

## nginx / proxy (SSE)

The realtime stream (`/api/v1/realtime/fleet`) is Server-Sent Events. The dev
`infra/nginx.conf.template` has a dedicated `location` with `proxy_buffering off`,
HTTP/1.1, `Connection ""`, and a long `proxy_read_timeout`. Caddy (staging) streams
SSE without extra config. Ensure any prod proxy mirrors the nginx settings.

## Environment

See `swat/.env.example`. Required for GPS: `GPS_WEBHOOK_TOKEN` (prod), optional
`GPS_WEBHOOK_ALLOWED_IPS`, `GPS_INGEST_RATE_LIMIT_PER_MIN`,
`GPS_DEVICE_OFFLINE_MINUTES`; pull creds `GPSID_BASE_URL/USERNAME/PASSWORD`;
web `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (restrict by HTTP referrer + enabled APIs).

## Recurring ops jobs (all `@Cron`, in-process)

| Job                   | Schedule     | Purpose                                                                                                                                                              |
| --------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GpsDeviceOfflineJob` | every minute | flip stale devices → offline + publish                                                                                                                               |
| `GpsEfficiencyJob`    | 02:00 daily  | heal prior-day efficiency + GPS.id mileage reconcile                                                                                                                 |
| (partition creation)  | —            | `gps_ping` has pre-created monthly partitions through 2027 + a DEFAULT partition; **add a recurring job to create future months** before the explicit range runs out |
| (retention)           | —            | reuse the Phase 2 archiving job to detach `gps_ping` partitions older than 30 days                                                                                   |

## Rollout

Pilot on **10–20 vehicles with a few drawn corridors** before fleet-wide. Routes
without a corridor are tracked (position only) until one is drawn. See
`GPSID-REGISTRATION.md` for webhook setup and `GPS-WEBHOOK-SECURITY.md` for the
security model.
