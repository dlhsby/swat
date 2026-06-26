# Phase 7 — Fleet GPS Tracking & Route-Deviation Monitoring

> ## Implementation status (live tracker)
> Built on branch `feat/phase-7-gps-foundation` (one PR for the whole phase). Each
> task verified (typecheck + lint + tests, live PostGIS/Redis where relevant) and
> committed as a checkpoint.
>
> - **Epic 7.0** — ✅ T-701, T-702
> - **Epic 7.1** — ✅ T-703, T-704, T-705, T-706, T-707
> - **Epic 7.2** — ✅ T-708, T-709, T-710¹, T-711
> - **Epic 7.3** — ✅ T-712², T-713, T-714
> - **Epic 7.4** — ✅ T-715, T-716
> - **Epic 7.5** — ✅ T-717, T-718³
> - **Epic 7.6** — ✅ T-719⁴, T-720, T-721
> - **Epic 7.7** — ✅ T-722, T-723⁵, T-724
>
> **All 24 tasks implemented.** Deferred follow-ups (tracked above): per-day Trip
> corridor UI wiring (¹), `dwell_too_long` + `off_sequence`
> matcher checks (²), global alert-bell + history (³), `adherencePct`/`dwellMinutes`
> efficiency (⁴), a live webhook→SSE E2E spec + load test (⁵).
>
> ¹ T-710: route-template corridor editor shipped + tested. **Post-Phase-7
>   enhancement (done):** the editor now snaps segments to roads via the Maps JS
>   Directions service (browser key — no server proxy), with draggable refine + an
>   Auto/Bebas (freehand) toggle for off-road segments, and persists the sparse
>   control points (`route_geometry.waypoints`) so corridors re-open with handles.
>   A **Lokasi (Site) map pin-picker** (drop/drag pin ⇄ lat/lng + address search)
>   shipped alongside. The **per-day Trip-override editor** is now wired too: the
>   shared `CorridorEditorCore` backs both the route-template editor and a
>   `TripCorridorEditor` reachable from the record/quick-entry board ("Koridor
>   harian", `/gps/trips/:id/geometry`). Trip overrides now **persist control
>   waypoints** too (`Trip.geometryWaypoints`), so a per-day override re-opens with
>   its sparse handles just like a route template.
> ² T-712: `off_corridor` (PostGIS ST_DWithin + Redis hysteresis + auto-resolve) and
>   `late_to_schedule` implemented; `dwell_too_long` (needs Site-geofence spatial
>   check) and `off_sequence` (leg-sequence logic) are tracked follow-ups.
> ³ T-718: alert center lives on the Pengangkutan → Peta tab (live SSE + REST,
>   acknowledge); a global header-bell + filterable history view are follow-ups.
> ⁴ T-719: efficiency rollup computes odometer-primary distance, late minutes,
>   deviation count, internal wasted-fuel + nightly GPS.id mileage cross-check
>   (T-720) + dashboard (T-721); `adherencePct`/`dwellMinutes` left NULL (need
>   ping-vs-corridor replay + the deferred dwell logic) — tracked follow-up.
> ⁵ T-723: docs (`docs/GPS-WEBHOOK-SECURITY.md`, `PRIVACY-NOTICE-GPS.md`,
>   `GPSID-REGISTRATION.md`, `GPS-DEPLOYMENT.md`) + demo seed (corridor + synthetic
>   tracks + efficiency rollup, alongside the online/offline/untracked devices)
>   shipped; the webhook→ping→matcher→alert→SSE flow is covered end-to-end by unit
>   tests — a live E2E spec + load test are a tracked follow-up.

## Overview

Track the operational fleet in **real time** using the **hardware GPS trackers (GPS.id) already installed
on the vehicles**, compare each vehicle's live track against the **route corridor defined for that day**,
**alert supervisors the moment a vehicle diverges**, and **roll up efficiency/waste analytics** (route
adherence, wasted time, wasted fuel) for top management. Route corridors are **drawn on Google Maps and
stored as a reusable template per route**, and can be **overridden for a single day** from the schedule.

This phase **executes [RFC-0002](../14-proposals/RFC-0002-gps-route-deviation-alerts/) via its preferred
"device telematics" path** (graduated to the committed spec [`09-modules/gps-tracking.md`](../09-modules/gps-tracking.md)).
It **supersedes** the original *Field/Mobile + GPS* plan that used to occupy the GPS slot ("offline-first
PWA where a driver logs in to be tracked"): a browser PWA cannot reliably track in the background, so genuine
offline/native field capture is **deferred to a future native app**
([RFC-0003](../14-proposals/RFC-0003-native-field-app/)). We do **not** track via driver login here — the
vehicle's own GPS hardware is the source of truth.

> **Phase order:** this GPS feature phase (**Phase 7**) precedes the final
> [**Phase 8 — Production Readiness**](./phase-8.md) cutover, so GPS ships as part of the production go-live.

**Effort:** 5–6 weeks. **Dependencies:** Phase 1 (`Vehicle`, `Route`, `Trip`, `Site`,
`ScheduleTemplate`/`TripTemplate`, daily-init), Phase 2 (monitoring rollups + caching + archiving job),
Phase 4 (weighbridge — reuse its service-account/API-key auth + audit). Docker stack live (must switch
Postgres → PostGIS image; Redis, MinIO, nginx already up).

**Key deliverables:**
- GPS.id **webhook ingestion** (secret token + IP allowlist + rate-limit + audit) → BullMQ worker →
  partitioned `GpsPing` log + live vehicle position + **device-offline detection**.
- **Route corridor geometry** drawn on **Google Maps**, stored as a **template per `Route`**, overridable
  per day on the `Trip`.
- **PostGIS deviation engine** (off-corridor / off-sequence / dwell / late) with hysteresis + debounce and
  **graceful degradation** (routes without a corridor are tracked but not corridor-checked).
- **Real-time delivery** via a new **SSE/WebSocket gateway + Redis pub/sub** (<2 s) to the live map +
  **alert center** (incl. nginx proxy config for streaming).
- **Hybrid positioning (tracked + untracked vehicles):** GPS-equipped vehicles show a **live** position;
  vehicles **without** a GPS device still appear on the map at a position **derived from their recorded
  realization activity** (the last/in-progress trip leg's Site), clearly distinguished. **One map, full
  fleet.**
- **Surfaced inside the existing route monitoring page** (`/monitoring/hauling` — Pengangkutan → **Peta**,
  the Phase 6 `<HaulingMap>`), as a live vehicle layer — not a separate screen.
- **Efficiency & waste analytics**: internal computation (live) — **distance from device odometer delta
  (primary), GPS track (fallback)** — cross-checked nightly against GPS.id `/report/mileage` (`used_fuel`).

### Locked design decisions
| Area | Decision |
|------|----------|
| Maps | **Google Maps Platform everywhere** (corridor authoring + live fleet map). Corridor predefined in the Route template, editable in the template **and** per day on ad-hoc scheduling. |
| Alerts | **SSE/WebSocket gateway + Redis pub/sub** (new realtime layer, <2 s). |
| Geometry | **Route-master template (1 per `Route`) + optional per-day `Trip` override**; the day inherits the template unless overridden. |
| Efficiency | **Internal computation (primary, live) cross-checked nightly against GPS.id mileage/`used_fuel`.** |

### GPS.id integration facts (vendor docs)
- **Push (primary):** GPS.id POSTs JSON to a webhook **registered manually by email** (it.ss@gps.id),
  **every 30 s per unit**. Fields: `VehicleId` (IMEI), `VehicleNumber` (plate), `DatetimeUTC`, `GpsLocation`,
  `Lon`, `Lat`, `Speed`, `Direction` (heading 0–360), `Engine` (ACC ON/OFF), `Odometer` (meters),
  `Car_Status` (START/STOP), `VehicleType`, `Alarm`. **The webhook has no vendor authentication** — SWAT
  secures it (token + IP allowlist + rate-limit + audit) and treats every field as untrusted.
  ⚠ The vendor names the field `DatetimeUTC`, but its pull endpoints document timestamps "per the GPS
  unit's timezone" — **verify whether push timestamps are truly UTC or WIB during integration** (T-705).
- **Pull (secondary — nightly batch only):** Bearer token (24 h); `get-vehicle`, `vehicle/detail/{imei}`,
  `report/history`, `report/mileage` (`used_fuel_total`). **Rate-limited ~5 req/5 min** → nightly only.

### Forward compatibility — future native app / multi-source (design now, build later)
GPS.id is the **first** source, not the only one. A future **native/React-Native app** may track **vehicles
that have no hardware tracker**, or **complement** the vehicle GPS with phone GPS. Phase 7 makes the
**cheap** schema/contract choices now so that future source plugs into the **same** `GpsPing` → matcher →
realtime → analytics pipeline with **no rework** — without building any mobile code here:
- **Source-tagged pings:** `GpsPing.source` (`gpsid` | `mobile` | …) + `GpsPing.accuracyM` (weight sources).
- **Adapter ingestion:** each source normalizes to **one canonical ping** and enqueues to the shared
  `gps-ingest` queue. GPS.id = the webhook (token + IP). The future mobile app = a separate authenticated
  endpoint `POST /gps/mobile/pings` using the **per-user OAuth2 bearer** already specified for native clients
  ([`future-native-client-auth.md`](./future-native-client-auth.md)) — **not** built in Phase 7.
- **Multi-source device model:** `GpsDevice` is **not** hard-locked 1:1 to a vehicle — uniqueness is on the
  device id, with a partial unique index keeping "one active **hardware** tracker per vehicle". A vehicle can
  later gain a `mobile-app` source. **Source selection (decided): hardware-preferred with phone fallback, no
  fusion** — the authoritative source is the lowest-`priority` device (hardware=0, phone=10) that pinged
  within `GPS_DEVICE_OFFLINE_MINUTES`; ties → most-recent, then best `accuracyM`; fall back to phone when
  hardware is stale/absent. The matcher consumes that single source (no averaging — avoids jitter). See
  [`gps-tracking.md`](../09-modules/gps-tracking.md) §1.3.
- Mobile capture itself is scoped in [RFC-0003](../14-proposals/RFC-0003-native-field-app/).

### Master-data integration & hybrid positioning (tracked + untracked vehicles)
**Not every vehicle has a GPS tracker** — the design must show the **whole fleet** on the route monitoring
map regardless, so management never sees a partial picture.

- **Master data stays clean.** The `Vehicle` master is **not** modified with GPS fields; the GPS link lives
  in a separate **`GpsDevice`** row (FK `vehicleId`, mapped by IMEI). **A vehicle with no `GpsDevice` row is
  simply "untracked".** This is a pure additive join — no migration of existing vehicle data. The Vehicle
  list/detail gains a derived **GPS-coverage badge** (`Tracked · online` / `Tracked · offline` / `Tidak
  terlacak`) from the device's `status`; the device mapping is editable both in the Tracking admin (T-704)
  and embedded in the Vehicle detail page.
- **One position-resolution service** (`vehicle-position.service.ts`) — **device presence chooses the
  source** (not freshness): a vehicle **with a GPS device always uses GPS**; a vehicle **without** one uses
  recorded activity. For each vehicle with activity today it returns a
  `VehiclePosition { source, lat, lng, asOf, status, … }`:
  - **`live-gps` (online)** — vehicle **has a GPS device** with a **fresh** ping → live lat/lng/speed/heading
    + corridor adherence + deviation state. Moves in real time.
  - **`live-gps` (offline)** — vehicle **has a GPS device** but the last ping is **stale**
    (> `GPS_DEVICE_OFFLINE_MINUTES`) → show its **last-known GPS position**, flagged **offline**. **It does
    NOT fall back to recorded activity** — the last GPS fix is more precise than a site snap.
  - **`recorded-activity`** — vehicle has **no GPS device** → position **derived from the recorded
    realization**: the Site coordinates of the **last leg with a recorded `actualTime`** (or the in-progress
    leg's destination = "heading to"), labelled *"berdasarkan aktivitas tercatat · [leg] @ [actualTime]"*.
    **No live movement, no corridor/deviation matching** — but **schedule lateness** (vs `targetTime`) is
    still derived from realization.
  - **`none`** — no GPS device **and** no recorded activity yet (and, for a GPS vehicle, never any fix today)
    → not plotted (or shown dimmed at its pool).
- **One map, clearly distinguished.** Live-GPS vehicles render as **solid moving markers** (with trail +
  corridor + deviation badge); recorded-activity vehicles render as a **distinct marker** (hollow/grey with a
  clock glyph) snapped to the last-recorded Site, with an "as-of" timestamp. A legend explains both. Sites
  must have `latitude/longitude` for the recorded-activity placement (already on the `Site` master).
- **Reuses Phase 6 realization data** — the recorded-activity position comes from the same `Trip` /
  `HaulAssignment` actuals and `Site` coordinates the Pengangkutan **Peta** tab already plots; we add the
  vehicle layer on top.

### Reuse (do not reinvent)
| Need | Reuse | Path |
|------|-------|------|
| Inbound auth (service-account API key, IP allowlist, audit) | `WeighbridgeGuard`, `ServiceAccountsService`, `generateApiKey()` | `apps/backend/src/modules/integrations/weighbridge/`, `.../guards/weighbridge.guard.ts`, `apps/backend/src/common/auth/api-key.ts` |
| Async queue/worker | BullMQ producer + `WorkerHost` (reports) | `apps/backend/src/modules/reports/report-job.queue.ts`, `report-generation.worker.ts` |
| Redis cache + atomic rate-limit + pub/sub | `CacheService.increment(key, ttl)` | `apps/backend/src/modules/cache/cache.service.ts` |
| Rollup (incremental + nightly heal + backfill) | `RollupService.refreshForOperationDate()`, `pnpm rollup:backfill` | `apps/backend/src/modules/analytics/rollup.service.ts` |
| Partitioned table migration (PK `(partition_key,id)`, DEFAULT partition, monthly helper) | `partition_transactions` migration | `apps/backend/prisma/migrations/20260608000100_partition_transactions/migration.sql` |
| Module shape (controller/service/repository/dto/types, `class-validator`, `$queryRaw`, Redis-cached reads) | Monitoring module | `apps/backend/src/modules/monitoring/` |
| Daily materialization | `DailyInitService` | `apps/backend/src/modules/transactions/daily-init/daily-init.service.ts` |
| **Route monitoring map** (site markers + route polylines, Google Maps) — extend with the vehicle layer | Phase 6 `<HaulingMap>` + `GET /monitoring/route-map` | `apps/web/.../monitoring/hauling/`, `apps/backend/src/modules/monitoring/` |
| **Realization actuals for recorded-activity positions** | `Trip`/`HaulAssignment` actuals (`actualTime`, leg `destinationSite`) + `Site.latitude/longitude` | `apps/backend/src/modules/transactions/`, `monitoring.repository.ts` |
| Env validation / typed config | Zod `env.validation.ts` + `AppConfigService` | `apps/backend/src/config/` |

---

## Technical foundations & gotchas (read before T-701)

These are **load-bearing** — verified against the existing codebase; ignore them and the phase stalls.

1. **PostGIS is not installed.** `swat/docker-compose.yml` and CI run `postgres:15-alpine`, which has **no
   PostGIS**. Epic 7.0 swaps both to `postgis/postgis:15-3.4` and enables the extension via raw-SQL
   migration. On the partitioned/PostGIS tables use **`prisma migrate deploy`, never `migrate dev`** (drift).
2. **Prisma 7 has no native geometry type.** Strategy: store the human/portable form in Prisma
   (`pathGeojson Json`, `latitude/longitude Decimal(11,6)`) and maintain a **PostGIS column the Prisma model
   does not know about** — a `GENERATED ALWAYS AS (...) STORED` (or trigger-maintained) `geography` column
   added in raw SQL with a **GiST index**. All spatial queries go through **`$queryRaw`** (`ST_DWithin`,
   `ST_Length`, `ST_LineLocatePoint`). Never put `geography` in `schema.prisma`.
3. **Partition key must be in the PK.** Existing partitioned tables use PK `(partition_key, id)` (e.g.
   `trip_pkey = (operation_date, id)`). `gps_ping` is **partitioned monthly by `recorded_at`** (device event
   time — better for "track for date X" pruning), so **PK = `(recorded_at, id)`** and a **DEFAULT partition**
   catches late/odd timestamps. A unique `(recorded_at, imei)` is therefore valid and is our dedup key.
4. **Dedup:** DB unique `(recorded_at, imei)` with `INSERT … ON CONFLICT DO NOTHING`, plus a short-TTL Redis
   "seen" guard in the worker to skip redundant matcher runs. (A global unique on a non-partition column is
   impossible on a partitioned table — this is why we partition by `recorded_at`.)
5. **nginx is not streaming-ready.** `infra/nginx.conf.template` uses plain `proxy_pass` — no
   `proxy_http_version 1.1`, no `Upgrade`/`Connection` map, no `proxy_buffering off`. **SSE/WS breaks behind
   nginx** until T-715 adds a streaming-friendly `location` for the realtime endpoint.
6. **`Vehicle.currentFuelRatio` is km/L** (Int ≥1, per [`master-fleet.md`](../09-modules/master-fleet.md)) —
   coarse but usable for the fuel-waste estimate; `VehicleModel.normalFuelRatio` is the baseline.
7. **Dwell at a Site is legitimate** (loading/dumping). The dwell check excludes a radius around `Site`
   coordinates — Epic 7.1 adds `Site.geofenceRadiusM Int?` (default 100 m).

---

## Epic 7.0 — Infrastructure, schema foundations & scaffolding (Size: M)

**Sequencing:** must complete before any other epic.

#### T-701. PostGIS image (docker-compose + CI) + extension migration

- **Size:** S · **Coverage:** — (infra)
- **Files:**
  - `swat/docker-compose.yml` (modify) — `postgres` service `image: postgis/postgis:15-3.4`
  - `swat/infra/docker-compose.prod.yml` (modify) — same image
  - `.github/workflows/ci.yml` (modify) — Postgres service container → `postgis/postgis:15-3.4`
  - `apps/backend/prisma/migrations/<ts>_enable_postgis/migration.sql` (create) — `CREATE EXTENSION IF NOT EXISTS postgis;`
- **Steps:** swap images; confirm the Prisma 7 `pg` adapter + any pooling work with PostGIS; recreate the dev
  volume if needed (extension on a fresh cluster).
- **Acceptance criteria:**
  - [ ] `SELECT postgis_version();` succeeds locally and in CI.
  - [ ] `pnpm test` (backend) runs against the PostGIS image green.

#### T-702. GPS module scaffolding + permissions + env

- **Size:** S · **Coverage:** ≥80%
- **Depends on:** T-701
- **Files:**
  - `apps/backend/src/modules/integrations/gps/gps.module.ts` (create) — wire controllers/services/queues/worker
  - `apps/backend/src/modules/integrations/integrations.module.ts` (modify) — register `GpsModule`
  - `apps/backend/prisma/seed.ts` (modify) — seed new permissions + grant to roles (Supervisor: `tracking:read`,
    `deviation-alert:read|acknowledge`; DataAdmin: `gps-device:*`, `route-geometry:manage`, `deviation-rule:manage`)
  - `apps/backend/src/config/env.validation.ts` (modify, Zod) + `config.service.ts` (typed getters) —
    `GPS_WEBHOOK_TOKEN`, `GPS_WEBHOOK_ALLOWED_IPS`, `GPS_INGEST_RATE_LIMIT_PER_MIN`,
    `GPS_DEVICE_OFFLINE_MINUTES` (default 10), and the **GPS.id pull credentials** `GPSID_BASE_URL`,
    `GPSID_USERNAME`, `GPSID_PASSWORD` (all required when the nightly pull/reconcile is enabled; **never
    hardcoded** — fail loudly if missing)
  - `apps/backend/.env.example` (modify) — document `GPSID_BASE_URL` / `GPSID_USERNAME` / `GPSID_PASSWORD`
    (operator provides the real values) + the `GPS_WEBHOOK_*` vars
  - `apps/web/.env.example` (modify) — `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- **Acceptance criteria:**
  - [ ] `GpsModule` boots and is registered; app starts.
  - [ ] New permissions seeded + role-granted; idempotent reseed.
  - [ ] Config fails loudly if a required GPS var is missing.

---

## Epic 7.1 — Device registry & GPS.id ingestion (Size: L)

**Parallel group:** 7.1 and 7.2 can parallelize after 7.0; both feed 7.3.

#### T-703. GPS/geometry/alert schema + partitioning (raw SQL)

- **Size:** M · **Coverage:** ≥85%
- **Depends on:** T-701
- **Files:**
  - `apps/backend/prisma/schema.prisma` (modify) — `GpsDevice` (**multi-source-ready**: `deviceType`
    `gps-hardware|mobile-app`, unique `deviceId`, `vehicleId` **not** unique, `priority`, `status`),
    `GpsPing` (incl. `source` + `accuracyM`), `GpsUnmatchedPing`, `RouteGeometry` (`pathGeojson Json`),
    `DeviationRule`, `DeviationAlert`, `DailyVehicleEfficiency` (incl. `positionSource` `gps|recorded` and
    **nullable** `adherencePct?`/`dwellMinutes?` — null = N/A for untracked, not 0); `Vehicle.devices` relation;
    `Trip.geometryOverride Json?` + `Trip.geometryToleranceM Int?`; `Site.geofenceRadiusM Int?`
  - partial unique index `gps_device(vehicle_id) WHERE device_type='gps-hardware' AND active` (raw SQL) —
    one active hardware tracker per vehicle, while allowing a future `mobile-app` source on the same vehicle
  - `apps/backend/prisma/migrations/<ts>_gps_ping_partition/migration.sql` (create) — `gps_ping` PK
    `(recorded_at, id)`, monthly RANGE partitions on `recorded_at` + DEFAULT partition (reuse the helper from
    `partition_transactions`); maintained `geography(Point,4326)` column + GiST index
  - `apps/backend/prisma/migrations/<ts>_route_geometry_geog/migration.sql` (create) — maintained
    `geography(LineString,4326)` column on `route_geometry` + GiST index; `ST_Length` for `length_meters`
- **Acceptance criteria:**
  - [ ] `migrate deploy` applies cleanly; `prisma migrate status` shows no drift; no `geography` in `schema.prisma`.
  - [ ] `gps_ping` partitioned by `recorded_at` with PK `(recorded_at,id)`, unique `(recorded_at,imei)`, GiST spatial index, DEFAULT partition present.
  - [ ] Future monthly partitions are **auto-created** by the same recurring helper/job as `partition_transactions` (not left to the DEFAULT partition long-term).
  - [ ] `pnpm db:generate && pnpm typecheck` clean.

#### T-704. Vehicle↔IMEI device registration + master-data coverage (CRUD + UI + unmatched queue)

- **Size:** M · **Coverage:** ≥85%
- **Depends on:** T-702, T-703
- **Files:** `apps/backend/src/modules/integrations/gps/gps-device.{controller,service,repository}.ts` + `dto/`;
  `packages/schemas/src/gps-device.schema.ts`; `apps/web/src/app/[locale]/(app)/tracking/devices/page.tsx` + `apps/web/src/lib/nav.ts` (devices admin entry);
  `apps/web/.../fleet/vehicles/*` (modify — embed a "GPS Device" section in vehicle detail + a coverage column
  in the vehicle list); `apps/backend/.../fleet/vehicles/*` (modify — include derived GPS-coverage in the
  vehicle read DTO); `apps/backend/prisma/seed.ts` (demo IMEIs, leaving **some demo vehicles intentionally
  untracked**).
- **Steps:** attach/detach IMEI↔vehicle (`gps-device:read|manage`) — **the only join into the Vehicle master;
  the `Vehicle` table is not altered**; list/clear the `GpsUnmatchedPing` queue with one-click "map to
  vehicle"; expose a derived **GPS-coverage status** (`Tracked · online` / `Tracked · offline` / `Tidak
  terlacak`) on the vehicle list + detail; Indonesian validation.
- **Acceptance criteria:**
  - [ ] One active **hardware** device per vehicle (partial unique index; unique `deviceId`); model leaves room for a future `mobile-app` source.
  - [ ] Unmatched-IMEI queue lists unknown IMEIs and maps one to a vehicle in a single action.
  - [ ] A vehicle **without** a device is valid and shows `Tidak terlacak`; coverage badge is correct for online/offline/untracked.
  - [ ] The `Vehicle` table schema is unchanged (the GPS link is the separate `GpsDevice` row); existing vehicle data needs no migration.
  - [ ] RBAC enforced; Indonesian validation messages; tests ≥85%; lint+typecheck clean.

#### T-705. GPS.id webhook ingestion endpoint

- **Size:** M · **Coverage:** ≥85%
- **Depends on:** T-702, T-703
- **Files:** `gps.controller.ts` (`POST /integrations/gps/webhook/:token`); `dto/gpsid-webhook.dto.ts`
  (`class-validator` over the GPS.id field names; accept object **or** array); `gps-ingest.queue.ts` (BullMQ producer).
- **Steps:** constant-time token compare; optional IP allowlist (reuse weighbridge IP helper); per-source
  rate-limit (`CacheService.increment`); normalize the GPS.id payload into the **canonical ping**
  (`vehicleId, latitude, longitude, speedKmh, heading, recordedAt, source='gpsid', accuracyM?`) — the same
  shape a future `POST /gps/mobile/pings` adapter will produce; **clock-skew handling** (reject `recordedAt`
  in the future; accept stale with a flag; verify UTC-vs-WIB and document); enqueue to the shared
  `gps-ingest` queue; respond `200 {accepted:n}` fast; audit every call.
- **Acceptance criteria:**
  - [ ] Valid token+payload (single/batch) → 200 `{accepted}`, enqueued; bad token → 401; bad IP → 403; over-rate → 429.
  - [ ] Future timestamp rejected; UTC/WIB behavior documented; every call in `ApiAuditLog`.

#### T-706. `gps-ingest` worker → persist + live position + device-offline + fan-out

- **Size:** M · **Coverage:** ≥90%
- **Depends on:** T-705, T-704
- **Files:** `gps-ingest.worker.ts` (`WorkerHost`); `gps-ping.repository.ts`; `gps-position.publisher.ts` (Redis `gps:positions`); `gps-device-offline.job.ts` (`@Cron` — the device-offline sweep).
- **Steps:** resolve IMEI→`GpsDevice`→`Vehicle` (unknown → `GpsUnmatchedPing`, never drop); insert `GpsPing`
  (`ON CONFLICT (recorded_at,imei) DO NOTHING` + Redis seen-guard); upsert `GpsDevice` last-known position +
  `lastPingAt`; publish position; trigger the matcher (Epic 7.3). A scheduled sweep marks devices **offline**
  when `now - lastPingAt > GPS_DEVICE_OFFLINE_MINUTES` and publishes a status change.
- **Acceptance criteria:**
  - [ ] Ping persisted (dedup honored); live position + `lastPingAt` updated + published.
  - [ ] Unknown IMEI parked; BullMQ retry/backoff; worker re-reads fresh state.
  - [ ] Stale device flips to `offline` and emits a status event.

#### T-707. GPS.id pull-API client (backfill / reconciliation)

- **Size:** M · **Coverage:** ≥85%
- **Depends on:** T-702
- **Files:** `gpsid-client.service.ts` (24 h token cache; `get-vehicle`, `report/history`, `report/mileage`) + `dto/`.
- **Steps:** read **`GPSID_BASE_URL` / `GPSID_USERNAME` / `GPSID_PASSWORD` from `AppConfigService` (env-only,
  never hardcoded)**; `POST {GPSID_BASE_URL}/login` → token; token refresh; **rate-limit guard**
  (`CacheService.increment`; nightly batch, ≤5 imei/call); used
  for gap-fill (missed webhook windows) + the mileage cross-check (Epic 7.6); confirms the UTC/WIB question
  from T-705 against `report/history`. HTTP mocked in tests.
- **Acceptance criteria:**
  - [ ] Token cached/auto-refreshed; rate-limit guard prevents bursts; history + mileage fetch unit-tested.

---

## Epic 7.2 — Route corridor geometry (Google Maps authoring) (Size: L)

#### T-708. Geometry repository + maintained PostGIS column

- **Size:** S · **Coverage:** ≥85%
- **Depends on:** T-703
- **Files:** `route-geometry.repository.ts`; `corridor.repository.ts` (`$queryRaw` helpers: `ST_DWithin`, `ST_Length`).
- **Acceptance criteria:**
  - [ ] One `RouteGeometry` per `Route`; `Trip.geometryOverride` optional; `lengthMeters` computed via `ST_Length(geography)`.

#### T-709. Geometry CRUD + deviation-rule tuning API

- **Size:** M · **Coverage:** ≥90%
- **Depends on:** T-708
- **Files:** `route-geometry.{controller,service}.ts`; `deviation-rule.{controller,service}.ts`;
  `dto/upsert-route-geometry.dto.ts` (GeoJSON LineString + tolerance); `packages/schemas/src/route-geometry.schema.ts`.
- **Steps:** validate GeoJSON LineString (≥2 points, valid lng/lat); compute `lengthMeters`; CRUD on the
  **template** (`route-geometry:manage`) and on a day's **`Trip` override**; `DeviationRule` CRUD (`deviation-rule:manage`).
- **Acceptance criteria:**
  - [ ] Template + per-day override create/update/clear; invalid geometry → 422 (Indonesian); standard envelope; RBAC.

#### T-710. Google Maps corridor editor (template + ad-hoc day)

- **Size:** L · **Coverage:** ≥80%
- **Depends on:** T-709
- **Files:** `apps/web/src/components/tracking/RouteCorridorEditor.tsx` (Google Maps JS: draw polyline,
  snap-to-roads, set tolerance, preview buffer); `apps/web/src/lib/google-maps.ts` (loader; key from
  `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`); wire into Scheduling Route/Template screens **and** the day's ad-hoc trip editor.
- **Steps:** draw/edit/snap a corridor; save to the Route template **or** the day's `Trip` override (same
  component both contexts). **Snap-to-road** is implemented client-side via the Maps JS **Directions
  service** using the same referrer-restricted browser key (enable the Directions API on it) — drop
  ordered waypoints, segments auto-follow roads, draggable handles re-route, and an Auto/Bebas (freehand)
  toggle allows straight off-road segments; sparse control points persist to `route_geometry.waypoints`
  for clean re-editing. Fail to a placeholder if the public Maps key is missing.
- **Acceptance criteria:**
  - [x] Supervisor saves a Route-template corridor (snap-to-road + freehand); the override path
        (`/gps/trips/:id/geometry`) is backend-ready — wiring the day's-trip UI is a tracked follow-up.
  - [x] No hardcoded keys; the browser key is referrer-restricted (Maps JS + Directions + Geocoding).

#### T-711. Effective-corridor resolver + daily-init wiring

- **Size:** S · **Coverage:** ≥85%
- **Depends on:** T-708, Phase 1 daily-init
- **Files:** `corridor.repository.ts` (`resolveTripCorridor(trip)` → `Trip.geometryOverride ?? Route.RouteGeometry ?? null`);
  `apps/backend/src/modules/transactions/daily-init/daily-init.service.ts` (modify — no eager copy; resolve at match time).
- **Acceptance criteria:**
  - [ ] Day inherits the template by default; override wins; **null is valid** (route without a corridor).

---

## Epic 7.3 — Deviation detection engine (Size: L)

#### T-712. PostGIS matcher worker (active-leg resolution + graceful degradation)

- **Size:** L · **Coverage:** ≥90%
- **Depends on:** T-706, T-711
- **Files:** `deviation-matcher.service.ts`; `gps-matcher.worker.ts`; `corridor.repository.ts` (modify).
- **Steps:**
  0. **Live-gps only.** The matcher runs **only for vehicles with a GPS device** (it consumes `GpsPing`).
     **Untracked vehicles never enter the matcher** — they have no track to compare; their only exception
     signal is schedule-lateness derived from realization (surfaced by the position service, T-717).
  1. **Active leg:** pick the vehicle's active `Trip` (today, `IN_PROGRESS`) — the leg whose actual window is
     open, else by `targetTime` ordering vs now, else nearest-by-geometry. **No active haul/leg → track
     position only, no checks.**
  2. **Effective corridor** via `resolveTripCorridor`. **If null → skip `off_corridor`** (run only dwell/late
     where applicable). Corridor checks are opt-in per route as corridors get drawn.
  3. Checks: **off_corridor** (`ST_DWithin(geography, point, tolerance)` false beyond hysteresis),
     **off_sequence** (unplanned site visit), **dwell_too_long** (speed≈0 beyond threshold **outside any
     `Site.geofenceRadiusM`** — legitimate site stops excluded), **late_to_schedule** (actual vs `targetTime`
     + `lateMinutes`). Per-rule hysteresis/debounce; indexed → O(1)/ping.
- **Acceptance criteria:**
  - [ ] In-corridor ping → no alert; sustained off-corridor → `off_corridor` with `distanceM`.
  - [ ] Route without corridor → no `off_corridor`; idle/off-shift vehicle → tracked, no alert.
  - [ ] Dwell at a Site (within radius) → no `dwell` alert; dwell elsewhere → alert.
  - [ ] **Active-leg resolution unit-tested across all three fallbacks**: open-actual-window leg wins; else by `targetTime` vs now; else nearest-by-geometry; ties resolved deterministically.
  - [ ] Matcher **skips vehicles with no GPS device** (untracked never enter it).
  - [ ] A single GPS-noise ping never alerts; dwell/late/sequence unit-tested with synthetic tracks.

#### T-713. `DeviationRule`/`DeviationAlert` + alert service

- **Size:** M · **Coverage:** ≥90%
- **Depends on:** T-712
- **Files:** `deviation-alert.{service,repository}.ts`; `gps-alert.publisher.ts` (Redis `gps:alerts`); `seed.ts` (default rules).
- **Steps:** lifecycle — raise → coalesce same vehicle+type in window (`pingCount++`) → acknowledge →
  auto-resolve on corridor re-entry; publish to `gps:alerts`.
- **Acceptance criteria:**
  - [ ] Dedup/coalesce (one alert, count badge); ack sets user+timestamp; auto-resolve works; published.

#### T-714. Alert + rule REST API

- **Size:** S · **Coverage:** ≥85%
- **Depends on:** T-713
- **Files:** `deviation-alert.controller.ts` (`GET /gps/alerts` filter vehicle/status/date; `PATCH /gps/alerts/:id/acknowledge`); rule controller (T-709).
- **Acceptance criteria:**
  - [ ] List/filter/ack with RBAC `deviation-alert:read|acknowledge`; standard envelope.

---

## Epic 7.4 — Real-time delivery (SSE/WebSocket) (Size: M)

#### T-715. NestJS realtime gateway + Redis pub/sub + nginx streaming config

- **Size:** M · **Coverage:** ≥85%
- **Depends on:** T-706, T-713
- **Files:** `apps/backend/src/modules/realtime/realtime.gateway.ts` (SSE preferred — one-way fits positions+alerts);
  `realtime.module.ts`; Redis subscriber bridging `gps:positions`/`gps:alerts` → clients;
  `swat/infra/nginx.conf.template` (modify) — a `location` for the realtime endpoint with
  `proxy_http_version 1.1`, `proxy_set_header Connection ''`, `proxy_buffering off`, long `proxy_read_timeout`
  (and an `Upgrade`/`Connection` map if WS is chosen).
- **Steps:** session-auth on connect (`tracking:read`); channels `vehicle-{id}` and `all`; heartbeats;
  survive Redis reconnect.
- **Acceptance criteria:**
  - [ ] Authed client receives live positions + alerts **through nginx** (no buffering stall); unauthorized rejected; survives Redis reconnect.
  - [ ] Load check: ~100 concurrent stream clients at the 30 s ping cadence deliver updates with p95 <2 s end-to-end through nginx.

#### T-716. Web realtime client hook

- **Size:** S · **Coverage:** ≥80%
- **Depends on:** T-715
- **Files:** `apps/web/src/hooks/use-live-fleet.ts`; `apps/web/src/lib/realtime.ts`.
- **Acceptance criteria:**
  - [ ] Exposes `positions`, `alerts`, `connectionState` with auto-reconnect/backoff.

---

## Epic 7.5 — Hybrid fleet positioning + route-monitoring map UI (Size: L)

#### T-717. Hybrid fleet positioning (backend) + route-monitoring map layer (Google Maps)

- **Size:** L · **Coverage:** ≥85% (backend service) / ≥80% (UI)
- **Depends on:** T-716 (realtime hook), T-706 (live position), T-713 (deviation state), T-709 (corridor
  geometry for the overlay). **T-710 (the corridor *editor*) is a parallel enhancement, not a blocker** — the
  hybrid map ships and is valuable **without** any drawn corridors. Recorded-activity positions reuse Phase 1
  realization data (no new dep).
- **Files:**
  - **Backend:** `apps/backend/src/modules/monitoring/vehicle-position.service.ts` (create — the **single
    position-resolution service**, two sources); `packages/schemas/src/vehicle-position.schema.ts` (create —
    the `VehiclePosition` DTO/type: `source`, `lat`, `lng`, `asOf`, `status`, `vehicleId`, `plate`, `driver`,
    `adherence?`, `deviation?`); endpoint `GET /monitoring/fleet-positions?date=today`
    (create) returning the **whole active fleet** as `VehiclePosition[]` (`source: live-gps |
    recorded-activity | none`, `lat`, `lng`, `asOf`, `status`, `vehicleId`, `plate`, `driver`,
    `adherence?`, `deviation?`); `GET /gps/vehicles/:id/track?minutes=60` (live breadcrumb).
  - **Frontend (extend the existing route page, do not add a new screen):**
    `apps/web/.../monitoring/hauling/` — add a **vehicle layer** to the Phase 6 **Peta** tab; new
    `components/monitoring/hauling/{VehicleLayer,VehicleMarker,VehicleTrail}.tsx`; reuse `<HaulingMap>`,
    `CorridorOverlay`. (An optional maximized "Pelacakan" view may reuse the same components.)
- **Steps:**
  1. **`vehicle-position.service` (device presence picks the source):** for every vehicle with activity
     today — **if it has a GPS device → `live-gps`**: the latest fix (corridor adherence + deviation from
     Epic 7.3 when **fresh**; **last-known position flagged `offline`** when stale — **never** falling back to
     recorded activity). **If it has no device → `recorded-activity`**: the last `Trip` leg with a recorded
     `actualTime` → its `destinationSite` coords (in-progress leg → "heading to"), with schedule lateness vs
     `targetTime`. **`none`** when a GPS vehicle has no fix today and no recorded activity. Reuses the
     realization actuals + `Site` coords the Peta tab already plots.
  2. **Map layer:** **live-gps** vehicles = solid moving markers (colour by in/out-of-corridor; a distinct
     **offline** state when the device is stale) with corridor overlay + breadcrumb trail on tap; **recorded-
     activity** vehicles = a **distinct marker** (hollow/grey + clock glyph) snapped to the last-recorded
     Site with an **"as-of" timestamp**; a **legend** explains both. Live-gps positions update via
     `use-live-fleet` (<2 s); recorded-activity positions refresh on the page's date-range poll.
  3. **Clustering** for many vehicles; restrict `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` by **HTTP referrer +
     enabled-APIs** (it ships to the browser).
- **Acceptance criteria:**
  - [ ] `GET /monitoring/fleet-positions` returns **the whole active fleet** with the correct `source` per vehicle (live-gps / recorded-activity / none).
  - [ ] A GPS-equipped vehicle shows a **live moving** marker (corridor + trail + deviation flag); an **untracked** vehicle shows a **distinct** marker at its **last-recorded Site** with an as-of timestamp — both on the **same** Peta map.
  - [ ] A GPS vehicle whose device goes **stale** keeps its **last-known GPS position, flagged offline** (it does **not** switch to recorded-activity and does **not** disappear); an untracked vehicle uses recorded activity.
  - [ ] The map lives **inside `/monitoring/hauling` (Pengangkutan → Peta)** — no separate top-level screen; legend present; Maps key restricted.
  - [ ] **RBAC composition:** the Peta page is gated by `monitoring:read`; the live **vehicle layer** + `fleet-positions`/realtime calls require `tracking:read` and **degrade gracefully** (map + site/route still render) when the user lacks `tracking:read`.
  - [ ] Backend service ≥85%, UI ≥80%; lint+typecheck clean.

#### T-718. Alert center UI

- **Size:** M · **Coverage:** ≥80%
- **Depends on:** T-716, T-714
- **Files:** `apps/web/src/components/tracking/{AlertCenter,AlertHistory}.tsx`; header bell integration;
  surfaced on the Pengangkutan page alongside the Peta tab.
- **Steps:** live feed + unread badge (<2 s, optional sound); acknowledge; filterable history by
  vehicle/date/type. Deviation alerts apply to **live-gps vehicles only**. **Decision (Phase 7):**
  untracked-vehicle schedule-lateness is shown as a **marker status on the map only** (not an alert-center
  entry) — surfacing it as an alert is deferred to avoid alert noise from non-GPS estimates.
- **Acceptance criteria:**
  - [ ] New alerts stream in <2 s with badge; acknowledge sets user+timestamp; history filterable by vehicle/date/type.
  - [ ] Only live-gps vehicles produce corridor deviations in the alert center; untracked lateness appears as map status only, clearly schedule-based.
  - [ ] Inline field errors + toast per project convention; RBAC `deviation-alert:read|acknowledge`.

---

## Epic 7.6 — Efficiency & waste analytics (Size: M)

#### T-719. Per-trip efficiency computation + rollup

- **Size:** M · **Coverage:** ≥90%
- **Depends on:** T-706 (pings → device odometer/track for tracked vehicles), T-708 (`RouteGeometry.lengthMeters`
  = planned distance), T-712 (adherence/dwell). The **untracked** path needs none of these — it uses recorded
  `Trip.actualOdometer` + realization only.
- **Files:** `gps-efficiency.service.ts`; `apps/backend/src/modules/analytics/rollup.service.ts` (modify —
  `refreshEfficiencyForDate`); `DailyVehicleEfficiency` repo; nightly cron + `pnpm rollup:backfill`.
- **Steps:** compute per vehicle/day, **degrading gracefully by coverage**:
  - **Tracked (live-gps):** **actual distance = device odometer delta** (`odometerM` last−first; primary,
    robust), **GPS-track sum via PostGIS** fallback; `adherencePct` (% time in-corridor), `dwellMinutes`
    (speed≈0 off-site), `lateMinutes` (actual vs `targetTime`).
  - **Untracked (recorded-activity):** **actual distance = operator-recorded `Trip.actualOdometer` delta**;
    `lateMinutes` from realization (`actualTime` vs `targetTime`); **`adherencePct`/`dwellMinutes` are N/A**
    (no track). Still yields distance + schedule + (T-720) fuel — so untracked vehicles aren't blank.
  - Planned distance from `RouteGeometry.lengthMeters` (fallback `Route.distanceKm`). Stamp the row's
    `positionSource` (`gps`/`recorded`). Incremental on trip completion; nightly heal; idempotent.
- **Acceptance criteria:**
  - [ ] One row per `(date, vehicle)` with `positionSource`; odometer-primary distance (device) with GPS fallback for tracked.
  - [ ] **Untracked vehicles still get a row** — distance from recorded odometer + schedule lateness; adherence/dwell explicitly null, not zero.
  - [ ] Idempotent recompute; nightly heal covers both coverages.

#### T-720. Fuel-waste estimate + GPS.id mileage cross-check

- **Size:** M · **Coverage:** ≥85%
- **Depends on:** T-719, T-707
- **Files:** `fuel-waste.service.ts`; `gpsid-mileage-reconcile.job.ts` (nightly).
- **Steps:** internal `wastedFuelLiters` = extra distance (actual − planned, when off-route) ÷
  `Vehicle.currentFuelRatio` (km/L). Nightly: pull GPS.id `/report/mileage` (`used_fuel_total`) per device →
  `gpsidFuelLiters`; flag discrepancy beyond a configurable %.
- **Acceptance criteria:**
  - [ ] Internal estimate stored; nightly cross-check populates `gpsidFuelLiters` + discrepancy flag; GPS.id rate limits respected (≤5 imei/call).

#### T-721. Efficiency dashboard (management view)

- **Size:** M · **Coverage:** ≥80%
- **Depends on:** T-719, T-720
- **Files:** `apps/backend/src/modules/monitoring/` (efficiency endpoints, Redis-cached);
  `apps/web/src/app/[locale]/(app)/monitoring/efficiency/page.tsx` reusing `components/monitoring/`.
- **Steps:** KPIs — route adherence %, wasted time, wasted fuel (internal vs GPS.id), deviation counts,
  **GPS-coverage rate (tracked vs untracked) + device-offline rate**; per-vehicle/route/day trends; cached
  like other monitoring reads. Adherence/dwell KPIs computed over **tracked** vehicles only (state the
  denominator); distance/fuel/lateness span the whole fleet.
- **Acceptance criteria:**
  - [ ] Answers "where are vehicles / on route? / time + fuel wasted / coverage + who's offline"; cached + filterable.
  - [ ] Adherence/dwell KPIs clearly scoped to tracked vehicles (denominator shown); fleet-wide metrics include untracked.

---

## Epic 7.7 — Security, privacy, testing, docs, rollout (Size: M)

#### T-722. Webhook hardening + privacy note

- **Size:** S · **Coverage:** ≥85%
- **Depends on:** T-705
- **Files:** `docs/GPS-WEBHOOK-SECURITY.md`; `docs/PRIVACY-NOTICE-GPS.md` (Indonesian).
- **Steps:** verify token + IP allowlist + rate-limit + audit; document retention (30 d hot → archive, reuse
  the Phase 2 archiving job to detach old `gps_ping` partitions). Note hardware-vehicle GPS is **less
  personal-data-sensitive** than driver-login tracking, but access stays RBAC-gated + audited.
- **Acceptance criteria:**
  - [ ] Controls verified; no secrets in code (env only, fail loudly); retention/privacy + partition-archival documented.

#### T-723. E2E + load tests, seed data, deployment & registration runbook

- **Size:** M · **Coverage:** ≥85%
- **Depends on:** T-717, T-718, T-721
- **Files:** `apps/backend/test/gps-ingest.e2e-spec.ts`; `gps-matcher.spec.ts`;
  `vehicle-position.spec.ts` (hybrid resolution); a load test (ingest throughput + matcher p95);
  `apps/backend/prisma/seed.ts` (demo IMEIs + **seeded corridors** + synthetic tracks for a few demo vehicles
  incl. one that **deviates**, one that goes **offline**, and **at least one vehicle with NO device** that
  still appears via recorded activity); `docs/GPS-DEPLOYMENT.md`; `docs/GPSID-REGISTRATION.md`
  (email-registration steps + our webhook URL/token rotation).
- **Acceptance criteria:**
  - [ ] E2E: webhook → ping → matcher → alert → SSE.
  - [ ] Demo seed renders the Peta tab with **≥4 distinct vehicles, all on one map**: (1) live-GPS in-corridor, (2) live-GPS off-corridor (deviation), (3) live-GPS gone offline (stale >`GPS_DEVICE_OFFLINE_MINUTES`), (4) **untracked** (no device, placed at its last-recorded Site).
  - [ ] `vehicle-position` unit tests cover **live-gps online**, **live-gps offline (stale → last-known, not recorded)**, **recorded-activity (no device)**, and **none**.
  - [ ] Load test meets target (matcher <100 ms/ping); runbook covers GPS.id email registration + token rotation **and the recurring ops jobs** (monthly `gps_ping` partition creation, daily device-offline sweep, nightly GPS.id mileage reconcile).

#### T-724. Deferred-scope doc: native field app

- **Size:** S · **Coverage:** —
- **Files:** `specs/14-proposals/RFC-0003-native-field-app/README.md`; update this file + dev-plan `README.md`.
- **Acceptance criteria:**
  - [ ] Removed offline/driver-login/PWA scope captured as a future RFC, not silently dropped.

---

## Dependencies & sequencing

```
7.0 (T-701→T-702) ──> 7.1 (T-703→…→T-707)
                  └──> 7.2 (T-708→…→T-711)
7.1 + 7.2 ──> 7.3 (T-712→T-713→T-714)
7.3 ──> 7.4 (T-715→T-716) ──> 7.5 (T-717, T-718)
7.3 ──> 7.6 (T-719→T-720→T-721)
all ──> 7.7 (T-722, T-723, T-724)
```
Epics 7.1 and 7.2 run in parallel after 7.0. Pilot early on **10–20 vehicles with a handful of drawn
corridors** before fleet-wide rollout; routes without corridors are tracked (position only) until drawn.

## Risks & mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **PostGIS not in current Postgres image / CI** | Migrations + matcher can't run; CI red | Epic 7.0 swaps to `postgis/postgis:15-3.4` (compose + prod + CI) before anything else |
| **Prisma 7 lacks geometry types** | Drift / unqueryable geometry | Geometry columns maintained in raw SQL (GENERATED/trigger), absent from `schema.prisma`; spatial reads via `$queryRaw` |
| **Partition-key/PK constraint** | Migration fails; dedup impossible | Partition `gps_ping` by `recorded_at`; PK `(recorded_at,id)`; dedup unique `(recorded_at,imei)`; DEFAULT partition for late pings |
| **Webhook is unauthenticated by vendor** | Spoofed/forged pings | Secret path token (constant-time) + IP allowlist + rate-limit + full audit; all fields untrusted/normalized |
| **GPS.id registration is manual (email)** | Integration blocked on vendor | T-723 runbook; build/test against a local payload simulator; pull-API gap-fill as fallback |
| **nginx not SSE/WS-ready** | Live updates stall behind proxy | T-715 adds streaming `location` (`proxy_buffering off`, http/1.1, Upgrade map) |
| **GPS noise (dense urban Surabaya) → false alerts** | Alert fatigue | Tunable per-route tolerance + hysteresis/debounce; pilot tuning on real tracks; target <5% false-alert rate |
| **Timestamp UTC vs WIB ambiguity** | Wrong track times / schedule checks | T-705 verifies via `report/history`; store `timestamptz` UTC; reject future; display Asia/Jakarta |
| **Google Maps billing on always-on map** | Cost | Restrict public key (referrer + APIs); marker clustering; cache map loads; revisit OSM/MapLibre if cost spikes |
| **Routes without corridors** | Gaps in coverage | Graceful degradation (track + dwell/late only); roll out corridors incrementally; dashboard shows coverage |
| **Vehicles without a GPS.id device** | Partial fleet picture | **Designed for, not a gap:** hybrid positioning (T-717) places untracked vehicles on the same map from **recorded realization activity** (last leg's Site) with an as-of timestamp; coverage badge on the vehicle master; future native app (RFC-0003) may add live phone GPS |
| **Untracked position is stale/coarse** | Recorded-activity marker lags reality | Clearly label "as-of [time]" + distinct marker so it's never mistaken for live; refreshes as new legs are recorded |

---

## Exit Criteria (Phase 7)

**Infrastructure** — [ ] PostGIS enabled in dev + CI + prod images; partitioned `gps_ping`
(`recorded_at`/PK) with GiST index; `migrate deploy` clean (no drift); module + permissions seeded.

**Ingestion** — [ ] GPS.id webhook secured (token + IP + rate-limit + audit), single/batch, deduped; pings
persisted; live position + `lastPingAt`; unknown IMEIs parked; **stale devices flagged offline**.

**Route geometry** — [ ] Corridors drawn/edited on Google Maps as a **template** per `Route` and
**overridden per day**; day inherits template; **null corridor handled**.

**Deviation engine** — [ ] PostGIS matcher raises `off_corridor`/`off_sequence`/`dwell`/`late` with
hysteresis (no GPS-noise false alerts; site stops excluded; routes without corridors tracked not
corridor-checked), deduped/coalesced, acknowledgeable.

**Real-time** — [ ] SSE/WebSocket streams positions + alerts (<2 s) **through nginx** to the route
monitoring map + alert center.

**Hybrid positioning** — [ ] The **whole active fleet** appears on the **`/monitoring/hauling` (Pengangkutan
→ Peta)** map: GPS vehicles **live**, untracked vehicles placed from **recorded activity** (distinct marker
+ as-of timestamp); GPS-coverage badge on the vehicle master; `Vehicle` table unchanged.

**Analytics** — [ ] Efficiency rollup quantifies adherence %, wasted time, wasted fuel (odometer-primary +
nightly GPS.id mileage cross-check), GPS-coverage + device-offline rate; untracked vehicles still get
distance/lateness/fuel rows.

**Scope & quality** — [ ] Removed offline/PWA scope re-homed in `RFC-0003`; companion specs updated;
`pnpm lint && pnpm typecheck && pnpm test` clean; coverage gates met; no secrets in code.

## Milestone

Top management opens the **route monitoring page** and sees the **whole fleet** on one Google Map —
GPS-equipped vehicles **live** (on route / off route / offline), and vehicles without a tracker placed from
their **recorded activity** — with **real-time alerts** on divergence and a quantified view of **wasted time
and fuel**. Corridors are drawn once as templates and tweaked per day. Live phone-GPS for untracked vehicles
(and offline field capture) is explicitly deferred to a future native app
([RFC-0003](../14-proposals/RFC-0003-native-field-app/)).

## Task Summary (T-701 … T-724)

| Task ID | Epic | Title | Size |
|---------|------|-------|------|
| T-701 | 7.0 | PostGIS image (docker-compose + CI) + extension migration | S |
| T-702 | 7.0 | GPS module scaffolding + permissions + env | S |
| T-703 | 7.1 | GPS/geometry/alert schema + partitioning (raw SQL) | M |
| T-704 | 7.1 | Vehicle↔IMEI device registration + master-data coverage badge (CRUD + UI + unmatched queue) | M |
| T-705 | 7.1 | GPS.id webhook ingestion endpoint | M |
| T-706 | 7.1 | `gps-ingest` worker → persist + live position + device-offline + fan-out | M |
| T-707 | 7.1 | GPS.id pull-API client (backfill/reconciliation) | M |
| T-708 | 7.2 | Geometry repository + maintained PostGIS column | S |
| T-709 | 7.2 | Geometry CRUD + deviation-rule tuning API | M |
| T-710 | 7.2 | Google Maps corridor editor (template + ad-hoc day) | L |
| T-711 | 7.2 | Effective-corridor resolver + daily-init wiring | S |
| T-712 | 7.3 | PostGIS matcher worker (active-leg + graceful degradation) | L |
| T-713 | 7.3 | `DeviationRule`/`DeviationAlert` + alert service | M |
| T-714 | 7.3 | Alert + rule REST API | S |
| T-715 | 7.4 | Realtime gateway + Redis pub/sub + nginx streaming config | M |
| T-716 | 7.4 | Web realtime client hook | S |
| T-717 | 7.5 | Hybrid fleet positioning (live + recorded) + route-monitoring map layer | L |
| T-718 | 7.5 | Alert center UI | M |
| T-719 | 7.6 | Per-trip efficiency computation + rollup (odometer-primary) | M |
| T-720 | 7.6 | Fuel-waste estimate + GPS.id mileage cross-check | M |
| T-721 | 7.6 | Efficiency dashboard (management view) | M |
| T-722 | 7.7 | Webhook hardening + privacy note | S |
| T-723 | 7.7 | E2E + load tests, seed data, deployment & registration runbook | M |
| T-724 | 7.7 | Deferred-scope doc: native field app | S |
