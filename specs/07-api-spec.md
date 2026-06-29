# 07 — REST API Specification

## 1. API fundamentals

### 1.1 Base path & conventions

- **Base path:** `/api/v1`
- **Resource naming:** kebab-case plural (e.g., `/vehicles`, `/crew-schedules`, `/disposal-permits`)
- **HTTP verbs:**
  - `GET /resource` — list
  - `GET /resource/:id` — read one
  - `POST /resource` — create
  - `PATCH /resource/:id` — partial update
  - `DELETE /resource/:id` — delete
  - `POST /resource/:id/<action>` — custom action (e.g., `/trips/:id/verify`)
- **Status codes:** 200 (OK), 201 (Created), 204 (No Content), 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 409 (Conflict), 422 (Unprocessable Entity), 429 (Too Many Requests), 500 (Server Error)
- **Timestamps:** ISO 8601 UTC (`"2026-06-05T14:30:00Z"`)
- **Date format:** `YYYY-MM-DD`
- **Money:** integer IDR, e.g. `{"pricePerLiter": 10000}`
- **Pagination:** query params `page` (1-indexed) and `limit` (default 20, max 100)

### 1.2 ApiResponse<T> envelope

All endpoints return:

```json
{
  "success": boolean,
  "data": T | null,
  "error": ErrorObject | null,
  "meta": PaginationMeta | null
}
```

When `success: false`, `data` is `null` and `error` is populated. When `success: true`, `error` is `null`. Fields with `null` values may be omitted from the JSON response for brevity.

**ErrorObject:**
```json
{
  "code": "INVALID_INPUT" | "INVALID_CREDENTIALS" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "RATE_LIMITED" | "INTERNAL_ERROR",
  "message": "Human-readable message (Indonesian)",
  "details": [
    { "field": "plateNumber", "message": "Sudah terdaftar" }
  ]
}
```

`details` is optional and only present for validation errors (`INVALID_INPUT`, 422).

**PaginationMeta (on list responses only; omitted for single-item GETs, POSTs, and action endpoints):**
```json
{
  "total": 157,
  "page": 1,
  "limit": 20,
  "pages": 8
}
```

### 1.3 Query parameters (filtering, sorting, search)

- **Filtering:** `?status=GOOD&poolSiteId=5`
- **Sorting:** `?sort=name&order=asc` (default: creation order)
- **Search:** `?search=toyota` (full-text on name, plateNumber, etc.)
- **Date range:** `?dateFrom=2026-01-01&dateTo=2026-06-05`
- **Pagination:** `?page=2&limit=50`

### 1.4 Authentication & CSRF

- **Auth:** Session-based (httpOnly cookie from `/api/v1/auth/login`)
- **CSRF:** SameSite=Strict cookies (GET safe, POST/PATCH/DELETE require valid session)
- **Rate limiting:** 
  - `/api/v1/auth/login` max 5 failed attempts per IP per 15 min → HTTP 429 + account lock for 30 min
  - All other endpoints: max 100 requests per IP per minute (default)
- **Session timeout:** 8 hours of inactivity (browser closes cookie automatically)
- **Force password change:** On login, if response has `mustChangePassword: true`, frontend redirects to `/auth/change-password` and **blocks all other navigation** until user changes password

### 1.5 First-login / force-reset flow

When a user is created (`POST /users`) or admin triggers force-reset (`POST /auth/force-reset/:userId`), the user's `mustChangePassword` flag is set to `true`. 
On next login:
1. `/api/v1/auth/login` succeeds and returns `mustChangePassword: true`.
2. **Frontend middleware** (not backend redirect) detects this flag in the session/auth state.
3. Frontend **redirects to `/auth/change-password`** and disables navigation to other routes.
4. User submits new password via `PATCH /auth/change-password`.
5. Backend clears `mustChangePassword = false`.
6. Frontend checks the flag again and re-enables navigation to the dashboard or originally-requested page.

### 1.6 Idempotency (POST create only)

Optional: `Idempotency-Key: <UUID>` header on POST for retries (same request ID returns same 201 with same ID).

## 2. API Endpoints by module

### 2.1 Auth

