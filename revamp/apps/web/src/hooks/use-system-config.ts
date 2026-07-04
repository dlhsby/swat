'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notify } from '@/components/ui';
import { ApiError } from '@/lib/api-error';
import { type ConfigDescription, systemConfigApi } from '@/lib/system-config-api';

const KEY = 'system-config';

/** All configurable global settings + their state (admin, `system-config:manage`). */
export function useSystemConfig(): ReturnType<typeof useQuery<ConfigDescription[]>> {
  return useQuery({ queryKey: [KEY], queryFn: () => systemConfigApi.list() });
}

export function useSetSystemConfig(): ReturnType<
  typeof useMutation<{ message: string }, Error, { key: string; value: string }>
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { key: string; value: string }) =>
      systemConfigApi.set(input.key, input.value),
    onSuccess: () => {
      notify.success('Setelan disimpan.');
      void qc.invalidateQueries({ queryKey: [KEY] });
    },
    onError: (err) =>
      notify.error(err instanceof ApiError ? err.message : 'Gagal menyimpan setelan.'),
  });
}

export function useClearSystemConfig(): ReturnType<
  typeof useMutation<{ message: string }, Error, string>
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => systemConfigApi.clear(key),
    onSuccess: () => {
      notify.success('Setelan dikembalikan ke bawaan.');
      void qc.invalidateQueries({ queryKey: [KEY] });
    },
    onError: (err) => notify.error(err instanceof ApiError ? err.message : 'Gagal mengubah setelan.'),
  });
}
