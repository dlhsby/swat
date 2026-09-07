# SWAT staging on AWS

Staging runs in **SWAT's own AWS account** (`732343865225`, `ap-southeast-3`);
**on-prem production stays platform-agnostic** via the unchanged
`infra/docker-compose.prod.yml`.

> **History.** Until 2026-09 SWAT was a *co-tenant* on a shared `dlhsby` EC2 box in
> account `659828096624` — sharing that box's Caddy and RDS instance with a sibling
> project. That account was closed and is deleted on 2026-11-21. SWAT now owns every
> resource it uses, so the Caddy drop-in merge, the shared RDS and the cross-project
> `/sekar/staging/*` SSM parameters are all gone. Nothing was migrated out of the old
> account: staging is rebuilt from the committed legacy dump (see _First-run data_).

| Concern        | Staging (AWS)                                                              |
| -------------- | -------------------------------------------------------------------------- |
| Compute        | EC2 `swat-staging` (t3.small, Amazon Linux 2023, Elastic IP), SSM-only access |
| TLS edge       | **SWAT's own Caddy** (`caddy` service in `compose.staging.yml`)              |
| Database       | RDS `swat-staging` (PG 15, db.t4g.micro, 20 GB), database `swat_staging`, SSL |
| Object storage | S3 `swat-photos-staging-id` + `swat-reports-staging-id`, via the instance role |
| Registry       | ECR `swat-backend`, `swat-web`, `swat-docs`                                 |
| Secrets        | dotenvx-encrypted env in the repo + the private key in SSM / a GitHub secret |
| Deploy         | GitHub OIDC → ECR → SSM Run Command (no SSH)                                |
| Uptime         | **09:00–16:00 WIB, Mon–Fri**, stopped otherwise (`provision-schedule.sh`)   |

Domains: web `https://swat.wahyutrip.com`, API `https://api.swat.wahyutrip.com`,
docs `https://docs.swat.wahyutrip.com`, database console
`https://adminer.swat.wahyutrip.com` (Caddy basic auth, user `swat`; password in SSM
`/swat/staging/ADMINER_BASIC_AUTH_PASSWORD`).

**Everything account-scoped lives in [`staging.config.sh`](staging.config.sh)** — one
file, overridable from the environment. Scattering ids across scripts is what made the
last account move slow.

## One-time setup

```bash
cd revamp/infra/aws
aws login --profile dlhsby-swat-staging   # root browser session — used ONCE, below
./bootstrap-cli-user.sh                   # enables the opt-in region + creates the IAM user
./provision-staging.sh                    # idempotent; runs the three provisioners in order
./bootstrap-db.sh                         # app role + database + PostGIS, as the RDS master
```

**Root is used for exactly one thing**: `bootstrap-cli-user.sh` creates the
`dlhsby-swat-staging-cli` IAM user, writes its profile, and hands off. Every other
script refuses to run as root. Root credentials can't be scoped or rotated
independently, so they have no place in day-to-day work — enable MFA on root and leave
it alone.

`provision-staging.sh` prints the remaining manual steps (DNS, env re-encryption, the
SSM key, the GitHub Variables). The pieces:

| Script | Creates |
| --- | --- |
| `bootstrap-cli-user.sh` | (root, once) the opt-in region, the `dlhsby-swat-staging-cli` IAM user + access key + local profile |
| `provision-registry-iam.sh` | zero-spend budget + SNS topic, ECR ×3 (+ lifecycle), S3 ×2 (+ lifecycle, encryption, public-access block), the EC2 instance role/profile, the GitHub OIDC provider, the `swat-gha-deploy` role |
| `provision-network-compute.sh` | security groups, S3 gateway endpoint, the EC2 instance (`user-data.sh`), the Elastic IP |
| `provision-data.sh` | RDS parameter group, DB subnet group, the RDS instance, SSM parameters, CloudWatch alarms |
| `bootstrap-db.sh` | the `swat` role, `swat_staging`, PostGIS, SRID 4326 — over SSM, as the master |
| `user-data.sh` | box bootstrap: swap, Docker + compose plugin, log rotation, the nightly backup timer |

### Runtime env (dotenvx)

Only the **account-scoped** values change on an account move. Keep the existing
keypair and set them in place, so nothing else needs re-encrypting and the private key
already in `.env.keys` stays valid:

```bash
cd revamp
pnpm dlx @dotenvx/dotenvx set DATABASE_URL '<from bootstrap-db.sh>' -f infra/env/backend/.env.staging --encrypt
pnpm dlx @dotenvx/dotenvx set S3_BUCKET swat-photos-staging-id      -f infra/env/backend/.env.staging --encrypt
pnpm dlx @dotenvx/dotenvx set S3_REPORTS_BUCKET swat-reports-staging-id -f infra/env/backend/.env.staging --encrypt
```