| Method | Path | Permission | Description |
|--------|------|-----------|---|
| POST | `/auth/login` | — | Login with username/password → httpOnly session cookie |
| POST | `/auth/logout` | — | Logout; clears session cookie |
| GET | `/auth/me` | — | Fetch current user + permissions (frontend uses to populate menu visibility) |
| PATCH | `/auth/change-password` | — | Change own password (requires old password); clears `mustChangePassword` flag |
| POST | `/auth/request-password-reset` | — | Request password reset; sends email with token (self-service) |
| POST | `/auth/reset-password` | — | Reset password with token (self-service) |
| POST | `/auth/force-reset/:userId` | `user:manage` | Admin: force user to reset password on next login |

**Request examples:**

**POST /auth/login**
```json
{
  "username": "admin",
  "password": "SecurePassword123!"
}
```
Response 200:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "admin",
    "name": "Administrator",
    "roleId": 2,
    "roleName": "Administrator",
    "permissions": ["*:*"],
    "mustChangePassword": false
  }
}
```

**GET /auth/me**
Response 200 (authenticated):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "admin",
    "name": "Administrator",
    "roleId": 2,
    "roleName": "Administrator",
    "permissions": ["*:*"],
    "mustChangePassword": false
  }
}
```

Response 401 (not authenticated):
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Anda belum login atau sesi telah kadaluarsa"
  }
}
```

**POST /auth/login — error responses**

Response 401 (invalid credentials):
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Username atau password salah"
  }
}
```

Response 429 (account locked after failed attempts):
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Akun terkunci karena terlalu banyak percobaan login gagal. Coba lagi dalam 30 menit."
  }
}
```

**PATCH /auth/change-password**
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword456!"
}
```

**POST /auth/request-password-reset**
```json
{
  "username": "operator"
}
```
Response 200:
```json
{
  "success": true,
  "data": {
    "message": "Email reset link sent (15 min validity)"
  }
}
```

**POST /auth/reset-password**
```json
// Request
{
  "token": "reset-token-from-email",
  "newPassword": "NewPassword456!"
}

// Response 200
{
  "success": true,
  "data": {
    "message": "Kata sandi berhasil direset. Silakan login dengan kata sandi baru."
  }
}

// Response 400 (token expired or invalid)
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Token reset tidak valid atau sudah kadaluarsa. Minta link reset baru."
  }
}
```

**POST /auth/force-reset/:userId**
```json
// Request: empty or body with intent
{}

// Response 200
{
  "success": true,
  "data": {
    "id": 12,
    "username": "operator1",
    "mustChangePassword": true,
    "tempPassword": "TempPass123!" // or similar; admin communicates out-of-band per §1.5 of auth spec
  }
}

// Response 403 (no permission)
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Anda tidak memiliki izin untuk aksi ini"
  }
}

// Response 404 (user not found)
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Pengguna dengan ID 999 tidak ditemukan"
  }
}
```

### 2.2 Users & Roles

| Method | Path | Permission | Description |
|--------|------|-----------|---|
| GET | `/users` | `user:read` | List users (paginated, filterable by role) |
| GET | `/users/:id` | `user:read` | Get user detail |
| POST | `/users` | `user:create` | Create user (sets `mustChangePassword=true`; admin must communicate temp password out-of-band) |
| PATCH | `/users/:id` | `user:update` | Update user (name, photo, roleId; **not password**; use `/auth/change-password` or `/auth/force-reset`) |
| DELETE | `/users/:id` | `user:delete` | Soft-delete user |
| GET | `/roles` | `role:read` | List all roles |
| POST | `/roles` | `role:create` | Create role + assign permissions |
| PATCH | `/roles/:id` | `role:update` | Update role permissions |
| DELETE | `/roles/:id` | `role:delete` | Delete role (if not in use) |
| GET | `/permissions` | `permission:read` | List all available permissions |
| POST | `/permissions` | `permission:manage` | Create new permission (rare; system config only) |
| PATCH | `/permissions/:id` | `permission:manage` | Update permission description (rare) |

### 2.3 Fleet — Vehicles & Models

