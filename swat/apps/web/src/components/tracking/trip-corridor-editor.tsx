'use client';

import {
  type CorridorData,
  CorridorEditorCore,
  type SaveCorridorPayload,
} from '@/components/tracking/corridor-editor-core';
import { useDeleteTripGeometry, useSaveTripGeometry, useTripGeometry } from '@/hooks/use-geometry';

export interface CorridorTrip {
  readonly id: string;
  /** Human label for the sheet subtitle (route + day). */
  readonly label: string;
}

/**
 * Per-day Trip-override corridor editor (Phase 7). Draws a one-day corridor that
 * overrides the route template for this Trip only (the deviation matcher resolves
 * override → template → none). Reuses the shared editor core and persists control
 * waypoints (Trip.geometryWaypoints), so re-opening restores the sparse handles.
 */
export function TripCorridorEditor({
  trip,
  onClose,
}: {
  trip: CorridorTrip | null;
  onClose: () => void;
}): JSX.Element {
  const { data, isLoading } = useTripGeometry(trip?.id ?? null);
  const save = useSaveTripGeometry();
  const remove = useDeleteTripGeometry();

  const existing: CorridorData | null = data?.pathGeojson
    ? {
        pathGeojson: data.pathGeojson,
        waypoints: data.waypoints,
        toleranceMeters: data.toleranceMeters ?? 150,
      }
    : null;

  const handleSave = (payload: SaveCorridorPayload): void => {
    if (!trip) return;
    save.mutate(
      {
        tripId: trip.id,
        pathGeojson: payload.pathGeojson,
        waypoints: payload.waypoints,
        toleranceMeters: payload.toleranceMeters,
      },
      { onSuccess: onClose },
    );
  };

  const handleDelete = (): void => {
    if (!trip) return;
    remove.mutate(trip.id, { onSuccess: onClose });
  };

  return (
    <CorridorEditorCore
      open={trip !== null}
      entityKey={trip?.id ?? 'none'}
      subtitle={trip?.label ?? ''}
      existing={existing}
      isLoading={isLoading}
      saving={save.isPending}
      removing={remove.isPending}
      hasExisting={Boolean(data?.pathGeojson)}
      onSave={handleSave}
      onDelete={handleDelete}
      onClose={onClose}
    />
  );
}
