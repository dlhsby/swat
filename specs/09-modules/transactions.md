# 09.03 — Transactions Module

## Overview

The Transactions module is the **operational core** of SWAT. It models a vehicle's daily journey as a sequence of recorded **trips** (legs), each with target and actual times, odometer, weights, and fuel. The module defines:

- **TransactionDay:** One operational date; the root container for all daily work.
- **Haul:** One vehicle's transport work for that day (seeded from CrewSchedule at daily init).
- **HaulAssignment:** A driver assigned to the haul; depart/return reconciliation (time and odometer).
- **Trip:** A single leg (DEPART_POOL/REFUEL/PICKUP/DISPOSAL/RETURN_POOL); the finest granularity for data entry.

**Key concept:** Operators record actual values (times, weights, odometer) as work progresses; checkers verify and lock trips for reporting.

---

## 1. Entities

### 1.1 TransactionDay

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | Int | PK | |
| `legacyId` | Int? | — | For traceability |
| `date` | Date | ✓ | Unique operational date (YYYY-MM-DD); partition key for child tables |
| `status` | DayStatus | ✓ | `IN_PROGRESS` or `DONE` |
| `createdAt` | Timestamptz | — | |
| `updatedAt` | Timestamptz | — | |
| `hauls` | Haul[] | — | All hauls this day |

**Constraints:**
- Unique on `date`.
- `status` cannot be `DONE` if any haul is `IN_PROGRESS`.

**Business rules:**
- Created at daily init (05:00 UTC, configurable), idempotent per date.
- Groups all hauls for the day; closure marks day as complete for reporting.

### 1.2 Haul

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | BigInt | PK | High-volume transactional |
| `legacyId` | BigInt? | — | For traceability |
| `transactionDayId` | Int | FK | Parent TransactionDay |
| `vehicleId` | Int | FK | The vehicle (Kendaraan) |
| `operationDate` | Date | ✓ | Denormalized from TransactionDay for partitioning (see 12-scalability-archiving.md §2) |
| `status` | DayStatus | ✓ | `IN_PROGRESS` or `DONE` |
| `notes` | String(256)? | — | Operator notes (damage, delays, etc.) |
| `createdAt` | Timestamptz | — | |
| `updatedAt` | Timestamptz | — | |
| `assignments` | HaulAssignment[] | — | Driver assignments (typically 1 per day) |

**Constraints:**
- Unique on `(operationDate, transactionDayId, vehicleId)` — one haul per vehicle per day (partition key included per 12-scalability-archiving.md §2).
- Index on `(operationDate, transactionDayId, vehicleId)`.

**Business rules:**
- Created at daily init from active CrewSchedules.
- One Haul typically has one HaulAssignment (the driver for that day).
- Haul is `DONE` when all trips are complete (actualTime, actualOdometer recorded).

### 1.3 HaulAssignment

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | BigInt | PK | High-volume transactional |
| `legacyId` | BigInt? | — | For traceability |
| `haulId` | BigInt | FK | Parent Haul |
| `driverId` | Int | FK | The driver (Pengemudi) |
| `crewScheduleId` | Int? | FK | Template reference (nullable for ad-hoc) |
| `operationDate` | Date | ✓ | Denormalized from Haul/TransactionDay for partitioning (see 12-scalability-archiving.md §2) |
| `status` | DayStatus | ✓ | `IN_PROGRESS` or `DONE` |
| `departTargetOdometer` | Int? | — | From schedule / manual entry (km); optional (defaults in service layer) |
| `departActualOdometer` | Int? | — | Recorded at depart or first trip (km) |
| `returnTargetOdometer` | Int? | — | From schedule / manual entry (km); optional (defaults in service layer) |
| `returnActualOdometer` | Int? | — | Recorded at return; updates vehicle currentOdometer (km) |
| `departTargetTime` | Timestamptz? | — | From schedule (time-of-day) or manual |
| `departActualTime` | Timestamptz? | — | Recorded when driver departs |
| `returnTargetTime` | Timestamptz? | — | From schedule (time-of-day) or manual |
| `returnActualTime` | Timestamptz? | — | Recorded when driver returns |
| `notes` | String(256)? | — | Driver/operator notes |
| `createdAt` | Timestamptz | — | |
| `updatedAt` | Timestamptz | — | |
| `trips` | Trip[] | — | Legs within this assignment |

