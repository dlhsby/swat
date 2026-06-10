# RFC-0002 — Detailed Design: GPS + route-deviation alerts

> This is the **deep-dive design** for [RFC-0002](./README.md). The RFC (`README.md`) is the
> one-page pitch/decision; **this file is where the detailed planning grows** during planning
> sessions (notes in [`sessions/`](./sessions/)). When the feature is accepted and scheduled, the
> committed functional spec graduates to `../../09-modules/gps-tracking.md` and a new phase/epic is
> added to `../../11-development-plan/README.md`; this folder remains as design history.
>
> **Status:** skeleton — sections below are filled in progressively during planning sessions.
> Track open decisions in §13 to closure.

## 1. Goals & non-goals

### Goals
- **Real-time operational visibility:** within 10–30 seconds of a deviation event, notify the responsible
  supervisor (in-app + optional email/WhatsApp).
- **Accuracy:** false-alert rate < 5% (GPS noise + brief detours should not trigger) after tuning corridor
  tolerance and dwell-time hysteresis per real route data.
- **Scalability:** ingest and process 8.6M pings/day (1,000 vehicles, 1 ping / 10 sec) with < 100 ms
  latency p95 from ping arrival to alert creation.
- **Maintainability:** corridor geometry is authored/editable by supervisors via UI; no hard-coded routes.
- **Privacy:** DLH/HR policy-compliant location collection and retention.

### Non-goals
- Predictive ETA, automatic route optimization, driver scoring (future phases).
- Replacing weighbridge data entry or trip verification flow (Phase 4 + Phase 1 responsibility).
- Vehicle-to-vehicle coordination or dynamic re-routing (future feature).
- Historical track playback/audit (out of scope for initial MVP; rollups/analytics are separate).

## 2. Architecture overview

```
GPS Sources (device telematics OR Phase-5 PWA)
    ↓
[Ingestion API] POST /gps/pings (NestJS, service-account auth)
    ↓
[Redis Streams / queue] batch buffer & dedup
    ↓
[Matcher Worker] (NestJS job, on schedule or triggered)
    - Load active haul + expected corridor (Route geometry + buffer)
    - PostGIS point-to-linestring distance check
    - Sequence adherence check (ordered sites)
    - Schedule window check
    → emits: ✓ in-corridor / ✗ DeviationAlert event
    ↓
[Alert Service] (NestJS service)
    - Dedup / debounce (suppress flapping)
    - Create DeviationAlert row + audit
    - Publish to Redis pub/sub / WebSocket gateway
    ↓
[WebSocket Gateway] (NestJS WS adapter)
    → live map subscribers: vehicle position + alert badge
    → alert center subscribers: new alert + notification
    ↓
[Frontend] (Next.js PWA)
    - Live fleet map (vehicle markers on map, active route + plan polyline)
    - Per-vehicle alert history + acknowledgment
    - Route-geometry editor (draw corridors, set tolerances)
```

**Where each piece runs (per `../../05-architecture.md`):**
- Ingestion API: `apps/backend` (NestJS controller, high throughput; horizontally scalable)
- Matcher Worker: `apps/backend` (background job via `@nestjs/schedule` + cron, or event-driven listener)
- Alert Service: `apps/backend` (NestJS service, called from matcher)
- WebSocket Gateway: `apps/backend` (NestJS WS adapter, can scale to separate service if needed)
- Live map + alert center: `apps/web` (Next.js, real-time via WS)
- Data: PostgreSQL (`VehicleGpsPing` partitioned by createdAt; `RouteGeometry`, `DeviationAlert`), Redis (queue,
  pub/sub), PostGIS extension (geometric queries).

## 3. Location ingestion

**Endpoint:** `POST /gps/pings` (NestJS controller)

**Auth:** service account (device API key) or bearer token; rate-limit: 1,000+ req/sec (support bursts
from 1,000 devices).

**Request payload (batch):**
```json
{
  "deviceId": "ABC123XYZ",
  "apiKey": "sk-gps-...",
  "pings": [
    {
      "timestamp": "2026-06-05T10:30:45.123Z",     // UTC
      "latitude": -7.2575,
      "longitude": 112.7521,
      "speedKmH": 15.3,
      "headingDegrees": 45,
      "accuracy": 8
    },
    ...
  ]
}
```

