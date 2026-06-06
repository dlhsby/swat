# 09-Master-Personnel — Drivers & Licenses

## Overview

The personnel module manages driver master data: driver registration (name, KTP, contact, employment status), driver licenses (SIM numbers, classes, expiry dates), and license classes (A, BI, BII, C, D, etc.). This is essential for crew scheduling and trip assignments; all haul assignments reference drivers.

## Entities

### Driver
- **Fields:**
  - `id` (Int, PK)
  - `legacyId` (Int?, unique) — for migration traceability
  - `poolSiteId` (FK → Site) — assigned pool/depot
  - `employmentStatus` (EmploymentStatus enum: SATGAS, PNS, HONORER)
  - `name` (String, ≤100 chars)
  - `idCardNumber` (String, ≤16 chars) — KTP, 16 digits
  - `originAddress` (String, ≤256 chars) — home address
  - `currentAddress` (String, ≤256 chars) — current residence
  - `birthDate` (DateTime, date only, format YYYY-MM-DD)
  - `contact` (String, ≤100 chars) — phone/email
  - `safetyTraining` (String?, ≤100 chars, default "BELUM") — training completion status
  - `photo` (Photo?, 0..1 relation) — profile photo (object-storage backed; see [`12-scalability-archiving.md`](../12-scalability-archiving.md) §6)
  - `notes` (String?, ≤256 chars)
  - `createdAt`, `updatedAt` (Timestamptz, UTC)
  - `deletedAt` (Timestamptz?, soft delete)
- **Validation:**
  - `idCardNumber`: exactly 16 digits (KTP format)
  - `name`, `originAddress`, `currentAddress`, `contact`: non-empty
  - `birthDate`: valid date in past (age ≥17)
  - `poolSiteId`: must exist and type=POOL

### DriverLicense
- **Fields:**
  - `id` (Int, PK)
  - `legacyId` (Int?, unique) — for migration traceability
  - `driverId` (FK → Driver)
  - `licenseClassId` (FK → LicenseClass)
  - `licenseNumber` (String, ≤12 chars) — SIM number
  - `expiry` (DateTime, date only, format YYYY-MM-DD)
  - `createdAt`, `updatedAt` (Timestamptz, UTC)
- **Validation:**
  - `licenseNumber`: non-empty, max 12 chars
  - `expiry`: date in future; warn if ≤30 days
  - `driverId` + `licenseClassId`: can have multiple licenses (not unique pair)

### LicenseClass
- **Fields:**
  - `id` (Int, PK)
  - `legacyId` (Int?, unique) — for migration traceability
  - `name` (String, unique, ≤10 chars)
  - `createdAt`, `updatedAt` (Timestamptz, UTC)
- **Validation:**
  - `name`: non-empty, unique
- **Seed values:** A, BI, BI Umum, BII, BII Umum, C, D

## User Stories

- As a **personnel admin**, I want to register a new driver with KTP, name, contact, and employment status, so the driver enters the system.
- As a **personnel admin**, I want to view driver list, filter by pool/employment status/search name, so I can track personnel.
- As a **personnel admin**, I want to update a driver's address, contact, or photo, so records stay current.
- As a **personnel admin**, I want to issue a new driver license (SIM) with class and expiry date, so the driver's qualification is recorded.
- As a **personnel admin**, I want to update a driver license's expiry date, so the system knows when renewal is due.
- As a **personnel admin**, I want to view a driver's licenses and expiry status, so I can warn of renewal deadlines.
- As a **personnel admin**, I want to revoke a license, so disqualified drivers cannot be assigned.
- As a **personnel admin**, I want to soft-delete a driver, so historical assignments remain intact.

## Screens

