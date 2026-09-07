# 15 — Deployment

Authoritative deployment design for SWAT. **Staging runs on AWS; production is on-premise and
platform-agnostic.** The same container images run in both places — every environment difference is
driven by config/env, never baked in. The operational runbook (exact commands, one-time setup) lives
beside the code at [`../revamp/infra/aws/README.md`](../revamp/infra/aws/README.md).

The deployment pattern originated on a box shared with a sibling project; SWAT has run in its own
AWS account since 2026-09 and no longer shares any resource with it.

## Environments

| | Staging | Production |
|---|---|---|
| Where | AWS, SWAT's own account (EC2 `swat-staging`) | On-premise / any Docker host |
| Stack file | `infra/compose.staging.yml` (caddy + backend + web + docs + redis) | `infra/docker-compose.prod.yml` (self-contained: +postgres +minio +nginx) |
| Database | AWS RDS instance `swat-staging`, database `swat_staging`, SSL | bundled `postgres:15` |
| Object storage | AWS S3 (`swat-photos-staging-id`, `swat-reports-staging-id`) via EC2 instance role | bundled MinIO |
| TLS edge | SWAT's own Caddy in the stack (Let's Encrypt) | bundled nginx |
| Secrets | dotenvx-encrypted `infra/env/{backend,web}/.env.staging` + key in SSM/GitHub | `.env`/`--env-file` on the host |
| Deploy | GitHub Actions → ECR → SSM Run Command (no SSH) | manual `docker compose ... up -d --build` |

Domains: web `https://swat.wahyutrip.com`, API `https://api.swat.wahyutrip.com`, docs
`https://docs.swat.wahyutrip.com` (all → the shared Elastic IP). The docs site is a public, static
Docusaurus user manual (`revamp/apps/docs/`, image `swat-docs`) with no auth or session — served straight
from a small nginx container. The split-domain layout requires the session cookie to be
`Domain=.swat.wahyutrip.com`,
`SameSite=Lax`, `Secure`, with CORS pinned to the web origin — all config-driven
(`SESSION_COOKIE_DOMAIN`, `SESSION_COOKIE_SAMESITE`, `CORS_ORIGIN`) so on-prem same-origin defaults
(`Strict`, host-only) stay unchanged.

## AWS resources (account 732343865225, region ap-southeast-3)

SWAT owns this account outright. Until 2026-09 it was a **co-tenant** on a shared box in
account `659828096624` (deleted 2026-11-21), borrowing that box's Caddy and RDS instance;
nothing was migrated out — staging is rebuilt from the committed legacy dump. Every
account-scoped value now lives in **one** file, `infra/aws/staging.config.sh`.

- **EC2** `swat-staging` (t3.small, Amazon Linux 2023, Elastic IP), reached via SSM Run Command
  — no SSH key exists. Bootstrapped by `infra/aws/user-data.sh` (swap, Docker + compose,
  nightly-backup systemd timer — AL2023 ships no cron).
- **RDS** instance `swat-staging` (Postgres 15, db.t4g.micro, 20 GB, single-AZ, private),
  database `swat_staging`, app role `swat`, master `swatmaster`. Uses the custom parameter
  group **`swat-pg15` with `max_locks_per_transaction=2048`** — the partition migration
  creates ~676 child partitions in one transaction and fails on Postgres' default 64.
- **Availability zone** — the EC2 and the RDS are both pinned to `ap-southeast-3a`. Cross-AZ
  traffic is billed in both directions and the backend queries the DB on every request.
- **ECR** `swat-backend`, `swat-web`, `swat-docs` (tags `:staging` + `:<sha>`), lifecycle
  keeping the newest 5 images each. Repos are created by the provisioner (the deploy role is
  push-only — no `ecr:CreateRepository`). The registry is passed to `compose.staging.yml` as
  **`${ECR_REGISTRY}`** and is never hardcoded there.
- **S3** `swat-photos-staging-id` (photos/thumbnails), `swat-reports-staging-id` (exports and
  reseed artifacts 7-day TTL, nightly `pg_dump` backups under `backups/` 14-day) — accessed via
  the EC2 instance IAM role (no static keys); the backend's `S3_USE_INSTANCE_ROLE=true` selects
  this. The `-id` suffix is required: bucket names are global and the unsuffixed ones are still
  held by the closed account.
