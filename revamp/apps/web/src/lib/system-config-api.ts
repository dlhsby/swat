import { apiClient } from './api-client';

/** One configurable global setting + its current resolution state (secrets masked). */
export interface ConfigDescription {
  key: string;
  group: string;
  valueType: 'string' | 'number' | 'boolean';
  isSecret: boolean;
  label: string;
  help?: string;
  /** A DB override row is set. */
  isSet: boolean;
  source: 'db' | 'env' | 'unset';
  /** Effective value — present only for non-secret keys. */
  value?: string | number | boolean;
}

export const systemConfigApi = {
  list: (): Promise<ConfigDescription[]> => apiClient.get<ConfigDescription[]>('/system-config'),
  set: (key: string, value: string): Promise<{ message: string }> =>
    apiClient.patch<{ message: string }>(`/system-config/${encodeURIComponent(key)}`, { value }),
  clear: (key: string): Promise<{ message: string }> =>
    apiClient.delete<{ message: string }>(`/system-config/${encodeURIComponent(key)}`),
};
