# SWAT Phase 1 — Manual Verification Checklist

Step-by-step acceptance pass for Phase 1 (MVP). Work top-to-bottom; each item has
**Steps** and an **Expected** result. Check the box when it passes. Items are
tagged **[API]** (curl/Postman/psql), **[WEB]** (browser), or **[OPS]** (operator).

- **Admin login:** `admin` / `Password1234!` (forces a password change on first login).
- **API base:** `http://<host>/api/v1` · **Liveness:** `/health` · **Readiness:** `/health/ready` · **Swagger:** `/api/docs`
- **Web base:** `http://<host>/` (redirects to `/id-ID`). Postman collection: `swat/apps/backend/postman/`.
- Docker is the operator's environment; none of this runs in the dev WSL.

---

## P · Prerequisites — bring the stack up  [OPS]

- [ ] **P1. Env file.** `cp infra/docker-compose.prod.env.example infra/docker-compose.prod.env` and fill REAL secrets:
  `SESSION_SECRET` and `JWT_SECRET` each `openssl rand -base64 48`; strong `POSTGRES_PASSWORD`, `MINIO_ROOT_PASSWORD`. Leave `CORS_ORIGIN` blank for same-origin.
- [ ] **P2. Up.** `docker compose -f infra/docker-compose.prod.yml --env-file infra/docker-compose.prod.env up -d --build`.
  **Expected:** all services become healthy (`docker compose ps` → postgres/redis/minio/backend/web healthy, nginx up).
- [ ] **P3. Migrations applied.** Backend runs `prisma migrate deploy` on boot (never `migrate dev`).
  Verify the audit table exists: `docker compose exec postgres psql -U swat -d swat -c '\dt "AuditLog"'` → one row.
- [ ] **P4. Seed (once).** Run the seed command in the backend container.
  **Expected:** `admin` present (`mustChangePassword=false`) + dev-only `adminreset` (`mustChangePassword=true`), **96 permissions**, 6 roles.
  - **Dev** (`pnpm db:seed`, `SEED_SYNTHETIC` default): also seeds reference data + a year of disposal/refuel trips, TPA logs, levies, and one each of driver-license / crew-schedule / trip-template + two kitir — so every Phase-1 master/scheduling CRUD list and every Phase-2 dashboard has data.
  - **Prod / real-data cutover:** seed `SEED_AUTH_ONLY=true` (permissions/roles/admin only), then load master data via `migrate:legacy` (see `scripts/migration/README.md`). Do **not** seed synthetic/reference data into a migration target.

---

## S · Smoke  [API]

- [ ] **S1. Liveness.** `curl -s http://<host>/health` → `{"status":"ok","service":"swat-backend",...}`.
- [ ] **S2. Readiness OK.** `curl -s http://<host>/health/ready` → `{"status":"ready","checks":{"database":"up"}}`.
- [ ] **S3. Swagger.** Open `http://<host>/api/docs` → UI renders, lists auth/users/roles/master/transactions/operations tags.
- [ ] **S4. Web loads.** Open `http://<host>/` → redirects to `/id-ID/login`, login screen renders.

---

## SEC · Security & NFR (gap-closure items — check these first, they're newest)

- [ ] **SEC1. API security headers [API].** `curl -sI http://<host>/api/v1/health` (or any API route) →
  `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security` present.
- [ ] **SEC2. Web security headers [API].** `curl -sI http://<host>/` →
  `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and `Content-Security-Policy` present.
- [ ] **SEC3. CSP doesn't break the web app [WEB].** Open the app, hard-reload, open DevTools console.
  **Expected:** NO Content-Security-Policy violation errors; pages render and navigate normally; **Swagger UI still works** (CSP is intentionally off on the API).
- [ ] **SEC4. Readiness fails closed [API].** `docker compose stop postgres`, then `curl -s -o /dev/null -w '%{http_code}' http://<host>/health/ready` → **503**; `/health` still → **200**. Restart postgres.
- [ ] **SEC5. Login rate-limit [API].** POST `/auth/login` with wrong password 6× within 15 min from one IP → 6th returns **429**.
- [ ] **SEC6. Audit trail [API/OPS].** After running AUTH + TX below, query:
  `SELECT action,"entityType","actorName" FROM "AuditLog" ORDER BY timestamp DESC LIMIT 20;`
  **Expected:** rows for `user.create`, `role.update`, `trip.verify`, `maintenance.approve`, and `trip.fuel-override`.
- [ ] **SEC7. No secret leakage [API].** Trigger a 500 (or a validation error) and confirm the JSON response carries a generic message + stable code — **no stack trace, SQL, or file paths**.

---

## AUTH · Authentication & RBAC  [API unless noted]

