# Phase 5 — Transaction Revamp · Manual Check Guide

A hands-on walkthrough to verify Phase 5 yourself before sign-off. Each section has **UI steps**,
an **API/curl** alternative, and **what to expect** (incl. a DB check). The automated evidence is in
[`PHASE-5-VERIFICATION.md`](./PHASE-5-VERIFICATION.md); this guide is for _your_ manual confirmation.

Estimated time: ~20–30 minutes.

---

## 0. Setup (once)

From the inner `swat/` dir:

```bash
# Fresh demo data + infra (idempotent). Skip if already seeded.
./scripts/setup.sh --no-docker        # if Docker already running
# Start the app (backend :4020, web :4021)
./scripts/start.sh
```

- **Web:** http://localhost:4021/id-ID/login — log in as `admin / Password123!`
- **API base:** `http://localhost:4020/api/v1` · **Swagger:** http://localhost:4020/api/docs
- **Postman:** import `swat/apps/backend/postman/SWAT.postman_collection.json` +
  `SWAT.local.postman_environment.json`, set `host` = `localhost:4020`, run **Auth → Login** first.

Grab a session cookie for curl:

```bash
B=http://localhost:4020/api/v1
curl -s -X POST $B/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"Password123!"}' -c /tmp/c.txt >/dev/null
```

---

## 1. Roadmap renumber (specs)

**Check:** open [`README.md`](./README.md) — the table should read **5 = Transaction Revamp**,
**6 = Monitoring/Reporting gap analysis**, **7 = Production deploy + migration prep**,
**8 = Field/mobile + GPS**. Confirm `phase-8.md` is the old Field/GPS doc (its tasks renumbered to
`T-8xx`) and `phase-5/6/7.md` exist. The status table shows Phase 5 🚧 in progress.

✅ Expect: no dangling "Phase 5 · Field/GPS" references; `specs/index.html` lists the new titles.

---

## 2. Ad-hoc / unscheduled trip recording (G1)

**Why:** the legacy app let operators record off-plan pickups/refuels/disposals; the rebuild only had
scheduled trips + weighbridge disposals.

### UI

1. Go to **Angkut Sampah** (Transaction Days) → open today's (or any) day.
2. Click a vehicle row's **Rute** button (opens the trip sheet).
3. Click **+ Tambah rute tak terjadwal** → pick a **Rute** → **Buat**.
4. The new trip appears in the sheet as _Berjalan_ (IN_PROGRESS); record/verify it as usual.

✅ Expect: trip created; toast "Trip tak terjadwal berhasil dibuat."; it shows the chosen route's
category and is recordable. A role without `trip:create` does **not** see the button.

### API

```bash
# Needs a haul assignment id + a DISPOSAL route's destination site id:
AID=$(docker exec swat-postgres psql -U swat -d swat -tAc \
  "SELECT id FROM haul_assignment LIMIT 1" | tr -d ' ')
SID=$(docker exec swat-postgres psql -U swat -d swat -tAc \
  "SELECT destination_site_id FROM route WHERE category='DISPOSAL' LIMIT 1" | tr -d ' ')
curl -s -b /tmp/c.txt -X POST $B/trips -H 'Content-Type: application/json' \
  -d "{\"haulAssignmentId\":\"$AID\",\"category\":\"DISPOSAL\",\"destinationSiteId\":\"$SID\",\"name\":\"Cek manual\"}"
```

✅ Expect HTTP 201, `status: "IN_PROGRESS"`, `routeCategory: "DISPOSAL"`. Omitting both `routeId` and
`category`+`destinationSiteId` → 400. Supplying `actualTime`+`actualOdometer` records it (DONE) in one
call (also needs the category record permission).

---

## 2b. Quick-entry recording — "Pencatatan Aktivitas" (legacy per-role transaksi menus)

**Why:** the legacy app gave each field role a focused single-task screen
(`pengambilansampah` / `pembuangansampah` / `pengisianbahanbakar` / `aktivitaspool`).
The rebuild restores these as one **tabbed** screen so an operator records just their activity
without navigating the day → haul → trip tree.

