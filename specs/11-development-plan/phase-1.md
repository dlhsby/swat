# Phase 1 — MVP: Auth, Master Data, Transactions, Migration & Cutover

## Overview

Deliver a production-ready operational system with complete RBAC, all master-data management (vehicles, drivers, sites, routes, waste sources, fuel quotas), the full daily transaction workflow (trip recording, verification), data migration (legacy MySQL → PostgreSQL), and cutover strategy. System is tested ≥80%, documented, and ready for pilot deployment.

**Effort:** 9–11 weeks. **Dependencies:** Phase 0 complete; Docker + Postgres available; Prisma schema + partitioning in place.

---

## Epic 1.1 — Authentication & RBAC (Size: L)

**Parallel group:** Sequential (auth gates all other epics). 

**TDD workflow per feature:** (1) Write test (RED) — endpoint test fails, service test fails. (2) Implement (GREEN) — minimal code to pass. (3) Refactor (IMPROVE) — clean code, extract utilities. (4) Verify ≥80% coverage.

#### T-101. User & role models (schema verification)
- **Size:** S · **Coverage:** N/A (schema-only)
- **Depends on:** Phase-0 Prisma schema migration
- **Files:**
  - `apps/backend/prisma/schema.prisma` (verify)
  - Verify migrations: `apps/backend/prisma/migrations/` includes User, Role, Permission, RolePermission tables
- **Steps:**
  1. Verify User model with id, username, passwordHash, mustChangePassword, roleId FK, soft delete (deletedAt).
  2. Verify Role model with id, name, permissions relation.
  3. Verify Permission model with id, key (unique), description.
  4. Verify RolePermission junction (roleId, permissionId, onDelete: Cascade).
  5. Run `prisma migrate status` — all migrations applied.
  6. Run `prisma db seed` — verify admin user + roles created.
- **Acceptance criteria:**
  - [ ] `User`, `Role`, `Permission`, `RolePermission` tables exist in PostgreSQL.
  - [ ] Admin user (username: `admin`, email: `admin@wahyutrip.com`, mustChangePassword: true) seeded.
  - [ ] At least 1 admin role with all permissions seeded.
  - [ ] No lint/typecheck errors.

#### T-102. Login endpoint (POST /api/v1/auth/login)
- **Size:** M · **Coverage:** ≥95%
- **Depends on:** T-101
- **Files:**
  - `apps/backend/src/modules/auth/auth.controller.ts` (create)
  - `apps/backend/src/modules/auth/auth.service.ts` (create)
  - `apps/backend/src/modules/auth/dto/login.dto.ts` (create)
  - `packages/schemas/src/auth.schema.ts` (create)
  - `apps/backend/test/auth.e2e-spec.ts` (create)
- **Steps:**
  1. **Test (RED):** Write e2e test: `POST /api/v1/auth/login { username: "admin", password: "..." }` → expect 200 with ApiResponse, httpOnly session cookie set.
  2. Write unit test: `AuthService.login(username, password)` → success returns user data, failure throws BadRequestException.
  3. **Implement (GREEN):** AuthService: verify password via Argon2id comparison (use `argon2` or `@node-rs/argon2` library).
  4. Set httpOnly, SameSite=Strict session cookie (use `express-session` or NestJS session) via `req.session`.
  5. Return `ApiResponse<{ userId, username, name, roleId }>`.
  6. On bad credentials: throw `BadRequestException(400, "Invalid credentials")`.
  7. **Refactor:** extract password comparison to utility, remove PII from logs (log success/failure counts only, no usernames).
  8. Run tests — must pass; coverage ≥95%.
- **Acceptance criteria:**
  - [ ] `POST /api/v1/auth/login` with valid credentials → 200, httpOnly session cookie set, returns user data.
  - [ ] Invalid username → 400 "Invalid credentials".
  - [ ] Invalid password → 400 "Invalid credentials".
  - [ ] No plaintext password in logs.
  - [ ] Unit tests: ≥95% coverage on auth.service.
  - [ ] E2E tests: login happy path + error cases pass.
  - [ ] lint/typecheck clean.

#### T-103. Logout endpoint (POST /api/v1/auth/logout)
- **Size:** S · **Coverage:** ≥90%
- **Depends on:** T-102
- **Files:**
  - `apps/backend/src/modules/auth/auth.controller.ts` (modify)
  - `apps/backend/src/modules/auth/auth.service.ts` (modify)
  - `apps/backend/test/auth.e2e-spec.ts` (modify)
- **Steps:**
  1. **Test (RED):** `POST /api/v1/auth/logout` (with valid session) → 200, session cookie cleared.
  2. `POST /api/v1/auth/logout` (no session) → 401 Unauthorized.
  3. **Implement (GREEN):** AuthController: `@Post('logout')` requires session; call `req.session.destroy()` to clear session store.
  4. Return `ApiResponse<void> { success: true }`.
  5. **Refactor:** consistent error response.
- **Acceptance criteria:**
  - [ ] `POST /api/v1/auth/logout` with valid session → 200, session cleared.
  - [ ] Subsequent `GET /api/v1/auth/me` → 401 (session gone).
  - [ ] Unit + E2E tests pass; coverage ≥90%.
  - [ ] lint/typecheck clean.

#### T-104. Current user endpoint (GET /api/v1/auth/me)
- **Size:** S · **Coverage:** ≥90%
- **Depends on:** T-102
- **Files:**
  - `apps/backend/src/modules/auth/auth.controller.ts` (modify)
  - `apps/backend/src/modules/auth/auth.service.ts` (modify)
  - `apps/backend/test/auth.e2e-spec.ts` (modify)
- **Steps:**
  1. **Test (RED):** `GET /api/v1/auth/me` (with valid session) → 200, returns user + role + permissions.
  2. `GET /api/v1/auth/me` (no session) → 401.
  3. **Implement (GREEN):** AuthService.getMe(userId) → fetch User + Role + (via RolePermission) Permissions.
  4. Return `ApiResponse<{ userId, username, name, roleId, roleName, permissions: [{ key, description }] }>`.
  5. Require session (use `@UseGuards(AuthGuard)`).
- **Acceptance criteria:**
  - [ ] `GET /api/v1/auth/me` with valid session → 200, returns full user + permissions list.
  - [ ] Response includes `permissions[].key` (e.g. "vehicle:create").
  - [ ] No session → 401.
  - [ ] Tests ≥90%; lint/typecheck clean.

#### T-105. Permission guard & decorator (@HasPermission)
- **Size:** M · **Coverage:** ≥85%
- **Depends on:** T-104
- **Files:**
  - `apps/backend/src/common/guards/rbac.guard.ts` (create)
  - `apps/backend/src/common/decorators/has-permission.decorator.ts` (create)
  - `apps/backend/test/rbac.guard.spec.ts` (create)
- **Steps:**
  1. **Test (RED):** Test that endpoint with `@HasPermission('vehicle:create')` rejects users without that permission (403).
  2. Endpoint with permission → request succeeds.
  3. **Implement (GREEN):** Create RbacGuard that:
     - Extracts session user.
     - Reads `@HasPermission(...)` metadata from route handler.
     - Queries user's role → permissions.
     - Throws ForbiddenException if permission not present.
  4. Create `@HasPermission(...permissionKeys: string[])` decorator.
  5. **Refactor:** caching of role permissions (Redis for high-traffic systems; optional in Phase 1).
- **Acceptance criteria:**
  - [ ] User without required permission → 403 "Access denied".
  - [ ] User with permission → request proceeds.
  - [ ] "Admin" role (all permissions) → always succeeds.
  - [ ] Unit tests ≥85%; logs no PII.
  - [ ] lint/typecheck clean.

#### T-106. User CRUD endpoints
- **Size:** M · **Coverage:** ≥80%
- **Depends on:** T-105
- **Files:**
  - `apps/backend/src/modules/users/users.controller.ts` (create)
  - `apps/backend/src/modules/users/users.service.ts` (create)
  - `apps/backend/src/modules/users/users.repository.ts` (create)
  - `apps/backend/src/modules/users/dto/create-user.dto.ts` (create)
  - `apps/backend/src/modules/users/dto/update-user.dto.ts` (create)
  - `apps/backend/src/modules/users/users.module.ts` (create)
  - `packages/schemas/src/user.schema.ts` (create)
  - `apps/backend/test/users.e2e-spec.ts` (create)
- **Steps:**
  1. **Test (RED):** 
     - GET /users (paginated, filter by roleId) → 200 with users list, meta.
     - GET /users/:id → 200, user + role detail.
     - POST /users { username, name, roleId } → 201, mustChangePassword: true, no password hash in response.
     - PATCH /users/:id { name, roleId, status } → 200, updated user.
     - DELETE /users/:id → 200, soft delete (deletedAt set).
     - All guarded: no permission → 403.
  2. **Implement (GREEN):**
     - UsersService: CRUD logic, validate username unique, validate roleId exists.
     - UsersRepository: Prisma queries (findMany with pagination, findUnique, create, update, delete/soft-delete).
     - Generate temp password (random 12 chars) on create; hash with bcrypt.
     - Return user DTO (no passwordHash).
  3. **Refactor:** extract password generation, DTO mapping.
- **Acceptance criteria:**
  - [ ] GET /users → 200, paginated list, meta.total/page/limit/pages.
  - [ ] GET /users/:id → 200, full user detail.
  - [ ] POST /users → 201, new user with mustChangePassword=true.
  - [ ] PATCH /users/:id { name, roleId } → 200, updated.
  - [ ] DELETE /users/:id → soft delete (deletedAt not null, findMany excludes by default).
  - [ ] All endpoints guarded: 403 without `user:*` permissions.
  - [ ] Tests ≥80%; lint/typecheck clean.

#### T-107. Role CRUD endpoints
- **Size:** S · **Coverage:** ≥85%
- **Depends on:** T-105
- **Files:**
  - `apps/backend/src/modules/roles/roles.controller.ts` (create)
  - `apps/backend/src/modules/roles/roles.service.ts` (create)
  - `apps/backend/src/modules/roles/roles.repository.ts` (create)
  - `apps/backend/src/modules/roles/dto/create-role.dto.ts` (create)
  - `apps/backend/src/modules/roles/dto/update-role.dto.ts` (create)
  - `apps/backend/src/modules/roles/roles.module.ts` (create)
  - `packages/schemas/src/role.schema.ts` (create)
  - `apps/backend/test/roles.e2e-spec.ts` (create)
- **Steps:**
  1. **Test (RED):**
     - GET /roles → 200, list all roles with permission IDs.
     - GET /roles/:id → 200, role + permissions detail.
     - POST /roles { name, permissionIds: [1,2,3] } → 201.
     - PATCH /roles/:id { name, permissionIds: [...] } → 200, upsert role-permission mappings.
     - DELETE /roles/:id → only if unused; else 409 Conflict.
  2. **Implement (GREEN):**
     - RolesService: CRUD, validate name unique, upsert RolePermission junction.
     - On PATCH: delete old mappings, insert new ones (or upsert).
  3. **Refactor:** consistent error messages.
- **Acceptance criteria:**
  - [ ] GET /roles → 200, list of roles with permissionIds.
  - [ ] POST /roles → 201, role created with mappings.
  - [ ] PATCH /roles/:id → 200, permissions updated.
  - [ ] DELETE /roles/:id (in-use) → 409 "Role is assigned to users".
  - [ ] DELETE /roles/:id (unused) → 200, soft-deleted.
  - [ ] Tests ≥85%; lint/typecheck clean.

#### T-108. Permission seeding
- **Size:** M · **Coverage:** N/A
- **Depends on:** T-101
- **Files:**
  - `apps/backend/prisma/seed.ts` (modify)