**Constraints:**
- Index on `haulId`.

**Business rules:**
- Seeded from CrewSchedule at daily init; `departTargetTime`/`returnTargetTime` from schedule (if available), `departTargetOdometer`/`returnTargetOdometer` optional (may be filled from manual entry or defaulted to vehicle currentOdometer in service layer).
- At depart, operator records `departActualTime` and `departActualOdometer`.
- At return, operator records `returnActualTime` and `returnActualOdometer`; updates vehicle `currentOdometer`.
- Odometer must be non-decreasing across trips; returnActualOdometer ≥ vehicle currentOdometer (error if vehicle was used elsewhere).

### 1.4 Trip

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | BigInt | PK | High-volume transactional |
| `legacyId` | BigInt? | — | For traceability |
| `haulAssignmentId` | BigInt | FK | Parent HaulAssignment |
| `routeId` | Int? | FK | Route (Rute); null for ad-hoc |
| `recordedById` | Int? | FK | User who recorded actuals; null if system-recorded |
| `operationDate` | Date | ✓ | Denormalized from TransactionDay for partitioning (see 12-scalability-archiving.md §2) |
| `status` | TripStatus | ✓ | `IN_PROGRESS` → `DONE` → `VERIFIED` |
| `name` | String(256) | ✓ | Leg name (e.g. "TPS Kedurus → TPA Benowo") |
| `targetTime` | Timestamptz? | — | From template; time-of-day + date |
| `actualTime` | Timestamptz? | — | Recorded by operator |
| `targetOdometer` | Int? | — | From template; may be null for unplanned trips (km) |
| `actualOdometer` | Int | ✓ | Recorded by operator (km) |
| `tareWeight` | Int? | — | kg; defaults from vehicle currentTareWeight; omitted for non-DISPOSAL |
| `grossWeight` | Int? | — | kg; recorded on DISPOSAL only |
| `netWeight` | Int? | — | kg; computed = grossWeight - tareWeight; DISPOSAL only |
| `wasteVolume` | Int? | — | m³; recorded on DISPOSAL only |
| `fuelRequestedLiters` | Decimal(8,2)? | — | Liters requested (REFUEL only) |
| `fuelApprovedLiters` | Decimal(8,2)? | — | Liters approved; ≤ requested (REFUEL only) |
| `scheduledEntryAt` | Timestamptz? | — | When target was set (from template) |
| `realizationEntryAt` | Timestamptz? | — | When actual was recorded |
| `verifiedById` | Int? | — | User who verified trip; null until verified |
| `verifiedAt` | Timestamptz? | — | Timestamp when trip was verified and locked |
| `notes` | String(512)? | — | Operator notes (issues, delays, etc.) |
| `createdAt` | Timestamptz | — | |
| `updatedAt` | Timestamptz | — | |
| `photos` | Photo[] | — | Evidence photos; generic Photo relation (see 12-scalability-archiving.md §6) |

**Constraints:**
- **No route-uniqueness on Trip:** a vehicle legitimately repeats the same route multiple times a
  day (ritase = trip count), so there is NO unique constraint on (haulAssignmentId, routeId, day).
  Trips are distinguished by `id`.
- Indexes:
  - `@@index([operationDate, haulAssignmentId, status])` — haul board queries by date + assignment.
  - `@@index([operationDate, routeId, status])` — route activity queries by date + route.
  - `@@index([status])` — filter by trip status for reporting.
- `grossWeight >= tareWeight` (checked at service layer + optional DB check constraint).

**Business rules (critical):**
- **Net weight calculation:** `netWeight = grossWeight - tareWeight`, computed server-side, never from input. Reject if `grossWeight < tareWeight`.
- **Weights on DISPOSAL:** Only `DISPOSAL` trips record `grossWeight`, `tareWeight`, `netWeight`, `wasteVolume`.
- **Fuel on REFUEL:** Only `REFUEL` trips record `fuelRequestedLiters`, `fuelApprovedLiters`. `fuelApprovedLiters ≤ fuelRequestedLiters`.
- **Tare default:** If `tareWeight` not provided, use vehicle `currentTareWeight`; warn if stale.
- **Odometer monotonicity:** Within a haul, `actualOdometer` must be non-decreasing across trips and ≥ vehicle currentOdometer at start.
- **State machine:** `IN_PROGRESS` (created) → `DONE` (operator filled actuals) → `VERIFIED` (checker confirmed, locked).
- **Immutability:** Once `VERIFIED`, trip is locked (audit logged if supervisor override allowed).