- **SSM Parameter Store** `/swat/staging/` — `BE_DOTENV_PRIVATE_KEY` (the dotenvx key the box
  uses to decrypt the baked backend env at boot), `RDS_HOST`, `RDS_MASTER_USERNAME`,
  `RDS_MASTER_PASSWORD`, `APP_DB_PASSWORD`, `BACKUP_BUCKET`.
- **IAM** OIDC role `swat-gha-deploy` (trust scoped to `repo:dlhsby/swat:ref:refs/heads/staging`
  and `:environment:staging`) with ECR push to all three repos, RDS
  `CreateDBSnapshot`/`DeleteDBSnapshot`/`DescribeDBSnapshots`, and SSM
  `SendCommand`/`GetCommandInvocation`. Instance role `swat-ec2` with S3 access to the two
  buckets, read on `/swat/staging/*`, and `AmazonSSMManagedInstanceCore`.
- **Guardrails** a zero-spend Budget (created before any resource) and CloudWatch alarms on RDS
  `FreeStorageSpace` + `FreeableMemory`. Deliberately absent, all for cost: NAT gateway,
  interface VPC endpoints (the S3 **gateway** endpoint is free and is used), Multi-AZ,
  Performance Insights, Enhanced Monitoring, Route 53 hosted zone.

## Secrets (dotenvx)

The runtime env for staging is committed **encrypted** at `infra/env/backend/.env.staging` and
`infra/env/web/.env.staging` (ciphertext is safe to commit; `.env.keys` is gitignored). The backend
image bakes the encrypted file and decrypts at boot via `dotenvx run` using
`DOTENV_PRIVATE_KEY_STAGING` materialized from SSM by `infra/seed-env-from-ssm.sh`. The web image
decrypts `NEXT_PUBLIC_*` at build time from a BuildKit secret (GitHub Environment secret
`WEB_DOTENV_PRIVATE_KEY`). There's a **single** `.env.staging`: the legacy seed reuses this same
encrypted `infra/env/backend/.env.staging` for its target `DATABASE_URL` (decrypted by
`seed-legacy-from-dump.sh`) — no separate plaintext seed env file.

## CI/CD

Three workflows (`.github/workflows/`): `quality.yml` (reusable suite), `pr-gate.yml` (required
`gate` check on PRs to main/staging), `deploy-staging.yml` (push to `staging` / manual dispatch).

**Release flow:** feature branch → **PR into `main`** (gate passes) → merge → **PR `main` → `staging`**
→ merge → the staging deploy pauses **once** for approval (the `staging` GitHub Environment has a
required reviewer), then builds + pushes to ECR, snapshots RDS, and deploys via SSM (materialize key,
`prisma migrate deploy`, recreate stack `--wait`, verify running image SHA, smoke-test both domains).
Pushing to `main` never deploys. The repo is temporarily **public** (org Actions billing) — safe
because all committed env is dotenvx ciphertext.

**Branch governance (repository ruleset, not classic protection):** `main` + `staging` are governed
by the ruleset `protected-branches (main + staging)` (active) — rules: `pull_request` (0 approvals,
thread-resolution required) · `required_status_checks` (**gate**) · `required_linear_history` ·
`non_fast_forward` · `deletion`. The **Repository Admin role is a bypass actor** (`bypass_mode:
always`), so a break-glass merge is sanctioned and **auditable** (Settings → Rules → Rule Insights)
rather than toggling enforcement on/off. Classic branch protection is intentionally removed — its
`enforce_admins` would otherwise override the ruleset bypass (most-restrictive wins). The deploy only
fires from the governed `staging` branch.

## Security hardening

- **OIDC trust is scoped** to `repo:dlhsby/swat:ref:refs/heads/staging` + `…:environment:staging`
  (not `…:*`) — fork/PR refs can never assume the deploy role even though the repo is public.
- **IAM least-privilege**: the deploy role's ECR push is scoped to the three `swat-*` repos
  (`swat-backend`, `swat-web`, `swat-docs`) by resource ARN — a new repo must be added to the
  `EcrPush` statement or the image push 403s; the role has no Describe/CreateRepository. `ssm:SendCommand`
  to the box + the `AWS-RunShellScript` document, `rds:CreateDBSnapshot` to the `dlhsby` instance +
  `swat-staging-predeploy-*` snapshots. The EC2 instance role's S3 access is scoped to the swat buckets.
