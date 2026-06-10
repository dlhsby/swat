# 09.02 — Disposal Permit ("Kitir") Module

## Overview

The DisposalPermit (Jatah Kitir) is a **TPA dumping permit** that authorizes a specific vehicle to operate against a specific disposal site (typically TPA) within a date range. The kitir **code** is a QR scanned at the TPA weighbridge desktop app; it is the authoritative credential for waste authorization.

**Key concepts:**
- **Purpose:** Dumping authorization permit (hence "jatah" = allocation) — NOT a fuel quota. Buyer/payment models are deferred.
- **Scope:** Vehicle ↔ Site binding with temporal validity (`validFrom` ≤ `validTo`).
- **Status:** `ACTIVE` or `INACTIVE`; implicit expiry when `validTo < today()`.
- **Weighbridge integration:** Phase 4 — the TPA desktop app resolves permits by QR code or vehicle plate number.
- **Volume & lifecycle:** Legacy system has ~3.3M historical permit rows; new system supports bulk issuance, with indexing on hot-path lookups.

> **Phase:** Permit **issuance CRUD + bulk import ("Impor Massal")** is **Phase 1** (it lives under
> *Penjadwalan* in the hi-fi IA and must exist before the weighbridge can consume permits). The
> **weighbridge resolution API** that *consumes* permits is **Phase 4** (`integration-weighbridge.md`).
> This supersedes any earlier "bulk import = Phase 2" note below — bulk import ships in Phase 1.
> Design: `13-design/03-hifi-spec.md` screen "Jatah Kitir"; wireframe in `02-wireframes.md`.

---

## 1. Entities

### 1.1 DisposalPermit

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | String (UUID v7) | PK | Primary key (UUID v7) |
| `legacyId` | Int? | — | For traceability during migration |
| `code` | String(50)? | — | Kitir QR code (e.g. `KT-202606-0042`); indexed for weighbridge lookup; scanned at TPA |
| `vehicleId` | String (UUID) | FK | Vehicle (Kendaraan) |
| `siteId` | String (UUID) | FK | Site (Lokasi) — typically TPA |
| `status` | DisposalPermitStatus | ✓ | `ACTIVE` or `INACTIVE` |
| `issuedAt` | Timestamptz | ✓ | Timestamp of creation (audit) |
| `validFrom` | Date | ✓ | Start date (inclusive) |
| `validTo` | Date | ✓ | End date (inclusive) |
| `createdAt` | Timestamptz | — | Standard audit column |
| `updatedAt` | Timestamptz | — | Standard audit column |
| `createdById` | String (UUID)? | FK | User who issued the permit |
| `updatedById` | String (UUID)? | FK | User who last updated the permit |

**Indexes (critical for performance):**
- `@@index([code])` — fast weighbridge lookup by code.
- `@@index([vehicleId, validFrom, validTo])` — resolve quota for vehicle on a given date.
- `@@index([status])` — filter active quotas for list views.
- `@@index([status, siteId, vehicleId, validFrom, validTo])` — compound index for weighbridge resolution queries.
- Validate performance with EXPLAIN ANALYZE; adjust if needed.

**Constraints:**
- `validTo >= validFrom` — enforced at DB level (CHECK constraint).
- `code` indexed (not unique) to allow null values and multiple quotas per period.
- Overlaps allowed by design (e.g., multiple quotas per site if vehicle rotated), but **business rule enforces single active per vehicle+site pair** (service-layer validation; see below).

### 1.2 Enumeration: DisposalPermitStatus

```prisma
enum DisposalPermitStatus {
  ACTIVE      // Berlaku
  INACTIVE    // Tidak Berlaku
}
```

---

## 2. User Stories

1. **As an Administrator, I want to issue a disposal permit to a vehicle** so that it is authorized to dump waste.
   - Given a vehicle, site, and date range, when I create a permit and set it ACTIVE, then the vehicle may dump at that site on those dates.
   - The permit code is auto-generated or manually assigned (legacy format: `KT-YYYYMM-NNN`), and the QR is scanned at the weighbridge.