---

## 2. User Stories

1. **As an Operator, I want to see the daily haul board** so that I know what hauls and routes are planned.
   - Given a TransactionDay, when I open the haul board, then all hauls (grouped by vehicle) and their trips (target times/odometers) are visible.
   - I can filter by vehicle, status, or driver.

2. **As an Operator, I want to record a pickup** so that the system knows when and where the vehicle picked up waste.
   - Given a PICKUP trip, when I enter actualTime and actualOdometer (and optionally tareWeight), then the trip moves to DONE.

3. **As an Operator, I want to record waste disposal and weighing** so that the system captures the waste quantity.
   - Given a DISPOSAL trip, when I enter actualTime, actualOdometer, grossWeight, and wasteVolume (tareWeight pre-filled from vehicle), then netWeight is computed; trip moves to DONE.
   - If `grossWeight < tareWeight`, the system rejects with an error (e.g., "Berat kotor tidak boleh lebih kecil dari berat kosong").

4. **As an Operator, I want to record fuel fill-up** so that fuel consumption is tracked.
   - Given a REFUEL trip, when I enter fuelRequestedLiters and fuelApprovedLiters (≤ requested), then the trip records the fuel.

5. **As a Checker, I want to verify trips** so that only accurate data is reported.
   - Given a DONE trip, when I review it (time, odometer, weights) and click Verify, then the trip moves to VERIFIED and is locked for editing.

6. **As a System, I want to update vehicle odometer and tare weight** so that the next day's haul starts with current state.
   - When a HaulAssignment's return trip is VERIFIED, update vehicle.currentOdometer and optionally currentTareWeight from latest recorded values.

7. **As an Administrator, I want to see a daily summary** so that I know the day's performance (tonnage, trips, vehicles).
   - (Phase 2) Given a date, show aggregates: total trips, tonnage, fuel, hauls completed, etc.

---

## 3. Screens (Next.js)

### 3.1 Daily Haul Board
**Path:** `/transactions/days/:date`

**Layout:**
- **Header:** Date selector (previous/next day, calendar), current status (IN_PROGRESS/DONE), button to mark DONE.
- **Summary bar:** Total hauls, total trips, total tonnage (if day is done), total fuel.
- **Main table:**
  - Grouping: Vehicle (plate, model, pool).
  - Per vehicle:
    - Driver (name, license number).
    - Depart target/actual times, return target/actual times.
    - Trip count, trip status breakdown (IN_PROGRESS/DONE/VERIFIED).
    - Actions: View haul detail, record times.

### 3.2 Haul Detail
**Path:** `/transactions/hauls/:haulId`

**Layout:**
- **Section 1 — Assignment:**
  - Vehicle (plate, model, tare weight).
  - Driver (name, contact).
  - Depart time (target + actual), odometer (target + actual).
  - Return time (target + actual), odometer (target + actual).
  - Button: Record depart / Record return (if not done).

- **Section 2 — Trips (ordered table):**
  - Route (origin → destination), Category (DEPART_POOL/REFUEL/PICKUP/DISPOSAL/RETURN_POOL).
  - Target time/odometer (from template or manual).
  - Actual time/odometer, weights (gross/tare/net), fuel request/approved.
  - Status (IN_PROGRESS/DONE/VERIFIED).
  - Actions: Record (if IN_PROGRESS), Verify (if DONE, checker only), View/Edit notes.

### 3.3 Record Pickup
**Path:** `/transactions/trips/:tripId/record-pickup` (modal or in-place form)

**Form:**
1. Actual time (timestamp picker; defaults to now).
2. Actual odometer (integer; validates ≥ vehicle currentOdometer and non-decreasing in haul).
3. Tare weight (kg; defaults to vehicle currentTareWeight; warn if different).
4. Notes (optional).
5. Button: Save.

**Validation:**
- Odometer ≥ vehicle currentOdometer.
- Odometer non-decreasing within haul.
- Timestamp reasonable (not in future, not before depart actual).

**Feedback:**
- Success: trip status changes to DONE.
- Error: message explains constraint violation.

### 3.4 Record Disposal
**Path:** `/transactions/trips/:tripId/record-disposal` (modal or in-place form)

