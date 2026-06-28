import { apiClient } from './api-client';

/** One integration API call as recorded in the audit trail (Phase 4 §9.3). */
export interface ApiAuditLogDto {
  readonly id: string;
  readonly principalType: 'USER' | 'SERVICE_ACCOUNT';
  readonly principalId: string | null;
  readonly principalName: string;
  readonly method: string;
  readonly endpoint: string;
  readonly statusCode: number;
  readonly requestSummary: string | null;
  readonly responseSummary: string | null;
  readonly ipAddress: string;
  readonly userAgent: string;
  readonly timestamp: string;
}

const BASE = '/admin/api-audit-logs';

export const apiAuditApi = {
  list: (query = '?limit=100'): Promise<ApiAuditLogDto[]> =>
    apiClient.get<ApiAuditLogDto[]>(`${BASE}${query}`),
};