2. **As an Administrator, I want to bulk-import permits from legacy data** so that historical authorizations are preserved.
   - Given a CSV or Excel file with 3.3M rows (legacy), when I upload and trigger import, then DisposalPermit records are upserted with `legacyId` mapping.
   - Performance: import completes in < 60s for 100k rows; database handles indexes gracefully.

3. **As an Administrator, I want to deactivate an expired permit** so that stale authorizations do not cause confusion.
   - Given an active permit with `validTo < today()`, when I manually set `status = INACTIVE`, then the weighbridge rejects it.

4. **As the System, I want to implicitly expire permits** so that expired permits are treated as invalid without manual intervention.
   - Whenever a permit is queried for operation, if `validTo < today()` and `status = ACTIVE`, treat it as expired (warn or auto-mark INACTIVE).

5. **As a Weighbridge Operator, I want to look up a permit** so that I can verify the vehicle is authorized before accepting waste.
   - (Phase 4) Given a vehicle plate number or kitir QR code and today's date, the desktop app queries the server API and receives the permit details (vehicle, site, validity).

---

## 3. Screens (Next.js)

### 3.1 Disposal Permits List
**Path:** `/scheduling/disposal-permits`

**Features:**
- Table: Vehicle (plate), Site, Status (Active/Inactive), Valid from, Valid to, Issued at, Actions (Edit, Deactivate, Delete).
- Filter: Vehicle, Site, Status, Date range (valid on date).
- Search: Vehicle plate, site name.
- Button: + Issue new permit, Bulk import.

**State & permissions:**
- `disposal-permit:read` — view list.
- `disposal-permit:create` — show "+ Issue" and "Bulk import" buttons.
- `disposal-permit:update` — show Edit and Deactivate.

### 3.2 Issue Disposal Permit
**Path:** `/scheduling/disposal-permits/new`

**Form:**
1. Vehicle (dropdown; search by plate, filtered by status=GOOD).
2. Site (dropdown; typically TPA sites, searchable).
3. Valid from (date picker).
4. Valid to (date picker).
5. Status (radio: Active or Inactive).
6. Button: Issue.

**Validation:**
- All fields required.
- `validTo >= validFrom`.
- Warn if vehicle already has active permit for same site (allow override or block).

**Post-creation:**
- Display auto-generated code (e.g., `KT-202606-0042`) or copy-to-clipboard if manually assigned.
- Option to issue another or return to list.

### 3.3 Edit Disposal Permit
**Path:** `/scheduling/disposal-permits/:id`

**Form:**
- All fields as in issue form.
- Typically only editable fields: `validTo` (extend), `status` (deactivate).
- History: show audit trail (created by, updated by, timestamps).

### 3.4 Bulk Import Permits
**Path:** `/scheduling/disposal-permits/bulk-import`

**Form:**
1. File upload (CSV/Excel).
   - **CSV columns expected:** `vehicleId` or `plateNumber`, `siteId` or `siteName`, `validFrom` (YYYY-MM-DD), `validTo` (YYYY-MM-DD), `status` (ACTIVE/INACTIVE).
   - Optional: `code`, `notes`.
2. Preview: table showing parsed rows (first 10) + row count.
3. Strategy selector:
   - Skip if exists (legacy ID).
   - Upsert (update if exists).
4. Button: Import.

**Feedback:**
- Progress bar (for large files).
- Summary: imported count, duplicates, errors.
- Error log: downloadable CSV of failed rows with reasons.

**Validation:**
- Check vehicle exists.
- Check site exists.
- Check `validTo >= validFrom`.

---

## 4. API Endpoints

See [`07-api-spec.md`](../07-api-spec.md) **§2.7**:

- `GET /disposal-permits` — List (paginated, filterable by vehicleId, siteId, status, validFrom/validTo range).
- `GET /disposal-permits/:id` — Get detail.
- `POST /disposal-permits` — Create (vehicleId, siteId, validFrom, validTo, status).
- `PATCH /disposal-permits/:id` — Update (extend dates, deactivate).
- `POST /disposal-permits/bulk-import` — Import from CSV/Excel (Phase 1).

