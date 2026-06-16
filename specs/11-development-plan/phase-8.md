# Phase 8 — Field/Mobile + GPS

## Overview

Enable drivers and field operators to capture trip data offline on mobile devices, with live GPS tracking and push notifications. Build on Phase 1 transaction workflows (trip recording, verification). Implement offline-first PWA with service worker, local queue (IndexedDB), and conflict resolution. Add basic live location ingestion and vehicle position view. Full route-corridor deviation alerting deferred to RFC-0002 (Phase 9 candidate).

**Effort:** 3–4 weeks. **Dependencies:** Phase 1 complete (trip recording, transactions); Phase 4 complete (weighbridge integration); Phase 2 complete (dashboards, but can parallelize partially).

**Key deliverables:**
- Offline-first PWA: service worker background sync, IndexedDB queue, conflict resolution.
- Mobile-responsive field UI for trip data entry (pickup/disposal weights, odometer, time).
- Live GPS location ingestion (async, battery-optimized) + vehicle position map.
- Push notifications (PWA + backend integration).
- Foundation for route-deviation alerting (Phase 9 / RFC-0002).

---

## Epic 5.1 — Offline Data Capture & Local Queue (Size: L)

**Parallel group:** 5.1 can parallelize with 5.2; both required before 5.3.

#### T-801. IndexedDB schema & sync queue (client-side)

- **Size:** M · **Coverage:** ≥80%
- **Depends on:** Phase 1 (Trip, HaulAssignment entities finalized)
- **Files:**
  - `apps/web/src/lib/offline/db.ts` (create — IndexedDB wrapper)
  - `apps/web/src/lib/offline/schema.ts` (create — object store definitions)
  - `apps/web/src/lib/offline/types.ts` (create)
  - `apps/web/test/offline-db.spec.ts` (create)
- **Steps:**
  1. **Design:**
     - IndexedDB database: `swat-offline`.
     - Object stores:
       - `trips` (keyPath: `localId`, indexes: `haulAssignmentId`, `status`, `syncedAt`).
       - `trip-edits` (keyPath: `id`, indexes: `tripId`, `timestamp`).
       - `metadata` (keyPath: `key`; store: last sync timestamp, version).
     - All queued trip updates stored locally until online.
  2. **Implement:**
     - Wrapper functions: `addTripToQueue(trip)`, `updateTripInQueue(localId, updates)`, `getTripFromQueue(localId)`, `getUnsyncedTrips()`, `markAsSynced(localId, serverId)`.
     - Transactions for atomic updates.
     - Error handling (quota exceeded, DB corruption).
  3. **Test (TDD):** 
     - Add trip → retrieve it.
     - Update trip → retrieve updated value.
     - Mark synced → removed from unsync list.
     - Bulk operations atomic.
- **Acceptance criteria:**
  - [ ] IndexedDB `swat-offline` database created.
  - [ ] Object stores: `trips`, `trip-edits`, `metadata`.
  - [ ] CRUD operations work: add, update, list, mark synced.
  - [ ] Transactions atomic (all-or-nothing).
  - [ ] Unit tests ≥80%; lint/typecheck clean.

#### T-802. Service worker with background sync (client-side)

- **Size:** M · **Coverage:** ≥75%
- **Depends on:** T-801 (IndexedDB in place), Phase 1 (PWA manifest/sw stub)
- **Files:**
  - `apps/web/public/sw.ts` (create/modify from Phase 0 stub)
  - `apps/web/src/lib/offline/sync-worker.ts` (create — service worker logic)
  - `apps/web/src/lib/offline/sync-registration.ts` (create — SW registration helper)
  - `apps/web/test/service-worker.spec.ts` (create)
- **Steps:**
  1. **Service worker lifecycle:**
     - Install: cache app shell + static assets (HTML, CSS, JS, critical UI).
     - Activate: clean up old caches.
     - Fetch: network-first for API calls (fall back to cache); cache-first for assets.
     - Background sync: register sync event when online, trigger syncing of IndexedDB queue.
  2. **Sync logic:**
     - On online event (or periodic): fetch unsyncedTrips from IndexedDB.
     - For each trip: POST to `/api/v1/trips/:id` (or appropriate trip endpoint).
     - On success: mark trip as synced in IndexedDB, update UI.
     - On conflict (409, trip already updated): merge strategy (see T-803).
     - On error: retry with exponential backoff (up to 3 times; then flag for manual review).
  3. **Testing:** Mock service worker, test fetch interception, sync on online event.
- **Acceptance criteria:**
  - [ ] Service worker registers, app shell cached.
  - [ ] Fetch: API calls network-first (fall back to cache).
  - [ ] Fetch: static assets cache-first.
  - [ ] Background sync: triggered on online event.
  - [ ] Unsync trips synced to server with retry logic.
  - [ ] Tests ≥75% (SW testing is tricky; focus on core logic); lint/typecheck clean.

#### T-803. Conflict resolution & merge strategy (client-side)