**Processing:**
1. Validate auth (API key → VehicleDevice lookup).
2. Dedup (skip if identical timestamp + vehicle already in queue).
3. Clock-skew handling: if timestamp > 5 minutes old, log but accept; if future, log warning.
4. Batch write to Redis Streams (keyed on `vehicle-pings`, e.g. `vehicle-123-pings`).
5. Trigger matcher worker (or let it poll Redis Streams on schedule).

**Response:** `{ "accepted": 5 }` (batch count).

**Offline buffering (driver-PWA only, Phase 5 feature):** PWA service worker queues pings locally via IndexedDB
if offline; syncs when reconnected. Timestamps remain original (client-side).

**Fallback & retry:** if ingest fails, client retries with exponential backoff; server dedup prevents duplicates.

## 4. Route geometry & schedule model
- How a day's expected path is derived from `CrewSchedule` + ordered `TripTemplate`s + `Route`s.
- Geometry representation: polyline + buffer (corridor) per `Route`; how it's authored (manual draw
  vs routing-engine generated); storage (PostGIS geometry).
- Expected schedule windows from template target times.

## 5. Deviation detection algorithm

**Matcher worker:** runs every 5–10 seconds or event-triggered on Redis Streams ping arrival. For each new ping:

```
1. Load active haul(s) for vehicle (today only; status IN_PROGRESS)
   - → CrewSchedule + ordered TripTemplates
   - → expected Route sequence + RouteGeometry + tolerance buffer

2. Determine active trip:
   - Based on haul.currentTripIndex or infer from timestamp vs template schedules
   - Load that Route's geometry + tolerance

3. Point-in-corridor check (PostGIS):
   - ST_Distance(ping.point, route.polylineWkt) ≤ tolerance?
   - If NO + state.timeSinceLastInCorridor > hysteresis (default 30 sec):
     → DEVIATION: off_corridor (alert type)
     → distance_to_corridor = ST_Distance(...)

4. Sequence adherence check (optional):
   - Has vehicle visited previous routes in order, or skipped any?
   - If unplanned site visit detected: off_sequence deviation

5. Dwell-time check:
   - Is vehicle stationary (speed < 1 km/h) at a non-site location for > 10 min?
   - → dwell_too_long deviation (flag for supervisor)

6. Schedule-window check:
   - Expected arrival at current Route's destination: targetTime from TripTemplate
   - Is actual arrival > 30 min late?
   - → late_to_schedule deviation

7. Debounce & alert:
   - If no active deviation state: create new DeviationAlert, emit to alert service, publish to WebSocket
   - If active state: suppress until operator acknowledges (dedup)
   - Log all evaluations (for audit/tuning)
```

**Tuning parameters (configurable per rule / route):**
| Parameter | Default | Notes |
|-----------|---------|-------|
| `corridorToleranceM` | 150 | buffer around polyline; increase for urban traffic |
| `hysteresisSeconds` | 30 | suppress flapping on GPS noise |
| `dwellTimeMinutes` | 10 | stationary threshold |
| `lateMinutes` | 30 | schedule variance tolerance |

**Load & perf:** corridor check is O(1) per ping (indexed PostGIS query); expect < 10 ms per vehicle.
At 1,000 vehicles × 10 sec ping rate = 100 pings/sec → worker batch processes ~600 pings / 6 sec window,
so CPU load is modest. Verify via load test before going live.

## 6. Alerting

**Alert lifecycle:**
```
1. Raise: DeviationAlert created with status=new (isAcknowledged=false)
2. Notify:
   - Publish to Redis pub/sub channel `alerts:vehicle-{vehicleId}` + broadcast `alerts:all`
   - WebSocket gateway sends to subscribed supervisors (in-app notification + badge)
   - Optional: email/WhatsApp/SMS via integration (D4 decision pending; MVP: in-app WebSocket only)
3. Acknowledge: supervisor clicks "acknowledge" → set isAcknowledged=true, acknowledgedBy=userId, timestamp
4. Resolve: heuristic (e.g. vehicle re-enters corridor, or acknowledge + supervisor notes cause) →
   alert marked resolved (soft-closed, kept for audit)
```

**Dedup & grouping:**
- If multiple pings for same vehicle raise same deviation within 30 sec → **coalesce into one alert** (log count).
  Dedup key: `vehicle + ruleId + (latitude bucket to 100m grid)`.
- UI shows alert once; count badge "×3 pings".

