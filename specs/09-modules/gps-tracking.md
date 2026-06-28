# 09 — GPS Tracking & Route-Deviation Monitoring

## Overview

This module gives DLH **live operational visibility** of the fleet and **exception-based supervision**.
Vehicles carry **GPS.id hardware trackers** that push their position to SWAT in real time. SWAT compares
each vehicle's live track against the **route corridor defined for that day**, **alerts** supervisors the
moment a vehicle goes off-route (or off-schedule), and **quantifies the efficiency loss** (route adherence,
wasted time, wasted fuel) for management dashboards.

> Graduated from [`../14-proposals/RFC-0002-gps-route-deviation-alerts/`](../14-proposals/RFC-0002-gps-route-deviation-alerts/).
> Built in [`../11-development-plan/phase-7.md`](../11-development-plan/phase-7.md). **Driver-side / offline /
> background field capture is out of scope** here and deferred to
> [`../14-proposals/RFC-0003-native-field-app/`](../14-proposals/RFC-0003-native-field-app/) — tracking is
> by the vehicle's own GPS hardware, **not** by a driver logging in.

**Key concepts**
- **Device (`GpsDevice`):** a GPS.id unit (by IMEI) bound 1:1 to a `Vehicle`. The integration point for the
  vendor's push feed.
- **Route corridor (`RouteGeometry`):** a buffered polyline drawn on **Google Maps**, stored as a **template
  per `Route`**, inherited by every schedule/day that uses the route. A single day's `Trip` may carry an
  **override**.
- **Deviation:** a confirmed departure from the expected corridor/sequence/schedule, raised as a
  `DeviationAlert` and delivered in real time.
- **Efficiency:** per-vehicle/day rollup of adherence %, wasted time, and wasted fuel.

**Locked decisions** — Google Maps everywhere (authoring + live map); real-time via SSE/WebSocket + Redis
pub/sub; corridor = Route-master template + per-day `Trip` override; efficiency = internal computation
cross-checked nightly against GPS.id mileage.

---

## 1. Integration: GPS.id

### 1.1 Push (primary)
GPS.id POSTs JSON to a webhook **registered manually by email** (it.ss@gps.id), **every 30 s per unit**.
The webhook carries **no vendor authentication** — SWAT secures it with a **secret path token + IP allowlist
+ rate-limit + audit**, and treats every field as untrusted.

**Inbound payload (single object or array):**
| GPS.id field | Type | Maps to |
|--------------|------|---------|
| `VehicleId` | text | IMEI → `GpsDevice.imei` → `Vehicle` |
| `VehicleNumber` | text | plate (cross-check only) |
| `DatetimeUTC` | `YYYY-MM-DD HH:MM:SS` | `GpsPing.recordedAt` (UTC) |
| `Lat`, `Lon` | float | `latitude`, `longitude` (`Decimal(11,6)`) |
| `Speed` | decimal | `speedKmh` |
| `Direction` | int (0–360) | `heading` |
| `Engine` | `ON`/`OFF` | `engineOn` |
| `Odometer` | int (meters) | `odometerM` |
| `Car_Status` | `START`/`STOP` | (dwell heuristic) |
| `GpsLocation`, `VehicleType`, `Alarm` | text | retained in raw/audit |

> ⚠ **Timezone caveat:** the field is named `DatetimeUTC`, but GPS.id's pull endpoints document timestamps
> "per the GPS unit's timezone". Verify during integration whether push timestamps are truly UTC or WIB;
> store as `timestamptz` (UTC), reject future timestamps, accept slightly stale, display Asia/Jakarta.

### 1.2 Pull (secondary — nightly batch only)
Bearer token (24 h, `POST {GPSID_BASE_URL}/login`). Endpoints: `get-vehicle`, `vehicle/detail/{imei}`,
`report/history` (breadcrumbs), `report/mileage` (`mileage` + `used_fuel_total`). **Rate-limited ~5 req/5 min**
→ used only for gap-fill and the nightly mileage cross-check, never per request.
**Credentials are env-configured** — `GPSID_BASE_URL`, `GPSID_USERNAME`, `GPSID_PASSWORD` (operator-provided,
read via `AppConfigService`, **never hardcoded**; fail loudly if missing when the pull/reconcile is enabled).

