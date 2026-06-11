/**
 * One-off dev generator: parse the legacy MySQL dump and emit cleaned seed
 * fixtures for Sites (spot), Routes (rute) and Vehicles (kendaraan) — mirroring
 * the data-quality rules in scripts/migration/lib/{transforms,enums}.ts so the
 * baked seed matches what the live migration would produce.
 *
 *   pnpm --filter @swat/backend exec ts-node --compiler-options '{"module":"CommonJS"}' \
 *     prisma/scripts/generate-legacy-fixtures.ts
 *
 * Reads the SQL dump under <repo>/old_swat and writes prisma/legacy-{sites,routes,vehicles}.ts.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  mapEmploymentStatus,
  mapRouteCategory,
  mapSiteType,
  mapVehicleStatus,
} from '../../scripts/migration/lib/enums';
import {
  clampNonNegative,
  dedupeRoutes,
  fixDate,
  fixGps,
  fixYear,
  routeDedupeKey,
  trimOrNull,
} from '../../scripts/migration/lib/transforms';

const DUMP = resolve(__dirname, '../../../../../old_swat/db_backup/dkp_swat_2026_05_18_data.sql');
const OUT_DIR = resolve(__dirname, '..');
const NOW = new Date('2026-06-11T00:00:00.000Z');

type Field = string | null;

/** Parse every `INSERT INTO \`table\` … VALUES (…),(…);` row into raw fields. */
function parseInserts(sql: string, table: string): Field[][] {
  const rows: Field[][] = [];
  const marker = 'INSERT INTO `' + table + '`';
  let idx = 0;
  for (;;) {
    const at = sql.indexOf(marker, idx);
    if (at < 0) break;
    const valuesAt = sql.indexOf('VALUES', at);
    if (valuesAt < 0) break;
    let i = valuesAt + 'VALUES'.length;
    // Parse tuples until the statement-terminating ';' at top level.
    for (;;) {
      while (i < sql.length && sql[i] !== '(' && sql[i] !== ';') i++;
      if (i >= sql.length || sql[i] === ';') break;
      i++; // consume '('
      const row: Field[] = [];
      while (i < sql.length && sql[i] !== ')') {
        while (i < sql.length && /[\s,]/.test(sql[i]!)) i++;
        if (sql[i] === ')') break;
        if (sql[i] === "'") {
          i++;
          let s = '';
          while (i < sql.length) {
            const c = sql[i]!;
            if (c === '\\') {
              const next = sql[i + 1]!;
              s += { n: '\n', r: '\r', t: '\t', '0': '\0' }[next] ?? next;
              i += 2;
              continue;
            }
            if (c === "'") {
              if (sql[i + 1] === "'") {
                s += "'";
                i += 2;
                continue;
              }
              i++;
              break;
            }
            s += c;
            i++;
          }
          row.push(s);
        } else {
          let t = '';
          while (i < sql.length && sql[i] !== ',' && sql[i] !== ')') t += sql[i++];
          t = t.trim();
          row.push(t === 'NULL' ? null : t);
        }
      }
      i++; // consume ')'
      rows.push(row);
    }
    idx = i;
  }
  return rows;
}

const num = (f: Field | undefined): number => (f == null ? 0 : Number(f));

// 999 is the legacy "unknown" sentinel for kendaraan numerics (same convention
// as kategorikendaraan, where 999 → 0/1 on import). Map it out so the UI shows a
// real 0/unknown instead of a fake 999. Negatives already clamp to 0.
const unsentinel = (f: Field | undefined): number => {
  const n = clampNonNegative(f);
  return n === 999 ? 0 : n;
};