| Method | Path | Permission | Description |
|--------|------|-----------|---|
| GET | `/vehicles` | `vehicle:read` | List vehicles (filter: status, poolSiteId, search) |
| GET | `/vehicles/:id` | `vehicle:read` | Get vehicle + model specs + crew schedules |
| POST | `/vehicles` | `vehicle:create` | Register new vehicle |
| PATCH | `/vehicles/:id` | `vehicle:update` | Update vehicle (status, odometer, tare, STNK expiry, etc.) |
| DELETE | `/vehicles/:id` | `vehicle:delete` | Soft-delete vehicle |
| GET | `/vehicle-models` | `vehicle-model:read` | List all vehicle models |
| POST | `/vehicle-models` | `vehicle-model:create` | Create model (brand + specs) |
| PATCH | `/vehicle-models/:id` | `vehicle-model:update` | Update model specs |
| DELETE | `/vehicle-models/:id` | `vehicle-model:delete` | Delete unused model |
| GET | `/vehicle-applications` | `vehicle-application:read` | List body/function types (Compactor, Dump, etc.) |
| POST | `/vehicle-applications` | `vehicle-application:create` | Create application |
| PATCH | `/vehicle-applications/:id` | `vehicle-application:update` | Update application |
| DELETE | `/vehicle-applications/:id` | `vehicle-application:delete` | Delete unused application |
| GET | `/fuels` | `fuel:read` | List all fuels (name, price/liter) |
| POST | `/fuels` | `fuel:create` | Add fuel product |
| PATCH | `/fuels/:id` | `fuel:update` | Update fuel (price) |
| DELETE | `/fuels/:id` | `fuel:delete` | Delete fuel (if unused) |
| GET | `/fuel-categories` | `fuel-category:read` | List fuel categories (Subsidized, etc.) |
| POST | `/fuel-categories` | `fuel-category:create` | Create fuel category |
| PATCH | `/fuel-categories/:id` | `fuel-category:update` | Update fuel category |
| DELETE | `/fuel-categories/:id` | `fuel-category:delete` | Delete fuel category |

**Example:**
```json
// GET /vehicles?status=GOOD&poolSiteId=5&page=1&limit=20
{
  "success": true,
  "data": [
    {
      "id": 42,
      "plateNumber": "L-1234-AB",
      "status": "GOOD",
      "model": {
        "id": 5,
        "brand": "Hino",
        "application": "Compactor",
        "fuelTankCapacity": 150
      },
      "poolSite": {
        "id": 5,
        "name": "Pool Wonokromo",
        "type": "POOL"
      },
      "currentOdometer": 125400,
      "currentTareWeight": 4200,
      "registrationExpiry": "2028-03-15"
    }
  ],
  "meta": { "total": 87, "page": 1, "limit": 20, "pages": 5 }
}
```

**Example — POST /users**
```json
// Request
{
  "username": "operator1",
  "name": "Operator Pool",
  "roleId": 8
}

// Response 201
{
  "success": true,
  "data": {
    "id": 12,
    "username": "operator1",
    "name": "Operator Pool",
    "roleId": 8,
    "roleName": "PoolOperator",
    "mustChangePassword": true,
    "createdAt": "2026-06-05T10:00:00Z"
  }
}
```

### 2.4 Personnel — Drivers & Licenses

| Method | Path | Permission | Description |
|--------|------|-----------|---|
| GET | `/drivers` | `driver:read` | List drivers (filter: poolSiteId, employmentStatus, search) |
| GET | `/drivers/:id` | `driver:read` | Get driver + licenses + schedule |
| POST | `/drivers` | `driver:create` | Register new driver |
| PATCH | `/drivers/:id` | `driver:update` | Update driver (address, contact, photo, etc.) |
| DELETE | `/drivers/:id` | `driver:delete` | Soft-delete driver |
| GET | `/license-classes` | `license:read` | List SIM classes (A, BI, BII, C, D) |
| POST | `/drivers/:driverId/licenses` | `license:create` | Issue driver license |
| PATCH | `/drivers/:driverId/licenses/:licenseId` | `license:update` | Update license (expiry) |
| DELETE | `/drivers/:driverId/licenses/:licenseId` | `license:delete` | Revoke license |