- **Size:** M · **Coverage:** ≥85%
- **Depends on:** T-802 (sync mechanism)
- **Files:**
  - `apps/web/src/lib/offline/conflict-resolver.ts` (create)
  - `apps/web/test/conflict-resolver.spec.ts` (create)
- **Steps:**
  1. **Scenario:** Driver edits trip offline (e.g., updates gross weight). While offline, supervisor verifies trip on another device (trip locked). Driver goes online, tries to sync.
     - Server returns 409 Conflict or 422 (trip already verified, can't edit).
     - Resolver logic:
       - If trip is VERIFIED: reject local edits (offline change discarded; notify driver "trip already verified").
       - If trip updated with different values: show conflict UI (driver chooses server version or local version).
       - If metadata only (e.g., notes): merge (both notes appended).
  2. **Implement:**
     - `resolveConflict(localTrip, serverTrip, mergePriority)` → merged trip or conflict marker.
     - Priority modes: `server-wins`, `client-wins`, `manual` (show UI).
     - For Phase 8: `server-wins` for weights (authority), `merge` for notes.
  3. **Test (TDD):**
     - Trip verified server-side, local edit offline → resolved as server-wins (local discarded).
     - Trip updated with different weight → conflict marker created (UI shows merge dialog).
     - Notes merged (both appended).
- **Acceptance criteria:**
  - [ ] Conflict detected (409 / 422 from server).
  - [ ] Server-verified trip: local edits discarded, user notified.
  - [ ] Weight conflict: user prompted to choose version.
  - [ ] Notes merged automatically.
  - [ ] Unit tests ≥85%; lint/typecheck clean.

#### T-804. Offline UI state management (client-side)

- **Size:** M · **Coverage:** ≥80%
- **Depends on:** T-801 (IndexedDB), T-803 (conflict resolver)
- **Files:**
  - `apps/web/src/lib/offline/offline-context.tsx` (create — React Context)
  - `apps/web/src/hooks/useOfflineTrips.ts` (create)
  - `apps/web/test/offline-context.spec.tsx` (create)
- **Steps:**
  1. **Context/hook:** Expose offline state to UI:
     - `isOnline` (boolean).
     - `unsyncedTrips` (array of Trip with localId + status).
     - `syncStatus` (idle, syncing, synced, conflict).
     - Methods: `queueTripUpdate(localId, updates)`, `resolveTripConflict(localId, choice)`.
  2. **State management:**
     - On trip update: write to IndexedDB immediately (optimistic).
     - On save button (sync): push to queue; UI shows "syncing" state.
     - On sync success: mark synced, show toast "Trip synced".
     - On sync error / conflict: show conflict dialog.
  3. **Test (TDD):**
     - Update trip while offline → queued, optimistic UI update.
     - Go online → queue syncs.
     - Conflict during sync → UI shows merge dialog.
- **Acceptance criteria:**
  - [ ] `useOfflineTrips()` hook returns `isOnline`, `unsyncedTrips`, sync methods.
  - [ ] Trip updates queued immediately (optimistic UI).
  - [ ] Sync triggered on online event.
  - [ ] Conflict UI shown when needed.
  - [ ] Tests ≥80%; lint/typecheck clean.

---

## Epic 5.2 — Mobile-Responsive Field UI (Size: L)

#### T-805. Trip recording form (responsive, polymorphic)

- **Size:** L · **Coverage:** ≥85%
- **Depends on:** Phase 1 (T-146 Record-trip form backend), T-804 (offline state)
- **Files:**
  - `apps/web/src/components/FieldTrip/TripRecordForm.tsx` (create)
  - `apps/web/src/components/FieldTrip/RefuelForm.tsx` (create)
  - `apps/web/src/components/FieldTrip/PickupForm.tsx` (create)
  - `apps/web/src/components/FieldTrip/DisposalForm.tsx` (create)
  - `apps/web/src/lib/field/trip-form-utils.ts` (create)
  - `apps/web/test/trip-record-form.spec.tsx` (create)
- **Steps:**
  1. **Design:**
     - Single polymorphic form detects trip category (REFUEL, PICKUP, DISPOSAL, etc.).
     - REFUEL fields: actualTime, actualOdometer, fuelRequestedLiters, fuelApprovedLiters (if authorized).
     - PICKUP fields: actualTime, actualOdometer, tareWeight (optional).
     - DISPOSAL fields: actualTime, actualOdometer, grossWeight, tareWeight, wasteVolume, cctvReference (optional).
     - All: submit → queue to IndexedDB (offline) or POST to backend (online).
  2. **Responsive:** Mobile-first (large touch targets, single-column layout on small screens; 2-column on tablets).
  3. **Validation:** Zod schemas for each trip type.
  4. **Implement:**
     - Detect trip type, conditionally render fields.
     - On submit: validate, call `queueTripUpdate()` (offline) or POST (online).
     - Show optimistic UI: "Saving...", then "Synced" or "Queued (offline)".
     - Compute net weight client-side (gross - tare) for reference only; server computes authoritative value.
  5. **Test (TDD):**
     - Render correct fields per trip type.
     - Validation: required fields, ranges.
     - Offline submission → queued.
     - Online submission → posted + synced.
- **Acceptance criteria:**
  - [ ] Form renders with correct fields per trip category.
  - [ ] Mobile-responsive (tested on 375px and 768px viewports).
  - [ ] Validation (Zod) working.
  - [ ] Offline submit → queued to IndexedDB, shows "Queued (offline)".
  - [ ] Online submit → POST to backend, shows "Synced".
  - [ ] Tests ≥85%; lint/typecheck clean.

#### T-806. Haul assignment (depart/return) form (mobile)

- **Size:** M · **Coverage:** ≥80%
- **Depends on:** Phase 1 (T-125, T-126 record depart/return endpoints), T-805 (form patterns)
- **Files:**
  - `apps/web/src/components/FieldTrip/DepartForm.tsx` (create)
  - `apps/web/src/components/FieldTrip/ReturnForm.tsx` (create)
  - `apps/web/test/depart-return-form.spec.tsx` (create)
- **Steps:**
  1. **Design:**
     - Depart form: actualTime (default now), actualOdometer (required, numeric).
     - Return form: actualTime (default now), actualOdometer (required).
     - Both: require GPS location (optional; see T-809 for integration).
  2. **Responsive:** Mobile-optimized.
  3. **Implement:**
     - POST to `/api/v1/haul-assignments/:id/record-depart` (online) or queue (offline).
  4. **Test (TDD):**
     - Form submits valid data.
     - Validation: odometer non-negative, time reasonable.
     - Offline/online handling.
- **Acceptance criteria:**
  - [ ] Depart/return forms render.
  - [ ] Mobile-responsive.
  - [ ] Validation (time, odometer).
  - [ ] Online/offline submission working.
  - [ ] Tests ≥80%; lint/typecheck clean.

#### T-807. Transaction day detail view (mobile-optimized)

- **Size:** L · **Coverage:** ≥80%
- **Depends on:** Phase 1 (T-143 Transaction day list & detail backend), T-805, T-806 (forms)
- **Files:**
  - `apps/web/app/(admin)/transactions/[dateISO]/page.tsx` (create/enhance from Phase 1)
  - `apps/web/src/components/FieldTrip/TransactionDayDetail.tsx` (create)
  - `apps/web/src/components/FieldTrip/HaulCard.tsx` (create)
  - `apps/web/src/components/FieldTrip/TripCard.tsx` (create)
  - `apps/web/test/transaction-day-detail.spec.tsx` (create)
- **Steps:**
  1. **Mobile layout:**
     - Header: date, status (IN_PROGRESS / DONE).
     - List of hauls (vehicle plate, driver name, status).
     - Tap haul → expand assignments (one driver per haul typically).
     - Tap assignment → trip list (expand trip, inline form to record).
     - Record depart/return buttons.
  2. **Responsive:** Single column on mobile; side-by-side on tablet.
  3. **Implement:**
     - Fetch `/api/v1/transaction-days/:dateISO` (or from cache).
     - Show hauls, assignments, trips.
     - Inline forms for depart, return, trip record.
     - On submit: POST (online) or queue (offline).
  4. **Test (TDD):**
     - Load transaction day, display hauls + trips.
     - Tap to expand.
     - Submit forms.
- **Acceptance criteria:**
  - [ ] Transaction day loads, displays all hauls/assignments/trips.
  - [ ] Tap haul → expands.
     - Tap trip → inline form or modal.
  - [ ] Mobile-responsive.
  - [ ] Forms submit (online/offline).
  - [ ] Tests ≥80%; lint/typecheck clean.

#### T-808. Offline indicator & sync status (UI)

- **Size:** S · **Coverage:** ≥80%
- **Depends on:** T-804 (offline context)
- **Files:**
  - `apps/web/src/components/OfflineIndicator.tsx` (create)
  - `apps/web/src/components/SyncStatus.tsx` (create)
  - `apps/web/test/offline-indicator.spec.tsx` (create)
- **Steps:**
  1. **Offline indicator:** Show in header / footer.
     - Online: green checkmark / "Online" (or hidden).
     - Offline: red icon / "Offline" + unsync count.
     - Syncing: spinner + "Syncing…" + percentage.
  2. **Sync status panel:** (optional, expandable)
     - List unsync trips with status (queued, syncing, error).
     - Retry button for failed syncs.
  3. **Test (TDD):**
     - Indicator shows correct state per `isOnline`, `syncStatus`.
     - Tap retry → re-syncs.
- **Acceptance criteria:**
  - [ ] Offline indicator visible in header.
  - [ ] Shows correct state (online/offline/syncing).
  - [ ] Unsync count displayed when offline.
  - [ ] Retry button works.
  - [ ] Tests ≥80%; lint/typecheck clean.

---

## Epic 5.3 — Live GPS Tracking & Location Ingestion (Size: L)

**Parallel group:** 5.3 in parallel with 5.1–5.2; requires both complete.

#### T-809. GPS location capture (client-side, battery-optimized)

- **Size:** M · **Coverage:** ≥80%
- **Depends on:** Phase 1 (Trip recording endpoints), T-804 (offline context)
- **Files:**
  - `apps/web/src/lib/gps/geolocation-service.ts` (create)
  - `apps/web/src/hooks/useCurrentLocation.ts` (create)
  - `apps/web/test/geolocation-service.spec.ts` (create)
- **Steps:**
  1. **Design:**
     - Capture GPS on trip events: depart, trip record, return.
     - Background: periodic (e.g., every 30 sec, configurable) **only while trip in progress** (status IN_PROGRESS).
     - Battery: use low-power mode (Geolocation API options: enableHighAccuracy=false, timeout=10s, maxAge=30s).
     - Permission: request `geolocation` permission on first use (show rationale: "GPS helps track haul progress").
  2. **Implement:**
     - Hook: `useCurrentLocation()` → { latitude, longitude, accuracy, timestamp, error }.
     - Service: `captureLocationOnEvent(tripId, event)` → call Geolocation API, return position.
     - Background service: start/stop periodic capture on trip status changes.
     - Store: GPS readings in IndexedDB (local queue) with tripId FK.
  3. **Error handling:**
     - Permission denied: graceful degradation (app works without GPS; show explanation).
     - Timeout: retry, up to 2 times.
     - Accuracy poor (>100m): still capture, but flag as low-confidence.
  4. **Test (TDD):**
     - Capture on depart, trip record, return.
     - Periodic background capture while trip active.
     - Permission denied → app continues (no crash).
     - Accuracy poor → still captured.
- **Acceptance criteria:**
  - [ ] GPS captured on trip events (depart, record, return).
  - [ ] Background: periodic capture every 30 sec (configurable) while trip in progress.
  - [ ] Battery-optimized: enableHighAccuracy=false, timeout=10s.
  - [ ] Permission handled gracefully (denied → app works, user notified).
  - [ ] Low-accuracy readings still captured + flagged.
  - [ ] Unit tests ≥80%; lint/typecheck clean.

#### T-810. GPS location ingestion endpoint (backend)

- **Size:** M · **Coverage:** ≥85%
- **Depends on:** Phase 1 (Trip + Haul endpoints), T-809 (GPS capture working)
- **Files:**
  - `apps/backend/prisma/schema.prisma` (modify — add GpsReading table)
  - `apps/backend/prisma/migrations/` (new migration: GpsReading table)
  - `apps/backend/src/modules/tracking/gps-reading.entity.ts` (create)
  - `apps/backend/src/modules/tracking/tracking.controller.ts` (create)
  - `apps/backend/src/modules/tracking/tracking.service.ts` (create)
  - `apps/backend/src/modules/tracking/dto/post-gps-reading.dto.ts` (create)
  - `apps/backend/test/tracking.e2e-spec.ts` (create)
- **Steps:**
  1. **Schema:**
     - GpsReading table: id (PK), tripId (FK), haulAssignmentId (FK), latitude, longitude, accuracy, timestamp (when captured), receivedAt (server timestamp).
     - Indexes: (tripId), (haulAssignmentId), (timestamp).
  2. **Endpoint: `POST /api/v1/tracking/gps-readings`**
     - Request: { tripId?, haulAssignmentId?, latitude, longitude, accuracy, timestamp }.
     - Response: 201 { success: true, data: { id, ... } }.
     - Validation: latitude ∈ [-90, 90], longitude ∈ [-180, 180], timestamp ≤ now.
     - Batch: support array of readings (for background sync bulk).
  3. **Implement:**
     - TrackingService: validate + insert.
     - No auth required (or Bearer token if authenticated user). **Option:** lightweight API key for embedded app.
  4. **Test (TDD):**
     - Single reading: POST → 201.
     - Batch readings: POST [...]  → 201.
     - Invalid coords → 400.
     - Missing tripId + haulAssignmentId → allow (floating GPS, linked later).
- **Acceptance criteria:**
  - [ ] GpsReading table created with tripId + haulAssignmentId FKs.
  - [ ] `POST /tracking/gps-readings` accepts single or batch.
  - [ ] Validation: lat/lon ranges, timestamp.
  - [ ] Response 201 with inserted reading ID.
  - [ ] Tests ≥85%; lint/typecheck clean.

#### T-811. Vehicle position view (map, basic live tracking)

- **Size:** M · **Coverage:** ≥75%
- **Depends on:** T-810 (GPS readings stored), Phase 2 (dashboards done or partly done)
- **Files:**
  - `apps/web/src/components/Tracking/VehicleMap.tsx` (create)
  - `apps/web/src/lib/mapping/map-client.ts` (create — Leaflet or similar)
  - `apps/web/app/(admin)/tracking/page.tsx` (create)
  - `apps/web/test/vehicle-map.spec.tsx` (create)
- **Steps:**
  1. **Design:**
     - Map view: show active hauls + vehicle current position (latest GPS reading).
     - Icons: vehicle icon at current location, haul label (plate + driver), status.
     - Tap vehicle → show breadcrumb (GPS trail from last 1 hour).
     - Refresh: poll `/api/v1/tracking/hauls?date=today&status=IN_PROGRESS` every 10 sec.
  2. **Library:** Leaflet (open-source) or Mapbox GL (commercial; nice UX).
  3. **Responsive:** Full-screen map on desktop; mobile-friendly (pinch zoom, etc.).
  4. **Test (TDD):**
     - Render map.
     - Fetch hauls + latest GPS → place vehicle icons.
     - Tap vehicle → show trail.
     - Refresh on interval.
- **Acceptance criteria:**
  - [ ] Map renders with vehicle positions (latest GPS per haul).
  - [ ] Icons labeled with plate + driver.
  - [ ] Tap vehicle → show GPS breadcrumb trail.
  - [ ] Auto-refresh every 10 sec.
  - [ ] Mobile-responsive.
  - [ ] Tests ≥75%; lint/typecheck clean.

#### T-812. GPS trail backend service (breadcrumb queries)

- **Size:** M · **Coverage:** ≥85%
- **Depends on:** T-810 (GpsReading table)
- **Files:**
  - `apps/backend/src/modules/tracking/tracking.service.ts` (modify)
  - `apps/backend/src/modules/tracking/tracking.controller.ts` (modify)
  - `apps/backend/src/modules/tracking/dto/gps-trail.dto.ts` (create)
  - `apps/backend/test/tracking.e2e-spec.ts` (modify)
- **Steps:**
  1. **Endpoint: `GET /api/v1/tracking/haulAssignments/:id/gps-trail?limit=100&minutes=60`**
     - Return: array of GpsReading for haul assignment, last N minutes (default 60), sorted by timestamp desc.
     - Response: 200 { success: true, data: [{ latitude, longitude, accuracy, timestamp }, ...] }.
  2. **Implement:**
     - Query: SELECT * FROM GpsReading WHERE haulAssignmentId = ? AND timestamp > now() - minutes AND timestamp <= now() ORDER BY timestamp DESC LIMIT limit.
     - Return DTO: only lat/lon/accuracy/timestamp (no sensitivities).
  3. **Test (TDD):**
     - Insert 10 GPS readings, query → get last 5.
     - Time filter: only readings within window.
- **Acceptance criteria:**
  - [ ] `GET /tracking/haulAssignments/:id/gps-trail` returns GPS breadcrumb.
  - [ ] Supports limit + minutes filters.
  - [ ] Tests ≥85%; lint/typecheck clean.

---

## Epic 5.4 — Push Notifications (Size: M)

#### T-813. Web push service backend integration

- **Size:** M · **Coverage:** ≥80%
- **Depends on:** Phase 1 complete
- **Files:**
  - `apps/backend/src/modules/notifications/notification.entity.ts` (create)
  - `apps/backend/src/modules/notifications/notification.service.ts` (create)
  - `apps/backend/src/modules/notifications/web-push.service.ts` (create)
  - `apps/backend/test/web-push.service.spec.ts` (create)
- **Steps:**
  1. **Design:**
     - Web push provider: web-push npm package (integrates with browser Push API).
     - VAPID keys: generate once, store in .env.
     - Events triggering notifications:
       - Trip verified (to checker + supervisor): "Trip XYZ verified by Driver A".
       - Trip conflict (to driver): "Trip offline conflict detected; see details".
       - Haul completed (to driver + supervisor): "Haul completed; ready for return".
  2. **Implement:**
     - Notification entity: id, userId, title, body, data (JSON, e.g., tripId), read, createdAt.
     - WebPushService: send push to subscribed endpoints (via browser Push API).
     - Store subscription endpoints per user (from /api/v1/notifications/subscribe endpoint).
  3. **Test (TDD):**
     - Send push: mock web-push, verify called with correct payload.
     - Subscribe endpoint: store subscription.
- **Acceptance criteria:**
  - [ ] Web push service initialized with VAPID keys.
  - [ ] Notification entity + subscription storage (Notification table with subscription JSON).
  - [ ] Send push on trip events.
  - [ ] Unit tests ≥80%; lint/typecheck clean.

#### T-814. Push subscription & permission (client-side)

- **Size:** M · **Coverage:** ≥80%
- **Depends on:** Phase 1 (PWA manifest + SW), T-813 (backend service)
- **Files:**
  - `apps/web/src/lib/notifications/push-subscription.ts` (create)
  - `apps/web/src/hooks/usePushNotifications.ts` (create)
  - `apps/web/src/components/NotificationPermissionPrompt.tsx` (create)
  - `apps/web/test/push-subscription.spec.ts` (create)
- **Steps:**
  1. **Flow:**
     - User logs in → on app shell load, check if Push API available + already subscribed.
     - If not: show prompt "Enable notifications for trip updates?" (appear once, dismissible).
     - On accept: call `ServiceWorkerContainer.pushManager.subscribe(...)` → get PushSubscription.
     - POST subscription JSON to `/api/v1/notifications/subscribe`.
  2. **Implement:**
     - Hook: `usePushNotifications()` → { subscribed, requestPermission, disable }.
     - Handle browser permission (Notification.permission).
     - SW message handler: receive push event, show notification.
  3. **Test (TDD):**
     - Request permission → subscribe.
     - Already subscribed → don't re-request.
     - Dismiss prompt → don't ask again (sessionStorage flag).
- **Acceptance criteria:**
  - [ ] Permission prompt shown (once per session/user).
  - [ ] Subscribe to push on accept.
  - [ ] POST subscription to backend.
  - [ ] SW receives push events, shows notification.
  - [ ] Tests ≥80%; lint/typecheck clean.

#### T-815. Notification center & history (UI)

- **Size:** S · **Coverage:** ≥75%
- **Depends on:** T-813, T-814 (notifications stored + received)
- **Files:**
  - `apps/web/src/components/NotificationCenter.tsx` (create)
  - `apps/web/app/(admin)/notifications/page.tsx` (create)
  - `apps/web/test/notification-center.spec.tsx` (create)
- **Steps:**
  1. **Design:**
     - Bell icon in header: shows unread count.
     - Dropdown: list recent (e.g., 10) unread notifications.
     - Full page: `/notifications` with history (searchable by date, trip, type).
  2. **Implement:**
     - GET `/api/v1/notifications?unread=true&limit=10` → display in dropdown.
     - GET `/api/v1/notifications?date=YYYY-MM-DD&search=...` → full history page.
     - Mark read: PATCH `/api/v1/notifications/:id { read: true }`.
  3. **Test (TDD):**
     - Fetch + display unread.
     - Mark as read.
- **Acceptance criteria:**
  - [ ] Notification center dropdown shows unread count.
  - [ ] Recent notifications listed.
  - [ ] Full history page with filters.
  - [ ] Mark read working.
  - [ ] Tests ≥75%; lint/typecheck clean.

---

## Epic 5.5 — Hardware & Privacy Compliance (Size: S)

#### T-816. GPS permission request & privacy notice

- **Size:** S · **Coverage:** N/A
- **Depends on:** T-809 (GPS capture), T-814 (push permissions)
- **Files:**
  - `docs/PRIVACY-NOTICE-GPS.md` (create)
  - `apps/web/src/components/GpsPermissionPrompt.tsx` (create)
- **Steps:**
  1. **Privacy notice:**
     - Explain GPS data collection: "Location data is captured to track haul progress and optimize routes (Phase 9). Data is retained for 30 days, then archived."
     - Link to full privacy policy.
  2. **Permission prompt:**
     - Show on first trip record (or app launch).
     - Clarify: optional (app works without GPS), but recommended.
  3. **Compliance notes:**
     - Document data retention (30 days live, then archive).
     - Ensure privacy notice in app & website.
     - Note: PHI (Personal identification) not collected; only vehicle position.
- **Acceptance criteria:**
  - [ ] Privacy notice drafted (Indonesian).
  - [ ] Permission prompt shown with rationale.
  - [ ] Data retention policy documented.

#### T-817. Offline app data security (local storage audit)

- **Size:** S · **Coverage:** N/A
- **Depends on:** T-801 (IndexedDB), T-809 (GPS capture)
- **Files:**
  - `docs/OFFLINE-DATA-SECURITY.md` (create)
- **Steps:**
  1. **Audit:**
     - IndexedDB data: unencrypted locally (browser sandboxed; assume device is trusted).
     - GPS readings: no PII (only lat/lon), safe.
     - Trip updates: trip data (weights, odometer), no PII.
  2. **Risk:** device theft → attacker can access IndexedDB (view trips, GPS).
     - Mitigation: app-level encryption optional (Phase 9 if needed); rely on device security.
  3. **Recommendation:** document security assumptions for DLH stakeholders.
- **Acceptance criteria:**
  - [ ] Security audit documented.
  - [ ] Risks + mitigations noted.

---

## Epic 5.6 — Testing & Documentation (Size: M)

#### T-818. Offline + sync E2E tests (Playwright)

- **Size:** M · **Coverage:** ≥85%
- **Depends on:** T-805, T-806, T-807 (forms + UI complete), T-802 (sync mechanism)
- **Files:**
  - `apps/web/test/offline-sync.e2e.spec.ts` (create)
- **Steps:**
  1. **Scenario 1: Offline trip record + sync**
     - Start browser, navigate to transaction day.
     - Disable network (DevTools → offline).
     - Record trip: fill form, submit → UI shows "Queued (offline)".
     - Enable network → sync triggered, UI shows "Syncing..." → "Synced".
     - Verify backend: Trip updated with correct data.
  2. **Scenario 2: Conflict resolution**
     - Record trip offline (weight = 100).
     - While offline, another browser verifies trip (supervisor).
     - Enable network → sync detects conflict (409).
     - UI shows conflict dialog; driver chooses server version.
     - Verify: local edit discarded, trip locked.
  3. **Scenario 3: GPS capture + sync**
     - During trip record, capture GPS (mock Geolocation API).
     - Go offline, record trip, record GPS.
     - Go online → GPS readings synced.
- **Acceptance criteria:**
  - [ ] E2E tests cover offline record, sync, conflict scenarios.
  - [ ] Tests ≥85% coverage of offline features.
  - [ ] All tests pass in CI (headless browser).

#### T-819. Mobile responsiveness testing

- **Size:** S · **Coverage:** N/A
- **Depends on:** T-805, T-806, T-807 (forms + UI), T-811 (map)
- **Files:**
  - `docs/MOBILE-TESTING-CHECKLIST.md` (create)
- **Steps:**
  1. **Manual testing:**
     - Forms on iPhone 14 (375px) + iPad (768px).
     - Button sizes: ≥44px (touch target).
     - Orientation: portrait + landscape.
     - Scroll: no horizontal scroll on mobile.
  2. **Automated:** Playwright screenshots at 375px, 768px (basic).
  3. **Document findings:** any layout issues.
- **Acceptance criteria:**
  - [ ] Testing checklist completed.
  - [ ] No horizontal scroll on mobile.
  - [ ] Touch targets ≥44px.
  - [ ] Orientation switches work.

#### T-820. Field/GPS documentation & deployment guide

- **Size:** S · **Coverage:** N/A
- **Depends on:** All Phase 8 tasks
- **Files:**
  - `docs/FIELD-OPERATIONS-GUIDE.md` (create — Indonesian)
  - `docs/GPS-DEPLOYMENT.md` (create)
  - `docs/OFFLINE-MODE-FAQ.md` (create)
- **Steps:**
  1. **Field operations guide:**
     - How to record trip offline.
     - What happens when offline (queued, synced when online).
     - Conflict resolution workflow.
  2. **GPS deployment:**
     - Permission handling, accuracy, privacy.
     - GPS trail view (supervisor).
  3. **FAQ:**
     - "Why does the app ask for location?" → Explain.
     - "My trip didn't sync—what do I do?" → Troubleshoot.
  4. **Screenshots + video (optional):** walkthrough.
- **Acceptance criteria:**
  - [ ] Documentation (Indonesian) comprehensive.
  - [ ] Covers offline, GPS, conflict scenarios.
  - [ ] Shared with DLH for training.

---

## Epic 5.7 — Route-Deviation Alerting Foundation (RFC-0002 Prep)

#### T-821. RFC-0002 GPS route-corridor design review & scoping

- **Size:** S · **Coverage:** N/A
- **Depends on:** T-810 (GPS readings stored + queryable), T-812 (GPS trail service)
- **Files:**
  - `docs/RFC-0002-IMPLEMENTATION-NOTES.md` (create — Phase 8 review of RFC)
- **Steps:**
  1. **Review RFC-0002** (in 14-proposals/).
  2. **Phase 8 scope vs Phase 9:**
     - Phase 8 (done): GPS capture + live map + breadcrumb trail.
     - Phase 8 gap: route corridor definition, deviation detection, alerting.
     - Phase 9 scope: route corridor (polyline) per route; geofence logic; alert trigger; supervisor dashboard.
  3. **Note dependencies:**
     - Route table: need corridor (geometry) column + indexes.
     - GpsReading: queryable by haulAssignmentId + time window.
     - Both ready for Phase 9.
  4. **Document:** Phase 8 foundation, Phase 9 roadmap.
- **Acceptance criteria:**
  - [ ] RFC-0002 reviewed in context of Phase 8 completion.
  - [ ] Phase 8 vs Phase 9 scope clarified.
  - [ ] Database ready for Phase 9 (GpsReading, Route corridor).
  - [ ] Phase 9 roadmap documented.

---

## Exit Criteria (Phase 8)

**Phase 8 is complete when ALL of the following are verified:**

### Offline Data Capture
- [ ] **IndexedDB queue:** Trip updates stored locally; unsync list queryable.
- [ ] **Service worker sync:** Background sync triggered on online event; unsync trips synced to server.
- [ ] **Conflict resolution:** Server-verified trips: local edits discarded (user notified). Weight conflicts: user prompted to choose version.
- [ ] **Offline indicator:** UI shows online/offline/syncing state + unsync count.

### Mobile UI
- [ ] **Trip recording form:** Responsive (tested 375px, 768px), polymorphic (REFUEL/PICKUP/DISPOSAL), online/offline submit.
- [ ] **Depart/return forms:** Mobile-optimized, submit online/offline.
- [ ] **Transaction day view:** Mobile layout, expand/collapse hauls, inline forms.
- [ ] **Sync status:** Shows queued trips, retry button, progress.

### GPS Tracking
- [ ] **GPS capture:** On trip events + background periodic (30 sec interval while trip active).
- [ ] **Battery-optimized:** enableHighAccuracy=false, timeout=10s.
- [ ] **Permission handling:** Graceful if denied; app works without GPS.
- [ ] **GPS ingestion endpoint:** `POST /tracking/gps-readings` accepts single/batch, validates coords.
- [ ] **Vehicle position map:** Shows active hauls + latest GPS positions; breadcrumb trail on tap.
- [ ] **GPS trail API:** `GET /tracking/haulAssignments/:id/gps-trail` returns readings with time + limit filters.

### Push Notifications
- [ ] **Push subscription:** User can enable/disable; POST subscription to backend.
- [ ] **Notification events:** Sent on trip verify, conflict, haul completion.
- [ ] **Notification center:** Bell icon with unread count, dropdown, full history page.

### Testing & Quality
- [ ] **Offline + sync E2E tests:** ≥85% coverage (offline record, sync, conflict scenarios).
- [ ] **Unit tests:** ≥80% for offline context, conflict resolver, geolocation service.
- [ ] **Mobile testing:** Responsive on 375px & 768px; no horizontal scroll; touch targets ≥44px.
- [ ] **Lint + typecheck:** `pnpm lint && pnpm typecheck` clean (0 errors, 0 warnings).

### Documentation & Compliance
- [ ] **Field operations guide:** Indonesian, covers offline workflow, conflict resolution, GPS permission.
- [ ] **GPS deployment guide:** Permission, accuracy, privacy, data retention (30 days + archive).
- [ ] **Privacy notice:** Explains GPS data collection + retention.
- [ ] **Offline security audit:** Documents assumptions (browser sandbox, device trust).
- [ ] **RFC-0002 review:** Phase 8 foundation vs Phase 9 route-deviation alerting scope clarified.

### Data Integrity
- [ ] **Offline → online sync:** No data loss; all queued trips synced.
- [ ] **Conflict handling:** Verified trips reject local edits; weights conflict → user chooses; notes merge.
- [ ] **Idempotency:** Duplicate offline syncs (e.g., retry) don't create duplicate records (relies on Phase 4 idempotency keys + backend upsert logic).

---

## Milestone

**End of Phase 8 — Field/Mobile + GPS Foundation Complete.** Drivers and field operators can:
- Record trip data on mobile devices **offline**; automatically sync when online.
- Resolve conflicts when offline edits conflict with server updates.
- Capture GPS location (battery-optimized) during hauls.
- See live vehicle positions on supervisor map; view GPS breadcrumbs.
- Receive push notifications for trip events, conflicts, haul completion.

System handles network disruptions gracefully (queue → sync). Mobile UI optimized for field use (large touch targets, single-column on small screens). All GPS data secured locally (browser sandbox); privacy-compliant (notice + data retention policy). Foundation ready for Phase 9: route-corridor deviation alerting (RFC-0002).

---

## Task Summary (T-801 … T-821)

| Task ID | Epic | Title | Size |
|---------|------|-------|------|
| T-801 | 5.1 | IndexedDB schema & sync queue (client-side) | M |
| T-802 | 5.1 | Service worker with background sync (client-side) | M |
| T-803 | 5.1 | Conflict resolution & merge strategy (client-side) | M |
| T-804 | 5.1 | Offline UI state management (client-side) | M |
| T-805 | 5.2 | Trip recording form (responsive, polymorphic) | L |
| T-806 | 5.2 | Haul assignment (depart/return) form (mobile) | M |
| T-807 | 5.2 | Transaction day detail view (mobile-optimized) | L |
| T-808 | 5.2 | Offline indicator & sync status (UI) | S |
| T-809 | 5.3 | GPS location capture (client-side, battery-optimized) | M |
| T-810 | 5.3 | GPS location ingestion endpoint (backend) | M |
| T-811 | 5.3 | Vehicle position view (map, basic live tracking) | M |
| T-812 | 5.3 | GPS trail backend service (breadcrumb queries) | M |
| T-813 | 5.4 | Web push service backend integration | M |
| T-814 | 5.4 | Push subscription & permission (client-side) | M |
| T-815 | 5.4 | Notification center & history (UI) | S |
| T-816 | 5.5 | GPS permission request & privacy notice | S |
| T-817 | 5.5 | Offline app data security (local storage audit) | S |
| T-818 | 5.6 | Offline + sync E2E tests (Playwright) | M |
| T-819 | 5.6 | Mobile responsiveness testing | S |
| T-820 | 5.6 | Field/GPS documentation & deployment guide | S |
| T-821 | 5.7 | RFC-0002 GPS route-corridor design review & scoping | S |

**Total tasks:** 21 | **Est. effort:** 3–4 weeks

---

**Next:** Execute tasks T-801 → T-821 in order, respecting dependencies and parallel groups. Refer to [`08-frontend-spec.md`](../08-frontend-spec.md) for PWA/responsive patterns, [`09-modules/transactions.md`](../09-modules/transactions.md) for trip endpoints, [`06-auth-rbac.md`](../06-auth-rbac.md) for auth patterns, and [`14-proposals/RFC-0002-gps-route-deviation-alerts/`](../14-proposals/RFC-0002-gps-route-deviation-alerts/) for route-deviation scope (Phase 9).
