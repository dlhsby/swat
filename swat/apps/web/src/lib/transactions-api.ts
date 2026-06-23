import { apiClient } from './api-client';
import { makeResourceApi } from './resource-api';
import {
  type DailyInitResult,
  type DayStatus,
  type HaulAssignmentDto,
  type RouteCategory,
  type TransactionDayDto,
  type TransactionDaySummaryDto,
  type TripDetailDto,
  type TripDto,
} from './types/transactions';

export interface CreateTripInput {
  haulAssignmentId: string;
  routeId?: string;
  category?: RouteCategory;
  destinationSiteId?: string;
  name?: string;
}

export interface RecordLegInput {
  actualOdometer: number;
  actualTime: string;
}

export interface RecordTripInput {
  actualTime: string;
  actualOdometer: number;
  fuelRequestedLiters?: number;
  fuelApprovedLiters?: number;
  tareWeight?: number;
  grossWeight?: number;
  wasteVolume?: number;
  notes?: string;
}

const transactionDaysList = makeResourceApi<TransactionDaySummaryDto>('/transaction-days/list');

/**
 * All transaction days (newest first), optionally filtered by status. Pages are
 * fetched transparently (1000/req) so the client-side DataTable can search/sort
 * the full history. Each row is a lightweight summary (no haul/trip tree).
 */
export function listTransactionDays(status?: DayStatus): Promise<TransactionDaySummaryDto[]> {
  return transactionDaysList.list(status ? `?status=${encodeURIComponent(status)}` : undefined);
}

export function getTransactionDayByDate(date: string): Promise<TransactionDayDto> {
  return apiClient.get<TransactionDayDto>(`/transaction-days?date=${encodeURIComponent(date)}`);
}

export function getTransactionDayById(id: string): Promise<TransactionDayDto> {
  return apiClient.get<TransactionDayDto>(`/transaction-days/${id}`);
}

export function initializeToday(): Promise<DailyInitResult> {
  return apiClient.post<DailyInitResult>('/transaction-days/initialize-today');
}

export function updateDayStatus(id: string, status: DayStatus): Promise<TransactionDayDto> {
  return apiClient.patch<TransactionDayDto>(`/transaction-days/${id}`, { status });
}

export function recordDepart(
  assignmentId: string,
  body: RecordLegInput,
): Promise<HaulAssignmentDto> {
  return apiClient.put<HaulAssignmentDto>(`/haul-assignments/${assignmentId}/record-depart`, {
    ...body,
  });
}

export function recordReturn(
  assignmentId: string,
  body: RecordLegInput,
): Promise<HaulAssignmentDto> {
  return apiClient.put<HaulAssignmentDto>(`/haul-assignments/${assignmentId}/record-return`, {
    ...body,
  });
}

export function listAssignmentTrips(assignmentId: string): Promise<TripDto[]> {
  return apiClient.get<TripDto[]>(`/haul-assignments/${assignmentId}/trips`);
}

export function getTrip(id: string): Promise<TripDetailDto> {
  return apiClient.get<TripDetailDto>(`/trips/${id}`);
}

export function recordTrip(id: string, body: RecordTripInput): Promise<TripDto> {
  return apiClient.put<TripDto>(`/trips/${id}`, { ...body });
}

export function verifyTrip(id: string): Promise<TripDto> {
  return apiClient.put<TripDto>(`/trips/${id}/verify`);
}

/** Un-record a realization (soft delete): reverts the trip to IN_PROGRESS and
 *  clears the entered values, keeping the scheduled slot. */
export function unrecordTrip(id: string): Promise<TripDto> {
  return apiClient.delete<TripDto>(`/trips/${id}`);
}

/** Create an ad-hoc (unscheduled) trip on a haul assignment (legacy parity). */
export function createTrip(body: CreateTripInput): Promise<TripDto> {
  return apiClient.post<TripDto>('/trips', { ...body });
}

export interface TripPhotoDto {
  id: string;
  objectKey: string;
  contentType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  createdAt: string;
  url: string;
}

export function listTripPhotos(tripId: string): Promise<TripPhotoDto[]> {
  return apiClient.get<TripPhotoDto[]>(`/trips/${tripId}/photos`);
}

function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  return crypto.subtle.digest('SHA-256', buffer).then((digest) =>
    Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(''),
  );
}

/**
 * Upload a trip photo (legacy dokumentasitrayek): presign → PUT bytes to object
 * storage → register the metadata. Bytes never pass through the API server.
 */
export async function uploadTripPhoto(tripId: string, file: File): Promise<TripPhotoDto> {
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
  const key = `trip/${tripId}/${crypto.randomUUID()}.${ext ?? 'jpg'}`;
  const contentType = file.type || 'application/octet-stream';

  const { url } = await apiClient.post<{ url: string; key: string; expiresIn: number }>(
    '/storage/presigned-put',
    { key, contentType },
  );
  const put = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  });
  if (!put.ok) {
    throw new Error('Gagal mengunggah berkas ke penyimpanan.');
  }
  const checksum = await sha256Hex(await file.arrayBuffer());
  return apiClient.post<TripPhotoDto>(`/trips/${tripId}/photos`, {
    objectKey: key,
    contentType,
    sizeBytes: file.size,
    checksum,
  });
}
