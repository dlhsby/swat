'use client';

import { MapPinned, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  type CorridorData,
  CorridorEditorCore,
  type SaveCorridorPayload,
} from '@/components/tracking/corridor-editor-core';
import { CorridorListItem } from '@/components/tracking/corridor-list-item';
import {
  Button,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Spinner,
} from '@/components/ui';
import { useRouteCorridors } from '@/hooks/use-corridors';
import {
  useDeleteTripGeometry,
  useSaveTripGeometry,
  useSetTripCorridor,
  useTripGeometry,
} from '@/hooks/use-geometry';

export interface CorridorTrip {
  readonly id: string;
  /** Human label for the sheet subtitle (route + day). */
  readonly label: string;
}

/**
 * Per-day Trip corridor picker (Phase 7.8 — aligned with the template picker). For
 * a single day the operator picks WHICH of the trip's route corridors to follow
 * (the snapped default or an alternate), or draws a one-off freehand override that
 * wins for this day only. Resolver cascade: override → trip.corridor → route default.
 * Picking a named corridor clears any freehand override. Gated upstream by
 * `route-geometry:manage`.
 */
export function TripCorridorEditor({
  trip,
  onClose,
}: {
  trip: CorridorTrip | null;
  onClose: () => void;
}): JSX.Element {
  const tripId = trip?.id ?? null;
  const { data: tripGeom, isLoading: tripLoading } = useTripGeometry(tripId);
  const routeId = tripGeom?.routeId ?? null;
  const { data: corridors = [], isLoading: corridorsLoading } = useRouteCorridors(routeId);

  const setCorridor = useSetTripCorridor();
  const saveOverride = useSaveTripGeometry();
  const removeOverride = useDeleteTripGeometry();

  const [selected, setSelected] = useState('');
  const [drawing, setDrawing] = useState(false);

  const defaultCorridor = corridors.find((c) => c.isDefault) ?? null;
  const hasOverride = tripGeom?.hasOverride ?? false;

  // Hydrate the selection from the trip's current corridor (or the route default).
  useEffect(() => {
    if (!trip) return;
    setSelected(tripGeom?.corridorId ?? defaultCorridor?.id ?? '');
    setDrawing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip?.id, tripGeom?.corridorId, corridors.length]);

  const overrideExisting: CorridorData | null = tripGeom?.pathGeojson
    ? {
        pathGeojson: tripGeom.pathGeojson,
        waypoints: tripGeom.waypoints,
        toleranceMeters: tripGeom.toleranceMeters ?? 150,
      }
    : null;

  const applyCorridor = (): void => {
    if (!trip) return;
    // Selecting the default tracks the route default — clear the explicit id.
    const corridorId = selected && selected !== defaultCorridor?.id ? selected : '';
    setCorridor.mutate({ tripId: trip.id, corridorId }, { onSuccess: onClose });
  };

  const handleDrawSave = (payload: SaveCorridorPayload): void => {
    if (!trip) return;
    saveOverride.mutate(
      { tripId: trip.id, ...payload },
      {
        onSuccess: () => {
          setDrawing(false);
          onClose();
        },
      },
    );
  };

  const loading = tripLoading || corridorsLoading;

  return (
    <>
      <Sheet open={trip !== null && !drawing} onOpenChange={(next) => !next && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-[560px]">
          <SheetHeader>
            <SheetTitle>Koridor harian</SheetTitle>
            <SheetDescription>{trip?.label ?? ''}</SheetDescription>
          </SheetHeader>

          <SheetBody className="space-y-3">
            <p className="text-body-sm text-neutral-500">
              Pilih jalur untuk trip hari ini — koridor utama rute, alternatif yang sudah ada, atau
              gambar koridor khusus sekali pakai.
            </p>

            {hasOverride ? (
              <div className="flex items-center justify-between gap-3 rounded-base border border-amber-300 bg-amber-50 px-3 py-2.5">
                <p className="text-tiny text-amber-700">
                  Koridor khusus hari ini sedang aktif (menimpa koridor rute).
                </p>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDrawing(true)}
                    aria-label="Ubah koridor khusus"
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger-600"
                    onClick={() => trip && removeOverride.mutate(trip.id)}
                    loading={removeOverride.isPending}
                    aria-label="Hapus koridor khusus"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </div>
            ) : null}

            {loading ? (
              <div className="flex justify-center py-10">
                <Spinner className="h-6 w-6 text-neutral-400" />
              </div>
            ) : corridors.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-base border border-dashed border-neutral-300 bg-neutral-50 py-10 text-center">
                <MapPinned className="h-7 w-7 text-neutral-400" aria-hidden />
                <p className="text-body-sm text-neutral-500">Belum ada koridor untuk rute ini.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {corridors.map((c) => (
                  <CorridorListItem
                    key={c.id}
                    corridor={c}
                    selectable
                    // A freehand override wins, so no named corridor reads as selected.
                    selected={!hasOverride && selected === c.id}
                    onSelect={() => setSelected(c.id)}
                  />
                ))}
              </ul>
            )}

            <Button variant="secondary" onClick={() => setDrawing(true)} className="w-full">
              <Plus className="h-4 w-4" aria-hidden /> Gambar koridor khusus (hari ini)
            </Button>
          </SheetBody>

          <SheetFooter>
            <Button variant="secondary" onClick={onClose}>
              Batal
            </Button>
            <Button onClick={applyCorridor} loading={setCorridor.isPending} disabled={!selected}>
              Simpan
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Freehand one-off override for this day. */}
      <CorridorEditorCore
        open={drawing}
        entityKey={`trip-${trip?.id ?? 'none'}`}
        subtitle={trip?.label ?? ''}
        existing={overrideExisting}
        isLoading={tripLoading}
        saving={saveOverride.isPending}
        removing={removeOverride.isPending}
        hasExisting={hasOverride}
        onSave={handleDrawSave}
        onDelete={() =>
          trip && removeOverride.mutate(trip.id, { onSuccess: () => setDrawing(false) })
        }
        onClose={() => setDrawing(false)}
      />
    </>
  );
}
