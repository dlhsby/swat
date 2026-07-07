import { apiClient, type PagedResult } from '@/lib/api-client';

export type GasificationStatus = 'UNMATCHED' | 'MATCHED' | 'IGNORED';

export interface GasificationEntry {
  readonly id: string;
  readonly vendorNopol: string;
  readonly plateNumber: string;
  readonly enteredAt: string;
  readonly operationDate: string;
  readonly userTally: string | null;
  readonly status: GasificationStatus;
  readonly matchedTripId: string | null;
  readonly photoUrl: string | null;
}

export interface CandidateTrip {
  readonly tripId: string;
  readonly plateNumber: string;
  readonly disposalTime: string | null;
  readonly disposalDestination: string;
}

export interface GasificationSyncResult {
  readonly date: string;
  readonly fetched: number;
  readonly upserted: number;
  readonly matched: number;
  readonly skipped: number;
}

export interface ListGasificationParams {
  readonly date?: string;
  readonly status?: GasificationStatus;
  readonly page?: number;
  readonly limit?: number;
}

function toQuery(params: ListGasificationParams): string {
  const q = new URLSearchParams();
  if (params.date) q.set('date', params.date);
  if (params.status) q.set('status', params.status);
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  const s = q.toString();
  return s ? `?${s}` : '';
}

export const gasificationApi = {
  list: (params: ListGasificationParams = {}): Promise<PagedResult<GasificationEntry>> =>
    apiClient.getPage<GasificationEntry>(`/gasification/entries${toQuery(params)}`),

  syncNow: (body: { date?: string; nopol?: string }): Promise<GasificationSyncResult> =>
    apiClient.post<GasificationSyncResult>('/gasification/sync', body),

  candidates: (entryId: string): Promise<CandidateTrip[]> =>
    apiClient.get<CandidateTrip[]>(`/gasification/entries/${entryId}/candidates`),

  match: (entryId: string, tripId: string): Promise<{ message: string }> =>
    apiClient.post<{ message: string }>(`/gasification/entries/${entryId}/match`, { tripId }),

  unmatch: (entryId: string): Promise<{ message: string }> =>
    apiClient.post<{ message: string }>(`/gasification/entries/${entryId}/unmatch`),
};
