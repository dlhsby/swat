import { Injectable } from '@nestjs/common';
import { Prisma, type TripStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { type TripSummaryRow } from './monitoring.types';

/** A waste-source filter resolved from the Total/Dinas/Swasta toggle. */
export type OwnershipFilter = 'DINAS' | 'SWASTA' | undefined;

export interface DailyTonnageRecord {
  date: Date;
  totalTonnageKg: number;
  haulCount: number;
}
export interface TpaInboundRecord {
  date: Date;
  tpaInboundKg: number;
}

/**
 * Read-only aggregation queries for the monitoring API (Phase 2, Epic 2.2).
 *
 * Every query reads the rollup tables (never the partitioned trip history) so
 * dashboards stay sub-second across any range. Monthly cross-tabs are summed
 * over the months that intersect the requested date range. Thin Prisma wrapper —
 * exercised by the integration suite, excluded from unit coverage.
 */
@Injectable()
export class MonitoringRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Daily tonnage rows from the DailyTonnage rollup within `[from, to]`. */
  async dailyTonnage(from: Date, to: Date): Promise<DailyTonnageRecord[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{ date: Date; amount: bigint; haulCount: number }>
    >`
      SELECT "date", "amount", "haulCount"
      FROM "DailyTonnage"
      WHERE "date" >= ${from}::date AND "date" <= ${to}::date
      ORDER BY "date" ASC
    `;
    return rows.map((row) => ({
      date: row.date,
      totalTonnageKg: Number(row.amount),
      haulCount: row.haulCount,
    }));
  }

  /** Σ TpaInboundLog net weight per date within `[from, to]` (weighbridge truth). */
  async tpaInboundByDate(from: Date, to: Date): Promise<TpaInboundRecord[]> {
    const rows = await this.prisma.$queryRaw<Array<{ date: Date; tpaInboundKg: bigint }>>`
      SELECT "date", COALESCE(SUM("netWeight"), 0)::bigint AS "tpaInboundKg"
      FROM "TpaInboundLog"
      WHERE "date" >= ${from}::date AND "date" <= ${to}::date
      GROUP BY "date"
    `;
    return rows.map((row) => ({ date: row.date, tpaInboundKg: Number(row.tpaInboundKg) }));
  }

  /** Monthly tonnage totals (rolled up from DailyTonnage) within `[from, to]`. */
  async monthlyTonnage(
    from: Date,
    to: Date,
  ): Promise<Array<{ month: string; totalTonnageKg: number; haulCount: number }>> {
    const rows = await this.prisma.$queryRaw<Array<{ month: Date; total: bigint; hauls: bigint }>>`
      SELECT date_trunc('month', "date")::date AS "month",
             COALESCE(SUM("amount"), 0)::bigint AS "total",
             COALESCE(SUM("haulCount"), 0)::bigint AS "hauls"
      FROM "DailyTonnage"
      WHERE "date" >= ${from}::date AND "date" <= ${to}::date
      GROUP BY date_trunc('month', "date")
      ORDER BY "month" ASC
    `;
    return rows.map((row) => ({
      month: row.month.toISOString().slice(0, 7),
      totalTonnageKg: Number(row.total),
      haulCount: Number(row.hauls),
    }));
  }

  /** Tonnage by waste source over the months intersecting `[monthFrom, monthTo]`. */
  async tonnageBySource(
    monthFrom: Date,
    monthTo: Date,
    ownership: OwnershipFilter,
  ): Promise<
    Array<{
      wasteSourceId: number;
      code: string;
      name: string;
      ownership: string;
      totalTonnageKg: number;
      haulCount: number;
    }>
  > {
    const ownershipClause = ownership
      ? Prisma.sql`AND ws."ownership"::text = ${ownership}`
      : Prisma.empty;
    const rows = await this.prisma.$queryRaw<
      Array<{
        wasteSourceId: number;
        code: string;
        name: string;
        ownership: string;
        total: bigint;
        hauls: bigint;
      }>
    >`
      SELECT ws."id"                              AS "wasteSourceId",
             ws."code"                            AS "code",
             ws."name"                            AS "name",
             ws."ownership"::text                 AS "ownership",
             COALESCE(SUM(m."totalNetWeight"), 0)::bigint AS "total",
             COALESCE(SUM(m."haulCount"), 0)::bigint      AS "hauls"
      FROM "MonthlyTonnageBySource" m
      JOIN "WasteSource" ws ON ws."id" = m."wasteSourceId"
      WHERE m."month" >= ${monthFrom}::date AND m."month" <= ${monthTo}::date
        ${ownershipClause}
      GROUP BY ws."id", ws."code", ws."name", ws."ownership"
      ORDER BY "total" DESC
    `;
    return rows.map((row) => ({
      wasteSourceId: row.wasteSourceId,
      code: row.code,
      name: row.name,
      ownership: row.ownership,
      totalTonnageKg: Number(row.total),
      haulCount: Number(row.hauls),
    }));
  }

  /** Tonnage by pickup site (ranked desc) over months intersecting `[monthFrom, monthTo]`. */
  async tonnageBySite(
    monthFrom: Date,
    monthTo: Date,
  ): Promise<
    Array<{ siteId: number; name: string; type: string; totalTonnageKg: number; haulCount: number }>
  > {
    const rows = await this.prisma.$queryRaw<
      Array<{ siteId: number; name: string; type: string; total: bigint; hauls: bigint }>
    >`
      SELECT s."id"                               AS "siteId",
             s."name"                             AS "name",
             s."type"::text                       AS "type",
             COALESCE(SUM(m."totalNetWeight"), 0)::bigint AS "total",
             COALESCE(SUM(m."haulCount"), 0)::bigint      AS "hauls"
      FROM "MonthlyTonnageBySite" m
      JOIN "Site" s ON s."id" = m."siteId"
      WHERE m."month" >= ${monthFrom}::date AND m."month" <= ${monthTo}::date
      GROUP BY s."id", s."name", s."type"
      ORDER BY "total" DESC
    `;
    return rows.map((row) => ({
      siteId: row.siteId,
      name: row.name,
      type: row.type,
      totalTonnageKg: Number(row.total),
      haulCount: Number(row.hauls),
    }));
  }

  /** Per-vehicle fuel approved/requested summed over `[from, to]`. */
  async fuelConsumption(
    from: Date,
    to: Date,
    vehicleId: number | undefined,
  ): Promise<
    Array<{
      vehicleId: number;
      plateNumber: string;
      fuelApprovedLiters: number;
      fuelRequestedLiters: number;
    }>
  > {
    const vehicleClause = vehicleId ? Prisma.sql`AND f."vehicleId" = ${vehicleId}` : Prisma.empty;
    const rows = await this.prisma.$queryRaw<
      Array<{ vehicleId: number; plateNumber: string; approved: number; requested: number }>
    >`
      SELECT v."id"                                      AS "vehicleId",
             v."plateNumber"                             AS "plateNumber",
             COALESCE(SUM(f."fuelApprovedLiters"), 0)::float8  AS "approved",
             COALESCE(SUM(f."fuelRequestedLiters"), 0)::float8 AS "requested"
      FROM "DailyFuelByVehicle" f
      JOIN "Vehicle" v ON v."id" = f."vehicleId"
      WHERE f."date" >= ${from}::date AND f."date" <= ${to}::date
        ${vehicleClause}
      GROUP BY v."id", v."plateNumber"
      ORDER BY "approved" DESC
    `;
    return rows.map((row) => ({
      vehicleId: row.vehicleId,
      plateNumber: row.plateNumber,
      fuelApprovedLiters: row.approved,
      fuelRequestedLiters: row.requested,
    }));
  }

  /** Fuel totals by fuel type (via vehicle → model → fuel) over `[from, to]`. */
  async fuelByType(
    from: Date,
    to: Date,
  ): Promise<
    Array<{
      fuelId: number;
      fuelName: string;
      totalApprovedLiters: number;
      totalRequestedLiters: number;
    }>
  > {
    const rows = await this.prisma.$queryRaw<
      Array<{ fuelId: number; fuelName: string; approved: number; requested: number }>
    >`
      SELECT fu."id"                                     AS "fuelId",
             fu."name"                                   AS "fuelName",
             COALESCE(SUM(f."fuelApprovedLiters"), 0)::float8  AS "approved",
             COALESCE(SUM(f."fuelRequestedLiters"), 0)::float8 AS "requested"
      FROM "DailyFuelByVehicle" f
      JOIN "Vehicle" v       ON v."id" = f."vehicleId"
      JOIN "VehicleModel" vm ON vm."id" = v."modelId"
      JOIN "Fuel" fu         ON fu."id" = vm."fuelId"
      WHERE f."date" >= ${from}::date AND f."date" <= ${to}::date
      GROUP BY fu."id", fu."name"
      ORDER BY "approved" DESC
    `;
    return rows.map((row) => ({
      fuelId: row.fuelId,
      fuelName: row.fuelName,
      totalApprovedLiters: row.approved,
      totalRequestedLiters: row.requested,
    }));
  }

  /** Active routes (≥1 trip) over months intersecting `[monthFrom, monthTo]`, ranked desc. */
  async routesActive(
    monthFrom: Date,
    monthTo: Date,
  ): Promise<
    Array<{
      routeId: number;
      category: string;
      originSiteName: string;
      destinationSiteName: string;
      distanceKm: number;
      tripCount: number;
    }>
  > {
    const rows = await this.prisma.$queryRaw<
      Array<{
        routeId: number;
        category: string;
        originSiteName: string;
        destinationSiteName: string;
        distanceKm: number;
        trips: bigint;
      }>
    >`
      SELECT r."id"                          AS "routeId",
             r."category"::text              AS "category",
             origin."name"                   AS "originSiteName",
             dest."name"                     AS "destinationSiteName",
             r."distanceKm"                  AS "distanceKm",
             COALESCE(SUM(m."tripCount"), 0)::bigint AS "trips"
      FROM "MonthlyRouteActivity" m
      JOIN "Route" r      ON r."id" = m."routeId"
      JOIN "Site" origin  ON origin."id" = r."originSiteId"
      JOIN "Site" dest    ON dest."id" = r."destinationSiteId"
      WHERE m."month" >= ${monthFrom}::date AND m."month" <= ${monthTo}::date
      GROUP BY r."id", r."category", origin."name", dest."name", r."distanceKm"
      HAVING SUM(m."tripCount") > 0
      ORDER BY "trips" DESC
    `;
    return rows.map((row) => ({
      routeId: row.routeId,
      category: row.category,
      originSiteName: row.originSiteName,
      destinationSiteName: row.destinationSiteName,
      distanceKm: row.distanceKm,
      tripCount: Number(row.trips),
    }));
  }

  /**
   * Distinct vehicles that actually operated (≥1 realized trip) within `[from, to]`.
   * Mirrors the spec's `COUNT(DISTINCT Haul.vehicleId)` definition of "vehicles in
   * operation" — a vehicle that hauled but never refuelled is still counted, which
   * the fuel rollup alone would miss. Reads the partitioned Trip table but is
   * date-pruned to the window, and only feeds the cached KPI overview.
   */
  async countOperatingVehicles(from: Date, to: Date): Promise<number> {
    const [row] = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT h."vehicleId")::bigint AS "count"
      FROM "Trip" t
      JOIN "HaulAssignment" ha ON ha."operationDate" = t."operationDate"
                              AND ha."id" = t."haulAssignmentId"
      JOIN "Haul" h            ON h."operationDate" = ha."operationDate"
                              AND h."id" = ha."haulId"
      WHERE t."operationDate" >= ${from}::date AND t."operationDate" <= ${to}::date
        AND t."status" IN ('DONE', 'VERIFIED')
    `;
    return Number(row?.count ?? 0n);
  }

  /** Levy totals by category within `[from, to]` (integer IDR). */
  async levySummary(
    from: Date,
    to: Date,
  ): Promise<Array<{ categoryName: string; totalAmount: number; transactionCount: number }>> {
    const rows = await this.prisma.$queryRaw<
      Array<{ categoryName: string; total: bigint; count: bigint }>
    >`
      SELECT "categoryName"                  AS "categoryName",
             COALESCE(SUM("amount"), 0)::bigint AS "total",
             COUNT(*)::bigint                AS "count"
      FROM "Levy"
      WHERE "date" >= ${from}::date AND "date" <= ${to}::date
      GROUP BY "categoryName"
      ORDER BY "total" DESC
    `;
    return rows.map((row) => ({
      categoryName: row.categoryName,
      totalAmount: Number(row.total),
      transactionCount: Number(row.count),
    }));
  }

  /** Paginated trip rows from the partitioned Trip table, pruned by operationDate. */
  async tripSummary(args: {
    from: Date;
    to: Date;
    status: TripStatus | undefined;
    routeId: number | undefined;
    page: number;
    limit: number;
  }): Promise<{ rows: TripSummaryRow[]; total: number }> {
    const where: Prisma.TripWhereInput = {
      operationDate: { gte: args.from, lte: args.to },
      ...(args.status ? { status: args.status } : {}),
      ...(args.routeId ? { routeId: args.routeId } : {}),
    };
    const [records, total] = await Promise.all([
      this.prisma.trip.findMany({
        where,
        orderBy: [{ operationDate: 'desc' }, { id: 'desc' }],
        skip: (args.page - 1) * args.limit,
        take: args.limit,
        select: {
          id: true,
          operationDate: true,
          name: true,
          status: true,
          routeId: true,
          netWeight: true,
          haulAssignment: {
            select: { haul: { select: { vehicle: { select: { plateNumber: true } } } } },
          },
        },
      }),
      this.prisma.trip.count({ where }),
    ]);
    const rows = records.map((trip) => ({
      id: trip.id.toString(),
      operationDate: trip.operationDate.toISOString().slice(0, 10),
      name: trip.name,
      status: trip.status,
      routeId: trip.routeId,
      netWeightKg: trip.netWeight,
      plateNumber: trip.haulAssignment.haul.vehicle.plateNumber,
    }));
    return { rows, total };
  }
}
