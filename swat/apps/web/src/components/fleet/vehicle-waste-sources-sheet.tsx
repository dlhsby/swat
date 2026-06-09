'use client';

import { Plus, Trash2 } from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { ProtectedAction } from '@/components/auth/protected-action';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Skeleton,
  notify,
} from '@/components/ui';
import { useResourceList } from '@/hooks/use-resource-list';
import { ApiError } from '@/lib/api-error';
import {
  type VehicleWasteSourceDto,
  addVehicleWasteSource,
  listVehicleWasteSources,
  removeVehicleWasteSource,
} from '@/lib/fleet-api';
import { type VehicleDto, type WasteSourceDto, wasteSourcesApi } from '@/lib/master-api';

export interface VehicleWasteSourcesSheetProps {
  vehicle: VehicleDto | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Manage the waste sources a vehicle serves (parity with the legacy
 * `kategorisumbersampahkendaraan`). The mapping drives the monitoring by-source
 * breakdown + the Semua / Non-Swasta / Swasta toggle.
 */
export function VehicleWasteSourcesSheet({
  vehicle,
  onOpenChange,
}: VehicleWasteSourcesSheetProps): JSX.Element {
  const [links, setLinks] = useState<VehicleWasteSourceDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pick, setPick] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<VehicleWasteSourceDto | null>(null);

  const { rows: allSources } = useResourceList<WasteSourceDto>(wasteSourcesApi.list);
  const vehicleId = vehicle?.id ?? null;

  const reload = useCallback(async (): Promise<void> => {
    if (vehicleId === null) {
      return;
    }
    setLoading(true);
    try {
      setLinks(await listVehicleWasteSources(vehicleId));
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal memuat sumber sampah.');
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    if (vehicleId !== null) {
      setPick('');
      void reload();
    }
  }, [vehicleId, reload]);

  // Only offer sources not already linked.
  const available = useMemo(() => {
    const linked = new Set(links.map((l) => l.wasteSourceId));
    return allSources.filter((s) => !linked.has(s.id));
  }, [allSources, links]);

  const onAdd = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (vehicleId === null || !pick) {
      return;
    }
    setSaving(true);
    try {
      await addVehicleWasteSource(vehicleId, Number(pick));
      notify.success('Sumber sampah dihubungkan.');
      setPick('');
      await reload();
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal menghubungkan sumber sampah.');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (): Promise<void> => {
    if (vehicleId === null || !deleteTarget) {
      return;
    }
    try {
      await removeVehicleWasteSource(vehicleId, deleteTarget.wasteSourceId);
      notify.success('Sumber sampah dilepas.');
      setDeleteTarget(null);
      await reload();
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal melepas sumber sampah.');
    }
  };

  return (
    <Sheet open={vehicle !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[min(92vw,520px)]">
        <SheetHeader>
          <SheetTitle>Sumber Sampah — {vehicle?.plateNumber}</SheetTitle>
        </SheetHeader>
        <SheetBody className="space-y-5">
          {loading ? (
            <Skeleton className="h-24" />
          ) : links.length === 0 ? (
            <EmptyState
              illustration="no-results"
              title="Belum ada sumber sampah terhubung"
              description="Kendaraan ini belum melayani sumber sampah mana pun."
            />
          ) : (
            <ul className="space-y-2">
              {links.map((link) => (
                <li
                  key={link.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 p-3"
                >
                  <span className="flex items-center gap-2 text-body-sm font-medium text-neutral-900">
                    <Badge appearance="count">{link.code}</Badge>
                    {link.name}
                  </span>
                  <ProtectedAction permission="vehicle:update">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-danger-600"
                      aria-label={`Lepas ${link.name}`}
                      onClick={() => setDeleteTarget(link)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </ProtectedAction>
                </li>
              ))}
            </ul>
          )}

          <ProtectedAction permission="vehicle:update">
            <form
              onSubmit={(e) => void onAdd(e)}
              className="space-y-3 rounded-lg border border-neutral-200 p-3"
            >
              <p className="text-label font-semibold text-neutral-700">Tambah Sumber Sampah</p>
              <div className="space-y-1.5">
                <Label htmlFor="vws-source" required>
                  Sumber Sampah
                </Label>
                <Select value={pick || undefined} onValueChange={setPick}>
                  <SelectTrigger id="vws-source">
                    <SelectValue placeholder="Pilih sumber sampah" />
                  </SelectTrigger>
                  <SelectContent>
                    {available.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.code} · {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" loading={saving} disabled={!pick || available.length === 0}>
                <Plus className="h-4 w-4" aria-hidden />
                Tambah
              </Button>
            </form>
          </ProtectedAction>
        </SheetBody>
      </SheetContent>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Lepas sumber sampah ini?"
        description="Tonase kendaraan ini tidak akan lagi dihitung pada sumber tersebut."
        confirmLabel="Lepas"
        onConfirm={() => void onDelete()}
      />
    </Sheet>
  );
}
