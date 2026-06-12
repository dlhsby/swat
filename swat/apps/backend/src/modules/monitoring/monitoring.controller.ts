import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { type PaginationMeta } from '../../common/types/api-response';

import { DateRangeQueryDto } from './dto/date-range.query.dto';
import { FuelConsumptionQueryDto } from './dto/fuel.query.dto';
import { TonnageBySourceQueryDto } from './dto/tonnage-source.query.dto';
import { TripSummaryQueryDto } from './dto/trip-summary.query.dto';
import { MonitoringService } from './monitoring.service';
import {
  type DailyTonnageRow,
  type FuelByTypeRow,
  type FuelConsumptionRow,
  type KpiOverview,
  type LevySummaryRow,
  type LevyTrendRow,
  type MonthlyTonnageRow,
  type RouteActivityRow,
  type TonnageBySiteRow,
  type TonnageBySourceRow,
  type TripSummaryRow,
} from './monitoring.types';

/**
 * Read-only monitoring API (Phase 2, Epic 2.2). Every endpoint is gated by
 * `monitoring:read`, takes an inclusive `dateFrom`/`dateTo` window, and is served
 * from the rollup tables behind the Redis cache.
 */
@ApiTags('monitoring')
@Controller('monitoring')
@RequirePermissions('monitoring:read')
export class MonitoringController {
  constructor(private readonly monitoring: MonitoringService) {}

  @Get('tonnage-5day')
  @ApiOperation({ summary: 'Daily tonnage with TPA reconciliation status' })
  tonnage5Day(@Query() query: DateRangeQueryDto): Promise<DailyTonnageRow[]> {
    return this.monitoring.tonnage5Day(query);
  }

  @Get('tonnage-monthly')
  @ApiOperation({ summary: 'Monthly tonnage totals' })
  tonnageMonthly(@Query() query: DateRangeQueryDto): Promise<MonthlyTonnageRow[]> {
    return this.monitoring.tonnageMonthly(query);
  }

  @Get('tonnage-by-source')
  @ApiOperation({ summary: 'Tonnage by waste source (Total/Dinas/Swasta)' })
  tonnageBySource(@Query() query: TonnageBySourceQueryDto): Promise<TonnageBySourceRow[]> {
    return this.monitoring.tonnageBySource(query);
  }

  @Get('tonnage-by-site')
  @ApiOperation({ summary: 'Tonnage by pickup site, ranked' })
  tonnageBySite(@Query() query: DateRangeQueryDto): Promise<TonnageBySiteRow[]> {
    return this.monitoring.tonnageBySite(query);
  }

  @Get('fuel-consumption')
  @ApiOperation({ summary: 'Fuel requested vs approved per vehicle, with variance' })
  fuelConsumption(@Query() query: FuelConsumptionQueryDto): Promise<FuelConsumptionRow[]> {
    return this.monitoring.fuelConsumption(query);
  }

  @Get('fuel-by-type')
  @ApiOperation({ summary: 'Fuel totals by fuel type' })
  fuelByType(@Query() query: DateRangeQueryDto): Promise<FuelByTypeRow[]> {
    return this.monitoring.fuelByType(query);
  }

  @Get('routes-active')
  @ApiOperation({ summary: 'Routes with at least one trip, ranked by frequency' })
  routesActive(@Query() query: DateRangeQueryDto): Promise<RouteActivityRow[]> {
    return this.monitoring.routesActive(query);
  }

  @Get('trip-summary')
  @ApiOperation({ summary: 'Paginated trip list, filterable by status/route' })
  tripSummary(
    @Query() query: TripSummaryQueryDto,
  ): Promise<{ data: TripSummaryRow[]; meta: PaginationMeta }> {
    return this.monitoring.tripSummary(query);
  }

  @Get('kpi-overview')
  @ApiOperation({ summary: 'Combined KPI tiles for the monitoring header' })
  kpiOverview(@Query() query: DateRangeQueryDto): Promise<KpiOverview> {
    return this.monitoring.kpiOverview(query);
  }

  @Get('levy-summary')
  @ApiOperation({ summary: 'Levy (retribusi) totals by category' })
  levySummary(@Query() query: DateRangeQueryDto): Promise<LevySummaryRow[]> {
    return this.monitoring.levySummary(query);
  }

  @Get('levy-trend')
  @ApiOperation({ summary: 'Levy (retribusi) totals per calendar month' })
  levyTrend(@Query() query: DateRangeQueryDto): Promise<LevyTrendRow[]> {
    return this.monitoring.levyTrend(query);
  }
}
