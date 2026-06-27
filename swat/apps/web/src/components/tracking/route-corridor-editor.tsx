'use client';

import { MapPinned, Plus } from 'lucide-react';
import { useState } from 'react';

import {
  type CorridorData,
  CorridorEditorCore,
  type SaveCorridorPayload,
} from '@/components/tracking/corridor-editor-core';
import { CorridorListItem } from '@/components/tracking/corridor-list-item';
import {
  Button,
  ConfirmDialog,
  Input,
  Label,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Spinner,
} from '@/components/ui';
import {
  useCreateCorridor,
  useDeleteCorridor,
  useRouteCorridors,
  useUpdateCorridor,
} from '@/hooks/use-corridors';
import { type CorridorDto } from '@/lib/corridor-api';

export interface CorridorRoute {
  readonly id: string;
  readonly originSiteName: string;
  readonly destinationSiteName: string;
}

/** Editor target: an existing corridor (edit) or null (add a new alternate). */
type EditTarget = { corridor: CorridorDto | null };

/**
 * Route corridor manager (Phase 7.8). A route owns 1..N corridors — a snap-to-road
 * default plus optional alternates. This sheet lists them (default first, badged),
 * and add/edit drops into the shared {@link CorridorEditorCore} drawing canvas. The
 * default corridor is route-managed (created on route creation) so it can't be
 * deleted here, only re-drawn. Gated upstream by `route-geometry:manage`.
 */
export function RouteCorridorEditor({
  route,
  onClose,
}: {
  route: CorridorRoute | null;
  onClose: () => void;
}): JSX.Element {
  const routeId = route?.id ?? null;
  const { data: corridors = [], isLoading } = useRouteCorridors(routeId);
  const create = useCreateCorridor(routeId);
  const update = useUpdateCorridor(routeId);
  const remove = useDeleteCorridor(routeId);

  const [editing, setEditing] = useState<EditTarget | null>(null);
  const [name, setName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<CorridorDto | null>(null);

  const backToList = (): void => {
    setEditing(null);
    setName('');
  };

  const startAdd = (): void => {
    setName('');
    setEditing({ corridor: null });
  };
  const startEdit = (corridor: CorridorDto): void => {
    setName(corridor.name);
    setEditing({ corridor });
  };

  const existing: CorridorData | null = editing?.corridor
    ? {
        pathGeojson: editing.corridor.pathGeojson,
        waypoints: editing.corridor.waypoints,
        toleranceMeters: editing.corridor.toleranceMeters,
      }
    : null;

  const handleSave = (payload: SaveCorridorPayload): void => {
    const body = {
      name: name.trim(),
      pathGeojson: payload.pathGeojson,
      waypoints: payload.waypoints,
      toleranceMeters: payload.toleranceMeters,
    };
    if (editing?.corridor) {
      update.mutate({ id: editing.corridor.id, body }, { onSuccess: backToList });
    } else {
      create.mutate(body, { onSuccess: backToList });
    }
  };

  const confirmDelete = (): void => {
    if (!deleteTarget) return;
    remove.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
        // If the deleted corridor was being edited, drop back to the list.
        if (editing?.corridor?.id === deleteTarget.id) backToList();
      },
    });
  };

  return (
    <>
      {/* List view — visible whenever a route is open and we're not drawing. */}
      <Sheet open={route !== null && editing === null} onOpenChange={(next) => !next && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-[560px]">
          <SheetHeader>
            <SheetTitle>Koridor rute</SheetTitle>
            <SheetDescription>
              {route ? `${route.originSiteName} → ${route.destinationSiteName}` : ''}
            </SheetDescription>
          </SheetHeader>

          <SheetBody className="space-y-3">
            <p className="text-body-sm text-neutral-500">
              Satu rute punya beberapa pilihan koridor. Koridor utama dibuat otomatis mengikuti
              jalan; tambahkan alternatif bila perlu.
            </p>

            {isLoading ? (
              <div className="flex justify-center py-10">
                <Spinner className="h-6 w-6 text-neutral-400" />
              </div>
            ) : corridors.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-base border border-dashed border-neutral-300 bg-neutral-50 py-10 text-center">
                <MapPinned className="h-7 w-7 text-neutral-400" aria-hidden />
                <p className="text-body-sm text-neutral-500">Belum ada koridor.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {corridors.map((c) => (
                  <CorridorListItem
                    key={c.id}
                    corridor={c}
                    onEdit={() => startEdit(c)}
                    // The route's default is auto-managed — editable, but not deletable.
                    onDelete={c.isDefault ? undefined : () => setDeleteTarget(c)}
                  />
                ))}
              </ul>
            )}

            <Button variant="secondary" onClick={startAdd} className="w-full">
              <Plus className="h-4 w-4" aria-hidden /> Tambah koridor
            </Button>
          </SheetBody>

          <SheetFooter>
            <Button variant="secondary" onClick={onClose}>
              Tutup
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Drawing canvas — add or edit a single corridor. */}
      <CorridorEditorCore
        open={editing !== null}
        entityKey={editing?.corridor?.id ?? 'new'}
        subtitle={route ? `${route.originSiteName} → ${route.destinationSiteName}` : ''}
        existing={existing}
        isLoading={false}
        saving={create.isPending || update.isPending}
        removing={remove.isPending}
        hasExisting={editing?.corridor != null && !editing.corridor.isDefault}
        canSave={name.trim().length > 0}
        onSave={handleSave}
        onDelete={() => editing?.corridor && setDeleteTarget(editing.corridor)}
        onClose={backToList}
        extraFields={
          <div className="grid gap-1.5">
            <Label htmlFor="corridor-name">Nama koridor</Label>
            <Input
              id="corridor-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="mis. Jalur alternatif via tol"
            />
          </div>
        }
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Hapus koridor"
        description={deleteTarget ? `Yakin ingin menghapus koridor "${deleteTarget.name}"?` : ''}
        confirmLabel="Hapus"
        onConfirm={confirmDelete}
      />
    </>
  );
}
