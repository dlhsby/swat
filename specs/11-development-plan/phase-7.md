# Phase 7 — Production Deploy + Legacy Migration Preparation

> **Stub.** This phase expands into turnkey epics/tasks (T-7xx) at its start. It is the cutover phase:
> stand up production, run the real legacy migration, and go live.

## Overview

Take the code-complete system to production and execute the legacy `dkp_swat` (MySQL) → Postgres
cutover. Builds on the four seed tracks (`seed:demo`/`seed:legacy`/`seed:staging`/`seed:production`)
and the Prisma 7 driver-adapter stack.

## Workstreams (expand at phase start)

### 7.1 — Prisma 7 production cutover
- `prisma migrate deploy` on staging then production (driver-adapter client; partitioned tables are
  migration-managed — never `migrate dev`). Verify `migrate status` = no drift.
- Confirm `prisma.config.ts` + per-env `.env.staging`/`.env.production` loading (the `migrate-legacy`
  env-timing fix: per-env file XOR `prisma/.env` before the eager pg-adapter construction).

### 7.2 — Legacy migration dress rehearsal (staging)
- `seed:staging` (`SEED_ENV=staging`, `--include-transactions`) against the staging DB from the real
  legacy MySQL: master + auth + scheduling + transactional history (keyset-batched, watermarked).
- Run `migrate:verify` (count reconciliation) + the Phase 5 `migrate:backfill-tpa` link pass.
- Reconcile plate-disambiguation (`needsPlateReview`) and dropped-link warnings.
- Image corpus migration (`migrate:images` → MinIO) if in scope for go-live.

### 7.3 — Infra runbook (production)
- DNS/TLS, nginx, MinIO buckets (`swat-photos`, `swat-reports`), Redis, Postgres sizing + partition
  pre-creation, backups/PITR, log/metrics, health checks. Docker/compose → production topology.
- Secrets: strong `SESSION_SECRET`/`JWT_SECRET`; service-account API keys for the weighbridge.

### 7.4 — Cutover + go-live
- T-416 vendor weighbridge staging run (PT. Surveyor Indonesia / TPA desktop app) against staging REST.
- Parallel-run / parity gate → production `seed:production` (`--confirm-production`) → go-live.
- Rollback plan + freeze window + post-cutover verification checklist.

## Exit Criteria

- [ ] Staging dress rehearsal passes (migrate + verify + backfill + reconciliation).
- [ ] Production infra stood up per runbook; backups verified.
- [ ] Vendor weighbridge integration validated against staging.
- [ ] Production cutover executed; go-live verification checklist green.

**Next:** Phase 8 — Field/Mobile + GPS.
