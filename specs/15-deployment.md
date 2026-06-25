# 15 — Deployment

Authoritative deployment design for SWAT. **Staging runs on AWS; production is on-premise and
platform-agnostic.** The same container images run in both places — every environment difference is
driven by config/env, never baked in. The operational runbook (exact commands, one-time setup) lives
beside the code at [`../swat/infra/aws/README.md`](../swat/infra/aws/README.md).

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
`WEB_DOTENV_PRIVATE_KEY`). This is distinct from the legacy-seed `apps/backend/.env.staging`
(plaintext, gitignored, used only by `seed:staging`).

## CI/CD

Three workflows (`.github/workflows/`): `quality.yml` (reusable suite), `pr-gate.yml` (required
`gate` check on PRs to main/staging), `deploy-staging.yml` (push to `staging` / manual dispatch).

**Release flow:** feature branch → **PR into `main`** (gate passes) → merge → **PR `main` → `staging`**
→ merge → the staging deploy pauses **once** for approval (the `staging` GitHub Environment has a
required reviewer), then builds + pushes to ECR, snapshots RDS, and deploys via SSM (materialize key,
`prisma migrate deploy`, recreate stack `--wait`, verify running image SHA, smoke-test both domains).
Pushing to `main` never deploys. The repo is temporarily **public** (org Actions billing) — safe
because all committed env is dotenvx ciphertext.

## First-run data

Staging is seeded with the synthetic **demo** track (`seed:demo`, no legacy MySQL); idempotent and
auto-runs the rollup backfill. Run it from a full checkout against the staging `DATABASE_URL` (the
slim runtime image omits `ts-node`). The legacy migration (`seed:staging`) is not wired for staging.

## Capacity & coupling notes

- The shared box is a t3.micro; SWAT's per-container `mem_limit`s + a host swapfile keep it within
  free tier alongside sekar.
- The box's Caddy is sekar-owned; SWAT's two route blocks (`infra/Caddyfile.staging`, between
  `SWAT-BEGIN`/`SWAT-END` markers) are merged into the served Caddyfile by the deploy, which restarts
  the caddy container (bind-mount inode swap).
