'use client';

import { useEffect, useState } from 'react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  notify,
} from '@/components/ui';
import { ApiError } from '@/lib/api-error';
import { type RouteDto, routesApi } from '@/lib/master-api';
import { createTrip } from '@/lib/transactions-api';
import { type RouteCategory } from '@/lib/types/transactions';

const CATEGORY_LABEL: Record<string, string> = {
  PICKUP: 'Pengambilan',
  DISPOSAL: 'Pembuangan',
  REFUEL: 'Pengisian BBM',
  DEPART_POOL: 'Keberangkatan',
  RETURN_POOL: 'Kepulangan',
};

export interface AddTripDialogProps {
  /** The haul assignment to add the ad-hoc trip to; null closes the dialog. */
  haulAssignmentId: string | null;
  /** Restrict the route picker to a single category (focused quick-entry screens). */
  category?: RouteCategory;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

/**
 * Create an unscheduled trip on a haul assignment (legacy parity for off-plan
 * pickups/refuels/disposals). Picks an existing route; the trip is created
 * IN_PROGRESS and recorded later via the normal "Catat" flow.
 */
export function AddTripDialog({
  haulAssignmentId,
  category,
  onOpenChange,
  onCreated,
}: AddTripDialogProps): JSX.Element {
  const [routes, setRoutes] = useState<RouteDto[]>([]);
  const [routeId, setRouteId] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (haulAssignmentId === null) {
      return;
    }
    setRouteId('');
    setName('');
    void routesApi
      .list()
      .then(setRoutes)
      .catch(() => notify.error('Gagal memuat daftar rute.'));
  }, [haulAssignmentId]);

  const onSubmit = async (): Promise<void> => {
    if (haulAssignmentId === null || routeId === '') {
      return;
    }
    setSaving(true);
    try {
      await createTrip({
        haulAssignmentId,
        routeId,
        ...(name.trim() ? { name: name.trim() } : {}),
      });
      notify.success('Trip tak terjadwal berhasil dibuat.');
      onOpenChange(false);
      onCreated();
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Gagal membuat trip.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={haulAssignmentId !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Tambah Rute Tak Terjadwal</DialogTitle>
          <DialogDescription>
            Catat aktivitas di luar rencana harian. Trip dibuat berstatus berjalan dan dicatat
            realisasinya seperti biasa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label required>Rute</Label>
            <Select value={routeId} onValueChange={setRouteId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih rute" />
              </SelectTrigger>
              <SelectContent>
                {(category ? routes.filter((r) => r.category === category) : routes).map(
                  (route) => (
                    <SelectItem key={route.id} value={route.id}>
                      {CATEGORY_LABEL[route.category] ?? route.category} · {route.originSiteName} →{' '}
                      {route.destinationSiteName}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Nama (opsional)</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Otomatis dari rute jika dikosongkan"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={() => void onSubmit()} loading={saving} disabled={routeId === ''}>
            Buat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
