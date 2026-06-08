import { apiClient } from './api-client';
import {
  type DailyInitResult,
  type DayStatus,
  type HaulAssignmentDto,
  type TransactionDayDto,
  type TripDetailDto,
  type TripDto,
} from './types/transactions';

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

export function getTransactionDayByDate(date: string): Promise<TransactionDayDto> {
  return apiClient.get<TransactionDayDto>(`/transaction-days?date=${encodeURIComponent(date)}`);
}

export function getTransactionDayById(id: number): Promise<TransactionDayDto> {
  return apiClient.get<TransactionDayDto>(`/transaction-days/${id}`);
}

export function initializeToday(): Promise<DailyInitResult> {
  return apiClient.post<DailyInitResult>('/transaction-days/initialize-today');
}

export function updateDayStatus(id: number, status: DayStatus): Promise<TransactionDayDto> {
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