### 2.5 Geography — Sites & Routes

| Method | Path | Permission | Description |
|--------|------|-----------|---|
| GET | `/sites` | `site:read` | List sites (filter: type, search) |
| GET | `/sites/:id` | `site:read` | Get site detail (location, photo) |
| POST | `/sites` | `site:create` | Register new site (POOL/SPBU/TPS/TPA) |
| PATCH | `/sites/:id` | `site:update` | Update site (address, coords, photo) |
| DELETE | `/sites/:id` | `site:delete` | Soft-delete site |
| GET | `/routes` | `route:read` | List routes — paginated (filter: category, originSiteId, destinationSiteId; `search` matches origin/destination site name) |
| GET | `/routes/board-summary` | `route:read` | Slim list of **all active routes** (`{id, category, originSiteName, destinationSiteName}`, unpaginated) for the record/quick-entry board — avoids paging the full route table client-side |
| GET | `/routes/:id` | `route:read` | Get route (origin, destination, distance) |
| POST | `/routes` | `route:create` | Define route (origin, destination, distanceKm, category) |
| PATCH | `/routes/:id` | `route:update` | Update route (distance) |
| DELETE | `/routes/:id` | `route:delete` | Delete unused route |

### 2.6 Waste sources

| Method | Path | Permission | Description |
|--------|------|-----------|---|
| GET | `/waste-sources` | `waste-source:read` | List waste sources (D, R, PS, PU, etc.) |
| POST | `/waste-sources` | `waste-source:create` | Create waste source |
| PATCH | `/waste-sources/:id` | `waste-source:update` | Update waste source |
| DELETE | `/waste-sources/:id` | `waste-source:delete` | Delete waste source (if unused) |
| GET | `/vehicles/:id/waste-sources` | `vehicle:read` | Get waste sources for a vehicle |
| POST | `/vehicles/:id/waste-sources/:wasteSourceId` | `vehicle:update` | Assign waste source to vehicle |
| DELETE | `/vehicles/:id/waste-sources/:wasteSourceId` | `vehicle:update` | Remove waste source |

### 2.7 Scheduling — Crew Schedules, Trip Templates, Fuel Quotas

| Method | Path | Permission | Description |
|--------|------|-----------|---|
| GET | `/crew-schedules` | `crew-schedule:read` | List standing schedules (filter: vehicleId) |
| GET | `/crew-schedules/:id` | `crew-schedule:read` | Get schedule + trips |
| POST | `/crew-schedules` | `crew-schedule:create` | Create standing schedule (vehicle+driver+times) |
| PATCH | `/crew-schedules/:id` | `crew-schedule:update` | Update schedule times |
| DELETE | `/crew-schedules/:id` | `crew-schedule:delete` | Remove schedule |
| GET | `/trip-templates` | `trip-template:read` | List route legs in schedules |
| POST | `/crew-schedules/:scheduleId/trip-templates` | `trip-template:create` | Add leg (route, time, fuel request) |
| PATCH | `/trip-templates/:id` | `trip-template:update` | Update leg (time, fuel request) |
| DELETE | `/trip-templates/:id` | `trip-template:delete` | Remove leg |
| GET | `/disposal-permits` | `disposal-permit:read` | List permits (kitir) — paginated (filter: vehicleId, siteId, status, activeOn; `search` matches permit code / vehicle plate) |
| POST | `/disposal-permits` | `disposal-permit:create` | Issue permit (vehicle, site, validFrom, validTo) |
| PATCH | `/disposal-permits/:id` | `disposal-permit:update` | Update permit (extend, deactivate) |
| DELETE | `/disposal-permits/:id` | `disposal-permit:delete` | Delete permit (if unused) |

### 2.8 Transactions — Daily operations

