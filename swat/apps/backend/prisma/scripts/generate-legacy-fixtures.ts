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

import { mapRouteCategory, mapSiteType, mapVehicleStatus } from '../../scripts/migration/lib/enums';
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
      currentFuelRatio: clampNonNegative(r[8]) || 1,
      currentTareWeight: clampNonNegative(r[9]),
      currentOdometer: clampNonNegative(r[10]),
      registrationExpiry: reg ? reg.toISOString().slice(0, 10) : null,
      taxExpiry: tax ? tax.toISOString().slice(0, 10) : null,
      notes: trimOrNull(r[13]),
    };
  });

  // --- Emit (pure JSON; the typed wrapper lives in legacy-fixtures.ts) -----
  // JSON, not TS literals: a multi-thousand-row array of enum-typed object
  // literals overflows tsc's union representation (TS2590). The wrapper casts.
  writeFileSync(resolve(OUT_DIR, 'legacy-sites.json'), JSON.stringify(sites, null, 1));
  writeFileSync(resolve(OUT_DIR, 'legacy-routes.json'), JSON.stringify(routes, null, 1));
  writeFileSync(resolve(OUT_DIR, 'legacy-vehicles.json'), JSON.stringify(vehicles, null, 1));

  // --- Cleanup report -----------------------------------------------------
  process.stdout.write(
    [
      `Legacy fixture generation report`,
      `  sites:    ${sites.length} (from ${spotRows.length} spot rows)`,
      `  routes:   ${routes.length} kept · ${dropped.length} duplicates · ${orphanRoutes} orphans dropped (from ${ruteRows.length})`,
      `  vehicles: ${vehicles.length} (${plateReview} needsPlateReview) from ${kRows.length} kendaraan rows`,
      ``,
    ].join('\n'),
  );
}

main();
