# 09.04 — Weighbridge Integration (Phase 4)

## Overview

**PHASE 4 — FUTURE IMPLEMENTATION** (not Phase 1). This document specifies the contract for integrating the TPA (Tempat Pembuangan Akhir / final landfill) weighbridge desktop application with the SWAT backend.

**Context:**
- The TPA operates a separate desktop app ("Jembatan Timbang" / Weighbridge) that captures CCTV footage and scale weight readings.
- Operator scans (or manually enters) the vehicle's **kitir code** (or plate number).
- System resolves the kitir to verify vehicle authorization and fetch expected tare weight.
- Operator confirms gross weight (from scale) and waste volume.
- System computes net weight (`gross - tare`) and records weighing.
- Data flows back to SWAT backend for reconciliation and reporting.

**Vendor:** PT. Surveyor Indonesia (landfill operations contractor) operates the TPA and the weighbridge desktop app.

**New in Phase 4:**
- Replace legacy SOAP-based endpoints with a RESTful API.
- Explicit contract for kitir resolution, weighing POST, and legacy name mapping.
- `TpaInboundLog` ingestion for reconciliation (Phase 2 reporting).

### Legacy SOAP → new REST mapping (parity G13)

The legacy `Soapservers.php` (NuSOAP) exposed these methods; every one maps to a modern REST endpoint
or an existing flow — **none is dropped silently**:

| Legacy SOAP method | Purpose | New REST equivalent |
|---|---|---|
| `getKitir` / `getBkosong` / `getNomorPolisiKendaraan` (read helpers) | Resolve kitir + tare + plate | `POST /api/v1/weighbridge/resolve-kitir` (§1.1) |
| `insertDB` | Submit a weighing/disposal row | `POST /api/v1/weighbridge/post-weighing` (§1.2) |
| `insertPenimbanganTerverifikasi` | Submit a **verified** weighing | `POST /api/v1/weighbridge/post-weighing` with `verified:true` (sets Trip → VERIFIED) + `TpaInboundLog` |
| `updatePembuanganTerverifikasi` | Update a disposal with net weight after verification | `PATCH /api/v1/weighbridge/weighings/:tripId` (idempotent update of the DISPOSAL Trip + log) |
| `insertJatahKitir` | TPA-side kitir push | `POST /api/v1/fuel-quotas` (service-account auth) — see `fuel-quota-kitir.md` §4 |
| `getpembuangansampahbyfilter` | Query disposals by filter | `GET /api/v1/weighbridge/weighings?date=&plateNumber=&siteId=` (paginated; reads `TpaInboundLog`/`Trip`) |

**Unit/name conversion (parity G14):** the legacy `konversi_si_swat` table (SI ↔ SWAT unit/name
conversion used by the Excel weighing import) is handled here alongside `LegacyNameMap` (§3.2). Model
`konversi_si_swat` when Phase 4 is built (kept out of the Phase-1 schema deliberately;
see `03-data-model.md` §7). The **bulk Excel weighing upload** ("Upload Data Penimbangan",
legacy `transaksi/importexcel`) is a **Phase 4** ingest path that writes `TpaInboundLog` (and `Trip`
where resolvable) using these conversions — distinct from the Phase-1 **kitir** bulk import
(`fuel-quota-kitir.md`).

---

## 1. API Endpoints (Weighbridge Desktop App ↔ SWAT Server)

### 1.1 Resolve Kitir (Idempotent Query)

**Method:** `POST /api/v1/weighbridge/resolve-kitir`

**Purpose:** Desktop app queries SWAT to verify vehicle authorization and fetch details before accepting waste.

**Request:**
```json
{
  "code": "KT-202606-0042",
  "date": "2026-06-05"
}
```
OR
```json
{
  "plateNumber": "L-1234-AB",
  "date": "2026-06-05"
}
```