### 1.3 Source-agnostic ingestion (forward-compatible)
GPS.id is the **first source**, not the only one. The internal pipeline is **source-tagged** so future
sources — a **native/React-Native app** sending phone GPS for **vehicles without a hardware tracker**, or to
**complement** the vehicle tracker — feed the **same** `GpsPing` → matcher → realtime → analytics path
without rework:
- **Adapter pattern:** each source has its own authenticated ingestion endpoint that **normalizes to one
  canonical ping** (`vehicleId`, `latitude`, `longitude`, `speedKmh`, `heading`, `recordedAt`, `source`,
  `accuracyM?`) and enqueues to the shared `gps-ingest` queue. GPS.id = `POST /integrations/gps/webhook/:token`
  (token + IP allowlist); a future mobile app = `POST /gps/mobile/pings` (per-user OAuth2 bearer, reusing the
  native-client auth — see [`../11-development-plan/future-native-client-auth.md`](../11-development-plan/future-native-client-auth.md)).
- **`GpsPing.source`** (`gpsid` | `mobile` | …) and **`GpsPing.accuracyM`** distinguish and weight sources.
- **Multiple devices per vehicle:** `GpsDevice` is **not** locked 1:1 (see §2.1) — a vehicle may have a
  hardware tracker **and** a phone. **Source selection (final rule — hardware-preferred, no fusion):** for a
  vehicle, the authoritative position is the device with the **lowest `priority`** (hardware=0, phone=10)
  that is **fresh** (pinged within `GPS_DEVICE_OFFLINE_MINUTES`); ties broken by most-recent `recordedAt`,
  then best `accuracyM`. If the preferred device is **stale/offline or absent**, fall back to the next source
  (phone). The **deviation matcher consumes the single authoritative source** — no averaging/fusion (it would
  add jitter and make corridor math non-deterministic). Fusion is a possible future refinement only if field
  accuracy demands it.
- **No code is built for mobile in Phase 7** — only these cheap schema/contract choices that keep the door
  open. Mobile capture itself lives in [`../14-proposals/RFC-0003-native-field-app/`](../14-proposals/RFC-0003-native-field-app/).

---

## 2. Entities

### 2.1 GpsDevice
A tracking source bound to a vehicle. **Phase 7 enforces one *active hardware* device per vehicle**, but the
table is modeled to allow **multiple sources per vehicle** later (hardware + phone) — the uniqueness is on the
**device identifier**, not the vehicle.
| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | PK |
| `vehicleId` | UUID | FK → Vehicle (**not** unique — a vehicle may gain a phone source later) |
| `deviceType` | String(20) | `gps-hardware` \| `mobile-app` (default `gps-hardware`) |
| `deviceId` | String(64) | **unique**; IMEI for GPS.id, or app install/user id for a future phone |
| `imei` | String(20)? | **Denormalized from `deviceId`** when `deviceType=gps-hardware` (GPS.id `VehicleId`); **null** for non-hardware (e.g. future `mobile-app`). Uniqueness lives on `deviceId`, not here. |
| `provider` | String(20) | default `gpsid` |
| `priority` | Int | source preference for live position (lower = preferred; hardware < phone) |
| `active` | Boolean | default true |
| `status` | String(12) | `online` \| `offline` (derived from `lastPingAt` vs `GPS_DEVICE_OFFLINE_MINUTES`) |
| `lastPingAt` | Timestamptz? | last received |
| `lastLat`, `lastLng` | Decimal(11,6)? | denormalized live position |
| `lastSpeedKmh` | Decimal(5,2)? | |
| `lastHeading` | Int? | |

> Phase 7 keeps a **partial unique index** `(vehicleId) WHERE deviceType='gps-hardware' AND active` to keep the
> "one hardware tracker per vehicle" rule while leaving room for a future `mobile-app` row on the same vehicle.

