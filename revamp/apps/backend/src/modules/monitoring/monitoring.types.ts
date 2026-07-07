/**
 * Monitoring API response shapes (Phase 2, Epic 2.2). All tonnage is kilograms,
 * fuel is litres, levy is integer IDR. Served from the rollup tables + Redis
 * cache so any date range — including archived years — stays under a second.
 */

export type FuelVarianceFlag = 'OK' | 'RED';

export interface DailyTonnageRow {
  readonly date: string;
  readonly totalTonnageKg: number;
  readonly haulCount: number;
}

export interface MonthlyTonnageRow {
  readonly month: string;
  readonly totalTonnageKg: number;
  readonly haulCount: number;
}

export interface TonnageBySourceRow {
  readonly wasteSourceId: string;
  readonly code: string;
  readonly name: string;
  readonly totalTonnageKg: number;
  readonly haulCount: number;
}

export interface TonnageBySiteRow {
  readonly siteId: string;
  readonly name: string;
  readonly type: string;
  readonly totalTonnageKg: number;
  readonly haulCount: number;
}

export interface FuelConsumptionRow {
  readonly vehicleId: string;
  readonly plateNumber: string;
  readonly fuelApprovedLiters: number;
  readonly fuelRequestedLiters: number;
  readonly variancePercent: number;
  readonly flag: FuelVarianceFlag;
}

export interface FuelByTypeRow {
  readonly fuelId: string;
  readonly fuelName: string;
  readonly totalApprovedLiters: number;
  readonly totalRequestedLiters: number;
}

export interface RouteActivityRow {
  readonly routeId: string;
  readonly category: string;
  readonly originSiteName: string;
  readonly destinationSiteName: string;
  readonly distanceKm: number;
  readonly tripCount: number;
}

export interface TripSummaryRow {
  readonly id: string;
  readonly operationDate: string;
  readonly name: string;
  readonly status: string;
  readonly routeId: string | null;
  /** `Origin → Destination` site names, or null when the trip has no route. */
  readonly routeName: string | null;
  readonly netWeightKg: number | null;
  readonly plateNumber: string;
  /** Crew: the assigned driver's name. */
  readonly driverName: string;
  readonly targetOdometer: number;
  readonly actualOdometer: number;
  /** ISO timestamps (target vs realisasi), or null when unset. */
  readonly targetTime: string | null;
  readonly actualTime: string | null;
  readonly fuelApprovedLiters: number | null;
  readonly fuelRequestedLiters: number | null;
}

/** A site with usable coordinates, for the Pengangkutan map markers. */
export interface RouteMapSite {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly latitude: number;
  readonly longitude: number;
}

/** An active route edge (≥1 trip) linking two sites, weighted by trip count. */
export interface RouteMapEdge {
  readonly routeId: string;
  readonly category: string;
  readonly originSiteId: string;
  readonly destinationSiteId: string;
  readonly tripCount: number;
}

/** Map payload: distinct coordinate-bearing sites + the active route edges between them. */
export interface RouteMapResponse {
  readonly sites: RouteMapSite[];
  readonly edges: RouteMapEdge[];
}

export interface LevySummaryRow {
  readonly categoryName: string;
  readonly totalAmount: number;
  readonly transactionCount: number;
  readonly avgPerTransaction: number;
}

export interface LevyTrendRow {
  readonly month: string;
  readonly totalAmount: number;
}

export interface LevyByCategoryMonthRow {
  readonly categoryName: string;
  readonly month: string;
  readonly totalAmount: number;
}

/** One GPS activity milestone in a vehicle's day (Phase 7 drill-down timeline). */
export interface DayActivityEventRow {
  readonly id: string;
  readonly kind: string;
  readonly source: string;
  readonly siteId: string | null;
  readonly siteType: string | null;
  readonly tripId: string | null;
  readonly occurredAt: string;
}

export interface KpiOverview {
  readonly totalTonnageKg: number;
  readonly haulsCompleted: number;
  readonly fuelApprovedLiters: number;
  readonly fuelRequestedLiters: number;
  readonly vehiclesInOperation: number;
  readonly tripsRecorded: number;
  readonly routesActive: number;
}

/**
 * The four dashboard stat-card values for one WIB operation day, computed from the
 * live records (not the transaction-day tree): scheduled vehicles from `Haul`,
 * disposal trip count + tonnage from weighed DISPOSAL trips, approved fuel from
 * REFUEL trips.
 */
export interface DayStats {
  readonly scheduledVehicles: number;
  readonly disposalTripCount: number;
  readonly disposalTonnageKg: number;
  readonly fuelApprovedLiters: number;
}

/**
 * One time-bucket of disposal tonnage, split by where the load went. A trip counts
 * as gasification when `disposal_destination = GASIFICATION` OR its notes contain
 * `GASIFIKASI` (the fallback for rows the PTSI match hasn't flagged yet).
 */
export interface TonnageDestinationRow {
  /** Bucket start as `YYYY-MM-DD` (day/month/year truncated). */
  readonly bucket: string;
  readonly gasificationKg: number;
  readonly landfillKg: number;
  readonly totalKg: number;
}

/** Disposal tonnage + rit (disposal-trip count) for one pickup site (TPS). */
export interface TonnageByTpsRow {
  readonly siteId: string;
  readonly name: string;
  readonly totalTonnageKg: number;
  /** rit = number of disposal trips (NOT distinct hauls). */
  readonly rit: number;
}

/** Disposal rit for one (vehicle, pickup-site) pair — a vehicle serving 2 TPS yields 2 rows. */
export interface TonnageByVehicleRow {
  readonly vehicleId: string;
  readonly plateNumber: string;
  readonly siteId: string;
  readonly siteName: string;
  readonly totalTonnageKg: number;
  readonly rit: number;
}

/** One time-bucket of fuel requested vs approved (REFUEL trips). */
export interface FuelTrendRow {
  readonly bucket: string;
  readonly approvedLiters: number;
  readonly requestedLiters: number;
}

/** One refuel event (REFUEL trip) for the BBM detail table. */
export interface FuelDetailRow {
  readonly tripId: string;
  readonly operationDate: string;
  readonly plateNumber: string;
  /** Fuel type name (Solar / Bensin …) via vehicle → model → fuel. */
  readonly fuelName: string | null;
  readonly requestedLiters: number | null;
  readonly approvedLiters: number | null;
  readonly odometer: number;
  /** ISO fill timestamp (Trip.actualTime), or null when not yet realized. */
  readonly filledAt: string | null;
}

/** A vehicle's contribution to a site on one day (site drill-down). */
export interface SiteDayVehicleRow {
  readonly plateNumber: string;
  readonly tonnageKg: number;
  readonly rit: number;
}

/**
 * Map site-click detail for one day: total tonnage + disposal-trip count at the
 * site, plus the per-vehicle breakdown. For a TPS the trips are those *picked up*
 * there (origin); for a TPA they are those *disposed* there (destination).
 */
export interface SiteDaySummary {
  readonly siteId: string;
  readonly type: string;
  readonly tonnageKg: number;
  readonly tripCount: number;
  readonly vehicles: SiteDayVehicleRow[];
}