**Mute rules (future; post-MVP, Phase 6+):**
- Supervisor can mute an alert type for a vehicle (e.g. "ignore dwell-time on this route for 1 hour").
- Stored as ephemeral mute rule in Redis (TTL 1 hour).

**Channels (see D4 open question):**
- **MVP (Phase 5a):** in-app WebSocket notification only (live map + alert center badge + audio ping).
- **Post-MVP (Phase 6+, optional):** email on new alerts, per supervisor preference.
- **Out of scope (initial):** SMS/WhatsApp (requires vendor integration; defer to RFC-0001 alert-channel decision).

## 7. Data model (detailed)

```prisma
// High-volume time-series; partitioned monthly by createdAt
// PARTITION BY RANGE (DATE(createdAt)) per ../../12-scalability-archiving.md §2
model VehicleGpsPing {
  id            String      @id @db.Uuid @default(uuid(7))
  legacyId      BigInt?     @unique
  vehicleId     String      // FK to Vehicle
  vehicle       Vehicle     @relation(fields: [vehicleId], references: [id])
  latitude      Decimal     @db.Decimal(11,6)                           // WGS84
  longitude     Decimal     @db.Decimal(11,6)                           // WGS84
  speedKmH      Decimal     @db.Decimal(5,2)                            // 0–200 km/h
  headingDegrees Int?                                                    // 0–359, NULL if stationary
  source        String      @db.VarChar(20)                             // 'device' | 'pwa'
  accuracy      Int?                                                     // meters, GPS accuracy estimate
  createdAt     DateTime    @default(now()) @db.Timestamptz(6)          // UTC; partitioned
  @@index([vehicleId, createdAt])
  @@index([createdAt])
}

// One geometry per route; authored via UI or routing engine
model RouteGeometry {
  id            String      @id @db.Uuid @default(uuid(7))
  legacyId      Int?        @unique
  routeId       String      @unique                                      // FK to Route
  route         Route       @relation(fields: [routeId], references: [id])
  polylineWkt   String                                                   // WKT linestring (ordered waypoints)
  toleranceMeters Int      @default(150)                                 // corridor buffer; tunable per route
  source        String      @db.VarChar(50)                             // 'manual' | 'osrm' | 'google-maps'
  sourceMetadata String?                                                 // e.g. API response ID, version
  createdAt     DateTime    @default(now()) @db.Timestamptz(6)
  updatedAt     DateTime    @updatedAt @db.Timestamptz(6)
}

// Defines a deviation trigger (metric + threshold + schedule)
model DeviationRule {
  id            String      @id @db.Uuid @default(uuid(7))
  legacyId      Int?        @unique
  name          String      @db.VarChar(100)                            // e.g. "Off-route by 200 m"
  deviationType String      @db.VarChar(40)                             // 'off_corridor' | 'off_sequence' | 'dwell_too_long' | 'late_to_schedule'
  threshold     Int?                                                     // distance (m), time (sec), or NULL
  hysteresisSecond Int      @default(30)                                // debounce window to suppress GPS noise
  enabled       Boolean     @default(true)
  createdAt     DateTime    @default(now()) @db.Timestamptz(6)
  updatedAt     DateTime    @updatedAt @db.Timestamptz(6)
  alerts        DeviationAlert[]
}

// One alert per deviation event (possibly grouped/deduplicated)
model DeviationAlert {
  id            String      @id @db.Uuid @default(uuid(7))
  legacyId      BigInt?     @unique
  vehicleId     String      // FK to Vehicle
  vehicle       Vehicle     @relation(fields: [vehicleId], references: [id])
  ruleId        String                                                   // FK to DeviationRule
  rule          DeviationRule @relation(fields: [ruleId], references: [id])
  pingId        String?                                                  // triggering VehicleGpsPing (FK)
  alertType     String      @db.VarChar(40)                             // enum equivalent of deviationType
  severity      String      @default("WARNING")                         // 'INFO' | 'WARNING' | 'CRITICAL'
  latitude      Decimal     @db.Decimal(11,6)                           // ping location
  longitude     Decimal     @db.Decimal(11,6)
  distance      Int?                                                     // to corridor (meters), if off-corridor
  isAcknowledged Boolean    @default(false)
  acknowledgedAt DateTime?  @db.Timestamptz(6)
  acknowledgedBy String?                                                 // FK to User (supervisor)
  resolutionNotes String?   @db.VarChar(512)
  createdAt     DateTime    @default(now()) @db.Timestamptz(6)
  @@index([vehicleId, createdAt])
  @@index([ruleId, createdAt])
}

// Telematics device or PWA registration
model VehicleDevice {
  id            String      @id @db.Uuid @default(uuid(7))
  legacyId      Int?        @unique
  vehicleId     String      @unique                                      // one device per vehicle (for MVP)
  vehicle       Vehicle     @relation(fields: [vehicleId], references: [id])
  deviceType    String      @db.VarChar(40)                             // 'gps-device' | 'pwa'
  deviceId      String      @unique @db.VarChar(100)                    // IMEI, device serial, or UUID
  apiKey        String      @unique @db.VarChar(256)                    // for ingest auth (hashed in practice)
  active        Boolean     @default(true)
  lastPingAt    DateTime?   @db.Timestamptz(6)
  createdAt     DateTime    @default(now()) @db.Timestamptz(6)
  updatedAt     DateTime    @updatedAt @db.Timestamptz(6)
}
```

