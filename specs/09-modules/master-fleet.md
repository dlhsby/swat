# 09-Master-Fleet — Vehicles, Models, Applications, Fuels

## Overview

The fleet module manages vehicle master data: vehicle registration (plate number, chassis, engine number, condition), vehicle models (brand + specifications), vehicle applications (body types: Compactor, Dump Truck, Arm Roll), fuels (products + pricing), and the M:N mapping of waste sources to vehicles. This is the foundation for scheduling and daily operations; all transaction records reference vehicles here.

## Entities

### Vehicle
- **Fields:**
  - `id` (Int, PK)
  - `legacyId` (Int?, unique) — for migration traceability
  - `poolSiteId` (FK → Site) — assigned pool/depot
  - `modelId` (FK → VehicleModel)
  - `status` (VehicleStatus enum: GOOD, MINOR_DAMAGE, MAJOR_DAMAGE, LOST)
  - `plateNumber` (String, unique, ≤10 chars)
  - `chassisNumber` (String, ≤100 chars)
  - `engineNumber` (String, ≤100 chars)
  - `manufactureYear` (Int?, range 1900–current+1)
  - `currentFuelRatio` (Int, ≥1, default 1) — current fuel efficiency (km per liter), editable to reflect vehicle degradation
  - `currentTareWeight` (Int, kg)
  - `currentOdometer` (Int, km)
  - `registrationExpiry` (DateTime, date only, format YYYY-MM-DD) — STNK expiry date
  - `taxExpiry` (DateTime, date only, format YYYY-MM-DD) — vehicle tax expiry date
  - `photo` (Photo?, 0..1 relation) — vehicle photo (object-storage backed; see [`12-scalability-archiving.md`](../12-scalability-archiving.md) §6)
  - `notes` (String?, ≤512 chars)
  - `createdAt`, `updatedAt` (Timestamptz, UTC)
  - `deletedAt` (Timestamptz?, soft delete)
- **Validation:**
  - `plateNumber`: unique, case-sensitive, format regex `^[A-Z]{1,2} \d{1,4} [A-Z]{1,3}$` (e.g., "L 1234 AB" or "BK 5678 XYZ"; note: spaces, not hyphens)
  - `chassisNumber`: non-empty
  - `engineNumber`: non-empty
  - `manufactureYear`: integer 1900 to current+1; legacy 1900 → null
  - `currentTareWeight`, `currentOdometer`: non-negative integers
  - `registrationExpiry`, `taxExpiry`: dates in future (warn if ≤30 days)

### VehicleModel
- **Fields:**
  - `id` (Int, PK)
  - `legacyId` (Int?, unique) — for migration traceability
  - `applicationId` (FK → VehicleApplication)
  - `fuelId` (FK → Fuel) — default fuel type
  - `brand` (String, ≤100 chars) — merk (e.g., "Hino", "Isuzu")
  - `fuelTankCapacity` (Int, liters) — tank size
  - `normalFuelRatio` (Int, ≥1, default 1) — expected fuel efficiency (km per liter), baseline for model
  - `normalTareWeight` (Int, kg) — typical empty weight (baseline for model)
  - `maxNetLoad` (Int?, kg) — maximum payload
  - `maxNetVolume` (Int?, m3) — cargo volume capacity
  - `wheelCount` (Int)
  - `createdAt`, `updatedAt` (Timestamptz, UTC)
- **Validation:**
  - `brand`: non-empty, max 100 chars
  - `fuelTankCapacity`, `normalTareWeight`, `maxNetLoad`, `maxNetVolume`, `wheelCount`: non-negative integers

### VehicleApplication
- **Fields:**
  - `id` (Int, PK)
  - `legacyId` (Int?, unique) — for migration traceability
  - `name` (String, unique, ≤100 chars)
  - `createdAt`, `updatedAt` (Timestamptz, UTC)
- **Validation:**
  - `name`: non-empty, max 100 chars
- **Seed values:** Compactor, Dump Truck, Arm Roll, Tipper, Flatbed

### Fuel
- **Fields:**
  - `id` (Int, PK)
  - `fuelCategoryId` (FK → FuelCategory)
  - `name` (String, unique, ≤100 chars)
  - `pricePerLiter` (Int, IDR)