- **GitHub Actions**: workflows default to `permissions: {}` (jobs opt in to `id-token`/`contents:read`
  only); third-party + first-party actions are **pinned to commit SHAs**; the SSM payload is built with
  `jq`; no secret transits the SSM document (the dotenvx key is fetched on-box via the instance role).
- **Containers** run **non-root** (`USER node`); base images are **digest-pinned**; the web dotenvx key
  is a BuildKit secret (never a layer).

## PostGIS prerequisite (managed Postgres)

The GPS/geography features (route **corridors**, `ST_DWithin` matching, corridor length) depend on
PostGIS **with SRID 4326 (WGS84) present in `spatial_ref_sys`**. The dev/CI/prod containers run the
`postgis/postgis:15-*` image whose `spatial_ref_sys` ships fully populated, so this is automatic there.

**On managed Postgres (the staging AWS RDS `swat-staging`) it is NOT automatic.** PostGIS can be enabled
(functions present) while `spatial_ref_sys` is left unpopulated — every `::geography` cast then fails
with `Cannot find SRID (4326) in spatial_ref_sys`, silently breaking corridor generation and GPS
matching. Migration `20260706000000_ensure_spatial_ref_sys_4326` inserts the row idempotently, **but
`spatial_ref_sys` is owned by the PostGIS extension**, so the app role (`swat`) usually lacks INSERT —
the migration then warns and skips (non-fatal, so it never blocks `migrate deploy`).

**This is handled at provisioning time, before the first deploy**, by
`infra/aws/bootstrap-db.sh`: it runs `CREATE EXTENSION postgis` and the SRID 4326 INSERT as the
**RDS master** (credentials read from SSM `/swat/staging/RDS_MASTER_*`), over SSM Run Command on
the box — RDS is private, and no tunnel is involved. It also verifies the result:

```bash
cd revamp/infra/aws && ./bootstrap-db.sh
# prints: postgis=<version>  srid4326=1  max_locks=2048  owner=swat
```

**On-prem production:** verify `SELECT count(*) FROM spatial_ref_sys WHERE srid=4326` returns 1 after
`CREATE EXTENSION postgis` before go-live; if the prod Postgres image is the `postgis/postgis` one this
is already satisfied.

## First-run data

Staging holds the **real legacy master data, no transactions** — users, roles/permissions (reconciled
to the current permission catalog), sites, routes, vehicles, drivers, schedule + trip templates (934
sites, 4,897 routes, 1,463 vehicles, …). Transaction tables are **empty by design**
(`transaction_day = haul = trip = 0`); real legacy transactions are imported later. This is what keeps
`/scheduling` from showing fabricated `DONE` days — it replaced the old synthetic demo seed.

`migrate:legacy` is a live-MySQL→Postgres ETL, so `infra/seed-legacy-from-dump.sh` replays the
committed `legacy/web/db_backup/dkp_swat_*.sql` dump through a throwaway `mysql:5.7`, runs the master
phase (`--force-reset` truncates + reloads master), and truncates the transaction tables — a clean,
transaction-free master. It pulls the target `DATABASE_URL` from the encrypted
`infra/env/backend/.env.staging` (or `STAGING_DATABASE_URL` for a laptop tunnel, since RDS is private),
and sets `LEGACY_DB_*` itself. **Later**, import real transactions with `--with-transactions`.
`seed:demo` remains for synthetic data. See [`../revamp/infra/aws/README.md`](../revamp/infra/aws/README.md).

## Cost & the office-hours schedule

Staging runs **09:00–16:00 WIB on weekdays and is stopped otherwise** — it is only useful while
someone is testing it. Installed by `infra/aws/provision-schedule.sh` using EventBridge
Scheduler *universal targets* (direct EC2/RDS API calls; no Lambda, and the free tier covers
the ~120 invocations a month).

```
08:45 RDS start · 09:00 EC2 start   — Mon-Fri only
16:00 EC2 stop  · 16:10 RDS stop   — EVERY day (safety net)   (Asia/Jakarta)
```

RDS leads on the way up and trails on the way down so the backend never boots against a
database that is still starting. Nothing needs redeploying after a restart: every service is
`restart: unless-stopped` and docker is systemd-enabled, so the stack returns on boot.
Pause with `./provision-schedule.sh --disable`.

