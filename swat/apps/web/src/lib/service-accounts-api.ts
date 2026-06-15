import { apiClient } from './api-client';

/** Public service-account row (key masked to its prefix). */
export interface ServiceAccountDto {
  readonly id: string;
  readonly name: string;
  readonly apiKeyPrefix: string;
  readonly roleId: string;
  readonly roleName: string;
  readonly active: boolean;
  readonly rateLimitPerMin: number;
  readonly allowedIPs: string[];
  readonly lastUsedAt: string | null;
  readonly revokedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Returned ONCE on creation — carries the full plaintext key. */
export interface CreatedServiceAccountDto extends ServiceAccountDto {
  readonly apiKey: string;
}

// `type` (not `interface`) so these get an implicit index signature and satisfy
// the api-client `Body` (Record<string, unknown>) parameter.
export type CreateServiceAccountBody = {
  name: string;
  roleId: string;
  rateLimitPerMin?: number;
  allowedIPs?: string[];
};

export type UpdateServiceAccountBody = {
  name?: string;
  roleId?: string;
  rateLimitPerMin?: number;
  allowedIPs?: string[];
  active?: boolean;
};

const BASE = '/admin/service-accounts';

export const serviceAccountsApi = {
  list: (query = '?limit=100'): Promise<ServiceAccountDto[]> =>
    apiClient.get<ServiceAccountDto[]>(`${BASE}${query}`),
  create: (body: CreateServiceAccountBody): Promise<CreatedServiceAccountDto> =>
    apiClient.post<CreatedServiceAccountDto>(BASE, body),
  update: (id: string, body: UpdateServiceAccountBody): Promise<ServiceAccountDto> =>
    apiClient.patch<ServiceAccountDto>(`${BASE}/${id}`, body),
  revoke: (id: string): Promise<{ message: string }> =>
    apiClient.delete<{ message: string }>(`${BASE}/${id}`),
};
