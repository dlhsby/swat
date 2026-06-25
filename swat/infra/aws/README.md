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
   cd swat/infra/aws && ./provision-staging.sh
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

## First-run data (demo seed)

The demo seed is synthetic (no legacy MySQL), idempotent, and auto-runs the rollup
backfill. It uses `ts-node`, which the slim runtime image omits — so run it from a
**full checkout** (where `infra/env/backend/.env.keys` exists) against the staging
DB. The staging RDS security group must admit your source IP on 5432 (or run from
the box / a bastion that it already admits):

```bash
cd swat
dotenvx run -f infra/env/backend/.env.staging -- pnpm --filter @swat/backend run seed:demo
```

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
- **Legacy seed** (`seed:staging`, real MySQL `dkp_swat`) is NOT wired here; staging
  uses the demo seed. The gitignored `apps/backend/.env.staging` (legacy migration
  config) is a different file from the encrypted `infra/env/backend/.env.staging`.
