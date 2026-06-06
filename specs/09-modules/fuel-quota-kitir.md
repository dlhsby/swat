# 09.02 — Fuel Quota ("Kitir") Module

## Overview

The FuelQuota (Jatah Kitir) is an **authorization record** that permits a specific vehicle to operate against a specific disposal site (typically TPA) within a date range. In the legacy system, the kitir **code** is the identifier matched at the TPA weighbridge desktop app; in the new system, it remains the authoritative credential.

**Key concepts:**
- **Purpose:** Auditable fuel/route quota authorization (hence "jatah" = allocation).
- **Scope:** Vehicle ↔ Site binding with temporal validity (`validFrom` ≤ `validTo`).
- **Status:** `ACTIVE` or `INACTIVE`; implicit expiry when `validTo < today()`.
- **Weighbridge integration:** Phase 4 — the TPA desktop app resolves quotas by code or vehicle plate number.
- **Volume & lifecycle:** Legacy system has ~3.3M historical quota rows; new system supports bulk issuance, with indexing on hot-path lookups.

---

## 1. Entities

### 1.1 FuelQuota

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | BigInt | PK | High-volume table; autoincrement |
| `legacyId` | Int? | — | For traceability during migration |
| `code` | String(50)? | — | Kitir code (e.g. `KT-202606-0042`); indexed for weighbridge lookup; may be auto-generated, manually assigned, or null |
| `vehicleId` | Int | FK | Vehicle (Kendaraan) |
| `siteId` | Int | FK | Site (Lokasi) — typically TPA |
| `status` | FuelQuotaStatus | ✓ | `ACTIVE` or `INACTIVE` |
| `issuedAt` | Timestamptz | ✓ | Timestamp of creation (audit) |
| `validFrom` | Date | ✓ | Start date (inclusive) |
| `validTo` | Date | ✓ | End date (inclusive) |
| `createdAt` | Timestamptz | — | Standard audit column |
| `updatedAt` | Timestamptz | — | Standard audit column |
| `createdById` | Int? | FK | User who issued the quota |
| `updatedById` | Int? | FK | User who last updated the quota |

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

### 1.2 Enumeration: FuelQuotaStatus

```prisma
enum FuelQuotaStatus {
  ACTIVE      // Berlaku
  INACTIVE    // Tidak Berlaku
}
```

---

## 2. User Stories

1. **As an Administrator, I want to issue a fuel quota to a vehicle** so that it is authorized to operate.
   - Given a vehicle, site, and date range, when I create a quota and set it ACTIVE, then the vehicle may use that route on those dates.
   - The quota code is auto-generated or manually assigned (legacy format: `KT-YYYYMM-NNN`).

2. **As an Administrator, I want to bulk-import quotas from legacy data** so that historical authorizations are preserved.
   - Given a CSV or Excel file with 3.3M rows (legacy), when I upload and trigger import, then FuelQuota records are upserted with `legacyId` mapping.
   - Performance: import completes in < 60s for 100k rows; database handles indexes gracefully.

3. **As an Administrator, I want to deactivate an expired quota** so that stale authorizations do not cause confusion.
   - Given an active quota with `validTo < today()`, when I manually set `status = INACTIVE`, then the weighbridge rejects it.

4. **As the System, I want to implicitly expire quotas** so that expired quotas are treated as invalid without manual intervention.
   - Whenever a quota is queried for operation, if `validTo < today()` and `status = ACTIVE`, treat it as expired (warn or auto-mark INACTIVE).

5. **As a Weighbridge Operator, I want to look up a quota** so that I can verify the vehicle is authorized before accepting waste.
   - (Phase 4) Given a vehicle plate number or kitir code and today's date, the desktop app queries the server API and receives the quota details (vehicle, site, validity).

---

## 3. Screens (Next.js)

### 3.1 Fuel Quotas List
**Path:** `/scheduling/fuel-quotas`

**Features:**
- Table: Vehicle (plate), Site, Status (Active/Inactive), Valid from, Valid to, Issued at, Actions (Edit, Deactivate, Delete).
- Filter: Vehicle, Site, Status, Date range (valid on date).
- Search: Vehicle plate, site name.
- Button: + Issue new quota, Bulk import.

**State & permissions:**
- `fuel-quota:read` — view list.
- `fuel-quota:create` — show "+ Issue" and "Bulk import" buttons.
- `fuel-quota:update` — show Edit and Deactivate.

### 3.2 Issue Fuel Quota
**Path:** `/scheduling/fuel-quotas/new`

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
- Warn if vehicle already has active quota for same site (allow override or block).

**Post-creation:**
- Display auto-generated code (e.g., `KT-202606-0042`) or copy-to-clipboard if manually assigned.
- Option to issue another or return to list.

### 3.3 Edit Fuel Quota
**Path:** `/scheduling/fuel-quotas/:id`

**Form:**
- All fields as in issue form.
- Typically only editable fields: `validTo` (extend), `status` (deactivate).
- History: show audit trail (created by, updated by, timestamps).

### 3.4 Bulk Import Quotas
**Path:** `/scheduling/fuel-quotas/bulk-import`

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

- `GET /fuel-quotas` — List (paginated, filterable by vehicleId, siteId, status, validFrom/validTo range).
- `GET /fuel-quotas/:id` — Get detail.
- `POST /fuel-quotas` — Create (vehicleId, siteId, validFrom, validTo, status).
- `PATCH /fuel-quotas/:id` — Update (extend dates, deactivate).
- `POST /fuel-quotas/bulk-import` — Import from CSV/Excel (Phase 2).