function main(): void {
  const sql = readFileSync(DUMP, 'utf8');

  // --- Sites (spot) -------------------------------------------------------
  const spotRows = parseInserts(sql, 'spot');
  const siteLegacyIds = new Set<number>();
  const sites = spotRows.map((r) => {
    const gps = fixGps(r[5], r[6]);
    const legacyId = num(r[0]);
    siteLegacyIds.add(legacyId);
    return {
      legacyId,
      type: mapSiteType(num(r[1])),
      name: (trimOrNull(r[2]) ?? '(Tanpa Nama)').slice(0, 256),
      address: (trimOrNull(r[3]) ?? '-').slice(0, 512),
      latitude: gps.latitude,
      longitude: gps.longitude,
    };
  });

  // --- Routes (rute) ------------------------------------------------------
  const ruteRows = parseInserts(sql, 'rute');
  const { kept, dropped } = dedupeRoutes(ruteRows, (r) =>
    routeDedupeKey(num(r[2]), num(r[3]), num(r[1])),
  );
  let orphanRoutes = 0;
  const routes = kept
    .filter((r) => {
      const ok = siteLegacyIds.has(num(r[2])) && siteLegacyIds.has(num(r[3]));
      if (!ok) orphanRoutes += 1;
      return ok;
    })
    .map((r) => ({
      legacyId: num(r[0]),
      category: mapRouteCategory(num(r[1])),
      originLegacyId: num(r[2]),
      destinationLegacyId: num(r[3]),
      distanceKm: clampNonNegative(r[4]),
    }));

  // --- Vehicles (kendaraan) ----------------------------------------------
  const kRows = parseInserts(sql, 'kendaraan');
  const plateCount = new Map<string, number>();
  for (const r of kRows) {
    const plate = (r[4] ?? '').trim();
    plateCount.set(plate, (plateCount.get(plate) ?? 0) + 1);
  }
  let plateReview = 0;
  const vehicles = kRows.map((r) => {
    const legacyId = num(r[0]);
    const plate = (r[4] ?? '').trim();
    const needsPlateReview = plate === '' || (plateCount.get(plate) ?? 0) > 1;
    if (needsPlateReview) plateReview += 1;
    const reg = fixDate(r[11]);
    const tax = fixDate(r[12]);
    return {
      legacyId,
      poolLegacyId: num(r[1]),
      modelLegacyId: num(r[3]),
      status: mapVehicleStatus(num(r[2])),
      plateNumber: needsPlateReview ? `${plate || 'NOPOL'}#${legacyId}` : plate,
      needsPlateReview,
      chassisNumber: (trimOrNull(r[5]) ?? '-').slice(0, 100),
      engineNumber: (trimOrNull(r[6]) ?? '-').slice(0, 100),
      manufactureYear: fixYear(r[7], NOW),
      // ratio falls back to 1 (0 is invalid); tare/odometer keep 0 = unknown.
      currentFuelRatio: unsentinel(r[8]) || 1,
      currentTareWeight: unsentinel(r[9]),
      currentOdometer: unsentinel(r[10]),
      registrationExpiry: reg ? reg.toISOString().slice(0, 10) : null,
      taxExpiry: tax ? tax.toISOString().slice(0, 10) : null,
      notes: trimOrNull(r[13]),
    };
  });

  // --- Drivers (pengemudi) -----------------------------------------------
  const driverRows = parseInserts(sql, 'pengemudi');
  const driverLegacyIds = new Set<number>();
  const drivers = driverRows.map((r) => {
    const legacyId = num(r[0]);
    driverLegacyIds.add(legacyId);
    const birth = fixDate(r[7]);
    return {
      legacyId,
      poolLegacyId: num(r[1]),
      employmentStatus: mapEmploymentStatus(num(r[2])),
      name: (trimOrNull(r[3]) ?? '(Tanpa Nama)').slice(0, 100),
      idCardNumber: (trimOrNull(r[4]) ?? '').slice(0, 16),
      originAddress: (trimOrNull(r[5]) ?? '-').slice(0, 256),
      currentAddress: (trimOrNull(r[6]) ?? '-').slice(0, 256),
      // birthDate is NOT NULL; a 0000-00-00/invalid legacy date → seed fallback.
      birthDate: birth ? birth.toISOString().slice(0, 10) : null,
      contact: (trimOrNull(r[8]) ?? '-').slice(0, 100),
      safetyTraining: trimOrNull(r[9]),
      notes: trimOrNull(r[11]),
    };
  });

  // --- Driver licenses (kepemilikansim) — class resolved by SIM name ------
  const simNameById = new Map<number, string>();
  for (const r of parseInserts(sql, 'sim')) {
    simNameById.set(num(r[0]), (trimOrNull(r[1]) ?? '').trim());
  }
  let orphanLicenses = 0;
  const licenses = parseInserts(sql, 'kepemilikansim').flatMap((r) => {
    const driverLegacyId = num(r[1]);
    const licenseClassName = simNameById.get(num(r[2]));
    if (!driverLegacyIds.has(driverLegacyId) || !licenseClassName) {
      orphanLicenses += 1;
      return [];
    }
    const exp = fixDate(r[4]);
    return [
      {
        legacyId: num(r[0]),
        driverLegacyId,
        licenseClassName,
        licenseNumber: (trimOrNull(r[3]) ?? '-').slice(0, 12),
        expiry: exp ? exp.toISOString().slice(0, 10) : null,
      },
    ];
  });

  // --- Emit (pure JSON; the typed wrapper lives in legacy-fixtures.ts) -----
  // JSON, not TS literals: a multi-thousand-row array of enum-typed object
  // literals overflows tsc's union representation (TS2590). The wrapper casts.
  writeFileSync(resolve(OUT_DIR, 'legacy-sites.json'), JSON.stringify(sites, null, 1));
  writeFileSync(resolve(OUT_DIR, 'legacy-routes.json'), JSON.stringify(routes, null, 1));
  writeFileSync(resolve(OUT_DIR, 'legacy-vehicles.json'), JSON.stringify(vehicles, null, 1));
  writeFileSync(resolve(OUT_DIR, 'legacy-drivers.json'), JSON.stringify(drivers, null, 1));
  writeFileSync(resolve(OUT_DIR, 'legacy-licenses.json'), JSON.stringify(licenses, null, 1));

  // --- Cleanup report -----------------------------------------------------
  process.stdout.write(
    [
      `Legacy fixture generation report`,
      `  sites:    ${sites.length} (from ${spotRows.length} spot rows)`,
      `  routes:   ${routes.length} kept · ${dropped.length} duplicates · ${orphanRoutes} orphans dropped (from ${ruteRows.length})`,
      `  vehicles: ${vehicles.length} (${plateReview} needsPlateReview) from ${kRows.length} kendaraan rows`,
      `  drivers:  ${drivers.length} (from ${driverRows.length} pengemudi rows)`,
      `  licenses: ${licenses.length} · ${orphanLicenses} orphans dropped`,
      ``,
    ].join('\n'),
  );
}

main();
