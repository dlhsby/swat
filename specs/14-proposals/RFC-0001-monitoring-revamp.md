# RFC-0001 — Monitoring revamp (real-time, configurable dashboards)

- **Status:** Draft
- **Author:** TBD
- **Created:** 2026-06-05
- **Target phase:** extends Phase 2 (Monitoring) — schedule as a follow-up once base monitoring ships
- **Supersedes / relates to:** [`../09-modules/monitoring.md`](../09-modules/monitoring.md),
  [`../12-scalability-archiving.md`](../12-scalability-archiving.md) (rollups + caching)

## 1. Summary
Evolve the Phase-2 monitoring module from nightly-aggregated dashboards into a faster, near-real-time,
**configurable** monitoring experience: live tonnage/fuel/route tiles, user-built dashboards, threshold
alerts, and drill-down — without compromising operational DB performance.

## 2. Motivation / problem
Base monitoring (Phase 2) uses nightly rollups and pre-aggregated summary tables (see `../12-scalability-archiving.md` §5 for the canonical caching strategy). Supervisors increasingly want:
- **Near-real-time** numbers during the operational day (today so far), not just yesterday.
- **Custom dashboards** per role (Kepala Bidang vs Kepala Seksi vs Walikota see different things).
- **Threshold alerts** (e.g. "TPS X below expected tonnage by 11:00", "fuel variance > 20%").
- Better year-over-year and per-site comparisons over archived data.

## 3. Proposed solution
- **Live "today" layer:** incremental aggregation on trip verify (already feeding rollups) also
  pushes current-day deltas to Redis (keyed as `monitoring:<metric>:<filters>` per the unified caching
  strategy); dashboards subscribe via WebSocket/SSE for live tiles. Historical tiles keep using 
  rollups and summary tables (see [`../12-scalability-archiving.md`](../12-scalability-archiving.md) §4–5).
- **Configurable dashboards:** new `Dashboard` + `DashboardWidget` entities (per user/role); widget
  types (KPI, line, bar, map, table) bound to a metric + filter set.
- **Alerting:** new `MonitoringRule` entity (metric, comparator, threshold, schedule/trigger)
  evaluated by a background job + triggered on live deltas; notifications via in-app + email (and
  push if PWA notifications land).
- Keep all reads on rollups/cache/Redis; never aggregate raw history on demand.

## 4. Scope
- In scope: real-time today-tiles, configurable dashboards, threshold alerts, comparison views.
- Out of scope: GPS/map-based live tracking (that's [RFC-0002](./RFC-0002-gps-route-deviation-alerts/)),
  predictive analytics/ML.

## 5. Impact on existing specs
- **Data model (03):** new entities `Dashboard` (user/role, collection of widgets), `DashboardWidget`
  (dashboard↔metric, position, filters, widget type), `MonitoringRule` (metric, comparator, threshold,
  schedule), `MonitoringAlert` (rule↔event, timestamp, acknowledged, resolution notes). Live metrics
  cached in Redis (keyed as `monitoring:<metric>:<filters>`, 15-min TTL, invalidated on trip verify 
  per the unified caching strategy). All per [`../12-scalability-archiving.md §4–5`](../12-scalability-archiving.md) (rollups + caching).
- **API (07):** dashboards CRUD + user-saved layouts, widget metric endpoints (returns cached/rollup data),
  rules CRUD + eval, alerts feed + ack/mute, WebSocket/SSE stream for live tile updates (batched,
  throttled to limit fan-out cost).
- **Architecture (05) / Scalability (12):** add SSE/WebSocket gateway service; background job for rule
  evaluation (cron-driven or event-triggered on trip verify, per §4 of caching strategy); Redis for live metrics + cache; the live
  layer must not touch operational write paths beyond the existing trip-verify increment.
- **Auth (06):** new permissions `dashboard:read`, `dashboard:create`, `dashboard:share`, `monitoring-rule:manage`.
- **Frontend (08) / Design (13):** dashboard builder UI (drag/drop widgets), live metric tiles, alert center
  (inbox + snooze/resolve); new design-system chart components (KPI, line, bar, map).

## 6. Dependencies & risks
- Depends on Phase-2 rollups + aggregate caching being in place.
- Risk: WebSocket fan-out cost at scale → mitigate with cached snapshots + throttled push.
- Risk: alert fatigue → sensible defaults, per-rule mute.

## 7. Rough sizing
**L.** Could phase as: (a) live today-tiles, (b) configurable dashboards, (c) alerting.

## 8. Open questions
- **Alert channels:** in-app notification center sufficient, or add email/WhatsApp/SMS for field supervisors?
  Relate to RFC-0002 (GPS alerts) for consistent channel strategy.
- **Dashboard ownership:** per-user custom dashboards (flexible, more work) vs per-role/team templates (simpler,
  enforced consistency)? Or hybrid: templates + personalization?
- **Metric freshness SLA:** 5–10 sec (live), 1 min (acceptable for most KPIs), or 5 min? Trade-off with
  Redis/WebSocket fan-out cost at scale (1,000+ users).