| Method | Path | Permission | Description |
|--------|------|-----------|---|
| GET | `/transaction-days` | `transaction-day:read` | List transaction days (paginated, filterable by date) |
| GET | `/transaction-days/:date` | `transaction-day:read` | Get day detail + all hauls |
| POST | `/transaction-days/:date/initiate` | `transaction-day:manage` | Manually trigger day init (create hauls from crew schedules) |
| PATCH | `/transaction-days/:date` | `transaction-day:manage` | Mark day as DONE |
| GET | `/hauls` | `haul:read` | List vehicle hauls (filterable by date, vehicle) |
| GET | `/hauls/:id` | `haul:read` | Get haul + assignments + trips |
| POST | `/hauls` | `haul:create` | Create ad-hoc haul (not from schedule) |
| PATCH | `/hauls/:id` | `haul:update` | Update haul notes, mark DONE |
| GET | `/trips` | `trip:read` | List all trips (filter: date, status, routeCategory) |
| GET | `/trips/:id` | `trip:read` | Get trip detail |
| POST | `/trips` | `trip:create` | Create ad-hoc trip (not from template) |
| PATCH | `/trips/:id` | `trip:update` | Update trip (name, notes) |
| POST | `/trips/:id/record-pickup` | `trip:record-pickup` | Record pickup (actualTime, actualOdometer); sets trip to DONE |
| POST | `/trips/:id/record-disposal` | `trip:record-disposal` | Record disposal weighing (grossWeight, tareWeight [defaults from vehicle], wasteVolume); computes netWeight; sets trip to DONE |
| POST | `/trips/:id/record-fuel` | `trip:record-fuel` | Record fuel (fuelRequestedLiters, fuelApprovedLiters) |
| POST | `/trips/:id/verify` | `trip:verify` | Mark trip VERIFIED (immutable after) |

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

// Response 200
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
    "updatedAt": "2026-06-05T14:50:30Z"
  }
}
```

### 2.9 Levies

| Method | Path | Permission | Description |
|--------|------|-----------|---|
| GET | `/levies` | `levy:read` | List levies (filter: date range, categoryName; paginated) |
| GET | `/levies/:id` | `levy:read` | Get levy detail |
| POST | `/levies` | `levy:create` | Create levy entry (date, categoryName, amount, notes) |
| PATCH | `/levies/:id` | `levy:update` | Update levy (date, categoryName, amount, notes) |
| DELETE | `/levies/:id` | `levy:delete` | Delete levy entry |

**Example — GET /levies?dateFrom=2026-01-01&dateTo=2026-06-05&page=1&limit=20:**
```json
{
  "success": true,
  "data": [
    {
      "id": "019eb2ab-74fe-7ed3-99b9-0020bb7ed283",
      "categoryName": "Retribusi Sampah",
      "date": "2026-06-05",
      "amount": 5000000,
      "notes": "Daily levy collection",
      "createdAt": "2026-06-05T08:00:00Z",
      "updatedAt": "2026-06-05T08:00:00Z"
    }
  ],
  "meta": { "total": 156, "page": 1, "limit": 20 }
}
```

**Example — POST /levies:**
```json
{
  "categoryName": "Retribusi Sampah",
  "date": "2026-06-05",
  "amount": 5000000,
  "notes": "Daily collection"
}

