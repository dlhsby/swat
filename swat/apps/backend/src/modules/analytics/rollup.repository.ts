import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { formatDateOnly } from '../../common/dates';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Raw aggregation queries + rollup writes (Phase 2, T-202/T-203).
 *
 * Tonnage is attributed to a waste source through the **vehicle**, mirroring the
 * legacy SWAT model (`trayek → kendaraan → kategorisumbersampahkendaraan →
 * kategorisumbersampah`): a trip's net weight belongs to the source(s) its
 * vehicle is assigned to via {@link VehicleWasteSource}.
 *
 * KNOWN LIMITATION (legacy parity — improve later): the mapping is many-to-many
 * (≈1.5% of legacy vehicles serve 2–5 sources), so the by-source split is
 * inherently ambiguous for those vehicles — the data never records which source
 * a given trip actually served. We pick one source per vehicle (`MIN`) below so
 * the per-source totals still sum to the grand total (the legacy join instead
 * double-counted them). Exact attribution would require capturing the source on
 * the trip itself (`Trip.wasteSourceId`, set at record time). Deferred — see the
 * monitoring spec's "Known limitations".
 *
 * Every read filters on `operationDate` (the monthly partition key) so Postgres
 * prunes to the relevant partitions. Thin Prisma wrapper — exercised by the
 * integration suite against a live DB, hence excluded from unit coverage.
 */
