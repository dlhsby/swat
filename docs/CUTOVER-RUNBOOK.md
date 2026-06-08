# SWAT Cutover Runbook (T-167)

Operational procedure to switch DLH Kota Surabaya from the legacy `old_swat`
(CodeIgniter + MySQL) system to SWAT (NestJS + PostgreSQL). Spec:
[`specs/04-migration.md`](../specs/04-migration.md) §11.

> **Hard prerequisite:** Epic 1.17 (legacy parity) is complete — reference masters,
> kitir bulk import, refuel log, inspection, maintenance all live. Cutover MUST NOT
> proceed without it.

## 0. Roles & sign-off authority

| Role | Person | Responsibility |
|------|--------|----------------|
| Cutover lead | _DLH IT lead_ | runs this runbook, calls go/no-go |
| DBA | _ops_ | migration + delta-sync + backups |
| Approver (go-live) | _DLH Kepala Bidang / Director_ | signs off after verification |
| Rollback authority | _DLH Director / CIO_ | sole authority to trigger rollback |

A go-live decision requires the Approver's written sign-off on the §4 checklist.

## 1. Pre-cutover (T-7 days → T-1 day)

- [ ] Production stack provisioned + healthy: `docker compose -f infra/docker-compose.prod.yml --env-file infra/docker-compose.prod.env up -d --build` → all services `healthy`.
- [ ] Secrets set (no defaults): `SESSION_SECRET`, DB + MinIO credentials. TLS terminating in front of Nginx.
- [ ] Bulk migration done + verified on staging: `migrate:discovery` → `migrate:legacy` → `migrate:images` → `migrate:verify` (exit 0, ≤1% variance, FK clean). See [`apps/backend/scripts/migration/README.md`](../swat/apps/backend/scripts/migration/README.md).
- [ ] Parallel run active: legacy still authoritative; `migrate:delta-sync` run daily, KPI parity (tonnage/fuel/ritase) within 1%.
- [ ] This runbook + [`ROLLBACK-PLAN.md`](./ROLLBACK-PLAN.md) dry-run on staging (flip → verify → flip back).
- [ ] Users notified of the freeze window + that they will receive one-time credentials.

## 2. Freeze window (T-0, e.g. 06:00–10:00 WIB)

1. **Announce freeze.** Legacy goes **read-only** (revoke write grants on the MySQL app user, or set the app to maintenance mode).
2. **Drain in-flight work:** confirm no open transaction days in legacy (all `haritransaksi` for the day are `Selesai`); if not, coordinate with operators to close them.
3. **Final delta-sync:** `pnpm --filter @swat/backend run migrate:delta-sync` → must exit 0 (KPI parity within tolerance).
4. **Final image sync:** `pnpm --filter @swat/backend run migrate:images` (resumable; uploads anything new).
5. **Snapshot both DBs:** `pg_dump` the new PostgreSQL + keep the legacy MySQL backup — this is the rollback restore point.

## 3. Verification (still inside the freeze)

- [ ] `migrate:verify` → exit 0; reconciliation report ≤1% per table, FK integrity clean.
- [ ] Per-year spot-check (e.g. 2024): row counts, tonnage, fuel, ritase match legacy within 1%.
- [ ] Image reconciliation: counts match; orphans reviewed + signed off.
- [ ] Security: no non-Argon2 hashes; every migrated user `mustChangePassword=true`.
- [ ] Smoke test on the new prod URL: login as admin, open Dashboard, Haul Board, a master-data CRUD, record+verify a trip in a scratch day.

## 4. Go / no-go sign-off

The Approver reviews §3 and signs:

> "Verification complete, variance within tolerance. Approved to cut over to SWAT. — _name, role, timestamp_"

If any §3 item fails and cannot be resolved inside the window → **no-go**, unfreeze legacy, reschedule.

## 5. Flip (T-0 + ~3.5h)

1. **DNS / proxy flip:** point the production hostname (or the load-balancer/IP) at the SWAT Nginx. Lower DNS TTL to 60s a day in advance so propagation is fast.
2. **Distribute temp credentials** out-of-band (secure channel — never email/log the password): each user gets their username + a one-time password and changes it on first login (forced reset).
3. **Verify** the public URL serves SWAT and login works end-to-end (cookie set, `/auth/me` returns the user).

## 6. Post-cutover validation (first 2 hours)

- [ ] Smoke test each role's critical path (see [`USER-GUIDE.md`](./USER-GUIDE.md)).
- [ ] Watch backend logs for errors / 5xx; watch Redis session creation; watch DB connections.
- [ ] Confirm the 03:00 daily-init cron will materialize tomorrow's day (or trigger `POST /transaction-days/initialize-today` manually for today).

## 7. Stabilize

- [ ] Keep **legacy read-only for 48 hours** as the immediate fallback (see rollback plan).
- [ ] Hypercare per [`USER-GUIDE.md`](./USER-GUIDE.md) §Hypercare.
- [ ] After 48h with no rollback trigger: decommission legacy writes; keep the legacy DB archived read-only for 90 days.

## Rollback

If a rollback trigger fires at any point, STOP and follow [`ROLLBACK-PLAN.md`](./ROLLBACK-PLAN.md).
