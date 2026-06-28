# 09-Master-Geography — Sites & Routes

## Overview

The geography module manages physical locations (pools, SPBU fuel stations, TPS collection points, TPA disposal sites) and directed routes between them (with distance and category: pickup leg, disposal leg, refuel, etc.). Every trip leg is recorded against a route; fuel quotas and operational authorizations reference sites. Sites are the anchors of the transport network.

## Entities

### Site
- **Fields:**
  - `id` (Int, PK)
  - `legacyId` (Int?, unique) — for migration traceability
  - `type` (SiteType enum: POOL, SPBU, TPS, TPA)
  - `name` (String, ≤256 chars)
  - `address` (String, ≤512 chars)
  - `photo` (Photo?, 0..1 relation) — site photo (object-storage backed; see [`12-scalability-archiving.md`](../12-scalability-archiving.md) §6)
  - `latitude` (Decimal?, 11,6 precision for WGS84) — null if not set
  - `longitude` (Decimal?, 11,6 precision for WGS84) — null if not set
  - `createdAt`, `updatedAt` (Timestamptz, UTC)
  - `deletedAt` (Timestamptz?, soft delete)
- **Validation:**
  - `type`: required, one of POOL, SPBU, TPS, TPA
  - `name`: non-empty, max 256 chars
  - `address`: non-empty, max 512 chars
  - `latitude`, `longitude`: if both present, validate as valid WGS84 (±90° lat, ±180° lng); if only one present, reject

### Route
- **Fields:**
  - `id` (Int, PK)
  - `legacyId` (Int?, unique) — for migration traceability
  - `category` (RouteCategory enum: DEPART_POOL, REFUEL, PICKUP, DISPOSAL, RETURN_POOL)
  - `originSiteId` (FK → Site)
  - `destinationSiteId` (FK → Site)
  - `distanceKm` (Int, ≥0)
  - `createdAt`, `updatedAt` (Timestamptz, UTC)
  - Composite unique: `(originSiteId, destinationSiteId, category)`
- **Validation:**
  - `originSiteId` ≠ `destinationSiteId` (route endpoints distinct)
  - `distanceKm`: non-negative integer
  - Unique composite: `(originSiteId, destinationSiteId, category)` prevents duplicate routes
- **Map-derived geometry (Phase 7, revised by Epic 7.8):** a `Route` now **owns 1..N `Corridor`s** — a
  road-snapped **default** ("Jalur Utama", `isDefault`, exactly one per route) plus optional alternates,
  each a buffered polyline drawn on **Google Maps**. The default corridor is **auto-created when the route
  is created and re-generated when it is edited** (server-side road-snap via `GoogleDirectionsService` /
  `GOOGLE_MAPS_SERVER_KEY`; straight-line fallback when a site has no coordinates yet). **The corridor owns
  the route's planned distance** (`Corridor.lengthMeters`, `ST_Length`); `Route.distanceKm` is a
  **denormalized cache** auto-synced from the default corridor on any corridor mutation. A `TripTemplate`
  / day's `Trip` may point at a specific corridor (`corridorId`, else inherits the route default); a
  single day's `Trip` may still carry a freehand `geometryOverride`. The old 1:1 `RouteGeometry` is
  **superseded** by this model. See [`gps-tracking.md`](./gps-tracking.md). This also supersedes the
  earlier "coordinates deferred" note.

## User Stories

- As an **operations admin**, I want to register a new site (pool, SPBU, TPS, TPA) with name, address, and optional coordinates, so the network is complete.
- As an **operations admin**, I want to view all sites, filter by type (POOL/SPBU/TPS/TPA), search by name, so I can find locations.
- As an **operations admin**, I want to update a site's address, coordinates, or photo, so information stays accurate.
- As an **operations admin**, I want to soft-delete a site, so historical routes and data remain intact.
- As an **operations admin**, I want to define routes between two sites with a distance and category (pickup, disposal, refuel), so the system knows valid paths.
- As an **operations admin**, I want to view all routes, filter by origin/destination/category, so I can review the transport network.
- As an **operations admin**, I want to update a route's distance, so real-world distances are reflected.
- As an **operations admin**, I want to prevent duplicate routes (same origin, destination, category) from being created.