@Injectable()
export class RollupRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Σ net weight + distinct hauls of realized (DONE/VERIFIED) DISPOSAL trips on `date`. */
  async aggregateDailyTonnage(date: Date): Promise<{ amount: bigint; haulCount: number }> {
    const [row] = await this.prisma.$queryRaw<Array<{ amount: bigint; haulCount: bigint }>>`
      SELECT COALESCE(SUM(t."net_weight"), 0)::bigint   AS "amount",
             COUNT(DISTINCT ha."haul_id")::bigint        AS "haulCount"
      FROM "trip" t
      JOIN "route" r            ON r."id" = t."route_id"
      JOIN "haul_assignment" ha  ON ha."operation_date" = t."operation_date"
                               AND ha."id" = t."haul_assignment_id"
      WHERE t."operation_date" = ${date}::date
        AND t."status" IN ('DONE', 'VERIFIED')
        AND r."category" = 'DISPOSAL'
        AND t."net_weight" > 0
    `;
    return { amount: row?.amount ?? 0n, haulCount: Number(row?.haulCount ?? 0n) };
  }

  async upsertDailyTonnage(date: Date, amount: bigint, haulCount: number): Promise<void> {
    await this.prisma.dailyTonnage.upsert({
      where: { date },
      create: { date, amount, haulCount },
      update: { amount, haulCount },
    });
  }

  /** Σ net weight + distinct hauls by waste source for DONE/VERIFIED DISPOSAL trips in `[from, to)`. */
  async aggregateMonthlyTonnageBySource(
    from: Date,
    to: Date,
  ): Promise<Array<{ wasteSourceId: string; totalNetWeight: bigint; haulCount: number }>> {
    const rows = await this.prisma.$queryRaw<
      Array<{ wasteSourceId: string; totalNetWeight: bigint; haulCount: bigint }>
    >`
      SELECT vws."wasteSourceId"                        AS "wasteSourceId",
             COALESCE(SUM(t."net_weight"), 0)::bigint   AS "totalNetWeight",
             COUNT(DISTINCT ha."haul_id")::bigint        AS "haulCount"
      FROM "trip" t
      JOIN "route" r              ON r."id" = t."route_id"
      JOIN "haul_assignment" ha    ON ha."operation_date" = t."operation_date"
                                 AND ha."id" = t."haul_assignment_id"
      JOIN "haul" h               ON h."operation_date" = ha."operation_date"
                                 AND h."id" = ha."haul_id"
      -- Legacy-parity heuristic (see the class doc's KNOWN LIMITATION): pick one
      -- source per vehicle (MIN) so a multi-source vehicle can't multiply its net
      -- weight across its sources. Conservation holds, but a multi-source vehicle
      -- is mis-attributed to its lowest-id source — exact attribution needs a
      -- per-trip source. Improve later.
      JOIN (
        -- uuid has no MIN aggregate in Postgres → pick deterministically via text.
        SELECT "vehicle_id", MIN("waste_source_id"::text)::uuid AS "wasteSourceId"
        FROM "vehicle_waste_source"
        GROUP BY "vehicle_id"
      ) vws ON vws."vehicle_id" = h."vehicle_id"
      WHERE t."operation_date" >= ${from}::date
        AND t."operation_date" <  ${to}::date
        AND t."status" IN ('DONE', 'VERIFIED')
        AND r."category" = 'DISPOSAL'
        AND t."net_weight" > 0
      GROUP BY vws."wasteSourceId"
    `;
    return rows.map((row) => ({
      wasteSourceId: row.wasteSourceId,
      totalNetWeight: row.totalNetWeight,
      haulCount: Number(row.haulCount),
    }));
  }

  /** Σ net weight + distinct hauls by pickup site (Route.originSiteId) in `[from, to)`. */
  async aggregateMonthlyTonnageBySite(
    from: Date,
    to: Date,
  ): Promise<Array<{ siteId: string; totalNetWeight: bigint; haulCount: number }>> {
    const rows = await this.prisma.$queryRaw<
      Array<{ siteId: string; totalNetWeight: bigint; haulCount: bigint }>
    >`
      SELECT r."origin_site_id"                        AS "siteId",
             COALESCE(SUM(t."net_weight"), 0)::bigint   AS "totalNetWeight",
             COUNT(DISTINCT ha."haul_id")::bigint        AS "haulCount"
      FROM "trip" t
      JOIN "route" r            ON r."id" = t."route_id"
      JOIN "haul_assignment" ha  ON ha."operation_date" = t."operation_date"
                               AND ha."id" = t."haul_assignment_id"
      WHERE t."operation_date" >= ${from}::date
        AND t."operation_date" <  ${to}::date
        AND t."status" IN ('DONE', 'VERIFIED')
        AND r."category" = 'DISPOSAL'
        AND t."net_weight" > 0
      GROUP BY r."origin_site_id"
    `;
    return rows.map((row) => ({
      siteId: row.siteId,
      totalNetWeight: row.totalNetWeight,
      haulCount: Number(row.haulCount),
    }));
  }

  /** Trip counts (ritase) by route for realized trips in `[from, to)`. */
  async aggregateMonthlyRouteActivity(
    from: Date,
    to: Date,
  ): Promise<Array<{ routeId: string; tripCount: number }>> {
    const rows = await this.prisma.$queryRaw<Array<{ routeId: string; tripCount: bigint }>>`
      SELECT t."route_id"         AS "routeId",
             COUNT(*)::bigint     AS "tripCount"
      FROM "trip" t
      WHERE t."operation_date" >= ${from}::date
        AND t."operation_date" <  ${to}::date
        AND t."status" IN ('DONE', 'VERIFIED')
        AND t."route_id" IS NOT NULL
      GROUP BY t."route_id"
    `;
    return rows.map((row) => ({ routeId: row.routeId, tripCount: Number(row.tripCount) }));
  }

  /** Σ approved/requested fuel litres by vehicle for realized REFUEL trips on `date`. */
  async aggregateDailyFuel(
    date: Date,
  ): Promise<
    Array<{ vehicleId: string; fuelApprovedLiters: string; fuelRequestedLiters: string }>
  > {
    return this.prisma.$queryRaw<
      Array<{ vehicleId: string; fuelApprovedLiters: string; fuelRequestedLiters: string }>
    >`
      SELECT h."vehicle_id"                                   AS "vehicleId",
             COALESCE(SUM(t."fuel_approved_liters"), 0)::text AS "fuelApprovedLiters",
             COALESCE(SUM(t."fuel_requested_liters"), 0)::text AS "fuelRequestedLiters"
      FROM "trip" t
      JOIN "route" r            ON r."id" = t."route_id"
      JOIN "haul_assignment" ha  ON ha."operation_date" = t."operation_date"
                               AND ha."id" = t."haul_assignment_id"
      JOIN "haul" h             ON h."operation_date" = ha."operation_date"
                               AND h."id" = ha."haul_id"
      WHERE t."operation_date" = ${date}::date
        AND r."category" = 'REFUEL'
        AND t."status" IN ('DONE', 'VERIFIED')
      GROUP BY h."vehicle_id"
    `;
  }

  /**
   * Replace a month's worth of rows for one rollup table in a single transaction
   * (delete-then-insert), so a recompute is idempotent and self-healing — stale
   * groups that no longer aggregate to anything simply disappear.
   */
  async replaceMonthlyTonnageBySource(
    month: Date,
    rows: ReadonlyArray<{ wasteSourceId: string; totalNetWeight: bigint; haulCount: number }>,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.monthlyTonnageBySource.deleteMany({ where: { month } }),
      this.prisma.monthlyTonnageBySource.createMany({
        data: rows.map((row) => ({ month, ...row })),
      }),
    ]);
  }

  async replaceMonthlyTonnageBySite(
    month: Date,
    rows: ReadonlyArray<{ siteId: string; totalNetWeight: bigint; haulCount: number }>,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.monthlyTonnageBySite.deleteMany({ where: { month } }),
      this.prisma.monthlyTonnageBySite.createMany({
        data: rows.map((row) => ({ month, ...row })),
      }),
    ]);
  }

  async replaceMonthlyRouteActivity(
    month: Date,
    rows: ReadonlyArray<{ routeId: string; tripCount: number }>,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.monthlyRouteActivity.deleteMany({ where: { month } }),
      this.prisma.monthlyRouteActivity.createMany({
        data: rows.map((row) => ({ month, ...row })),
      }),
    ]);
  }

  async replaceDailyFuel(
    date: Date,
    rows: ReadonlyArray<{
      vehicleId: string;
      fuelApprovedLiters: string;
      fuelRequestedLiters: string;
    }>,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.dailyFuelByVehicle.deleteMany({ where: { date } }),
      this.prisma.dailyFuelByVehicle.createMany({
        data: rows.map((row) => ({
          date,
          vehicleId: row.vehicleId,
          fuelApprovedLiters: new Prisma.Decimal(row.fuelApprovedLiters),
          fuelRequestedLiters: new Prisma.Decimal(row.fuelRequestedLiters),
        })),
      }),
    ]);
  }

  /** Label used by job logs. */
  describeDate(date: Date): string {
    return formatDateOnly(date);
  }
}