- **Steps:**
  1. **Seed permissions** (from spec 06-auth-rbac):
     - vehicle:read, vehicle:create, vehicle:update, vehicle:delete
     - driver:read, driver:create, driver:update, driver:delete
     - site:read, site:create, site:update, site:delete
     - route:read, route:create, route:update, route:delete
     - crew-schedule:read, crew-schedule:create, crew-schedule:update, crew-schedule:delete
     - fuel-quota:read, fuel-quota:create, fuel-quota:update, fuel-quota:delete
     - trip:read, trip:record, trip:verify, trip:verify:override
     - user:read, user:create, user:update, user:delete
     - role:read, role:create, role:update, role:delete
     - levy:read, levy:create, levy:update, levy:delete
     - report:generate, report:download
     - admin:* (superuser; bypasses all checks)
     - (Total ~55–65 permissions)
  2. **Seed initial roles:**
     - Admin (all permissions, including admin:*)
     - Administrasi Data (vehicle:*, driver:*, site:*, route:*, crew-schedule:*, fuel-quota:*, trip:read)
     - Checker (trip:verify, trip:read)
     - Operator Pool (trip:record, trip:read)
     - Petugas TPA (trip:read)
     - Supervisor (trip:verify, trip:verify:override, user:read, role:read)
  3. **Seed admin user:** username: admin, name: Admin, roleId: (admin role), password: Argon2id(random), mustChangePassword: true.
- **Acceptance criteria:**
  - [ ] 55–65 Permission rows in DB.
  - [ ] 6–8 initial Role rows.
  - [ ] Admin user seeded, mustChangePassword=true.
  - [ ] `prisma db seed` runs without error.

---

## Epic 1.2 — Fleet Master Data (Size: L)

**Parallel group:** 1.2–1.5 parallelize after T-105 (RBAC guards).

#### T-109. VehicleApplication CRUD
- **Size:** M · **Coverage:** ≥85%
- **Depends on:** T-105
- **Files:**
  - `apps/backend/src/modules/fleet/applications/applications.controller.ts` (create)
  - `apps/backend/src/modules/fleet/applications/applications.service.ts` (create)
  - `apps/backend/src/modules/fleet/applications/applications.repository.ts` (create)
  - `apps/backend/src/modules/fleet/applications/dto/create-application.dto.ts` (create)
  - `packages/schemas/src/vehicle-application.schema.ts` (create)
  - `apps/backend/test/applications.e2e-spec.ts` (create)
- **Steps:**
  1. **Test (RED):** GET /vehicle-applications, POST, PATCH, DELETE; validation: name unique.
  2. **Implement (GREEN):** Repository queries, service logic.
  3. **Refactor:** response DTOs.
- **Acceptance criteria:**
  - [ ] CRUD endpoints working, guarded with appropriate permissions (no wildcard required; guard on specific resource).
  - [ ] Unique constraint on name.
  - [ ] Tests ≥85%; lint/typecheck clean.

#### T-110. Fuel & FuelCategory CRUD
- **Size:** M · **Coverage:** ≥80%
- **Depends on:** T-105
- **Files:**
  - `apps/backend/src/modules/fleet/fuel/fuel.controller.ts` (create)
  - `apps/backend/src/modules/fleet/fuel/fuel.service.ts` (create)
  - `apps/backend/src/modules/fleet/fuel/fuel.repository.ts` (create)
  - `apps/backend/src/modules/fleet/fuel/dto/` (create DTOs)
  - `apps/backend/src/modules/fleet/fuel/categories.service.ts` (create, for FuelCategory)
  - `packages/schemas/src/fuel.schema.ts` (create)
  - `apps/backend/test/fuel.e2e-spec.ts` (create)
- **Steps:**
  1. **Test (RED):**
     - GET/POST/PATCH /fuel-categories (name unique).
     - GET/POST/PATCH /fuels { fuelCategoryId, name, pricePerLiter }.
     - Validators: pricePerLiter ≥ 0 (integer IDR).
  2. **Implement (GREEN):** Services, repositories, audit price changes (via updatedAt).
  3. Seed: Bersubsidi, Non-Subsidi categories; 6 fuels (Premium, Pertamax, Solar, etc.) with placeholder prices.
- **Acceptance criteria:**
  - [ ] FuelCategory CRUD working.
  - [ ] Fuel CRUD working, links to category.
  - [ ] Price changes logged (via updatedAt, recordedById).
  - [ ] Tests ≥80%; lint/typecheck clean.

#### T-111. VehicleModel CRUD
- **Size:** M · **Coverage:** ≥85%
- **Depends on:** T-109, T-110
- **Files:**
  - `apps/backend/src/modules/fleet/models/models.controller.ts` (create)
  - `apps/backend/src/modules/fleet/models/models.service.ts` (create)
  - `apps/backend/src/modules/fleet/models/models.repository.ts` (create)
  - `apps/backend/src/modules/fleet/models/dto/create-model.dto.ts` (create)
  - `packages/schemas/src/vehicle-model.schema.ts` (create)
  - `apps/backend/test/models.e2e-spec.ts` (create)
- **Steps:**
  1. **Test (RED):** POST /vehicle-models { brand, applicationId, fuelId, fuelTankCapacity, normalFuelRatio, normalTareWeight, maxNetLoad, maxNetVolume, wheelCount }.
  2. Validators: applicationId/fuelId FK exist, normalTareWeight > 0, wheelCount > 0.
  3. **Implement (GREEN):** Service validates FKs, repository creates.
- **Acceptance criteria:**
  - [ ] POST → 201, model created with all fields.
  - [ ] FK validation: invalid applicationId → 400.
  - [ ] Tests ≥85%; lint/typecheck clean.

#### T-112. Vehicle CRUD (TDD)
- **Size:** M · **Coverage:** ≥85%
- **Depends on:** T-111
- **Files:**
  - `apps/backend/src/modules/fleet/vehicles/vehicles.controller.ts` (create)
  - `apps/backend/src/modules/fleet/vehicles/vehicles.service.ts` (create)
  - `apps/backend/src/modules/fleet/vehicles/vehicles.repository.ts` (create)
  - `apps/backend/src/modules/fleet/vehicles/dto/create-vehicle.dto.ts` (create)
  - `apps/backend/src/modules/fleet/vehicles/dto/update-vehicle.dto.ts` (create)
  - `packages/schemas/src/vehicle.schema.ts` (create)
  - `apps/backend/test/vehicles.e2e-spec.ts` (create)
- **Steps:**
  1. **Test (RED):**
     - POST /vehicles { plateNumber, modelId, poolSiteId, currentOdometer, currentTareWeight, registrationExpiry, notes }.
     - Validators: plateNumber unique, match regex `^[A-Z]{1,2} \d{1,4} [A-Z]{1,3}$`, registrationExpiry > today, status in enum.
     - GET /vehicles (filter by status, poolSiteId, modelId).
     - PATCH /vehicles/:id { status, currentOdometer, currentTareWeight, notes }.
     - DELETE /vehicles/:id (soft delete).
  2. **Implement (GREEN):**
     - VehiclesService: validate plateNumber unique + format.
     - Check FK: modelId, poolSiteId exist.
     - On update: allow currentOdometer only if newer or equal (monotonic).
  3. **Refactor:** extract validators to utility.
- **Acceptance criteria:**
  - [ ] POST /vehicles → 201, vehicle created with status GOOD (default).
  - [ ] plateNumber format validation: invalid → 400.
  - [ ] plateNumber uniqueness: duplicate → 409 Conflict.
  - [ ] registrationExpiry validation: past date → 400.
  - [ ] GET /vehicles?status=GOOD&poolSiteId=5 → 200, filtered list.
  - [ ] PATCH /vehicles/:id { currentOdometer } → 400 if < current (reject downgrade).
  - [ ] DELETE /vehicles/:id → soft delete (deletedAt set).
  - [ ] Tests ≥85%; lint/typecheck clean.

#### T-113. VehicleWasteSource CRUD
- **Size:** S · **Coverage:** ≥85%
- **Depends on:** T-112
- **Files:**
  - `apps/backend/src/modules/fleet/vehicles/waste-sources/waste-sources.controller.ts` (create)
  - `apps/backend/src/modules/fleet/vehicles/waste-sources/waste-sources.service.ts` (create)
  - `apps/backend/src/modules/fleet/vehicles/waste-sources/dto/` (create DTOs)
  - `apps/backend/test/vehicle-waste-sources.e2e-spec.ts` (create)
- **Steps:**
  1. **Test (RED):**
     - POST /vehicles/:id/waste-sources { wasteSourceId } → 201.
     - DELETE /vehicles/:id/waste-sources/:wasteSourceId → 200.
     - GET /vehicles/:id/waste-sources → 200, list.
  2. **Implement (GREEN):** Service manages VehicleWasteSource junction; validate vehicleId/wasteSourceId exist.
- **Acceptance criteria:**
  - [ ] POST → 201, junction created.
  - [ ] DELETE → 200, junction deleted.
  - [ ] Tests ≥85%; lint/typecheck clean.

---

## Epic 1.3 — Personnel Master Data (Size: M)

#### T-114. LicenseClass CRUD (read-only)
- **Size:** S · **Coverage:** N/A
- **Depends on:** T-105
- **Files:**
  - `apps/backend/src/modules/personnel/licenses/license-classes.controller.ts` (create)
  - Seeded in prisma/seed.ts: A, BI, BI Umum, BII, BII Umum, C, D
- **Steps:**
  1. GET /license-classes → 200, list of license classes.
  2. No POST/PATCH/DELETE (read-only lookup).
- **Acceptance criteria:**
  - [ ] GET /license-classes → 200, ~7 rows.

#### T-115. Driver CRUD (TDD)
- **Size:** M · **Coverage:** ≥85%
- **Depends on:** T-114, T-105
- **Files:**
  - `apps/backend/src/modules/personnel/drivers/drivers.controller.ts` (create)
  - `apps/backend/src/modules/personnel/drivers/drivers.service.ts` (create)
  - `apps/backend/src/modules/personnel/drivers/drivers.repository.ts` (create)
  - `apps/backend/src/modules/personnel/drivers/dto/create-driver.dto.ts` (create)
  - `apps/backend/src/modules/personnel/drivers/dto/update-driver.dto.ts` (create)
  - `packages/schemas/src/driver.schema.ts` (create)
  - `apps/backend/test/drivers.e2e-spec.ts` (create)
- **Steps:**
  1. **Test (RED):**
     - POST /drivers { name, idCardNumber, poolSiteId, employmentStatus, birthDate, contact, ... }.
     - Validators: idCardNumber unique + 16 digits, birthDate < today - 18 years, status in enum.
     - GET /drivers (filter by poolSiteId, employmentStatus).
     - PATCH /drivers/:id { name, currentAddress, safetyTraining, notes }.
     - DELETE /drivers/:id (soft delete).
  2. **Implement (GREEN):** Service validates idCardNumber format & age.
- **Acceptance criteria:**
  - [ ] POST /drivers → 201, driver created.
  - [ ] idCardNumber 16 digits: invalid → 400.
  - [ ] birthDate < today - 18 years: invalid → 400.
  - [ ] GET /drivers?poolSiteId=5 → 200, filtered.
  - [ ] DELETE /drivers/:id → soft delete.
  - [ ] Tests ≥85%; lint/typecheck clean.

