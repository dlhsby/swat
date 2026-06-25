# Phase 8 — Production Readiness (Deploy, Legacy Migration & Cutover)

> **Final phase / cutover.** Takes the **code-complete** system — including the Phase 7 GPS tracking feature
> — to production and executes the legacy `dkp_swat` (MySQL) → Postgres cutover. Consolidates the former
> "Production Deploy + Legacy Migration Preparation" plan and adds the **GPS/PostGIS/realtime** production
> concerns introduced by Phase 7. Expands into turnkey tasks (T-8xx) at its start.

## Overview

Everything is built (Phases 0–7); this phase makes it **production-grade and live**: stand up production
infra (now incl. **PostGIS + realtime streaming**), run the real legacy migration, validate the vendor
weighbridge and **GPS.id** integrations end-to-end, then cut over. Builds on the four seed tracks
(`seed:demo`/`seed:legacy`/`seed:staging`/`seed:production`) and the Prisma 7 driver-adapter stack.

**Effort:** 2–3 weeks. **Dependencies:** Phases 1–7 code-complete; staging + production environments
provisioned; vendor coordination (TPA weighbridge desktop app; GPS.id webhook registration).

**Key deliverables:**
- Prisma 7 production cutover (`migrate deploy`) incl. **PostGIS extension + partition pre-creation** for the
  new `gps_ping` table.
- Legacy migration dress rehearsal on staging, then the real production load.
- Production infra runbook covering the **full live stack** (PG/PostGIS, Redis, MinIO, nginx **with SSE/WS
  streaming**, backups/PITR, secrets).
- Integration validation: TPA weighbridge **and** GPS.id (webhook registration + token rotation, Google Maps
  key restriction).
- Cutover, go-live, rollback plan, and post-cutover verification.

---

## Epic 8.1 — Prisma 7 production cutover (incl. PostGIS)

- `prisma migrate deploy` on staging then production (driver-adapter client; **partitioned & PostGIS tables
  are migration-managed — never `migrate dev`**). Verify `migrate status` = no drift.
- **PostGIS in production:** confirm the production Postgres image is `postgis/postgis:15-3.4` (per Phase 7
  T-701); `CREATE EXTENSION postgis` applied; the `gps_ping` `geography` column + GiST index present.
- **Partition pre-creation:** pre-create monthly partitions (transactions **and** `gps_ping`) ahead of the
  window + confirm the DEFAULT partition exists; schedule the monthly partition-creation job.
- Confirm `prisma.config.ts` + per-env `.env.staging`/`.env.production` loading (the `migrate-legacy`
  env-timing fix: per-env file XOR `prisma/.env` before the eager pg-adapter construction).
- **Acceptance:** [ ] `migrate status` clean on staging + prod; PostGIS verified; partitions pre-created
  (incl. `gps_ping`); no drift.

## Epic 8.2 — Legacy migration dress rehearsal (staging) → production load

- `seed:staging` (`SEED_ENV=staging`, `--include-transactions`) against staging from the real legacy MySQL:
  master + auth + scheduling + transactional history (keyset-batched, watermarked).
- Run `migrate:verify` (count reconciliation) + the Phase 5 `migrate:backfill-tpa` link pass.
- Reconcile plate-disambiguation (`needsPlateReview`) and dropped-link warnings.
- Image corpus migration (`migrate:images` → MinIO) if in scope for go-live.
- **GPS device mapping:** seed/confirm the `GpsDevice` IMEI↔vehicle registry for live vehicles (Phase 7
  T-704) so the webhook resolves on day one; unmatched IMEIs visible in the ops queue.
- Then the real **production** load: `seed:production` (`--confirm-production`).
- **Acceptance:** [ ] staging rehearsal passes (migrate + verify + backfill + reconciliation); IMEI registry
  populated; production load executed with verification.

## Epic 8.3 — Production infra runbook (full live stack)

- DNS/TLS, nginx, MinIO buckets (`swat-photos`, `swat-reports`), Redis, Postgres/**PostGIS** sizing +
  partition pre-creation, backups/PITR, log/metrics, health checks. Docker/compose → production topology.
- **Realtime streaming:** production nginx carries the GPS realtime endpoint with `proxy_http_version 1.1`,
  `proxy_buffering off`, long read timeout (and Upgrade map if WS) — validate SSE/WS works through the prod
  proxy (Phase 7 T-715).
- **Secrets (env-only, fail loudly):** strong `SESSION_SECRET`/`JWT_SECRET`; weighbridge service-account API
  keys; **`GPS_WEBHOOK_TOKEN` + IP allowlist**; **`GPSID_BASE_URL`/`GPSID_USERNAME`/`GPSID_PASSWORD`**;
  restricted `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (HTTP-referrer + enabled-APIs) + the server-side Roads/Directions key.
- Retention/archiving jobs active (incl. `gps_ping` 30-day hot → archive partition detach).
- **Acceptance:** [ ] infra stood up per runbook; backups verified (restore test); realtime works through
  prod nginx; all secrets sourced from env; retention jobs scheduled.

## Epic 8.4 — Integration validation (weighbridge + GPS.id)

- **Weighbridge:** T-416 vendor staging run (PT. Surveyor Indonesia / TPA desktop app) against staging REST.
- **GPS.id:** complete the manual **webhook registration** (email to it.ss@gps.id) pointing at the production
  webhook URL + secret token; verify live pings arrive, resolve to vehicles, render on the live map, and
  raise a test deviation; confirm the nightly pull/mileage reconcile job runs within rate limits; document
  **token rotation**.
- **Acceptance:** [ ] weighbridge validated on staging; GPS.id webhook registered and verified end-to-end on
  production; pull/reconcile job green.

## Epic 8.5 — Cutover + go-live

- Parallel-run / parity gate → production cutover → go-live.
- Rollback plan + freeze window + post-cutover verification checklist (incl. a GPS smoke test: a live vehicle
  appears on the map within one ping interval).
- **Acceptance:** [ ] cutover executed; go-live verification checklist green (incl. GPS live-tracking smoke test).

---

## Exit Criteria

- [ ] Staging dress rehearsal passes (migrate + verify + backfill + reconciliation).
- [ ] Production infra (incl. PostGIS + realtime streaming) stood up per runbook; backups verified.
- [ ] Vendor weighbridge validated; **GPS.id webhook registered + verified end-to-end**; nightly reconcile green.
- [ ] All secrets env-sourced (incl. GPS webhook token + GPS.id creds + restricted Maps key); no secrets in code.
- [ ] Production cutover executed; go-live verification checklist green (incl. GPS live-tracking smoke test).

## Milestone

The full system — masters, transactions, monitoring, reporting, weighbridge, and **live GPS fleet tracking**
— is running in production on real migrated data, with the legacy `dkp_swat` cutover complete. This is the
final phase of the SWAT rebuild.