### 2.2 GpsPing (high-volume, append-only)
**Monthly RANGE-partitioned by `recordedAt`** (device event time — better track-by-date pruning + enables the
dedup key), with a **DEFAULT partition** for late/odd timestamps. Per the existing partition convention the
**PK is `(recorded_at, id)`**, and **dedup** uses a unique `(recorded_at, imei)` (`INSERT … ON CONFLICT DO
NOTHING` + a short-TTL Redis seen-guard). Fields: `id`, `vehicleId`, `imei`, `latitude`, `longitude`,
`speedKmh`, `heading`, `engineOn`, `odometerM` (BigInt — device odometer, primary distance source),
`source` (`gpsid` | `mobile` | …), `accuracyM` (Int? — GPS accuracy, used to weight sources),
`recordedAt` (device time, UTC), `createdAt` (ingest time). Index `(vehicleId, recordedAt)`.
**Prisma 7 has no geometry type:** a PostGIS `geography(Point,4326)` column (GENERATED/trigger-maintained
from lat/lng) + GiST index is added in **raw SQL** and is **absent from `schema.prisma`**; all spatial reads
go through `$queryRaw`. **Retention: 30 days hot → archive** (reuse the Phase 2 archiving job to detach old
partitions) per `../12-scalability-archiving.md`.

### 2.3 GpsUnmatchedPing
A ping whose IMEI is not yet registered: `id`, `imei`, `payload` (Json), `receivedAt`. Surfaced as an
ops queue to map IMEI → vehicle (never silently dropped).

### 2.4 Corridor (first-class — revised by Epic 7.8)
> **Model revision (2026-06, operator decision).** The original 1:1 `RouteGeometry` template was replaced
> by a **first-class `Corridor`** so a route can hold more than one path. A **`Route` owns 1..N
> `Corridor`s**. The legacy `RouteGeometry` row/endpoints are retained but **superseded** — `Corridor` is
> the source of truth for everything below (authoring, distance, the deviation cascade).

`Corridor` — one or more per `Route`. Fields: `id`, `routeId` (FK, cascade-delete — **not** unique), `name`
(e.g. "Jalur Utama"), `isDefault` (**exactly one default per route**), `pathGeojson` (LineString),
`waypoints` (Json? — sparse editor control points `{lng,lat,snapped}[]` so a corridor re-opens with
draggable handles), `toleranceMeters` (default 150), `lengthMeters` (server-computed planned distance,
`ST_Length`), `source` (`google-maps` | `straight` | `directions`), soft-delete + audit, `createdAt`,
`updatedAt`.

- **Default corridor is route-managed:** auto-created on route creation and **re-generated (re-snapped) on
  route edit**, so coordinates added to a site later take effect. Road-snap runs **server-side**
  (`GoogleDirectionsService` + `GOOGLE_MAPS_SERVER_KEY`); falls back to a straight line when a site lacks
  coordinates. The default is **editable but not deletable** (only alternates can be removed); a
  "Berangkat dari Pool" (Pool→Pool) route's corridor is a degenerate point and **view-only**.
- **Corridor owns the route's planned distance.** `Corridor.lengthMeters` is authoritative;
  `Route.distanceKm` is a **denormalized cache** auto-synced from the default corridor on any corridor
  create/update/delete (fixes the "snap-to-road didn't update route distance" bug).
- **Per-leg / per-day selection:** `TripTemplate.corridorId (Uuid?)` picks which of the route's corridors a
  template leg follows (null = inherit the route default); it is **copied to `Trip.corridorId` at
  daily-init** and switchable per day. A single day's `Trip` may still carry a **freehand override**
  (`Trip.geometryOverride (Json?)` + `Trip.geometryToleranceM (Int?)` + persisted waypoints) as a one-off
  escape hatch that wins over the chosen corridor.

### 2.5 DeviationRule
Tunable per type (optionally per route). Fields: `id`, `deviationType`
(`off_corridor`|`off_sequence`|`dwell_too_long`|`late_to_schedule`), `threshold` (m or sec), `hysteresisSec`
(default 30), `severity` (`INFO`|`WARNING`|`CRITICAL`), `enabled`.