- [ ] **AUTH1. Login happy path.** POST `/auth/login {admin, Password1234!}` → 200, `Set-Cookie: swat.sid` (httpOnly, SameSite=Strict), body has `mustChangePassword:true`.
- [ ] **AUTH2. Bad credentials.** Wrong username and wrong password each → 400 with the **generic** "Kredensial tidak valid" (no hint which field).
- [ ] **AUTH3. /auth/me.** With the cookie → 200, returns user + role + **flattened permission keys**. No cookie → 401.
- [ ] **AUTH4. Forced change-password [WEB].** Log in via the UI → you are forced to `/id-ID/change-password` and cannot reach the app until you change it. After change, `mustChangePassword` is cleared and `/auth/me` reflects it.
- [ ] **AUTH5. Logout.** POST `/auth/logout` → 200, cookie cleared; subsequent `/auth/me` → 401.
- [ ] **AUTH6. Permission enforcement.** As a role lacking `vehicle:create`, POST `/vehicles` → **403**. As a role with it → 200. As admin (`*:*`) → always 200.
- [ ] **AUTH7. User CRUD.** Create user → 201 with a temporary password + `mustChangePassword:true`, no password hash in the response. Soft-delete → row gone from list, `deletedAt` set.
- [ ] **AUTH8. Admin force-reset.** POST `/auth/force-reset/:id` (needs `user:manage`) → returns a new temp password; that user is forced to change on next login.
- [ ] **AUTH9. Role delete guard.** Delete a role assigned to ≥1 user → **409**; delete an unused role → 200.

---

## MD · Master data  [API + WEB]

For each resource, exercise list → create → edit → delete and confirm the guard + validation.

- [ ] **MD1. Vehicle [WEB].** Create with a valid plate; **duplicate plate → "Nomor polisi sudah ada"** inline; bad plate format → field error; `registrationExpiry` in the past → rejected; on update, `currentOdometer` lower than current → rejected (monotonic).
- [ ] **MD2. Driver.** KTP must be 16 digits + unique; `birthDate` under 18 years → rejected.
- [ ] **MD3. Site.** `latitude ∈ [-90,90]`, `longitude ∈ [-180,180]`; one coordinate without the other → rejected.
- [ ] **MD4. Route.** `originSiteId = destinationSiteId` → 400; duplicate `(origin,dest,category)` → 409; **`distanceKm = 0` → 400** ("Jarak harus lebih dari nol").
- [ ] **MD5. Reference-master uniqueness (gap-closure).** Create two **vehicle-applications** (and two **fuel-categories**) with the same name → second → **409**. Two fuels with the same name in the **same category** → 409; same name in a **different** category → allowed.
- [ ] **MD6. Delete-blocked-when-referenced.** Delete a vehicle-model/application/fuel that's in use → **409** with an Indonesian message.
- [ ] **MD7. Crew schedule.** Unique `(vehicle,driver)`; `departTime < returnTime`.
- [ ] **MD8. Fuel quota (kitir).** `validFrom ≤ validTo`; the `id` is returned as a string (BigInt).
- [ ] **MD9. Pagination/soft-delete.** Lists exclude `deletedAt` rows and return `meta.total/page/limit`.

---

## TX · Transaction lifecycle  [API + WEB]

- [ ] **TX1. Daily init (idempotent).** POST `/transaction-days/initialize-today` twice → second run creates **no duplicates**; a TransactionDay exists with Hauls → HaulAssignments → Trips. Soft-deleted vehicles/drivers do **not** spawn hauls.
- [ ] **TX2. Day tree read.** `GET /transaction-days?date=YYYY-MM-DD` → full nested tree.
- [ ] **TX3. Record depart.** `PUT /haul-assignments/:id/record-depart {actualOdometer, actualTime}`; odometer below the vehicle's current → **400**.
- [ ] **TX4. Record return.** `PUT /haul-assignments/:id/record-return`; odometer below depart → 400; on success the **Vehicle.currentOdometer advances**, assignment → DONE, and the Haul cascades to **DONE** when all siblings are done.
- [ ] **TX5. DISPOSAL weighing gate (critical) [WEB].** Record a DISPOSAL trip with `grossWeight < tareWeight` → **400** "berat bersih akan menjadi negatif" (UI: Save disabled + red alert). Valid → `netWeight = gross − tare`, server-computed.
- [ ] **TX6. REFUEL approval gate.** `approved > requested` **without** `fuel:approve` → 400. With the permission → succeeds **and writes a `trip.fuel-override` audit row** (see SEC6).
- [ ] **TX7. PICKUP default tare.** Omit `tareWeight` → defaults from the vehicle.
- [ ] **TX8. Verify + lock.** `PUT /trips/:id/verify` (needs `trip:verify`) → status VERIFIED + `verifiedBy`/`verifiedAt`. Re-record without `trip:override` → **403**; with it → trip drops back to DONE (must be re-verified).
- [ ] **TX9. Partition pruning [OPS].** `EXPLAIN` a date-bounded `Trip` query → it scans **one** monthly partition, not the parent.

---

## OPS · Legacy-parity operations  [API + WEB]

