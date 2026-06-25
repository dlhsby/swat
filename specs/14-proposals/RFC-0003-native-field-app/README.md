# RFC-0003 — Native / React-Native field app (offline trip capture & background tracking)

- **Status:** Draft (backlog) — captures scope **deferred out of the GPS phase (Phase 7)**
- **Author:** TBD
- **Created:** 2026-06-24
- **Relates to:** [`../../11-development-plan/phase-7.md`](../../11-development-plan/phase-7.md) (Phase 7 does
  fleet GPS via the GPS.id **hardware** webhook), [`../../09-modules/gps-tracking.md`](../../09-modules/gps-tracking.md),
  [`../../09-modules/transactions.md`](../../09-modules/transactions.md) (Trip recording/verification)

## 1. Why this exists

The **original *Field/Mobile + GPS* plan** (which once occupied the GPS phase) was an offline-first **PWA
where a driver logs in so their browser is tracked** (IndexedDB queue, service-worker background sync,
conflict resolution, browser Geolocation, web-push). That scope was **removed** when the phase was reshaped,
because:

1. **A browser PWA cannot reliably track in the background** — iOS/Android suspend background JS and
   Geolocation when the screen is off or the tab is backgrounded, so a login-to-track model misses exactly
   the periods we care about.
2. For **vehicle location**, the **GPS.id hardware trackers already installed on the vehicles** are a more
   reliable, always-on source — that is what **Phase 7** now integrates (see `gps-tracking.md`).

The **driver-side / field-data-entry / true background tracking** ambition is still valuable, but it belongs
in a **native or React-Native app**, not a PWA. This RFC parks that scope so it is **not lost**.

## 2. Scope parked here (deferred from the original Field/Mobile + GPS plan)

- **Offline field trip capture:** record pickup/disposal/refuel actuals, depart/return, odometer/weight/time
  on a mobile device **without connectivity**, with a local queue and **background sync** on reconnect.
- **Conflict resolution / merge:** server-verified trips reject stale local edits; weight conflicts surface
  a merge UI; notes merge. (Idempotent sync, no data loss.)
- **Driver-side background location** (where useful as a fallback/augment to hardware GPS): true OS-level
  background location with battery management — only a native app can do this dependably. **This is the
  highest-value reason to build the app**: track **vehicles that have no GPS.id hardware tracker**, and
  **complement** the vehicle tracker on those that do.
- **Push notifications to the driver/field user** (native push, not web-push).

> **Phase 7 already prepared the ingestion side for this.** The tracking pipeline is **source-agnostic**:
> `GpsPing.source` + `accuracyM`, an **adapter** ingestion contract (one canonical ping), a **multi-source
> `GpsDevice`** model (a vehicle may hold both a hardware tracker and a phone source), and live-position
> selection by freshness/confidence (hardware-preferred, phone fallback). This app only needs to add a
> **mobile ingestion adapter** (`POST /gps/mobile/pings`, per-user OAuth2 bearer per
> [`../../11-development-plan/future-native-client-auth.md`](../../11-development-plan/future-native-client-auth.md))
> — the matcher, deviation alerts, live map, and efficiency analytics work unchanged. See
> [`../../09-modules/gps-tracking.md`](../../09-modules/gps-tracking.md) §1.3.

## 3. Out of scope (already delivered elsewhere)
- Fleet vehicle GPS, route corridors, deviation alerts, live fleet map, efficiency analytics → **Phase 7 /
  `gps-tracking.md`** (hardware GPS.id). This RFC does **not** re-do those.

## 4. Open questions
- Native vs React-Native vs Flutter; team skillset and CI implications.
- App distribution (managed devices? Play Store / enterprise?).
- Auth: reuse the per-user OAuth2 bearer token endpoint already built for native clients
  (see [`../../11-development-plan/future-native-client-auth.md`](../../11-development-plan/future-native-client-auth.md)).
- Whether driver-side background location is needed at all once hardware GPS is live (it may only matter for
  vehicles without a tracker, or for proof-of-presence at a site).
- Sync conflict policy reuse vs redesign.

## 5. Rough sizing
**XL** — a separate app codebase + offline sync engine + native background services + store/distribution.
Schedule after the GPS phase (Phase 7) ships and the operational value of driver-side capture is confirmed.
