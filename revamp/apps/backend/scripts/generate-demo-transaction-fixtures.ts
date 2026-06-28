/**
 * Dev generator: extract a SAMPLED slice of REAL legacy transactions (latest year)
 * for the curated demo vehicles/drivers, so `seed:demo` ships realistic history
 * (real structure, small volume) instead of purely synthetic rows — while staying
 * MySQL-free at seed time (the sample is baked to prisma/demo-transactions.json).
 *
 * Source: legacy MySQL (LEGACY_DB_* env) — point it at the throwaway MySQL that
 * `infra/refresh-demo-fixtures.sh` stands up from legacy/db/dump/. Cleaning mirrors
 * scripts/migration/lib/{transforms,enums}.ts so the baked rows match the live
 * migration. FK closure is guaranteed: only rows whose parents are also kept (and
 * whose vehicle/driver are in the demo set) are emitted.
 *
 *   LEGACY_DB_HOST=127.0.0.1 LEGACY_DB_PORT=13307 LEGACY_DB_USER=root \
 *   LEGACY_DB_PASSWORD=… LEGACY_DB_NAME=dkp_swat \
 *   pnpm --filter @swat/backend exec ts-node --compiler-options '{"module":"CommonJS"}' \
 *     scripts/generate-demo-transaction-fixtures.ts
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { DEMO_DRIVERS, DEMO_ROUTES, DEMO_VEHICLES } from '../prisma/demo-fixtures';

import { mapDayStatus, mapTripStatus } from './migration/lib/enums';
import type {
  LegacyHaulAssignment,
  LegacyTransactionDay,
  LegacyTrip,
} from './migration/lib/legacy-types';
import { connectLegacy, legacyDbConfigFromEnv, query } from './migration/lib/runtime';
import {
  capApprovedFuel,
  clampNonNegative,
  fixDate,
  grossOrNullIfBelowTare,
  nonNegativeOrNull,
  trimOrNull,
} from './migration/lib/transforms';

// Sampling caps — tune here. Bounded so the committed fixture stays a few thousand rows.
// We keep ALL legs of a kept haul (an assignment's legs — depart→refuel→pickup→disposal→
// return — are a unit; the weighed disposal leg is what dashboards need), so volume is
// bounded by days × hauls, not trips.
const MAX_DAYS = 60; // most recent N transaction days (that have realized trips)
const MAX_HAULS_PER_DAY = 15; // ≈ the whole demo fleet

const OUT = resolve(__dirname, '../prisma/demo-transactions.json');

const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);
const dateOnly = (d: Date): string => d.toISOString().slice(0, 10);

type JoinedRow = LegacyTrip &
  LegacyHaulAssignment & {
    HARI_KENDARAAN_ID: number;
    HARI_TRANS_STATUS: number;
    HARI_TRANS_NOTES: string | null;
    HARITRANSAKSI_ID: number;
    HARITRANSAKSI_TANGGAL: string;
    STATUSHARITRANSAKSI_ID: number;
  };

/** A trip counts as "realized" (useful for dashboards) if it carries a weighed net
 * load OR an approved fuel amount — so the demo's tonnage/fuel rollups populate. */
const isRealized = (r: JoinedRow): boolean =>
  (nonNegativeOrNull(r.TRAYEK_BERATBERSIHSAMPAH) ?? 0) > 0 ||
  (nonNegativeOrNull(r.TRAYEK_JUMLAHISIBBMDISETUJUI) ?? 0) > 0;

