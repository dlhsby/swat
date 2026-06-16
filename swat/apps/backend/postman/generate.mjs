/**
 * Generates the SWAT Postman collection + local environment from the compact
 * endpoint list below. Edit `GROUPS` as the API grows, then re-run:
 *
 *   node apps/backend/postman/generate.mjs
 *
 * The collection uses cookie-based auth: run **Auth → Login** first; Postman
 * stores the `swat.sid` session cookie automatically and reuses it. POST/create
 * requests capture the new id into an environment variable so later requests
 * (get/update/delete + nested resources) chain without manual copy-paste.
 *
 * Plain Node ESM — no dependencies. Date/Math are avoided so output is stable.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

/** Build one request item. opts: { body, query, capture, captureString, note } */
function req(name, method, path, opts = {}) {
  return { name, method, path, ...opts };
}

// ---------------------------------------------------------------------------
// Endpoint catalogue (grouped into Postman folders). Keep in sync with the API.
// ---------------------------------------------------------------------------
const GROUPS = [
  {
    name: 'System',
    description:
      'Unauthenticated health checks. These sit at the server root, **not** under the `/api/v1` prefix, so they use `{{rootUrl}}` instead of `{{baseUrl}}`.',
    items: [
      req('Health (liveness)', 'GET', '/health', {
        base: 'rootUrl',
        note: 'Liveness probe — returns { success:true, data:{ status:"ok" } }. Unguarded; not under api/v1.',
        test: "pm.test('alive', () => pm.expect(pm.response.code).to.equal(200));",
      }),
      req('Readiness', 'GET', '/health/ready', {
        base: 'rootUrl',
        note: 'Readiness probe — checks the database. 200 when ready, 503 when a dependency is down.',
        test: "pm.test('ready or 503', () => pm.expect(pm.response.code).to.be.oneOf([200, 503]));",
      }),
    ],
  },
  {
    name: 'Auth',
    description: 'Run **Login** first to obtain the session cookie.',
    items: [
      req('Login', 'POST', '/auth/login', {
        body: { username: '{{adminUsername}}', password: '{{adminPassword}}' },
        note: 'Sets the httpOnly swat.sid cookie. Captures mustChangePassword.',
        test: "pm.test('logged in', () => pm.response.code === 200);",
      }),
      req('Me', 'GET', '/auth/me'),
      req('Change Password', 'PATCH', '/auth/change-password', {
        body: {
          currentPassword: '{{adminPassword}}',
          newPassword: 'NewPass!2026x',
          confirmPassword: 'NewPass!2026x',
        },
        note: 'Clears mustChangePassword. Update adminPassword afterwards if you run this.',
      }),
      req('Force Reset (admin)', 'POST', '/auth/force-reset/{{userId}}', {
        note: 'Issues a temporary password for {{userId}} and forces a change.',
      }),
      req('Logout', 'POST', '/auth/logout'),
      req('Get Token (native client)', 'POST', '/auth/token', {
        body: { username: '{{adminUsername}}', password: '{{adminPassword}}' },
        note: 'OAuth2 password grant for the .NET clients. Captures accessToken + refreshToken into the environment. Forced-reset accounts get 403 (change password via web first).',
        test:
          "pm.test('got tokens', () => pm.expect(pm.response.code).to.equal(200)); " +
          'const d = pm.response.json().data; ' +
          "pm.environment.set('accessToken', d.accessToken); " +
          "pm.environment.set('refreshToken', d.refreshToken);",
      }),
      req('Refresh Token', 'POST', '/auth/token/refresh', {
        body: { refreshToken: '{{refreshToken}}' },
        note: 'Rotates the refresh token. Reusing an old/superseded token returns 401 (reuse-detection).',
        test:
          "pm.test('rotated', () => pm.expect(pm.response.code).to.equal(200)); " +
          'const d = pm.response.json().data; ' +
          "pm.environment.set('accessToken', d.accessToken); " +
          "pm.environment.set('refreshToken', d.refreshToken);",
      }),
      req('Me (Bearer)', 'GET', '/auth/me', {
        headers: [{ key: 'Authorization', value: 'Bearer {{accessToken}}' }],
        note: 'Same principal as the cookie session, authenticated by the bearer token.',
      }),
      req('Token Logout', 'POST', '/auth/token/logout', {
        headers: [{ key: 'Authorization', value: 'Bearer {{accessToken}}' }],
        note: 'Revokes the bearer session (token family).',
      }),
    ],
  },
  {
    name: 'Users & Access',
    items: [
      req('List Users', 'GET', '/users', { query: { page: '1', limit: '20' } }),
      req('Get User', 'GET', '/users/{{userId}}'),
      req('Create User', 'POST', '/users', {
        body: { username: 'operator1', name: 'Operator Satu', roleId: '{{roleId}}' },
        capture: 'userId',
      }),
      req('Update User', 'PATCH', '/users/{{userId}}', { body: { name: 'Operator Satu (edit)' } }),
      req('Delete User', 'DELETE', '/users/{{userId}}'),
      req('List Roles', 'GET', '/roles', { capture: 'roleId', captureFrom: 'data[0].id' }),
      req('Get Role', 'GET', '/roles/{{roleId}}'),
      req('Create Role', 'POST', '/roles', {
        body: { name: 'Peran Uji', permissionIds: [1, 2, 3] },
        capture: 'roleId',
      }),
      req('Update Role', 'PATCH', '/roles/{{roleId}}', { body: { permissionIds: [1, 2] } }),
      req('Delete Role', 'DELETE', '/roles/{{roleId}}'),
      req('List Permissions', 'GET', '/permissions'),
      req('Sync Permissions', 'POST', '/permissions/sync', {
        note: 'Reconciles the permission table against the code catalog (permission:manage). Idempotent; never deletes rows or touches grants.',
      }),
    ],
  },
  {
    name: 'Geography',
    items: [
      req('List Sites', 'GET', '/sites', { query: { page: '1', limit: '20' } }),
      req('Get Site', 'GET', '/sites/{{siteId}}'),
      req('Create Site (Pool)', 'POST', '/sites', {
        body: { type: 'POOL', name: 'Pool Uji', address: 'Surabaya' },
        capture: 'siteId',
      }),
      req('Create Site (TPA, with coords)', 'POST', '/sites', {
        body: {
          type: 'TPA',
          name: 'TPA Uji',
          address: 'Benowo',
          latitude: -7.23,
          longitude: 112.6,
        },
        capture: 'destinationSiteId',
      }),
      req('Update Site', 'PATCH', '/sites/{{siteId}}', { body: { address: 'Alamat baru' } }),
      req('Delete Site', 'DELETE', '/sites/{{siteId}}'),
      req('List Routes', 'GET', '/routes', { query: { page: '1', limit: '20' } }),
      req('Get Route', 'GET', '/routes/{{routeId}}'),
      req('Create Route', 'POST', '/routes', {
        body: {
          category: 'DISPOSAL',
          originSiteId: '{{siteId}}',
          destinationSiteId: '{{destinationSiteId}}',
          distanceKm: 25,
        },
        capture: 'routeId',
      }),
      req('Update Route', 'PATCH', '/routes/{{routeId}}', { body: { distanceKm: 30 } }),
      req('Delete Route', 'DELETE', '/routes/{{routeId}}'),
    ],
  },
  {
    name: 'Waste Sources',
    items: [
      req('List Waste Sources', 'GET', '/waste-sources', { query: { page: '1', limit: '20' } }),
      req('Get Waste Source', 'GET', '/waste-sources/{{wasteSourceId}}'),
      req('Create Waste Source', 'POST', '/waste-sources', {
        body: { code: 'UJI', name: 'Sumber Uji', notes: 'contoh' },
        capture: 'wasteSourceId',
      }),
      req('Update Waste Source', 'PATCH', '/waste-sources/{{wasteSourceId}}', {
        body: { name: 'Sumber Uji (edit)' },
      }),
      req('Delete Waste Source', 'DELETE', '/waste-sources/{{wasteSourceId}}'),
    ],
  },
  {
    name: 'Fleet',
    items: [
      req('List Applications', 'GET', '/vehicle-types', {
        capture: 'vehicleTypeId',
        captureFrom: 'data[0].id',
      }),
      req('Create Application', 'POST', '/vehicle-types', {
        body: { name: 'Aplikasi Uji' },
        capture: 'vehicleTypeId',
      }),
      req('Update Application', 'PATCH', '/vehicle-types/{{vehicleTypeId}}', {
        body: { name: 'Aplikasi Uji (edit)' },
      }),
      req('Delete Application', 'DELETE', '/vehicle-types/{{vehicleTypeId}}'),
      req('List Fuel Categories', 'GET', '/fuel-categories', {
        capture: 'fuelCategoryId',
        captureFrom: 'data[0].id',
      }),
      req('Create Fuel Category', 'POST', '/fuel-categories', {
        body: { name: 'Kategori Uji' },
        capture: 'fuelCategoryId',
      }),
      req('List Fuels', 'GET', '/fuels', { capture: 'fuelId', captureFrom: 'data[0].id' }),
      req('Create Fuel', 'POST', '/fuels', {
        body: { fuelCategoryId: '{{fuelCategoryId}}', name: 'Solar Uji', pricePerLiter: 6800 },
        capture: 'fuelId',
      }),
      req('Update Fuel (price)', 'PATCH', '/fuels/{{fuelId}}', { body: { pricePerLiter: 7000 } }),
      req('List Vehicle Models', 'GET', '/vehicle-models', {
        capture: 'modelId',
        captureFrom: 'data[0].id',
      }),
      req('Create Vehicle Model', 'POST', '/vehicle-models', {
        body: {
          vehicleTypeId: '{{vehicleTypeId}}',
          fuelId: '{{fuelId}}',
          brand: 'Hino Uji',
          fuelTankCapacity: 200,
          normalTareWeight: 8000,
          wheelCount: 6,
        },
        capture: 'modelId',
      }),
      req('List Vehicles', 'GET', '/vehicles', { query: { page: '1', limit: '20' } }),
      req('Get Vehicle', 'GET', '/vehicles/{{vehicleId}}'),
      req('Create Vehicle', 'POST', '/vehicles', {
        body: {
          poolSiteId: '{{siteId}}',
          modelId: '{{modelId}}',
          plateNumber: 'L 9 UJI',
          chassisNumber: 'CHS-UJI-1',
          engineNumber: 'ENG-UJI-1',
          currentTareWeight: 8000,
          currentOdometer: 1000,
          registrationExpiry: '2027-12-31',
          taxExpiry: '2027-12-31',
        },
        capture: 'vehicleId',
      }),
      req('Update Vehicle (odometer)', 'PATCH', '/vehicles/{{vehicleId}}', {
        body: { currentOdometer: 1500 },
      }),
      req('Delete Vehicle', 'DELETE', '/vehicles/{{vehicleId}}'),
      req('List Vehicle Waste Sources', 'GET', '/vehicles/{{vehicleId}}/waste-sources'),
      req('Link Waste Source', 'POST', '/vehicles/{{vehicleId}}/waste-sources', {
        body: { wasteSourceId: '{{wasteSourceId}}' },
      }),
      req(
        'Unlink Waste Source',
        'DELETE',
        '/vehicles/{{vehicleId}}/waste-sources/{{wasteSourceId}}',
      ),
      // --- master-data detail/update/delete (complete the CRUD) ---
      req('Get Application', 'GET', '/vehicle-types/{{vehicleTypeId}}'),
      req('Get Fuel Category', 'GET', '/fuel-categories/{{fuelCategoryId}}'),
      req('Update Fuel Category', 'PATCH', '/fuel-categories/{{fuelCategoryId}}', {
        body: { name: 'Kategori Uji (edit)' },
      }),
      req('Delete Fuel Category', 'DELETE', '/fuel-categories/{{fuelCategoryId}}'),
      req('Get Fuel', 'GET', '/fuels/{{fuelId}}'),
      req('Delete Fuel', 'DELETE', '/fuels/{{fuelId}}'),
      req('Get Vehicle Model', 'GET', '/vehicle-models/{{modelId}}'),
      req('Update Vehicle Model', 'PATCH', '/vehicle-models/{{modelId}}', {
        body: { brand: 'Hino Uji (edit)' },
      }),
      req('Delete Vehicle Model', 'DELETE', '/vehicle-models/{{modelId}}'),
    ],
  },
  {
    name: 'Personnel',
    items: [
      req('List License Classes', 'GET', '/license-classes', {
        capture: 'licenseClassId',
        captureFrom: 'data[0].id',
      }),
      req('List Drivers', 'GET', '/drivers', { query: { page: '1', limit: '20' } }),
      req('Get Driver', 'GET', '/drivers/{{driverId}}'),
      req('Create Driver', 'POST', '/drivers', {
        body: {
          poolSiteId: '{{siteId}}',
          employmentStatus: 'SATGAS',
          name: 'Pengemudi Uji',
          idCardNumber: '3500000000009999',
          originAddress: 'Surabaya',
          currentAddress: 'Surabaya',
          birthDate: '1990-01-01',
          contact: '08000000000',
        },
        capture: 'driverId',
      }),
      req('Update Driver', 'PATCH', '/drivers/{{driverId}}', {
        body: { currentAddress: 'Sidoarjo' },
      }),
      req('Delete Driver', 'DELETE', '/drivers/{{driverId}}'),
      req('List Driver Licenses', 'GET', '/drivers/{{driverId}}/licenses'),
      req('Add Driver License', 'POST', '/drivers/{{driverId}}/licenses', {
        body: {
          licenseClassId: '{{licenseClassId}}',
          licenseNumber: 'SIM-UJI-1',
          expiry: '2028-01-01',
        },
        capture: 'licenseId',
      }),
      req('Update Driver License', 'PATCH', '/drivers/{{driverId}}/licenses/{{licenseId}}', {
        body: { expiry: '2029-01-01' },
      }),
      req('Delete Driver License', 'DELETE', '/drivers/{{driverId}}/licenses/{{licenseId}}'),
    ],
  },
  {
    name: 'Scheduling',
    items: [
      req('List Schedule Templates', 'GET', '/schedule-templates', {
        query: { page: '1', limit: '20' },
      }),
      req('Get Schedule Template', 'GET', '/schedule-templates/{{scheduleTemplateId}}'),
      req('Create Schedule Template', 'POST', '/schedule-templates', {
        body: {
          vehicleId: '{{vehicleId}}',
          driverId: '{{driverId}}',
          departTime: '05:00',
          returnTime: '14:00',
        },
        capture: 'scheduleTemplateId',
      }),
      req('Update Schedule Template', 'PATCH', '/schedule-templates/{{scheduleTemplateId}}', {
        body: { returnTime: '15:00' },
      }),
      req('Delete Schedule Template', 'DELETE', '/schedule-templates/{{scheduleTemplateId}}'),
      req(
        'List Trip Templates',
        'GET',
        '/schedule-templates/{{scheduleTemplateId}}/trip-templates',
      ),
      req(
        'Add Trip Template',
        'POST',
        '/schedule-templates/{{scheduleTemplateId}}/trip-templates',
        {
          body: { routeId: '{{routeId}}', targetTime: '06:30', fuelRequestedLiters: 20 },
          capture: 'tripTemplateId',
        },
      ),
      req(
        'Update Trip Template',
        'PATCH',
        '/schedule-templates/{{scheduleTemplateId}}/trip-templates/{{tripTemplateId}}',
        { body: { targetTime: '07:00' } },
      ),
      req(
        'Delete Trip Template',
        'DELETE',
        '/schedule-templates/{{scheduleTemplateId}}/trip-templates/{{tripTemplateId}}',
      ),
      req('List Disposal Permits', 'GET', '/disposal-permits', {
        query: { page: '1', limit: '20' },
      }),
      req('Get Disposal Permit', 'GET', '/disposal-permits/{{disposalPermitId}}'),
      req('Create Disposal Permit (Kitir)', 'POST', '/disposal-permits', {
        body: {
          code: 'KT-UJI-0001',
          vehicleId: '{{vehicleId}}',
          siteId: '{{destinationSiteId}}',
          issuedAt: '2026-06-01',
          validFrom: '2026-06-01',
          validTo: '2026-06-30',
        },
        capture: 'disposalPermitId',
        captureString: true,
      }),
      req('Bulk Import Disposal Permits', 'POST', '/disposal-permits/bulk-import', {
        body: {
          strategy: 'UPSERT',
          rows: [
            {
              legacyId: 900001,
              code: 'KT-IMP-0001',
              vehicleId: '{{vehicleId}}',
              siteId: '{{destinationSiteId}}',
              issuedAt: '2026-06-01',
              validFrom: '2026-06-01',
              validTo: '2026-06-30',
            },
          ],
        },
        note: 'Impor Massal — upsert by legacyId; per-row validation. Frontend parses the CSV/Excel and posts structured rows.',
      }),
      req('Issue Kitir (bulk)', 'POST', '/disposal-permits/bulk-issue', {
        body: {
          vehicleId: '{{vehicleId}}',
          siteId: '{{destinationSiteId}}',
          validFrom: '2026-06-01',
          validTo: '2026-06-30',
          count: 5,
        },
        capture: 'disposalPermitId',
        captureFrom: 'data[0].id',
        note: 'Legacy insertJatahKitir — issue N kitir at once; returns all with printable KT-YYYYMM-NNNN codes for the kitir-printing app.',
      }),
      req('Update Disposal Permit (revoke)', 'PATCH', '/disposal-permits/{{disposalPermitId}}', {
        body: { status: 'INACTIVE' },
      }),
    ],
  },
  {
    name: 'Transactions',
    description:
      'Daily transaction workflow: a TransactionDay holds Hauls; each Haul has HaulAssignments (depart/return) that produce Trips. Set `transactionDayId`/`haulAssignmentId`/`tripId` from the list/detail responses below.',
    items: [
      req('List Transaction Days', 'GET', '/transaction-days', {
        query: { date: '2026-06-01' },
        capture: 'transactionDayId',
        captureFrom: 'data[0].id',
        note: '`date` (YYYY-MM-DD) is required. Captures the first day id.',
      }),
      req('Initialize Today', 'POST', '/transaction-days/initialize-today', {
        note: "Creates today's TransactionDay and seeds planned hauls/trips from the active schedule templates. Idempotent.",
      }),
      req('Get Transaction Day', 'GET', '/transaction-days/{{transactionDayId}}', {
        note: 'Detail includes the hauls + assignments — copy a haulAssignmentId/tripId for the requests below.',
      }),
      req('Update Transaction Day (status)', 'PATCH', '/transaction-days/{{transactionDayId}}', {
        body: { status: 'DONE' },
        note: 'status ∈ IN_PROGRESS | DONE.',
      }),
      req('List Haul Assignment Trips', 'GET', '/haul-assignments/{{haulAssignmentId}}/trips', {
        capture: 'tripId',
        captureFrom: 'data[0].id',
        note: 'Set haulAssignmentId from a transaction-day detail. Captures the first trip id.',
      }),
      req('Record Depart', 'PUT', '/haul-assignments/{{haulAssignmentId}}/record-depart', {
        body: { actualOdometer: 1000, actualTime: '2026-06-08T05:30:00.000Z' },
      }),
      req('Record Return', 'PUT', '/haul-assignments/{{haulAssignmentId}}/record-return', {
        body: { actualOdometer: 1080, actualTime: '2026-06-08T14:30:00.000Z' },
      }),
      req('Create Ad-hoc Trip', 'POST', '/trips', {
        body: {
          haulAssignmentId: '{{haulAssignmentId}}',
          category: 'PICKUP',
          destinationSiteId: '{{siteId}}',
          name: 'Pengambilan tak terjadwal',
        },
        capture: 'tripId',
        note: 'Legacy parity — record an unscheduled trip. Provide routeId, or category + destinationSiteId. Add actualTime+actualOdometer to record it (DONE) in one call.',
      }),
      req('Get Trip', 'GET', '/trips/{{tripId}}'),
      req('List Trip Photos', 'GET', '/trips/{{tripId}}/photos', {
        note: 'Returns each photo with a short-lived presigned view URL.',
      }),
      req('Attach Trip Photo', 'POST', '/trips/{{tripId}}/photos', {
        body: {
          objectKey: 'trip/{{tripId}}/uji.jpg',
          contentType: 'image/jpeg',
          sizeBytes: 12345,
          checksum: 'deadbeef',
        },
        note: 'Legacy dokumentasitrayek — upload bytes via /storage/presigned-put first, then register the object metadata here.',
      }),
      req('Record Trip (actuals)', 'PUT', '/trips/{{tripId}}', {
        body: {
          actualTime: '2026-06-08T06:15:00.000Z',
          actualOdometer: 1200,
          fuelApprovedLiters: 20,
          tareWeight: 8000,
          grossWeight: 12000,
          wasteVolume: 4,
        },
      }),
      req('Verify Trip', 'PUT', '/trips/{{tripId}}/verify', {
        note: 'Checker verification — no body.',
      }),
    ],
  },
  {
    name: 'Levies & Refuel',
    items: [
      req('List Levies', 'GET', '/levies', {
        query: { page: '1', limit: '20' },
        capture: 'levyId',
        captureFrom: 'data[0].id',
      }),
      req('Create Levy', 'POST', '/levies', {
        body: { categoryName: 'Rumah Tangga', date: '2026-06-01', amount: 15000000, notes: 'uji' },
        capture: 'levyId',
        captureString: true,
      }),
      req('Get Levy', 'GET', '/levies/{{levyId}}'),
      req('Update Levy', 'PATCH', '/levies/{{levyId}}', { body: { amount: 16000000 } }),
      req('Delete Levy', 'DELETE', '/levies/{{levyId}}'),
      req('List Refuels', 'GET', '/refuels', {
        query: { page: '1', limit: '20' },
        note: 'Read-only fuel-dispensing log (derived from trip fuel actuals).',
      }),
    ],
  },
  {
    name: 'Maintenance & Inspections',
    items: [
      req('List Maintenance Records', 'GET', '/maintenance-records', {
        query: { page: '1', limit: '20' },
        capture: 'maintenanceId',
        captureFrom: 'data[0].id',
      }),
      req('Create Maintenance Record', 'POST', '/maintenance-records', {
        body: {
          vehicleId: '{{vehicleId}}',
          type: 'SERVICE',
          date: '2026-06-08',
          odometer: 12000,
          workshop: 'Bengkel Uji',
          description: 'Ganti oli + filter',
        },
        capture: 'maintenanceId',
        captureString: true,
        note: 'type ∈ SERVICE | REPAIR.',
      }),
      req('Get Maintenance Record', 'GET', '/maintenance-records/{{maintenanceId}}'),
      req('Update Maintenance Record', 'PATCH', '/maintenance-records/{{maintenanceId}}', {
        body: { workshop: 'Bengkel Uji (edit)' },
      }),
      req('Approve Maintenance Record', 'PATCH', '/maintenance-records/{{maintenanceId}}/approve', {
        note: 'Supervisor approval — no body.',
      }),
      req('Delete Maintenance Record', 'DELETE', '/maintenance-records/{{maintenanceId}}'),
      req('List Vehicle Inspections', 'GET', '/vehicle-inspections', {
        query: { page: '1', limit: '20' },
        capture: 'inspectionId',
        captureFrom: 'data[0].id',
      }),
      req('Create Vehicle Inspection', 'POST', '/vehicle-inspections', {
        body: {
          vehicleId: '{{vehicleId}}',
          date: '2026-06-08',
          notes: 'Inspeksi harian',
          items: [{ name: 'Rem', status: 'OK' }],
        },
        capture: 'inspectionId',
        captureString: true,
        note: 'items[].status ∈ OK | ATTENTION | FAIL.',
      }),
      req('Get Vehicle Inspection', 'GET', '/vehicle-inspections/{{inspectionId}}'),
      req('Update Vehicle Inspection', 'PATCH', '/vehicle-inspections/{{inspectionId}}', {
        body: { notes: 'Inspeksi harian (edit)' },
      }),
      req('Delete Vehicle Inspection', 'DELETE', '/vehicle-inspections/{{inspectionId}}'),
    ],
  },
  {
    name: 'Monitoring',
    description:
      'Read-only analytics over the pre-aggregated rollup tables. All endpoints take `dateFrom`/`dateTo` (YYYY-MM-DD, **required**). The demo seed covers 2025-06-09 … 2026-06-08.',
    items: [
      req('KPI Overview', 'GET', '/monitoring/kpi-overview', {
        query: { dateFrom: '2025-06-09', dateTo: '2026-06-08' },
      }),
      req('Trip Summary', 'GET', '/monitoring/trip-summary', {
        query: { dateFrom: '2025-06-09', dateTo: '2026-06-08', page: '1', limit: '20' },
      }),
      req('Tonnage (5-day)', 'GET', '/monitoring/tonnage-5day', {
        query: { dateFrom: '2026-06-04', dateTo: '2026-06-08' },
      }),
      req('Tonnage (monthly)', 'GET', '/monitoring/tonnage-monthly', {
        query: { dateFrom: '2025-06-09', dateTo: '2026-06-08' },
      }),
      req('Tonnage by Site', 'GET', '/monitoring/tonnage-by-site', {
        query: { dateFrom: '2025-06-09', dateTo: '2026-06-08' },
      }),
      req('Tonnage by Source', 'GET', '/monitoring/tonnage-by-source', {
        query: { dateFrom: '2025-06-09', dateTo: '2026-06-08' },
      }),
      req('Fuel Consumption', 'GET', '/monitoring/fuel-consumption', {
        query: { dateFrom: '2025-06-09', dateTo: '2026-06-08' },
      }),
      req('Fuel by Type', 'GET', '/monitoring/fuel-by-type', {
        query: { dateFrom: '2025-06-09', dateTo: '2026-06-08' },
      }),
      req('Routes Active', 'GET', '/monitoring/routes-active', {
        query: { dateFrom: '2025-06-09', dateTo: '2026-06-08' },
      }),
      req('Levy Summary', 'GET', '/monitoring/levy-summary', {
        query: { dateFrom: '2025-06-09', dateTo: '2026-06-08' },
      }),
      req('Levy Trend', 'GET', '/monitoring/levy-trend', {
        query: { dateFrom: '2025-06-09', dateTo: '2026-06-08' },
      }),
    ],
  },
  {
    name: 'Reports',
    description:
      'Async Excel/PDF report engine. **Generate** enqueues a BullMQ job and returns a `jobId` (captured). Poll **Get Job** until status is `READY`, then **Download** for a presigned URL. `format` ∈ xlsx | pdf.',
    items: [
      req('Generate Tonnage Report', 'POST', '/reports/tonnage/generate', {
        body: { dateFrom: '2026-05-01', dateTo: '2026-05-31', format: 'xlsx' },
        capture: 'reportJobId',
        captureFrom: 'data.jobId',
      }),
      req('Generate Fuel Report', 'POST', '/reports/fuel/generate', {
        body: { dateFrom: '2026-05-01', dateTo: '2026-05-31', format: 'xlsx' },
        capture: 'reportJobId',
        captureFrom: 'data.jobId',
      }),
      req('Generate Route Report', 'POST', '/reports/route/generate', {
        body: { dateFrom: '2026-05-01', dateTo: '2026-05-31', format: 'pdf' },
        capture: 'reportJobId',
        captureFrom: 'data.jobId',
      }),
      req('Generate Levy Report', 'POST', '/reports/levy/generate', {
        body: { dateFrom: '2026-05-01', dateTo: '2026-05-31', format: 'xlsx' },
        capture: 'reportJobId',
        captureFrom: 'data.jobId',
      }),
      req('Get Report Job', 'GET', '/reports/jobs/{{reportJobId}}', {
        note: 'Poll until data.status === "READY" (or "FAILED").',
      }),
      req('Download Report', 'GET', '/reports/download/{{reportJobId}}', {
        note: 'Returns a presigned MinIO URL once the job is READY.',
      }),
      req('Delete Report Job', 'DELETE', '/reports/jobs/{{reportJobId}}'),
    ],
  },
  {
    name: 'Weighbridge (TPA Integration)',
    description:
      'TPA "Jembatan Timbang" REST API (replaces the legacy SOAP). Dual auth: the admin **session cookie** works for the operator endpoints, OR send `X-API-Key: {{weighbridgeApiKey}}` (the demo seed prints a `swatwb_demo_…` key) for unattended posting. `post-weighing` accepts an optional `Idempotency-Key`.',
    items: [
      req('Resolve Kitir', 'POST', '/weighbridge/resolve-kitir', {
        headers: [{ key: 'X-API-Key', value: '{{weighbridgeApiKey}}' }],
        body: { plateNumber: 'L 9 UJI', date: '2026-06-05' },
        note: 'Look up the open disposal-permit (kitir) for a plate/date before posting a weighing.',
      }),
      req('Post Weighing', 'POST', '/weighbridge/post-weighing', {
        headers: [
          { key: 'X-API-Key', value: '{{weighbridgeApiKey}}' },
          { key: 'Idempotency-Key', value: '{{$guid}}' },
        ],
        body: {
          plateNumber: 'L 9 UJI',
          date: '2026-06-05',
          grossWeight: 12000,
          tareWeight: 8000,
          wasteVolume: 4,
          notes: 'uji timbang',
          operatorId: '{{userId}}',
        },
        capture: 'weighbridgeTripId',
        captureFrom: 'data.tripId',
        note: 'Creates/updates the inbound weighing + Trip. operatorId (legacy petugasid) attributes the human weigher on API-key posts. Captures the resulting tripId.',
      }),
      req('List Weighings', 'GET', '/weighbridge/weighings', {
        query: { page: '1', limit: '20', date: '2026-06-05' },
      }),
      req('Update Weighing', 'PATCH', '/weighbridge/weighings/{{weighbridgeTripId}}', {
        body: { grossWeight: 12500, verified: true },
      }),
      req('Import Excel', 'POST', '/weighbridge/import-excel', {
        formdata: [{ key: 'file', type: 'file', src: [] }],
        note: 'Bulk import a legacy weighbridge Excel export. Attach an .xlsx in the file field before sending.',
      }),
    ],
  },
  {
    name: 'Service Accounts (Admin)',
    description:
      'Manage machine principals + their API keys (for the weighbridge/native integrations) and inspect the API audit trail. Requires `service-account:manage`.',
    items: [
      req('List Service Accounts', 'GET', '/admin/service-accounts', {
        query: { page: '1', limit: '20' },
        capture: 'serviceAccountId',
        captureFrom: 'data[0].id',
      }),
      req('Create Service Account', 'POST', '/admin/service-accounts', {
        body: { name: 'TPA Jembatan Timbang (uji)', roleId: '{{roleId}}', rateLimitPerMin: 120 },
        capture: 'serviceAccountId',
        captureString: true,
        note: 'Response includes the one-time plaintext API key — copy it into weighbridgeApiKey.',
      }),
      req('Get Service Account', 'GET', '/admin/service-accounts/{{serviceAccountId}}'),
      req('Update Service Account', 'PATCH', '/admin/service-accounts/{{serviceAccountId}}', {
        body: { rateLimitPerMin: 240, active: true },
      }),
      req('Delete Service Account', 'DELETE', '/admin/service-accounts/{{serviceAccountId}}'),
      req('List API Audit Logs', 'GET', '/admin/api-audit-logs', {
        query: { page: '1', limit: '20' },
      }),
    ],
  },
  {
    name: 'Storage & Archiving',
    items: [
      req('Presigned Upload URL', 'POST', '/storage/presigned-put', {
        body: { key: 'trip/2026/06/uji.jpg', contentType: 'image/jpeg', expiresIn: 900 },
        note: 'Returns a presigned MinIO PUT URL the client uploads to directly.',
      }),
      req('Presigned Download URL', 'POST', '/storage/presigned-get', {
        body: { key: 'trip/2026/06/uji.jpg', expiresIn: 900 },
      }),
      req('List Archive Catalog', 'GET', '/archiving', {
        note: 'Lists detached/archived monthly partitions.',
      }),
      req('Reattach Partition', 'POST', '/archiving/reattach', {
        body: { tableName: 'trip_y2024m03', period: '2024-03' },
        note: 'Re-attaches a previously detached monthly partition for querying.',
      }),
    ],
  },
];

