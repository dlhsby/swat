# 09.07 — Vehicle Inspection Module ("Pemeriksaan Kendaraan")

## Overview

The Inspection module records periodic vehicle inspections via a checklist (legacy
`transaksi/inspectionskendaraan.php`). It is a **legacy-parity** capability included in the new hi-fi
design (**Pemeriksaan Kendaraan** screen). The legacy app had the controller but **no clean table**;
the new schema introduces `VehicleInspection` + `InspectionItem` (see `specs/03-data-model.md`).

**Phase:** **Phase 1** (operational; HIGH priority — legacy parity).
**Design:** `specs/13-design/03-hifi-spec.md` screen "Pemeriksaan Kendaraan"; wireframe in `02-wireframes.md`.
**Entities:** `VehicleInspection`, `InspectionItem`.

---

## 1. Entities

### 1.1 VehicleInspection
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | BigInt (PK) | — | |
| `vehicleId` | Int (FK) | ✓ | Kendaraan |
| `date` | Date | ✓ | Inspection date |
| `inspectorId` | Int? (FK User) | — | Pemeriksa |
| `result` | InspectionResult | ✓ | `PASS` / `ATTENTION` / `FAIL`, **derived** from items |
| `passedCount` / `totalCount` | Int | ✓ | # items OK / total items |
| `notes` | String(512)? | — | |
| audit | — | — | `createdAt/updatedAt`, `createdById` |

### 1.2 InspectionItem
`inspectionId` (FK), `label` (e.g. Rem, Lampu, Ban, Klakson…), `status` (`OK`/`ATTENTION`/`FAIL`),
`notes`. Documentation photos via polymorphic `Photo` (`ownerType='inspectionItem'`). The default
checklist is a **12-item** template (configurable seed; not a separate entity in Phase 1).

**Result derivation:** any item `FAIL` → `FAIL`; else any `ATTENTION` → `ATTENTION`; else `PASS`.
`passedCount` = items with status `OK`.

---

## 2. User Stories
1. **As an Operator Pool, I perform an inspection**: pick a vehicle/date, set each checklist item
   OK/Attention/Fail, add notes/photos, save. Result is computed.
2. **As a reader, I review inspection history** and open a detail to see the per-item breakdown.

---

## 3. Screens (Next.js) — see design "Pemeriksaan Kendaraan"
### 3.1 List `/transaksi/inspections-kendaraan`
Table: Tanggal, Kendaraan (plate mono), Model, Pemeriksa, Lolos (`passed/total`), Hasil pill
(Lolos/Perlu Perhatian/Tidak Lolos). Toolbar: search + filter (result/vehicle/date) + columns. Standard
states. `[Periksa]` primary. Row → **detail Sheet**.

### 3.2 Detail (right-side `<Sheet>`)
Pass-count panel (`{passed}/{total} lolos`) + 12-item checklist: each item = tick chip
(OK ✓ / Attention ⚠ / Fail ✗) + label + status badge + optional note/photo.

### 3.3 Create dialog
Vehicle* (combobox), Date* (default today), Inspector, a **Switch/segmented control per checklist
item** (OK/Attention/Fail), notes, documentation **dropzone**. Result computed live and shown as a
pill. Save validates vehicle/date present.

---

## 4. API (`/api/v1`)
- `GET /vehicle-inspections` — list (filter vehicleId/result/date; paginated).
- `GET /vehicle-inspections/:id` — detail with items.
- `POST /vehicle-inspections` — create (with nested items; server derives result + counts).
- `PATCH /vehicle-inspections/:id` — update.
- `DELETE /vehicle-inspections/:id`.

## 5. Business Rules
- `result`, `passedCount`, `totalCount` are **server-derived** from items (never trust client).
- Checklist template seeded server-side; an inspection always materializes all template items.

## 6. Permissions
`inspection:read`, `inspection:create`, `inspection:update`, `inspection:delete`. (Add to
`06-auth-rbac.md` Permission seed.)

## 7. Acceptance Criteria
- [ ] Create an inspection with per-item statuses; result/counts computed correctly.
- [ ] Detail sheet shows the full checklist with item statuses.
- [ ] List filters by vehicle/result/date.
- [ ] Photos upload via the Photo flow.
- [ ] ≥80% coverage; unit test for the result-derivation rule.

## 8. Migration (Phase 0/1)
Legacy had no dedicated inspection table — **greenfield**. If legacy inspection rows exist in another
form, backfill into `VehicleInspection`/`InspectionItem` and preserve `legacyId`; otherwise start clean.
