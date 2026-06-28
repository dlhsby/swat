/**
 * Legacy numeric lookup id → new enum string maps. Values verified against the
 * legacy `status*` / `kategori*` lookup rows in the sample dump
 * (`legacy/web/db_backup/dkp_swat_2026_05_18_data.sql`); see `specs/04-migration.md` §3.
 */
import {
  type DayStatus,
  type EmploymentStatus,
  type DisposalPermitStatus,
  type MaintenanceStatus,
  type RouteCategory,
  type SiteType,
  type TripStatus,
  type VehicleStatus,
} from '@prisma/client';

const SITE_TYPE: Record<number, SiteType> = { 1: 'POOL', 2: 'SPBU', 3: 'TPS', 4: 'TPA' };
const ROUTE_CATEGORY: Record<number, RouteCategory> = {
  1: 'DEPART_POOL',
  2: 'REFUEL',
  3: 'PICKUP',
  4: 'DISPOSAL',
  5: 'RETURN_POOL',
};
const VEHICLE_STATUS: Record<number, VehicleStatus> = {
  1: 'GOOD',
  2: 'MINOR_DAMAGE',
  3: 'MAJOR_DAMAGE',
  4: 'LOST',
};
const EMPLOYMENT_STATUS: Record<number, EmploymentStatus> = {
  1: 'SATGAS',
  2: 'PNS',
  3: 'HONORER',
};
const DISPOSAL_PERMIT_STATUS: Record<number, DisposalPermitStatus> = { 1: 'ACTIVE', 2: 'INACTIVE' };
const MAINTENANCE_STATUS: Record<number, MaintenanceStatus> = {
  1: 'PENDING_APPROVAL',
  2: 'APPROVED',
};
// haritransaksi / transaksiangkutsampah / detailtransaksiangkutsampah → DayStatus.
const DAY_STATUS: Record<number, DayStatus> = { 1: 'IN_PROGRESS', 2: 'DONE' };
// trayek (Trip) carries a third state (Terverifikasi).
const TRIP_STATUS: Record<number, TripStatus> = {
  1: 'IN_PROGRESS',
  2: 'DONE',
  3: 'VERIFIED',
};

function lookup<T>(map: Record<number, T>, id: number | null | undefined, fallback: T): T {
  return id != null && map[id] !== undefined ? map[id] : fallback;
}

export const mapSiteType = (id: number): SiteType => lookup(SITE_TYPE, id, 'TPS');
export const mapRouteCategory = (id: number): RouteCategory => lookup(ROUTE_CATEGORY, id, 'PICKUP');
export const mapVehicleStatus = (id: number | null): VehicleStatus =>
  lookup(VEHICLE_STATUS, id, 'GOOD');
export const mapEmploymentStatus = (id: number | null): EmploymentStatus =>
  lookup(EMPLOYMENT_STATUS, id, 'HONORER');
export const mapDisposalPermitStatus = (id: number | null): DisposalPermitStatus =>
  lookup(DISPOSAL_PERMIT_STATUS, id, 'ACTIVE');
export const mapMaintenanceStatus = (id: number | null): MaintenanceStatus =>
  lookup(MAINTENANCE_STATUS, id, 'PENDING_APPROVAL');
export const mapDayStatus = (id: number | null): DayStatus => lookup(DAY_STATUS, id, 'IN_PROGRESS');
export const mapTripStatus = (id: number | null): TripStatus =>
  lookup(TRIP_STATUS, id, 'IN_PROGRESS');