**Form:**
1. Actual time (timestamp picker; defaults to now).
2. Actual odometer (integer; validates non-decreasing).
3. Tare weight (kg; pre-filled from vehicle currentTareWeight; editable but warn if changed).
4. Gross weight (kg; required).
5. Waste volume (m³; optional).
6. Notes (optional).
7. Button: Save.

**Validation:**
- Gross weight ≥ tare weight (else error: "Berat kotor tidak boleh lebih kecil dari berat kosong").
- Odometer non-decreasing.
- Net weight computed on submit: `net = gross - tare`.

**Feedback:**
- Success: trip status DONE; net weight displayed.
- Error: validation message.

### 3.5 Record Fuel
**Path:** `/transactions/trips/:tripId/record-fuel` (modal or in-place form)

**Form:**
1. Fuel requested (liters; Decimal(8,2); required).
2. Fuel approved (liters; defaults to requested; warn if less; Decimal(8,2)).
3. Notes (optional).
4. Button: Save.

**Validation:**
- Fuel approved ≤ fuel requested (unless authorized role override).
- Both non-negative.

**Feedback:**
- Success: trip status DONE.

### 3.6 Verify Trip (Checker view)
**Path:** `/transactions/trips/:tripId/verify`

**Read-only detail:**
- Route, category, times, odometer, weights, fuel.
- Actual values and calculated fields.
- Verification form: checkbox "Verify this trip" + notes (optional) + button "Confirm verification".

**Validation:**
- Only roles with `trip:verify` permission shown.
- After verify, trip locked (show lock icon, disable edits).

### 3.7 List Transactions / Trips
**Path:** `/transactions/trips`

**Table:**
- Date, Vehicle, Route, Category, Status, Tonnage, Fuel, Recorded by, Verified by.
- Filter: Date range, Status, Category, Vehicle, Driver.
- Sort: Date, Vehicle, Status.
- Search: Vehicle plate, route name.
- Action: View detail, Verify (if DONE and permission granted).

---

## 4. API Endpoints

See [`07-api-spec.md`](../07-api-spec.md) **§2.8**:

- `GET /transaction-days` — List days (paginated, filterable by date range).
- `GET /transaction-days/:date` — Get day detail + hauls.
- `POST /transaction-days/:date/initiate` — Manually trigger daily init.
- `PATCH /transaction-days/:date` — Mark day DONE.
- `GET /hauls` — List hauls (filterable by date, vehicle).
- `GET /hauls/:id` — Get haul + assignments + trips.
- `PATCH /hauls/:id` — Update haul (notes, mark DONE).
- `GET /trips` — List trips (filterable by date, status, route, category).
- `GET /trips/:id` — Get trip detail.
- `POST /trips` — Create ad-hoc trip (admin/supervisor only).
- `PATCH /trips/:id` — Update trip (name, notes; before DONE state).
- `POST /trips/:id/record-pickup` — Record pickup actuals (time, odometer, tare).
- `POST /trips/:id/record-disposal` — Record disposal weighing (time, odometer, gross/net weight, volume).
- `POST /trips/:id/record-fuel` — Record fuel (requested, approved liters).
- `POST /trips/:id/verify` — Verify and lock (checker role only; cannot be undone without supervisor override).

**Example — POST /trips/:id/record-disposal:**
```json
{
  "actualTime": "2026-06-05T14:45:00Z",
  "actualOdometer": 125650,
  "grossWeight": 6200,
  "tareWeight": 4200,
  "wasteVolume": 12,
  "notes": "Sampah dari TPS Kedurus"
}

Response 200
{
  "success": true,
  "data": {
    "id": 98765,
    "status": "DONE",
    "netWeight": 2000,
    "actualTime": "2026-06-05T14:45:00Z",
    "actualOdometer": 125650,
    "grossWeight": 6200,
    "tareWeight": 4200,
    "wasteVolume": 12,
    "recordedById": 5,
    "realizationEntryAt": "2026-06-05T14:50:30Z",
    "updatedAt": "2026-06-05T14:50:30Z"
  }
}
```

**Example — POST /trips/:id/verify:**
```json
{
  "notes": "Verified by checker"
}

Response 200
{
  "success": true,
  "data": {
    "id": 98765,
    "status": "VERIFIED",
    "verifiedById": 8,
    "verifiedAt": "2026-06-05T15:30:00Z"
  }
}
```