**Example:**
```json
POST /fuel-quotas
{
  "vehicleId": 42,
  "siteId": 3,
  "validFrom": "2026-01-01",
  "validTo": "2026-12-31",
  "status": "ACTIVE"
}

Response 201
{
  "success": true,
  "data": {
    "id": 5001,
    "vehicleId": 42,
    "siteId": 3,
    "status": "ACTIVE",
    "validFrom": "2026-01-01",
    "validTo": "2026-12-31",
    "issuedAt": "2026-06-05T10:30:00Z"
  }
}
```

```json
GET /fuel-quotas?vehicleId=42&validOn=2026-06-05
{
  "success": true,
  "data": [
    {
      "id": 5001,
      "vehicleId": 42,
      "siteId": 3,
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
    "id": 5001,
    "vehicleId": 42,
    "plateNumber": "L-1234-AB",
    "siteId": 3,
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

1. **Validity window:** `validFrom ≤ date ≤ validTo` (both inclusive). Expired quotas (`validTo < today()`) are treated as invalid for operational purposes.
2. **Active status required:** A quota must have `status = ACTIVE` **and** not expired to authorize operation.
3. **One active per vehicle+site pair:** No overlapping active quotas for the same (vehicle, site) pair on the same date. Enforced at service layer (pre-check before insert); optional DB unique constraint for audit.
4. **Implicit expiry:** System queries check `validTo >= today()` and treat expired quotas as invalid even if `status = ACTIVE`. Weighbridge API rejects expired quotas (404 NOT_FOUND).
5. **Vehicle must be operational:** Vehicle must have `status = GOOD` to be authorized. Weighbridge API checks this when resolving quota.
6. **Audit trail:** `issuedAt` captures creation timestamp. `createdAt`/`updatedAt` and `createdById`/`updatedById` for standard audit trail.
7. **Kitir code format:** `code` field stores the kitir identifier (e.g. `KT-202606-0042` in legacy format `KT-YYYYMM-NNNNN`, or custom). Must be indexed for fast weighbridge lookup via `@@index([code])`. Code may be auto-generated by the system or manually assigned; uniqueness per period is enforced by business logic (not a DB unique constraint, to allow null/missing codes).

---

## 6. State Transitions

```
ACTIVE ──(deactivate/expire)──> INACTIVE
      ──(update validTo)──> ACTIVE (extended)
```

- `ACTIVE`: vehicle may operate on the site within the date range.
- `INACTIVE`: vehicle may not operate; quotas are revoked or expired.
- Implicit expiry: after `validTo`, quota is treated as inactive without explicit update.

---

## 7. Permissions

From [`06-auth-rbac.md`](../06-auth-rbac.md):
- `fuel-quota:read` — view quotas.
- `fuel-quota:create` — issue new quota.
- `fuel-quota:update` — deactivate, extend dates.

**Typical role permissions:**
- **Administrator:** `fuel-quota:*` (full access).
- **DataAdmin:** `fuel-quota:*` (full access).
- **FuelStationOperator:** `fuel-quota:read` (view only).
- **TpaOperator:** `fuel-quota:read` (view only; weighbridge server has separate API key auth).

---

## 8. Acceptance Criteria

- [x] User can create a fuel quota with vehicle, site, date range, status.
- [x] API validates `validTo >= validFrom`.
- [x] API rejects duplicate active quotas for same (vehicle, site) pair (warn/block).
- [x] User can deactivate or extend a quota.
- [x] Bulk import handles CSV with 100k+ rows in < 60s.
- [x] Queries with indexes (vehicle+date range) return within 50ms.
- [x] Expired quotas (validTo < today()) are treated as invalid.
- [x] (Phase 4) Weighbridge API resolves quota by code or plate; returns vehicle tare weight.

---

## 9. Test Cases

### Unit Tests
1. **Quota creation:** Valid inputs create record; `validTo < validFrom` rejected.
2. **Status transitions:** Can deactivate active quota; cannot activate invalid quota.
3. **Expiry logic:** Quota with `validTo = yesterday` returns as expired.
4. **Duplicate detection:** Creating second active quota for same vehicle+site raises error.

### Integration Tests
1. **Bulk import:** Upload CSV with 10k rows; verify all upserted with correct fields.
2. **Query performance:** Query for vehicle on a date with 1M rows in index; return < 50ms.
3. **Weighbridge resolution:** Resolve quota by code and plate; returns tare weight; expired returns 404.

### E2E Tests (Playwright)
1. **Issue and verify quota:** Navigate to new quota form, fill fields, save. Verify quota appears in list with correct dates.
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
- **Partitioning:** FuelQuota partitioned yearly by `validFrom` (see 12-scalability-archiving.md §2); archive old partitions (>13 months) to cold tier.
- **Bulk import:** Use database-level COPY or batched inserts (1,000 rows per batch) to avoid transaction bloat. Phase 2 task.
- **Concurrency:** Multiple admins issuing quotas concurrently; optimistic locking via `updatedAt` + version checks if needed.
- **Soft delete:** Do not delete quotas; mark `status = INACTIVE` instead (preserve audit trail and historical linkage).
- **Time-zone:** All `validFrom`/`validTo` are date-only (no time component); weighed in UTC. Weighbridge desktop app converts to local time (Asia/Jakarta) for display.