- [ ] **OPS1. Inspection [WEB] (`/inspections`).** Create with the 12-item checklist; the **result is server-derived** (any FAIL→FAIL; any ATTENTION→ATTENTION; else PASS) — the client cannot set it. Detail sheet shows per-item status. *(Known gap: no result/vehicle/date filter dropdowns — search only.)*
- [ ] **OPS2. Maintenance [WEB] (`/maintenance`).** Line items → **`totalCost` server-computed**; auto code `PRW-YYYYMM-NNNN`; `PATCH :id/approve` (needs `maintenance:approve`) → APPROVED; once APPROVED, edit/delete are **blocked**. *(Same filter gap.)*
- [ ] **OPS3. Refuel log [WEB] (`/refuel-log`).** Read-only view; cost = `approved × fuel.pricePerLiter`; rows where `approved < requested` flagged as **anomaly**.
- [ ] **OPS4. Kitir bulk import [WEB] (`/disposal-permits` → Impor Massal).** Upload a CSV → preview → import; upsert by `legacyId`; per-row error report for bad rows; duplicate `legacyId` within one file handled (UPSERT/SKIP), no spurious failure.

---

## WEB · Frontend UX cross-cutting  [WEB]

- [ ] **WEB1. App shell.** Topbar h76, theme toggle persists across reload with **no flash**, user menu → logout confirm; sidebar active-item styling; **mobile drawer + scrim below `lg`**.
- [ ] **WEB2. Permission-gated nav.** As a limited role, the sidebar **hides** modules without `:read` and action buttons you lack are absent (not just disabled). Admin sees all.
- [ ] **WEB3. Dashboard (`/dashboard`).** Greeting + "Inisiasi Hari Ini"; 4 metric cards from live data; recent-day row navigates to the Haul Board.
- [ ] **WEB4. Inline server errors.** A 409/422 from create/edit maps onto the **right form field**, not just a toast.
- [ ] **WEB5. i18n.** All labels Bahasa Indonesia; dates `dd/MM/yyyy`; IDR number formatting; no stray English on primary screens.
- [ ] **WEB6. Dark mode.** Toggle and skim each screen — contrast OK, no stale-surface flashes on toggle.
- [ ] **WEB7. Responsive.** DataTables collapse to stacked cards below `md`.
- [ ] **WEB8. Profile (`/profile`).** Name edit persists; logout confirm works. *(Known: photo upload is a labeled "coming soon" placeholder.)*

### Known deviations (expected, not bugs — decide if any block the pilot)
- No trip **Tolak/reject** flow (hi-fi shows it; T-131 specced verify-only).
- Inspection/maintenance lists have **search only**, no filter dropdowns.
- Lists fetch `?limit=100` and paginate **client-side** (fine for pilot volumes).
- Profile **photo upload** deferred (placeholder).
- Trip record/verify use a consolidated `PUT /trips/:id` rather than the spec's per-action `POST` (front+back consistent; contract-doc drift only).

---

## MIG · Legacy migration (dry-run → live)  [OPS] — per `docs/CUTOVER-RUNBOOK.md`

- [ ] **MIG1. UTF-8 dump.** Export the legacy MySQL dump as **UTF-8** and spot-check Indonesian names for mojibake (the toolkit has no `iconv` fallback).
- [ ] **MIG2. Discovery.** `migrate:discovery` → review per-table & per-year counts + data-quality report (zero-GPS, bogus years, dup routes, image inventory).
- [ ] **MIG3. Master + auth + scheduling.** `migrate:legacy` → loads in FK order; **MD5 never copied** (users get random Argon2 + `mustChangePassword`); routes deduped deterministically.
- [ ] **MIG4. Images.** `migrate:images` → filesystem → MinIO, SHA-256 verified, `Photo` rows, resumable, orphans logged.
- [ ] **MIG5. Verify gate.** `migrate:verify` → **exit 0** required (≤1% per-table reconciliation, FK spot-checks clean, all users Argon2 + `mustChangePassword`).
- [ ] **MIG6. T-155 transactional history.** **Open item** — implement the streamed transactional load (trayek/transaksiangkutsampah/detail/sampahmasuktpa, oldest→newest, keyset+watermark) and extend `verify-migration.ts` with **per-year** reconciliation. Building blocks are ready.
- [ ] **MIG7. Delta-sync (parallel run).** `migrate:delta-sync` → KPI parity (tonnage/fuel/ritase) within 1%, exit 1 on divergence; original `createdAt` preserved across passes.

---

## CUT · Cutover readiness  [OPS]

- [ ] **CUT1.** `docs/CUTOVER-RUNBOOK.md` walked end-to-end (freeze, final delta-sync, verification, sign-off, flip, 48h fallback).
- [ ] **CUT2.** `docs/ROLLBACK-PLAN.md` reviewed; staging dry-run of the reverse-flip done.
- [ ] **CUT3.** Temp-credential distribution plan in place (out-of-band; users force-change on first login).

---

## Definition of done

- **SEC + AUTH + MD + TX + OPS + WEB green** → the application and the NFR hardening are verified for pilot.
- **MIG + CUT** → the live migration & cutover (operator, data-dependent).
- The only spec'd Phase-1 item still genuinely open is **MIG6 / T-155** (transactional bulk load), which needs live data.

> Automated coverage: backend has 399 unit tests + supertest e2e (auth, master-data); a Playwright
> smoke scaffold exists for auth/master-data/transactions. Expanding Playwright to cover the full
> WEB/TX/OPS flows above is the planned next step **after this manual pass is acknowledged**.