### 2.6 DeviationAlert
Fields: `id`, `vehicleId`, `tripId?`, `alertType`, `severity`, `latitude`, `longitude`, `distanceM?`,
`pingCount` (coalesced), `isAcknowledged`, `acknowledgedAt?`, `acknowledgedBy?`, `resolvedAt?`, `notes?`,
`createdAt`. Index `(vehicleId, createdAt)`. Retained indefinitely (audit).

### 2.7 DailyVehicleEfficiency (rollup)
Unique `(date, vehicleId)`: `positionSource` (`gps` | `recorded` — how this row was computed),
`plannedMeters`, `actualMeters`, `adherencePct?` (% time in-corridor — **null for `recorded`**, where there
is no track), `dwellMinutes?` (**null for `recorded`**), `lateMinutes`, `wastedFuelLiters` (internal
estimate), `gpsidFuelLiters?` (nightly cross-check), `deviationCount`. **`adherencePct`/`dwellMinutes` are
nullable, not defaulted to 0** — `null` means "not measurable" (untracked), distinct from a real `0`.

---

## 3. Deviation detection

For each new ping, the matcher determines the vehicle's **active leg** (the `Trip` whose actual window is
open, else by `targetTime` ordering vs now, else nearest-by-geometry) and the **effective corridor**
(`resolveTripCorridor`, resolved at match time — never eager-copied):
`Trip.geometryOverride` (freehand) **→** the day's chosen `Trip.corridor` (ignored if soft-deleted) **→**
the route's **default `Corridor`** (`isDefault`) **→** `null` (route with no corridor — tracked, not
corridor-checked). Then it evaluates:

| Type | Rule | PostGIS |
|------|------|---------|
| `off_corridor` | distance to corridor > tolerance for > hysteresis | `ST_DWithin(geography, point, tolerance)` false beyond hysteresis |
| `off_sequence` | visits an unplanned site / out of template order | site membership check |
| `dwell_too_long` | stationary (speed≈0) **outside any `Site.geofenceRadiusM`** > threshold | — |
| `late_to_schedule` | actual arrival > `targetTime` + `lateMinutes` | — |

**Graceful degradation:** a vehicle with **no active haul/leg** is tracked (position only) with no checks; a
route with **no corridor** skips `off_corridor` (dwell/late still apply) — corridors are opt-in per route as
they are drawn. Dwell **within** a `Site` radius (loading/dumping) is legitimate and never alerts. Hysteresis
+ debounce suppress GPS-noise flapping (a single off-corridor ping never alerts); confirmed deviations are
coalesced per vehicle+type within the window (`pingCount++`).

### 3.1 Hybrid positioning — tracked + untracked vehicles
**Not all vehicles carry a GPS tracker**, but the map must show the **whole active fleet**. A single
position-resolution service returns one `VehiclePosition { source, lat, lng, asOf, status, … }` per vehicle.
**Device presence — not freshness — picks the source:** a vehicle **with** a GPS device always uses GPS;
one **without** uses recorded activity.
- **`live-gps` (online)** — has a device, **fresh** ping → live position + corridor adherence + deviation.
- **`live-gps` (offline)** — has a device, **stale** ping (> `GPS_DEVICE_OFFLINE_MINUTES`) → **last-known GPS
  position, flagged offline**. **Does not fall back to recorded activity** (the last fix beats a site snap).
- **`recorded-activity`** — **no device** → position from recorded realization: the `Site` coordinates of the
  last `Trip` leg with an `actualTime` (in-progress leg → destination = "heading to"), with **schedule
  lateness**. **No track ⇒ no corridor/deviation matching.**
- **`none`** — a GPS vehicle with no fix today and no recorded activity → not plotted (or dimmed at pool).

The **deviation engine runs for `live-gps` only**; untracked vehicles can surface a schedule-lateness flag
but never a corridor deviation. Master data is untouched: a vehicle is "untracked" simply by having **no
`GpsDevice` row** (the registry is the only join); the vehicle list/detail shows a derived GPS-coverage badge
(`Tracked · online` / `Tracked · offline` / `Tidak terlacak`).

