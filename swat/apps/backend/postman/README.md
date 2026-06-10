# SWAT API — Postman collection

Importable Postman collection + environment for manual testing of the SWAT
backend. Covers Phase 1 **M1** (auth, users, roles, permissions) and **M2**
(geography, waste sources, fleet, personnel, scheduling).

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
Crew Schedule → Trip Template → Fuel Quota.

Auth is cookie-based; there is no bearer token to set. If you get `401`, re-run
**Login** (the session has an 8h idle timeout).

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