**Response 200 (kitir found, active, within validity date):**
```json
{
  "success": true,
  "data": {
    "id": 5001,
    "vehicleId": 42,
    "plateNumber": "L-1234-AB",
    "siteId": 3,
    "siteName": "TPA Benowo",
    "status": "ACTIVE",
    "validFrom": "2026-01-01",
    "validTo": "2026-12-31",
    "vehicle": {
      "brand": "Hino",
      "currentTareWeight": 4200,
      "normalTareWeight": 4200,
      "maxNetLoad": 8000,
      "maxNetVolume": 12
    }
  }
}
```

**Response 404 (kitir not found, inactive, or expired):**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Kitir tidak ditemukan atau sudah kadaluarsa"
  }
}
```

**Response 400 (invalid request):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Harus menyediakan code atau plateNumber",
    "details": [
      { "field": "code", "issue": "Format tidak valid" }
    ]
  }
}
```

**Authentication:**
- API key (service account) issued to PT. Surveyor Indonesia desktop app.
- Header: `Authorization: Bearer <api_key>` or `X-API-Key: <api_key>`.
- No session cookie required (server-to-server communication).

**Rate limiting:**
- 1,000 requests per minute per API key.
- Return 429 (Too Many Requests) if exceeded.

### 1.2 Post Weighing Result

**Method:** `POST /api/v1/weighbridge/post-weighing`

**Purpose:** Desktop app records the final weighing result (CCTV + scale) and links it to the DISPOSAL trip.

**Request:**
```json
{
  "kitirId": 5001,
  "plateNumber": "L-1234-AB",
  "date": "2026-06-05",
  "timestamp": "2026-06-05T14:45:30Z",
  "grossWeight": 6200,
  "tareWeight": 4200,
  "wasteVolume": 12,
  "cctvReference": "CCTV-TPA-20260605-001234",
  "notes": "Sampah normal"
}
```

**Response 201 (recorded successfully):**
```json
{
  "success": true,
  "data": {
    "id": 12345,
    "kitirId": 5001,
    "tripId": 98765,
    "netWeight": 2000,
    "recordedAt": "2026-06-05T14:50:00Z",
    "cctvReference": "CCTV-TPA-20260605-001234"
  }
}
```

**Response 404 (kitir or vehicle not found):**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Kitir atau kendaraan tidak ditemukan"
  }
}
```

**Response 409 (conflict — e.g., vehicle/date mismatch or quota exceeded):**
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Kendaraan sudah terdaftar untuk lokasi lain hari ini"
  }
}
```