> **IA note (UX revamp 2026-06-17):** these started as four separate `/record/*` routes; they are now
> a single screen **Pencatatan Aktivitas** at `/record` with tabs synced to `?tab=pickup|disposal|refuel|pool`,
> living as a leaf inside the **Pengangkutan** group (next to **Penjadwalan** and **Jatah Kitir**).

### UI

1. In the sidebar, open **Pengangkutan → Pencatatan Aktivitas** (`/id-ID/record`). Switch tabs:
   **Pengambilan Sampah** (`?tab=pickup`), **Pembuangan Sampah** (`?tab=disposal`),
   **Pengisian BBM** (`?tab=refuel`), **Aktivitas Pool** (`?tab=pool`). The active tab is bookmarkable.
2. Pick a vehicle from the **Kendaraan** combobox (today's scheduled fleet; fixed-width so it renders
   in the plain page body — see the combobox fix below).
3. The matching-category trips for that vehicle list with a status pill; click **Catat** on an
   IN_PROGRESS one → the same `RecordTripDialog` (category-specific fields) opens. Save.
4. On pickup/disposal/refuel, **Tambah aktivitas tak terjadwal** adds an ad-hoc trip of that
   category (route picker is filtered to the category). Pool legs offer no ad-hoc add.

✅ Expect: each tab shows only its own activity; recording updates the trip and refreshes the
list. Without `trip:update` the Pencatatan Aktivitas leaf is hidden; without `trip:create` the
"Tambah" button is hidden. If today's schedule isn't built, a friendly "belum tersedia" card shows.

> Note: visibility is gated by the generic `trip:update`/`trip:create`, so all four tabs show to
> any recorder. Per-role _scoping_ (a TPS role seeing only pickup) would need per-category
> permissions — a documented follow-up, not in this pass.

---

## 3. Bulk kitir issuance (native parity — legacy insertJatahKitir)

### UI

There is no dedicated screen (the kitir-printing app calls the API). Verify via API/Postman.

### API / Postman

Postman: **Scheduling → Issue Kitir (bulk)**. Or:

```bash
VID=$(docker exec swat-postgres psql -U swat -d swat -tAc "SELECT id FROM vehicle LIMIT 1" | tr -d ' ')
TPA=$(docker exec swat-postgres psql -U swat -d swat -tAc "SELECT id FROM site WHERE type='TPA' LIMIT 1" | tr -d ' ')
curl -s -b /tmp/c.txt -X POST $B/disposal-permits/bulk-issue -H 'Content-Type: application/json' \
  -d "{\"vehicleId\":\"$VID\",\"siteId\":\"$TPA\",\"validFrom\":\"2026-06-01\",\"validTo\":\"2026-06-30\",\"count\":5}"
```

✅ Expect HTTP 201, an **array of 5** permits, each with a distinct printable `code`
(`KT-YYYYMM-NNNN`), `vehiclePlate`, `siteName`, `validFrom`, `validTo` — everything the kitir-printing
app needs. `count > 200` → 400.

---

## 4. Operator attribution on weighing (legacy petugasid)

**Why:** when the TPA app posts via an API key (no logged-in user), capture who weighed.

### API

```bash
# Demo prints a dev service-account key on seed: swatwb_demo_0000...0000
KEY=swatwb_demo_000000000000000000000000000000000000000000000000000000
OP=$(docker exec swat-postgres psql -U swat -d swat -tAc \
  "SELECT id FROM \"user\" WHERE username='operator' LIMIT 1" | tr -d ' ')
# Resolve a kitir for a plate/date, then post a weighing with operatorId:
curl -s -X POST $B/weighbridge/post-weighing -H "X-API-Key: $KEY" -H 'Content-Type: application/json' \
  -d "{\"plateNumber\":\"<PLATE>\",\"date\":\"<YYYY-MM-DD>\",\"grossWeight\":12000,\"tareWeight\":8000,\"operatorId\":\"$OP\"}"
```

✅ Expect: the resulting Trip's `recordedById` = that operator. A **bad** `operatorId` (random UUID) →
**422 "operatorId tidak dikenal"** (not a 500). Use **resolve-kitir** first to find a valid plate/date
from the seeded permits.

---

## 5. Kitir → trip link (legacy jatahKitir)

**Check:** after any successful `post-weighing`, the linked Trip carries the kitir id.