async function main(): Promise<void> {
  const demoVehicleIds = DEMO_VEHICLES.map((v) => v.legacyId);
  const demoDriverIds = DEMO_DRIVERS.map((d) => d.legacyId);
  const demoRouteIds = new Set(DEMO_ROUTES.map((r) => r.legacyId));
  const conn = await connectLegacy(legacyDbConfigFromEnv());
  try {
    // Latest year that has real transaction days (ignore 0000-00-00 sentinels).
    const [maxRow] = await query<{ maxDate: string | null }>(
      conn,
      "SELECT MAX(HARITRANSAKSI_TANGGAL) AS maxDate FROM haritransaksi WHERE HARITRANSAKSI_TANGGAL > '2000-01-01'",
    );
    const latest = fixDate(maxRow?.maxDate ?? null);
    if (!latest) throw new Error('No valid haritransaksi dates found in the legacy source.');
    const year = latest.getUTCFullYear();

    // One join walks the whole trip→assignment→haul→day chain for the demo
    // vehicles+drivers in the latest year. Bottom-up keeps FK closure automatic.
    const rows = await query<JoinedRow>(
      conn,
      `SELECT tr.*,
              d.PENGEMUDI_ID, d.MASTERDETAILTRANSAKSIANGKUTSAMPAH_ID,
              d.STATUSDETAILTRANSAKSIANGKUTSAMPAH_ID, d.TRANSAKSIANGKUTSAMPAH_ID,
              d.DETAILTRANSAKSIANGKUTSAMPAH_REKAPKMTARGETBERANGKATKANDANG,
              d.DETAILTRANSAKSIANGKUTSAMPAH_REKAPKMREALISASIBERANGKATKANDANG,
              d.DETAILTRANSAKSIANGKUTSAMPAH_REKAPKMTARGETKEMBALIKANDANG,
              d.DETAILTRANSAKSIANGKUTSAMPAH_REKAPKMREALISASIKEMBALIKANDANG,
              d.DETAILTRANSAKSIANGKUTSAMPAH_REKAPWAKTUTARGETBERANGKATKANDANG,
              d.DETAILTRANSAKSIANGKUTSAMPAH_REKAPWAKTUREALISASIBERANGKATKANDANG,
              d.DETAILTRANSAKSIANGKUTSAMPAH_REKAPWAKTUTARGETKEMBALIKANDANG,
              d.DETAILTRANSAKSIANGKUTSAMPAH_REKAPWAKTUREALISASIKEMBALIKANDANG,
              d.DETAILTRANSAKSIANGKUTSAMPAH_KETERANGAN,
              t.KENDARAAN_ID AS HARI_KENDARAAN_ID,
              t.STATUSTRANSAKSIANGKUTSAMPAH_ID AS HARI_TRANS_STATUS,
              t.TRANSAKSIANGKUTSAMPAH_KETERANGAN AS HARI_TRANS_NOTES,
              h.HARITRANSAKSI_ID, h.HARITRANSAKSI_TANGGAL, h.STATUSHARITRANSAKSI_ID
         FROM trayek tr
         JOIN detailtransaksiangkutsampah d ON tr.DETAILTRANSAKSIANGKUTSAMPAH_ID = d.DETAILTRANSAKSIANGKUTSAMPAH_ID
         JOIN transaksiangkutsampah t ON d.TRANSAKSIANGKUTSAMPAH_ID = t.TRANSAKSIANGKUTSAMPAH_ID
         JOIN haritransaksi h ON t.HARITRANSAKSI_ID = h.HARITRANSAKSI_ID
        WHERE YEAR(h.HARITRANSAKSI_TANGGAL) = ?
          AND t.KENDARAAN_ID IN (?) AND d.PENGEMUDI_ID IN (?)
        ORDER BY h.HARITRANSAKSI_TANGGAL DESC, t.TRANSAKSIANGKUTSAMPAH_ID, tr.TRAYEK_ID`,
      [year, demoVehicleIds, demoDriverIds],
    );

    // Pick the most recent MAX_DAYS days that have ≥1 realized trip (so dashboards
    // populate), then within each day cap hauls/day and trips/assignment.
    const realizedDays: string[] = [];
    const seenDay = new Set<string>();
    for (const r of rows) {
      const key = r.HARITRANSAKSI_TANGGAL;
      if (seenDay.has(key) || !isRealized(r)) continue;
      seenDay.add(key);
      realizedDays.push(key);
    }
    const keptDayKeys = new Set(realizedDays.slice(0, MAX_DAYS));

    const dayByLegacy = new Map<number, LegacyTransactionDay>();
    const haulById = new Map<number, JoinedRow>();
    const assignmentById = new Map<number, JoinedRow>();
    const haulsPerDay = new Map<string, Set<number>>();
    const finalTripsRaw: JoinedRow[] = [];
    for (const r of rows) {
      const dayKey = r.HARITRANSAKSI_TANGGAL;
      if (!keptDayKeys.has(dayKey)) continue;
      const haulsSeen = haulsPerDay.get(dayKey) ?? haulsPerDay.set(dayKey, new Set()).get(dayKey)!;
      // Once a haul is kept, keep ALL its legs; only NEW hauls are gated by the per-day cap.
      if (!haulsSeen.has(r.TRANSAKSIANGKUTSAMPAH_ID) && haulsSeen.size >= MAX_HAULS_PER_DAY)
        continue;
      haulsSeen.add(r.TRANSAKSIANGKUTSAMPAH_ID);
      dayByLegacy.set(r.HARITRANSAKSI_ID, {
        HARITRANSAKSI_ID: r.HARITRANSAKSI_ID,
        HARITRANSAKSI_TANGGAL: r.HARITRANSAKSI_TANGGAL,
        STATUSHARITRANSAKSI_ID: r.STATUSHARITRANSAKSI_ID,
      });
      haulById.set(r.TRANSAKSIANGKUTSAMPAH_ID, r);
      assignmentById.set(r.DETAILTRANSAKSIANGKUTSAMPAH_ID, r);
      finalTripsRaw.push(r);
    }

    const usedDayIds = new Set([...haulById.values()].map((r) => r.HARITRANSAKSI_ID));
    const finalHauls = [...haulById.values()];
    const finalAssignments = [...assignmentById.values()];
    const finalTrips = finalTripsRaw;

    // --- Emit seed-ready, legacy-id-keyed rows (cleaning mirrors migrate-legacy) ---
    const days = [...usedDayIds]
      .map((id) => dayByLegacy.get(id)!)
      .map((d) => ({
        legacyId: d.HARITRANSAKSI_ID,
        date: dateOnly(fixDate(d.HARITRANSAKSI_TANGGAL)!),
        status: mapDayStatus(d.STATUSHARITRANSAKSI_ID),
      }));
    const hauls = finalHauls.map((r) => ({
      legacyId: r.TRANSAKSIANGKUTSAMPAH_ID,
      dayLegacyId: r.HARITRANSAKSI_ID,
      vehicleLegacyId: r.HARI_KENDARAAN_ID,
      status: mapDayStatus(r.HARI_TRANS_STATUS),
      notes: trimOrNull(r.HARI_TRANS_NOTES),
    }));
    const assignments = finalAssignments.map((r) => ({
      legacyId: r.DETAILTRANSAKSIANGKUTSAMPAH_ID,
      haulLegacyId: r.TRANSAKSIANGKUTSAMPAH_ID,
      driverLegacyId: r.PENGEMUDI_ID,
      status: mapDayStatus(r.STATUSDETAILTRANSAKSIANGKUTSAMPAH_ID),
      departTargetOdometer: clampNonNegative(
        r.DETAILTRANSAKSIANGKUTSAMPAH_REKAPKMTARGETBERANGKATKANDANG,
      ),
      departActualOdometer: nonNegativeOrNull(
        r.DETAILTRANSAKSIANGKUTSAMPAH_REKAPKMREALISASIBERANGKATKANDANG,
      ),
      returnTargetOdometer: clampNonNegative(
        r.DETAILTRANSAKSIANGKUTSAMPAH_REKAPKMTARGETKEMBALIKANDANG,
      ),
      returnActualOdometer: nonNegativeOrNull(
        r.DETAILTRANSAKSIANGKUTSAMPAH_REKAPKMREALISASIKEMBALIKANDANG,
      ),
      departTargetTime: iso(
        fixDate(r.DETAILTRANSAKSIANGKUTSAMPAH_REKAPWAKTUTARGETBERANGKATKANDANG),
      ),
      departActualTime: iso(
        fixDate(r.DETAILTRANSAKSIANGKUTSAMPAH_REKAPWAKTUREALISASIBERANGKATKANDANG),
      ),
      returnTargetTime: iso(fixDate(r.DETAILTRANSAKSIANGKUTSAMPAH_REKAPWAKTUTARGETKEMBALIKANDANG)),
      returnActualTime: iso(
        fixDate(r.DETAILTRANSAKSIANGKUTSAMPAH_REKAPWAKTUREALISASIKEMBALIKANDANG),
      ),
      notes: trimOrNull(r.DETAILTRANSAKSIANGKUTSAMPAH_KETERANGAN),
    }));
    const trips = finalTrips.map((r) => ({
      legacyId: r.TRAYEK_ID,
      assignmentLegacyId: r.DETAILTRANSAKSIANGKUTSAMPAH_ID,
      routeLegacyId: r.RUTE_ID != null && demoRouteIds.has(r.RUTE_ID) ? r.RUTE_ID : null,
      status: mapTripStatus(r.STATUSTRAYEK_ID),
      name: trimOrNull(r.TRAYEK_NAMA) ?? 'Trayek',
      targetTime: iso(fixDate(r.TRAYEK_WAKTUTARGET)),
      actualTime: iso(fixDate(r.TRAYEK_WAKTUREALISASI)),
      targetOdometer: clampNonNegative(r.TRAYEK_KMTARGET),
      actualOdometer: clampNonNegative(r.TRAYEK_KMREALISASI),
      tareWeight: clampNonNegative(r.TRAYEK_BERATKOSONGKENDARAAN),
      // gross ≥ tare (DB CHECK trip_gross_weight_gte_tare_weight).
      grossWeight: grossOrNullIfBelowTare(
        clampNonNegative(r.TRAYEK_BERATKOSONGKENDARAAN),
        nonNegativeOrNull(r.TRAYEK_BERATKOTORTIMBANGAN),
      ),
      netWeight: nonNegativeOrNull(r.TRAYEK_BERATBERSIHSAMPAH),
      wasteVolume: nonNegativeOrNull(r.TRAYEK_VOLUMESAMPAH),
      fuelRequestedLiters: nonNegativeOrNull(r.TRAYEK_JUMLAHISIBBMDIAJUKAN),
      // approved ≤ requested (DB CHECK trip_fuel_approved_lte_requested).
      fuelApprovedLiters: capApprovedFuel(
        nonNegativeOrNull(r.TRAYEK_JUMLAHISIBBMDIAJUKAN),
        nonNegativeOrNull(r.TRAYEK_JUMLAHISIBBMDISETUJUI),
      ),
      scheduledEntryAt: iso(fixDate(r.TRAYEK_WAKTUENTRIPENJADWALAN)),
      realizationEntryAt: iso(fixDate(r.TRAYEK_WAKTUENTRIREALISASI)),
      notes: trimOrNull(r.TRAYEK_KETERANGAN),
    }));

    writeFileSync(OUT, `${JSON.stringify({ year, days, hauls, assignments, trips }, null, 2)}\n`);
    process.stdout.write(
      `Demo transaction fixtures (year ${year}): ${days.length} days, ${hauls.length} hauls, ` +
        `${assignments.length} assignments, ${trips.length} trips → ${OUT}\n`,
    );
  } finally {
    await conn.end();
  }
}

void main();
