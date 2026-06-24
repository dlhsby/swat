import { Injectable } from '@nestjs/common';

import { formatDateOnly, parseDateOnly, startOfMonth } from '../../common/dates';
import { type PaginationMeta } from '../../common/types/api-response';
import { CacheService } from '../cache/cache.service';

import { type DateRangeQueryDto } from './dto/date-range.query.dto';
import { type FuelConsumptionQueryDto } from './dto/fuel.query.dto';
import { type TonnageBySourceQueryDto } from './dto/tonnage-source.query.dto';
import { type TripSummaryQueryDto } from './dto/trip-summary.query.dto';
import { averagePerTransaction, fuelVariance, reconciliationStatus } from './monitoring.math';
import { MonitoringRepository } from './monitoring.repository';
import {
  type DailyTonnageRow,
  type FuelByTypeRow,
  type FuelConsumptionRow,
  type KpiOverview,
  type LevyByCategoryMonthRow,
  type LevySummaryRow,
  type LevyTrendRow,
  type MonthlyTonnageRow,
  type RouteActivityRow,
  type RouteMapResponse,
  type TonnageBySiteRow,
  type TonnageBySourceRow,
  type TripSummaryRow,
} from './monitoring.types';

/** Cache TTLs (seconds): dashboards 15 min, levy 1 h (less volatile), trips 5 min. */
const TTL_DEFAULT = 15 * 60;
const TTL_LEVY = 60 * 60;
const TTL_TRIPS = 5 * 60;

/**
 * Monitoring read API (Phase 2, Epic 2.2). Serves the dashboards entirely from
 * the rollup tables, wrapped in the shared Redis {@link CacheService} so any date
 * range stays sub-second. Cache keys are namespaced by endpoint + filters and are
 * invalidated per-date on trip mutations (T-216).
 */
@Injectable()
export class MonitoringService {
  constructor(
    private readonly repo: MonitoringRepository,
    private readonly cache: CacheService,
  ) {}

  async tonnage5Day(query: DateRangeQueryDto): Promise<DailyTonnageRow[]> {
    const { from, to } = this.range(query);
    return this.cached(this.key('tonnage-5day', query), TTL_DEFAULT, async () => {
      const [daily, tpa] = await Promise.all([
        this.repo.dailyTonnage(from, to),
        this.repo.tpaInboundByDate(from, to),
      ]);
      const tpaByDate = new Map(tpa.map((row) => [formatDateOnly(row.date), row.tpaInboundKg]));
      return daily.map((row) => {
        const dateStr = formatDateOnly(row.date);
        const tpaInboundKg = tpaByDate.has(dateStr) ? tpaByDate.get(dateStr)! : null;
        return {
          date: dateStr,
          totalTonnageKg: row.totalTonnageKg,
          haulCount: row.haulCount,
          tpaInboundKg,
          reconciliationStatus: reconciliationStatus(row.totalTonnageKg, tpaInboundKg),
        };
      });
    });
  }

  async tonnageMonthly(query: DateRangeQueryDto): Promise<MonthlyTonnageRow[]> {
    const { from, to } = this.range(query);
    return this.cached(this.key('tonnage-monthly', query), TTL_DEFAULT, () =>
      this.repo.monthlyTonnage(from, to),
    );
  }

  async tonnageBySource(query: TonnageBySourceQueryDto): Promise<TonnageBySourceRow[]> {
    const { monthFrom, monthTo } = this.monthRange(query);
    return this.cached(
      this.key('tonnage-by-source', query, query.group ?? 'ALL'),
      TTL_DEFAULT,
      () => this.repo.tonnageBySource(monthFrom, monthTo, query.group),
    );
  }

  async tonnageBySite(query: DateRangeQueryDto): Promise<TonnageBySiteRow[]> {
    const { monthFrom, monthTo } = this.monthRange(query);
    return this.cached(this.key('tonnage-by-site', query), TTL_DEFAULT, () =>
      this.repo.tonnageBySite(monthFrom, monthTo),
    );
  }

  async fuelConsumption(query: FuelConsumptionQueryDto): Promise<FuelConsumptionRow[]> {
    const { from, to } = this.range(query);
    return this.cached(
      this.key('fuel-consumption', query, query.vehicleId ?? 'ALL'),
      TTL_DEFAULT,
      async () => {
        const rows = await this.repo.fuelConsumption(from, to, query.vehicleId);
        return rows.map((row) => ({
          ...row,
          ...fuelVariance(row.fuelApprovedLiters, row.fuelRequestedLiters),
        }));
      },
    );
  }

  async fuelByType(query: DateRangeQueryDto): Promise<FuelByTypeRow[]> {
    const { from, to } = this.range(query);
    return this.cached(this.key('fuel-by-type', query), TTL_DEFAULT, () =>
      this.repo.fuelByType(from, to),
    );
  }