#### T-116. DriverLicense CRUD (TDD)
- **Size:** M · **Coverage:** ≥85%
- **Depends on:** T-115
- **Files:**
  - `apps/backend/src/modules/personnel/drivers/licenses/licenses.controller.ts` (create)
  - `apps/backend/src/modules/personnel/drivers/licenses/licenses.service.ts` (create)
  - `apps/backend/src/modules/personnel/drivers/licenses/licenses.repository.ts` (create)
  - `apps/backend/src/modules/personnel/drivers/licenses/dto/` (create DTOs)
  - `packages/schemas/src/driver-license.schema.ts` (create)
  - `apps/backend/test/driver-licenses.e2e-spec.ts` (create)
- **Steps:**
  1. **Test (RED):**
     - POST /drivers/:id/licenses { licenseClassId, licenseNumber, expiry }.
     - Validators: licenseNumber unique per driver, expiry > today (warn if expired).
     - GET /drivers/:id/licenses → 200, list.
     - PATCH /drivers/:id/licenses/:licenseId { expiry, ... } → 200.
     - DELETE /drivers/:id/licenses/:licenseId → 200.
  2. **Implement (GREEN):** Service validates FKs + expiry date.
- **Acceptance criteria:**
  - [ ] POST /drivers/:id/licenses → 201, license created.
  - [ ] expiry validation: past date → warn (not reject, in case re-activating).
  - [ ] GET /drivers/:id/licenses → 200, list.
  - [ ] Tests ≥85%; lint/typecheck clean.

---

## Epic 1.4 — Geography Master Data (Size: M)

#### T-117. Site CRUD (TDD)
- **Size:** M · **Coverage:** ≥85%
- **Depends on:** T-105
- **Files:**
  - `apps/backend/src/modules/geography/sites/sites.controller.ts` (create)
  - `apps/backend/src/modules/geography/sites/sites.service.ts` (create)
  - `apps/backend/src/modules/geography/sites/sites.repository.ts` (create)
  - `apps/backend/src/modules/geography/sites/dto/create-site.dto.ts` (create)
  - `packages/schemas/src/site.schema.ts` (create)
  - `apps/backend/test/sites.e2e-spec.ts` (create)
- **Steps:**
  1. **Test (RED):**
     - POST /sites { type, name, address, latitude, longitude, ... }.
     - Validators: type in (POOL, SPBU, TPS, TPA), latitude ∈ [-90, 90], longitude ∈ [-180, 180].
     - GET /sites (filter by type).
     - PATCH /sites/:id.
     - DELETE /sites/:id (soft delete).
  2. **Implement (GREEN):** Service validates coordinates.
- **Acceptance criteria:**
  - [ ] POST /sites → 201, site created.
  - [ ] latitude/longitude validation: out-of-range → 400.
  - [ ] type enum validation: invalid → 400.
  - [ ] GET /sites?type=POOL → 200, filtered.
  - [ ] Tests ≥85%; lint/typecheck clean.

#### T-118. Route CRUD (TDD)
- **Size:** M · **Coverage:** ≥85%
- **Depends on:** T-117
- **Files:**
  - `apps/backend/src/modules/geography/routes/routes.controller.ts` (create)
  - `apps/backend/src/modules/geography/routes/routes.service.ts` (create)
  - `apps/backend/src/modules/geography/routes/routes.repository.ts` (create)
  - `apps/backend/src/modules/geography/routes/dto/create-route.dto.ts` (create)
  - `packages/schemas/src/route.schema.ts` (create)
  - `apps/backend/test/routes.e2e-spec.ts` (create)
- **Steps:**
  1. **Test (RED):**
     - POST /routes { originSiteId, destinationSiteId, category, distanceKm }.
     - Validators: originSiteId ≠ destinationSiteId, distanceKm > 0, unique triple (originSiteId, destinationSiteId, category).
     - GET /routes (filter by origin, destination, category, search).
     - PATCH /routes/:id { distanceKm, ... }.
  2. **Implement (GREEN):** Service validates site FKs + uniqueness.
- **Acceptance criteria:**
  - [ ] POST /routes → 201, route created.
  - [ ] originSiteId = destinationSiteId → 400.
  - [ ] Duplicate (origin, dest, category) → 409 Conflict.
  - [ ] GET /routes?originSiteId=1&destinationSiteId=2 → 200, filtered.
  - [ ] Tests ≥85%; lint/typecheck clean.

---

## Epic 1.5 — Waste Sources (Size: S)

#### T-119. WasteSource CRUD
- **Size:** S · **Coverage:** ≥85%
- **Depends on:** T-105
- **Files:**
  - `apps/backend/src/modules/waste/waste-sources/waste-sources.controller.ts` (create)
  - `apps/backend/src/modules/waste/waste-sources/waste-sources.service.ts` (create)
  - `apps/backend/src/modules/waste/waste-sources/waste-sources.repository.ts` (create)
  - `apps/backend/src/modules/waste/waste-sources/dto/` (create DTOs)
  - `packages/schemas/src/waste-source.schema.ts` (create)
  - `apps/backend/test/waste-sources.e2e-spec.ts` (create)
- **Steps:**
  1. **Test (RED):** GET /waste-sources, POST { code, name, notes }, PATCH, DELETE.
  2. **Implement (GREEN):** CRUD endpoints.
  3. **Seed:** D, R, PS, PU, PL, S.
- **Acceptance criteria:**
  - [ ] CRUD working.
  - [ ] 6 waste sources seeded.
  - [ ] Tests ≥85%; lint/typecheck clean.

---

## Epic 1.6 — Scheduling (crew schedules, trip templates, fuel quotas) (Size: L)

#### T-120. CrewSchedule CRUD (TDD)
- **Size:** M · **Coverage:** ≥85%
- **Depends on:** T-112, T-115
- **Files:**
  - `apps/backend/src/modules/scheduling/crew-schedules/crew-schedules.controller.ts` (create)
  - `apps/backend/src/modules/scheduling/crew-schedules/crew-schedules.service.ts` (create)
  - `apps/backend/src/modules/scheduling/crew-schedules/crew-schedules.repository.ts` (create)
  - `apps/backend/src/modules/scheduling/crew-schedules/dto/create-crew-schedule.dto.ts` (create)
  - `packages/schemas/src/crew-schedule.schema.ts` (create)
  - `apps/backend/test/crew-schedules.e2e-spec.ts` (create)
- **Steps:**
  1. **Test (RED):**
     - POST /crew-schedules { vehicleId, driverId, departTime, returnTime }.
     - Validators: vehicle + driver exist, departTime < returnTime (same day), one crew per (vehicle, driver) pair at a time.
     - GET /crew-schedules (filter by vehicle, driver, active on date).
     - PATCH /crew-schedules/:id, DELETE.
  2. **Implement (GREEN):** Service validates constraints.
- **Acceptance criteria:**
  - [ ] POST /crew-schedules → 201, schedule created.
  - [ ] departTime ≥ returnTime → 400.
  - [ ] Duplicate (vehicle, driver) at overlapping time → 409 Conflict.
  - [ ] Tests ≥85%; lint/typecheck clean.

#### T-121. TripTemplate CRUD (TDD)
- **Size:** M · **Coverage:** ≥85%
- **Depends on:** T-120, T-118
- **Files:**
  - `apps/backend/src/modules/scheduling/trip-templates/trip-templates.controller.ts` (create)
  - `apps/backend/src/modules/scheduling/trip-templates/trip-templates.service.ts` (create)
  - `apps/backend/src/modules/scheduling/trip-templates/dto/` (create DTOs)
  - `packages/schemas/src/trip-template.schema.ts` (create)
  - `apps/backend/test/trip-templates.e2e-spec.ts` (create)
- **Steps:**
  1. **Test (RED):**
     - POST /crew-schedules/:id/trip-templates { routeId, targetTime, fuelRequestedLiters }.
     - targetTime stored as string "HH:mm" or DateTime @db.Time.
     - GET /crew-schedules/:id/trip-templates → 200, list.
     - PATCH, DELETE.
  2. **Implement (GREEN):** Service validates routeId FK, targetTime format.
- **Acceptance criteria:**
  - [ ] POST → 201, template created.
  - [ ] GET /crew-schedules/:id/trip-templates → 200, list.
  - [ ] Tests ≥85%; lint/typecheck clean.

#### T-122. FuelQuota (kitir) CRUD (TDD)
- **Size:** M · **Coverage:** ≥85%
- **Depends on:** T-112, T-117
- **Files:**
  - `apps/backend/src/modules/scheduling/fuel-quotas/fuel-quotas.controller.ts` (create)
  - `apps/backend/src/modules/scheduling/fuel-quotas/fuel-quotas.service.ts` (create)
  - `apps/backend/src/modules/scheduling/fuel-quotas/fuel-quotas.repository.ts` (create)
  - `apps/backend/src/modules/scheduling/fuel-quotas/dto/create-fuel-quota.dto.ts` (create)
  - `packages/schemas/src/fuel-quota.schema.ts` (create)
  - `apps/backend/test/fuel-quotas.e2e-spec.ts` (create)
- **Steps:**
  1. **Test (RED):**
     - POST /fuel-quotas { vehicleId, siteId, issuedAt, validFrom, validTo }.
     - Validators: vehicle + site exist, validFrom ≤ validTo, issuedAt ≤ validTo.
     - Response includes `id` (the **kitir code** TPA matches against).
     - GET /fuel-quotas (filter by vehicle, site, date, status).
     - PATCH /fuel-quotas/:id { status, validTo } (extend or revoke).
  2. **Implement (GREEN):** Service validates FKs + date constraints.
  3. **Note:** id is `BigInt` (for matching against large ID range from legacy).
- **Acceptance criteria:**
  - [ ] POST /fuel-quotas → 201, quota created, id returned (BigInt).
  - [ ] validFrom > validTo → 400.
  - [ ] GET /fuel-quotas?vehicleId=5&status=ACTIVE → 200, filtered.
  - [ ] PATCH /fuel-quotas/:id { status: INACTIVE } → 200.
  - [ ] Tests ≥85%; lint/typecheck clean.

---

## Epic 1.7 — Daily Transaction Initialization (Size: M)

#### T-123. TransactionDay auto-init job (TDD)
- **Size:** M · **Coverage:** ≥85%
- **Depends on:** T-120, T-121
- **Files:**
  - `apps/backend/src/modules/transactions/services/daily-init.service.ts` (create)
  - `apps/backend/src/modules/transactions/transaction-days/transaction-days.controller.ts` (create for manual trigger)
  - `apps/backend/src/modules/transactions/transaction-days/transaction-days.service.ts` (create)
  - `apps/backend/test/daily-init.e2e-spec.ts` (create)
- **Steps:**
  1. **Test (RED):**
     - Job runs at 03:00 daily (use `@nestjs/schedule` + `@Cron('0 3 * * *')`).
     - Creates TransactionDay { date: today(), status: IN_PROGRESS }.
     - For each active CrewSchedule (no end date):
       - Create Haul { transactionDayId, vehicleId, status: IN_PROGRESS }.
       - Create HaulAssignment { haulId, driverId, crewScheduleId, departTargetTime, departTargetOdometer (from vehicle.currentOdometer), returnTargetTime, status: IN_PROGRESS }.
       - For each TripTemplate in schedule:
         - Create Trip { haulAssignmentId, routeId, category (from route), targetTime, targetOdometer, status: IN_PROGRESS }.
     - Idempotent: if TransactionDay already exists for today, skip.
  2. **Implement (GREEN):** DailyInitService:
     - Query active CrewSchedules.
     - Bulk insert Hauls, HaulAssignments, Trips in a transaction.
     - Log counts created.
  3. **Refactor:** extract bulk insert logic, handle partial failures gracefully.