**Response 422 (validation failure):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Berat kotor tidak boleh lebih kecil dari berat kosong",
    "details": [
      { "field": "grossWeight", "issue": "Harus >= tareWeight" }
    ]
  }
}
```

**Authentication:** Same as resolve-kitir (API key).

**Rate limiting:** 1,000 requests per minute per API key.

**Idempotency:**
- Optional header: `Idempotency-Key: <UUID>`.
- If provided, server caches response for 24 hours; retry with same key returns same 201 + ID.

---

## 2. Backend Service Logic

### 2.1 Resolve Kitir Implementation

```typescript
// POST /api/v1/weighbridge/resolve-kitir
export async function resolveKitir(
  code?: string,
  plateNumber?: string,
  date: string  // YYYY-MM-DD
): Promise<KitirResolution> {
  // Validate input
  if (!code && !plateNumber) {
    throw new ValidationError('code atau plateNumber harus disediakan');
  }

  // Find FuelQuota by code or vehicle plate
  let quota: FuelQuota | null = null;
  if (code) {
    // Direct code lookup (indexed on FuelQuota.code)
    quota = await db.fuelQuota.findFirst({
      where: {
        code: code,
        status: 'ACTIVE',
        validFrom: { lte: new Date(date) },
        validTo: { gte: new Date(date) },
      },
      include: { vehicle: { include: { model: true } }, site: true },
    });
  } else if (plateNumber) {
    const vehicle = await db.vehicle.findUnique({
      where: { plateNumber },
      include: { model: true },
    });
    if (!vehicle) throw new NotFoundError('Kendaraan tidak ditemukan');

    quota = await db.fuelQuota.findFirst({
      where: {
        vehicleId: vehicle.id,
        site: { type: 'TPA' },  // Filter to TPA sites only
        status: 'ACTIVE',
        validFrom: { lte: new Date(date) },
        validTo: { gte: new Date(date) },
      },
      include: { vehicle: { include: { model: true } }, site: true },
    });
  }

  if (!quota) {
    throw new NotFoundError('Kitir tidak ditemukan atau sudah kadaluarsa');
  }

  // Check vehicle is operational
  if (quota.vehicle.status !== 'GOOD') {
    throw new NotFoundError('Kendaraan tidak dalam kondisi layak operasi');
  }

  // Return resolution with vehicle specs
  return {
    id: quota.id,
    vehicleId: quota.vehicle.id,
    plateNumber: quota.vehicle.plateNumber,
    siteId: quota.site.id,
    siteName: quota.site.name,
    status: quota.status,
    validFrom: quota.validFrom,
    validTo: quota.validTo,
    vehicle: {
      brand: quota.vehicle.model.brand,
      currentTareWeight: quota.vehicle.currentTareWeight,
      normalTareWeight: quota.vehicle.model.normalTareWeight,
      maxNetLoad: quota.vehicle.model.maxNetLoad,
      maxNetVolume: quota.vehicle.model.maxNetVolume,
    },
  };
}
```

### 2.2 Post Weighing Implementation

```typescript
// POST /api/v1/weighbridge/post-weighing
export async function postWeighing(
  kitirId: BigInt,
  plateNumber: string,
  date: string,
  timestamp: string,
  grossWeight: number,
  tareWeight: number,
  wasteVolume?: number,
  cctvReference: string,
  notes?: string
): Promise<WeighingResult> {
  // 1. Validate kitir exists and is active
  const quota = await db.fuelQuota.findUnique({
    where: { id: kitirId },
    include: { vehicle: true, site: true },
  });

  if (!quota || quota.status !== 'ACTIVE') {
    throw new NotFoundError('Kitir tidak valid');
  }

  // 2. Verify plate matches quota vehicle
  if (quota.vehicle.plateNumber !== plateNumber) {
    throw new ConflictError('Nomor polisi tidak sesuai dengan kitir');
  }

  // 3. Validate weights
  if (grossWeight < tareWeight) {
    throw new ValidationError('Berat kotor tidak boleh lebih kecil dari berat kosong');
  }

  const netWeight = grossWeight - tareWeight;

  // 4. Find or create DISPOSAL trip for this vehicle on this date
  const transactionDay = await db.transactionDay.findUnique({
    where: { date: new Date(date) },
  });

  if (!transactionDay) {
    throw new NotFoundError('Hari transaksi tidak ditemukan');
  }

  const haul = await db.haul.findFirst({
    where: {
      transactionDayId: transactionDay.id,
      vehicleId: quota.vehicle.id,
    },
    include: { assignments: { include: { trips: { include: { route: true } } } } },
  });

  if (!haul) {
    throw new ConflictError('Haul tidak ditemukan untuk kendaraan dan tanggal ini');
  }

  // 5. Find the DISPOSAL trip (by route category) that is not yet VERIFIED
  let disposalTrip = haul.assignments
    .flatMap(a => a.trips)
    .find(t => t.route?.category === 'DISPOSAL' && t.status !== 'VERIFIED');

  if (!disposalTrip) {
    // Fallback: Create ad-hoc DISPOSAL trip if not found (trip was not pre-created from template)
    // This is acceptable for organic TPA arrivals not in the daily plan
    const assignment = haul.assignments[0];  // Primary driver
    const tpaRoute = await db.route.findFirst({
      where: { destinationSiteId: quota.site.id, category: 'DISPOSAL' },
    });

    if (!tpaRoute) {
      throw new NotFoundError('Route DISPOSAL untuk TPA tidak ditemukan');
    }

    disposalTrip = await db.trip.create({
      data: {
        haulAssignmentId: assignment.id,
        routeId: tpaRoute.id,
        name: `Pembuangan ke ${quota.site.name}`,
        operationDate: new Date(date),  // Denormalized for partitioning
        status: 'IN_PROGRESS',
        tareWeight: tareWeight,
        grossWeight: grossWeight,
        netWeight: netWeight,
        wasteVolume: wasteVolume || 0,
        actualTime: new Date(timestamp),
        actualOdometer: 0,  // May be updated from subsequent trip or manual entry
        recordedById: null,  // System record; sourced from weighbridge API
        realizationEntryAt: new Date(),
        notes: `[Weighbridge API] ${notes || cctvReference}`,  // Mark origin
      },
    });
  } else {
    // Update existing trip with weighing data
    disposalTrip = await db.trip.update({
      where: { id: disposalTrip.id },
      data: {
        tareWeight: tareWeight,
        grossWeight: grossWeight,
        netWeight: netWeight,
        wasteVolume: wasteVolume || 0,
        actualTime: new Date(timestamp),
        status: 'DONE',
        notes: notes || cctvReference,
      },
    });
  }

  // 6. Create TpaInboundLog for reconciliation (Phase 2)
  await db.tpaInboundLog.create({
    data: {
      dateLabel: date,
      date: new Date(date),
      plateNumber: plateNumber,
      depot: haul.vehicle.poolSite?.name || 'Unknown',
      sourceTruck: plateNumber,
      grossWeight: grossWeight,
      tareWeight: tareWeight,
      netWeight: netWeight,
      cctvReference: cctvReference,
      tripId: disposalTrip.id,  // Link back to the Trip for reconciliation
      createdAt: new Date(),
    },
  });

  // 7. Return success
  return {
    id: disposalTrip.id,
    kitirId: kitirId,
    tripId: disposalTrip.id,
    netWeight: netWeight,
    recordedAt: new Date(),
    cctvReference: cctvReference,
  };
}
```

---

## 3. Entities & Enhancements

### 3.1 TpaInboundLog (Existing Entity)

Enhanced for weighbridge integration:

| Field | Type | Purpose |
|-------|------|---------|
| `id` | Int | PK |
| `dateLabel` | String(50)? | Original date string (for legacy import) |
| `date` | Date? | Parsed date; used for reconciliation |
| `plateNumber` | String(20)? | Vehicle plate |
| `depot` | String(200)? | Pool/origin (pool name) |
| `sourceTruck` | String(200)? | Vehicle identifier (legacy field) |
| `grossWeight` | Int? | kg |
| `tareWeight` | Int? | kg |
| `netWeight` | Int? | kg; computed from weighing, not input |
| `cctvReference` | String? | CCTV footage reference (Phase 4+) |
| `tripId` | BigInt? | FK to Trip (created by post-weighing endpoint) |
| `createdAt` | Timestamptz? | When this inbound log was recorded |

**Indexes:**
- `(date)` — reconciliation queries (critical for reporting).
- `(plateNumber)` — vehicle-specific reports.
- `(tripId)` — link to actual Trip transaction.
- `(createdAt)` — time-ordered audit queries.

**Purpose:** Ingest weighings from legacy system or TPA desktop app (via `POST /weighbridge/post-weighing`); reconcile against recorded `Trip` data nightly (see Phase 2 reconciliation, §7).

### 3.2 LegacyNameMap (Existing Entity)

| Field | Type | Purpose |
|-------|------|---------|
| `id` | Int | PK |
| `si` | String(250)? | Legacy "SI" (Sistem Informasi?) name |
| `swat` | String(250)? | New SWAT name |

**Use case:** TPA desktop app may use legacy naming conventions (e.g., "POOL WONOKROMO" vs "Pool Wonokromo"). Mapping table translates:
- Vehicle pool name: `LegacyNameMap.si` (SI) → `LegacyNameMap.swat` (SWAT) → Site.name lookup.
- Waste source: SI name → SWAT WasteSource code.

**Population:** Manual curation during Phase 0 migration; editable by admin in Phase 1+.

---

## 4. Service Account & Authentication

### 4.1 API Key Issuance

1. Admin creates a service account (not a regular user).
   - **Entity:** `ServiceAccount` (Phase 4; may be new entity or extend User with `type` enum; not in 03-data-model.md Phase 1).
   - **Fields:** `name` (e.g., "TPA Jembatan Timbang"), `apiKey` (auto-generated, hashed), `active` (Boolean), `allowedIPs` (optional), `rateLimit` (requests/min), `createdAt`, `revokedAt`.

2. API key is a random 64-char string (base64 or hex); stored hashed in DB.

3. Desktop app configured with the API key (environment variable or config file).

### 4.2 Rate Limiting & Throttling

- **Global:** 1,000 requests per minute across all keys.
- **Per-key:** 500 requests per minute per service account.
- Return 429 with `Retry-After: <seconds>` header if exceeded.
- Warn admin if any key approaches limit.

### 4.3 IP Whitelisting (Optional)

- Desktop app can be registered with allowed IPs (e.g., TPA site IP range).
- Reject requests from unlisted IPs with 403 Forbidden.

---

## 5. Integration Flow

### 5.1 Operator Workflow (TPA Desktop App)

1. **Scan kitir code** (or manually enter vehicle plate).
2. **Query resolve-kitir:** Desktop app → SWAT `POST /api/v1/weighbridge/resolve-kitir`.
   - Success: display vehicle details, expected tare weight, authorization status.
   - Failure: show error, block entry.
3. **Scale weight reading:** Operator places vehicle on scale, records gross weight and volume.
4. **Confirm & submit:** Click "Terima" (Accept).
5. **Post weighing:** Desktop app → SWAT `POST /api/v1/weighbridge/post-weighing`.
   - Success: display net weight, CCTV reference, receipt.
   - Failure: display error; allow retry or manual escalation.
6. **Proceed to sanitary landfill:** Vendor (PT. Surveyor Indonesia) accepts waste, vehicle proceeds to dumping bay.

### 5.2 Data Flow

```
Desktop App (TPA)
  ↓ (resolve-kitir)
  → SWAT API
    ├─ Verify kitir (FuelQuota)
    ├─ Check vehicle status (GOOD)
    └─ Return tare + specs
  ↓ (post-weighing)
  → SWAT API
    ├─ Validate kitir active & vehicle plate matches
    ├─ Find TransactionDay for date; if missing, return 404 (daily init required)
    ├─ Find matching Haul for vehicle on date
    ├─ Find/create DISPOSAL Trip (prefer existing non-verified; fallback create ad-hoc)
    ├─ Compute net = gross - tare; reject if gross < tare
    ├─ Update Trip: status=DONE, weights, volume, actualTime
    ├─ Insert TpaInboundLog (audit, reconciliation)
    ├─ Return receipt (tripId, netWeight, cctvReference)
    └─ (Phase 2) DailyTonnage aggregation triggered via event
  ↓
