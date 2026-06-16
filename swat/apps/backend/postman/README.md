# SWAT API — Postman collection

Importable Postman collection + environment for manual testing of the SWAT
backend. **Kept 1:1 with the Swagger spec at `/api/docs`** — every documented
operation has a request. Folders:

- **System** — unauthenticated health checks
- **Auth** — cookie login + native-client bearer tokens (get/refresh/logout)
- **Users & Access / Geography / Waste Sources / Fleet / Personnel / Scheduling** —
  RBAC + master data + schedule/trip templates + disposal permits (kitir)
- **Transactions** — transaction days, haul assignments (depart/return), trips
- **Levies & Refuel** — retribusi CRUD + the refuel log
- **Maintenance & Inspections** — maintenance records (+ approve) + vehicle inspections
- **Monitoring** — analytics endpoints (KPI, tonnage, fuel, routes, levy)
- **Reports** — async Excel/PDF generate → poll job → download
- **Weighbridge (TPA Integration)** — resolve-kitir, post-weighing, weighings, Excel import
- **Service Accounts (Admin)** — machine principals/API keys + API audit logs
- **Storage & Archiving** — presigned MinIO URLs + partition reattach

## URL variables

The request URL is composed from parts so you can retarget the whole collection
(e.g. point at a staging host or switch to `https`) by editing one variable:

| Variable    | Default                     | Notes                                          |
| ----------- | --------------------------- | ---------------------------------------------- |
| `protocol`  | `http`                      | `http` / `https`                               |
| `host`      | `localhost:3000`            | host (+ port)                                  |
| `apiPrefix` | `api/v1`                    | API version prefix                             |
| `rootUrl`   | `{{protocol}}://{{host}}`   | server root — used by **System** health checks |
| `baseUrl`   | `{{rootUrl}}/{{apiPrefix}}` | API base — used by every `/api/v1` request     |

Postman resolves nested variables recursively, so changing `protocol`/`host`
updates both `rootUrl` and `baseUrl`. Health endpoints (`/health`,
`/health/ready`) sit at the root and use `{{rootUrl}}`, not `{{baseUrl}}`.

## Files

| File                                  | Import as                                        |
| ------------------------------------- | ------------------------------------------------ |
| `SWAT.postman_collection.json`        | Collection                                       |
| `SWAT.local.postman_environment.json` | Environment                                      |
| `generate.mjs`                        | Source of truth — regenerates the two JSON files |

## Setup

1. Start the backend (from the inner `swat/` dir): `pnpm --filter @swat/backend dev`
   (needs the docker-compose stack + a seeded admin).
2. In Postman: **Import** both JSON files.
3. Select the **SWAT Local** environment (top-right).
4. Run **Auth → Login**. It authenticates `admin / Password123!` and Postman
   stores the httpOnly `swat.sid` session cookie automatically — every other
   request reuses it.

## How it chains

`POST`/create requests capture the new record's id into an environment variable
(`siteId`, `vehicleId`, `driverId`, …) via a test script, so the matching
get/update/delete and nested requests work without copy-pasting ids. A few list
requests seed an id from the first row (e.g. **List License Classes** sets
`licenseClassId`) so you can exercise dependent creates immediately.

Suggested smoke order: Login → create Site (Pool) + Site (TPA) → Route →
Application → Fuel Category → Fuel → Vehicle Model → Vehicle → Driver →
Crew Schedule → Trip Template → Disposal Permit (Kitir).

**Web auth** is cookie-based — run **Login** and the `swat.sid` session is reused
automatically; if you get `401`, re-run it (8h idle timeout). **Native-client
auth** (the .NET apps) uses bearer tokens: run **Auth → Get Token (native
client)**, which captures `accessToken` + `refreshToken` into the environment so
the **Me (Bearer)** / **Token Logout** requests (and any `Authorization: Bearer
{{accessToken}}` call) work. **Refresh Token** rotates the pair; replaying an old
refresh token returns `401` (reuse-detection).

**Weighbridge auth** is dual: the admin session cookie works for the operator
endpoints (weighings, import), while the unattended ingest endpoints
(`resolve-kitir`, `post-weighing`) also accept `X-API-Key: {{weighbridgeApiKey}}`.
The env var defaults to the demo seed's dev-only `swatwb_demo_…` key, so the
**Weighbridge** folder works out of the box; replace it with a real key issued
via **Service Accounts (Admin) → Create Service Account** in other environments.

> Many requests chain via captured ids (`reportJobId`, `weighbridgeTripId`,
> `serviceAccountId`, `levyId`, …). A few — `tripId`, `haulAssignmentId`,
> `transactionDayId` — are best seeded from a **Transactions → Get Transaction
> Day** detail, since trips/assignments are created by the daily workflow.

## Updating as the API grows

Don't hand-edit the JSON. Edit the `GROUPS` array in `generate.mjs` (one line
per request), then regenerate:

```bash
node apps/backend/postman/generate.mjs
```

Commit the regenerated `*.json` alongside the API change.

## Run headless (optional)

With [newman](https://github.com/postmanlabs/newman) installed and the server up:

```bash
newman run apps/backend/postman/SWAT.postman_collection.json \
  -e apps/backend/postman/SWAT.local.postman_environment.json
```
