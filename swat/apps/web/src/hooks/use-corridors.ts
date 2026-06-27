'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notify } from '@/components/ui';
import { ApiError } from '@/lib/api-error';
import { type CorridorDto, type UpsertCorridorBody, corridorApi } from '@/lib/corridor-api';

const KEY = 'route-corridors';

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

/** A route's corridors (default first). Enabled only with a routeId. */
export function useRouteCorridors(routeId: string | null) {
  return useQuery({
    queryKey: [KEY, routeId],
    queryFn: () => corridorApi.listForRoute(routeId as string),
    enabled: Boolean(routeId),
  });
}

export function useCreateCorridor(routeId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpsertCorridorBody): Promise<CorridorDto> =>
      corridorApi.create(routeId as string, body),
    onSuccess: () => {
      notify.success('Koridor ditambahkan.');
      void queryClient.invalidateQueries({ queryKey: [KEY, routeId] });
    },
    onError: (err) => notify.error(errorMessage(err, 'Gagal menambahkan koridor.')),
  });
}

export function useUpdateCorridor(routeId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; body: Partial<UpsertCorridorBody> }): Promise<CorridorDto> =>
      corridorApi.update(input.id, input.body),
    onSuccess: () => {
      notify.success('Koridor diperbarui.');
      void queryClient.invalidateQueries({ queryKey: [KEY, routeId] });
    },
    onError: (err) => notify.error(errorMessage(err, 'Gagal memperbarui koridor.')),
  });
}

export function useDeleteCorridor(routeId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => corridorApi.remove(id),
    onSuccess: () => {
      notify.success('Koridor dihapus.');
      void queryClient.invalidateQueries({ queryKey: [KEY, routeId] });
    },
    onError: (err) => notify.error(errorMessage(err, 'Gagal menghapus koridor.')),
  });
}
