'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notify } from '@/components/ui';
import { ApiError } from '@/lib/api-error';
import { type CorridorWaypoint, type GeoJsonLineString, geometryApi } from '@/lib/geometry-api';

const KEY = 'gps-geometry';

/** A route's corridor template (null when undrawn). Enabled only with a routeId. */
export function useRouteGeometry(routeId: string | null) {
  return useQuery({
    queryKey: [KEY, 'route', routeId],
    queryFn: () => geometryApi.getRouteGeometry(routeId as string),
    enabled: Boolean(routeId),
  });
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

export function useSaveRouteGeometry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      routeId: string;
      pathGeojson: GeoJsonLineString;
      waypoints?: CorridorWaypoint[];
      toleranceMeters?: number;
    }) =>
      geometryApi.saveRouteGeometry(input.routeId, {
        pathGeojson: input.pathGeojson,
        waypoints: input.waypoints,
        toleranceMeters: input.toleranceMeters,
      }),
    onSuccess: (_data, input) => {
      notify.success('Koridor rute tersimpan.');
      void queryClient.invalidateQueries({ queryKey: [KEY, 'route', input.routeId] });
    },
    onError: (err) => notify.error(errorMessage(err, 'Gagal menyimpan koridor.')),
  });
}

export function useDeleteRouteGeometry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (routeId: string) => geometryApi.deleteRouteGeometry(routeId),
    onSuccess: (_data, routeId) => {
      notify.success('Koridor rute dihapus.');
      void queryClient.invalidateQueries({ queryKey: [KEY, 'route', routeId] });
    },
    onError: (err) => notify.error(errorMessage(err, 'Gagal menghapus koridor.')),
  });
}