---

## 4. Alert lifecycle
`raise` → `coalesce` (same vehicle+type in window) → `acknowledge` (user + timestamp + notes) →
`auto-resolve` (vehicle re-enters corridor). Published to Redis `gps:alerts`, fanned out over the realtime
gateway, retained for audit.

---

## 5. Screens (Next.js · Google Maps)

| Path | Purpose | Permission |
|------|---------|-----------|
| `/monitoring/hauling` → **Peta** tab (Pengangkutan, the Phase 6 `<HaulingMap>`) | **Whole-fleet** map: **live** markers for GPS vehicles (plate/driver/status, in/out-of-corridor colour, corridor overlay + breadcrumb on tap) **and** distinct markers for **untracked** vehicles placed from **recorded activity** (last-recorded Site + as-of timestamp); legend; alert badges. Live alert center (feed + acknowledge + history) surfaced here. | `tracking:read`, `deviation-alert:read\|acknowledge` |
| `/monitoring/efficiency` | Management KPIs: route adherence % (tracked-only denominator), wasted time, wasted fuel (internal vs GPS.id), deviation counts, GPS-coverage + device-offline rate; per-vehicle/route/day trends | `monitoring:read` |
| Vehicle list/detail (`/vehicles`) | Derived **GPS-coverage badge** ("Cakupan GPS" column: Terlacak · online / offline / Tidak terlacak) + a per-vehicle **"Kelola Perangkat GPS"** sheet (attach/detach the device). **✅ done.** | `vehicle:read`, `gps-device:read\|create\|update\|delete` |
| `/tracking/devices` | Device registry CRUD + mappable unmatched-IMEI queue. **✅ done** (under Pengangkutan). | `gps-device:read\|create\|update\|delete` |
| Settings → **Pelacakan** | Tune deviation-rule thresholds / hysteresis / severity / enabled per type. **✅ done.** | `deviation-rule:manage` |
| Route management → **Koridor** sheet (`RouteCorridorEditor`) | List a route's **1..N corridors** (default first, badged); draw/**snap-to-road** an alternate, set tolerance. The **default** is auto-managed (created/re-snapped with the route); template legs and per-day trips pick among them. | `corridor:read\|create\|update\|delete`, `route-geometry:manage` |

Form errors render inline; submit success/failure via toast (per project convention). Map key from
`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (fail loudly if missing).

---

## 6. API

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/integrations/gps/webhook/:token` | secret token + IP allowlist | GPS.id push ingest (single/batch) → enqueue |
| GET/POST/PATCH/DELETE | `/gps/devices` | `gps-device:read|create|update|delete` | device registry; unmatched-IMEI queue |
| GET | `/monitoring/fleet-positions?date=today` | `tracking:read` | **whole active fleet** as `VehiclePosition[]` (`source: live-gps\|recorded-activity\|none`) — powers the Peta tab |
| GET | `/gps/vehicles/:id/position` | `tracking:read` | latest position (live or recorded) |
| GET | `/gps/vehicles/:id/track?minutes=60` | `tracking:read` | live breadcrumb trail |
| GET/POST | `/routes/:routeId/corridors` | `corridor:read\|create` | list / add a corridor (default + alternates) for a route |
| PATCH/DELETE | `/corridors/:id` | `corridor:update\|delete` | edit / remove an alternate corridor (the default is editable, not deletable) |
| PUT | `/gps/trips/:tripId/corridor` | `route-geometry:manage` | per-day picker — set `Trip.corridorId` to one of the route's corridors |
| PUT/DELETE | `/gps/trips/:tripId/geometry` | `route-geometry:manage` | per-day freehand override (`Trip.geometryOverride`) |
| GET/PUT/DELETE | `/gps/routes/:routeId/geometry` | `route-geometry:manage` | legacy `RouteGeometry` template (**superseded** by `/routes/:routeId/corridors`) |
| GET/POST/PUT | `/gps/deviation-rules` | `deviation-rule:manage` | rule tuning |
| GET | `/gps/alerts` | `deviation-alert:read` | feed (filter vehicle/status/date) |
| PATCH | `/gps/alerts/:id/acknowledge` | `deviation-alert:acknowledge` | acknowledge + notes |
| GET | `/monitoring/efficiency` | `monitoring:read` | efficiency dashboard data (cached) |
| SSE/WS | `/realtime/fleet` | session + `tracking:read` | live positions + alerts (`vehicle-{id}` \| `all`) |

