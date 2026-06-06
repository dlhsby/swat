# 09-Master-Waste-Fuel — Waste Sources & Fuel Reference Data

## Overview

The waste-fuel module manages the two key reference-data catalogs: waste sources (categories of waste that vehicles collect: Dinas, Rekanan, Pasar, etc.) and fuel types with pricing. Waste sources are assigned to vehicles to define their operational scope; fuel reference data (fuels and categories) is mostly seed data supporting the fleet module. This is primarily a configuration/lookup module, lightly used in day-to-day operations but critical for reporting and authorization.

## Entities

### WasteSource
- **Fields:**
  - `id` (Int, PK)
  - `legacyId` (Int?, unique) — for migration traceability
  - `code` (String, unique, ≤5 chars) — short identifier (D, R, PS, PU, PL, S)
  - `name` (String, ≤128 chars)
  - `notes` (String?, ≤1024 chars) — description/details
  - `createdAt`, `updatedAt` (Timestamptz, UTC)
- **Validation:**
  - `code`: non-empty, unique, max 5 chars, alphanumeric + underscore
  - `name`: non-empty, max 128 chars
- **Seed values:**
  | Code | Name | Notes |
  |------|------|-------|
  | D | Dinas | Waste from government offices |
  | R | Rekanan | Waste from contractors/partners |
  | PS | Pasar | Market waste |
  | PU | Pintu Air | Drainage/canal area waste |
  | PL | Pelabuhan | Port waste |
  | S | Swasta | Private/commercial waste |

### Fuel (Reference)
- **Fields:**
  - `id` (Int, PK)
  - `legacyId` (Int?, unique) — for migration traceability
  - `fuelCategoryId` (FK → FuelCategory)
  - `name` (String, unique, ≤100 chars)
  - `pricePerLiter` (Int, IDR, ≥0) — price per liter in rupiah
  - `createdAt`, `updatedAt` (Timestamptz, UTC)
- **Validation:**
  - `name`: non-empty, unique, max 100 chars
  - `pricePerLiter`: non-negative integer (IDR)
- **Seed values:**
  | Name | Category | Default Price (IDR) |
  |------|----------|-----|
  | Premium | Bersubsidi | 10000 |
  | Pertamax | Non-Subsidi | 11000 |
  | Solar Keekonomian | Bersubsidi | 6500 |
  | Solar | Non-Subsidi | 8000 |
  | Pertalite | Bersubsidi | 9500 |
  | Dexlite | Non-Subsidi | 9500 |

### FuelCategory (Reference)
- **Fields:**
  - `id` (Int, PK)
  - `legacyId` (Int?, unique) — for migration traceability
  - `name` (String, unique, ≤20 chars)
  - `createdAt`, `updatedAt` (Timestamptz, UTC)
- **Validation:**
  - `name`: non-empty, unique, max 20 chars
- **Seed values:**
  - Bersubsidi (Subsidized)
  - Non-Subsidi (Non-subsidized)

## User Stories

- As an **admin**, I want to view all waste sources (code, name, notes), so I understand what waste categories exist.
- As an **admin**, I want to create or update a waste source, so new source categories can be added if the network changes.
- As an **fleet admin**, I want to view all fuels and their current prices, so dispatch/billing knows fuel costs.
- As an **fuel admin**, I want to update fuel prices (per-liter cost), so pricing reflects market changes.
- As a **report analyst**, I want to see fuel and waste source in transaction records, so I can analyze by source and fuel type.

## Screens

### Waste Source List Screen (`/waste-sources`)
- **Permission required:** `waste-source:read`
- **Layout:** Paginated table (20 rows)
- **Columns:** Code, Name, Notes (truncated), Created, Updated, Actions
- **Search:** Search box (code/name)
- **Buttons:** "Add Waste Source" (if `waste-source:create`)
- **Row actions:** View/Edit, Delete (if `waste-source:delete` and not assigned to vehicles)

### Waste Source Form Screen (`/waste-sources/new`, `/waste-sources/:id`)
- **Permission required:** `waste-source:create` (create) or `waste-source:update` (edit)
- **Fields:**
  - Code (text, required, unique, ≤5 chars, alphanumeric+underscore)
  - Name (text, required, max 128 chars)
  - Notes (textarea, optional, max 1024 chars)
- **Behaviors:**
  - On submit: POST `/waste-sources` (create) or PATCH `/waste-sources/:id` (edit)
  - On duplicate code: show error "Kode sudah digunakan"
  - On success: show toast, redirect to `/waste-sources`

### Fuel List Screen (`/fuels`)
- **Permission required:** `fuel:read`
- **Layout:** Paginated table (20 rows)
- **Columns:** Name, Category (Bersubsidi/Non-Subsidi), Price/Liter (IDR), Created, Updated, Actions
- **Filters:** Category dropdown
- **Search:** Search box (name)
- **Buttons:** "Add Fuel" (if `fuel:create`)
- **Row actions:** Edit price, Delete (if `fuel:delete` and not assigned to vehicle models)

### Fuel Form Screen (`/fuels/new`, `/fuels/:id`)
- **Permission required:** `fuel:create` (create) or `fuel:update` (edit)
- **Fields:**
  - Name (text, required, unique, max 100 chars) — display-only in edit mode
  - Category (dropdown, required, loaded from `/fuel-categories`)
  - Price per Liter (number, required, IDR, ≥0)