## Screens

### Site List Screen (`/sites`)
- **Permission required:** `site:read`
- **Layout:** Paginated table (20/50/100 rows) + optional map view (toggle)
- **Table Columns:** Name, Type (POOL/SPBU/TPS/TPA), Address, Coordinates (lat/lng), Photo, Created, Actions
- **Filters:** Type dropdown (POOL / SPBU / TPS / TPA / All), Search box (name/address)
- **Sorting:** name, type, created date
- **Buttons:** "Register Site" (if `site:create`)
- **Row actions:** View detail, Edit (if `site:update`), Delete (if `site:delete`)
- **Map view (optional):** Show all sites as markers on OpenStreetMap or similar; click marker to view site detail

### Site Form Screen (`/sites/new`, `/sites/:id`)
- **Permission required:** `site:create` (create) or `site:update` (edit)
- **Tabs:** Basic, Location, Photo
- **Tab 1 — Basic:**
  - Name (text, required, max 256 chars)
  - Type (radio, required: POOL / SPBU / TPS / TPA)
  - Address (textarea, required, max 512 chars)
- **Tab 2 — Location:**
  - Latitude (decimal, optional, ±90)
  - Longitude (decimal, optional, ±180)
  - **Map picker:** Interactive map; click to set coordinates; drag to move marker; both or neither required
  - Validation message: "Harus mengisi kedua koordinat atau tidak ada keduanya"
- **Tab 3 — Photo:**
  - Photo (file upload or object-storage URL, optional; uses pre-signed URLs)
- **Behaviors:**
  - On submit: POST `/sites` (create) or PATCH `/sites/:id` (edit)
  - On success: show toast, redirect to `/sites`
  - Validate: if one of lat/lng present, reject; both or neither

### Route List Screen (`/routes`)
- **Permission required:** `route:read`
- **Layout:** Paginated table (20/50/100 rows)
- **Columns:** Origin, Destination, Category (PICKUP/DISPOSAL/REFUEL/etc.), Distance (km), Created, Actions
- **Filters:** Category dropdown, Origin site dropdown, Destination site dropdown, Search box (origin+destination name)
- **Sorting:** origin, destination, distance, category
- **Buttons:** "Define Route" (if `route:create`)
- **Row actions:** View detail, Edit distance, Delete (if `route:delete` and no trips assigned)

### Route Form Screen (`/routes/new`, `/routes/:id`)
- **Permission required:** `route:create` (create) or `route:update` (edit)
- **Fields:**
  - Origin Site (dropdown, required, all sites except destination)
  - Destination Site (dropdown, required, all sites except origin)
  - Category (dropdown, required: DEPART_POOL / REFUEL / PICKUP / DISPOSAL / RETURN_POOL)
  - Distance (km) (number, required, ≥0)
  - **Auto-calculate distance (optional):** If both coordinates set, show calculated straight-line distance (informational only)
- **Behaviors:**
  - On submit: POST `/routes` (create) or PATCH `/routes/:id` (edit)
  - On success: show toast, redirect to `/routes`
  - On duplicate (origin, destination, category): show error "Rute ini sudah terdaftar"
  - On invalid endpoints (origin = destination): show "Titik asal dan tujuan harus berbeda"
  - Disable category if both sites already have a route with that category

## API Endpoints

| Method | Path | Permission | Description |
|--------|------|-----------|---|
| GET | `/sites` | `site:read` | List sites (paginated, filterable by type, search by name) |
| GET | `/sites/:id` | `site:read` | Get site detail (location, photo) |
| POST | `/sites` | `site:create` | Register new site (POOL/SPBU/TPS/TPA) |
| PATCH | `/sites/:id` | `site:update` | Update site (address, coords, photo) |
| DELETE | `/sites/:id` | `site:delete` | Soft-delete site |
| GET | `/routes` | `route:read` | List routes (paginated, filterable by category, origin, destination) |
| GET | `/routes/:id` | `route:read` | Get route (origin, destination, distance, category) |
| POST | `/routes` | `route:create` | Define route (origin, destination, distanceKm, category) |
| PATCH | `/routes/:id` | `route:update` | Update route (distance) |
| DELETE | `/routes/:id` | `route:delete` | Delete unused route |