- **Validation:**
  - `name`: non-empty, unique, max 100 chars
  - `pricePerLiter`: non-negative integer (IDR)
- **Seed values:** Premium, Pertamax, Solar Keekonomian, Solar, Pertalite, Dexlite

### FuelCategory
- **Fields:**
  - `id` (Int, PK)
  - `name` (String, unique, ≤20 chars)
- **Validation:**
  - `name`: non-empty, unique
- **Seed values:** Bersubsidi (Subsidized), Non-Subsidi (Non-subsidized)

### VehicleWasteSource
- **Fields:**
  - `id` (Int, PK, autoincrement)
  - `vehicleId` (FK → Vehicle, CASCADE delete)
  - `wasteSourceId` (FK → WasteSource)
  - Composite unique: `(vehicleId, wasteSourceId)` enforces one-to-one assignment per vehicle-source pair
- **Validation:**
  - Both FKs must exist; no duplicate (vehicleId, wasteSourceId) pairs
  - Deletion of vehicle cascades to all VehicleWasteSource mappings; deletion of waste source is prevented if assigned to any vehicles

## User Stories

- As a **fleet admin**, I want to register a new vehicle with plate number, model, pool site, and condition, so the vehicle enters the system.
- As a **fleet admin**, I want to view vehicle list, filter by status/pool/model/search plate, so I can track the fleet.
- As a **fleet admin**, I want to update a vehicle's odometer, tare weight, and STNK/tax expiry dates, so records stay current.
- As a **fleet admin**, I want to mark a vehicle as damaged or lost, so dispatch knows its availability.
- As a **fleet admin**, I want to soft-delete a vehicle, so historical transactions remain intact.
- As a **fleet admin**, I want to manage vehicle models (brand, tank capacity, specs), so new vehicle types can be registered.
- As a **fleet admin**, I want to assign waste sources (D, R, PS, PU, PL, S) to vehicles, so the system knows which sources each vehicle serves.

## Screens

### Vehicle List Screen (`/vehicles`)
- **Permission required:** `vehicle:read`
- **Layout:** Paginated table (20/50/100 rows)
- **Columns:** Plate, Model/Brand, Status (GOOD/MINOR_DAMAGE/MAJOR_DAMAGE/LOST), Pool, Odometer, Tare (kg), STNK Expiry, Tax Expiry, Updated date, Actions
- **Filters:** Status dropdown, Pool (site) dropdown, Search box (plate/chassis/engine/model brand)
- **Sorting:** plate, status, odometer, expiry dates
- **Buttons:** "Register Vehicle" (if `vehicle:create`)
- **Row actions:** View detail, Edit, Delete (if `vehicle:delete`)
- **Warnings:** Highlight rows with STNK/tax expiry ≤30 days in yellow; LOST in red

### Vehicle Form Screen (`/vehicles/new`, `/vehicles/:id`)
- **Permission required:** `vehicle:create` (create) or `vehicle:update` (edit)
- **Tabs:** Basic, Model & Specs, Waste Sources, Photo
- **Tab 1 — Basic:**
  - Plate Number (text, required, format: 1-2 letters + space + 1-4 digits + space + 1-3 letters, uppercase only; e.g., "L 1234 AB")
  - Chassis Number (text, required)
  - Engine Number (text, required)
  - Manufacture Year (number, optional, 1900–current+1)
  - Current Odometer (number, required, ≥0)
  - Current Tare Weight (number, required, kg, ≥0)
  - Pool Site (dropdown, required, loaded from `/sites?type=POOL`)
  - Status (radio: GOOD / MINOR_DAMAGE / MAJOR_DAMAGE / LOST)
- **Tab 2 — Model & Specs:**
  - Model (dropdown, required, filtered by application)
  - Application (dropdown, required: Compactor, Dump Truck, Arm Roll, Tipper, Flatbed)
  - Brand (auto-filled from selected model)
  - Fuel Tank Capacity (auto-filled, display-only)
  - Normal Fuel Ratio (auto-filled from model, editable)
  - Current Fuel Ratio (number, default 1, editable)
  - Registration Expiry (STNK, date, required; warn if ≤30 days)
  - Tax Expiry (date, required; warn if ≤30 days)