**Indexes & retention:**
- `VehicleGpsPing`: primary index on `(vehicleId, createdAt)` for per-vehicle track queries; monthly
  partitioning by `createdAt`. Raw pings retained **hot for 30 days, then archived** per
  `../../12-scalability-archiving.md` §3. Downsampling job aggregates to 1-min tracks for historical queries.
- `DeviationAlert`: index on `(vehicleId, createdAt)` and `(ruleId, createdAt)` for alert feeds; alerts retained
  indefinitely for audit.

## 8. API (detailed)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/gps/pings` | POST | service account (API key) | ingest batch pings |
| `/gps/vehicles/{id}/position` | GET | `tracking:read` | latest position of a vehicle |
| `/gps/vehicles/{id}/tracks` | GET | `tracking:read` | historical tracks (date range), downsampled to 1-min intervals |
| `/gps/routes/{id}/geometry` | GET | `tracking:read` | RouteGeometry (polyline + tolerance) |
| `/gps/routes/{id}/geometry` | PUT | `deviation-rule:manage` | create/update corridor |
| `/gps/routes/{id}/geometry` | DELETE | `deviation-rule:manage` | delete corridor |
| `/gps/deviation-rules` | GET | `deviation-rule:manage` | list rules |
| `/gps/deviation-rules` | POST | `deviation-rule:manage` | create rule |
| `/gps/deviation-rules/{id}` | PUT | `deviation-rule:manage` | update rule (threshold, tolerance, enabled) |
| `/gps/deviation-alerts` | GET | `tracking:read` | list alerts (filter by vehicle, status, date range) |
| `/gps/deviation-alerts/{id}/acknowledge` | PATCH | `deviation-alert:acknowledge` | mark acknowledged, set notes |
| **WebSocket** | UPGRADE | user session | subscribe to live alerts: `vehicle-{id}` or `all` |

**Response envelope:** all endpoints return `{ success, data?, error?, meta? }` per [`../../07-api-spec.md`](../../07-api-spec.md) §1.2.

## 9. Scale, retention & cost

**Volume projections (from `../../12-scalability-archiving.md` §1):**
| Stream | Per day | Per month | Per year |
|--------|---------|-----------|----------|
| `VehicleGpsPing` @ 1 ping/10 sec × 1,000 vehicles | ~8.6M | ~260M | ~3.1B |
| `DeviationAlert` (estimated 1–5 per vehicle/day) | ~1,000–5,000 | ~30k–150k | ~365k–1.8M |

**Storage:**
- Raw ping: ~200 bytes (lat/lng/speed/heading/createdAt/meta) → 8.6M × 200 = ~1.7 GB/day
- Hot window (30 days): ~51 GB
- Downsampling to 1-min aggregate tracks: ~1/600 compression → ~85 MB/day for 1-year history

**Partitioning & archiving (per [`../../12-scalability-archiving.md`](../../12-scalability-archiving.md) §2–3):**
- `VehicleGpsPing`: **monthly partitioning by `createdAt`**
  - Hot: current + previous month (2 months, ~3.4 GB, fully indexed)
  - Warm: 8 months older (27 GB, indexed)
  - Cold: >13 months archived, available via `archive.*` schema or foreign table