- **Acceptance criteria:**
  - [ ] Job runs at 03:00 UTC (or configurable timezone).
  - [ ] TransactionDay created for today.
  - [ ] All Hauls + Assignments + Trips seeded in one transaction.
  - [ ] Re-run same day is idempotent (no duplicates).
  - [ ] Tests ≥85%; e2e test: verify counts after run.
  - [ ] lint/typecheck clean.

#### T-124. TransactionDay CRUD endpoints
- **Size:** S · **Coverage:** ≥85%
- **Depends on:** T-123
- **Files:**
  - `apps/backend/src/modules/transactions/transaction-days/transaction-days.controller.ts` (modify)
  - `apps/backend/src/modules/transactions/transaction-days/transaction-days.service.ts` (modify)
  - `apps/backend/test/transaction-days.e2e-spec.ts` (create)
- **Steps:**
  1. **Test (RED):**
     - GET /transaction-days?date=YYYY-MM-DD or /transaction-days/:id → 200, full tree (hauls, assignments, trips).
     - PATCH /transaction-days/:id { status } (mark DONE when all hauls done).
     - Manual trigger endpoint: POST /transaction-days/initialize-today (for testing).
  2. **Implement (GREEN):** Service fetches full tree via relations.
- **Acceptance criteria:**
  - [ ] GET /transaction-days/:id → 200, includes hauls[].assignments[].trips[].
  - [ ] PATCH → 200, status updated.
  - [ ] Tests ≥85%; lint/typecheck clean.

---

## Epic 1.8 — Trip Recording & Verification (TDD) (Size: L)

**Critical operational flow.** Each trip type (REFUEL, PICKUP, DISPOSAL, DEPART_POOL, RETURN_POOL) has specific fields. State transitions locked after VERIFIED.

#### T-125. Record depart (HaulAssignment depart)
- **Size:** M · **Coverage:** ≥90%
- **Depends on:** T-123
- **Files:**
  - `apps/backend/src/modules/transactions/haul-assignments/haul-assignments.controller.ts` (create)
  - `apps/backend/src/modules/transactions/haul-assignments/haul-assignments.service.ts` (create)
  - `apps/backend/src/modules/transactions/haul-assignments/dto/record-depart.dto.ts` (create)
  - `packages/schemas/src/haul-assignment.schema.ts` (create)
  - `apps/backend/test/haul-assignments.e2e-spec.ts` (create)
- **Steps:**
  1. **Test (RED):**
     - PUT /haul-assignments/:id/record-depart { actualOdometer, actualTime }.
     - Validators: actualOdometer ≥ vehicle.currentOdometer (or targetOdometer), actualTime within business hours (optional).
     - Response: 200, updated HaulAssignment.
  2. **Implement (GREEN):**
     - Service validates odometer monotonic.
     - Update HaulAssignment { departActualOdometer, departActualTime }.
  3. **Refactor:** extract time validation.
- **Acceptance criteria:**
  - [ ] PUT /haul-assignments/:id/record-depart → 200, departActualOdometer set.
  - [ ] actualOdometer < vehicle.currentOdometer → 400.
  - [ ] Tests ≥90%; lint/typecheck clean.

#### T-126. Record return (HaulAssignment return)
- **Size:** M · **Coverage:** ≥90%
- **Depends on:** T-125
- **Files:**
  - `apps/backend/src/modules/transactions/haul-assignments/dto/record-return.dto.ts` (create)
  - `apps/backend/test/haul-assignments.e2e-spec.ts` (modify)
- **Steps:**
  1. **Test (RED):**
     - PUT /haul-assignments/:id/record-return { actualOdometer, actualTime }.
     - Validators: actualOdometer ≥ departActualOdometer, actualTime ≥ departActualTime.
     - Update Vehicle.currentOdometer to actualOdometer.
     - Set HaulAssignment.status = DONE.
     - If all assignments in haul done, set Haul.status = DONE.
  2. **Implement (GREEN):** Service orchestrates vehicle update + assignment status.
- **Acceptance criteria:**
  - [ ] PUT /haul-assignments/:id/record-return → 200, status DONE.
  - [ ] Vehicle.currentOdometer updated.
  - [ ] actualOdometer < departActualOdometer → 400.
  - [ ] Haul.status transitions to DONE if all assignments done.
  - [ ] Tests ≥90%; lint/typecheck clean.

#### T-127. Record REFUEL trip
- **Size:** M · **Coverage:** ≥90%
- **Depends on:** T-123
- **Files:**
  - `apps/backend/src/modules/transactions/trips/trips.controller.ts` (create)
  - `apps/backend/src/modules/transactions/trips/trips.service.ts` (create)
  - `apps/backend/src/modules/transactions/trips/trips.repository.ts` (create)
  - `apps/backend/src/modules/transactions/trips/dto/record-trip.dto.ts` (create)
  - `packages/schemas/src/trip.schema.ts` (create)
  - `apps/backend/test/trips.e2e-spec.ts` (create)
- **Steps:**
  1. **Test (RED):**
     - PUT /trips/:id { actualTime, actualOdometer, fuelRequestedLiters, fuelApprovedLiters (optional), status: DONE }.
     - Validators: actualOdometer ≥ previous trip's actualOdometer.
     - If fuelApprovedLiters not provided, default to fuelRequestedLiters (unless permission `fuel:approve` allows override).
     - Response: 200, updated Trip with realizationEntryAt, recordedById.
  2. **Implement (GREEN):** Service validates FK + odometer chain; logs user ID on record.
- **Acceptance criteria:**
  - [ ] PUT /trips/:id (REFUEL type) → 200, fuel fields set, status DONE.
  - [ ] fuelApprovedLiters > fuelRequestedLiters (no override perm) → 400.
  - [ ] Tests ≥90%; lint/typecheck clean.

#### T-128. Record PICKUP trip
- **Size:** M · **Coverage:** ≥90%
- **Depends on:** T-127
- **Files:**
  - `apps/backend/test/trips.e2e-spec.ts` (modify)
- **Steps:**
  1. **Test (RED):**
     - PUT /trips/:id { actualTime, actualOdometer, tareWeight (optional; default from vehicle), status: DONE }.
     - Validators: actualOdometer ≥ prev, tareWeight ≥ 0.
  2. **Implement (GREEN):** Service sets tareWeight from vehicle if not provided.
- **Acceptance criteria:**
  - [ ] PUT /trips/:id (PICKUP type) → 200, tareWeight set.
  - [ ] Tests ≥90%; lint/typecheck clean.

#### T-129. Record DISPOSAL trip (with weighing)
- **Size:** M · **Coverage:** ≥90%
- **Depends on:** T-128
- **Files:**
  - `apps/backend/test/trips.e2e-spec.ts` (modify)
- **Steps:**
  1. **Test (RED):**
     - PUT /trips/:id { actualTime, actualOdometer, grossWeight, tareWeight (override if weighed), wasteVolume (optional), status: DONE }.
     - **Critical business rule:** Compute `netWeight = grossWeight - tareWeight` server-side; reject if `grossWeight < tareWeight`.
     - Validators: actualOdometer ≥ prev, grossWeight > 0, tareWeight ≥ 0.
  2. **Implement (GREEN):** Service enforces netWeight = grossWeight - tareWeight; rejects if invalid.
  3. **Note:** This is the gate for data quality — all weighing logic resides here.
- **Acceptance criteria:**
  - [ ] PUT /trips/:id (DISPOSAL type) → 200, grossWeight, netWeight computed.
  - [ ] grossWeight < tareWeight → 400 "Invalid weighing: net weight would be negative".
  - [ ] netWeight = grossWeight - tareWeight verified in response.
  - [ ] Tests ≥90%; lint/typecheck clean.

#### T-130. Record DEPART_POOL & RETURN_POOL (passive)
- **Size:** S · **Coverage:** ≥90%
- **Depends on:** T-127
- **Files:**
  - `apps/backend/test/trips.e2e-spec.ts` (modify)
- **Steps:**
  1. **Test (RED):** PUT /trips/:id { actualTime, actualOdometer, status: DONE } for passive trips.
  2. **Implement (GREEN):** Service minimal validation.
- **Acceptance criteria:**
  - [ ] PUT /trips/:id (DEPART_POOL or RETURN_POOL) → 200, status DONE.
  - [ ] Tests ≥90%; lint/typecheck clean.

#### T-131. Trip verification endpoint
- **Size:** M · **Coverage:** ≥85%
- **Depends on:** T-129
- **Files:**
  - `apps/backend/src/modules/transactions/trips/trips.controller.ts` (modify)
  - `apps/backend/src/modules/transactions/trips/trips.service.ts` (modify)
  - `apps/backend/test/trips.e2e-spec.ts` (modify)
- **Steps:**
  1. **Test (RED):**
     - PUT /trips/:id/verify (requires `trip:verify` permission).
     - Guard: user must be Checker role (or have trip:verify).
     - Update Trip { status: VERIFIED }.
     - Lock: prevent further edits unless `trip:verify:override` perm (supervisor only).
     - Log audit entry (user, timestamp, action).
  2. **Implement (GREEN):** Service updates status + logs audit.
  3. **Refactor:** audit log to separate table (optional; use soft-delete flag in MVP).
- **Acceptance criteria:**
  - [ ] PUT /trips/:id/verify (with perm) → 200, status VERIFIED.
  - [ ] Without `trip:verify` perm → 403.
  - [ ] Subsequent PATCH /trips/:id (no override perm) → 403 "Trip is verified; cannot edit".
  - [ ] Audit logged (user, timestamp).
  - [ ] Tests ≥85%; lint/typecheck clean.

#### T-132. Trip GET endpoints (read)
- **Size:** S · **Coverage:** ≥90%
- **Depends on:** T-131
- **Files:**
  - `apps/backend/src/modules/transactions/trips/trips.controller.ts` (modify)
  - `apps/backend/test/trips.e2e-spec.ts` (modify)
- **Steps:**
  1. **Test (RED):**
     - GET /trips/:id → 200, full trip with route, assignments, parent haul/transaction.
     - GET /haul-assignments/:id/trips → 200, list of trips in assignment.
  2. **Implement (GREEN):** Repository queries with includes.
- **Acceptance criteria:**
  - [ ] GET /trips/:id → 200, includes route, haulAssignment, haul, transactionDay.
  - [ ] GET /haul-assignments/:id/trips → 200, list of trips.
  - [ ] Tests ≥90%; lint/typecheck clean.

---

## Epic 1.9 — Frontend UI Framework (Size: L)

#### T-133. Layout & shell
- **Size:** S · **Coverage:** N/A
- **Depends on:** Phase-0 Next.js bootstrap
- **Files:**
  - `apps/web/app/layout.tsx` (modify)
  - `apps/web/src/components/Header.tsx` (create)
  - `apps/web/src/components/Sidebar.tsx` (create)
  - `apps/web/src/components/UserMenu.tsx` (create)
- **Steps:**
  1. **Design:** persistent header (logo, user menu, logout), sidebar (navigation), main content area.
  2. **Implement:** use shadcn/ui components (e.g., Sheet for mobile sidebar, Dropdown for user menu).
  3. **Styling:** Tailwind, dark-mode support.
- **Acceptance criteria:**
  - [ ] Layout renders; header + sidebar visible on all pages.
  - [ ] User menu shows current user name, logout button.
  - [ ] Mobile responsive (sidebar → Sheet on small screens).
  - [ ] lint/typecheck clean.

#### T-134. Navigation & permission-based UI
- **Size:** M · **Coverage:** N/A
- **Depends on:** T-133, T-108
- **Files:**
  - `apps/web/src/components/Sidebar.tsx` (modify)
  - `apps/web/src/lib/hooks/usePermissions.ts` (create)
  - `apps/web/src/lib/api-client.ts` (modify to cache auth/me)
