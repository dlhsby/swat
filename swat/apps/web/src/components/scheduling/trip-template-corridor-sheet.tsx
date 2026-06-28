'use client';

import { MapPinned, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  CorridorEditorCore,
  type SaveCorridorPayload,
} from '@/components/tracking/corridor-editor-core';
import { CorridorListItem } from '@/components/tracking/corridor-list-item';
import {
  Button,
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
  notify,
} from '@/components/ui';
import { useCreateCorridor, useRouteCorridors } from '@/hooks/use-corridors';
import { ApiError } from '@/lib/api-error';
import { type TripTemplateDto } from '@/lib/master-api';
import { updateTripTemplate } from '@/lib/scheduling-api';

export interface TripTemplateCorridorSheetProps {
  template: TripTemplateDto | null;
  scheduleId: string | null;
  onClose: () => void;
  /** Refresh the parent leg list after the corridor assignment changes. */
  onMutated?: () => void;
}

/**
 * Per-leg corridor picker for a template trip (Phase 7.8). The leg already resolved
 * to a route (directions-style); here the operator chooses WHICH of that route's
 * corridors this leg follows — the auto-snapped default or an alternate — or draws a
 * new alternate inline (created on the route, then selected). Picking the default
 * clears the leg's explicit corridor so it tracks the route default at day-init.
 */
export function TripTemplateCorridorSheet({
  template,
  scheduleId,
  onClose,
  onMutated,
}: TripTemplateCorridorSheetProps): JSX.Element {
  const routeId = template?.routeId ?? null;
  const { data: corridors = [], isLoading } = useRouteCorridors(routeId);
  const create = useCreateCorridor(routeId);

  const [selected, setSelected] = useState<string>('');
  const [drawing, setDrawing] = useState(false);
  const [drawName, setDrawName] = useState('');
  const [saving, setSaving] = useState(false);

  const defaultCorridor = corridors.find((c) => c.isDefault) ?? null;

  // Hydrate the selection when a leg opens (or its corridors first arrive): the
  // explicit corridor if set, otherwise the route's default.
  useEffect(() => {
    if (!template) return;
    setSelected(template.corridorId ?? defaultCorridor?.id ?? '');
    setDrawing(false);
    setDrawName('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template?.id, template?.corridorId, corridors.length]);

  const handleDrawSave = (payload: SaveCorridorPayload): void => {
    create.mutate(
      { name: drawName.trim(), ...payload },
      {
        onSuccess: (created) => {
          setSelected(created.id);
          setDrawing(false);
          setDrawName('');
        },
      },
    );
  };

  const apply = async (): Promise<void> => {
    if (!template || scheduleId === null) return;
    setSaving(true);
    try {
      // Selecting the default tracks the route default — clear the explicit id.
      const corridorId = selected && selected !== defaultCorridor?.id ? selected : '';
      await updateTripTemplate(scheduleId, template.id, { corridorId });
      notify.success('Koridor trip diperbarui.');
      onMutated?.();
      onClose();
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal memperbarui koridor.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Sheet open={template !== null && !drawing} onOpenChange={(next) => !next && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-[560px]">
          <SheetHeader>
            <SheetTitle>Pilih koridor</SheetTitle>
            <SheetDescription>{template?.routeLabel ?? ''}</SheetDescription>
          </SheetHeader>

          <SheetBody className="space-y-3">
            <p className="text-body-sm text-neutral-500">
              Pilih jalur yang dilalui trip ini. Koridor utama mengikuti jalan otomatis; tambahkan
              alternatif bila rute berbeda.
            </p>

            {isLoading ? (
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
                    selected={selected === c.id}
                    onSelect={() => setSelected(c.id)}
                  />
                ))}
              </ul>
            )}

            <Button
              variant="secondary"
              onClick={() => {
                setDrawName('');
                setDrawing(true);
              }}
              className="w-full"
            >
              <Plus className="h-4 w-4" aria-hidden /> Tambah koridor baru
            </Button>
          </SheetBody>

          <SheetFooter>
            <Button variant="secondary" onClick={onClose}>
              Batal
            </Button>
            <Button onClick={() => void apply()} loading={saving} disabled={!selected}>
              Simpan
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Draw a new alternate on the leg's route. */}
      <CorridorEditorCore
        open={drawing}
        entityKey={`new-${template?.id ?? 'none'}`}
        subtitle={template?.routeLabel ?? ''}
        existing={null}
        isLoading={false}
        saving={create.isPending}
        removing={false}
        hasExisting={false}
        canSave={drawName.trim().length > 0}
        onSave={handleDrawSave}
        onDelete={() => undefined}
        onClose={() => setDrawing(false)}
        extraFields={
          <div className="grid gap-1.5">
            <Label htmlFor="leg-corridor-name">Nama koridor</Label>
            <Input
              id="leg-corridor-name"
              value={drawName}
              onChange={(e) => setDrawName(e.target.value)}
              placeholder="mis. Lewat jalan alternatif"
            />
          </div>
        }
      />
    </>
  );
}