### Driver List Screen (`/drivers`)
- **Permission required:** `driver:read`
- **Layout:** Paginated table (20/50/100 rows)
- **Columns:** KTP, Name, Employment Status, Pool, Contact, Licenses (count), Created, Updated, Actions
- **Filters:** Pool dropdown, Employment Status (SATGAS/PNS/HONORER), Search box (name/KTP/contact)
- **Sorting:** name, KTP, employment status, updated date
- **Buttons:** "Register Driver" (if `driver:create`)
- **Row actions:** View detail, Edit, Delete (if `driver:delete`)
- **Warnings:** Highlight rows with expiring licenses (≤30 days) in yellow; expired in red

### Driver Form Screen (`/drivers/new`, `/drivers/:id`)
- **Permission required:** `driver:create` (create) or `driver:update` (edit)
- **Tabs:** Personal, Licenses, Photo, Notes
- **Tab 1 — Personal:**
  - KTP Number (text, required, exactly 16 digits)
  - Full Name (text, required, max 100 chars)
  - Employment Status (dropdown, required: SATGAS, PNS, HONORER)
  - Birth Date (date, required, must be ≥17 years old)
  - Pool / Depot (dropdown, required, filtered `/sites?type=POOL`)
  - Contact (text, required, phone or email, max 100 chars)
  - Origin Address (textarea, required, max 256 chars)
  - Current Address (textarea, required, max 256 chars)
  - Safety Training Status (text, optional, default "BELUM")
- **Tab 2 — Licenses:**
  - Table of driver's licenses (if edit mode)
  - Columns: Class, License Number, Expiry, Status (Valid/Expiring/Expired), Actions
  - "Issue New License" button (if `license:create`)
  - Row actions: Edit license, Revoke license (if `license:delete`)
- **Tab 3 — Photo:**
  - Photo (file upload or object-storage URL, optional; uses pre-signed URLs)
- **Tab 4 — Notes:**
  - Notes textarea (optional, max 256 chars)
- **Behaviors:**
  - On submit: POST `/drivers` (create) or PATCH `/drivers/:id` (edit)
  - On success: show toast, redirect to `/drivers`
  - On KTP validation fail: show "KTP harus 16 digit"
  - On age validation fail: show "Pengemudi harus berusia minimal 17 tahun"

### License Form Modal (`/drivers/:driverId/licenses/new`, `/drivers/:driverId/licenses/:licenseId`)
- **Permission required:** `license:create` (create) or `license:update` (edit)
- **Fields:**
  - License Class (dropdown, required, loaded from `/license-classes`)
  - License Number (text, required, ≤12 chars)
  - Expiry Date (date, required, must be in future)
- **Behaviors:**
  - On submit: POST `/drivers/:driverId/licenses` (create) or PATCH (edit)
  - On success: close modal, refresh driver detail
  - On validation fail: show inline errors
- **Warnings:** Show "Expiring soon" if expiry ≤30 days from today

### Driver Detail Screen (`/drivers/:id`)
- **Layout:** Tabbed view (Personal tab + Licenses tab)
- **Personal tab:** All driver fields in display mode (editable via "Edit" button)
- **Licenses tab:** Table of all licenses for this driver
  - Columns: Class, License Number, Expiry, Days Until Expiry, Status, Actions
  - Highlight expiring (≤30 days) in yellow, expired in red
  - "Issue New License" button
  - Row actions: Edit, Revoke

## API Endpoints

| Method | Path | Permission | Description |
|--------|------|-----------|---|
| GET | `/drivers` | `driver:read` | List drivers (paginated, filterable by poolSiteId, employmentStatus, search) |
| GET | `/drivers/:id` | `driver:read` | Get driver detail + licenses |
| POST | `/drivers` | `driver:create` | Register new driver |
| PATCH | `/drivers/:id` | `driver:update` | Update driver (address, contact, photo, notes) |
| DELETE | `/drivers/:id` | `driver:delete` | Soft-delete driver |
| GET | `/license-classes` | — | List SIM classes (A, BI, BII, C, D) |
| POST | `/drivers/:driverId/licenses` | `license:create` | Issue driver license |
| PATCH | `/drivers/:driverId/licenses/:licenseId` | `license:update` | Update license (expiry, number) |
| DELETE | `/drivers/:driverId/licenses/:licenseId` | `license:delete` | Revoke license |