- **Tab 3 — Waste Sources:**
  - Assigned Waste Sources (multi-select checkboxes: D, R, PS, PU, PL, S)
  - Load from `/vehicles/:id/waste-sources` on edit
- **Tab 4 — Photo:**
  - Photo (file upload or object-storage URL, optional; uses pre-signed URLs)
- **Behaviors:**
  - On submit: POST `/vehicles` (create) or PATCH `/vehicles/:id` (edit)
  - On success: show toast, redirect to `/vehicles`
  - On plate conflict: show "Nomor polisi sudah terdaftar"
  - On model select: auto-fill brand, tank capacity, tare weight from model specs

### Vehicle Model List Screen (`/vehicle-models`)
- **Permission required:** `vehicle-model:read`
- **Layout:** Paginated table (20 rows)
- **Columns:** Brand, Application, Tank Capacity, Tare Weight, Max Load, Wheel Count, Created, Actions
- **Buttons:** "Add Model" (if `vehicle-model:create`)
- **Row actions:** Edit, Delete (if `vehicle-model:delete` and no vehicles assigned)

### Vehicle Model Form Screen (`/vehicle-models/new`, `/vehicle-models/:id`)
- **Permission required:** `vehicle-model:create` (create) or `vehicle-model:update` (edit)
- **Fields:**
  - Brand (text, required, max 100 chars)
  - Application (dropdown, required)
  - Default Fuel (dropdown, required, FK to Fuel)
  - Fuel Tank Capacity (number, required, liters)
  - Normal Fuel Ratio (number, default 1)
  - Normal Tare Weight (number, required, kg)
  - Max Net Load (number, optional, kg)
  - Max Net Volume (number, optional, m3)
  - Wheel Count (number, required)
- **Behaviors:**
  - On submit: POST `/vehicle-models` (create) or PATCH `/vehicle-models/:id` (edit)
  - On success: show toast, redirect to `/vehicle-models`

### Vehicle Applications Dropdown (Reference)
- **Seed values:** Compactor, Dump Truck, Arm Roll, Tipper, Flatbed
- **Location:** Loaded dynamically in vehicle model form
- **Admin CRUD:** Available via `/vehicle-applications` endpoint (if `vehicle-application:*` permissions)

### Fuel & Fuel Category Reference (see master-waste-fuel module)
- **FuelCategory:** Bersubsidi, Non-Subsidi (seed data; see [`master-waste-fuel.md`](master-waste-fuel.md))
- **Fuel:** Premium, Pertamax, Solar Keekonomian, Solar, Pertalite, Dexlite (editable prices; see [`master-waste-fuel.md`](master-waste-fuel.md))
- **VehicleModel form:** Fuel dropdown populated from `/fuels` endpoint (managed in waste-fuel module)

## API Endpoints

| Method | Path | Permission | Description |
|--------|------|-----------|---|
| GET | `/vehicles` | `vehicle:read` | List vehicles (paginated, filterable by status/poolSiteId/search) |
| GET | `/vehicles/:id` | `vehicle:read` | Get vehicle detail + model specs |
| POST | `/vehicles` | `vehicle:create` | Register new vehicle |
| PATCH | `/vehicles/:id` | `vehicle:update` | Update vehicle (status, odometer, tare, STNK/tax expiry, notes) |
| DELETE | `/vehicles/:id` | `vehicle:delete` | Soft-delete vehicle |
| GET | `/vehicle-models` | `vehicle-model:read` | List all vehicle models |
| POST | `/vehicle-models` | `vehicle-model:create` | Create model (brand + specs) |
| PATCH | `/vehicle-models/:id` | `vehicle-model:update` | Update model specs |
| DELETE | `/vehicle-models/:id` | `vehicle-model:delete` | Delete model (only if no vehicles assigned) |
| GET | `/vehicle-applications` | `vehicle-application:read` | List body/function types |
| POST | `/vehicle-applications` | `vehicle-application:create` | Create application |
| PATCH | `/vehicle-applications/:id` | `vehicle-application:update` | Update application |
| DELETE | `/vehicle-applications/:id` | `vehicle-application:delete` | Delete application (if no models assigned) |
| GET | `/vehicles/:vehicleId/waste-sources` | `vehicle:read` | Get waste sources for vehicle |
| POST | `/vehicles/:vehicleId/waste-sources/:sourceId` | `vehicle:update` | Assign waste source to vehicle |
| DELETE | `/vehicles/:vehicleId/waste-sources/:sourceId` | `vehicle:update` | Remove waste source from vehicle |

