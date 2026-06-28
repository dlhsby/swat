# SWAT staging on AWS (reuses the sekar pattern)

Staging runs on AWS; **on-prem production stays platform-agnostic** via the
unchanged `infra/docker-compose.prod.yml`. SWAT is a **co-tenant** on the shared
`dlhsby` EC2 host alongside sekar — same box, same Caddy, same RDS instance.

| Concern        | Staging (AWS)                                                        | Reused from          |
| -------------- | -------------------------------------------------------------------- | -------------------- |
| Compute        | EC2 `i-08edccdc966c0985e` (t3.micro, EIP `16.79.124.63`)             | sekar box            |
| TLS edge       | the box's Caddy (sekar-owned); SWAT blocks merged in at deploy       | sekar                |
| Database       | RDS instance `dlhsby` (PG 15), SWAT database `swat_staging`, SSL     | shared instance      |
| Object storage | S3 `swat-photos-staging` + `swat-reports-staging`, EC2 instance role | new                  |
| Registry       | ECR `swat-backend`, `swat-web`                                       | account 659828096624 |
| Secrets        | dotenvx-encrypted env in repo + key in SSM / GitHub secret           | sekar pattern        |
| Deploy         | GitHub OIDC → ECR → SSM Run Command (no SSH)                         | sekar workflow       |

Domains: web `https://swat.wahyutrip.com`, API `https://api.swat.wahyutrip.com`.

## One-time setup

1. **Provision AWS resources** (idempotent; uses the `sekar` profile):

   ```bash
   cd revamp/infra/aws && ./provision-staging.sh
   ```

   Then do the printed MANUAL steps: RDS rename (if needed), create the `dlhsby`
   database + `swat` role, DNS A records, GitHub Variables/secret.

2. **Encrypt the runtime env** (dotenvx; keys never leave your machine / SSM):

   ```bash
   cd swat
   cp infra/env/backend/.env.staging.example infra/env/backend/.env.staging   # fill REAL values
   cp infra/env/web/.env.staging.example     infra/env/web/.env.staging        # fill REAL values
   pnpm dlx @dotenvx/dotenvx encrypt -f infra/env/backend/.env.staging
   pnpm dlx @dotenvx/dotenvx encrypt -f infra/env/web/.env.staging
   ```
   - Push the **backend** key to SSM:
     ```bash
     aws ssm put-parameter --profile sekar --region ap-southeast-3 --type SecureString \
       --name /swat/staging/BE_DOTENV_PRIVATE_KEY \
       --value "$(grep DOTENV_PRIVATE_KEY_STAGING infra/env/backend/.env.keys | cut -d= -f2- | tr -d '\"')"
     ```
   - Add the **web** key (`DOTENV_PRIVATE_KEY_STAGING` from `infra/env/web/.env.keys`)
     as the GitHub **staging** Environment secret `WEB_DOTENV_PRIVATE_KEY`.
   - Commit the now-encrypted `infra/env/{backend,web}/.env.staging` (ciphertext is
     safe). `.env.keys` is gitignored — never commit it.

3. **Set GitHub repo Variables** (Actions → Variables): `AWS_REGION`, `AWS_ROLE_ARN`,
   `ECR_BACKEND`, `ECR_WEB`, `EC2_INSTANCE_ID`, `RDS_INSTANCE_ID` — values in the
   `deploy-staging.yml` header.

4. **Branches, protection & approval** (mirrors sekar):
   - Create a long-lived `staging` branch off `main`.
   - Branch protection on **both** `main` and `staging`: require a PR, require the
     status check **`gate`** (from `pr-gate.yml`), enforce linear history, block
     force-push/deletion.
   - Create a **`staging` GitHub Environment** with a **Required reviewer** (repo
     owner). The deploy halts at `build-push` until approved.
   - Repo is currently **public** (temporary — `dlhsby` org Actions billing); all
     committed env files are dotenvx ciphertext, so this is safe. `.env.keys` stays
     gitignored.

## Release / deploy flow

Pushing to `main` never deploys (saves Actions minutes). The flow:

1. Feature branch → **PR into `main`** → `pr-gate` runs lint/typecheck/test/build;
   the `gate` check must pass → merge.
2. When `main` is UAT-ready → open a **PR `main` → `staging`** and merge it (or run
   the **Deploy staging (AWS)** workflow via _Run workflow_).
3. The push to `staging` triggers `deploy-staging.yml`: it re-runs the quality gate
   (the reusable `quality.yml`), then pauses **once** at `build-push` for `staging`
   Environment approval — **one approval per release**. The `deploy` job is not
   environment-scoped (only repo Variables + OIDC), so on approval it builds + pushes
   both images to ECR, snapshots RDS, and via SSM merges SWAT's Caddy blocks,
   materializes the dotenvx key, runs `prisma migrate deploy`, recreates the stack
   `--wait`, verifies the running image SHA, and smoke-tests both domains — straight
   through.