- Retention: raw 30 days hot → detach, downsampled tracks 1 year warm → archive older
- Downsampling job (nightly): aggregate pings by vehicle + 1-min bucket → upsert into `VehicleGpsTrack` (warm table)

**Map tiles (D3 decision: self-host vs provider):**

| Option | Cost | Ops | Latency | Tie-in |
|--------|------|-----|---------|--------|
| **Self-host OSM + OSRM** | server infra (VM, ~IDR 500k/mo) | maintain tile server + routing engine | ~200 ms | on-prem, no internet dependency |
| **Google Maps API** | IDR 0.5–1.5M/month (10k–100k requests/day) | none | ~50 ms | internet required, terms-of-service compliance |
| **Mapbox** | similar to Google | lighter infra | ~100 ms | good for Surabaya coverage |

**MVP recommendation:** start with **Google Maps free tier** (250k requests/day free, then pay-per-use) or **Mapbox** for
easier operations; pivot to self-host later if cost becomes prohibitive or internet connectivity is unreliable.

**Infra cost estimate (Phase 5–6):**
- PostgreSQL + PostGIS: +50–100 GB incremental disk (~IDR 100k–500k/month for storage, varies by provider)
- Redis (queue + pub/sub): ~2 GB, same Redis as Phase 1 (already budgeted)
- Matcher worker: runs in backend service (no extra cost)
- Map tile provider: ~IDR 500k–2M/month depending on usage (or self-host ~IDR 500k/month)
- **Total incremental:** IDR 1–3M/month ongoing + initial setup costs

## 10. Security & privacy

**Location data classification:** driver location is **sensitive personal data** (potentially linked to
individual movement patterns). Must be handled per local data-protection law and DLH/HR policy.

**Pre-implementation sign-offs required (blockers):**
- [ ] DLH executive/legal: authorization to collect + store driver GPS; use case (operational oversight vs monitoring).
- [ ] HR / labor union (if applicable): confirm location tracking does not violate employment agreements or privacy expectations.
- [ ] Data retention & disposal policy: how long to keep raw pings? Destruction procedure for archived data?
- [ ] Access control: which roles (supervisors, managers) can view live tracks? Audit logging of access.

**Implementation controls:**
- **API key management:** VehicleDevice.apiKey must be hashed (bcrypt or Argon2id); never log full key.
  Rotate keys periodically (manual process or API endpoint for device re-auth).
- **Access control:** `tracking:read` permission required for live/historical track queries. Role-based:
  supervisors see fleet + their vehicles; managers see all. Immutable audit log of access (who viewed vehicle X at time T).
- **Encryption in transit:** all GPS ingest + track read over HTTPS/TLS 1.2+.
- **Encryption at rest (optional for MVP):** `VehicleGpsPing` table encryption per PostgreSQL extension (pgcrypto or native). 
  Optional if DLH policy does not require; prioritize if compliance officer deems necessary (Phase 6+).
- **Retention enforcement:** archive job automatically detaches partitions > 30 days (configurable per policy);
  cold-archived pings cannot be queried via normal API (only admin/data-recovery role with override).
- **Operator oversight:** supervisors can see live alerts; access to raw ping history is restricted to specific
  roles (audit team, legal). Mute alert types appropriately to prevent alert fatigue (future feature).

**Privacy notices:**
- Driver onboarding doc: explain GPS tracking, who sees it, retention window, their rights (access/dispute).
- Dashboard UI: show location tracking status per vehicle (badge: "tracking active" or "device offline").

## 11. Rollout plan

**Proposed phasing (pending D1 GPS-source decision):**

1. **Phase 5a (MVP minimum):** GPS ingest API + live map
   - Build ingestion API, Redis queue, basic ping storage
   - Live fleet map: vehicle markers + latest position, no route geometry yet
   - Pilot: 10–20 vehicles (mixed routes + high-volume routes like TPS pickups)
   - Metrics: ingest throughput (target 100+ pings/sec), map latency (target < 500 ms refresh), 0 data loss

2. **Phase 5b:** Route geometry + corridor model
   - Build RouteGeometry entity + CRUD API
   - Supervisor tools to draw/import polylines, set tolerance
   - Geometry validation (non-self-intersecting, ordered waypoints)
   - Pilot: same 10–20 vehicles; manually define 3–5 critical routes
   - Metrics: false-alert rate (measure GPS noise vs real deviations), accuracy vs ground truth