## Business Rules

1. **Plate number uniqueness:** Global, case-sensitive, format 1-2 uppercase letters + space + 1-4 digits + space + 1-3 uppercase letters (e.g., "L 1234 AB")
2. **Tare weight:** Default from VehicleModel.normalTareWeight on creation; editable (reflects wear)
3. **Odometer monotonicity:** On trip recording, never decrease (enforced in transaction module)
4. **Model deletion:** Only allowed if no vehicles reference it
5. **Waste source assignment:** Many vehicles can serve many waste sources; enforced via unique `(vehicleId, wasteSourceId)`
6. **STNK/tax expiry warnings:** Show yellow highlight if ≤30 days to expiry; red if expired
7. **Status transitions:** No restrictions; any status change allowed via PATCH
8. **Soft delete:** Vehicle removed from list but historical transactions reference it
9. **Pool site required:** Every vehicle must have a poolSiteId (cannot be null)

## Permissions

- `vehicle:read` — view vehicle list/detail
- `vehicle:create` — register new vehicle
- `vehicle:update` — edit vehicle (including odometer, tare, expiry dates, waste sources)
- `vehicle:delete` — soft-delete vehicle
- `vehicle-model:read`, `vehicle-model:create`, `vehicle-model:update`, `vehicle-model:delete`
- `vehicle-application:read`, `vehicle-application:create`, `vehicle-application:update`, `vehicle-application:delete`

Note: Fuel-related permissions (`fuel:*`, `fuel-category:read`) are declared in [`master-waste-fuel.md`](master-waste-fuel.md).

## Acceptance Criteria

- POST `/vehicles` with valid data → 201, vehicle created with poolSiteId + modelId
- POST `/vehicles` with duplicate plate → 409, "Nomor polisi sudah terdaftar"
- PATCH `/vehicles/:id` updates odometer, tare, expiry dates without resetting other fields
- GET `/vehicles?status=GOOD` → returns only GOOD vehicles
- GET `/vehicles?poolSiteId=5` → returns only vehicles at that pool
- Vehicle form auto-fills brand/tank/tare from selected model
- Waste source assignment: POST `/vehicles/:id/waste-sources/2` → entry created with unique constraint
- POST `/vehicle-models` with required fields → 201, model created
- Model deletion with active vehicles → 409
- Fuel price updates: PATCH `/fuels/:id` with new pricePerLiter → 200
- Vehicle list shows STNK/tax expiry, highlights yellow if ≤30 days, red if expired

## Test Cases

### Unit
- `validatePlateNumber("L 1234 AB")` → valid
- `validatePlateNumber("L 1234 ab")` → invalid (lowercase)
- `validatePlateNumber("L-1234-AB")` → invalid (hyphens, not spaces)
- `Vehicle.computeTareFromModel(modelId)` → returns normalTareWeight from VehicleModel
- `isExpiryWarning(date)` → true if date is ≤30 days and in future

### Integration
- POST `/vehicles` with valid plate, model, pool → 201, vehicle.modelId set
- PATCH `/vehicles/:id` only updates provided fields
- GET `/vehicles/:id` returns model details (brand, fuelTankCapacity)
- GET `/vehicle-models?applicationId=1` → filtered by application
- DELETE `/vehicle-models/:id` with active vehicles → 409
- POST `/vehicles/:id/waste-sources/2` creates VehicleWasteSource entry
- GET `/vehicles/:id/waste-sources` returns array of waste sources
- DELETE `/vehicles/:id/waste-sources/2` removes entry

### E2E
- Admin registers vehicle → appears in list with correct plate
- Admin updates odometer → GET shows new odometer, no other fields changed
- Admin marks vehicle MAJOR_DAMAGE → status shows in list
- Admin soft-deletes vehicle → removed from list, GET `/vehicles/:id` returns 404 or 403
- Admin assigns waste source D and R to vehicle → vehicle appears in both waste source queries
