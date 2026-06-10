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
      req('List Crew Schedules', 'GET', '/crew-schedules', { query: { page: '1', limit: '20' } }),
      req('Get Crew Schedule', 'GET', '/crew-schedules/{{crewScheduleId}}'),
      req('Create Crew Schedule', 'POST', '/crew-schedules', {
        body: {
          vehicleId: '{{vehicleId}}',
          driverId: '{{driverId}}',
          departTime: '05:00',
          returnTime: '14:00',
        },
        capture: 'crewScheduleId',
      }),
      req('Update Crew Schedule', 'PATCH', '/crew-schedules/{{crewScheduleId}}', {
        body: { returnTime: '15:00' },
      }),
      req('Delete Crew Schedule', 'DELETE', '/crew-schedules/{{crewScheduleId}}'),
      req('List Trip Templates', 'GET', '/crew-schedules/{{crewScheduleId}}/trip-templates'),
      req('Add Trip Template', 'POST', '/crew-schedules/{{crewScheduleId}}/trip-templates', {
        body: { routeId: '{{routeId}}', targetTime: '06:30', fuelRequestedLiters: 20 },
        capture: 'tripTemplateId',
      }),
      req(
        'Update Trip Template',
        'PATCH',
        '/crew-schedules/{{crewScheduleId}}/trip-templates/{{tripTemplateId}}',
        { body: { targetTime: '07:00' } },
      ),
      req(
        'Delete Trip Template',
        'DELETE',
        '/crew-schedules/{{crewScheduleId}}/trip-templates/{{tripTemplateId}}',
      ),
      req('List Fuel Quotas', 'GET', '/fuel-quotas', { query: { page: '1', limit: '20' } }),
      req('Get Fuel Quota', 'GET', '/fuel-quotas/{{fuelQuotaId}}'),
      req('Create Fuel Quota', 'POST', '/fuel-quotas', {
        body: {
          code: 'KT-UJI-0001',
          vehicleId: '{{vehicleId}}',
          siteId: '{{destinationSiteId}}',
          issuedAt: '2026-06-01',
          validFrom: '2026-06-01',
          validTo: '2026-06-30',
        },
        capture: 'fuelQuotaId',
        captureString: true,
      }),
      req('Update Fuel Quota (revoke)', 'PATCH', '/fuel-quotas/{{fuelQuotaId}}', {
        body: { status: 'INACTIVE' },
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
  return [
    item.test ?? "pm.test('2xx', () => pm.expect(pm.response.code).to.be.oneOf([200, 201]));",
  ];
}

function toRequest(item) {
  const segments = item.path.replace(/^\//, '').split('/');
  const url = {
    raw: `{{baseUrl}}${item.path}`,
    host: ['{{baseUrl}}'],
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
      'SWAT backend — auth, RBAC, and master data (Phase 1 M1–M2). Cookie-based session auth: run Auth → Login first. Regenerate with `node apps/backend/postman/generate.mjs`.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  item: GROUPS.map((group) => ({
    name: group.name,
    ...(group.description ? { description: group.description } : {}),
    item: group.items.map(toRequest),
  })),
};

const ENV_VARS = [
  ['baseUrl', 'http://localhost:3000/api/v1'],
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
  'crewScheduleId',
  'tripTemplateId',
  'fuelQuotaId',
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
