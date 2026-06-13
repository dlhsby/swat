/**
 * Derive the SLIM demo master fixtures from the (large) legacy snapshot.
 *
 * Reads the cleaned legacy fixtures (`prisma/legacy-*.json` via
 * `prisma/legacy-fixtures.ts` + `prisma/legacy-vehicle-models.ts`) and emits a
 * single self-contained `prisma/demo-fixtures.ts` holding a deterministic,
 * connected subset (~15 vehicles + the sites/routes/drivers/templates they
 * touch). The demo seed (`prisma/seed.ts`) loads ONLY this file, so the multi-MB
 * legacy JSON is no longer on the demo path.
 *
 * This is a one-time/dev derivation tool — NOT part of any seed track. Re-run it
 * only when the legacy snapshot changes:
 *   pnpm --filter @swat/backend exec ts-node scripts/build-demo-fixtures.ts
 *
 * Selection is deterministic (sorted by legacyId, fixed caps) so re-running
 * yields a stable diff. Real plate numbers / driver names are kept so the demo
 * master-data pages look realistic.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  type LegacyDriver,
  type LegacyDriverLicense,
  type LegacyRoute,
  type LegacyScheduleTemplate,
  type LegacySite,
  type LegacyTripTemplate,
  type LegacyVehicle,
  LEGACY_DRIVER_LICENSES,
  LEGACY_DRIVERS,
  LEGACY_ROUTES,
  LEGACY_SCHEDULE_TEMPLATES,
  LEGACY_SITES,
  LEGACY_TRIP_TEMPLATES,
  LEGACY_VEHICLES,
} from '../prisma/legacy-fixtures';
import { type LegacyVehicleModel, LEGACY_VEHICLE_MODELS } from '../prisma/legacy-vehicle-models';

// Tunables — how broad the demo dataset is. Kept small but varied so monitoring
// (by vehicle / route / source / site) has multi-dimensional data.
const TARGET_VEHICLES = 15;
const TARGET_DRIVERS = 12;
const ROUTE_CAPS = {
  DISPOSAL: 10,
  REFUEL: 5,
  PICKUP: 8,
  RETURN_POOL: 4,
  DEPART_POOL: 3,
} as const;

const byLegacyId = <T extends { legacyId: number }>(a: T, b: T): number => a.legacyId - b.legacyId;

function curate(): {
  sites: LegacySite[];
  routes: LegacyRoute[];
  vehicles: LegacyVehicle[];
  drivers: LegacyDriver[];
  licenses: LegacyDriverLicense[];
  models: LegacyVehicleModel[];
  scheduleTemplates: LegacyScheduleTemplate[];
  tripTemplates: LegacyTripTemplate[];
} {
  const sitesById = new Map(LEGACY_SITES.map((s) => [s.legacyId, s]));

  // 1. Infrastructure sites: every POOL / SPBU / TPA (only ~9 rows total).
  const infraSites = LEGACY_SITES.filter(
    (s) => s.type === 'POOL' || s.type === 'SPBU' || s.type === 'TPA',
  );
  const poolIds = new Set(infraSites.filter((s) => s.type === 'POOL').map((s) => s.legacyId));
  const keptSiteIds = new Set(infraSites.map((s) => s.legacyId));

  // 2. Transactional routes: a capped, category-balanced slice (sorted by id).
  const routesSorted = [...LEGACY_ROUTES].sort(byLegacyId);
  const cappedRoutes: LegacyRoute[] = [];
  for (const [category, cap] of Object.entries(ROUTE_CAPS)) {
    const picked = routesSorted.filter((r) => r.category === category).slice(0, cap);
    cappedRoutes.push(...picked);
  }
  // Pull each kept route's endpoints into the site set (skip if the site is
  // missing from the snapshot — keeps the seed's FK resolution clean).
  const keptRoutes = cappedRoutes.filter(
    (r) => sitesById.has(r.originLegacyId) && sitesById.has(r.destinationLegacyId),
  );
  for (const r of keptRoutes) {
    keptSiteIds.add(r.originLegacyId);
    keptSiteIds.add(r.destinationLegacyId);
  }

  // 3. Vehicles: ~15 anchored on pools, maximising distinct models (→ varied
  //    fuel types / vehicle types) before filling up to the target.
  const poolVehicles = [...LEGACY_VEHICLES]
    .filter((v) => poolIds.has(v.poolLegacyId))
    .sort(byLegacyId);
  const vehicles: LegacyVehicle[] = [];
  const seenModels = new Set<number>();
  for (const v of poolVehicles) {
    if (vehicles.length >= TARGET_VEHICLES) break;
    if (!seenModels.has(v.modelLegacyId)) {
      seenModels.add(v.modelLegacyId);
      vehicles.push(v);
    }
  }
  for (const v of poolVehicles) {
    if (vehicles.length >= TARGET_VEHICLES) break;
    if (!vehicles.includes(v)) vehicles.push(v);
  }
  const vehicleIds = new Set(vehicles.map((v) => v.legacyId));
  const modelIds = new Set(vehicles.map((v) => v.modelLegacyId));
  const models = LEGACY_VEHICLE_MODELS.filter((m) => modelIds.has(m.legacyId)).sort(byLegacyId);

  // 4. Scheduling anchor: keep the schedule templates of the chosen vehicles, and
  //    derive drivers FROM them so the templates resolve (a vehicle picked
  //    independently of its driver would otherwise leave the templates empty).
  const scheduleTemplates = [...LEGACY_SCHEDULE_TEMPLATES]
    .filter((s) => vehicleIds.has(s.vehicleLegacyId))
    .sort(byLegacyId);
  const driverIds = new Set(scheduleTemplates.map((s) => s.driverLegacyId));
  const driversById = new Map(LEGACY_DRIVERS.map((d) => [d.legacyId, d]));
  // Include the (few) drivers that actually hold a legacy license so the
  // driver-licenses page isn't empty, then pad with pool drivers up to target.
  const licensedDriverIds = new Set(LEGACY_DRIVER_LICENSES.map((l) => l.driverLegacyId));
  for (const d of [...LEGACY_DRIVERS].filter((d) => licensedDriverIds.has(d.legacyId))) {
    driverIds.add(d.legacyId);
  }
  for (const d of [...LEGACY_DRIVERS].filter((d) => poolIds.has(d.poolLegacyId)).sort(byLegacyId)) {
    if (driverIds.size >= TARGET_DRIVERS) break;
    driverIds.add(d.legacyId);
  }
  const drivers = [...driverIds]
    .map((id) => driversById.get(id))
    .filter((d): d is LegacyDriver => d !== undefined)
    .sort(byLegacyId);
  const licenses = LEGACY_DRIVER_LICENSES.filter((l) => driverIds.has(l.driverLegacyId)).sort(
    byLegacyId,
  );

  // 5. Trip templates of the kept schedules — cascade their routes + snapshot
  //    sites INTO the kept sets (rather than dropping templates whose route was
  //    outside the capped slice), so the templates resolve at seed time.
  const routesById = new Map(LEGACY_ROUTES.map((r) => [r.legacyId, r]));
  const keptRouteIds = new Set(keptRoutes.map((r) => r.legacyId));
  const scheduleIds = new Set(scheduleTemplates.map((s) => s.legacyId));
  const extraRoutes: LegacyRoute[] = [];
  const tripTemplates = [...LEGACY_TRIP_TEMPLATES]
    .filter((t) => scheduleIds.has(t.scheduleLegacyId))
    .filter((t) => {
      const route = routesById.get(t.routeLegacyId);
      if (!route || !sitesById.has(t.originLegacyId) || !sitesById.has(t.destinationLegacyId)) {
        return false;
      }
      if (!keptRouteIds.has(route.legacyId)) {
        keptRouteIds.add(route.legacyId);
        extraRoutes.push(route);
        keptSiteIds.add(route.originLegacyId);
        keptSiteIds.add(route.destinationLegacyId);
      }
      keptSiteIds.add(t.originLegacyId);
      keptSiteIds.add(t.destinationLegacyId);
      return true;
    })
    .sort(byLegacyId);

  const routes = [...keptRoutes, ...extraRoutes].sort(byLegacyId);
  const sites = LEGACY_SITES.filter((s) => keptSiteIds.has(s.legacyId)).sort(byLegacyId);

  return {
    sites,
    routes,
    vehicles,
    drivers,
    licenses,
    models,
    scheduleTemplates,
    tripTemplates,
  };
}

function emit(name: string, type: string, rows: readonly unknown[]): string {
  return `export const ${name}: readonly ${type}[] = ${JSON.stringify(rows, null, 2)};\n`;
}

function main(): void {
  const c = curate();

  const header = `/**
 * SLIM demo master fixtures — AUTO-GENERATED by scripts/build-demo-fixtures.ts
 * from the legacy snapshot. Do NOT edit by hand; re-run the generator instead.
 *
 * A deterministic, connected subset of the legacy master data (~${c.vehicles.length} vehicles +
 * the sites/routes/drivers/templates they touch) used ONLY by the demo seed
 * (prisma/seed.ts → seed:demo). The legacy seed tracks load from MySQL, not this.
 */