### 4.x Phase 5 additions (Transaction Revamp)

| Method & path | Permission | Notes |
| --- | --- | --- |
| `POST /trips` | `trip:create` | Record an **ad-hoc/unscheduled** trip on a haul assignment (legacy parity for off-plan pickups/refuels/disposals). Body: `{ haulAssignmentId, routeId? \| (category + destinationSiteId?), name?, ...optional actuals }`. The route is resolved from `routeId`, or inferred from `category` + `destinationSiteId`. When `actualTime` + `actualOdometer` are supplied the trip is recorded (DONE) in the same call (also requires the category record permission); otherwise it is created `IN_PROGRESS`. |
| `GET /trips/:id/photos` | `trip:read` | List a trip's documentation photos (legacy `dokumentasitrayek`), each with a short-lived presigned view URL. |
| `POST /trips/:id/photos` | `trip:update` | Register a photo against a trip. Upload the bytes via `POST /storage/presigned-put` first, then post the object metadata `{ objectKey, contentType, sizeBytes, checksum, width?, height? }`. Stored as a polymorphic `Photo` (`ownerType='trip'`); bytes never pass through the API server. |
| `GET /transaction-days/list` | `transaction-day:read` | Paginated list of day **summaries** (newest first), optional `status` filter. Each row `{ id, date, status, vehicleCount, tonnageKg }` is lightweight — `vehicleCount` from a `haul` groupBy, `tonnageKg` from the `daily_tonnage` rollup — so the full haul/trip tree is never loaded. Backs the Penjadwalan list table. |
| `DELETE /trips/:id` | category record perm (verified ⇒ `trip:override`) | **Un-record** (soft delete on the recap): reverts the trip to `IN_PROGRESS` and clears the entered values (`actualTime`, odometer, weights, liters, notes, `recordedBy`, `realizationEntryAt`), keeping the scheduled slot for re-entry. Refreshes the day's rollups; audited as `trip.unrecord`. Same category gate as recording. |

**`Trip.disposalPermitId`** (new, nullable FK → `DisposalPermit`) records the kitir a weighbridge disposal was posted against (legacy `jatahKitir`), set by `post-weighing` for historical auditability. `trip` is a partitioned table, so the column was added by a raw-SQL migration applied with `migrate deploy`.

**Operation-day anchoring (invariant):** on record, `actual_time` is anchored to the trip's `operation_date` — its WIB time-of-day is preserved but its WIB calendar date is forced onto the operation day (`anchorInstantToOperationDate`, common/dates). This guarantees `wibDate(actual_time) === operation_date` for **every** client (web, native, API), so the recap's separate "Tanggal" (from `operation_date`) and "Waktu" (from `actual_time`) columns can never diverge.

**Read-DTO additions** (serialized by the trip mapper, consumed by the recap grid):