## Business Rules

1. **KTP format:** Exactly 16 digits, validated server-side
2. **Age validation:** Birth date must result in age ≥17 years
3. **Pool assignment required:** Every driver must have poolSiteId (cannot be null)
4. **License expiry warnings:** Show yellow if ≤30 days to expiry; red if expired
5. **Multiple licenses per driver:** A driver can hold multiple classes (A, BI, BII, etc.)
6. **License uniqueness:** No unique constraint on (driverId, licenseClassId) — driver can have multiple licenses of same class (unlikely but possible)
7. **License validity in crew schedule:** When creating crew schedule, system should warn if driver has no valid non-expired license
8. **Soft delete:** Driver removed from list but crew schedules and trip assignments reference it (integrity maintained)
9. **Employment status:** Fixed enum (SATGAS, PNS, HONORER); used for reporting and crew management

## Permissions

- `driver:read` — view driver list/detail
- `driver:create` — register new driver
- `driver:update` — edit driver (address, contact, photo, notes)
- `driver:delete` — soft-delete driver
- `license:read` — view driver licenses
- `license:create` — issue new driver license
- `license:update` — update license (expiry, number)
- `license:delete` — revoke license

## Acceptance Criteria

- POST `/drivers` with valid KTP (16 digits), name, pool, employment status → 201, driver created
- POST `/drivers` with KTP ≠ 16 digits → 422, "KTP harus 16 digit"
- POST `/drivers` with birth date ≤17 years ago → 422, "Pengemudi harus berusia minimal 17 tahun"
- GET `/drivers?employmentStatus=PNS` → returns only PNS drivers
- GET `/drivers?poolSiteId=5` → returns only drivers at that pool
- GET `/drivers/:id` returns all driver fields and licenses array
- POST `/drivers/:id/licenses` with valid class, number, future expiry → 201, license created
- POST `/drivers/:id/licenses` with expiry in past → 422, "Tanggal berlaku harus di masa depan"
- PATCH `/drivers/:id/licenses/:licenseId` updates expiry/number without changing class
- DELETE `/drivers/:id/licenses/:licenseId` removes license, GET returns updated array
- Driver list shows license count and highlights rows with expiring/expired licenses
- GET `/drivers/:id` returns warning indicator if any license is expiring (≤30 days)

## Test Cases

### Unit
- `validateKTP("1234567890123456")` → valid
- `validateKTP("123456789012345")` → invalid (15 digits)
- `validateKTP("abc")` → invalid (non-digits)
- `calculateAge(birthDate)` → correct age in years
- `isLicenseExpiring(expiry)` → true if expiry ≤30 days from today and in future
- `isLicenseExpired(expiry)` → true if expiry < today

### Integration
- POST `/drivers` with valid data → 201, driver.poolSiteId set
- PATCH `/drivers/:id` updates only provided fields (address, contact, photo, notes)
- GET `/drivers/:id` returns driver object + licenses array
- POST `/drivers/:id/licenses` with valid class → 201, DriverLicense created with correct driverId
- PATCH `/drivers/:id/licenses/:licenseId` only updates expiry, number (not class)
- DELETE `/drivers/:id/licenses/:licenseId` removes entry, GET `/drivers/:id` no longer shows it
- GET `/drivers?poolSiteId=3` returns only drivers at that pool
- GET `/license-classes` returns array of all license classes

### E2E
- Admin registers driver → appears in list with KTP, name, employment status
- Admin issues license (class BI, expiry 2026-12-31) → appears in driver detail, status "Valid"
- Admin issues second license (class C) → both appear in driver detail
- Admin updates license expiry to 2026-06-15 (≤30 days from today) → highlighted in yellow
- Admin revokes license class BI → disappears from list, only C remains
- Admin soft-deletes driver → removed from list, GET `/drivers/:id` returns 404 or 403
- Crew schedule creation warns if assigned driver has no valid licenses