`infra/env/web/.env.staging` needs **no change** (the domains are unchanged). Push the
backend key to SSM and keep the web key as the GitHub Environment secret:

```bash
aws ssm put-parameter --profile dlhsby-swat-staging-cli --region ap-southeast-3 \
  --type SecureString --overwrite --name /swat/staging/BE_DOTENV_PRIVATE_KEY \
  --value "$(grep DOTENV_PRIVATE_KEY_STAGING infra/env/backend/.env.keys | cut -d= -f2- | tr -d '"')"
```

Commit the re-encrypted `.env.staging` (ciphertext is safe). `.env.keys` is gitignored —
never commit it.

### GitHub

Repo Variables: `AWS_REGION`, `AWS_ROLE_ARN`, **`ECR_REGISTRY`**, `ECR_BACKEND`,
`ECR_WEB`, `ECR_DOCS`, `EC2_INSTANCE_ID`, `RDS_INSTANCE_ID` — exact values are printed
by `provision-staging.sh`. Environment secret `WEB_DOTENV_PRIVATE_KEY` on the `staging`
Environment (unchanged across the account move).

Branch protection on `main` and `staging` requires the **`gate`** check from
`pr-gate.yml`, linear history, no force-push/deletion. The `staging` Environment has a
**Required reviewer**, which is the single approval per release.

## Release / deploy flow

Pushing to `main` never deploys (saves Actions minutes).

1. Feature branch → **PR into `main`** → the `gate` check must pass → merge.
2. When `main` is UAT-ready → **PR `main` → `staging`** and merge (or _Run workflow_).
3. `deploy-staging.yml` re-runs the quality gate, pauses **once** at `build-push` for
   the `staging` Environment approval, then builds and pushes all three images,
   snapshots RDS (pruning all but the newest pre-deploy snapshot), and via SSM writes
   the compose file + Caddyfile, materializes the dotenvx key, runs
   `prisma migrate deploy`, recreates the stack `--wait`, verifies the running image
   SHA, and smoke-tests all three domains.

## First-run data (legacy seed)

Staging is seeded from the **committed legacy MySQL dump** (`legacy/db/dump/`) — real
master data plus a windowed slice of real transactional history. Nothing comes from the
old AWS account.

**Preferred: tunnel-free (`reseed-via-ssm.sh`).** RDS is `PubliclyAccessible=false` and
an SSM *port-forward* tunnel is fragile (it dies on IPv6/NAT64 networks), while the box
is too small to host the ETL's ephemeral MySQL. So the work splits: build the artifact
locally where there is RAM, restore it on the box where the DB is local.

```bash
cd revamp
bash infra/reseed-via-ssm.sh --since-year=2026
```

That runs `build-seed-dump.sh` (throwaway MySQL 5.7 + PostGIS 15 → `migrate:legacy
--force-reset --include-transactions --since-year=2026` → `rollup:backfill` → a
data-only `pg_dump`), uploads it to `s3://swat-reports-staging-id/seed/`, then restores
it in-VPC via SSM Run Command as the **RDS master** (superuser-ish rights are needed for
the TRUNCATE and to set `session_replication_role = replica`). Masters load in full;
only the five transactional tables + `DisposalPermit` are windowed.

Set `GOOGLE_MAPS_SERVER_KEY` in the build shell so route corridors are road-snapped into
the artifact.

**The schema must already match the artifact's migrations** — deploy first, then reseed.

Watch progress from anywhere (it reads the DB, not a log):

```bash
STAGING_DATABASE_URL=... bash infra/reseed-progress.sh staging --watch
```

> Don't reach for `prisma migrate reset` to wipe first: Prisma 7 has no `--skip-seed`
> (so it would re-run the demo seed), and `DROP SCHEMA … CASCADE` overflows
> `max_locks_per_transaction` on the partitioned tables.

A **fresh dump later** can be applied as a delta — `migrate:delta-sync` for masters, then
`--transactions-only --resume`, then `rollup:backfill -- <from> <to>`. See
`apps/backend/scripts/migration/README.md` §"Incremental re-dump".

## Office-hours schedule

Staging runs **09:00–16:00 WIB on weekdays** and is stopped the rest of the time, which takes
the stack from ~$47.70 to ~$18.10 a month.

```bash
cd revamp/infra/aws
./provision-schedule.sh             # install / update
./provision-schedule.sh --disable   # pause (runs 24/7 again)
./provision-schedule.sh --enable    # resume
```

```
08:45 RDS start · 09:00 EC2 start   — Mon-Fri only
16:00 EC2 stop  · 16:10 RDS stop   — EVERY day (safety net)   (Asia/Jakarta)
```