// Response 201
{
  "success": true,
  "data": {
    "id": "019eb2ab-74fe-7ed3-99b9-0020bb7ed283",
    "categoryName": "Retribusi Sampah",
    "date": "2026-06-05",
    "amount": 5000000,
    "notes": "Daily collection",
    "createdAt": "2026-06-05T08:00:00Z",
    "updatedAt": "2026-06-05T08:00:00Z"
  }
}
```

### 2.10 Monitoring

| Method | Path | Permission | Description |
|--------|------|-----------|---|
| GET | `/monitoring/tonnage-5day` | `monitoring:read` | Σ tonnage per day, last 5 days |
| GET | `/monitoring/tonnage-monthly` | `monitoring:read` | Σ tonnage per day, current month + previous 3 months |
| GET | `/monitoring/tonnage-by-source` | `monitoring:read` | Σ tonnage by WasteSource code, date range (query: `?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD`) |
| GET | `/monitoring/tonnage-by-site` | `monitoring:read` | Σ tonnage by originSiteId (TPS), ranked, date range |
| GET | `/monitoring/fuel-consumption` | `monitoring:read` | Σ fuel (requested, approved) per vehicle, date range |
| GET | `/monitoring/fuel-by-type` | `monitoring:read` | Σ fuel by Fuel.name, date range |
| GET | `/monitoring/routes-active` | `monitoring:read` | List of routes with ≥1 trip today |
| GET | `/monitoring/route-map` | `monitoring:read` | Active route edges + the coordinate-bearing sites they connect, for the Pengangkutan map (`{sites:[{id,name,type,latitude,longitude}], edges:[{routeId,category,originSiteId,destinationSiteId,tripCount}]}`); date range |
| GET | `/monitoring/trip-summary` | `monitoring:read` | Paginated operational trip list — crew (driverName), vehicle (plateNumber), route (routeName), KM target-vs-actual (target/actualOdometer), time target-vs-actual (target/actualTime), fuel, status. Filterable by date/status/route/vehicle/driver (query: `?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD&status=DONE&routeId=…&vehicleId=…&driverId=…&page=1&limit=20`) |
| GET | `/monitoring/levy-summary` | `monitoring:read` | Σ levy by categoryName, date range |
| GET | `/monitoring/levy-trend` | `monitoring:read` | Σ levy per calendar month (`{month:"YYYY-MM", totalAmount}`), date range |
| GET | `/monitoring/kpi-overview` | `monitoring:read` | Combined KPI object: 5-day tonnage, monthly trend, fuel, active vehicles, completed hauls |

**Example — GET /monitoring/tonnage-5day:**
```json
{
  "success": true,
  "data": [
    { "date": "2026-06-01", "tonnage": 125400 },
    { "date": "2026-06-02", "tonnage": 132600 },
    { "date": "2026-06-03", "tonnage": 118900 },
    { "date": "2026-06-04", "tonnage": 141200 },
    { "date": "2026-06-05", "tonnage": 156800 }
  ]
}
```

**Example — GET /monitoring/kpi-overview:**
```json
{
  "success": true,
  "data": {
    "tonnageLast5Days": [
      { "date": "2026-06-01", "tonnage": 125400 },
      { "date": "2026-06-02", "tonnage": 132600 },
      { "date": "2026-06-03", "tonnage": 118900 },
      { "date": "2026-06-04", "tonnage": 141200 },
      { "date": "2026-06-05", "tonnage": 156800 }
    ],
    "monthlyTrend": [
      { "month": "2026-03", "tonnage": 3456000 },
      { "month": "2026-04", "tonnage": 3892000 },
      { "month": "2026-05", "tonnage": 4125600 },
      { "month": "2026-06", "tonnage": 2847200 }
    ],
    "fuelConsumption": {
      "totalRequested": 12500,
      "totalApproved": 12200
    },
    "activeVehicles": 34,
    "completedHauls": 127,
    "completedTrips": 486
  }
}
```

### 2.11 Reports

| Method | Path | Permission | Description |
|--------|------|-----------|---|
| POST | `/reports/tonnage/generate` | `report:generate` | Submit tonnage report; returns jobId (query: `?format=xlsx&dateFrom=2026-01-01&dateTo=2026-06-05`) |
| POST | `/reports/fuel/generate` | `report:generate` | Submit fuel report; returns jobId |
| POST | `/reports/route/generate` | `report:generate` | Submit route report; returns jobId |
| POST | `/reports/levy/generate` | `report:generate` | Submit levy report; returns jobId |
| GET | `/reports/jobs/:jobId` | `report:generate` | Poll job status (QUEUED, PROCESSING, COMPLETED, FAILED) |
| GET | `/reports/download/:jobId` | `report:generate` | Download completed report (streams file from S3) |
| DELETE | `/reports/jobs/:jobId` | `report:generate` | Cancel queued job or delete file |

**Example — POST /reports/tonnage/generate:**
```json
{
  "dateFrom": "2026-01-01",
  "dateTo": "2026-06-05",
  "format": "xlsx"
}