import type {
  LegacyDriver,
  LegacyDriverLicense,
  LegacyRoute,
  LegacyScheduleTemplate,
  LegacySite,
  LegacyTripTemplate,
  LegacyVehicle,
} from './legacy-fixtures';
import type { LegacyVehicleModel } from './legacy-vehicle-models';

`;

  const body = [
    emit('DEMO_SITES', 'LegacySite', c.sites),
    emit('DEMO_ROUTES', 'LegacyRoute', c.routes),
    emit('DEMO_VEHICLE_MODELS', 'LegacyVehicleModel', c.models),
    emit('DEMO_VEHICLES', 'LegacyVehicle', c.vehicles),
    emit('DEMO_DRIVERS', 'LegacyDriver', c.drivers),
    emit('DEMO_DRIVER_LICENSES', 'LegacyDriverLicense', c.licenses),
    emit('DEMO_SCHEDULE_TEMPLATES', 'LegacyScheduleTemplate', c.scheduleTemplates),
    emit('DEMO_TRIP_TEMPLATES', 'LegacyTripTemplate', c.tripTemplates),
  ].join('\n');

  const out = join(__dirname, '..', 'prisma', 'demo-fixtures.ts');
  writeFileSync(out, header + body, 'utf8');

  // eslint-disable-next-line no-console
  console.log(
    `demo-fixtures.ts written: ${c.sites.length} sites, ${c.routes.length} routes, ` +
      `${c.vehicles.length} vehicles, ${c.models.length} models, ${c.drivers.length} drivers, ` +
      `${c.licenses.length} licenses, ${c.scheduleTemplates.length} schedule templates, ` +
      `${c.tripTemplates.length} trip templates`,
  );
}

main();