## Business Rules

1. **Site type required:** Every site must have a type (POOL, SPBU, TPS, TPA)
2. **Coordinates all-or-nothing:** Either both latitude and longitude are set, or both are null; reject if only one is present
3. **Route endpoints distinct:** `originSiteId` ≠ `destinationSiteId` (no self-loops)
4. **Route uniqueness:** Composite unique constraint on `(originSiteId, destinationSiteId, category)` prevents duplicates
5. **Soft delete:** Deleted sites excluded from new route/vehicle assignments but historical data intact
6. **Photo optional:** Sites can operate without photos; optional field for convenience
7. **Distance non-negative:** Zero distance allowed (same-site operations, e.g., internal refueling); negative rejected
8. **Route deduplication:** During import/migration, flag and consolidate duplicate (origin, destination, category) triples (see migration spec)

## Permissions

- `site:read` — view site list/detail
- `site:create` — register new site
- `site:update` — edit site (address, coords, photo)
- `site:delete` — soft-delete site
- `route:read` — view route list/detail
- `route:create` — define new route
- `route:update` — update route distance
- `route:delete` — delete unused route

## Acceptance Criteria

- POST `/sites` with valid type, name, address → 201, site created
- POST `/sites` with only latitude (no longitude) → 422, "Harus mengisi kedua koordinat atau tidak ada keduanya"
- PATCH `/sites/:id` updates only provided fields
- GET `/sites?type=TPA` → returns only TPA sites
- GET `/sites/:id` returns all fields including coordinates and photo
- POST `/routes` with valid origin, destination, category, distance → 201, route created
- POST `/routes` with duplicate (origin, destination, category) → 409, "Rute ini sudah terdaftar"
- POST `/routes` with origin = destination → 422, "Titik asal dan tujuan harus berbeda"
- PATCH `/routes/:id` updates distance without changing origin/destination/category
- GET `/routes?category=PICKUP` → returns only PICKUP category routes
- GET `/routes?originSiteId=5` → returns only routes departing from site 5
- Route form disables category dropdown if that (origin, destination, category) triple already exists

## Test Cases

### Unit
- `validateSiteCoordinates(lat, lng)` → {valid: true/false, errors: []}
  - (10.5, 120.5) → valid
  - (10.5, null) → invalid
  - (91, 120) → invalid (latitude out of range)
  - (null, null) → valid (both null)
- `validateRouteEndpoints(originId, destinationId)` → true/false
  - (5, 5) → false
  - (5, 7) → true

### Integration
- POST `/sites` with name, address, type → 201, site.deletedAt is null
- POST `/sites` with coordinates → 201, both lat/lng stored
- PATCH `/sites/:id` with new address → 200, only address updated
- GET `/sites?type=POOL` returns only POOL sites
- POST `/routes` with valid endpoints and category → 201, route created with unique constraint
- POST `/routes` duplicate (origin, dest, category) → 409
- POST `/routes` with origin = destination → 422
- GET `/routes?originSiteId=5` returns routes from site 5
- DELETE `/routes/:id` removes route, GET returns 404
- PATCH `/routes/:id` updates distance, origin/destination/category unchanged

### E2E
- Admin registers Pool Wonokromo → appears in site list, type POOL
- Admin sets coordinates for pool → map picker shows marker
- Admin registers TPS Kedurus → appears in site list, type TPS
- Admin defines route Pool → TPS, PICKUP, 15 km → appears in route list
- Admin tries to define duplicate → error "Rute ini sudah terdaftar"
- Admin edits route distance to 16 km → GET shows updated distance
- Admin deletes route → removed from list
- Admin soft-deletes site → no longer appears in dropdown for new routes