// Response 201
{
  "success": true,
  "data": {
    "jobId": "job-abc123xyz",
    "status": "QUEUED",
    "createdAt": "2026-06-05T14:50:00Z"
  }
}
```

**Example — GET /reports/jobs/:jobId:**
```json
{
  "success": true,
  "data": {
    "jobId": "job-abc123xyz",
    "status": "COMPLETED",
    "filename": "tonnage-report-2026-01-01-to-2026-06-05.xlsx",
    "createdAt": "2026-06-05T14:50:00Z",
    "completedAt": "2026-06-05T15:02:30Z",
    "fileUrl": "https://api.example.com/api/v1/reports/download/job-abc123xyz"
  }
}
```

**Example — GET /reports/download/:jobId:**
Returns the report file (xlsx/pdf) with `Content-Disposition: attachment` header.

### 2.12 Vehicle operations — Refuel log, Inspection, Maintenance (Phase 1 — legacy parity)

See [`09-modules/inspection.md`](./09-modules/inspection.md) and
[`09-modules/maintenance.md`](./09-modules/maintenance.md).

| Method | Path | Permission | Description |
|--------|------|-----------|---|
| GET | `/refuels` | `trip:read` | Refuel log (read view over REFUEL trips; filter date/vehicle/fuel/status; derived cost + anomaly flag) |
| GET | `/vehicle-inspections` | `inspection:read` | List inspections (filter vehicle/result/date) |
| GET | `/vehicle-inspections/:id` | `inspection:read` | Inspection detail + checklist items |
| POST | `/vehicle-inspections` | `inspection:create` | Create inspection (nested items; server derives result + counts) |
| PATCH | `/vehicle-inspections/:id` | `inspection:update` | Update inspection |
| DELETE | `/vehicle-inspections/:id` | `inspection:delete` | Delete inspection |
| GET | `/maintenance-records` | `maintenance:read` | List maintenance (filter vehicle/type/status/date) |
| GET | `/maintenance-records/:id` | `maintenance:read` | Maintenance detail + items |
| POST | `/maintenance-records` | `maintenance:create` | Create maintenance (nested items; totalCost server-computed) |
| PATCH | `/maintenance-records/:id` | `maintenance:update` | Update maintenance |
| PATCH | `/maintenance-records/:id/approve` | `maintenance:approve` | Approve (`PENDING_APPROVAL → APPROVED`) |
| DELETE | `/maintenance-records/:id` | `maintenance:delete` | Delete maintenance |

Kitir bulk import is `POST /disposal-permits/bulk-import` (`disposal-permit:create`) — see
[`09-modules/disposal-permits.md`](./09-modules/disposal-permits.md) §4.

## 3. Special endpoints (Phase 4 — Weighbridge integration)

**FUTURE / NOT Phase 1.** Contract documented here; implementation in Phase 4.

| Method | Path | Permission | Description |
|--------|------|-----------|---|
| POST | `/weighbridge/resolve-kitir` | — | Weighbridge app queries quota by code or vehicle plate |
| POST | `/weighbridge/post-weighing` | — | Weighbridge app posts final gross/tare/net weight + CCTV ref |

**Resolve kitir (idempotent query):**
```json
// Request
{
  "code": "KT-202606-001",  // OR "plateNumber": "L-1234-AB"
  "date": "2026-06-05"
}

// Response 200 (kitir found and active)
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
    "validTo": "2026-12-31"
  }
}

// Response 404 (no valid quota)
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Kitir tidak ditemukan atau sudah kadaluarsa"
  }
}
```

**Post weighing result:**
```json
// Request
{
  "kitirId": 5001,
  "plateNumber": "L-1234-AB",
  "grossWeight": 6200,
  "tareWeight": 4200,
  "timestamp": "2026-06-05T14:45:30Z",
  "cctvReference": "CCTV-2026-06-05-001"
}

// Response 201 (recorded)
{
  "success": true,
  "data": {
    "id": 789,
    "kitirId": 5001,
    "netWeight": 2000,
    "recordedAt": "2026-06-05T14:50:00Z"
  }
}