- `Trip`: `notes`, `originSiteName`/`destinationSiteName` (the route's two ends, so the UI can show the single inputted location per kind), `createdByName`/`updatedByName` (hidden audit columns), and `cctvReference` — the TPA CCTV reference. `cctv_reference` lives on `TpaInboundLog` (a plain `trip_id` column, no Prisma relation on the partitioned trip), so it is filled by the read path (`TransactionDaysService.withCctv`) via a batched keyed lookup, not a join; null for non-weighbridge/manual disposals.
- `Vehicle`: `wasteSourceCodes` (gates BBM entry to `D`=Dinas vehicles), `vehicleTypeName` (legacy "aplikasi") and `fuelTypeName` (legacy "bahan bakar"), both via `VehicleModel → VehicleType/Fuel`.

### 4.y Pencatatan Aktivitas (Activity Recording UI)

A single tabbed screen at **`/record`** (label "Pencatatan Aktivitas") with one tab per kind — **Aktivitas Pool · Pengisian BBM · Pengambilan Sampah · Pembuangan Sampah** — each rendering the legacy-faithful entry form on top and a recap **DataTable** of that day's recorded (DONE/VERIFIED) trips below. The operation day is the shared **Rekap tanggal** (header `DatePicker`, `disableFuture`); an uninitialized day shows a single "belum diinisiasi" card (no form, no grid).

- **Entry form (gated `trip:update`):** fields mirror legacy per kind. Pool cascades Jenis Aktivitas → Lokasi Pool → **Kendaraan** (the vehicle list only appears once a pool is chosen, filtered to that pool's pending legs). BBM filters the vehicle list to **Dinas** (`D`) vehicles. Odometer is **optional** on every kind (empty ⇒ `-1` sentinel, which skips the odometer-chain check; disposal always sends `-1`). Save reuses the scheduled trip (matched by TPS/pool-leg/pending-refuel) or creates an ad-hoc one, then records.
- **Recap grid:** a stable **No.** (ranked by `realizationEntryAt ?? createdAt`, UUID-v7 `id` tiebreak — persists across sort/filter; pinned left) and a **row actions** kebab (Ubah / Hapus, pinned right). Columns follow legacy wording per kind: BBM shows **Aplikasi · Kategori · Bahan Bakar · BBM Diajukan · BBM Disetujui**; Pembuangan shows **Berat Kotor · Berat Kosong · Berat Bersih · CCTV TPA**; the **Aktivitas** column appears only on Pool; **Tanggal** and **Waktu** are separate. Hidden audit columns (Dibuat/Diubah oleh/pada) match master data.
- **Edit (Ubah):** dialog editing only the realization fields the form captures (time + the kind's measures + notes), saved via the record endpoint. **Delete (Hapus):** un-record (soft) per `DELETE /trips/:id`.
- **Export:** one "Ekspor Laporan" button → xlsx/pdf, generated client-side (ExcelJS / jsPDF, lazy-loaded) directly (no redirect), columns/totals matching the grid and the legacy `laporan` (disposal totals Netto, refuel totals BBM).

---

## 5. Business Rules (from 02-domain-model.md)

1. **Net weight:** `netWeight = grossWeight − tareWeight`. Computed server-side, not trusted from input; reject if `grossWeight < tareWeight`.
2. **Weighing only on disposal:** weights (`grossWeight`/`tareWeight`/`netWeight`/`wasteVolume`) recorded on `DISPOSAL` trips. `tareWeight` defaults from vehicle `currentTareWeight`.
3. **Fuel only on refuel:** `fuelRequestedLiters`/`fuelApprovedLiters` apply to `REFUEL` trips; `fuelApprovedLiters ≤ fuelRequestedLiters` unless explicitly overridden.
4. **Odometer monotonicity:** Within a haul, `actualOdometer` non-decreasing across legs; `actualOdometer ≥` vehicle `currentOdometer` at depart; on return, update vehicle `currentOdometer`.
5. **One haul per vehicle per day:** Unique `(transactionDayId, vehicleId)`.
6. **One transaction day per date:** `TransactionDay.date` unique.
7. **Disposal permit validity:** A vehicle operating on a disposal trip must have an active `DisposalPermit` matching date (Phase 4 weighbridge integration enforces).
8. **Odometer >= current:** `departActualOdometer >= vehicle.currentOdometer`; if vehicle was used elsewhere, error.
9. **Verification lock:** A `VERIFIED` trip is immutable except by supervisor (audit logged).
10. **Tonnage aggregation:** `DailyTonnage` for a date = Σ `netWeight` of `DONE`/`VERIFIED` `DISPOSAL` trips (Phase 2).

---

## 6. State Transitions

### TripStatus
```
IN_PROGRESS ──(operator records actuals)──> DONE ──(checker verifies)──> VERIFIED
```
- `IN_PROGRESS`: created (from template or ad-hoc), awaiting realization.
- `DONE`: actuals recorded (time/odometer; weights for DISPOSAL; fuel for REFUEL).
- `VERIFIED`: checker confirmed; locked for reporting.

### HaulStatus / HaulAssignmentStatus / TransactionDayStatus
```
IN_PROGRESS ──> DONE
```
- A `Haul`/`HaulAssignment`/`TransactionDay` is `DONE` when its children are complete.

---

## 7. Permissions

From [`06-auth-rbac.md`](../06-auth-rbac.md):
- `transaction-day:read` — view days.
- `transaction-day:create` — create day (admin).
- `transaction-day:manage` — initiate day, mark DONE.
- `haul:read` — view hauls.
- `haul:update` — update notes, mark DONE.
- `trip:read` — view trips.
- `trip:create` — create ad-hoc trips.
- `trip:update` — update trip notes.
- `trip:record-pickup` — record pickup.
- `trip:record-disposal` — record disposal.
- `trip:record-fuel` — record fuel.
- `trip:verify` — verify trips.

**Typical role assignments:**
- **PoolOperator:** `trip:record-pickup`, `trip:record-fuel`, `haul:read`, `trip:read`.
- **TpsOperator:** `trip:record-pickup`, `trip:read`.
- **TpaOperator:** `trip:record-disposal`, `trip:read`.
- **Checker:** `trip:verify`, `trip:read`, `haul:read`, `transaction-day:read`.
- **DataAdmin:** `*` (all transaction permissions).

---

## 8. Acceptance Criteria

- [x] User can view daily haul board with all vehicles, drivers, scheduled trips.
- [x] Operator can record pickup (time, odometer, tare).
- [x] Operator can record disposal (time, odometer, gross weight, volume); netWeight computed; rejects if gross < tare.
- [x] Operator can record fuel (requested, approved).
- [x] Checker can verify trip; trip becomes immutable.
- [x] Vehicle odometer and tare weight updated on haul return.
- [x] Odometer non-decreasing across trips within haul (validates).
- [x] Daily init job idempotently seeds hauls from CrewSchedules (Phase 2).
- [x] (Phase 2) Tonnage aggregated per day.
- [x] (Phase 4) Weighbridge integration resolves quota and posts weighing.

---

## 9. Test Cases

| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| T1 | Net weight calculation | Trip with gross=6200, tare=4200 | POST /trips/:id/record-disposal | netWeight=2000; trip status=DONE |
| T2 | Weight validation | Trip with gross=100, tare=200 | POST /trips/:id/record-disposal | 422 Unprocessable Entity: "Berat kotor tidak boleh lebih kecil dari berat kosong" |
| T3 | Odometer monotonicity | Haul with trips: km=100, km=99 | Record 2nd trip | 400 Bad Request: "Odometer harus tidak menurun" |
| T4 | Tare default | Trip without tareWeight input; vehicle.currentTareWeight=4200 | POST /trips/:id/record-disposal | Trip recorded with tareWeight=4200 |
| T5 | Fuel approval | Trip with requested=100L, approved=80L | POST /trips/:id/record-fuel | 200 OK; fuel recorded; approved ≤ requested |
| T6 | Fuel approval violation | Trip with requested=100L, approved=120L | POST /trips/:id/record-fuel | 400 Bad Request: "Persetujuan tidak boleh melebihi permintaan" |
| T7 | Daily init idempotency | CrewSchedule for date 2026-06-05 | POST /transaction-days/2026-06-05/initiate twice | Both calls return same TransactionDay; Hauls upserted, not duplicated |
| T8 | Trip status transitions | Trip created (IN_PROGRESS) | Record actuals → status changes to DONE | Trip no longer editable unless VERIFIED |
| T9 | Verification lock | Trip with status=VERIFIED | Attempt to edit | 409 Conflict: "Trip sudah diverifikasi" (unless supervisor override) |
| T10 | Vehicle odometer update | Haul with return assignment; returnActualOdometer=150000 | HaulAssignment marked DONE | Vehicle.currentOdometer updated to 150000 |
| T11 | Haul closure | Haul with 3 trips; all VERIFIED | Check haul status | Haul status=DONE (auto or manual) |
| T12 | Daily tonnage aggregation | 5 DISPOSAL trips: 5000, 6000, 4500, 3200, 5300 kg | Day marked DONE; aggregate computed | DailyTonnage.amount = 24000 kg |

---

## 10. Non-functional Notes

- **Performance:** Haul board with 500 trips (100 vehicles × 5 trips each) loads < 100 ms p95 via partitioned queries on `operationDate` + `status`; see 12-scalability-archiving.md §2.
- **Partitioning:** `Trip`, `HaulAssignment`, `Haul` partitioned monthly by `operationDate`; see 12-scalability-archiving.md §2 for indexing and partition-pruning details.
- **Concurrency:** Multiple operators recording simultaneously; optimistic locking via `updatedAt` prevents conflicts; 409 on conflict.
- **Soft delete:** Trips are never soft-deleted; use status (IN_PROGRESS/DONE/VERIFIED) for lifecycle.
- **Audit trail:** Every trip state change logged (timestamp, user, action); realized entry timestamp recorded.
- **Time-zone:** All timestamps are UTC; frontend converts to local time for display.
- **File storage:** Trip photos stored in object storage (S3-compatible); metadata in generic `Photo` relation; see 12-scalability-archiving.md §6.
