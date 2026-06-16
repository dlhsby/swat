# RFC-0002 — Vehicle GPS + route-schedule deviation alerts

- **Status:** Draft
- **Author:** TBD
- **Created:** 2026-06-05
- **Target phase:** extends Phase 8 (Field/GPS) or **Phase 9** (if schedule allows; TBD after Phase 8 assessment)
- **Detailed design / planning:** [`design.md`](./design.md) · session notes in [`sessions/`](./sessions/)
- **Relates to:** [`../RFC-0001-monitoring-revamp.md`](../RFC-0001-monitoring-revamp.md) (complementary live
  alerting; share alert-channel strategy), [`../../09-modules/scheduling.md`](../../09-modules/scheduling.md)
  (CrewSchedule + TripTemplate), [`../../09-modules/master-geography.md`](../../09-modules/master-geography.md)
  (Site lat/lng, Route geometry), [`../../09-modules/transactions.md`](../../09-modules/transactions.md) (Trip,
  Haul), [`../../12-scalability-archiving.md`](../../12-scalability-archiving.md) §2 (time-series partitioning)

## 1. Summary
Track vehicles in real time via GPS, compare each vehicle's live position against its **scheduled
route** for the day, and **raise an alert when a vehicle goes off-route** (or off-schedule). Gives
DLH live operational oversight and exception-based supervision.

## 2. Motivation / problem
Today the system records *what was reported* after the fact (pickup/disposal times, odometer). There
is no live visibility into whether a truck is actually following its assigned route, is delayed, or
has diverted. Off-route trucks mean missed TPS, fuel abuse, or unauthorized trips — currently
invisible until reconciliation (if at all).

## 3. Proposed solution

### 3.1 Location source
- **Vehicle GPS device / telematics** (preferred for reliability) posting positions to an ingestion
  API, **and/or** the driver **PWA** (Phase 8) sending background geolocation. Support both via one
  ingestion contract.

### 3.2 Planned route geometry
- Extend the route schedule with **geometry**: today's plan for a vehicle is its `CrewSchedule` +
  ordered `TripTemplate`s (sequence of `Route`s between `Site`s). Each `Route` gets an optional
  **polyline / corridor** (ordered waypoints + a tolerance buffer in meters). Sites already have
  lat/lng; routing geometry can be drawn manually or generated via a routing engine (OSRM/Valhalla
  or a maps provider).
- Define the **expected corridor** (buffered polyline) and **expected schedule windows** (target
  times from templates).

### 3.3 Real-time deviation detection
- Ingest GPS pings → match against the active haul's expected corridor (point-in-corridor /
  distance-to-polyline) and schedule window.
- **Deviation types:** off-corridor (distance > tolerance for > N seconds), off-sequence (visiting
  out of order / unplanned site), stationary-too-long, late vs target window, outside operating
  hours.
- Hysteresis/debounce to avoid flapping (GPS noise, brief detours).

### 3.4 Real-time alerting
- On confirmed deviation → create a `DeviationAlert` and push in-app (WebSocket/SSE) + optional
  email/WhatsApp to the responsible supervisor; show the vehicle on a **live map** with its planned
  vs actual track.
- Alerts are acknowledgeable, with resolution notes (audit trail).

## 4. Scope
- In scope: GPS ingestion, route geometry/corridor, live map, deviation rules, real-time alerts,
  alert history.
- Out of scope (later): predictive ETA, automatic route optimization, driver scoring, replacing the
  weighbridge flow.

## 5. Impact on existing specs
- **Data model (03):** new entities `VehicleGpsPing` (vehicle, lat/lng as `Decimal(11,6)` per glossary,
  speed km/h, heading degrees, createdAt timestamptz — **high-volume time-series**, partitioned monthly by createdAt
  per §2 of `../../12-scalability-archiving.md`), `RouteGeometry` (Route↔polyline waypoints, buffer meters),
  `DeviationRule` (metric, trigger, severity), `DeviationAlert` (rule, vehicle, ping, alert type, createdAt,
  ack status, notes), `VehicleDevice` (Vehicle↔device/telematics identifier, API key, device type).