// Response 400 (validation error)
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Berat kotor harus >= berat kosong",
    "details": [
      { "field": "grossWeight", "message": "Harus lebih besar atau sama dengan tareWeight" }
    ]
  }
}
```

## 3a. GPS tracking & route-deviation (Phase 7)

**FUTURE / Phase 7.** Full contract in [`09-modules/gps-tracking.md`](09-modules/gps-tracking.md) §6.

| Method | Path | Permission | Description |
|--------|------|-----------|---|
| POST | `/integrations/gps/webhook/:token` | secret path token + IP allowlist (no RBAC) | GPS.id push ingest (single or batch ping); validates+normalizes, enqueues, returns `200 {accepted}` fast |
| GET/POST/PATCH/DELETE | `/gps/devices` | `gps-device:read|create|update|delete` | IMEI ↔ vehicle registry + unmatched-IMEI queue |
| GET | `/monitoring/fleet-positions?date=today` | `tracking:read` | **whole active fleet** as `VehiclePosition[]` (`source: live-gps \| recorded-activity \| none`); powers the Pengangkutan → Peta map (live GPS vehicles + untracked vehicles placed from recorded realization activity) |
| GET | `/gps/vehicles/:id/position` | `tracking:read` | latest known position (live or recorded) |
| GET | `/gps/vehicles/:id/track?minutes=60` | `tracking:read` | live breadcrumb trail |
| GET/PUT/DELETE | `/gps/routes/:routeId/geometry` | `route-geometry:manage` | route-corridor template (GeoJSON LineString + tolerance) |
| PUT/DELETE | `/gps/trips/:tripId/geometry` | `route-geometry:manage` | per-day corridor override |
| GET/POST/PUT | `/gps/deviation-rules` | `deviation-rule:manage` | tune deviation thresholds |
| GET | `/gps/alerts` | `deviation-alert:read` | alert feed (filter vehicle/status/date) |
| PATCH | `/gps/alerts/:id/acknowledge` | `deviation-alert:acknowledge` | acknowledge + notes |
| GET | `/monitoring/efficiency` | `monitoring:read` | route adherence %, wasted time/fuel (cached) |
| SSE/WS | `/realtime/fleet` | session + `tracking:read` | live positions + alerts (`vehicle-{id}` \| `all`) |

> The GPS.id webhook carries **no vendor signature** — secured by an unguessable secret path token, an IP
> allowlist, per-source rate-limiting, and full `ApiAuditLog`. All other endpoints use the standard
> `ApiResponse<T>` envelope (§1.2).
>
> **Forward-compatible (not built in Phase 7):** ingestion is source-agnostic. A future native app will add
> `POST /gps/mobile/pings` (per-user OAuth2 bearer) that normalizes to the **same canonical ping** and feeds
> the **same** pipeline — to track vehicles without a hardware tracker or complement those that have one. See
> [`09-modules/gps-tracking.md`](09-modules/gps-tracking.md) §1.3 and `RFC-0003`.

## 4. Conventions & documentation

- **OpenAPI 3.0 spec** auto-generated from NestJS controllers + Swagger decorators.
- **Swagger UI** at `/api/docs` (development only; disabled in production).
- **Request/Response validation:** Zod schemas in NestJS DTOs; 422 on validation failure.
- **Concurrency:** optimistic locking via `updatedAt` timestamp (if needed; else 409 on race).
- **Soft deletes:** `GET /resource` excludes soft-deleted rows by default; `?includeDeleted=true` for admin view.

## 5. Error catalog (common)

| Code | HTTP | Cause | Example |
|------|------|-------|---------|
| `INVALID_INPUT` | 422 | Semantic validation failure (well-formed, but unprocessable) | `{"field":"plateNumber","message":"Format tidak valid"}` |
| `INVALID_CREDENTIALS` | 401 | Login fail or expired session | "Username atau password salah" |
| `FORBIDDEN` | 403 | Lacks permission | "Anda tidak memiliki izin untuk aksi ini" |
| `NOT_FOUND` | 404 | Resource missing | "Kendaraan dengan ID 999 tidak ditemukan" |
| `CONFLICT` | 409 | Unique constraint / state machine violation | "Nomor polisi sudah terdaftar" or "Trip sudah terverifikasi, tidak bisa diubah" |
| `RATE_LIMITED` | 429 | Too many requests (login, API abuse, or account locked) | "Terlalu banyak percobaan login. Akun terkunci selama 30 menit." |
| `INTERNAL_ERROR` | 500 | Server error | "Terjadi kesalahan internal. Hubungi admin." |
