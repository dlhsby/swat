# 15 — Deployment

Authoritative deployment design for SWAT. **Staging runs on AWS; production is on-premise and
platform-agnostic.** The same container images run in both places — every environment difference is
driven by config/env, never baked in. The operational runbook (exact commands, one-time setup) lives
beside the code at [`../revamp/infra/aws/README.md`](../revamp/infra/aws/README.md).

The pattern is shared with the sibling **sekar** project, which co-tenants the same AWS box.

## Environments

| | Staging | Production |
|---|---|---|
| Where | AWS (shared `dlhsby` EC2 host) | On-premise / any Docker host |
| Stack file | `infra/compose.staging.yml` (backend + web + redis) | `infra/docker-compose.prod.yml` (self-contained: +postgres +minio +nginx) |
| Database | AWS RDS instance `dlhsby`, database `swat_staging`, SSL | bundled `postgres:15` |
| Object storage | AWS S3 (`swat-photos-staging`, `swat-reports-staging`) via EC2 instance role | bundled MinIO |
| TLS edge | shared Caddy on the box (Let's Encrypt) | bundled nginx |
| Secrets | dotenvx-encrypted `infra/env/{backend,web}/.env.staging` + key in SSM/GitHub | `.env`/`--env-file` on the host |
| Deploy | GitHub Actions → ECR → SSM Run Command (no SSH) | manual `docker compose ... up -d --build` |

Domains: web `https://swat.wahyutrip.com`, API `https://api.swat.wahyutrip.com` (both → the shared
Elastic IP). The split-domain layout requires the session cookie to be `Domain=.swat.wahyutrip.com`,
`SameSite=Lax`, `Secure`, with CORS pinned to the web origin — all config-driven
(`SESSION_COOKIE_DOMAIN`, `SESSION_COOKIE_SAMESITE`, `CORS_ORIGIN`) so on-prem same-origin defaults
(`Strict`, host-only) stay unchanged.

## AWS resources (account 659828096624, region ap-southeast-3)

- **EC2** `i-08edccdc966c0985e` (shared box, Elastic IP 16.79.124.63), reached via SSM Run Command.
- **RDS** instance `dlhsby` (Postgres 15) — SWAT uses database `swat_staging`, role `swat`.
- **ECR** `swat-backend`, `swat-web` (tags `:staging` + `:<sha>`).
- **S3** `swat-photos-staging` (photos/thumbnails), `swat-reports-staging` (7-day TTL) — accessed via
  the EC2 instance IAM role (no static keys); the backend's `S3_USE_INSTANCE_ROLE=true` selects this.
- **SSM Parameter Store** `/swat/staging/BE_DOTENV_PRIVATE_KEY` (SecureString) — the dotenvx key the
  box uses to decrypt the baked backend env at boot.
- **IAM** OIDC role `swat-gha-deploy` (trust `repo:dlhsby/swat:*`) with ECR push, RDS `CreateDBSnapshot`,
  and SSM `SendCommand`/`GetCommandInvocation`.

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
- **IAM least-privilege**: the deploy role's ECR push is scoped to the two `swat-*` repos, `ssm:SendCommand`
  to the box + the `AWS-RunShellScript` document, `rds:CreateDBSnapshot` to the `dlhsby` instance +
  `swat-staging-predeploy-*` snapshots. The EC2 instance role's S3 access is scoped to the swat buckets.
- **GitHub Actions**: workflows default to `permissions: {}` (jobs opt in to `id-token`/`contents:read`
  only); third-party + first-party actions are **pinned to commit SHAs**; the SSM payload is built with
  `jq`; no secret transits the SSM document (the dotenvx key is fetched on-box via the instance role).
- **Containers** run **non-root** (`USER node`); base images are **digest-pinned**; the web dotenvx key
  is a BuildKit secret (never a layer).

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

## Capacity & coupling notes

- The shared box is a t3.micro; SWAT's per-container `mem_limit`s + a host swapfile keep it within
  free tier alongside sekar.
- The box's Caddy is sekar-owned; SWAT's two route blocks (`infra/Caddyfile.staging`, between
  `SWAT-BEGIN`/`SWAT-END` markers) are merged into the served Caddyfile by the deploy, which restarts
  the caddy container (bind-mount inode swap).