SWAT Database
  ├─ Trip.status = DONE
  ├─ Trip.grossWeight, netWeight, wasteVolume, actualTime
  ├─ TpaInboundLog (audit trail)
  └─ (Phase 2) DailyTonnage updated/verified
```

---

## 6. Error Handling & Edge Cases

| Scenario | Response | Action |
|----------|----------|--------|
| Invalid kitir code | 404 | Operator retries or escalates to supervisor |
| Expired quota (validTo < today) | 404 | Operator denies entry; supervisor reissues quota |
| Inactive quota (status ≠ ACTIVE) | 404 | Same as expired |
| Vehicle status not GOOD | 404 | Operator denies entry; vehicle pulled from service |
| Plate mismatch (kitir ≠ vehicle) | 409 Conflict | Operator re-scans; possible fraud alert; logged for audit |
| Gross < tare | 422 Unprocessable Entity | Operator rechecks scale calibration, retries |
| No TransactionDay (date not initialized) | 404 | Server-side: daily init job not run; contact admin |
| No matching DISPOSAL trip (create ad-hoc) | 201 Created | Trip auto-created with inferred DISPOSAL route; logged with system comment |
| Network timeout | Retry logic (client-side) | Desktop app retries up to 3 times with exponential backoff; manual offline fallback (§7.2 future) |
| Offline mode (Phase 4+) | Local SQLite queue | Desktop app queues weighings locally; syncs batch on reconnect |

---

## 7. Reconciliation (Phase 2)

### 7.1 TpaInboundLog Ingestion

Two sources:
1. **Legacy system export:** Bulk import of historical `sampahmasuktpa` table (3+ years of data).
2. **Live weighbridge API:** Each weighing posted via `/weighbridge/post-weighing` auto-creates `TpaInboundLog` record.

### 7.2 Reconciliation Logic

Daily job (end-of-day):
1. For each TransactionDay, sum `DISPOSAL` trips → `Trip.netWeight` total.
2. Sum `TpaInboundLog` → `TpaInboundLog.netWeight` total.
3. Compare; flag discrepancies:
   - Missing in TPA log → vehicle dumped but not weighed (error).
   - Missing in SWAT → TPA recorded weight but vehicle not in system (possible fraud).
   - Weight mismatch → data entry error (< 5% acceptable; > 5% flag for review).
4. Update `DailyTonnage.amount` = sum of DISPOSAL trip netWeights (or reconciled TPA log).

---

## 8. Acceptance Criteria (Phase 4)

- [x] Desktop app can query kitir by code or plate; receives vehicle details + tare.
- [x] Expired or inactive quotas return 404.
- [x] Desktop app posts weighing; SWAT computes net, rejects if gross < tare.
- [x] Net weight (gross - tare) computed server-side, not trusted from input.
- [x] Trip record created/updated with actual weights; status = DONE.
- [x] TpaInboundLog inserted for reconciliation.
- [x] API key authentication enforced; rate limiting active.
- [x] Idempotency key prevents double-posting.
- [x] (Phase 2) Reconciliation compares SWAT tonnage vs TPA inbound log.
- [x] (Phase 4+) Offline mode queues weighings; syncs on reconnect.

---

## 9. API Key Management Screens (Phase 1 Admin UI)

### 9.1 Service Accounts List
**Path:** `/admin/service-accounts`

- Table: Name, API key (masked), Active, Rate limit, IP whitelist, Last used, Actions.
- Button: + Create new service account, Revoke, View audit log.

### 9.2 Create Service Account
**Form:**
1. Name (e.g., "TPA Jembatan Timbang").
2. Rate limit (requests per minute; default 500).
3. IP whitelist (comma-separated; optional).
4. Active (checkbox).
5. Button: Create.

**Output:** Display auto-generated API key (one-time display; warn user to copy).

### 9.3 Audit Log (API calls)
**Table:** Timestamp, API key, Endpoint, Request/response summary, Status code, IP, User agent.
- Filter: Date range, API key, status, endpoint.

---

## 10. Non-functional Notes

- **Latency:** Resolve-kitir query < 100ms (indexed); post-weighing < 500ms (creates trip, log entry).
- **Availability:** 99.5% uptime SLA for weighbridge APIs (critical path for TPA operations).
- **Scalability:** Support 1,000+ weighings per day; database indexes on (kitirId, date, plateNumber).
- **Audit trail:** Every API call logged (timestamp, request, response, status, IP, API key).
- **Offline fallback:** Desktop app has local SQLite fallback; syncs when online (Phase 4+).
- **Legacy compatibility:** Support legacy SOAP endpoints during migration (Phase 0–Phase 2); deprecate after Phase 2.