**Example:**
```json
POST /disposal-permits
{
  "vehicleId": "uuid-value",
  "siteId": "uuid-value",
  "validFrom": "2026-01-01",
  "validTo": "2026-12-31",
  "status": "ACTIVE"
}

Response 201
{
  "success": true,
  "data": {
    "id": "uuid-value",
    "vehicleId": "uuid-value",
    "siteId": "uuid-value",
    "status": "ACTIVE",
    "validFrom": "2026-01-01",
    "validTo": "2026-12-31",
    "issuedAt": "2026-06-05T10:30:00Z"
  }
}
```

```json
GET /disposal-permits?vehicleId=uuid-value&validOn=2026-06-05
{
  "success": true,
  "data": [
    {
      "id": "uuid-value",
      "vehicleId": "uuid-value",
      "siteId": "uuid-value",
      "siteName": "TPA Benowo",
      "status": "ACTIVE",
      "validFrom": "2026-01-01",
      "validTo": "2026-12-31"
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 20 }
}
```

### 4.1 Weighbridge Resolution API (Phase 4)

See [`07-api-spec.md`](../07-api-spec.md) **§3** (Special endpoints):

```json
POST /weighbridge/resolve-kitir
{
  "code": "KT-202606-0042",
  // OR
  "plateNumber": "L-1234-AB",
  "date": "2026-06-05"
}

Response 200 (if valid)
{
  "success": true,
  "data": {
    "id": "uuid-value",
    "vehicleId": "uuid-value",
    "plateNumber": "L-1234-AB",
    "siteId": "uuid-value",
    "siteName": "TPA Benowo",
    "status": "ACTIVE",
    "validFrom": "2026-01-01",
    "validTo": "2026-12-31",
    "currentTareWeight": 4200,
    "expectedTareWeight": 4200
  }
}

Response 404 (if invalid, expired, or inactive)
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Kitir tidak ditemukan atau sudah kadaluarsa"
  }
}
```

---

## 5. Business Rules

1. **Validity window:** `validFrom ≤ date ≤ validTo` (both inclusive). Expired permits (`validTo < today()`) are treated as invalid for operational purposes.
2. **Active status required:** A permit must have `status = ACTIVE` **and** not expired to authorize operation.
3. **One active per vehicle+site pair:** No overlapping active permits for the same (vehicle, site) pair on the same date. Enforced at service layer (pre-check before insert); optional DB unique constraint for audit.
4. **Implicit expiry:** System queries check `validTo >= today()` and treat expired permits as invalid even if `status = ACTIVE`. Weighbridge API rejects expired permits (404 NOT_FOUND).
5. **Vehicle must be operational:** Vehicle must have `status = GOOD` to be authorized. Weighbridge API checks this when resolving permit.
6. **Audit trail:** `issuedAt` captures creation timestamp. `createdAt`/`updatedAt` and `createdById`/`updatedById` for standard audit trail.
7. **Kitir QR code format:** `code` field stores the kitir QR identifier (e.g. `KT-202606-0042` in legacy format `KT-YYYYMM-NNNNN`, or custom) scanned at the TPA weighbridge. Must be indexed for fast weighbridge lookup via `@@index([code])`. Code may be auto-generated by the system or manually assigned; uniqueness per period is enforced by business logic (not a DB unique constraint, to allow null/missing codes).

---

## 6. State Transitions

```
ACTIVE ──(deactivate/expire)──> INACTIVE
      ──(update validTo)──> ACTIVE (extended)
```

- `ACTIVE`: vehicle may dump at the site within the date range.
- `INACTIVE`: vehicle may not operate; permits are revoked or expired.
- Implicit expiry: after `validTo`, permit is treated as inactive without explicit update.

---

## 7. Permissions

From [`06-auth-rbac.md`](../06-auth-rbac.md):
- `disposal-permit:read` — view permits.
- `disposal-permit:create` — issue new permit.
- `disposal-permit:update` — deactivate, extend dates.