All REST endpoints use the standard `{ success, data?, error?, meta? }` envelope (`../07-api-spec.md`).

---

## 7. Business rules
1. **One active hardware tracker per vehicle** — enforced by a **partial unique index**
   `gps_device(vehicle_id) WHERE device_type='gps-hardware' AND active`; `deviceId` is globally unique;
   `vehicleId` is **not** unique (a vehicle may later also carry a `mobile-app` source). Unknown IMEIs are
   parked, not dropped.
2. **Webhook is untrusted** — secret token (constant-time compare) + optional IP allowlist + rate-limit + full `ApiAuditLog`. Never leak internals on rejection.
3. **Idempotent ingest** on `(recorded_at, imei)` (the `gps_ping` dedup unique).
4. **Corridor inheritance** — a day's `Trip` uses its freehand override if set, else its chosen `Corridor`, else the route's **default `Corridor`**; resolved at match/read time (no eager copy). `Route.distanceKm` is a denormalized cache of the default corridor's `lengthMeters`.
5. **No false alerts from noise** — hysteresis + debounce; single off-corridor ping never alerts.
6. **Efficiency primary = internal**, GPS.id mileage is a nightly cross-check; discrepancies beyond a threshold are flagged.
7. **Access is RBAC-gated and audited** even though hardware-vehicle GPS is less personal-data-sensitive than driver-login tracking.

---

## 8. Permissions (`../06-auth-rbac.md`)
`gps-device:read`, `gps-device:create`, `gps-device:update`, `gps-device:delete`, `corridor:read`,
`corridor:create`, `corridor:update`,
`corridor:delete`, `route-geometry:manage`, `deviation-rule:manage`, `deviation-alert:read`,
`deviation-alert:acknowledge`, `tracking:read`. Typical: **Supervisor** gets `tracking:read` +
`deviation-alert:read|acknowledge` (+ `corridor:read` + `gps-device:read` via `*:read`); **DataAdmin** gets `gps-device:create|update|delete` +
`corridor:create|update|delete` + `route-geometry:manage` + `deviation-rule:manage`; **Management**
read-only via `tracking:read` + `monitoring:read`.

---

## 9. Non-functional
- **Throughput/latency:** modest fleet (hundreds of units × 30 s); matcher target <100 ms/ping (indexed
  PostGIS). Ingest enqueues fast and never blocks on DB.
- **Realtime:** alert visible <2 s end-to-end.
- **Scale/retention:** `gps_ping` monthly-partitioned, 30 days hot → archive; `DeviationAlert` retained.
- **Resilience:** ingest buffers via BullMQ with retry/backoff; realtime survives Redis reconnect; pull-API
  rate limits respected.

---

## 10. Acceptance criteria
- POST webhook with valid token + payload (single or batch) → 200 `{accepted}`; bad token → 401; disallowed IP → 403; over-rate → 429.
- A received ping persists to `gps_ping`, updates the device live position + `lastPingAt`, and publishes to `gps:positions`; unknown IMEI lands in the unmatched queue.
- A corridor drawn on Google Maps saves as a Route template; the same editor overrides a single day's trip; the day inherits the template by default.
- A sustained off-corridor track raises one coalesced `off_corridor` alert with `distanceM`; an in-corridor track raises none; the alert is acknowledgeable and auto-resolves on re-entry.
- The live fleet map shows moving markers + planned corridor + trail; a deviating vehicle is flagged; the alert center receives the alert <2 s via SSE/WS.
- The efficiency dashboard shows adherence %, wasted time, and wasted fuel (internal + nightly GPS.id cross-check) per vehicle/route/day.
