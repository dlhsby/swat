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

/** A single day's Trip corridor override (null path when none set). */
export function useTripGeometry(tripId: string | null) {
  return useQuery({
    queryKey: [KEY, 'trip', tripId],
    queryFn: () => geometryApi.getTripGeometry(tripId as string),
    enabled: Boolean(tripId),
  });
}

export function useSaveTripGeometry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      tripId: string;
      pathGeojson: GeoJsonLineString;
      waypoints?: CorridorWaypoint[];
      toleranceMeters?: number;
    }) =>
      geometryApi.saveTripGeometry(input.tripId, {
        pathGeojson: input.pathGeojson,
        waypoints: input.waypoints,
        toleranceMeters: input.toleranceMeters,
      }),
    onSuccess: (_data, input) => {
      notify.success('Koridor harian tersimpan.');
      void queryClient.invalidateQueries({ queryKey: [KEY, 'trip', input.tripId] });
    },
    onError: (err) => notify.error(errorMessage(err, 'Gagal menyimpan koridor harian.')),
  });
}

export function useDeleteTripGeometry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tripId: string) => geometryApi.deleteTripGeometry(tripId),
    onSuccess: (_data, tripId) => {
      notify.success('Override koridor harian dihapus.');
      void queryClient.invalidateQueries({ queryKey: [KEY, 'trip', tripId] });
    },
    onError: (err) => notify.error(errorMessage(err, 'Gagal menghapus koridor harian.')),
  });
}

/** Pick one of the trip's route corridors for the day (`corridorId: ''` ⇒ default). */
export function useSetTripCorridor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { tripId: string; corridorId: string }) =>
      geometryApi.setTripCorridor(input.tripId, input.corridorId),
    onSuccess: (_data, input) => {
      notify.success('Koridor harian diperbarui.');
      void queryClient.invalidateQueries({ queryKey: [KEY, 'trip', input.tripId] });
    },
    onError: (err) => notify.error(errorMessage(err, 'Gagal memperbarui koridor harian.')),
  });
}