  async routesActive(query: DateRangeQueryDto): Promise<RouteActivityRow[]> {
    const { monthFrom, monthTo } = this.monthRange(query);
    return this.cached(this.key('routes-active', query), TTL_DEFAULT, () =>
      this.repo.routesActive(monthFrom, monthTo),
    );
  }

  async levySummary(query: DateRangeQueryDto): Promise<LevySummaryRow[]> {
    const { from, to } = this.range(query);
    return this.cached(this.key('levy-summary', query), TTL_LEVY, async () => {
      const rows = await this.repo.levySummary(from, to);
      return rows.map((row) => ({
        ...row,
        avgPerTransaction: averagePerTransaction(row.totalAmount, row.transactionCount),
      }));
    });
  }

  async levyTrend(query: DateRangeQueryDto): Promise<LevyTrendRow[]> {
    const { from, to } = this.range(query);
    return this.cached(this.key('levy-trend', query), TTL_LEVY, () =>
      this.repo.levyTrend(from, to),
    );
  }

  async levyByCategoryMonth(query: DateRangeQueryDto): Promise<LevyByCategoryMonthRow[]> {
    const { from, to } = this.range(query);
    return this.cached(this.key('levy-by-category-month', query), TTL_LEVY, () =>
      this.repo.levyByCategoryMonth(from, to),
    );
  }

  async tripSummary(query: TripSummaryQueryDto): Promise<{
    data: TripSummaryRow[];
    meta: PaginationMeta;
  }> {
    const from = parseDateOnly(query.dateFrom);
    const to = parseDateOnly(query.dateTo);
    const cacheKey = this.key(
      'trip-summary',
      query,
      `${query.status ?? 'ALL'}:${query.routeId ?? 'ALL'}:${query.vehicleId ?? 'ALL'}:${query.driverId ?? 'ALL'}:${query.page}:${query.limit}`,
    );
    return this.cached(cacheKey, TTL_TRIPS, async () => {
      const { rows, total } = await this.repo.tripSummary({
        from,
        to,
        status: query.status,
        routeId: query.routeId,
        vehicleId: query.vehicleId,
        driverId: query.driverId,
        page: query.page,
        limit: query.limit,
      });
      return { data: rows, meta: { total, page: query.page, limit: query.limit } };
    });
  }

  async routeMap(query: DateRangeQueryDto): Promise<RouteMapResponse> {
    const { monthFrom, monthTo } = this.monthRange(query);
    return this.cached(this.key('route-map', query), TTL_DEFAULT, () =>
      this.repo.routeMap(monthFrom, monthTo),
    );
  }

  async kpiOverview(query: DateRangeQueryDto): Promise<KpiOverview> {
    const { from, to } = this.range(query);
    const { monthFrom, monthTo } = this.monthRange(query);
    return this.cached(this.key('kpi-overview', query), TTL_DEFAULT, async () => {
      const [daily, fuel, routes, vehiclesInOperation] = await Promise.all([
        this.repo.dailyTonnage(from, to),
        this.repo.fuelConsumption(from, to, undefined),
        this.repo.routesActive(monthFrom, monthTo),
        this.repo.countOperatingVehicles(from, to),
      ]);
      return {
        totalTonnageKg: daily.reduce((sum, row) => sum + row.totalTonnageKg, 0),
        haulsCompleted: daily.reduce((sum, row) => sum + row.haulCount, 0),
        fuelApprovedLiters: fuel.reduce((sum, row) => sum + row.fuelApprovedLiters, 0),
        fuelRequestedLiters: fuel.reduce((sum, row) => sum + row.fuelRequestedLiters, 0),
        vehiclesInOperation,
        tripsRecorded: routes.reduce((sum, row) => sum + row.tripCount, 0),
        routesActive: routes.length,
      };
    });
  }

  /** Resolve the inclusive day window from a validated query. */
  private range(query: DateRangeQueryDto): { from: Date; to: Date } {
    return { from: parseDateOnly(query.dateFrom), to: parseDateOnly(query.dateTo) };
  }

  /** Resolve the month window (first-of-month anchors) the monthly rollups key on. */
  private monthRange(query: DateRangeQueryDto): { monthFrom: Date; monthTo: Date } {
    return {
      monthFrom: startOfMonth(parseDateOnly(query.dateFrom)),
      monthTo: startOfMonth(parseDateOnly(query.dateTo)),
    };
  }

  private key(endpoint: string, range: DateRangeQueryDto, extra: string | number = ''): string {
    const suffix = extra === '' ? '' : `:${extra}`;
    return `cache:monitoring:${endpoint}:${range.dateFrom}:${range.dateTo}${suffix}`;
  }

  private async cached<T>(key: string, ttl: number, producer: () => Promise<T>): Promise<T> {
    const hit = await this.cache.get<T>(key);
    if (hit !== null && hit !== undefined) {
      return hit;
    }
    const fresh = await producer();
    await this.cache.set(key, fresh, ttl);
    return fresh;
  }
}