| Item | Rate (Jakarta on-demand) | Always-on | Scheduled 7h × weekdays |
| --- | --- | --- | --- |
| EC2 t3.small | $0.0264/hr | $19.27 | **$4.07** |
| RDS db.t4g.micro Single-AZ | $0.0250/hr | $18.25 | **$3.85** |
| Public IPv4 × 1 | $0.005/hr | $3.65 | $3.65 |
| EBS gp3 root, 30 GB | $0.096/GB-mo | $2.88 | $2.88 |
| RDS gp3 storage, 20 GB | $0.138/GB-mo | $2.76 | $2.76 |
| S3 · ECR · data transfer | — | ~$0.86 | ~$0.86 |
| **Total** | | **~$47.70** | **~$18.10** |

The account is on the credit-based **FREE plan** (expires 2027-03-02), so actual spend is $0
until the credits run out; the table is what it costs afterwards.

Two things that do **not** stop with the schedule: the Elastic IP and both storage volumes.
That is the ~$9.30/month floor. `t3.micro` was considered and rejected — once scheduled it
saves only $2.81/month, and the box uses ~660 MB of 1909 MB, so ~950 MB usable would push
report exports into swap during UAT.

**The EBS root volume cannot be shrunk** (EBS grows only, like RDS storage). Going 30 GB →
20 GB would mean rebuilding the volume or the instance for ~$0.96/month; not worth it. The box
is stateless, though — all state is in RDS/S3/SSM — so re-provisioning with
`SWAT_ROOT_VOLUME_GB=20` is a clean path if ever wanted (it re-issues the TLS certs).

## Refreshing staging with a newer legacy dump

The usual reason to reseed is a fresh `mysqldump` from the live legacy system.

1. Replace the contents of `legacy/db/dump/` with the new dump (same file layout —
   `_structure.sql.gz` plus one `*.sql.gz` per table).
2. **Make sure the stack is running.** The reseed drives the box over SSM and loads into RDS,
   so outside 09:00–16:00 both are stopped and it will fail. Either run it inside the window or
   start them first:
   ```bash
   aws ec2 start-instances --instance-ids <id> --profile dlhsby-swat-staging-cli --region ap-southeast-3
   aws rds start-db-instance --db-instance-identifier swat-staging --profile dlhsby-swat-staging-cli --region ap-southeast-3
   ```
3. Build and restore in one step, windowed to the current year:
   ```bash
   cd revamp
   export SUPERADMIN_PASSWORD="$(pnpm dlx @dotenvx/dotenvx get SUPERADMIN_PASSWORD -f infra/env/backend/.env.staging)"
   export GOOGLE_MAPS_SERVER_KEY="$(pnpm dlx @dotenvx/dotenvx get GOOGLE_MAPS_SERVER_KEY -f infra/env/backend/.env.staging)"
   bash infra/reseed-via-ssm.sh --since-year=2026
   ```
   Both variables are required: the ETL refuses to invent a superadmin password, and without
   the Maps key the route corridors are straight lines instead of road-snapped.
4. The restore **TRUNCATEs first and that TRUNCATE commits separately** from the load, so a
   failure leaves the database empty rather than half-loaded. It is destructive by design —
   never point it at production without `--confirm-production`.
5. It finishes by printing row counts and asserting SRID 4326 survived. If that assertion
   fails, stop: every `::geography` cast is broken even though `/health` will still say ok.

Expect roughly 25–30 minutes end to end, most of it the local ETL.

## Capacity & coupling notes

- The box is a t3.small with a 2 GB swapfile (`infra/aws/user-data.sh`); the per-container
  `mem_limit`s in `compose.staging.yml` keep the whole stack inside it. It used to be a t3.micro
  shared with another project — sole tenancy is what bought the headroom.
- **SWAT owns its Caddy.** `infra/Caddyfile.staging` is mounted straight into the `caddy` service
  and binds 80/443. The old arrangement — shipping those blocks as a drop-in merged into a
  co-tenant's Caddyfile, then restarting that project's container — is gone. TLS certs live in the
  `caddy-data` volume; the deploy prunes images but never volumes, which is what stops every
  release from re-requesting certs and hitting Let's Encrypt rate limits.
- **Cost floor.** One public IPv4 (~$3.60/mo) is unavoidable; everything else sits inside the free
  allowances. Deliberately absent: NAT gateway, interface VPC endpoints (the S3 *gateway* endpoint
  is free and is used), Multi-AZ, Performance Insights, Enhanced Monitoring, Route 53 hosted zone.
  ECR keeps only the newest 5 images per repo and the deploy prunes all but the newest pre-deploy
  RDS snapshot — both were unbounded before and would have left the free tier on their own.