- **Behaviors:**
  - On submit: POST `/fuels` (create) or PATCH `/fuels/:id` (edit)
  - On duplicate name: show error "Nama bahan bakar sudah ada"
  - On success: show toast, redirect to `/fuels`

### Fuel Categories Reference (Admin)
- **Permission required:** `fuel-category:read`
- **Layout:** Simple read-only list or sidebar (Bersubsidi, Non-Subsidi)
- **Location:** Often displayed as dropdown in fuel form; master list at `/fuel-categories` (if accessible)
- **Seed-only:** Categories are typically fixed; CRUD minimized in MVP

## API Endpoints

| Method | Path | Permission | Description |
|--------|------|-----------|---|
| GET | `/waste-sources` | `waste-source:read` | List waste sources (paginated, searchable by code/name) |
| POST | `/waste-sources` | `waste-source:create` | Create waste source |
| PATCH | `/waste-sources/:id` | `waste-source:update` | Update waste source (name, notes) |
| DELETE | `/waste-sources/:id` | `waste-source:delete` | Delete waste source (only if no vehicles assigned) |
| GET | `/fuels` | `fuel:read` | List all fuels (name, price/liter, category) |
| POST | `/fuels` | `fuel:create` | Add fuel product (name, category, price) |
| PATCH | `/fuels/:id` | `fuel:update` | Update fuel (price/liter) |
| DELETE | `/fuels/:id` | `fuel:delete` | Delete fuel (only if no vehicle models use it) |
| GET | `/fuel-categories` | `fuel-category:read` | List fuel categories (Bersubsidi, Non-Subsidi) |

## Business Rules

1. **Waste source code uniqueness:** Global, case-sensitive, format alphanumeric+underscore
2. **Fuel name uniqueness:** Global, case-sensitive
3. **Waste source deletion:** Only allowed if no vehicles are assigned to that source
4. **Fuel deletion:** Only allowed if no vehicle models default to that fuel
5. **Seed data immutable:** Categories are fixed; do not delete (though technically allowed)
6. **Price updates:** Fuel price changes are a point-in-time update (no versioning; historical price tracking is Phase 2)
7. **Waste source assignment:** Vehicles can be assigned multiple waste sources (M:N via `VehicleWasteSource`)

## Permissions

- `waste-source:read` — view waste source list
- `waste-source:create` — create waste source
- `waste-source:update` — update waste source
- `waste-source:delete` — delete waste source (if safe)
- `fuel:read` — view fuel list + prices
- `fuel:create` — add fuel product
- `fuel:update` — update fuel prices
- `fuel:delete` — delete fuel (if safe)
- `fuel-category:read` — view fuel categories

## Acceptance Criteria

- POST `/waste-sources` with valid code, name → 201, waste source created
- POST `/waste-sources` with duplicate code → 409, "Kode sudah digunakan"
- GET `/waste-sources?search=Pasar` → returns waste source with code PS or name containing "Pasar"
- PATCH `/waste-sources/:id` updates name/notes without changing code
- POST `/fuels` with valid name, category, price → 201, fuel created
- POST `/fuels` with duplicate name → 409, "Nama bahan bakar sudah ada"
- PATCH `/fuels/:id` updates price without changing name/category
- GET `/fuels?category=Bersubsidi` → returns subsidized fuels only
- DELETE `/waste-sources/:id` with assigned vehicles → 409
- DELETE `/fuels/:id` with assigned models → 409
- GET `/fuel-categories` returns array of [Bersubsidi, Non-Subsidi]

## Test Cases

### Unit
- `validateWasteSourceCode("PS")` → valid
- `validateWasteSourceCode("PS123")` → valid (5 chars)
- `validateWasteSourceCode("PS1234")` → invalid (6 chars)
- `validateWasteSourceCode("PS ")` → invalid (space)

### Integration
- POST `/waste-sources` with D, Dinas, notes → 201, code unique in database
- POST `/waste-sources` duplicate code D → 409
- PATCH `/waste-sources/:id` only updates name/notes, code unchanged
- GET `/waste-sources` returns array of all sources (non-paginated in Phase 1 if count <50)
- POST `/fuels` with Premium, Bersubsidi, 10000 → 201
- PATCH `/fuels/:id` updates pricePerLiter to 11000 → 200, name/category unchanged
- GET `/fuels` returns array sorted by category then name
- DELETE `/waste-sources/:id` if assigned to vehicle → 409
- DELETE `/fuels/:id` if assigned to model → 409

### E2E
- Admin views waste sources → sees seed values (D, R, PS, PU, PL, S)
- Admin adds new waste source code X, name "Experimental" → appears in list
- Admin views fuels → sees seed values (Premium, Pertamax, Solar, etc.)
- Admin updates Solar price to 9000 → GET shows new price
- Crew schedule form references fuel list → shows updated prices
- Vehicle assignment to waste source uses updated list → no stale data

## Cross-Module Notes

- **Vehicle assignment:** When assigning waste sources to vehicles in master-fleet module, dropdown is populated from `/waste-sources`
- **Crew schedule:** When recording fuel in transactions, fuel names come from `/fuels` list
- **Reports (Phase 2):** Aggregations group tonnage by `WasteSource.code` and fuel usage by `Fuel.fuelCategory`
- **Migration:** Seed waste sources and fuels from legacy `kategorisumbersampah` and `bahanbakar` tables (see migration spec)