- **Steps:**
  1. **Implement:** usePermissions() hook — fetch /api/v1/auth/me, return user + permissions.
  2. Conditionally render sidebar menu items based on permissions (e.g., show "Fleet" only if user has vehicle:read).
  3. Use next-intl for menu labels (Indonesian).
- **Acceptance criteria:**
  - [ ] Sidebar menu dynamic per user role.
  - [ ] Admin sees all menu items.
  - [ ] Data-entry role sees only data entry menus.
  - [ ] lint/typecheck clean.

#### T-135. Login page
- **Size:** M · **Coverage:** N/A
- **Depends on:** T-102
- **Files:**
  - `apps/web/app/(auth)/login/page.tsx` (create)
  - `apps/web/src/components/LoginForm.tsx` (create)
  - `apps/web/src/i18n/messages/id.json` (modify)
- **Steps:**
  1. **Design:** form with username, password, submit button.
  2. **Implement:** POST /api/v1/auth/login, handle errors (toast), redirect to home on success.
  3. **Validation:** Zod schema for inputs.
- **Acceptance criteria:**
  - [ ] Login form renders.
  - [ ] Valid credentials → 200, redirect to home.
  - [ ] Invalid credentials → toast error "Invalid credentials".
  - [ ] Form validation (required fields).
  - [ ] lint/typecheck clean.

#### T-136. Home / dashboard stub
- **Size:** S · **Coverage:** N/A
- **Depends on:** T-133
- **Files:**
  - `apps/web/app/page.tsx` (modify)
- **Steps:**
  1. **Design:** welcome banner, quick links to data entry / monitoring (TBD Phase 2).
  2. **Implement:** simple layout with welcome message.
- **Acceptance criteria:**
  - [ ] Home page loads, shows welcome banner + quick links.
  - [ ] lint/typecheck clean.

---

## Epic 1.10 — Frontend Master-Data CRUD Pages (Size: XL)

For each entity, build: list (table + filters + pagination), create (form + validation), edit (fetch + form), delete (soft delete + confirm).

#### T-137. Vehicle list & CRUD
- **Size:** L · **Coverage:** ≥80%
- **Depends on:** T-112, T-134
- **Files:**
  - `apps/web/app/(admin)/fleet/vehicles/page.tsx` (create)
  - `apps/web/src/components/VehicleTable.tsx` (create)
  - `apps/web/src/components/VehicleForm.tsx` (create)
  - `apps/web/src/lib/api/vehicles.ts` (create — API client wrapper)
  - `apps/web/test/vehicles.spec.tsx` (create)
- **Steps:**
  1. **List page:** 
     - GET `/api/v1/vehicles?page=1&limit=20&status=GOOD` to fetch vehicles
     - Table with columns: plate number, model, pool, status, current tare, current odometer
     - Filters: status, pool, model; search by plate number
     - Pagination: page, limit controls
     - Quick actions: edit, delete buttons
  2. **Create/Edit form:**
     - POST `/api/v1/vehicles` for create
     - PATCH `/api/v1/vehicles/:id` for update
     - Zod schema validation (from `packages/schemas/src/vehicle.schema.ts`)
  3. **Delete:**
     - DELETE `/api/v1/vehicles/:id` (soft delete)
     - Confirmation modal before submit
- **Acceptance criteria:**
  - [ ] Vehicle list page loads, displays 20 vehicles paginated.
  - [ ] Filters work (status, pool, model); search by plate number.
  - [ ] Create form validates inputs, submits POST → `/api/v1/vehicles`.
  - [ ] Edit form loads vehicle data, submits PATCH to `/api/v1/vehicles/:id`.
  - [ ] Delete shows confirmation modal, submits DELETE, refreshes list.
  - [ ] All API calls correctly formed (headers, body, method).
  - [ ] Tests ≥80%; lint/typecheck clean.

#### T-138. Driver list & CRUD
- **Size:** L · **Coverage:** ≥80%
- **Depends on:** T-115, T-134
- **Files:**
  - `apps/web/app/(admin)/personnel/drivers/page.tsx` (create)
  - `apps/web/src/components/DriverTable.tsx` (create)
  - `apps/web/src/components/DriverForm.tsx` (create)
  - `apps/web/src/lib/api/drivers.ts` (create)
  - `apps/web/test/drivers.spec.tsx` (create)
- **Steps:**
  1. **List page:** name, ID card, pool, employment status, licenses (sub-table or popover), contact.
  2. Create/edit form, delete.
- **Acceptance criteria:**
  - [ ] Driver list + CRUD working.
  - [ ] Licenses shown in sub-table or popover.
  - [ ] Tests ≥80%; lint/typecheck clean.

#### T-139. Site list & CRUD
- **Size:** M · **Coverage:** ≥80%
- **Depends on:** T-117, T-134
- **Files:**
  - `apps/web/app/(admin)/geography/sites/page.tsx` (create)
  - `apps/web/src/components/SiteTable.tsx` (create)
  - `apps/web/src/components/SiteForm.tsx` (create)
  - `apps/web/src/lib/api/sites.ts` (create)
  - `apps/web/test/sites.spec.tsx` (create)
- **Steps:**
  1. **List page:** name, type (Pool/TPS/TPA/SPBU), address, coordinates.
  2. Map view optional (Phase 5).
  3. Create/edit/delete.
- **Acceptance criteria:**
  - [ ] Site list + CRUD working.
  - [ ] Tests ≥80%; lint/typecheck clean.

#### T-140. Route list & CRUD
- **Size:** M · **Coverage:** ≥80%
- **Depends on:** T-118, T-134
- **Files:**
  - `apps/web/app/(admin)/geography/routes/page.tsx` (create)
  - `apps/web/src/components/RouteTable.tsx` (create)
  - `apps/web/src/components/RouteForm.tsx` (create)
  - `apps/web/src/lib/api/routes.ts` (create — API client wrapper)
  - `apps/web/test/routes.spec.tsx` (create)
- **Steps:**
  1. **List page:**
     - GET `/api/v1/routes?page=1&limit=50` to fetch routes
     - Table: origin → destination, category, distance km
     - Filters: origin site, destination site, category
     - Pagination
  2. **Create/Edit form:**
     - POST `/api/v1/routes` / PATCH `/api/v1/routes/:id`
     - Dropdowns for origin/destination sites (from cached reference data)
     - Category enum selector
  3. **Delete:**
     - DELETE `/api/v1/routes/:id`
     - Only allowed if route has no associated trips (or confirm soft-delete logic)
- **Acceptance criteria:**
  - [ ] Route list + CRUD working (POST, PATCH, DELETE endpoints called correctly).
  - [ ] Filters work (origin, destination, category).
  - [ ] Tests ≥80%; lint/typecheck clean.

#### T-141. CrewSchedule list & CRUD
- **Size:** M · **Coverage:** ≥80%
- **Depends on:** T-120, T-134
- **Files:**
  - `apps/web/app/(admin)/scheduling/crew-schedules/page.tsx` (create)
  - `apps/web/src/components/CrewScheduleTable.tsx` (create)
  - `apps/web/src/components/CrewScheduleForm.tsx` (create)
  - `apps/web/src/lib/api/crew-schedules.ts` (create)
  - `apps/web/test/crew-schedules.spec.tsx` (create)
- **Steps:**
  1. **List page:** vehicle (plate), driver, depart time, return time, trip templates (count).
  2. Create/edit/delete.
- **Acceptance criteria:**
  - [ ] CrewSchedule list + CRUD working.
  - [ ] Tests ≥80%; lint/typecheck clean.

#### T-142. FuelQuota (kitir) list & CRUD
- **Size:** M · **Coverage:** ≥80%
- **Depends on:** T-122, T-134
- **Files:**
  - `apps/web/app/(admin)/scheduling/fuel-quotas/page.tsx` (create)
  - `apps/web/src/components/FuelQuotaTable.tsx` (create)
  - `apps/web/src/components/FuelQuotaForm.tsx` (create)
  - `apps/web/src/lib/api/fuel-quotas.ts` (create)
  - `apps/web/test/fuel-quotas.spec.tsx` (create)
- **Steps:**
  1. **List page:** vehicle, site, issued date, valid from/to, status, kitir ID (big int).
  2. Create/edit (extend, revoke), delete.
- **Acceptance criteria:**
  - [ ] FuelQuota list + CRUD working; kitir ID displayed.
  - [ ] Tests ≥80%; lint/typecheck clean.

---

## Epic 1.11 — Frontend Daily Transaction Workflow (Size: L)

#### T-143. Transaction day list & detail
- **Size:** L · **Coverage:** ≥80%
- **Depends on:** T-124, T-134
- **Files:**
  - `apps/web/app/(admin)/transactions/days/page.tsx` (create)
  - `apps/web/app/(admin)/transactions/days/[dateISO]/page.tsx` (create)
  - `apps/web/src/components/TransactionDayTable.tsx` (create)
  - `apps/web/src/components/TransactionDayDetail.tsx` (create)
  - `apps/web/src/components/HaulPanel.tsx` (create)
  - `apps/web/src/components/TripCard.tsx` (create)
  - `apps/web/src/lib/api/transactions.ts` (create)
  - `apps/web/test/transaction-days.spec.tsx` (create)
- **Steps:**
  1. **List page:** table of days, status (DONE/IN_PROGRESS), haul count, quick actions.
  2. **Detail page:** expandable haul rows, assignment panels, trip cards.
  3. **Trip card:** show trip type, status, actual/target times, odometer, weights (if disposal).
  4. Quick action buttons: record depart, record return, mark trip done, verify.
- **Acceptance criteria:**
  - [ ] List page loads transaction days.
  - [ ] Detail page shows hauls + assignments + trips (tree structure).
  - [ ] Quick action buttons visible & clickable.
  - [ ] Tests ≥80%; lint/typecheck clean.

#### T-144. Record-depart form
- **Size:** M · **Coverage:** ≥80%
- **Depends on:** T-125, T-134, T-143
- **Files:**
  - `apps/web/src/components/RecordDepartForm.tsx` (create)
- **Steps:**
  1. **Modal/inline form:** actual odometer + actual time.
  2. Validate odometer ≥ current.
  3. POST to `/haul-assignments/:id/record-depart`.
  4. Toast success, refresh trip list.
- **Acceptance criteria:**
  - [ ] Form renders in modal.
  - [ ] Validation: odometer required, time required.
  - [ ] Submit POST → /haul-assignments/:id/record-depart.
  - [ ] lint/typecheck clean.

#### T-145. Record-return form
- **Size:** M · **Coverage:** ≥80%
- **Depends on:** T-126, T-134, T-143
- **Files:**
  - `apps/web/src/components/RecordReturnForm.tsx` (create)
- **Steps:**
  1. Similar to record-depart.
  2. POST to `/haul-assignments/:id/record-return`.
- **Acceptance criteria:**
  - [ ] Form renders, validation, submit working.
  - [ ] lint/typecheck clean.

#### T-146. Record-trip form (polymorphic)
- **Size:** L · **Coverage:** ≥80%
- **Depends on:** T-127–T-130, T-134, T-143
- **Files:**
  - `apps/web/src/components/RecordTripForm.tsx` (create)
  - `apps/web/test/record-trip-form.spec.tsx` (create)
- **Steps:**
  1. **Polymorphic form:** detect trip category (REFUEL/PICKUP/DISPOSAL/DEPART_POOL/RETURN_POOL).
  2. **REFUEL:** fuel request/approved fields.
  3. **PICKUP:** tare weight field.
  4. **DISPOSAL:** gross/tare/net/volume fields; compute net automatically on blur (gross - tare) for reference only (server computes authoritative netWeight).
  5. **All:** actual time + odometer.
  6. PUT to `/trips/:id`.
  7. Validation: reject if net < 0 (client-side warning only; server enforces).