3. **Phase 5c / Phase 6a:** Deviation rules + real-time alerts
   - Implement matcher worker, rule evaluation, debounce logic
   - WebSocket alert push, alert center UI, acknowledge flow
   - Full pilot: 50–100 vehicles
   - Metrics: alert accuracy (precision/recall), supervisor response time, false-alert suppression

4. **Phase 6b (post-MVP):** Analytics & downsampling
   - Historical track playback, heatmaps, per-vehicle deviation stats
   - Downsampling job + warm-data materialization
   - Full fleet rollout (1,000+ vehicles)

**Success metrics:**
- Ingest: 100+ pings/sec sustained, < 1 second end-to-end latency (ping arrival to alert creation)
- Accuracy: false-alert rate < 5% after tuning (validate on real routes)
- Coverage: 95%+ of live vehicles tracked (device/PWA operational)
- User adoption: 80%+ of supervisors acknowledge alerts within 10 min

**Pilot logistics:**
- Select 10–20 vehicles: mix of route types (TPS pickups, TPA disposal, return), GPS device + PWA
- DLH supervisor + drivers: training on alert meanings, what actions to take
- Daily standup: review alerts, false positives, tune tolerances
- Measure: alert count / day, acknowledgment rate, incidents caught early vs old flow

**Cutover criteria (Phase 5 → 6):**
- Ingest API 99.9% uptime over 2 weeks
- Map rendering latency < 500 ms p95
- No data loss (log reconciliation vs device/PWA records)
- Supervisor feedback: at least 1 incident where early alert helped (prevents fuel waste, catches delay)

## 12. Alternatives considered

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| **Option A: Batch ingest + nightly analysis** | Simple API (file upload), no real-time infra | 24-hour latency; supervisors only see deviations tomorrow → not actionable | Rejected — defeats operational value |
| **Option B: Stream ingest (Kafka) vs Redis Streams** | Kafka: battle-tested, higher throughput, multi-consumer | Kafka: ops overhead, extra infrastructure | Selected: Redis Streams (simpler for 8.6M/day volume; already in stack Phase 1) |
| **Option C: PostGIS vs custom geospatial library** | PostGIS: mature, tested, SQL-queryable | PostGIS: adds extension dependency | Selected: PostGIS (built-in polygon/distance calcs, < 50 lines SQL) |
| **Option D: Supervised learning for anomaly detection** | Adaptive to local patterns | requires labeled data, model tuning, drift monitoring | Rejected for MVP — rule-based sufficient; revisit if false-alert rate > 10% |
| **Option E: Automatic route re-optimization** | Supervisor gets suggestions to reroute vehicle | complex, requires real-time traffic data + driver acceptance | Rejected — out of scope; Phase 6+ feature |
| **Option F: In-database alerting (PostgreSQL trigger)** | Alert creation happens at write time | trigger complexity, limited geospatial in SQL, hard to debug | Rejected — application-level alerting (NestJS service) is clearer |

## 13. Open decisions (track to closure)

Decisions below must be resolved before the detailed design is finalized. Assign owners and close
by the end of the first planning session.

| ID | Decision | Options | Owner | Status | Target date | Notes |
|----|----------|---------|-------|--------|------|-------|
| D1 | GPS source | device telematics (preferred) / PWA location (Phase 5) / hybrid? | TBD | open | planning session 1 | Device + PWA combo gives fallback; device primary for reliability |
| D2 | Ping frequency | 5 sec (26M/day) / **10 sec (8.6M/day)** / 30 sec (2.9M/day) | TBD | open | planning session 1 | 10 sec = balanced; 5 sec = higher ops cost; test battery impact if PWA |
| D3 | Maps/routing | self-host (OSRM+OSM, on-prem) / **Google Maps / Mapbox** | TBD | open | planning session 1 | Recommend: start with Google Maps free tier, pivot to self-host if cost/internet is issue |
| D4 | Alert channels | **in-app WebSocket only (MVP)** / + email / + WhatsApp/SMS? | TBD | open | after RFC-0001 decision | Coordinate with RFC-0001 for consistent alert strategy across features |
| D5 | Ping retention | **raw 30 days hot → 1 year downsampled tracks** → archive? | TBD | open | planning session 2 | Follow `../../12-scalability-archiving.md` §3; confirm with DLH data-retention policy |