// ---------------------------------------------------------------------------
// Postman v2.1 emitters
// ---------------------------------------------------------------------------
function captureScript(item) {
  if (!item.capture) return null;
  const from = item.captureFrom ?? 'data.id';
  const accessor = from
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean)
    .map((k) => `?.['${k}']`)
    .join('');
  const valueExpr = item.captureString ? 'String(value)' : 'value';
  return [
    'const json = pm.response.json();',
    `const value = json${accessor};`,
    `if (value !== undefined && value !== null) { pm.environment.set('${item.capture}', ${valueExpr}); }`,
  ];
}

function defaultTest(item) {
  // 202 (async report generate) and 204 (deletes) are valid successes too.
  return [
    item.test ??
      "pm.test('2xx', () => pm.expect(pm.response.code).to.be.oneOf([200, 201, 202, 204]));",
  ];
}

function toRequest(item) {
  const base = item.base ?? 'baseUrl';
  const segments = item.path.replace(/^\//, '').split('/');
  const url = {
    raw: `{{${base}}}${item.path}`,
    host: [`{{${base}}}`],
    path: segments,
  };
  if (item.query) {
    url.raw += `?${Object.entries(item.query)
      .map(([k, v]) => `${k}=${v}`)
      .join('&')}`;
    url.query = Object.entries(item.query).map(([key, value]) => ({ key, value: String(value) }));
  }

  const request = { method: item.method, header: [], url };
  if (item.body) {
    request.header.push({ key: 'Content-Type', value: 'application/json' });
    request.body = { mode: 'raw', raw: JSON.stringify(item.body, null, 2) };
  }
  if (item.formdata) {
    // multipart/form-data (file uploads). Postman sets the boundary itself, so
    // don't add a Content-Type header here.
    request.body = { mode: 'formdata', formdata: item.formdata };
  }
  if (item.headers) {
    // Extra request headers (e.g. Authorization: Bearer for native-client calls).
    request.header.push(...item.headers);
  }
  if (item.note) {
    request.description = item.note;
  }

  const exec = [...defaultTest(item)];
  const capture = captureScript(item);
  if (capture) exec.push('', ...capture);

  return {
    name: item.name,
    event: [{ listen: 'test', script: { type: 'text/javascript', exec } }],
    request,
  };
}

const collection = {
  info: {
    name: 'SWAT API',
    _postman_id: 'swat-api-collection',
    description:
      'SWAT backend — full API surface: auth/RBAC, master data, scheduling, daily transactions, levies/refuel, maintenance & inspections, monitoring analytics, async reports, the TPA weighbridge integration, service accounts, and storage/archiving. Kept 1:1 with the Swagger spec at `/api/docs`. The web flow uses cookie session auth: run Auth → Login first. Native .NET clients use bearer tokens: run Auth → Get Token (native client), which captures accessToken + refreshToken for the Bearer requests; the weighbridge also accepts `X-API-Key`. Regenerate with `node apps/backend/postman/generate.mjs`.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  item: GROUPS.map((group) => ({
    name: group.name,
    ...(group.description ? { description: group.description } : {}),
    item: group.items.map(toRequest),
  })),
};

