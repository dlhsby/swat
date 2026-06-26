'use client';

import {
  type CorridorData,
  CorridorEditorCore,
  type SaveCorridorPayload,
} from '@/components/tracking/corridor-editor-core';
import {
  useDeleteRouteGeometry,
  useRouteGeometry,
  useSaveRouteGeometry,
} from '@/hooks/use-geometry';

export interface CorridorRoute {
  readonly id: string;
  readonly originSiteName: string;
  readonly destinationSiteName: string;
}

/**
 * Route-template corridor editor (Phase 7, T-710). Loads/saves the route's corridor
 * template (with persisted control waypoints) and renders the shared editor core.
 */
export function RouteCorridorEditor({
  route,
  onClose,
}: {
  route: CorridorRoute | null;
  onClose: () => void;
}): JSX.Element {
  const { data, isLoading } = useRouteGeometry(route?.id ?? null);
  const save = useSaveRouteGeometry();
  const remove = useDeleteRouteGeometry();

  const existing: CorridorData | null = data
    ? {
        pathGeojson: data.pathGeojson,
        waypoints: data.waypoints,
        toleranceMeters: data.toleranceMeters,
      }
    : null;

  const handleSave = (payload: SaveCorridorPayload): void => {
    if (!route) return;
    save.mutate({ routeId: route.id, ...payload }, { onSuccess: onClose });
  };

  const handleDelete = (): void => {
    if (!route) return;
    remove.mutate(route.id, { onSuccess: onClose });
  };

  return (
    <CorridorEditorCore
      open={route !== null}
      entityKey={route?.id ?? 'none'}
      subtitle={route ? `${route.originSiteName} → ${route.destinationSiteName}` : ''}
      existing={existing}
      isLoading={isLoading}
      saving={save.isPending}
      removing={remove.isPending}
      hasExisting={data != null}
      onSave={handleSave}
      onDelete={handleDelete}
      onClose={onClose}
    />
  );
}