- **The site is DOWN outside the window** — that is intended, tell UAT users.
- **Nothing needs redeploying after a restart.** Every service is `restart: unless-stopped`
  and docker is systemd-enabled, so the stack returns on boot.
- **Storage still bills while stopped** (Elastic IP + EBS + RDS storage): ~$9.30/month floor.
- AWS auto-starts an RDS instance stopped for 7 days. The daily stop keeps resetting that
  clock — but `--disable` while the DB is stopped will let it fire.
- Anything that drives the box or the database — a **reseed**, a deploy, `psql` over SSM —
  needs both running. Outside the window, start them first (see below).

## Refreshing with a newer legacy dump

1. Replace `legacy/db/dump/` with the new dump (`_structure.sql.gz` + one `*.sql.gz` per table).
2. If outside 09:00–16:00, start the stack first:
   ```bash
   aws ec2 start-instances --instance-ids "$(aws ec2 describe-instances \
     --filters Name=tag:Name,Values=swat-staging Name=instance-state-name,Values=stopped \
     --query 'Reservations[0].Instances[0].InstanceId' --output text)" \
     --profile dlhsby-swat-staging-cli --region ap-southeast-3
   aws rds start-db-instance --db-instance-identifier swat-staging \
     --profile dlhsby-swat-staging-cli --region ap-southeast-3
   ```
   Wait for the RDS to report `available` before step 3.
3. Build + restore, windowed to the current year:
   ```bash
   cd revamp
   export SUPERADMIN_PASSWORD="$(pnpm dlx @dotenvx/dotenvx get SUPERADMIN_PASSWORD -f infra/env/backend/.env.staging)"
   export GOOGLE_MAPS_SERVER_KEY="$(pnpm dlx @dotenvx/dotenvx get GOOGLE_MAPS_SERVER_KEY -f infra/env/backend/.env.staging)"
   bash infra/reseed-via-ssm.sh --since-year=2026
   ```
   Both are required: the ETL refuses to invent a superadmin password, and without the Maps
   key corridors are straight lines rather than road-snapped. Needs local Docker and ~4 GB free.
4. It prints row counts and asserts SRID 4326 survived. **If that assertion fails, stop** —
   every `::geography` cast is broken even though `/health` still reports ok.

Roughly 25–30 minutes end to end, most of it the local ETL. The restore TRUNCATEs first, and
that TRUNCATE commits separately from the load, so a failure leaves the database empty rather
than half-loaded — destructive by design.

## Notes / gotchas

- **`max_locks_per_transaction=2048`** — the transactional tables are monthly
  RANGE-partitioned (~676 child partitions). Creating them in one migration transaction
  needs far more lock slots than Postgres' default 64, so the RDS instance uses the
  custom parameter group `swat-pg15`. Without it the **first** `prisma migrate deploy`
  fails with "out of shared memory / max_locks_per_transaction".
- **PostGIS on RDS** — `CREATE EXTENSION postgis` needs the master role, and RDS leaves
  `spatial_ref_sys` unpopulated, which breaks every `::geography` cast with
  `Cannot find SRID (4326) in spatial_ref_sys`. `bootstrap-db.sh` does both.
- **Registry is never hardcoded** — `compose.staging.yml` interpolates `${ECR_REGISTRY}`.
  Pinning an account id there is what broke the sibling project's account migration
  (images pushed to the new account, pulled from the closed one: `no basic auth
  credentials`).
- **Single AZ** — the EC2 and the RDS are both pinned to `ap-southeast-3a`. Cross-AZ
  traffic is billed in both directions and the backend queries the DB on every request.
- **Split-domain cookies** — the backend sets the session cookie with
  `Domain=.swat.wahyutrip.com`, `SameSite=Lax`, `Secure`, and CORS is pinned to
  `https://swat.wahyutrip.com`, because web and API are on different subdomains. On-prem
  prod keeps the same-origin defaults.
- **TLS certs live in the `caddy-data` volume.** The deploy prunes images, never volumes
  — pruning that volume would re-request certs every release and trip Let's Encrypt rate
  limits.
- **Backups** — RDS automated retention is 1 day and cross-account snapshot restore is
  blocked, so the real recovery path is the nightly `pg_dump` to
  `s3://swat-reports-staging-id/backups/` (14-day lifecycle), run by a **systemd timer**
  — Amazon Linux 2023 ships no cron.
- **Cost floor** — one public IPv4 (~$3.60/mo) is unavoidable; everything else is inside
  the free allowances. No NAT gateway, no interface VPC endpoints, no Multi-AZ, no
  Performance Insights, no Enhanced Monitoring, no Route 53 hosted zone.