// URL is composed from parts so you can flip protocol/host/version in one place.
// Postman resolves nested {{vars}} recursively, so `baseUrl`/`rootUrl` stay in sync.
const ENV_VARS = [
  ['protocol', 'http'],
  ['host', 'localhost:3000'],
  ['apiPrefix', 'api/v1'],
  ['rootUrl', '{{protocol}}://{{host}}'],
  ['baseUrl', '{{rootUrl}}/{{apiPrefix}}'],
  ['adminUsername', 'admin'],
  ['adminPassword', 'ChangeMe!2026'],
  'userId',
  'roleId',
  'siteId',
  'destinationSiteId',
  'routeId',
  'wasteSourceId',
  'vehicleTypeId',
  'fuelCategoryId',
  'fuelId',
  'modelId',
  'vehicleId',
  'licenseClassId',
  'driverId',
  'licenseId',
  'scheduleTemplateId',
  'tripTemplateId',
  'disposalPermitId',
  'transactionDayId',
  'haulAssignmentId',
  'tripId',
  'levyId',
  'maintenanceId',
  'inspectionId',
  'reportJobId',
  'serviceAccountId',
  'weighbridgeTripId',
  // Default to the demo seed's dev-only weighbridge key so the Weighbridge
  // folder works out of the box; replace with a real key in other envs.
  ['weighbridgeApiKey', 'swatwb_demo_000000000000000000000000000000000000000000000000000000'],
  'accessToken',
  'refreshToken',
];

const environment = {
  id: 'swat-local-environment',
  name: 'SWAT Local',
  values: ENV_VARS.map((entry) => {
    const [key, value] = Array.isArray(entry) ? entry : [entry, ''];
    return { key, value, type: key === 'adminPassword' ? 'secret' : 'default', enabled: true };
  }),
  _postman_variable_scope: 'environment',
};

writeFileSync(
  join(here, 'SWAT.postman_collection.json'),
  `${JSON.stringify(collection, null, 2)}\n`,
);
writeFileSync(
  join(here, 'SWAT.local.postman_environment.json'),
  `${JSON.stringify(environment, null, 2)}\n`,
);

const requestCount = GROUPS.reduce((sum, g) => sum + g.items.length, 0);
// eslint-disable-next-line no-console
console.log(`Generated SWAT collection (${requestCount} requests) + local environment.`);