## First-run data (legacy master seed)

Staging is seeded with the **real legacy SWAT master data** — users,
roles/permissions (reconciled to the current app's permission catalog), sites,
routes, vehicles, drivers, schedule + trip templates — and **no transactions**
(real transactional history is imported later). This replaces the old synthetic
demo seed, which manufactured a year of dummy `DONE` scheduling days.

The migrator (`migrate:legacy`) needs `ts-node` (omitted from the slim runtime
image) plus a legacy MySQL source. Since we run no legacy MySQL in the cloud, the
committed dump (`legacy/web/db_backup/`) is replayed through a throwaway MySQL by
`infra/seed-legacy-from-dump.sh`. Run it from a **full checkout** with Docker. The helper is
**self-cleaning** — it `--force-reset`s the master tables AND truncates the transaction tables —
so it's safe to re-run on a dirty staging (it clears the old synthetic `DONE` days).

**Reaching the private RDS.** Staging RDS is `PubliclyAccessible=false`. From a laptop, open an
SSM port-forward through the box (needs `session-manager-plugin`):

```bash
aws ssm start-session --profile sekar --region ap-southeast-3 \
  --target i-08edccdc966c0985e \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters host=dlhsby.cvuoeguwo5dg.ap-southeast-3.rds.amazonaws.com,portNumber=5432,localPortNumber=15433
```

Use local port **15433** — NOT 5432 (local swat-postgres) or 15432 (local sekar-postgres). Then:

```bash
cd swat
# Decrypt the password: pnpm dlx @dotenvx/dotenvx get DATABASE_URL -f infra/env/backend/.env.staging
# Master + users only, NO transactions. Keep &uselibpqcompat=true (pg 8.16 vs the RDS CA chain):
STAGING_DATABASE_URL='postgresql://swat:PASS@127.0.0.1:15433/swat_staging?schema=public&sslmode=require&uselibpqcompat=true' \
  bash infra/seed-legacy-from-dump.sh

# Later — import the real legacy transactional history:
STAGING_DATABASE_URL=... bash infra/seed-legacy-from-dump.sh --with-transactions
```

(Or run the helper **on the box**, where RDS is directly reachable — but it spins up MySQL, so
mind the t3.micro's memory.) The helper decrypts the target `DATABASE_URL` from the encrypted
`infra/env/backend/.env.staging` when `STAGING_DATABASE_URL` is unset, so there's no separate seed
env file. To seed from a live legacy MySQL instead of the dump, `export DATABASE_URL` +
`LEGACY_DB_*` yourself and run `pnpm --filter @swat/backend run seed:staging`.

> Don't reach for `prisma migrate reset` to wipe first: Prisma 7 has no `--skip-seed` (so it would
> re-run the demo seed), and `DROP SCHEMA … CASCADE` overflows `max_locks_per_transaction` on the
> partitioned tables. The helper's `--force-reset` + TRUNCATE is the supported clean reseed.

Migrations themselves need no full deps and are applied automatically on every deploy
(`prisma migrate deploy` from the runtime image).

## Notes / gotchas

- **Shared Caddy coupling**: SWAT's two blocks live between `# === SWAT-BEGIN`/`-END`
  markers in `infra/Caddyfile.staging` and are merged into the box's served Caddyfile
  (`~/sekar/infra/Caddyfile`) by the deploy, which restarts `sekar-caddy` (inode swap).
- **Split-domain cookies**: the backend sets the session cookie with
  `Domain=.swat.wahyutrip.com`, `SameSite=Lax`, `Secure` (from the encrypted env), and
  CORS is pinned to `https://swat.wahyutrip.com` — required because web and API are on
  different subdomains. On-prem prod keeps the same-origin defaults unchanged.
- **Capacity**: t3.micro is tight even with KPI gone — add a swapfile on the box and
  keep the per-container `mem_limit`s in `compose.staging.yml`.
- **Legacy seed**: staging is seeded with real legacy master data + users (no
  transactions) via `infra/seed-legacy-from-dump.sh` (replays the committed dump through an
  ephemeral MySQL) — see _First-run data_ above. There's a **single** `.env.staging`: the
  encrypted, committed `infra/env/backend/.env.staging` (runtime). The seed reuses it for the
  target `DATABASE_URL` (decrypted), and gets `LEGACY_DB_*` from the throwaway MySQL — no separate
  seed env file, nothing written to disk.