```bash
docker exec swat-postgres psql -U swat -d swat -c \
  "SELECT id, status, disposal_permit_id FROM trip WHERE disposal_permit_id IS NOT NULL LIMIT 5;"
```

✅ Expect: rows where `disposal_permit_id` points at the resolved `DisposalPermit`. (The e2e test
`weighbridge.e2e-spec.ts` asserts this automatically.)

Schema/migration check:

```bash
docker exec swat-postgres psql -U swat -d swat -tAc \
  "SELECT count(*) FROM information_schema.columns WHERE table_name='trip' AND column_name='disposal_permit_id';"  # 1
pnpm --filter @swat/backend exec prisma migrate status   # 'Database schema is up to date!'
```

---

## 6. Per-trip photo documentation (G2 — legacy dokumentasitrayek)

### UI

1. Open a day → **Rute** sheet → click the **camera** icon on any trip.
2. Dialog lists existing photos (empty at first). Click **+ Unggah foto** → choose an image.
3. The thumbnail appears; click it to open the full image (presigned URL).

✅ Expect: upload succeeds (toast), thumbnail shows, image opens. Bytes go **straight to MinIO**
(presigned PUT) — not through the API. A role without `trip:update` sees photos but no upload button.

### API

```bash
TID=<a trip id>
curl -s -b /tmp/c.txt $B/trips/$TID/photos          # [] then the uploaded photo(s) with `url`
```

DB check: `SELECT owner_type, owner_id, object_key FROM photo WHERE owner_type='trip';`

---

## 7. TPA history backfill (D3)

**Why:** migrated `sampahmasuktpa` rows load with `trip_id NULL`; this links them to their trips.
(On the **demo** seed the inbound logs are synthetic and won't match real trips — that's expected;
this mainly matters after a real legacy load. The run below proves the script works + is idempotent.)

```bash
# State before:
docker exec swat-postgres psql -U swat -d swat -tAc \
  "SELECT count(*) total, count(trip_id) linked FROM tpa_inbound_log;"
# Run (env must export DATABASE_URL):
set -a && . ./.env.local && set +a
pnpm --filter @swat/backend run migrate:backfill-tpa
```

✅ Expect: it scans all logs in batches, logs `Selesai: N tertaut, M tanpa pasangan, …`, lists a few
unmatched samples, and exits 0. Re-running is a no-op for already-linked rows (idempotent). On real
migrated data, `tertaut` (linked) should be the bulk of weighings; disambiguated plates (`…#id`) are
reported as unmatched by design.

---

## 8. Swagger ↔ Postman parity & full surface

```bash
# Every documented endpoint exists; the collection matches 1:1.
curl -s http://localhost:4020/api-json | grep -c '"/api/v1'      # ~153 paths
```

✅ Expect: Swagger UI (`/api/docs`) shows the new operations under **trips** (POST /trips, photos) and
**disposal-permits** (bulk-issue), and **weighbridge** post-weighing shows `operatorId`. The Postman
collection has matching requests (Transactions → Create Ad-hoc Trip / List+Attach Trip Photo;
Scheduling → Issue Kitir (bulk)).

---

## 9. Automated gate (optional, to reproduce CI)

From inner `swat/`:

```bash
pnpm typecheck && pnpm lint && pnpm format:check && pnpm build && pnpm test
pnpm --filter @swat/backend test:e2e     # needs the Docker stack up
```

✅ Expect: all green — typecheck/lint 5/5, web 167 + backend 580 unit, build 4/4, e2e 38/38.

---

## Sign-off checklist

- [ ] Roadmap renumbered (§1)
- [ ] Ad-hoc trip create works in UI + API; permission-gated (§2)
- [ ] "Pencatatan Aktivitas" tabbed screen (`/record?tab=…`) records per-category; permission-gated (§2b)
- [ ] Bulk kitir returns N printable codes (§3)
- [ ] Operator attribution sets recordedById; bad id → 422 (§4)
- [ ] `trip.disposal_permit_id` populated after weighing; migration no-drift (§5)
- [ ] Trip photo upload + gallery works; bytes via MinIO (§6)
- [ ] TPA backfill runs + idempotent (§7)
- [ ] Swagger/Postman show the new endpoints (§8)
- [ ] Automated gate green (§9)
