import { apiClient } from './api-client';
import { makeResourceApi } from './resource-api';

/* ------------------------------- types -------------------------------- */

export type InspectionResultValue = 'PASS' | 'ATTENTION' | 'FAIL';
export type InspectionItemStatusValue = 'OK' | 'ATTENTION' | 'FAIL';
export type MaintenanceTypeValue = 'SERVICE' | 'REPAIR';
export type MaintenanceStatusValue = 'PENDING_APPROVAL' | 'APPROVED';
export type TripStatusValue = 'IN_PROGRESS' | 'DONE' | 'VERIFIED';

export interface InspectionItemView {
  id: string;
  label: string;
  status: InspectionItemStatusValue;
  notes: string | null;
}

export interface InspectionDto {
  id: string;
  vehicleId: number;
  vehiclePlate: string;
  vehicleBrand: string;
  date: string;
  inspectorId: number | null;
  inspectorName: string | null;
  result: InspectionResultValue;
  passedCount: number;
  totalCount: number;
  notes: string | null;
  items: InspectionItemView[];
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceItemView {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
  totalPrice: number;
}

export interface MaintenanceDto {
  id: string;
  code: string | null;
  vehicleId: number;
  vehiclePlate: string;
  vehicleBrand: string;
  type: MaintenanceTypeValue;
  status: MaintenanceStatusValue;
  date: string;
  odometer: number | null;
  workshop: string | null;
  description: string | null;
  totalCost: number;
  notes: string | null;
  items: MaintenanceItemView[];
  createdAt: string;
  updatedAt: string;
}

export interface RefuelDto {
  id: string;
  operationDate: string;
  status: TripStatusValue;
  vehicleId: number;
  vehiclePlate: string;
  fuelId: number | null;
  fuelName: string | null;
  pricePerLiter: number | null;
  requestedLiters: number | null;
  approvedLiters: number | null;
  estimatedCost: number | null;
  anomaly: boolean;
  recordedByName: string | null;
}

export interface BulkImportResult {
  total: number;
  imported: number;
  updated: number;
  skipped: number;
  errorCount: number;
  errors: ReadonlyArray<{ row: number; reason: string }>;
}

export interface BulkFuelQuotaRow {
  legacyId?: number;
  code?: string;
  vehicleId: number;
  siteId: number;
  validFrom: string;
  validTo: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

/* ----------------------------- resources ------------------------------ */

export const inspectionsApi = makeResourceApi<InspectionDto>('/vehicle-inspections');
export const maintenanceApi = makeResourceApi<MaintenanceDto>('/maintenance-records');

export function approveMaintenance(id: string): Promise<MaintenanceDto> {
  return apiClient.patch<MaintenanceDto>(`/maintenance-records/${id}/approve`, {});
}

export function listRefuels(query = '?limit=100'): Promise<RefuelDto[]> {
  return apiClient.get<RefuelDto[]>(`/refuels${query}`);
}

export function bulkImportFuelQuotas(body: {
  strategy: 'UPSERT' | 'SKIP';
  rows: BulkFuelQuotaRow[];
}): Promise<BulkImportResult> {
  return apiClient.post<BulkImportResult>('/fuel-quotas/bulk-import', body);
}
