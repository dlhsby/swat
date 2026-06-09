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
 * vehicle is assigned to via {@link VehicleWasteSource}. Operationally a vehicle
 * serves a single source, so there is no double counting.
 *
 * Every read filters on `operationDate` (the monthly partition key) so Postgres
 * prunes to the relevant partitions. Thin Prisma wrapper — exercised by the
 * integration suite against a live DB, hence excluded from unit coverage.
 */
@Injectable()
export class RollupRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Σ net weight + distinct hauls of VERIFIED DISPOSAL trips weighed on `date`. */
  async aggregateDailyTonnage(date: Date): Promise<{ amount: bigint; haulCount: number }> {
    const [row] = await this.prisma.$queryRaw<Array<{ amount: bigint; haulCount: bigint }>>`
      SELECT COALESCE(SUM(t."netWeight"), 0)::bigint   AS "amount",
             COUNT(DISTINCT ha."haulId")::bigint        AS "haulCount"
      FROM "Trip" t
      JOIN "Route" r            ON r."id" = t."routeId"
      JOIN "HaulAssignment" ha  ON ha."operationDate" = t."operationDate"
                               AND ha."id" = t."haulAssignmentId"
      WHERE t."operationDate" = ${date}::date
        AND t."status" = 'VERIFIED'
        AND r."category" = 'DISPOSAL'
        AND t."netWeight" > 0
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

  /** Σ net weight + distinct hauls by waste source for VERIFIED DISPOSAL trips in `[from, to)`. */
  async aggregateMonthlyTonnageBySource(
    from: Date,
    to: Date,
  ): Promise<Array<{ wasteSourceId: number; totalNetWeight: bigint; haulCount: number }>> {
    const rows = await this.prisma.$queryRaw<
      Array<{ wasteSourceId: number; totalNetWeight: bigint; haulCount: bigint }>
    >`
      SELECT vws."wasteSourceId"                       AS "wasteSourceId",
             COALESCE(SUM(t."netWeight"), 0)::bigint   AS "totalNetWeight",
             COUNT(DISTINCT ha."haulId")::bigint        AS "haulCount"
      FROM "Trip" t
      JOIN "Route" r              ON r."id" = t."routeId"
      JOIN "HaulAssignment" ha    ON ha."operationDate" = t."operationDate"
                                 AND ha."id" = t."haulAssignmentId"
      JOIN "Haul" h               ON h."operationDate" = ha."operationDate"
                                 AND h."id" = ha."haulId"
      JOIN "VehicleWasteSource" vws ON vws."vehicleId" = h."vehicleId"
      WHERE t."operationDate" >= ${from}::date
        AND t."operationDate" <  ${to}::date
        AND t."status" = 'VERIFIED'
        AND r."category" = 'DISPOSAL'
        AND t."netWeight" > 0
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
  ): Promise<Array<{ siteId: number; totalNetWeight: bigint; haulCount: number }>> {
    const rows = await this.prisma.$queryRaw<
      Array<{ siteId: number; totalNetWeight: bigint; haulCount: bigint }>
    >`
      SELECT r."originSiteId"                          AS "siteId",
             COALESCE(SUM(t."netWeight"), 0)::bigint   AS "totalNetWeight",
             COUNT(DISTINCT ha."haulId")::bigint        AS "haulCount"
      FROM "Trip" t
      JOIN "Route" r            ON r."id" = t."routeId"
      JOIN "HaulAssignment" ha  ON ha."operationDate" = t."operationDate"
                               AND ha."id" = t."haulAssignmentId"
      WHERE t."operationDate" >= ${from}::date
        AND t."operationDate" <  ${to}::date
        AND t."status" = 'VERIFIED'
        AND r."category" = 'DISPOSAL'
        AND t."netWeight" > 0
      GROUP BY r."originSiteId"
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
  ): Promise<Array<{ routeId: number; tripCount: number }>> {
    const rows = await this.prisma.$queryRaw<Array<{ routeId: number; tripCount: bigint }>>`
      SELECT t."routeId"          AS "routeId",
             COUNT(*)::bigint     AS "tripCount"
      FROM "Trip" t
      WHERE t."operationDate" >= ${from}::date
        AND t."operationDate" <  ${to}::date
        AND t."status" IN ('DONE', 'VERIFIED')
        AND t."routeId" IS NOT NULL
      GROUP BY t."routeId"
    `;
    return rows.map((row) => ({ routeId: row.routeId, tripCount: Number(row.tripCount) }));
  }

  /** Σ approved/requested fuel litres by vehicle for realized REFUEL trips on `date`. */
  async aggregateDailyFuel(
    date: Date,
  ): Promise<
    Array<{ vehicleId: number; fuelApprovedLiters: string; fuelRequestedLiters: string }>
  > {
    return this.prisma.$queryRaw<
      Array<{ vehicleId: number; fuelApprovedLiters: string; fuelRequestedLiters: string }>
    >`
      SELECT h."vehicleId"                                    AS "vehicleId",
             COALESCE(SUM(t."fuelApprovedLiters"), 0)::text   AS "fuelApprovedLiters",
             COALESCE(SUM(t."fuelRequestedLiters"), 0)::text  AS "fuelRequestedLiters"
      FROM "Trip" t
      JOIN "Route" r            ON r."id" = t."routeId"
      JOIN "HaulAssignment" ha  ON ha."operationDate" = t."operationDate"
                               AND ha."id" = t."haulAssignmentId"
      JOIN "Haul" h             ON h."operationDate" = ha."operationDate"
                               AND h."id" = ha."haulId"
      WHERE t."operationDate" = ${date}::date
        AND r."category" = 'REFUEL'
        AND t."status" IN ('DONE', 'VERIFIED')
      GROUP BY h."vehicleId"
    `;
  }

  /**
   * Replace a month's worth of rows for one rollup table in a single transaction
   * (delete-then-insert), so a recompute is idempotent and self-healing — stale
   * groups that no longer aggregate to anything simply disappear.
   */
  async replaceMonthlyTonnageBySource(
    month: Date,
    rows: ReadonlyArray<{ wasteSourceId: number; totalNetWeight: bigint; haulCount: number }>,
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
    rows: ReadonlyArray<{ siteId: number; totalNetWeight: bigint; haulCount: number }>,
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
    rows: ReadonlyArray<{ routeId: number; tripCount: number }>,
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
      vehicleId: number;
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