- **Acceptance criteria:**
  - [ ] Form detects trip type correctly.
  - [ ] DISPOSAL form shows gross/tare/net; net auto-computed (client-side, reference only).
  - [ ] net < 0 validation error: "Net weight cannot be negative".
  - [ ] Submit PUT → `/trips/:id`.
  - [ ] Tests ≥80%; lint/typecheck clean.

#### T-147. Trip verification flow
- **Size:** M · **Coverage:** ≥80%
- **Depends on:** T-131, T-134, T-143
- **Files:**
  - `apps/web/src/components/VerifyTripButton.tsx` (create)
  - `apps/web/test/verify-trip.spec.tsx` (create)
- **Steps:**
  1. "Verify" button on trip card (visible only to users with `trip:verify` permission; check via `usePermissions()` hook).
  2. Confirmation modal: "Mark as verified? This is irreversible."
  3. PUT to `/api/v1/trips/:id/verify`.
  4. On success: refetch trip data, trip card transitions to "VERIFIED" state (visual: greyed background, lock icon).
  5. On 403: show error toast "You do not have permission to verify trips".
- **Acceptance criteria:**
  - [ ] Verify button shows only to users with `trip:verify` permission.
  - [ ] Confirmation modal appears on click.
  - [ ] Submit PUT → `/api/v1/trips/:id/verify`.
  - [ ] Trip card updates to VERIFIED state (visual feedback) after success.
  - [ ] 403 response shows error toast.
  - [ ] Tests ≥80%; lint/typecheck clean.

---

## Epic 1.12 — Frontend Auth & Permissions (Size: M)

#### T-148. Login flow
- **Size:** M · **Coverage:** ≥80%
- **Depends on:** T-135, T-134
- **Files:**
  - `apps/web/src/lib/api-client.ts` (modify for auth)
  - `apps/web/app/(auth)/login/page.tsx` (modify)
- **Steps:**
  1. POST `/api/v1/auth/login` from login page (from T-135 LoginForm component).
  2. Server sets httpOnly session cookie.
  3. Frontend stores session (implicit via cookie).
  4. Redirect to home or return URL (next query param).
- **Acceptance criteria:**
  - [ ] Login flow: submit → success → redirect to home.
  - [ ] Session cookie set (verify in DevTools).
  - [ ] lint/typecheck clean.

#### T-149. Route guards
- **Size:** M · **Coverage:** ≥80%
- **Depends on:** T-104, T-148
- **Files:**
  - `apps/web/src/middleware.ts` (create/modify)
  - `apps/web/src/lib/auth-context.tsx` (create)
- **Steps:**
  1. **Middleware:** check `GET /auth/me` on every request to protected routes.
  2. If 401, redirect to login.
  3. If 200, set auth context.
  4. Apply to all `/admin/*` routes.
- **Acceptance criteria:**
  - [ ] Unauthenticated user → redirect to /login.
  - [ ] Authenticated user → access to /admin routes.
  - [ ] lint/typecheck clean.

#### T-150. Permission-based UI
- **Size:** M · **Coverage:** ≥80%
- **Depends on:** T-104, T-134
- **Files:**
  - `apps/web/src/lib/hooks/usePermissions.ts` (modify)
  - `apps/web/src/components/ProtectedAction.tsx` (create)
- **Steps:**
  1. **usePermissions():** hook returns user + permissions from auth context.
  2. **ProtectedAction component:** conditionally render buttons/links based on permission check.
  3. Show 403 tooltip on hover for unauthorized actions.
- **Acceptance criteria:**
  - [ ] usePermissions() hook works.
  - [ ] Buttons hidden/disabled for users without permission.
  - [ ] Admin sees all actions; data-entry role sees only data-entry actions.
  - [ ] lint/typecheck clean.

---

## Epic 1.13 — Data & Image Migration (Size: XL)

**Critical phase.** Full spec: [`04-migration.md`](../04-migration.md). Note: sample dump is master-data snapshot; live system has **tens of millions of transactional rows + multi-TB image corpus** since 2013.

#### T-151. Migration discovery (FIRST, read-only)
- **Size:** M · **Coverage:** N/A
- **Depends on:** Phase-0 infrastructure (MySQL access to live DB or a recent copy)
- **Files:**
  - `scripts/migrate-discovery.ts` (create)
  - Output: `migration-discovery-report.json` or `.md`
