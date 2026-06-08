# 09.06 — Maintenance Module ("Perawatan")

## Overview

The Maintenance module records vehicle maintenance history (servicing & repairs) — legacy
`riwayatperawatan` / `detailriwayatperawatan` (controller `masterdata/riwayatperawatan.php`). It is a
**legacy-parity** capability: the legacy app tracked it, the new hi-fi design includes the **Perawatan**
screen, and the data model already defines `MaintenanceRecord` / `MaintenanceItem`.

**Phase:** **Phase 1** (operational master data; HIGH priority — legacy parity).
**Design:** `specs/13-design/03-hifi-spec.md` screen "Perawatan"; wireframe in `02-wireframes.md`.
**Entities:** `MaintenanceRecord`, `MaintenanceItem` (see `specs/03-data-model.md`).

---

## 1. Entities

### 1.1 MaintenanceRecord
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | BigInt (PK) | — | |
| `code` | String(30)? unique | — | e.g. `PRW-202606-0042` (mono in UI); auto-generated |
| `vehicleId` | Int (FK) | ✓ | Kendaraan |
| `type` | MaintenanceType | ✓ | `SERVICE` (Servis) / `REPAIR` (Perbaikan) |
| `status` | MaintenanceStatus | ✓ | `PENDING_APPROVAL` (Belum Disetujui) / `APPROVED` (Disetujui) |
| `date` | Date | ✓ | Maintenance date |
| `odometer` | Int? | — | km at service |
| `workshop` | String(256)? | — | Bengkel |
| `description` | String(512)? | — | Uraian pekerjaan (summary) |
| `totalCost` | Int (IDR) | — | Sum of item totals (server-computed) |
| `notes` | String(512)? | — | |
| audit | — | — | `createdAt/updatedAt`, `createdById/updatedById` |

> The UI status pill also surfaces an operational state (Terjadwal / Berjalan / Selesai). For Phase 1
> this is derived from `date` vs today + `status`; if a richer lifecycle is needed, add a
> `MaintenanceProgress` enum in a later phase (lower priority — design-driven, not legacy-required).

### 1.2 MaintenanceItem
`recordId` (FK), `name`, `qty`, `unitPrice` (IDR), `totalPrice` (IDR) = qty × unitPrice. Documentation
photos via the polymorphic `Photo` model (`ownerType='maintenanceItem'`).

---

## 2. User Stories
1. **As an Operator Pool, I record a maintenance job** for a vehicle (type, date, workshop, odometer,
   line items, cost, documentation photos).
2. **As a Supervisor, I approve a maintenance record** (`PENDING_APPROVAL → APPROVED`).
3. **As any reader, I review maintenance history per vehicle** and monthly cost totals.

---

## 3. Screens (Next.js) — see design "Perawatan"
### 3.1 List `/transaksi/perawatan`
- KPI grid: total records, running (in-progress), monthly cost (Rp), scheduled count.
- Table: Kode (mono), Tanggal (`d MMM yyyy`), Kendaraan (plate mono), Jenis pill (Servis/Perbaikan),
  Pekerjaan (description), Bengkel, Biaya (Rp), Status pill. Toolbar: search + filter (type/status/
  vehicle/date-range) + column toggle. Standard empty/loading/error states.
- Actions: row menu (Lihat / Ubah / Hapus). `[Catat Perawatan]` primary.

### 3.2 Record / Edit dialog
Fields: Kendaraan* (combobox), Tanggal* (date), Jenis* (Servis/Perbaikan), Odometer (km), Bengkel,
Biaya — derived from line items, Uraian Pekerjaan (line-item sub-table: name/qty/unitPrice/total) +
documentation **dropzone**. Validation: required vehicle/date/type; cost ≥ 0; totalCost = Σ items.
Approve action gated by permission.

---

## 4. API (per `07-api-spec.md` conventions, `/api/v1`)
- `GET /maintenance-records` — list (filter by vehicleId, type, status, date range; paginated).
- `GET /maintenance-records/:id` — detail with items.
- `POST /maintenance-records` — create (with nested items).
- `PATCH /maintenance-records/:id` — update; `PATCH …/:id/approve` — set `APPROVED` (permission-gated).
- `DELETE /maintenance-records/:id` — soft-handling (or block if APPROVED).
- Items managed nested under the record (create/replace on save).

---

## 5. Business Rules
- `totalCost` is server-computed from items (never trust client).
- Approval is permission-gated; once `APPROVED`, edits restricted to authorized roles.
- Monthly-cost KPI sums `totalCost` over records in the selected month.

## 6. Permissions
`maintenance:read`, `maintenance:create`, `maintenance:update`, `maintenance:approve`,
`maintenance:delete`. (Add keys to `06-auth-rbac.md` Permission seed.)

## 7. Acceptance Criteria
- [ ] Create/edit a maintenance record with line items; totalCost auto-computed.
- [ ] Approve transitions PENDING_APPROVAL → APPROVED (permission-gated).
- [ ] List filters by vehicle/type/status/date; KPIs correct.
- [ ] Documentation photos upload via the Photo flow.
- [ ] ≥80% coverage on the service; integration test for approval transition.

## 8. Migration (Phase 0/1)
Backfill from legacy `riwayatperawatan` (+ `detailriwayatperawatan` → items, `statusriwayatperawatan`
→ `MaintenanceStatus`). Map `dokumentasidetailriwayatperawatan` → `Photo` (empty in legacy snapshot).
Preserve `legacyId`.