**Typical role permissions:**
- **Administrator:** `disposal-permit:*` (full access).
- **DataAdmin:** `disposal-permit:*` (full access).
- **FuelStationOperator:** `disposal-permit:read` (view only).
- **TpaOperator:** `disposal-permit:read` (view only; weighbridge server has separate API key auth).

---

## 8. Acceptance Criteria

- [x] User can create a disposal permit with vehicle, site, date range, status.
- [x] API validates `validTo >= validFrom`.
- [x] API rejects duplicate active permits for same (vehicle, site) pair (warn/block).
- [x] User can deactivate or extend a permit.
- [x] Bulk import handles CSV with 100k+ rows in < 60s.
- [x] Queries with indexes (vehicle+date range) return within 50ms.
- [x] Expired permits (validTo < today()) are treated as invalid.
- [x] (Phase 4) Weighbridge API resolves permit by QR code or plate; returns vehicle tare weight.

---

## 9. Test Cases

### Unit Tests
1. **Permit creation:** Valid inputs create record; `validTo < validFrom` rejected.
2. **Status transitions:** Can deactivate active permit; cannot activate invalid permit.
3. **Expiry logic:** Permit with `validTo = yesterday` returns as expired.
4. **Duplicate detection:** Creating second active permit for same vehicle+site raises error.

### Integration Tests
1. **Bulk import:** Upload CSV with 10k rows; verify all upserted with correct fields.
2. **Query performance:** Query for vehicle on a date with 1M rows in index; return < 50ms.
3. **Weighbridge resolution:** Resolve permit by QR code and plate; returns tare weight; expired returns 404.

### E2E Tests (Playwright)
1. **Issue and verify permit:** Navigate to new permit form, fill fields, save. Verify permit appears in list with correct dates.
2. **Deactivate quota:** Open quota detail, deactivate, save. Verify status shows INACTIVE.
3. **Bulk import flow:** Upload CSV file, preview, import. Verify progress and success summary.

---

## 10. Data Migration Notes (Phase 0)

**Legacy jatahkitir table (~3.3M rows):**
- Columns: `ID_JATAHKITIR` → `id`, `ID_KENDARAAN` → `vehicleId`, `ID_SPOT` → `siteId`, `TANGGAL_BERLAKU` → `validFrom`, `TANGGAL_AKHIR_BERLAKU` → `validTo`, `STATUS_JATAHKITIR` → `status`, etc.
- Handle nulls and zero-dates (migrate to NULL).
- Auto-generate `issuedAt` from `createdAt` or use import timestamp.
- Preserve `legacyId` for audit.

**Indexing strategy:**
- Create indexes AFTER initial data load (faster bulk insert).
- Compound index: `(vehicleId, validFrom, validTo, status)` for daily operational queries.
- Separate index on `status` for admin filters.

**Performance target:**
- Bulk import: 100k rows in < 60s (via COPY, batch inserts, or SQL).
- Operational query (resolve quota for vehicle on date): < 50ms with 3M rows.

---

## 11. Non-Functional Notes

- **Indexing critical:** Without indexes, 3.3M rows would cause timeouts. Indexes on `(status, siteId, vehicleId, validFrom, validTo)` and `(vehicleId, validFrom, validTo)` are essential for weighbridge resolution queries.
- **Partitioning:** DisposalPermit partitioned yearly by `validFrom` (see 12-scalability-archiving.md §2); archive old partitions (>13 months) to cold tier.
- **Bulk import:** Use database-level COPY or batched inserts (1,000 rows per batch) to avoid transaction bloat. Phase 2 task.
- **Concurrency:** Multiple admins issuing quotas concurrently; optimistic locking via `updatedAt` + version checks if needed.
- **Soft delete:** Do not delete quotas; mark `status = INACTIVE` instead (preserve audit trail and historical linkage).
- **Time-zone:** All `validFrom`/`validTo` are date-only (no time component); weighed in UTC. Weighbridge desktop app converts to local time (Asia/Jakarta) for display.