- **Steps:**
  1. **Read-only profiling** of live MySQL DB + image store:
     - Per-table row counts (per year: 2013–2026).
     - Daily peak insert rate.
     - Total DB size + largest tables + index sizes.
     - Min/max dates per transactional table.
     - Image inventory: total file count + bytes, directory structure, orphaned rows/files.
     - Data-quality scan: zero-dates, (0,0) GPS, bogus years, duplicate routes, encoding anomalies, FK orphans.
  2. **Output:** JSON/Markdown report driving partitioning, archive config, cutover timing.
  3. **Note:** Provided dump is master-data-only snapshot; LIVE system has tens of millions of transactional rows + multi-TB image corpus since 2013; discovery must run on actual live DB (per [`README.md` Risk & mitigation`](./README.md#risk--mitigation)).
- **Acceptance criteria:**
  - [ ] Discovery script runs against live DB without modification.
  - [ ] Report includes per-year row counts (transactional tables).
  - [ ] Report includes image inventory (count + bytes).
  - [ ] Report flags data-quality issues (counts, examples).
  - [ ] Report used to finalize partition boundaries & archive retention window.

#### T-152. Migration script setup
- **Size:** L · **Coverage:** N/A
- **Depends on:** T-151
- **Files:**
  - `scripts/migrate-legacy.ts` (create)
  - Uses: `mysql2/promise` to read legacy DB, `PrismaClient` to write to PostgreSQL.
- **Steps:**
  1. **Streamed, batched, resumable** ingestion:
     - Use cursor/keyset pagination (e.g., `WHERE id > cursor LIMIT 10000`).
     - Never load entire table into memory.
     - Log watermark (last id processed) to a marker table or file.
     - Support `--resume` flag to pick up after interruption.
  2. **Idempotent:** by `legacyId` — re-running doesn't create duplicates.
  3. **Dependency order:** see 04-migration §3.
  4. **Logging:** all steps, errors, warnings, counts.
- **Acceptance criteria:**
  - [ ] Script reads from MySQL, writes to PostgreSQL via Prisma.
  - [ ] Handles 10k+ row batches without memory blow-up.
  - [ ] Supports `--resume` flag (resumes from last watermark).
  - [ ] Logs are detailed, searchable (for troubleshooting).
  - [ ] Script runs (with dummy data) without error.

#### T-153. Master-data migration
- **Size:** M · **Coverage:** N/A
- **Depends on:** T-152
- **Files:**
  - `scripts/migrate-legacy.ts` (modify)
- **Steps:**
  1. **Dependency order:** SiteType → Site → Route → VehicleApplication → VehicleModel → Vehicle → Driver → DriverLicense → WasteSource → VehicleWasteSource.
  2. For each table:
     - Read legacy rows.
     - Map columns (type conversions, enum mapping, null handling).
     - Insert via Prisma `createMany` or bulk.
     - Populate `legacyId`, `createdAt: legacyTimestamp`, `updatedAt: legacyTimestamp`.
     - Log counts + errors.
  3. **Data fixes:**
     - (0,0) GPS in Site → NULL.
     - TAHUNPEMBUATAN = 1900 → NULL.
     - Duplicate routes → dedupe by (originSiteId, destinationSiteId, category).
     - Empty dates → NULL.
- **Acceptance criteria:**
  - [ ] All master-data tables migrated.
  - [ ] Counts match legacy (or documented diffs).
  - [ ] legacyId populated for traceability.
  - [ ] Data-quality fixes applied (no (0,0) GPS, no 1900 years, no dups).
  - [ ] Logs confirm all tables migrated.

#### T-154. User & role migration
- **Size:** M · **Coverage:** N/A
- **Depends on:** T-152, T-108
- **Files:**
  - `scripts/migrate-legacy.ts` (modify)
- **Steps:**
  1. Migrate legacy `pengguna` (users) → User.
  2. **NEVER migrate MD5 hashes.** Generate random unusable Argon2id hash + `mustChangePassword: true` (per [`README.md` Risk & mitigation`](./README.md#risk--mitigation), users receive temp credentials out-of-band).
  3. Distribute temp credentials out-of-band (see [`04-migration.md`](../04-migration.md) §5).
  4. Migrate legacy `hakakses` (roles) → Role.
  5. Derive `Permission`/`RolePermission` from legacy `menu`/`hakaksesmenu` grants (see [`04-migration.md`](../04-migration.md) §6) or use best-effort mapping based on legacy role type.
  6. Map legacy role IDs to new role names ([`01-glossary.md`](../01-glossary.md) §5); preserve legacyId for traceability.
- **Acceptance criteria:**
  - [ ] Users migrated with legacyId.
  - [ ] No MD5 hashes in new DB; all mustChangePassword=true.
  - [ ] Roles migrated + permission mappings created.
  - [ ] No legacy role IDs visible in new schema.
  - [ ] Logs confirm user + role migration.

#### T-155. Transactional data migration (high volume — partitioned)
- **Size:** L · **Coverage:** N/A
- **Depends on:** T-152
- **Files:**
  - `scripts/migrate-legacy.ts` (modify)
  - Partitioned tables: Trip, HaulAssignment, Haul, FuelQuota (monthly RANGE partitions pre-created).
- **Steps:**
  1. Legacy `transaksiangkutsampah`, `detailtransaksiangkutsampah`, `trayek`, `sampahmasuktpa` → partitioned PG tables.
  2. **Oldest → newest** (chronological order by operationDate).
  3. **Batched/streamed** (§3.1): e.g., 1 month at a time, 10k rows per batch.
  4. Set denormalized `operationDate` partition key.
  5. Map status enums (numeric → string).
  6. **After bulk load per partition:** build indexes, validate FKs, `ANALYZE`.
  7. **Reconcile per year:** compare legacy row counts to new by year.
- **Acceptance criteria:**
  - [ ] All transactional rows migrated (matching discovery counts per year).
  - [ ] Partitions used correctly (rows in correct month partitions).
  - [ ] No FK violations (sample check).
  - [ ] Indexes built, stats up-to-date (`ANALYZE`).
  - [ ] Per-year row-count reconciliation passes (≤1% variance).
  - [ ] Logs confirm batched ingestion (memory bounded).

#### T-156. Image migration (filesystem → object storage)
- **Size:** L · **Coverage:** N/A
- **Depends on:** T-155
- **Files:**
  - `scripts/migrate-images.ts` (create)
  - Uses: fs/streams, S3 client (or MinIO SDK).
- **Steps:**
  1. **Stream legacy photo files** → S3-compatible storage (MinIO or AWS S3).
  2. Insert `Photo` metadata rows (objectKey, checksum, dimensions).
  3. Generate thumbnails (optional in MVP; can defer to Phase 2).
  4. **Reconcile:** counts + orphans (see 04-migration §10).
     - Orphaned rows (DB path but no file) → log, don't migrate.
     - Orphaned files (file but no DB row) → log for manual review.
  5. **Resumable, bounded-concurrency** workers (e.g., 5 parallel uploads).
  6. **Checksum verification:** compare SHA256 after upload.
- **Acceptance criteria:**
  - [ ] All referenced images in object storage (or logged as orphaned).
  - [ ] Photo metadata rows created (objectKey, checksum).
  - [ ] Checksums verified (upload integrity).
  - [ ] Reconciliation report: counts match, orphans documented.
  - [ ] No image bytes in PostgreSQL (all in S3).
  - [ ] Script resumes on failure (bounded concurrency works).

#### T-157. Crew schedule & template migration
- **Size:** M · **Coverage:** N/A
- **Depends on:** T-152
- **Files:**
  - `scripts/migrate-legacy.ts` (modify)
- **Steps:**
  1. Legacy `masterdetailtransaksiangkutsampah` → `CrewSchedule`.
  2. Legacy `mastertrayek` → `TripTemplate`.
  3. Map columns, validate FK references.
- **Acceptance criteria:**
  - [ ] CrewSchedules migrated with legacyId.
  - [ ] TripTemplates migrated.
  - [ ] Counts match legacy.

#### T-158. FuelQuota (kitir) migration
- **Size:** M · **Coverage:** N/A
- **Depends on:** T-152
- **Files:**
  - `scripts/migrate-legacy.ts` (modify)
- **Steps:**
  1. Legacy `jatahkitir` → `FuelQuota`.
  2. Preserve ID (if numeric, use as bigint).
  3. Map validFrom, validTo, status.
- **Acceptance criteria:**
  - [ ] FuelQuotas migrated.
  - [ ] ID preserved for TPA matching (§4 of 04-migration).
  - [ ] Counts match legacy.

#### T-159. Migration validation & report
- **Size:** M · **Coverage:** N/A
- **Depends on:** T-158
- **Files:**
  - `scripts/verify-migration.ts` (create)
  - Output: migration-verification-report.md or .html
- **Steps:**
  1. **Post-migration checks:**
     - Row-count reconciliation per table (legacy vs new).
     - FK integrity spot check (sample queries; no orphaned FKs).
     - Data-quality validation (nulls, ranges, duplicates).
     - Image reconciliation (counts + orphans).
  2. **Report:** HTML/Markdown summary table, warnings, errors.
  3. **Fail criteria:** Critical errors (FK violations, counts >1% mismatch) → fail & halt.
- **Acceptance criteria:**
  - [ ] Verification script runs post-migration.
  - [ ] Row-count reconciliation within tolerance (≤1% variance per table).
  - [ ] No FK violations (spot check).
  - [ ] Report generated: summary + warnings + errors.
  - [ ] Critical errors trigger halt (return exit code 1).

---

## Epic 1.14 — Testing (Size: L)

#### T-160. Unit test suite (services)
- **Size:** L · **Coverage:** ≥85% per service
- **Depends on:** Each corresponding service (T-102, T-109, etc.)
- **Files:**
  - `apps/backend/src/modules/*/**.service.spec.ts` (create per module)
- **Steps:**
  1. For each service (AuthService, VehicleService, DriverService, etc.):
     - Write unit tests for business logic.
     - Mock Prisma client (use `jest.mock`).
     - Test success paths, validation errors, edge cases.
     - Aim for ≥85% coverage per service (>90% for critical paths like trip recording).
  2. **Tools:** Jest, @testing-library/jest-dom.
- **Acceptance criteria:**
  - [ ] Unit tests for all services (≥50 test files).
  - [ ] Coverage ≥85% per service (>90% for auth, trips).
  - [ ] `pnpm test` passes (all units green).
  - [ ] No console.log in code (config rule).

#### T-161. Integration test suite (endpoints)
- **Size:** L · **Coverage:** ≥80% per endpoint
- **Depends on:** Each corresponding endpoint (T-102, T-109, etc.)
- **Files:**
  - `apps/backend/test/*.e2e-spec.ts` (create per module; see above T-NNN files)
- **Steps:**
  1. Set up test database (separate test Postgres instance).
  2. For each endpoint: write tests.
     - Happy path: valid input → expected response.
     - Validation errors: 400 Bad Request.
     - Authorization: 403 Forbidden if no permission.
     - Not found: 404 if resource missing.
     - DB state verification after operation (e.g., record created, soft-deleted).
  3. Use `supertest` to test HTTP layer.
  4. Seed test data before each test (or use transactions + rollback).
- **Acceptance criteria:**
  - [ ] Integration tests for all endpoints (≥100 tests).
  - [ ] Coverage ≥80% per endpoint.
  - [ ] Happy + error paths tested.
  - [ ] `pnpm test:integration` passes (all green).
  - [ ] DB state verified (records created/updated/deleted).

#### T-162. E2E test suite (critical flows, Playwright)
- **Size:** L · **Coverage:** ≥80% of critical paths
- **Depends on:** T-143–T-147 (frontend transaction workflow)
- **Files:**
  - `apps/web/e2e/*.spec.ts` (create)
  - Uses: Playwright, assumes docker-compose stack running locally.
- **Steps:**
  1. Test critical user journeys:
     - Login → home.
     - Create vehicle → list → edit → soft delete.
     - Create driver → add license.
     - Initialize transaction day → record depart → record pickup → record disposal → verify.
  2. Run in CI on real app (docker-compose stack).
  3. Use `@playwright/test` (parallel execution, screenshot on failure).
- **Acceptance criteria:**
  - [ ] E2E tests for 8–10 critical flows.
  - [ ] Tests pass locally and in CI.
  - [ ] Coverage ≥80% of critical paths (main user journeys).
  - [ ] Failures include screenshots/traces for debugging.

---

## Epic 1.15 — Documentation & Deployment (Size: M)

#### T-163. README.md & setup guide
- **Size:** S · **Coverage:** N/A
- **Depends on:** Phase-0
- **Files:**
  - `README.md` (create/modify at monorepo root)
- **Steps:**
  1. How to clone, setup, run locally:
     - Clone repo.
     - `pnpm install`.
     - `docker-compose up -d`.
     - `pnpm prisma db seed`.
     - `pnpm dev`.
  2. Environment variables (copy `.env.example` → `.env.local`).
  3. Database migrations (`pnpm prisma migrate`).
  4. Running tests (`pnpm test`).
  5. Linting + typechecking (`pnpm lint && pnpm typecheck`).
  6. Building (`pnpm build`).
  7. Troubleshooting common issues.
- **Acceptance criteria:**
  - [ ] README exists, covers all setup steps.
  - [ ] Developer can follow README and run `pnpm dev` → both services running.
  - [ ] lint/typecheck clean.

#### T-164. API documentation (Swagger)
- **Size:** S · **Coverage:** N/A
- **Depends on:** All backend endpoints (T-102, T-109, etc.)
- **Files:**
  - Auto-generated via `@nestjs/swagger` (no manual file needed).
- **Steps:**
  1. Verify all endpoints decorated with `@ApiOperation`, `@ApiResponse`, `@ApiBody`.
  2. Run `pnpm dev` → `GET http://localhost:3000/api/docs` loads Swagger UI.
  3. Test endpoints from Swagger (manual QA).
- **Acceptance criteria:**
  - [ ] `GET /api/docs` loads Swagger UI.
  - [ ] All endpoints listed with descriptions, request/response bodies, status codes.
  - [ ] Swagger schemas match actual responses.

#### T-165. Docker production image
- **Size:** M · **Coverage:** N/A
- **Depends on:** Phase-0 Dockerfiles
- **Files:**
  - `infra/Dockerfile.backend` (modify/enhance)
  - `infra/Dockerfile.web` (modify/enhance)
  - `infra/docker-compose.prod.yml` (create)
  - `infra/nginx.conf` (modify)
- **Steps:**
  1. **Multi-stage backend Dockerfile:** build stage (install, build), runtime stage (copy built artifacts, Node 18 slim).
  2. **Multi-stage web Dockerfile:** build stage (pnpm install, build), export stage (next standalone).
  3. **Production docker-compose:** Postgres, Redis, MinIO, backend, web, Nginx reverse proxy.
  4. **Nginx:** proxy /api to backend:3000, / to web:3000.
  5. Health checks on all services.
- **Acceptance criteria:**
  - [ ] Dockerfiles build without error (`docker build`).
  - [ ] `docker-compose -f docker-compose.prod.yml up` starts stack, all healthy.
  - [ ] Nginx correctly routes requests.
  - [ ] Production env vars work (no .env.local; all from env).

---

## Epic 1.16 — Application Cutover & Go-Live (Size: L)

Full requirements in [`04-migration.md`](../04-migration.md) §11.

#### T-166. Parallel-run & delta sync
- **Size:** M · **Coverage:** N/A
- **Depends on:** T-159 (migration validation passed)
- **Files:**
  - `scripts/delta-sync.ts` (create)
  - Staging environment (Docker-based copy of production DB).
- **Steps:**
  1. **Parallel run:** run new system alongside legacy for a period (e.g., 1 week).
  2. **Delta-sync script:** identify changes in legacy since bulk migration → re-sync incrementally.
     - Query legacy for rows changed since watermark (by operationDate, updatedAt, etc.).
     - Upsert into new PostgreSQL (by legacyId).
     - Reconcile tonnage/fuel/ritase totals vs legacy for parity.
  3. **Reconciliation:** compare KPIs (daily tonnage, fuel consumption, trip counts) between systems → must be within tolerance.
  4. Document delta-sync timing + procedure.
- **Acceptance criteria:**
  - [ ] Delta-sync script identifies & ingests changes from legacy.
  - [ ] Tonnage/fuel/ritase reconciliation passes (within <1% variance).
  - [ ] Parallel run can proceed without blocking cutover.

#### T-167. Cutover runbook
- **Size:** M · **Coverage:** N/A
- **Depends on:** T-166
- **Files:**
  - `docs/CUTOVER-RUNBOOK.md` (create)
- **Steps:**
  1. **Freeze window:** legacy system becomes read-only for a fixed period (e.g., 06:00–10:00 WIB).
  2. **Final delta-sync:** run delta-sync one last time.
  3. **Verification:**
     - Verify counts match (legacy vs new).
     - Verify no in-flight transactions (transactionDays DONE).
     - Verify images reconciled.
  4. **Per-year reconciliation:** spot-check a year (e.g., 2024) — row counts, tonnage, fuel, ritase.
  5. **Sign-off:** DLH director/supervisor approves.
  6. **DNS/proxy flip:** redirect traffic (IP/DNS) from legacy to new.
  7. **Temp-credential distribution:** users receive one-time login + forced password reset.
  8. **Legacy fallback:** keep legacy read-only for 48 hours in case rollback needed.
  9. **Post-cutover validation:** smoke test critical flows, check logs for errors.
- **Acceptance criteria:**
  - [ ] Runbook drafted, reviewed by DLH.
  - [ ] Runbook specifies:
     - Freeze window (date, time, duration).
     - Verification steps + tolerance thresholds.
     - Sign-off authority.
     - DNS/proxy flip procedure.
     - Rollback trigger + procedure.
     - Legacy fallback window.
  - [ ] Runbook tested in staging (dry-run).

#### T-168. Rollback plan (tested in staging)
- **Size:** S · **Coverage:** N/A
- **Depends on:** T-167
- **Files:**
  - `docs/ROLLBACK-PLAN.md` (create/append to runbook)
- **Steps:**
  1. **Trigger criteria:** if critical errors detected within 24 hours post-cutover (e.g., data corruption, unavailability).
  2. **Re-point procedure:** DNS/proxy reverts to legacy (reverse IP flip).
  3. **Data recovery:** if new system modified, restore from pre-cutover backup (or quarantine new data + restart legacy).
  4. **Decision authority:** CIO or DLH director.
  5. **Test in staging:** simulate rollback (flip → verify legacy is reachable + in expected state).
- **Acceptance criteria:**
  - [ ] Rollback plan documented.
  - [ ] Trigger criteria clear (not a "maybe").
  - [ ] Re-point procedure simple + tested (DNS revert, IP flip, etc.).
  - [ ] Decision authority named.
  - [ ] Staging rollback test passes.

#### T-169. User training & hypercare
- **Size:** M · **Coverage:** N/A
- **Depends on:** T-165 (production image ready)
- **Files:**
  - `docs/USER-GUIDE.md` (create — Indonesian, role-based)
  - `docs/LEGACY-TO-NEW-REFERENCE.md` (create — old term → new screen mapping)
  - `docs/KNOWN-ISSUES-AND-WORKAROUNDS.md` (create)
  - Support channel setup (Slack, email, Telegram, etc.)
- **Steps:**
  1. **Role-based guides (Indonesian):** Administrasi Data (data entry), Checker (verification), Operator Pool, Petugas TPA, Supervisor.
  2. **Old-term → new-screen reference:** e.g., "Riwayat Perawatan" → "Maintenance Log" (link to page).
  3. **Forced-reset walkthrough:** step-by-step for users with mustChangePassword=true.
  4. **Support channel:** designate channel (Slack/Telegram), response SLA (e.g., <2 hours), escalation path.
  5. **Known-issues log:** document and link to workarounds discovered during parallel run / hypercare period.
  6. **Training session:** in-person or video walkthrough for operators (1–2 hours).
  7. **Decommission legacy:** after go-live + sign-off, disable legacy app (but keep DB read-only for 90 days).
- **Acceptance criteria:**
  - [ ] User guides (Indonesian) drafted + reviewed by DLH.
  - [ ] Legacy-to-new reference complete (all main screens mapped).
  - [ ] Known-issues log started.
  - [ ] Support channel live (monitored).
  - [ ] Training session scheduled + attended (or video recorded).
  - [ ] Hypercare window defined (e.g., 1 week of 24/7 support).

---

## Exit Criteria (Phase 1)

**Phase 1 is complete when ALL of the following are verified:**

### Functional Requirements
- [ ] **Master-data CRUD:** All endpoints (Vehicle, Driver, Site, Route, CrewSchedule, FuelQuota, WasteSource) tested ≥80% coverage, all working.
- [ ] **Auth & RBAC:** Login, logout, current user, user/role CRUD all working; permission guards enforced.
- [ ] **Daily-init job:** Runs daily at 03:00 (or manual trigger), creates TransactionDay + seeds Hauls/Assignments/Trips; idempotent.
- [ ] **Trip recording endpoints:** Depart, return, refuel, pickup, disposal all working.
- [ ] **Trip verification:** Mark DONE → VERIFIED, lock against further edits (except override perm).
- [ ] **Frontend auth:** Login page, route guards, permission-based UI.
- [ ] **Frontend master-data pages:** List + create/edit/delete for all 7 entities (Vehicle, Driver, Site, Route, CrewSchedule, FuelQuota, WasteSource).
- [ ] **Frontend transaction workflow:** Transaction day list/detail, record-depart/return/trip forms, verification UI; all working.

### Data Migration
- [ ] **Migration discovery report:** Profiled live DB; per-year row counts, image inventory, data-quality issues documented.
- [ ] **All legacy tables migrated:** Master (Site, Route, Vehicle, Driver, etc.) + transactional (Trip, Haul, HaulAssignment, FuelQuota) into partitioned PostgreSQL.
- [ ] **Per-year row counts reconciled:** Variance ≤1% per table/year.
- [ ] **Data-quality fixes applied:** No (0,0) GPS, no 1900 years, duplicate routes deduplicated.
- [ ] **User & role migration:** No MD5 hashes; all users set to mustChangePassword=true; permissions mapped from legacy menu grants.
- [ ] **Image migration:** All referenced images in object storage (S3); metadata rows created; checksums verified; no image bytes in PostgreSQL; orphan report signed off.

### Testing & QA
- [ ] **Unit tests:** ≥85% coverage per service (>90% for auth, trip recording); all pass.
- [ ] **Integration tests:** ≥80% coverage per endpoint; happy + error paths tested; DB state verified.
- [ ] **E2E tests:** ≥8–10 critical user flows (Playwright); all pass in CI.
- [ ] **Lint + typecheck:** `pnpm lint && pnpm typecheck` clean (0 errors, 0 warnings).
- [ ] **CI pipeline:** GitHub Actions green on all test + build steps.

### Cutover Readiness
- [ ] **Cutover runbook:** Drafted, reviewed by DLH, specifying freeze window, verification steps, sign-off authority, rollback trigger.
- [ ] **Rollback plan:** Documented, tested in staging (DNS revert / IP flip).
- [ ] **Parallel-run parity:** Tonnage/fuel/ritase reconciliation within <1% variance.
- [ ] **User training:** Guides (Indonesian) drafted; training session scheduled/recorded; support channel live.
- [ ] **Hypercare plan:** 1-week post-cutover support SLA defined.

### Documentation
- [ ] **README:** Setup + run instructions; environment setup; common troubleshooting.
- [ ] **API docs:** Swagger at `/api/docs`; all endpoints listed with descriptions + schemas.
- [ ] **Deployment guide:** Docker production images + compose; Nginx proxy config; health checks.
- [ ] **Legacy-to-new reference:** Glossary + screen mapping (Indonesian).

### Production-Readiness
- [ ] All secrets in environment variables (no hardcoded keys).
- [ ] Database migrations idempotent + reversible.
- [ ] Soft delete working (no data loss on DELETE).
- [ ] Logs structured, no PII exposed.
- [ ] Error messages user-friendly (Indonesian).
- [ ] Rate limiting on login endpoint (5 attempts per IP per 15 min).
- [ ] Session/JWT secure (httpOnly, SameSite=Strict).

---

## Milestone

**End of Phase 1 — MVP delivered.** DLH operators can:
- Log in with role-based permissions.
- Manage all master data (vehicles, drivers, sites, routes, crew schedules, fuel quotas, waste sources).
- Initialize daily transaction days (auto-seeding hauls, assignments, trips).
- Record trip events (depart, return, refuel, pickup, disposal with weighing).
- Verify completed trips (lock against further edits).
- View transaction history.

All legacy data (2013–present) migrated into partitioned PostgreSQL, reconciled per-year, image corpus migrated to object storage. System tested (≥80% coverage), documented, and ready for pilot deployment. Cutover runbook + rollback plan tested in staging. Users trained, support channel live. Go-live scheduled.

---

## Task Summary (T-101 … T-169)

| Task ID | Epic | Title | Size |
|---------|------|-------|------|
| T-101 | 1.1 | User & role models (schema verification) | S |
| T-102 | 1.1 | Login endpoint (POST /api/v1/auth/login) | M |
| T-103 | 1.1 | Logout endpoint (POST /auth/logout) | S |
| T-104 | 1.1 | Current user endpoint (GET /auth/me) | S |
| T-105 | 1.1 | Permission guard & decorator (@HasPermission) | M |
| T-106 | 1.1 | User CRUD endpoints | M |
| T-107 | 1.1 | Role CRUD endpoints | S |
| T-108 | 1.1 | Permission seeding | M |
| T-109 | 1.2 | VehicleApplication CRUD | M |
| T-110 | 1.2 | Fuel & FuelCategory CRUD | M |
| T-111 | 1.2 | VehicleModel CRUD | M |
| T-112 | 1.2 | Vehicle CRUD (TDD) | M |
| T-113 | 1.2 | VehicleWasteSource CRUD | S |
| T-114 | 1.3 | LicenseClass CRUD (read-only) | S |
| T-115 | 1.3 | Driver CRUD (TDD) | M |
| T-116 | 1.3 | DriverLicense CRUD (TDD) | M |
| T-117 | 1.4 | Site CRUD (TDD) | M |
| T-118 | 1.4 | Route CRUD (TDD) | M |
| T-119 | 1.5 | WasteSource CRUD | S |
| T-120 | 1.6 | CrewSchedule CRUD (TDD) | M |
| T-121 | 1.6 | TripTemplate CRUD (TDD) | M |
| T-122 | 1.6 | FuelQuota (kitir) CRUD (TDD) | M |
| T-123 | 1.7 | TransactionDay auto-init job (TDD) | M |
| T-124 | 1.7 | TransactionDay CRUD endpoints | S |
| T-125 | 1.8 | Record depart (HaulAssignment depart) | M |
| T-126 | 1.8 | Record return (HaulAssignment return) | M |
| T-127 | 1.8 | Record REFUEL trip | M |
| T-128 | 1.8 | Record PICKUP trip | M |
| T-129 | 1.8 | Record DISPOSAL trip (with weighing) | M |
| T-130 | 1.8 | Record DEPART_POOL & RETURN_POOL (passive) | S |
| T-131 | 1.8 | Trip verification endpoint | M |
| T-132 | 1.8 | Trip GET endpoints (read) | S |
| T-133 | 1.9 | Layout & shell | S |
| T-134 | 1.9 | Navigation & permission-based UI | M |
| T-135 | 1.9 | Login page | M |
| T-136 | 1.9 | Home / dashboard stub | S |
| T-137 | 1.10 | Vehicle list & CRUD | L |
| T-138 | 1.10 | Driver list & CRUD | L |
| T-139 | 1.10 | Site list & CRUD | M |
| T-140 | 1.10 | Route list & CRUD | M |
| T-141 | 1.10 | CrewSchedule list & CRUD | M |
| T-142 | 1.10 | FuelQuota (kitir) list & CRUD | M |
| T-143 | 1.11 | Transaction day list & detail | L |
| T-144 | 1.11 | Record-depart form | M |
| T-145 | 1.11 | Record-return form | M |
| T-146 | 1.11 | Record-trip form (polymorphic) | L |
| T-147 | 1.11 | Trip verification flow | M |
| T-148 | 1.12 | Login flow | M |
| T-149 | 1.12 | Route guards | M |
| T-150 | 1.12 | Permission-based UI | M |
| T-151 | 1.13 | Migration discovery (FIRST, read-only) | M |
| T-152 | 1.13 | Migration script setup | L |
| T-153 | 1.13 | Master-data migration | M |
| T-154 | 1.13 | User & role migration | M |
| T-155 | 1.13 | Transactional data migration (partitioned) | L |
| T-156 | 1.13 | Image migration (filesystem → object storage) | L |
| T-157 | 1.13 | Crew schedule & template migration | M |
| T-158 | 1.13 | FuelQuota (kitir) migration | M |
| T-159 | 1.13 | Migration validation & report | M |
| T-160 | 1.14 | Unit test suite (services) | L |
| T-161 | 1.14 | Integration test suite (endpoints) | L |
| T-162 | 1.14 | E2E test suite (critical flows, Playwright) | L |
| T-163 | 1.15 | README.md & setup guide | S |
| T-164 | 1.15 | API documentation (Swagger) | S |
| T-165 | 1.15 | Docker production image | M |
| T-166 | 1.16 | Parallel-run & delta sync | M |
| T-167 | 1.16 | Cutover runbook | M |
| T-168 | 1.16 | Rollback plan (tested in staging) | S |
| T-169 | 1.16 | User training & hypercare | M |

**Total tasks:** 69 | **Est. effort:** 9–11 weeks

---

**Next:** Execute tasks T-101 → T-169 in order, respecting dependencies and parallel groups. Refer to [`04-migration.md`](../04-migration.md), [`06-auth-rbac.md`](../06-auth-rbac.md), [`07-api-spec.md`](../07-api-spec.md), and module specs in [`09-modules/`](../09-modules/) for detailed requirements.