- **API (07):** GPS ingest endpoint (service-account/API-key auth, batch, 100+ pings/sec sustained) at POST `/gps/pings`,
  live-positions read (vehicle, latest position), tracks read (vehicle, date range), geometry CRUD,
  alerts feed/ack, SSE/WebSocket stream for live alerts.
- **Architecture (05) / Scalability (12):** streaming ingestion queue (Redis Streams, per existing Phase 1 stack) → worker
  for geospatial matching; **PostGIS** extension (corridor math: point-to-polyline distance), time-series
  partitioning + hot/cold archiving per `../../12-scalability-archiving.md` §2–3, WebSocket gateway for alert fan-out, map-tile source (self-host
  OSRM/OSM vs Google/HERE Maps API).
- **Auth (06):** new permissions `gps:ingest` (service account for device), `tracking:read`, `deviation-rule:manage`,
  `deviation-alert:acknowledge`.
- **Frontend (08) / Design (13):** live fleet map (vehicle markers, active haul route + plan polyline), per-vehicle
  plan-vs-actual track overlay, alert center (inbox + acknowledge/mute), route-geometry editor (draw/import polyline
  + tolerance). New map and geospatial components in design system.

## 6. Dependencies & risks
- **Hardware/data source:** depends on GPS devices in vehicles OR Phase 8 driver-PWA background location.
  Devices require procurement + connectivity + battery management; PWA fallback uses cellular data (offline
  buffering via service worker). Coordinate with Phase 8 field/mobile planning.
- **PostGIS extension:** required for efficient corridor math (point-to-linestring distance). Adds ~30 MB
  binary; test compatibility with Prisma + pooling (PgBouncer). Corridor queries must be indexed
  (GIST index on geometry columns) to stay < 100 ms per vehicle.
- **Volume:** 1 ping per 10 sec × 1,000 vehicles = ~8.6M pings/day → **mandatory monthly partitioning by createdAt**
  per `../../12-scalability-archiving.md` §2; hot retention 30 days, downsample to 1-min tracks for history;
  ingest queue must handle 100+ pings/sec (Redis Streams, per existing Phase 1 stack). Verify with load test.
- **Privacy & retention:** driver location is sensitive data — obtain DLH/HR policy sign-off on:
  collection, retention window (proposal: 30 days raw, 1 year aggregated tracks), access control
  (supervisors only), GDPR/local privacy law compliance.
- **Geospatial accuracy:** Surabaya's dense urban + tall buildings cause GPS drift. Corridor tolerance
  buffer should be tunable (proposal: 100–500 m) per route; test ground-truth on live routes.

## 7. Rough sizing
**XL.** Suggested phasing across Phase 8–6: (a) ingestion API + live map (basic, no rules); (b) route
geometry + corridor model; (c) deviation rules + real-time alerts; (d) analytics & downsampling. The feature
is too large for Phase 8 alone; defer detailed scheduling to planning session after Phase 8 assessment.
If Phase 9 is not in the current roadmap, propose Phase 8 **extension** or prioritize which sub-phases
(likely a, b, c) are MVP.

## 8. Open questions
- **GPS source (D1):** device telematics (preferred: reliable, centralized) vs Phase-5 driver-PWA location
  (budget-friendly, user device battery cost) vs hybrid? Device procurement: who buys, how many vehicles,
  which vendor (budget: IDR/vehicle)?
- **Ping frequency (D2):** 5 sec (responsive but 26M/day), 10 sec (8.6M/day, balanced), 30 sec (2.9M/day,
  low volume)? Trade battery drain, cellular cost, geospatial accuracy, alert latency.
- **Maps & routing (D3):** self-host (OSRM + OpenStreetMap tile server, on-prem, no internet dependency,
  high ops cost) vs paid provider (Google Maps, HERE, Mapbox; simpler, cost per request, internet required)?
  Proof-of-concept: test corridor accuracy on real Surabaya routes.
- **Alert channels (D4):** in-app WebSocket only (simple, requires active login) vs email (asynchronous) vs
  WhatsApp/SMS for field supervisors? Relate to RFC-0001 alert-channel decisions. Vendor: Twilio or local SMS/WhatsApp provider?
- **Ping retention (D5):** raw pings 30 days hot → downsampled tracks 1 year warm, per `../../12-scalability-archiving.md` §3?
  Or different window? Confirm with DLH data-retention policy.
